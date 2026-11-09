"""Sort each scanned club homepage by where its open competitions are published.

Reads the Apify dataset (homepage HTML) and writes classified.json plus a summary.
Categories, first match wins:
  platform-only : the club's opens link points to BRS, ClubV1 or HowDidiDo
  own-page      : the club links to an opens page on its own website
  fixtures-only : no opens link, but a fixtures, diary or events page exists
  none          : nothing competition related on the homepage
  failed        : the page did not load
"""
import json
import re
import sys
from collections import Counter
from urllib.parse import urljoin, urlparse

data = json.load(open(sys.argv[1]))

PLATFORMS = {
    'BRS': re.compile(r'brsgolf\.com', re.I),
    'ClubV1/HowDidiDo': re.compile(r'clubv1\.com|howdidido\.com|dotgolf\.co\.uk', re.I),
    'IntelligentGolf': re.compile(r'intelligentgolf', re.I),
    'Golf Genius': re.compile(r'golfgenius\.com', re.I),
}
OPENS = re.compile(r'\bopens?\b|open[ -_]?comp|opencompetition', re.I)
NOT_OPENS = re.compile(r'opening|open ?hours|now open|open to|course (is )?open|course status|result', re.I)
FIXTURES = re.compile(r'fixture|diary|calendar|events?\b|competitions?', re.I)
NOT_FIXTURES = re.compile(r'function|wedding|catering|clubhouse|social|private|corporate|result', re.I)
LINK = re.compile(r'<a\b[^>]*?href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)


def domain(u):
    return urlparse(u).netloc.lower().removeprefix('www.')


rows = []
for p in data:
    url = p.get('url') or p.get('crawl', {}).get('loadedUrl')
    html = p.get('html') or ''
    status = p.get('crawl', {}).get('httpStatusCode')
    row = {'url': url, 'status': status, 'uses': [], 'opens_platform': [], 'opens_own': [], 'fixtures': []}
    if not html or len(html) < 500:
        row['category'] = 'failed'
        rows.append(row)
        continue
    row['uses'] = sorted(n for n, r in PLATFORMS.items() if r.search(html))
    home = domain(url)
    for href, text in LINK.findall(html):
        text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', text)).strip()
        href = href.replace('&amp;', '&')
        if href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
            continue
        full = urljoin(url, href)
        label = f'{text} {full}'
        plat = next((n for n, r in PLATFORMS.items() if r.search(full)), None)
        if OPENS.search(label) and not NOT_OPENS.search(text):
            if plat:
                row['opens_platform'].append((plat, full))
            elif domain(full) == home:
                row['opens_own'].append(full)
        elif FIXTURES.search(label) and not NOT_FIXTURES.search(label) and domain(full) == home:
            row['fixtures'].append(full)
    for k in ('opens_platform', 'opens_own', 'fixtures'):
        row[k] = sorted(set(map(tuple, row[k]) if k == 'opens_platform' else row[k]))
    if row['opens_platform'] and not row['opens_own']:
        row['category'] = 'platform-only'
    elif row['opens_own']:
        row['category'] = 'own-page'
    elif row['fixtures']:
        row['category'] = 'fixtures-only'
    else:
        row['category'] = 'none'
    rows.append(row)

json.dump(rows, open('classified.json', 'w'), indent=1)
cats = Counter(r['category'] for r in rows)
print('pages', len(rows))
for c, n in cats.most_common():
    print(f'  {c:14} {n:4}  {n / len(rows):.0%}')
loaded = [r for r in rows if r['category'] != 'failed']
uses = Counter(u for r in loaded for u in r['uses'])
print('\nloaded pages mentioning a platform anywhere:')
for u, n in uses.most_common():
    print(f'  {u:18} {n:4}  {n / len(loaded):.0%}')
anyplat = sum(1 for r in loaded if r['uses'])
print(f'  any platform       {anyplat:4}  {anyplat / len(loaded):.0%}')
pl = Counter(p[0] for r in rows if r['category'] == 'platform-only' for p in r['opens_platform'])
print('\nplatform-only, by platform:', dict(pl))
own_and_plat = sum(1 for r in rows if r['category'] == 'own-page' and r['uses'])
print('own opens page on a site that also uses a platform:', own_and_plat)
