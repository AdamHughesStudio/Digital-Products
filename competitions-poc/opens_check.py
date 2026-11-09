"""Second pass: decide what each club's own opens page really contains.

Usage:
  python3 -I opens_check.py urls classified.json > opens-urls.json   # pick one opens page per club
  python3 -I opens_check.py check opens-pages.json classified.json   # classify fetched pages

Categories for a fetched opens page:
  platform-backed : embeds a booking platform (iframe or script) or sends you to one to see the list
  own-listing     : lists competitions as text with dates on the club's own site
  announcement    : an opens page with no dated list yet (season not published, or prose only)
"""
import json
import re
import sys
from collections import Counter

PLATFORM = re.compile(r'brsgolf\.com|clubv1\.com|howdidido\.com|dotgolf\.co\.uk|intelligentgolf|golfgenius\.com', re.I)
DATE = re.compile(
    r'\b\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b'
    r'|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?\b'
    r'|\b\d{1,2}[/.]\d{1,2}[/.](20)?2[5-8]\b', re.I)


def pick_urls(classified):
    out = []
    for r in json.load(open(classified)):
        own = r.get('opens_own') or []
        if not own:
            continue
        best = sorted(own, key=lambda u: (not re.search(r'open', u, re.I), bool(re.search(r'result', u, re.I)), len(u)))[0]
        out.append({'url': best, 'userData': {'home': r['url']}})
    return out


def check(pages, classified):
    homes = {r['url']: r for r in json.load(open(classified))}
    rows = []
    for p in json.load(open(pages)):
        html = p.get('html') or ''
        text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html))
        frames = re.findall(r'<(?:iframe|script)[^>]+src="([^"]+)"', html, re.I)
        plat_frames = [f for f in frames if PLATFORM.search(f)]
        plat_links = re.findall(r'href="([^"]*(?:brsgolf|clubv1|howdidido|dotgolf)[^"]*)"', html, re.I)
        dates = len(DATE.findall(text))
        if dates >= 2:
            cat = 'own-listing'
        elif plat_frames or plat_links:
            cat = 'platform-backed'
        else:
            cat = 'announcement'
        rows.append({'url': p.get('url'), 'category': cat, 'dates': dates,
                     'platform_frames': plat_frames[:3], 'platform_links': sorted(set(plat_links))[:3]})
    json.dump(rows, open('opens-classified.json', 'w'), indent=1)
    c = Counter(r['category'] for r in rows)
    print('opens pages checked', len(rows))
    for k, n in c.most_common():
        print(f'  {k:16} {n:4}  {n / len(rows):.0%}')


if __name__ == '__main__':
    if sys.argv[1] == 'urls':
        json.dump(pick_urls(sys.argv[2]), sys.stdout)
    else:
        check(sys.argv[2], sys.argv[3])
