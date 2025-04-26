import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULTS } from './helpers/StorageHelper';

// Function to reset AsyncStorage to default values
export const resetStorage = async () => {
  try {
    // Clear all existing storage
    await AsyncStorage.clear();
    
    // Set the new default player data
    await AsyncStorage.setItem('playerData', JSON.stringify(DEFAULTS.PLAYER_DATA));
    
    console.log('Storage reset successful! Using new default values.');
    return true;
  } catch (error) {
    console.error('Error resetting storage:', error);
    return false;
  }
}; 