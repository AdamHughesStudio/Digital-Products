"""Third pass: find photos for clubs still without one, two new ways.

Usage: python3 -I candidates3.py clubs.json skip.json candidates.jsonl [batch size]

Each club's result is added to candidates.jsonl as soon as it's found, and clubs already in the
file are skipped, so a stopped run picks up where it left off. With a batch size, it stops after
that many new clubs; run it again for the next batch.

1. Search Wikimedia Commons by the club's name, wherever the photo was taken.
2. Search 3 km around the club, keeping only photos whose title or description names the club.

Only clear golf scenes are kept: the title or description has to name a clubhouse, green, fairway,
tee, bunker, hole or the course itself. Photos already used for any club are skipped. Requests go
one at a time and wait when Wikimedia asks, because it rate limits heavy use.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'PlusFore club photo finder/0.1 (https://getplusfore.app)'
SCENE = re.compile(r'clubhouse|club house|\bgreen\b|greens\b|fairway|\btee\b|tee box|bunker|\bhole\b|\d+(st|nd|rd|th) hole|golf course|links', re.I)
BAD = re.compile(r'car ?park|parking|sign\b|signpost|road|street|\blane\b|track\b|footpath|snow|frost|\bice\b|church|cemetery|'
                 r'map\b|\bplan\b|station|railway|bridge|memorial|school|farm|cottage|trig|pylon|bus\b|shop|housing|'
                 r'gate\b|entrance|fence|bench|toilet|quarry|rubbish|demolition|construction|airport|sheep|cattle|cows?\b', re.I)
STOP = {'golf', 'club', 'course', 'links', 'the', 'and', 'of', 'centre', 'park', 'house', 'royal', 'society', 'old', 'new'}


def api(params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'maxlag': 5})
    for attempt in range(8):
        req = urllib.request.Request(f'{API}?{q}', headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get('retry-after') or 0) if e.code == 429 else 0
            time.sleep(min(60, max(wait, 5 * (attempt + 1))))
        except Exception:
            time.sleep(5 * (attempt + 1))
    return {}


def strip(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s or '')).strip()


def core_name(name):
    return re.sub(r'\s+(Golf\s+)?(Club|Course|Links|Society)$', '', re.sub(r'\s*\(.*?\)', '', name), flags=re.I).strip()


def info(titles):
    pages = []
    for i in range(0, len(titles), 50):
        r = api({'action': 'query', 'titles': '|'.join(titles[i:i + 50]), 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 330})
        pages += list(r.get('query', {}).get('pages', {}).values())
    return pages


def for_club(c):
    name = core_name(c['name'])
    words = {w for w in re.findall(r'[a-z]+', name.lower()) if w not in STOP and len(w) > 2}
    found = {}
    s = api({'action': 'query', 'list': 'search', 'srsearch': f'"{name}" golf', 'srnamespace': 6, 'srlimit': 20})
    for h in s.get('query', {}).get('search', []):
        found[h['title']] = None
    g = api({'action': 'query', 'list': 'geosearch', 'gscoord': f"{c['lat']}|{c['lng']}", 'gsradius': 3000, 'gsnamespace': 6, 'gslimit': 100})
    for h in g.get('query', {}).get('geosearch', []):
        found.setdefault(h['title'], h['dist'])
    cands = []
    for p in info(list(found)):
        ii = (p.get('imageinfo') or [None])[0]
        if not ii or ii.get('mime') not in ('image/jpeg', 'image/png'):
            continue
        if ii['descriptionurl'] in SKIP['used'] or ii['width'] < ii['height'] or ii['width'] < 600:
            continue
        m = ii.get('extmetadata', {})
        desc = strip(m.get('ImageDescription', {}).get('value'))
        text = f"{p['title']} {desc}"
        if not SCENE.search(text) or BAD.search(text):
            continue
        named = bool(words) and any(w in text.lower() for w in words)
        if not named:
            continue
        dist = found.get(p['title'])
        score = 4 + (2 if re.search(r'clubhouse|club house|green|fairway|tee', text, re.I) else 0) + min(2, ii['width'] / 1000)
        score -= (dist or 0) / 3000
        cands.append({'title': p['title'], 'score': round(score, 2), 'named': True, 'dist': round(dist) if dist is not None else None,
                      'thumb': ii.get('thumburl'), 'url': ii['url'], 'page': ii['descriptionurl'], 'width': ii['width'], 'height': ii['height'],
                      'artist': strip(m.get('Artist', {}).get('value'))[:120], 'licence': strip(m.get('LicenseShortName', {}).get('value')),
                      'licence_url': strip(m.get('LicenseUrl', {}).get('value')), 'desc': desc[:200]})
    cands.sort(key=lambda x: -x['score'])
    return {**c, 'found': len(found), 'candidates': cands[:4]}


clubs = json.load(open(sys.argv[1]))
SKIP = json.load(open(sys.argv[2]))
OUT = sys.argv[3]
BATCH = int(sys.argv[4]) if len(sys.argv) > 4 else len(clubs)
done = set()
try:
    with open(OUT) as f:
        done = {json.loads(l)['id'] for l in f if l.strip()}
except FileNotFoundError:
    pass
todo = [c for c in clubs if c['id'] not in done][:BATCH]
print(f'{len(done)} done already, {len(todo)} in this batch', file=sys.stderr, flush=True)
found = 0
for n, c in enumerate(todo, 1):
    r = for_club(c)
    found += bool(r['candidates'])
    with open(OUT, 'a') as f:
        f.write(json.dumps(r) + '\n')
    if n % 10 == 0 or n == len(todo):
        print(f'{len(done) + n}/{len(clubs)} clubs, {found} of this batch with candidates', file=sys.stderr, flush=True)
