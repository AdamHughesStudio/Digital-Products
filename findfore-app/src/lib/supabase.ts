import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Both values are public by design: the database rules decide what anyone can read or change
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dmdpywaljmowdylkgrzp.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qRXnkBeP_yV5ZTbEEj_Q2g_6EcXLXEt';

// static rendering runs without a window, so only keep a session where there is somewhere to keep it
const canPersist = Platform.OS !== 'web' || typeof window !== 'undefined';

export const supabase = createClient(URL, KEY, {
  auth: {
    storage: canPersist ? AsyncStorage : undefined,
    persistSession: canPersist,
    autoRefreshToken: canPersist,
    // sign in uses a typed code, so links never need reading from the address bar
    detectSessionInUrl: false,
  },
});

export const AVATAR_BUCKET = 'avatars';

export function avatarUrl(path?: string | null) {
  if (!path) return undefined;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}
