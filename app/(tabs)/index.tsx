import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, Alert, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocationTracker } from '../../hooks/useLocationTracker';

// Configure Notifications once at the top level - remove the duplicate in useEffect
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Main Screen
export default function HomeScreen() {
  const { location, errorMsg, fetchLocation, lastFetchTime } = useLocationTracker();
  const [noteText, setNoteText] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Test notification function - add this to verify notifications work
  const testNotification = async () => {
    if (!notificationPermission) {
      Alert.alert("Permission Required", "Please grant notification permissions first");
      return;
    }

    try {
      console.log("Sending test notification...");
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'If you see this, notifications are working!',
          sound: true,
        },
        trigger: null, // null means show immediately
      });
      console.log("Test notification sent with ID:", notificationId);
    } catch (error) {
      console.error("Failed to send test notification:", error);
      Alert.alert("Notification Error", "Failed to send test notification");
    }
  };

  // Configure Notifications on component mount
  useEffect(() => {
    (async () => {
      // Check and request permissions if needed
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log("Current notification permission status:", existingStatus);
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        console.log("Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("New notification permission status:", status);
      }
      
      setNotificationPermission(finalStatus === 'granted');
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notification Permission Required', 
          'Please enable notifications in your device settings to receive location alerts.'
        );
      }
    })();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
      if (response.notification.request.content.data?.type === 'memory_reminder') {
        Alert.alert(
          'Add a Memory',
          'Would you like to add a memory note to this location?',
          [
            {
              text: 'Not Now',
              style: 'cancel',
            },
            {
              text: 'Add Memory',
              onPress: () => {
                // Could scroll to the note input or set some state to focus it
              },
            },
          ]
        );
      }
    });

    // Cleanup listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Clear all saved data
  const clearAllData = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete all saved location data?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('locations');
            Alert.alert('Data Cleared', 'All location data has been deleted.');
          },
        },
      ]
    );
  };

  // Add note to current location
  const addNoteToCurrentLocation = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please wait for your location to be fetched before adding a note.');
      return;
    }

    if (!noteText.trim()) {
      Alert.alert('Note Required', 'Please enter a note before saving.');
      return;
    }

    try {
      // Get saved locations
      const savedLocations = JSON.parse((await AsyncStorage.getItem('locations')) || '[]');
      
      // Find if current location exists
      const existingIndex = savedLocations.findIndex(
        (loc: any) => 
          Math.abs(loc.latitude - location.coords.latitude) < 0.0001 && 
          Math.abs(loc.longitude - location.coords.longitude) < 0.0001
      );

      if (existingIndex !== -1) {
        // Location exists, add note to it
        if (!savedLocations[existingIndex].notes) {
          savedLocations[existingIndex].notes = [];
        }
        
        // Add note with timestamp
        const noteWithTimestamp = `${new Date().toLocaleString()}: ${noteText}`;
        savedLocations[existingIndex].notes.push(noteWithTimestamp);
        
        // Save updated locations
        await AsyncStorage.setItem('locations', JSON.stringify(savedLocations));
        Alert.alert('Success', 'Note added to this location!');
        setNoteText(''); // Clear input
      } else {
        Alert.alert('Error', 'Current location not found in saved locations. Please refresh your location.');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <Text style={styles.title}>GeoMemory 📍</Text>

      {/* Current Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Location</Text>
        {location ? (
          <>
            <Text style={styles.text}>
              Lat: {location.coords.latitude.toFixed(6)}, Lng: {location.coords.longitude.toFixed(6)}
            </Text>
            <Text style={styles.lastFetchedText}>Last fetched at: {lastFetchTime}</Text>
          </>
        ) : (
          <Text style={styles.text}>Waiting for location...</Text>
        )}
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>

      {/* Add Note Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Memory Note</Text>
        <TextInput
          style={styles.input}
          placeholder="What's special about this place?"
          value={noteText}
          onChangeText={setNoteText}
          multiline
          numberOfLines={3}
        />
        <View style={styles.buttonContainer}>
          <Button 
            title="Save Memory Note" 
            onPress={addNoteToCurrentLocation} 
            disabled={!location || !noteText.trim()}
            color="#007AFF"
          />
        </View>
      </View>

      {/* Buttons Section */}
      <Text>testing tools:</Text>
      <View style={styles.buttonContainer}>
        <Button title="Refresh Location (forced)" onPress={fetchLocation} />
      </View>

      {/* Test Notification Button - Add this to troubleshoot */}
      <View style={styles.buttonContainer}>
        <Button title="Test Notification" onPress={testNotification} color="#8a2be2" />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Clear All Data" onPress={clearAllData} color="#FF6347" />
      </View>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    padding: 16 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginVertical: 20, 
    color: '#333' 
  },
  section: { 
    width: '100%', 
    backgroundColor: 'white', 
    borderRadius: 8, 
    padding: 16, 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    color: '#333' 
  },
  text: { 
    fontSize: 16, 
    color: '#333', 
    marginBottom: 8 
  },
  errorText: { 
    fontSize: 16, 
    color: 'red', 
    marginBottom: 8 
  },
  lastFetchedText: { 
    fontSize: 14, 
    color: '#666', 
    fontStyle: 'italic', 
    marginTop: 4 
  },
  buttonContainer: { 
    width: '100%', 
    marginVertical: 8 
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    minHeight: 80,
    textAlignVertical: 'top'
  }
});