/**
 * Deletes the signed in golfer's account for good. Only the account named by the caller's own
 * sign in token can be removed: the token is checked with Supabase before anything is deleted.
 * The profile goes with the account, and their photos are removed from storage.
 */
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: 'Accounts are not set up on the server' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in first' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Sign in again, then try once more' });
  const id = data.user.id;

  try {
    const { data: files } = await admin.storage.from('avatars').list(id);
    if (files && files.length) await admin.storage.from('avatars').remove(files.map((f) => `${id}/${f.name}`));
  } catch {
    // photos are tidied up later if this fails; the account still goes
  }

  const { error: delError } = await admin.auth.admin.deleteUser(id);
  if (delError) return res.status(502).json({ error: 'Could not delete the account' });
  return res.status(200).json({ ok: true });
};
