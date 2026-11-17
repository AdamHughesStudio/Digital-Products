import * as Location from 'expo-location';
import { useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { courses } from '@/data/courses';
import type { Place } from '@/data/types';
import { distanceMiles } from '@/lib/format';

/**
 * Where you are right now, when you've let PlusFore use your location. Searches, the map and
 * golfers near you work from here instead of your base town while it's set. It lives only for this
 * session: nothing is saved or sent anywhere, and your base town on your profile never changes.
 */

export type LocationAnswer = 'granted' | 'denied' | 'undetermined';

let here: Place | null = null;
let fixedAt = 0;
let notNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The place you're searching from, or null when it's your base town */
export function useHere() {
  return useSyncExternalStore(subscribe, () => here, () => here);
}

/** Has the golfer said "not now" to the location card this session? */
export function useNotNow() {
  return useSyncExternalStore(subscribe, () => notNow, () => notNow);
}

export function sayNotNow() {
  notNow = true;
  emit();
}

/** Go back to searching from your base town */
export function searchFromBase() {
  here = null;
  emit();
}

/** Your profile with its location swapped for where you are now, when that's set */
export function useNearMe<M extends { location: Place } | null | undefined>(me: M): M {
  const now = useHere();
  return useMemo(() => (me && now ? ({ ...me, location: now } as M) : me), [me, now]);
}

export async function locationAnswer(): Promise<LocationAnswer> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/** The nearest town we know a golf club in, used to name a spot when the phone can't */
function nearestTown(lat: number, lng: number) {
  let best: { town: string; miles: number } | null = null;
  for (const c of courses) {
    if (!c.town) continue;
    const miles = distanceMiles(c, { lat, lng });
    if (!best || miles < best.miles) best = { town: c.town, miles };
  }
  return best && best.miles < 15 ? best.town : 'your location';
}

async function nameFor(lat: number, lng: number) {
  if (Platform.OS !== 'web') {
    try {
      const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const name = a?.city ?? a?.district ?? a?.subregion;
      if (name) return name;
    } catch {
      // fall through to the nearest club town
    }
  }
  return nearestTown(lat, lng);
}

/**
 * Asks to use your location if you haven't been asked (the phone shows its own prompt), then finds
 * where you are. Returns the answer, so the caller can explain if location is off.
 */
export async function findMyLocation(): Promise<LocationAnswer> {
  try {
    let answer = await locationAnswer();
    if (answer === 'undetermined') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      answer = status === 'granted' ? 'granted' : 'denied';
    }
    if (answer !== 'granted') return answer;
    // a town-level fix is plenty for "near me", and much quicker and kinder on the battery
    const fix =
      (Platform.OS !== 'web' ? await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 3000 }) : null) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude: lat, longitude: lng } = fix.coords;
    here = { name: await nameFor(lat, lng), lat, lng, live: true };
    fixedAt = Date.now();
    notNow = false;
    emit();
    return 'granted';
  } catch {
    return 'denied';
  }
}

/** If you've already said yes, quietly bring where you are up to date (at most every 10 minutes) */
export async function refreshIfAllowed() {
  if (here && Date.now() - fixedAt < 10 * 60_000) return;
  if ((await locationAnswer()) === 'granted') await findMyLocation();
}
