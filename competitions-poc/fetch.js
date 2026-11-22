#!/usr/bin/env node
/**
 * Read web pages with the browser on this machine, in place of Apify's Website Content Crawler.
 *
 *     node fetch.js urls.json out.json [--html]
 *
 * urls.json is a JSON list of addresses, or of {"url": ..., "userData": ...} objects (the same
 * startUrls Apify takes). out.json gets one item per page in the shape Apify returned, so the
 * other scripts read it unchanged:
 *     {url, userData, crawl: {loadedUrl, httpStatusCode}, metadata: {title}, markdown, html?}
 * "markdown" is the page's visible text, links written as [text](address).
 *
 * Ground rules, kept here so no caller can skip them:
 * - Booking platforms and Golf Empire are never fetched (their terms rule out scraping).
 * - Each site's robots.txt is read first, and any page it disallows is left out.
 * - One page at a time per site, with a pause between them, and a few sites at once.
 */
const fs = require('fs');
const { chromium } = require('playwright');

const BLOCKED = /howdidido\.com|clubv1\.com|brsgolf\.com|dotgolf\.co\.uk|intelligentgolf|golfempire|golfgenius\.com/i;
const UA = 'Mozilla/5.0 (compatible; PlusForeBot/1.0; golf club directory; +https://getplusfore.app/support)';
const AGENT = 'plusforebot';
const PARALLEL_SITES = 4;
const PAUSE_MS = 2000;
const TIMEOUT_MS = 45000;

const [src, out, ...flags] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node fetch.js urls.json out.json [--html]');
  process.exit(1);
}
const wantHtml = flags.includes('--html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The Disallow rules that apply to us: our own group if there is one, otherwise "*" */
function parseRobots(text) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === 'disallow' || key === 'allow')) cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== '*' && AGENT.includes(a)));
  return (mine || groups.find((g) => g.agents.includes('*')) || { rules: [] }).rules;
}

function allowed(rules, path) {
  // longest matching rule wins, as Google and the robots.txt standard (RFC 9309) do
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

const robotsCache = new Map();
async function robotsRules(origin) {
  if (!robotsCache.has(origin)) {
    robotsCache.set(
      origin,
      (async () => {
        try {
          const res = await fetch(origin + '/robots.txt', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
          return res.ok ? parseRobots(await res.text()) : [];
        } catch {
          return [];
        }
      })(),
    );
  }
  return robotsCache.get(origin);
}

async function readPage(context, url) {
  const page = await context.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    // let pages that build their lists with JavaScript finish
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const data = await page.evaluate(() => {
      document.querySelectorAll('script, style, noscript, svg, iframe').forEach((n) => n.remove());
      // write links into the text so later steps can see where an opens page or entry form points
      document.querySelectorAll('a[href]').forEach((a) => {
        const t = a.innerText.trim();
        if (t && a.href.startsWith('http')) a.innerText = `[${t}](${a.href})`;
      });
      return { title: document.title, text: document.body ? document.body.innerText : '' };
    });
    return {
      status: res ? res.status() : null,
      loadedUrl: page.url(),
      title: data.title,
      markdown: data.text.replace(/\n{3,}/g, '\n\n').trim(),
      html: wantHtml ? await page.content() : undefined,
    };
  } finally {
    await page.close();
  }
}

(async () => {
  const wanted = JSON.parse(fs.readFileSync(src, 'utf8')).map((x) => (typeof x === 'string' ? { url: x } : x));
  const results = [];
  const skipped = [];
  const failed = [];
  // group by site so each site gets one page at a time with a pause
  const bySite = new Map();
  for (const w of wanted) {
    let origin;
    try {
      origin = new URL(w.url).origin;
    } catch {
      failed.push({ url: w.url, reason: 'not a valid address' });
      continue;
    }
    if (BLOCKED.test(w.url)) {
      skipped.push({ url: w.url, reason: 'booking platform or Golf Empire' });
      continue;
    }
    if (!bySite.has(origin)) bySite.set(origin, []);
    bySite.get(origin).push(w);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ userAgent: UA, locale: 'en-GB', ignoreHTTPSErrors: true });
  // no images, fonts or video: they slow things down and aren't read
  await context.route('**/*', (route) => (['image', 'media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue()));

  const sites = [...bySite.entries()];
  let next = 0;
  async function worker() {
    while (next < sites.length) {
      const [origin, items] = sites[next++];
      const rules = await robotsRules(origin);
      for (const [i, w] of items.entries()) {
        const u = new URL(w.url);
        if (!allowed(rules, u.pathname + u.search)) {
          skipped.push({ url: w.url, reason: 'robots.txt' });
          continue;
        }
        if (i) await sleep(PAUSE_MS);
        let r = null;
        let reason = '';
        for (let attempt = 0; attempt < 3 && !r; attempt++) {
          if (attempt) await sleep(PAUSE_MS * 2 * attempt);
          try {
            r = await readPage(context, w.url);
            // a server or proxy error is often momentary, so try again; a page that stays broken counts as failed
            if (r.status && r.status >= 400) {
              reason = `HTTP ${r.status}`;
              r = null;
            }
          } catch (e) {
            reason = String(e.message || e).split('\n')[0];
          }
        }
        if (!r) {
          failed.push({ url: w.url, reason });
          continue;
        }
        if (BLOCKED.test(r.loadedUrl)) {
          skipped.push({ url: w.url, reason: 'sent on to a booking platform' });
          continue;
        }
        const item = { url: w.url, crawl: { loadedUrl: r.loadedUrl, httpStatusCode: r.status }, metadata: { title: r.title }, markdown: r.markdown };
        if (w.userData) item.userData = w.userData;
        if (wantHtml) item.html = r.html;
        results.push(item);
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_SITES }, worker));
  await browser.close();

  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  fs.writeFileSync(out.replace(/\.json$/, '') + '.report.json', JSON.stringify({ skipped, failed }, null, 1));
  console.log(`${results.length} pages read, ${failed.length} failed, ${skipped.length} skipped (robots.txt or booking platform)`);
})();
