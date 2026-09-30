import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * A tiny on-device store for the things that live outside the demo state: saved events, alerts,
 * reviews. Loads once, saves on every change, and re-renders anything subscribed to it.
 */
export function createLocalStore<T>(key: string, initial: T) {
  let value = initial;
  let loaded = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        value = JSON.parse(raw) as T;
        emit();
      }
    } catch {
      // start fresh
    }
  }

  function set(next: T) {
    value = next;
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
    emit();
  }

  function use() {
    useEffect(() => {
      load();
    }, []);
    return useSyncExternalStore(
      (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      () => value,
      () => value,
    );
  }

  return { get: () => value, set, use, update: (fn: (v: T) => T) => set(fn(value)) };
}
