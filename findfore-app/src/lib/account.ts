import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { deleteCloudAccount, signOutCloud, type CloudResult } from '@/lib/cloud';
import { unlinkPhoneFromAccount } from '@/lib/push';

/**
 * Sign out, or delete the account. Either way every PlusFore key on this phone is cleared and
 * the app starts again from the welcome screen. Deleting also removes the account online.
 */
export async function clearAccount(resetDemo: () => void, mode: 'signout' | 'delete' = 'signout'): Promise<CloudResult> {
  // this phone stops getting the account's notifications
  await unlinkPhoneFromAccount();
  if (mode === 'delete') {
    const r = await deleteCloudAccount();
    if (!r.ok) return r;
  } else {
    await signOutCloud();
  }
  try {
    // storage keys keep their original findfore prefix, so nobody's phone loses its data in the rename
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('findfore') || k.startsWith('sb-'));
    await AsyncStorage.multiRemove(keys);
  } catch {
    // nothing stored
  }
  resetDemo();
  // the web app reloads so every on-device store starts empty too
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.replace('/welcome');
  else router.replace('/welcome');
  return { ok: true, value: undefined };
}
