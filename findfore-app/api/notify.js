/**
 * Sends push notifications. The database calls this whenever a request, invite, friend request or
 * message is created or answered, and once each evening for game reminders.
 *
 * Nothing in the call is trusted: it only names which record changed. This function re-reads that
 * record with full access, only acts on changes from the last few minutes, and logs each push it
 * sends, so a repeated or made up call can never send anything twice or to the wrong person.
 */
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const FRESH_MS = 5 * 60 * 1000;
// someone who has read the chat this recently is looking at it, so they don't need a buzz
const ACTIVE_MS = 45 * 1000;
const DEFAULT_PREFS = { gameRequests: true, messages: true, friendRequests: true, gameReminders: true };

const fresh = (iso) => !!iso && Date.now() - new Date(iso).getTime() < FRESH_MS;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const when = (iso) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(d);
  return `${day} at ${time}`;
};
const londonDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d);

function makeContext(db) {
  const people = new Map();
  async function person(id) {
    if (!people.has(id)) {
      const { data } = await db.from('profiles').select('first_name, last_name, show_surname').eq('id', id).maybeSingle();
      people.set(id, data || { first_name: 'A golfer', last_name: '', show_surname: true });
    }
    return people.get(id);
  }
  const first = async (id) => (await person(id)).first_name;
  const full = async (id) => {
    const p = await person(id);
    if (!p.last_name) return p.first_name;
    return p.show_surname ? `${p.first_name} ${p.last_name}` : `${p.first_name} ${p.last_name.charAt(0)}.`;
  };

  /** Reserve a push so it only ever goes once. False if it has already been sent. */
  async function claim(key) {
    const { error } = await db.from('push_log').insert({ key });
    return !error;
  }

  /** Send to every phone the golfer has, if they want this kind of notification */
  async function deliver(userId, pref, note, key) {
    const { data: row } = await db.from('notification_prefs').select('prefs').eq('user_id', userId).maybeSingle();
    const prefs = { ...DEFAULT_PREFS, ...((row && row.prefs) || {}) };
    if (prefs[pref] === false) return 0;
    const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId);
    if (!subs || subs.length === 0) return 0;
    if (!(await claim(`${key}:${userId}`))) return 0;
    const { data: badge } = await db.rpc('badge_count', { who: userId });
    const payload = JSON.stringify({ ...note, badge: typeof badge === 'number' ? badge : undefined });
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
          sent++;
        } catch (e) {
          // the phone has turned notifications off or the app was removed: forget it
          if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }),
    );
    return sent;
  }

  return { first, full, deliver };
}

// ---------- events ----------

async function onMessage(db, ctx, id) {
  const { data: m } = await db.from('messages').select('*').eq('id', id).maybeSingle();
  if (!m || !fresh(m.created_at)) return 0;
  let recipients;
  let title;
  let url;
  if (m.game_id) {
    const { data: g } = await db.from('games').select('id, host_id, course_name').eq('id', m.game_id).maybeSingle();
    if (!g) return 0;
    const { data: players } = await db.from('game_requests').select('golfer_id').eq('game_id', g.id).eq('status', 'accepted');
    recipients = [g.host_id, ...(players || []).map((p) => p.golfer_id)];
    title = `${await ctx.first(m.sender_id)} · ${g.course_name || 'Game chat'}`;
    url = `/chat/chat-game-${g.id}`;
  } else {
    recipients = [m.dm_low, m.dm_high];
    title = await ctx.full(m.sender_id);
    // the recipient's phone names a direct chat by the other golfer's id and 'me', sorted
    url = `/chat/chat-dm-${[m.sender_id, 'me'].sort().join('-')}`;
  }
  recipients = [...new Set(recipients)].filter((r) => r && r !== m.sender_id);
  if (recipients.length === 0) return 0;
  const { data: reads } = await db.from('conversation_reads').select('user_id, last_read_at').eq('conv', m.conv).in('user_id', recipients);
  const watching = new Set((reads || []).filter((r) => Date.now() - new Date(r.last_read_at).getTime() < ACTIVE_MS).map((r) => r.user_id));
  const note = { title, body: clip(m.body, 160), url };
  let sent = 0;
  for (const r of recipients) if (!watching.has(r)) sent += await ctx.deliver(r, 'messages', note, `msg:${m.id}`);
  return sent;
}

