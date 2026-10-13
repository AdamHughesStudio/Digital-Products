import type { AppState } from '@/data/types';

/**
 * Usernames: the handle people search for, since names are not unique. Lower case letters,
 * numbers, dots and underscores, 3 to 20 characters, shown with an @ in front.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Strip the @ and anything a username cannot hold, and lower case it */
export function normaliseUsername(raw: string) {
  return raw.toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, USERNAME_MAX);
}

export function usernameError(u: string): string | null {
  if (u.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters`;
  if (!/^[a-z0-9._]+$/.test(u)) return 'Letters, numbers, dots and underscores only';
  if (/^[._]|[._]$/.test(u)) return 'Can’t start or end with a dot or underscore';
  return null;
}

export function usernameTaken(s: Pick<AppState, 'golfers'>, u: string, exceptId?: string) {
  return Object.values(s.golfers).some((g) => g.id !== exceptId && g.username === u);
}

/** A free handle from someone's name: "tomfraser", then "tomfraser2" and so on */
export function suggestUsername(first: string, last: string, s: Pick<AppState, 'golfers'>, exceptId?: string) {
  const base = normaliseUsername(`${first}${last}`) || normaliseUsername(first) || 'golfer';
  const padded = base.length < USERNAME_MIN ? `${base}golf` : base;
  if (!usernameTaken(s, padded, exceptId)) return padded;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${padded.slice(0, USERNAME_MAX - String(n).length)}${n}`;
    if (!usernameTaken(s, candidate, exceptId)) return candidate;
  }
  return `${padded.slice(0, USERNAME_MAX - 4)}${Date.now().toString(36).slice(-4)}`;
}

export const atName = (u: string) => `@${u}`;
