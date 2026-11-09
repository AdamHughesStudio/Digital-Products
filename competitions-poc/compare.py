"""Compare club-published 2027 opens with the Golf Empire checklist.

Usage: python3 -I compare.py scot-home.json opens-pages.json ge-scotland.json
Writes comparison.json and prints a summary.

Matching is by club name (fuzzy, from the club homepage title) and by day and month.
Club dates come from the club's own opens page text, only on pages that mention 2027.
"""
import json
import re
import sys
from collections import Counter
from urllib.parse import urlparse

home_pages, opens_pages, ge_rows = (json.load(open(p)) for p in sys.argv[1:4])
MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split()
STOP = {'golf', 'club', 'the', 'course', 'links', 'and', 'of', 'gc', 'golfing', 'society', 'ltd', 'limited', 'home', 'welcome', 'to'}


def tokens(s):
    return {t for t in re.findall(r'[a-z]+', s.lower()) if t not in STOP and len(t) > 2}


def dom(u):
    return urlparse(u).netloc.lower().removeprefix('www.')


def text_of(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html or ''))


def day_months(text):
    found = set()
    for d, m in re.findall(r'\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*', text, re.I):
        found.add((int(d), m.lower()))
    for m, d in re.findall(r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b', text, re.I):
        found.add((int(d), m.lower()))
    for d, mo in re.findall(r'\b(\d{1,2})[/.](\d{1,2})[/.](?:20)?27\b', text):
        if 1 <= int(mo) <= 12:
            found.add((int(d), MONTHS[int(mo) - 1]))
    return {x for x in found if 1 <= x[0] <= 31}


# club name for each site, from the homepage title
titles = {}
for p in home_pages:
    m = re.search(r'<title[^>]*>(.*?)</title>', p.get('html') or '', re.I | re.S)
    titles[dom(p['url'])] = (m.group(1) if m else '') + ' ' + dom(p['url']).split('.')[0]

ge_by_club = {}
for r in ge_rows:
    if r['date'].endswith('2027'):
        ge_by_club.setdefault(r['club'], []).append(r)

results = []
for p in opens_pages:
    text = text_of(p.get('html'))
    if '2027' not in text:
        continue
    d = dom(p['url'])
    name_toks = tokens(titles.get(d, '')) | tokens(d.split('.')[0])
    best, score = None, 0
    for club in ge_by_club:
        ct = tokens(club)
        if not ct:
            continue
        s = len(ct & name_toks) / len(ct)
        if s > score:
            best, score = club, s
    club_dates = day_months(text)
    row = {'site': p['url'], 'ge_club': best if score >= 0.99 else None, 'club_dates': len(club_dates)}
    if row['ge_club']:
        ge = ge_by_club[best]
        conf = [g for g in ge if not g['predicted']]
        pred = [g for g in ge if g['predicted']]

        def key(g):
            day, mon, _ = g['date'].split()
            return (int(day), mon.lower())

        row.update({
            'ge_confirmed': len(conf),
            'ge_confirmed_on_club_site': sum(key(g) in club_dates for g in conf),
            'ge_predicted': len(pred),
            'ge_predicted_on_club_site': sum(key(g) in club_dates for g in pred),
            'club_dates_not_on_ge': len(club_dates - {key(g) for g in ge}),
            'ge_dates': sorted(g['date'] + (' (predicted)' if g['predicted'] else '') for g in ge),
        })
    results.append(row)

json.dump(results, open('comparison.json', 'w'), indent=1)
matched = [r for r in results if r['ge_club']]
print('club opens pages mentioning 2027:', len(results))
print('matched to a Golf Empire club:', len(matched))
tot = Counter()
for r in matched:
    for k in ('ge_confirmed', 'ge_confirmed_on_club_site', 'ge_predicted', 'ge_predicted_on_club_site', 'club_dates_not_on_ge'):
        tot[k] += r[k]
for k, v in tot.items():
    print(f'  {k:28} {v}')
print('unmatched sites:', [r['site'] for r in results if not r['ge_club']])
