"""Find candidate photos for each club on Wikimedia Commons (much of it from Geograph).

Usage: python3 -I candidates.py scot-clubs.json > candidates.json
Keeps up to 8 per club: golf course or clubhouse photos only, judged from title, description
and categories. Car parks, signs, roads, snow and the like are dropped here; a person (or Claude)
still looks at each before anything is used.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'PlusFore club photo finder/0.1 (https://getplusfore.app)'
GOOD = re.compile(r'golf|fairway|green\b|greens\b|tee\b|bunker|links|clubhouse|club house|putting|\bhole\b', re.I)
BAD = re.compile(r'car ?park|parking|sign\b|signpost|road|street|lane\b|track\b|path\b|footpath|snow|frost|ice\b|winter|'
                 r'church|cemetery|map\b|plan\b|station|railway|bridge|memorial|school|farm|cottage|trig|pylon|'
                 r'bus\b|shop|housing|estate\b|gate\b|entrance|fence|wall\b|bench|toilet|river|burn\b|loch\b|'
                 r'quarry|rubbish|demolition|construction|aerodrome|airport', re.I)
STOP = {'golf', 'club', 'course', 'links', 'the', 'and', 'of', 'centre', 'park', 'castle', 'house', 'royal'}


def api(params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'maxlag': 5})
    req = urllib.request.Request(f'{API}?{q}', headers={'User-Agent': UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 * (attempt + 1))
    return {}


def strip(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s or '')).strip()


def for_club(c):
    geo = api({'action': 'query', 'list': 'geosearch', 'gscoord': f"{c['lat']}|{c['lng']}", 'gsradius': 800, 'gsnamespace': 6, 'gslimit': 50})
    hits = geo.get('query', {}).get('geosearch', [])
    if not hits:
        return {**c, 'found': 0, 'candidates': []}
    dist = {h['title']: h['dist'] for h in hits}
    words = {w for w in re.findall(r'[a-z]+', c['name'].lower()) if w not in STOP and len(w) > 2}
    cands = []
    info = api({'action': 'query', 'titles': '|'.join(dist), 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 900})
    for p in info.get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [None])[0]
        if not ii or ii.get('mime') not in ('image/jpeg', 'image/png'):
            continue
        m = ii.get('extmetadata', {})
        desc = strip(m.get('ImageDescription', {}).get('value'))
        cats = strip(m.get('Categories', {}).get('value'))
        text = f"{p['title']} {desc}"
        if not GOOD.search(text + ' ' + cats) or BAD.search(text):
            continue
        if ii['width'] < ii['height'] or ii['width'] < 500:
            continue
        named = any(w in text.lower() for w in words)
        score = (4 if named else 0) + (2 if re.search(r'golf', text, re.I) else 0) + (1 if re.search(r'clubhouse|fairway|green|tee|links', text, re.I) else 0)
        score += min(2, ii['width'] / 1000) - dist[p['title']] / 800
        cands.append({
            'title': p['title'], 'score': round(score, 2), 'named': named, 'dist': round(dist[p['title']]),
            'thumb': ii.get('thumburl'), 'url': ii['url'], 'page': ii['descriptionurl'], 'width': ii['width'], 'height': ii['height'],
            'artist': strip(m.get('Artist', {}).get('value'))[:120], 'licence': strip(m.get('LicenseShortName', {}).get('value')),
            'licence_url': strip(m.get('LicenseUrl', {}).get('value')), 'desc': desc[:200],
        })
    cands.sort(key=lambda x: -x['score'])
    return {**c, 'found': len(hits), 'candidates': cands[:8]}


clubs = json.load(open(sys.argv[1]))
with ThreadPoolExecutor(4) as pool:
    out = list(pool.map(for_club, clubs))
json.dump(out, sys.stdout)
with_any = sum(1 for o in out if o['candidates'])
print(f'{len(out)} clubs, {with_any} with at least one candidate, {sum(len(o["candidates"]) for o in out)} candidates', file=sys.stderr)
