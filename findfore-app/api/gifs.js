/**
 * GIF search for chats, through KLIPY. The app asks here rather than KLIPY directly, so the API
 * key stays on the server and KLIPY never learns who is searching: it sees a one-way code per
 * golfer (for its own personalisation), never an account id. Signed-in golfers only.
 *
 * GET /api/gifs              → trending
 * GET /api/gifs?q=birdie     → search
 * GET /api/gifs?check=1      → { enabled }, whether GIFs are switched on (the key is set)
 * Each GIF comes back as { id, url, preview, width, height }.
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const BASE = 'https://api.klipy.com/api/v1';
const KLIPY_HOST = /^https:\/\/([a-z0-9-]+\.)*klipy\.com\//;

/** The best rendition of one size from a KLIPY file entry: animated webp, then gif */
function pick(sizes, order) {
  for (const size of order) {
    const s = sizes && sizes[size];
    if (!s) continue;
    for (const fmt of ['webp', 'gif']) {
      const f = s[fmt];
      if (f && typeof f.url === 'string' && KLIPY_HOST.test(f.url)) return { url: f.url, width: Number(f.width) || 0, height: Number(f.height) || 0 };
    }
  }
  return null;
}

/** KLIPY's item, whichever of its shapes, as { id, url, preview, width, height } */
function toGif(item) {
  const file = item.file || item.files || item.media_formats || {};
  const main = pick(file, ['md', 'sm', 'hd', 'xs']);
  const preview = pick(file, ['sm', 'xs', 'md']) || main;
  if (!main || !main.width || !main.height) return null;
  return { id: String(item.id || item.slug || main.url), url: main.url, preview: preview.url, width: main.width, height: main.height, title: item.title || '' };
}

module.exports = async (req, res) => {
  const key = process.env.KLIPY_API_KEY;
  if (req.query.check) return res.status(200).json({ enabled: !!key });
  if (!key) return res.status(503).json({ error: 'GIFs aren’t switched on yet' });

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!url || !serviceKey || !token) return res.status(401).json({ error: 'Sign in to send GIFs' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Sign in again to send GIFs' });

  const q = String(req.query.q || '').trim().slice(0, 80);
  const page = Math.max(1, Math.min(20, Number(req.query.page) || 1));
  const customer = crypto.createHash('sha256').update(`plusfore:${data.user.id}`).digest('hex').slice(0, 32);
  const params = new URLSearchParams({ page: String(page), per_page: '24', customer_id: customer, locale: 'GB', content_filter: 'high' });
  if (q) params.set('q', q);

  try {
    const r = await fetch(`${BASE}/${encodeURIComponent(key)}/gifs/${q ? 'search' : 'trending'}?${params}`);
    if (!r.ok) return res.status(502).json({ error: 'Couldn’t load GIFs. Try again.' });
    const body = await r.json();
    const box = (body && body.data) || {};
    const items = Array.isArray(box) ? box : Array.isArray(box.data) ? box.data : [];
    const gifs = items.map(toGif).filter(Boolean);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({ gifs, more: !!box.has_next });
  } catch {
    return res.status(502).json({ error: 'Couldn’t load GIFs. Try again.' });
  }
};
