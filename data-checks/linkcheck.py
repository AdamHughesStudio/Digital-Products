"""Sort loaded club websites into: fine, clearly bad (spam, parked, suspended, empty), or look by hand.

    python3 -I linkcheck.py pages.json pages.report.json out.json
"""
import json
import re
import sys

pages, report, out = sys.argv[1], sys.argv[2], sys.argv[3]
SPAM = re.compile(r'casino|gamstop|slot gacor|\bjudi\b|togel|sportsbook|betting sites|bonus code|escort|viagra|crypto exchange', re.I)
PARKED = re.compile(r'domain (name )?(is )?for sale|buy this domain|this domain (may be|is) for sale|parked free|domain has expired|parkingcrew|sedo|hugedomains|dan\.com|afternic', re.I)
SUSPENDED = re.compile(r'account suspended|suspendedpage|this account has been suspended|site not found|website is (currently )?unavailable|default web site page|index of /|coming soon', re.I)
STOP = {'golf', 'club', 'course', 'the', 'and', 'of', 'centre', 'park', 'country', 'hotel', 'leisure', 'links', 'resort', 'spa', 'municipal', 'ltd'}

rows = []
for it in json.load(open(pages)):
    clubs = it['userData']['clubs']
    title = it['metadata']['title'] or ''
    text = f"{title} {it['markdown'] or ''}"
    low = text.lower()
    head = (title + ' ' + (it['markdown'] or '')[:3000]).lower()
    verdict, why = 'fine', ''
    spam_hits = len(SPAM.findall(head))
    if spam_hits >= 2:
        verdict, why = 'bad', 'spam: ' + ', '.join(sorted(set(m.lower() for m in SPAM.findall(head))))[:80]
    elif PARKED.search(head) and 'golf' not in low:
        verdict, why = 'bad', 'parked or for sale'
    elif SUSPENDED.search(head) and len(low) < 1500:
        verdict, why = 'bad', 'suspended or empty: ' + SUSPENDED.search(head).group(0)
    elif 'one moment, please' in head and len(low) < 400:
        verdict, why = 'fine', 'bot check'
    elif 'golf' not in low:
        verdict, why = 'look', 'no mention of golf'
    else:
        names = []
        for c in clubs:
            words = [w for w in re.findall(r'[a-z]+', c['name'].lower()) if w not in STOP]
            if words and not any(w in low for w in words):
                names.append(c['name'])
        if names:
            verdict, why = 'look', 'club name not on page'
    rows.append({'url': it['url'], 'loaded': it['crawl']['loadedUrl'], 'title': title[:90], 'clubs': clubs, 'verdict': verdict, 'why': why})

rep = json.load(open(report))
failed = [{'url': f['url'], 'reason': f['reason'][:80]} for f in rep['failed']]
skipped = [{'url': s['url'], 'reason': s['reason'][:80]} for s in rep['skipped']]
json.dump({'rows': rows, 'failed': failed, 'skipped': skipped}, open(out, 'w'), indent=1)
from collections import Counter
print(Counter(r['verdict'] for r in rows), 'failed', len(failed), 'skipped', len(skipped))
