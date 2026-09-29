import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { startOfDay } from '@/lib/format';

export type Association = 'scotland' | 'england' | 'ireland' | 'wales';

export const ASSOCIATIONS: { id: Association; short: string; name: string; site: string }[] = [
  { id: 'scotland', short: 'Scotland', name: 'Scottish Golf', site: 'https://www.scottishgolf.org' },
  { id: 'england', short: 'England', name: 'England Golf', site: 'https://www.englandgolf.org' },
  { id: 'ireland', short: 'Ireland', name: 'Golf Ireland', site: 'https://www.golfireland.ie' },
  { id: 'wales', short: 'Wales', name: 'Wales Golf', site: 'https://www.walesgolf.org' },
];

export const associationById = (id: Association) => ASSOCIATIONS.find((a) => a.id === id)!;

export interface AmateurEvent {
  id: string;
  association: Association;
  title: string;
  venue: string;
  /** Days from today that entry opens (zero or negative means already open) */
  opensIn: number;
  /** Days from today that entry closes */
  closesIn: number;
  /** Days from today that the event starts */
  playedIn: number;
  /** Number of days the event runs */
  days: number;
}

/**
 * Preview listings. Dates are set relative to today so the demo always has something opening soon.
 * In the live app these would come from each association's published calendar.
 */
export const EVENTS: AmateurEvent[] = [
  { id: 'sco-amateur', association: 'scotland', title: 'Scottish Amateur Championship', venue: 'Royal Aberdeen', opensIn: 2, closesIn: 30, playedIn: 74, days: 5 },
  { id: 'eng-open', association: 'england', title: 'English Open Amateur Stroke Play', venue: 'Woodhall Spa', opensIn: -6, closesIn: 9, playedIn: 41, days: 4 },
  { id: 'ire-close', association: 'ireland', title: 'Irish Close Championship', venue: 'Portmarnock', opensIn: 5, closesIn: 33, playedIn: 82, days: 4 },
  { id: 'wal-amateur', association: 'wales', title: 'Welsh Amateur Championship', venue: 'Royal Porthcawl', opensIn: 9, closesIn: 38, playedIn: 96, days: 5 },
  { id: 'sco-mid', association: 'scotland', title: 'Scottish Mid-Amateur Championship', venue: 'Dundonald Links', opensIn: 14, closesIn: 44, playedIn: 88, days: 3 },
  { id: 'eng-mid', association: 'england', title: 'English Mid-Amateur Championship', venue: 'Royal Cinque Ports', opensIn: 21, closesIn: 52, playedIn: 105, days: 4 },
  { id: 'ire-open', association: 'ireland', title: 'Irish Open Amateur', venue: 'Royal County Down', opensIn: 27, closesIn: 58, playedIn: 118, days: 4 },
  { id: 'wal-open', association: 'wales', title: 'Welsh Open Amateur Stroke Play', venue: 'Pyle and Kenfig', opensIn: 33, closesIn: 63, playedIn: 125, days: 3 },
];

export function addDays(days: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + days);
  return d;
}

export type EntryStatus = 'soon' | 'upcoming' | 'open' | 'closing';

export function entryStatus(e: AmateurEvent): { kind: EntryStatus; text: string } {
  if (e.opensIn > 0) {
    const text = e.opensIn === 1 ? 'Opens tomorrow' : `Opens in ${e.opensIn} days`;
    return { kind: e.opensIn <= 3 ? 'soon' : 'upcoming', text };
  }
  if (e.closesIn <= 10) return { kind: 'closing', text: e.closesIn <= 1 ? 'Closes tomorrow' : `Closes in ${e.closesIn} days` };
  return { kind: 'open', text: 'Entry open' };
}

/** Events with entry still to open or currently open, soonest first */
export function upcomingEvents(association?: Association) {
  return EVENTS.filter((e) => !association || e.association === association).sort((a, b) => a.opensIn - b.opensIn);
}

// ---------- reminders (remembered on this device) ----------

const KEY = 'findfore:event-reminders';
let reminders: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      reminders = JSON.parse(raw);
      emit();
    }
  } catch {
    // start with none
  }
}

export function toggleReminder(id: string) {
  reminders = reminders.includes(id) ? reminders.filter((r) => r !== id) : [...reminders, id];
  AsyncStorage.setItem(KEY, JSON.stringify(reminders)).catch(() => {});
  emit();
  return reminders.includes(id);
}

export function useReminders() {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => reminders,
    () => reminders,
  );
}
