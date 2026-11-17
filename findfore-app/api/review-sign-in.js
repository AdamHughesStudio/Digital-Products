/**
 * Signs in the App Store and Play Store review account, whose reviewers can't receive our emailed
 * codes. Only the one review address works, and only with its fixed code (given to Apple and Google
 * in the review notes), checked against the hash kept in the review_access table. Everyone else signs in with
 * an emailed code as normal. Returns a one-time sign-in token the app swaps for a session.
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const REVIEW_EMAIL = 'appreview@getplusfore.app';

const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: 'Review sign-in is not set up' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: row } = email === REVIEW_EMAIL ? await admin.from('review_access').select('code_hash').eq('email', email).maybeSingle() : { data: null };
  const given = crypto.createHash('sha256').update(String(body.code || '').trim()).digest('hex');
  if (!row || !same(given, row.code_hash)) {
    // slow down guessing
    await new Promise((r) => setTimeout(r, 1500));
    return res.status(401).json({ error: 'That code didn’t work.' });
  }

  // the account is made the first time it's used
  await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data?.properties?.hashed_token) return res.status(502).json({ error: 'Couldn’t sign in. Try again.' });
  return res.status(200).json({ tokenHash: data.properties.hashed_token });
};
