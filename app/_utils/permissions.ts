import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const requestPermissions = async () => {
  const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  const { status: notifStatus } = await Notifications.requestPermissionsAsync();

  return {
    locationForeground: locationStatus,
    locationBackground: backgroundStatus,
    notifications: notifStatus,
  };
};

export const checkStatus = async () => {
  const permissions = await requestPermissions();
  return permissions;
};

export const clearAllData = async () => {
  await AsyncStorage.clear();
};

export const showSavedLocations = async () => {
  const savedLocations = JSON.parse((await AsyncStorage.getItem('locations')) || '[]');
  if (savedLocations.length === 0) {
    Alert.alert('No Locations', 'No locations have been saved yet.');
    return;
  }

  Alert.alert(
    'Saved Locations',
    savedLocations.map((loc: any) => `${loc.place} @ ${new Date(loc.timestamp).toLocaleString()}`).join('\n')
  );
};