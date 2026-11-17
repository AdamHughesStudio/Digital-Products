/**
 * Admins only: act on a report. Banning stops the golfer signing in for good; a phone they are
 * already signed in on loses access within the hour, when its sign in next renews. Their open
 * reports are marked as dealt with. The caller's own sign in token is
 * checked, and they must be listed in the admins table, before anything happens.
 */
const { createClient } = require('@supabase/supabase-js');

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: 'Moderation is not set up on the server' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: who, error: authError } = await admin.auth.getUser(token);
  if (authError || !who.user) return res.status(401).json({ error: 'Sign in again, then try once more' });
  const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', who.user.id).maybeSingle();
  if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { action, golferId, note } = body;
  if (action !== 'ban' || !uuid.test(golferId || '')) return res.status(400).json({ error: 'Say who to ban' });
  if (golferId === who.user.id) return res.status(400).json({ error: 'You can’t ban yourself' });

  // about a hundred years: Supabase has no permanent ban, so this is as good as one
  const { error: banError } = await admin.auth.admin.updateUserById(golferId, { ban_duration: '876000h' });
  if (banError) return res.status(502).json({ error: 'Could not ban this golfer' });
  await admin.from('reports').update({ status: 'actioned', resolved_at: new Date().toISOString(), resolved_by: who.user.id, resolution: (note || 'Banned').slice(0, 500) })
    .eq('reported', golferId).eq('status', 'open');
  return res.status(200).json({ ok: true });
};
