"""Turn Golf Empire region pages into a minimal checklist: club, date, confirmed or predicted.

Usage: python3 -I ge_checklist.py ge-region-1.json [ge-region-2.json ...] > ge-scotland.json
Each input is an Apify Website Content Crawler dataset (markdown, htmlTransformer "none").
Only what the comparison needs is kept. Descriptions, fees and wording are not stored.
"""
import json
import re
import sys

CLUB = re.compile(r'\n## \[([^\]]+)\]\(https://www\.golfempire\.co\.uk/golf-clubs/[^)]+\)')
EVENT = re.compile(
    r'\[(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d{1,2})(20\d\d)(.*?)\]'
    r'\(https://www\.golfempire\.co\.uk/new/entryform\.php\?eventid=(\d+)\)', re.S)

rows = []
for path in sys.argv[1:]:
    for page in json.load(open(path)):
        region = page['url'].split('-clubs-')[1].removesuffix('.htm')
        parts = CLUB.split(page['markdown'])
        for i in range(1, len(parts), 2):
            body = parts[i + 1]
            # names carry badges run on with no space, e.g. "Brora Golf ClubTop 100Links"
            club = re.sub(r'(Top 100|Links|Royal|Parkland|Heathland|★|\s)+$', '', parts[i]).strip()
            for mon, _dow, day, year, rest, eid in EVENT.findall(body):
                rows.append({
                    'region': region,
                    'club': club,
                    'date': f'{int(day)} {mon} {year}',
                    'predicted': 'Predicted' in rest or 'Not yet confirmed' in rest,
                    'eventid': eid,
                })
json.dump(rows, sys.stdout, indent=1)
