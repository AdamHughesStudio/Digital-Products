import type { Game, GameType, Golfer, HandicapPreference, TimeOfDay } from '@/data/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayDiff(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Today", "Tomorrow", "Saturday" (within a week) or "Sat 12 Oct" */
export function relativeDay(d: Date, now = new Date()) {
  const diff = dayDiff(d, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return DAYS_LONG[d.getDay()];
  return shortDate(d);
}

export function shortDate(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(d: Date) {
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayLabel(d: Date) {
  return DAYS[d.getDay()];
}

export function monthLabel(d: Date) {
  return MONTHS[d.getMonth()];
}

export function timeAgo(iso: string, now = new Date()) {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return shortDate(new Date(iso));
}

export function chatTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const diff = dayDiff(now, d);
  if (diff === 0) return formatTime(d);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return DAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function timeOfDayFor(d: Date): Exclude<TimeOfDay, 'any'> {
  const h = d.getHours();
  if (h < 9) return 'early';
  if (h < 12) return 'morning';
  if (h < 16) return 'afternoon';
  return 'evening';
}

export const timeOfDayLabels: Record<TimeOfDay, string> = {
  early: 'Early (before 9am)',
  morning: 'Morning (9am to 12pm)',
  afternoon: 'Afternoon (12pm to 4pm)',
  evening: 'Evening (after 4pm)',
  any: 'Any time',
};

export const timeOfDayShort: Record<TimeOfDay, string> = {
  early: 'Early',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  any: 'Any time',
};

export const gameTypeLabels: Record<GameType, string> = {
  casual: 'Casual round',
  member_guest: 'Member guest',
  competition: 'Competition',
  society: 'Society',
  open: 'Open invitation',
};

/** Stored for golfers who don't have a handicap yet (the maximum handicap index) */
export const NO_HANDICAP = 54;

/** "12.4 HCP", or a friendly label for golfers without a handicap */
export function hcpText(h: number) {
  return h >= NO_HANDICAP ? 'No handicap yet' : `${handicapLabel(h)} HCP`;
}

export function handicapLabel(h: number) {
  if (h < 0) return `+${Math.abs(h).toFixed(1)}`;
  return h.toFixed(1);
}

export function handicapPrefLabel(p: HandicapPreference) {
  if (p.kind === 'any') return 'Any handicap';
  if (p.kind === 'max') return `Under ${p.max}`;
  return `${p.min} to ${p.max}`;
}

export function handicapFits(p: HandicapPreference, h: number) {
  if (p.kind === 'any') return true;
  if (p.kind === 'max') return h <= p.max;
  return h >= p.min && h <= p.max;
}

export function priceLabel(cost?: number) {
  if (cost === undefined || cost === null) return 'Cost TBC';
  if (cost === 0) return 'Free';
  return `£${cost % 1 === 0 ? cost : cost.toFixed(2)}`;
}

export function displayName(g: Golfer, viewerIsSelf = false) {
  if (viewerIsSelf || g.showSurname) return `${g.firstName} ${g.lastName}`;
  return `${g.firstName} ${g.lastName.charAt(0)}.`;
}

export function initials(g: Golfer) {
  return `${g.firstName.charAt(0)}${g.lastName.charAt(0)}`.toUpperCase();
}

export function milesLabel(m: number) {
  if (m < 1) return 'Under 1 mile';
  const r = Math.round(m);
  return `${r} mile${r === 1 ? '' : 's'}`;
}

/** Great circle distance in miles */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function placeLabel(c: { town: string; region: string }) {
  return c.town === c.region ? c.town : `${c.town}, ${c.region}`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function gameDate(g: Game) {
  return new Date(g.teeTime);
}
