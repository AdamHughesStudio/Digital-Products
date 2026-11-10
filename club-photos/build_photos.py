"""Turn the chosen photos into rows for the clubs table.

Usage: python3 -I build_photos.py candidates.json choices-*.json > photos.json
"""
import json
import re
import sys

cands = {c['id']: c for c in json.load(open(sys.argv[1]))}
choices = {}
for path in sys.argv[2:]:
    choices.update(json.load(open(path)))

rows, skipped = [], 0
for club_id, pick in choices.items():
    c = cands.get(club_id)
    if not c or not pick or pick < 1 or pick > len(c['candidates']):
        skipped += 1
        continue
    p = c['candidates'][pick - 1]
    url = re.sub(r'/\d+px-', '/960px-', (p['thumb'] or '').split('?')[0].replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/'))
    artist = re.sub(r'\s+', ' ', p['artist'] or '').strip() or 'Unknown'
    artist = re.sub(r'\s*\(.*?\)\s*$', '', artist)[:60]
    licence = p['licence'] or 'see licence'
    rows.append({
        'id': club_id,
        'photo_url': url,
        'photo_credit': f'Photo: {artist}, {licence}, via Wikimedia Commons',
        'photo_page': p['page'],
        'photo_licence': licence,
        'photo_source': 'wikimedia-commons',
    })
json.dump(rows, sys.stdout)
print(f'{len(rows)} photos, {skipped} clubs with none', file=sys.stderr)
