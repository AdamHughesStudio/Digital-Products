import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import type { Golfer } from '@/data/types';
import { NO_HANDICAP } from '@/lib/format';
import { AVATAR_BUCKET, avatarUrl, supabase } from '@/lib/supabase';

/** The parts of a profile that live online. Ratings and game counts arrive with shared games. */
export type CloudProfile = Pick<
  Golfer,
  'firstName' | 'lastName' | 'username' | 'handicap' | 'handicapVerified' | 'homeClub' | 'bio' | 'location' | 'radiusMiles' | 'showSurname' | 'showHomeClub'
> & { photoPath?: string; photoUri?: string; memberSince: number };

export interface ProfileRow {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  handicap_verified: boolean;
  home_club: string | null;
  bio: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  radius_miles: number;
  photo_path: string | null;
  show_surname: boolean;
  show_home_club: boolean;
  created_at: string;
}

export function fromRow(r: ProfileRow): CloudProfile {
  return {
    firstName: r.first_name,
    lastName: r.last_name,
    username: r.username,
    // no handicap yet is stored as empty
    handicap: r.handicap ?? NO_HANDICAP,
    handicapVerified: r.handicap_verified,
    homeClub: r.home_club ?? undefined,
    bio: r.bio ?? '',
    location: { name: r.location_name ?? 'Glasgow', lat: r.location_lat ?? 55.8642, lng: r.location_lng ?? -4.2518 },
    radiusMiles: r.radius_miles,
    showSurname: r.show_surname,
    showHomeClub: r.show_home_club,
    photoPath: r.photo_path ?? undefined,
    photoUri: avatarUrl(r.photo_path),
    memberSince: new Date(r.created_at).getFullYear(),
  };
}

type ProfilePatch = Partial<Pick<Golfer, 'firstName' | 'lastName' | 'username' | 'handicap' | 'homeClub' | 'bio' | 'location' | 'radiusMiles' | 'showSurname' | 'showHomeClub'>> & {
  photoPath?: string | null;
};

function toRow(p: ProfilePatch) {
  const row: Record<string, unknown> = {};
  if (p.firstName !== undefined) row.first_name = p.firstName.trim();
  if (p.lastName !== undefined) row.last_name = p.lastName.trim();
  if (p.username !== undefined) row.username = p.username;
  if (p.handicap !== undefined) row.handicap = p.handicap >= NO_HANDICAP ? null : p.handicap;
  if ('homeClub' in p) row.home_club = p.homeClub?.trim() || null;
  if (p.bio !== undefined) row.bio = p.bio.trim();
  if (p.location) {
    row.location_name = p.location.name;
    row.location_lat = p.location.lat;
    row.location_lng = p.location.lng;
  }
  if (p.radiusMiles !== undefined) row.radius_miles = p.radiusMiles;
  if (p.showSurname !== undefined) row.show_surname = p.showSurname;
  if (p.showHomeClub !== undefined) row.show_home_club = p.showHomeClub;
  if ('photoPath' in p) row.photo_path = p.photoPath ?? null;
  return row;
}

export type CloudResult<T = void> = { ok: true; value: T } | { ok: false; error: string; code?: string };

function friendly(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (/fetch|network/i.test(message)) return 'No connection. Check your signal and try again.';
  return message;
}

// ---------- signing in ----------

export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Email a one time code. New emails get an account, existing ones sign straight in. */
export async function sendSignInCode(email: string): Promise<CloudResult> {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (!error) return { ok: true, value: undefined };
  if (error.status === 429) return { ok: false, error: 'Too many codes asked for. Wait a minute, then try again.' };
  return { ok: false, error: friendly(error.message, 'We couldn’t send a code. Try again.') };
}

export async function verifySignInCode(email: string, code: string): Promise<CloudResult<string>> {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
  if (error || !data.user) {
    const expired = /expired|invalid/i.test(error?.message ?? '');
    return { ok: false, error: expired ? 'That code didn’t work. Check it, or send a new one.' : friendly(error?.message, 'That code didn’t work.') };
  }
  return { ok: true, value: data.user.id };
}

