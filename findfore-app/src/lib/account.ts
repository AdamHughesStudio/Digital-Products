import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Sign out, or delete the account. In the preview everything lives on this phone, so both clear
 * every FindFore key and start again from the welcome screen.
 */
export async function clearAccount(resetDemo: () => void) {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('findfore'));
    await AsyncStorage.multiRemove(keys);
  } catch {
    // nothing stored
  }
  resetDemo();
  // the web app reloads so every on-device store starts empty too
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.replace('/welcome');
  else router.replace('/welcome');
}
