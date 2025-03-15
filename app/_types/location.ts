export type SavedLocation = {
  place: string;
  latitude: number;
  longitude: number;
  timestamp: string;        // First visited timestamp
  lastVisited?: string;     // Last visited timestamp 
  count?: number;
  notes?: string[];         // Array of notes for this location
};