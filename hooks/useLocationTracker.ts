import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// Types
export type SavedLocation = {
  place: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  lastVisited?: string;
  count?: number;
  notes?: string[];
};
import * as Notifications from 'expo-notifications';

// Configure Notifications at the top of the file
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
// Add this function to send reminders about adding memories
const sendMemoryReminderNotification = async (place: string, count: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Add a Memory to This Place 📝',
      body: `You've been at ${place} ${count} times. Want to save a memory about this location?`,
      sound: true,
      data: { type: 'memory_reminder' },
    },
    trigger: null, // Trigger immediately
  });
};

const getPlaceDetails = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'GeoMemoryApp/1.0 (srujanmpadmashali@gmail.com)', // Replace with your app name & email
        },
      }
    );
    const data = await response.json();
    return data.display_name || 'Unknown Location';
  } catch (err) {
    console.error('Failed to get place:', err);
    return 'Unknown Location';
  }
};

const formatTimestamp = (timestamp: string | number | Date) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
};

// Updated to preserve notes and handle location matching better
// Update the addOrCountLocation function
const addOrCountLocation = (savedLocations: SavedLocation[], newLocation: { latitude: number; longitude: number; place: string; timestamp: string }) => {
  const existingIndex = savedLocations.findIndex(
    (loc) => 
      Math.abs(loc.latitude - newLocation.latitude) < 0.0001 && 
      Math.abs(loc.longitude - newLocation.longitude) < 0.0001
  );

  const updatedLocations = [...savedLocations];
  const currentTimestamp = formatTimestamp(new Date().toISOString());

  if (existingIndex !== -1) {
    // Preserve notes if they exist
    const existingNotes = updatedLocations[existingIndex].notes || [];
    const previousCount = updatedLocations[existingIndex].count || 1;
    const newCount = previousCount + 1;
    
    // Update count and last visited time
    updatedLocations[existingIndex].count = newCount;
    updatedLocations[existingIndex].lastVisited = currentTimestamp;
    
    // Keep track of existing notes
    updatedLocations[existingIndex].notes = existingNotes;
    
    // Send notification when user visits same place 3 or 7 times and hasn't added notes
    if ((newCount === 3 || newCount === 7) && 
        (!existingNotes || existingNotes.length === 0)) {
      sendMemoryReminderNotification(updatedLocations[existingIndex].place, newCount);
    }
  } else {
    // Add new location with timestamp
    updatedLocations.push({ 
      ...newLocation, 
      count: 1,
      lastVisited: currentTimestamp,
      notes: [] // Initialize empty notes array
    });
  }

  return updatedLocations;
};

export const useLocationTracker = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  
  const fetchLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      
      // First attempt to get last known location
      let locationData = await Location.getLastKnownPositionAsync({});
      
      // If no last known location is available, try to get current position
      if (!locationData) {
        try {
          locationData = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          console.log('Using current position instead of last known');
        } catch (posError) {
          console.error('Error getting current position:', posError);
          setErrorMsg('No location data available. Please ensure location services are enabled.');
          return;
        }
      }
      
      // Update state with the location we found
      setLocation(locationData);
      setLastFetchTime(new Date().toLocaleTimeString());
      
      const place = await getPlaceDetails(locationData.coords.latitude, locationData.coords.longitude);
      const timestamp = formatTimestamp(new Date().toISOString());
      
      const newLocationData = {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        place,
        timestamp,
      };
      
      const savedLocations = JSON.parse((await AsyncStorage.getItem('locations')) || '[]');
      const updatedLocations = addOrCountLocation(savedLocations, newLocationData);
      
      await AsyncStorage.setItem('locations', JSON.stringify(updatedLocations));
      console.log('Location saved:', newLocationData);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Failed to get location');
    }
  };
  
  useEffect(() => {
    fetchLocation(); // Initial fetch
    const interval = setInterval(fetchLocation, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval); // Cleanup
  }, []);
  
  return { location, errorMsg, fetchLocation, lastFetchTime };
};