import React, { useEffect, useState, useCallback} from 'react';
import { View, Text, Button, Alert, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';


// Types
type SavedLocation = {
  place: string;
  latitude: number;
  longitude: number;
  timestamp: string;        // First visited timestamp
  lastVisited?: string;     // Last visited timestamp
  count?: number;
  notes?: string[];         // Array of notes for this location
};

export default function SavedLocationsScreen() {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedLocations, setExpandedLocations] = useState<{[key: number]: boolean}>({});

  // Add this near the top of your component, after your other state hooks
useFocusEffect(
  useCallback(() => {
    // This will run when the screen comes into focus
    loadSavedLocations();
    return () => {
      // Optional cleanup if needed
    };
  }, [])
);

  const loadSavedLocations = async () => {
    try {
      const locations = JSON.parse((await AsyncStorage.getItem('locations')) || '[]');
      setSavedLocations(locations);
    } catch (error) {
      console.error('Error loading saved locations:', error);
      Alert.alert('Error', 'Failed to load saved locations.');
    }
  };

  useEffect(() => {
    loadSavedLocations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedLocations();
    setRefreshing(false);
  };

  const toggleLocationExpanded = (index: number) => {
    setExpandedLocations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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
            setSavedLocations([]);
            Alert.alert('Data Cleared', 'All location data has been deleted.');
          },
        },
      ]
    );
  };

  const deleteNote = async (locationIndex: number, noteIndex: number) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedLocations = [...savedLocations];
              if (updatedLocations[locationIndex].notes) {
                updatedLocations[locationIndex].notes?.splice(noteIndex, 1);
                await AsyncStorage.setItem('locations', JSON.stringify(updatedLocations));
                setSavedLocations(updatedLocations);
              }
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.container}>
        <Text style={styles.title}>Saved Locations</Text>

        {savedLocations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No saved locations yet.</Text>
            <Text style={styles.emptySubtext}>Your visited places will appear here.</Text>
          </View>
        ) : (
          <View style={styles.locationsContainer}>
            <Text style={styles.countText}>Total Locations: {savedLocations.length}</Text>
            
            {savedLocations.map((location, index) => (
              <View key={index} style={styles.locationCard}>
                <TouchableOpacity 
                  style={styles.locationHeader}
                  onPress={() => toggleLocationExpanded(index)}
                >
                  <View style={styles.locationTitleRow}>
                    <Text style={styles.locationName}>{location.place}</Text>
                    <Ionicons 
                      name={expandedLocations[index] ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#666" 
                    />
                  </View>
                  <Text style={styles.locationDetails}>
                    Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.visitCount}>
                    Visited {location.count} {location.count === 1 ? 'time' : 'times'}
                  </Text>
                </TouchableOpacity>

                {expandedLocations[index] && (
                  <View style={styles.expandedContent}>
                    <View style={styles.timestampContainer}>
                      <Text style={styles.timestamp}>First visited: {location.timestamp}</Text>
                      {location.lastVisited && location.count && location.count > 1 ? (
                        <Text style={styles.timestamp}>Last visited: {location.lastVisited}</Text>
                      ) : null}
                    </View>
                    
                    {/* Notes Section */}
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesTitle}>
                        Memory Notes {location.notes?.length ? `(${location.notes.length})` : ''}
                      </Text>
                      
                      {!location.notes?.length ? (
                        <Text style={styles.emptyNotesText}>No notes added for this location.</Text>
                      ) : (
                        location.notes.map((note, noteIndex) => (
                          <View key={noteIndex} style={styles.noteItem}>
                            <Text style={styles.noteText}>{note}</Text>
                            <TouchableOpacity 
                              style={styles.deleteNoteButton}
                              onPress={() => deleteNote(index, noteIndex)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#FF6347" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button title="Clear All Data" onPress={clearAllData} color="#FF6347" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1 
  },
  container: { 
    flex: 1, 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    padding: 16 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginVertical: 16, 
    color: '#333' 
  },
  emptyContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50
  },
  emptyText: { 
    fontSize: 18,
    fontWeight: '500',
    color: '#666'
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 8
  },
  locationsContainer: { 
    width: '100%' 
  },
  countText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333'
  },
  locationCard: { 
    backgroundColor: 'white', 
    borderRadius: 8, 
    padding: 16, 
    marginBottom: 12, 
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2
  },
  locationHeader: {
    width: '100%'
  },
  locationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  locationName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333',
    marginBottom: 4,
    flex: 1
  },
  locationDetails: { 
    fontSize: 14, 
    color: '#666',
    marginBottom: 4
  },
  visitCount: { 
    fontSize: 14, 
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  timestampContainer: {
    marginBottom: 8
  },
  timestamp: { 
    fontSize: 12, 
    color: '#999',
    marginTop: 2
  },
  notesContainer: {
    marginTop: 8
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333'
  },
  emptyNotesText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic'
  },
  noteItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  noteText: {
    fontSize: 13,
    color: '#333',
    flex: 1
  },
  deleteNoteButton: {
    padding: 4
  },
  buttonContainer: { 
    width: '100%', 
    marginVertical: 12
  }
});