export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Who is signed in, kept up to date as people sign in and out */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

export async function signOutCloud() {
  try {
    await supabase.auth.signOut();
  } catch {
    // signed out locally either way
  }
}

/** Remove the account and everything attached to it. Needs the server, which holds the admin key. */
export async function deleteCloudAccount(): Promise<CloudResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: true, value: undefined };
  try {
    const res = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: 'We couldn’t delete your account just now. Try again.' };
    await signOutCloud();
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: 'No connection. Check your signal and try again.' };
  }
}

// ---------- profiles ----------

export async function fetchMyProfile(): Promise<CloudResult<CloudProfile | null>> {
  const id = await currentUserId();
  if (!id) return { ok: true, value: null };
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: friendly(error.message, 'We couldn’t load your profile.') };
  return { ok: true, value: data ? fromRow(data as ProfileRow) : null };
}

/** Create or update the signed in golfer's profile. A clash on username comes back as code 'taken'. */
export async function saveMyProfile(patch: ProfilePatch, create = false): Promise<CloudResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, error: 'You’re signed out. Sign in again to save.' };
  const row = toRow(patch);
  const { error } = create
    ? await supabase.from('profiles').upsert({ id, ...row })
    : await supabase.from('profiles').update(row).eq('id', id);
  if (!error) return { ok: true, value: undefined };
  if (error.code === '23505') return { ok: false, error: 'That username’s just been taken', code: 'taken' };
  return { ok: false, error: friendly(error.message, 'We couldn’t save your profile. Try again.') };
}

/** Whether nobody else has this username. Unknown (offline) counts as available; saving checks again. */
export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { candidate: username });
  if (error) return true;
  return data === true;
}

// ---------- photos ----------

/** Store a profile photo online and point the profile at it. Returns the photo's web address. */
export async function uploadProfilePhoto(uri: string): Promise<CloudResult<string>> {
  const id = await currentUserId();
  if (!id) return { ok: false, error: 'You’re signed out. Sign in again to change your photo.' };
  try {
    const body = await (await fetch(uri)).arrayBuffer();
    // a new name each time, so phones never show an old cached photo
    const path = `${id}/photo-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (error) return { ok: false, error: friendly(error.message, 'We couldn’t upload that photo.') };
    const old = await fetchPhotoPath(id);
    const saved = await saveMyProfile({ photoPath: path });
    if (!saved.ok) return saved;
    if (old && old !== path) supabase.storage.from(AVATAR_BUCKET).remove([old]).catch(() => {});
    return { ok: true, value: avatarUrl(path)! };
  } catch {
    return { ok: false, error: 'No connection. Check your signal and try again.' };
  }
}

export async function removeProfilePhoto(): Promise<CloudResult> {
  const id = await currentUserId();
  if (!id) return { ok: true, value: undefined };
  const old = await fetchPhotoPath(id);
  const saved = await saveMyProfile({ photoPath: null });
  if (saved.ok && old) supabase.storage.from(AVATAR_BUCKET).remove([old]).catch(() => {});
  return saved;
}

async function fetchPhotoPath(id: string) {
  const { data } = await supabase.from('profiles').select('photo_path').eq('id', id).maybeSingle();
  return (data as { photo_path: string | null } | null)?.photo_path ?? null;
}

/** A cloud profile in the shape the app keeps on the phone */
export function golferPatch(p: CloudProfile): Partial<Golfer> {
  const { photoPath: _path, ...rest } = p;
  return { ...rest, avatar: undefined };
}

/**
 * Checks a username against everyone else's as it is typed. Only asks once typing pauses, and
 * never for the name the golfer already has.
 */
export function useUsernameTaken(username: string, enabled: boolean, current?: string) {
  const [taken, setTaken] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !username || username === current) return;
    let live = true;
    const t = setTimeout(async () => {
      const free = await usernameAvailable(username);
      if (live) setTaken(free ? null : username);
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [username, enabled, current]);
  return !!taken && taken === username;
}
