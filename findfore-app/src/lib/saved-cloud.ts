import AsyncStorage from '@react-native-async-storage/async-storage';

import { cloudUser } from '@/lib/social';
import { supabase } from '@/lib/supabase';

/** A saved competition as the account holds it: whose, which, and when */
export interface SavedRow {
  user_id: string;
  event_id: string;
  created_at: string;
}

/** Keep a save or unsave on the account, when someone is signed in. Failures wait for the next sync. */
export function saveCompetitionCloud(eventId: string, on: boolean) {
  const me = cloudUser();
  if (!me) return;
  const run = on
    ? supabase.from('saved_competitions').upsert({ user_id: me, event_id: eventId }, { onConflict: 'user_id,event_id', ignoreDuplicates: true })
    : supabase.from('saved_competitions').delete().eq('user_id', me).eq('event_id', eventId);
  run.then(() => {}, () => {});
}

/** Your saves and your friends' saves; the server only returns those two */
export async function fetchSavedCloud(): Promise<SavedRow[] | null> {
  const { data, error } = await supabase.from('saved_competitions').select('user_id, event_id, created_at').limit(5000);
  if (error) return null;
  return (data ?? []) as SavedRow[];
}

/**
 * The first time an account syncs on this phone, saves made here before signing in are added to
 * the account, so nothing saved earlier is lost. After that the account is the record.
 */
export async function uploadLocalSavesOnce(me: string, local: string[]) {
  const key = `findfore:saves-uploaded:${me}`;
  if (await AsyncStorage.getItem(key).catch(() => '1')) return;
  if (local.length) {
    const { error } = await supabase
      .from('saved_competitions')
      .upsert(local.map((event_id) => ({ user_id: me, event_id })), { onConflict: 'user_id,event_id', ignoreDuplicates: true });
    if (error) return;
  }
  await AsyncStorage.setItem(key, '1').catch(() => {});
}
