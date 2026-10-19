/**
 * Sends one push notification to the phone that asked for it, so the whole chain can be checked
 * end to end. It only ever sends to the subscription in the request, and only to the browser push
 * services, never an arbitrary address.
 */
const webpush = require('web-push');

const PUSH_HOSTS = ['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com'];
const allowed = (endpoint) => {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && (PUSH_HOSTS.includes(u.hostname) || u.hostname.endsWith('.notify.windows.com') || u.hostname.endsWith('.push.apple.com'));
  } catch {
    return false;
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return res.status(503).json({ error: 'Push keys are not set up on the server yet' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const sub = body.subscription;
  if (!sub || !sub.endpoint || !sub.keys || !allowed(sub.endpoint)) return res.status(400).json({ error: 'Missing or unexpected subscription' });

  webpush.setVapidDetails('https://findfore.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: String(body.title || 'PlusFore').slice(0, 80),
    body: String(body.body || 'Notifications are working.').slice(0, 200),
    url: typeof body.url === 'string' && body.url.startsWith('/') ? body.url : '/',
    tag: 'findfore-test',
  });
  try {
    await webpush.sendNotification(sub, payload, { TTL: 60 });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.statusCode === 410 || e.statusCode === 404 ? 410 : 502).json({ error: 'The push service refused the message', status: e.statusCode });
  }
};