async function onRequest(db, ctx, id) {
  const { data: r } = await db.from('game_requests').select('*').eq('id', id).maybeSingle();
  if (!r || !fresh(r.updated_at)) return 0;
  const { data: g } = await db.from('games').select('*').eq('id', r.game_id).maybeSingle();
  if (!g || new Date(g.tee_time).getTime() < Date.now()) return 0;
  const where = `${g.course_name || 'Your game'}, ${when(g.tee_time)}`;
  const key = `req:${r.id}:${r.status}:${r.updated_at}`;
  const game = `/game/${g.id}`;
  if (r.status === 'pending' && r.kind === 'request') {
    return ctx.deliver(g.host_id, 'gameRequests', { title: `${await ctx.first(r.golfer_id)} wants to join your game`, body: r.message ? `${where}. “${clip(r.message, 100)}”` : where, url: game }, key);
  }
  if (r.status === 'pending' && r.kind === 'invite') {
    return ctx.deliver(r.golfer_id, 'gameRequests', { title: `${await ctx.first(g.host_id)} invited you to a game`, body: where, url: '/messages?tab=requests' }, key);
  }
  if (r.status === 'accepted' && r.kind === 'request') {
    return ctx.deliver(r.golfer_id, 'gameRequests', { title: `${await ctx.first(g.host_id)} accepted your request`, body: `You’re in for ${where}.`, url: game }, key);
  }
  if (r.status === 'accepted' && r.kind === 'invite') {
    return ctx.deliver(g.host_id, 'gameRequests', { title: `${await ctx.first(r.golfer_id)} accepted your invite`, body: where, url: game }, key);
  }
  if (r.status === 'declined' && r.kind === 'request' && !g.cancelled) {
    return ctx.deliver(r.golfer_id, 'gameRequests', { title: 'Not this time', body: `${await ctx.first(g.host_id)}’s game at ${g.course_name || 'the course'} is sorted. Plenty more out there.`, url: '/' }, key);
  }
  return 0;
}

async function onFriendship(db, ctx, requester, addressee) {
  const { data: f } = await db.from('friendships').select('*').eq('requester', requester).eq('addressee', addressee).maybeSingle();
  if (!f) return 0;
  const at = f.responded_at || f.created_at;
  if (!fresh(at)) return 0;
  const key = `friend:${f.requester}:${f.addressee}:${f.status}:${at}`;
  if (f.status === 'pending') {
    return ctx.deliver(f.addressee, 'friendRequests', { title: `${await ctx.full(f.requester)} wants to be friends`, body: f.note ? clip(f.note, 140) : 'Accept to invite each other to games and message.', url: '/friends' }, key);
  }
  return ctx.deliver(f.requester, 'friendRequests', { title: `You and ${await ctx.first(f.addressee)} are now friends`, body: 'You can invite each other to games and message.', url: `/golfer/${f.addressee}` }, key);
}

async function onReminders(db, ctx) {
  const tomorrow = londonDate(new Date(Date.now() + 86400000));
  const { data: games } = await db
    .from('games')
    .select('id, host_id, tee_time, course_name')
    .eq('cancelled', false)
    .gte('tee_time', new Date().toISOString())
    .lte('tee_time', new Date(Date.now() + 2 * 86400000).toISOString());
  let sent = 0;
  for (const g of (games || []).filter((x) => londonDate(new Date(x.tee_time)) === tomorrow)) {
    const { data: players } = await db.from('game_requests').select('golfer_id').eq('game_id', g.id).eq('status', 'accepted');
    const everyone = [g.host_id, ...(players || []).map((p) => p.golfer_id)];
    // only games that have someone to play with
    if (everyone.length < 2) continue;
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(new Date(g.tee_time));
    const note = { title: 'Your game is tomorrow', body: `${g.course_name || 'Golf'} at ${time}. Enjoy your round.`, url: `/game/${g.id}` };
    for (const u of everyone) sent += await ctx.deliver(u, 'gameReminders', note, `remind:${g.id}`);
  }
  return sent;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const { SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!url || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return res.status(503).json({ error: 'Notifications are not set up on the server' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const ref = body.ref || {};
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  webpush.setVapidDetails('https://findfore.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const db = createClient(url, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const ctx = makeContext(db);

  try {
    let sent = 0;
    if (body.type === 'messages' && uuid.test(ref.id)) sent = await onMessage(db, ctx, ref.id);
    else if (body.type === 'game_requests' && uuid.test(ref.id)) sent = await onRequest(db, ctx, ref.id);
    else if (body.type === 'friendships' && uuid.test(ref.requester) && uuid.test(ref.addressee)) sent = await onFriendship(db, ctx, ref.requester, ref.addressee);
    else if (body.type === 'reminders') sent = await onReminders(db, ctx);
    else return res.status(400).json({ error: 'Unknown event' });
    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    return res.status(500).json({ error: 'Could not send notifications' });
  }
};
