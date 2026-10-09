import { createLocalStore } from './local-store';

/** Games you have hearted on Home to come back to. Kept on this device only. */
const savedGames = createLocalStore<string[]>('findfore:savedGames', []);

export const useSavedGames = savedGames.use;

export function toggleSavedGame(id: string) {
  savedGames.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  return savedGames.get().includes(id);
}
