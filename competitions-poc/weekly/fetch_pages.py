"""
Fetch the club pages PlusFore takes its opens from, for the weekly check.

    python3 -I fetch_pages.py urls.json pages.json

urls.json is a JSON list of page addresses. Each page is read once with Apify's Website Content
Crawler (no following links), and pages.json gets back, for each one: the address, its text as
Markdown, and a fingerprint of that text, so the check can skip pages that haven't changed.

The Apify token is a network credential on the cloud environment: the proxy adds it to requests to
api.apify.com, so the script sends a placeholder. Booking platforms are never fetched.
"""

import hashlib
import json
import re
import sys
import time
import urllib.request

API = 'https://api.apify.com/v2'
HEADERS = {'Authorization': 'Bearer proxy-injected', 'Content-Type': 'application/json'}
# their terms rule out scraping, so these are never fetched
BLOCKED = ('howdidido.com', 'clubv1.com', 'brsgolf.com', 'dotgolf.co.uk', 'intelligentgolf.co.uk', 'golfempire')


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, headers=HEADERS, data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def fingerprint(text):
    # dates and counters that change on every load ("Updated 2 minutes ago") would make every page look new
    text = re.sub(r'\s+', ' ', text or '').strip().lower()
    return hashlib.sha256(text.encode()).hexdigest()


def main(src, out):
    wanted = json.load(open(src))
    urls = [u for u in wanted if not any(b in u for b in BLOCKED)]
    skipped = [u for u in wanted if u not in urls]
    run = call('POST', '/acts/apify~website-content-crawler/runs', {
        'startUrls': [{'url': u} for u in urls],
        'maxCrawlDepth': 0,
        'maxCrawlPages': len(urls),
        'crawlerType': 'cheerio',
        'respectRobotsTxtFile': True,
        'saveMarkdown': True,
        'removeCookieWarnings': True,
        'proxyConfiguration': {'useApifyProxy': True},
    })['data']
    while run['status'] in ('READY', 'RUNNING'):
        time.sleep(15)
        run = call('GET', f"/actor-runs/{run['id']}")['data']
    if run['status'] != 'SUCCEEDED':
        sys.exit(f"Apify run ended {run['status']}")
    items = call('GET', f"/datasets/{run['defaultDatasetId']}/items?clean=true&fields=url,markdown,crawl")
    pages = []
    for it in items:
        url = (it.get('crawl') or {}).get('loadedUrl') or it.get('url')
        pages.append({'url': it.get('url'), 'loadedUrl': url, 'markdown': it.get('markdown') or '', 'hash': fingerprint(it.get('markdown'))})
    missing = sorted(set(urls) - {p['url'] for p in pages})
    json.dump({'pages': pages, 'missing': missing, 'skipped': skipped, 'costUsd': run.get('usageTotalUsd')}, open(out, 'w'), indent=1)
    print(f"{len(pages)} pages read, {len(missing)} did not load, {len(skipped)} skipped (booking platforms), cost ${run.get('usageTotalUsd') or 0:.3f}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
