"""Hole counts from club homepages: only where the page names one number of holes, at least twice.

    python3 -I holes.py home.json clubs.json out.json
"""
import json
import re
import sys
from collections import Counter

pages, clubs_file, out = sys.argv[1], sys.argv[2], sys.argv[3]
clubs = {c['id']: c for c in json.load(open(clubs_file))}
HOLES = re.compile(r'\b(9|nine|18|eighteen|27|twenty[- ]seven|36)[- ]?holes?\b', re.I)
WORD = {'nine': 9, 'eighteen': 18, 'twenty-seven': 27, 'twenty seven': 27}

found = {}
for it in json.load(open(pages)):
    ids = it['userData']['ids']
    if len(ids) != 1:
        continue  # a site shared by several courses can't say which count belongs to which
    text = it['markdown'] or ''
    nums = Counter(int(WORD.get(m.lower(), m)) for m in HOLES.findall(text))
    if len(nums) == 1:
        n, times = nums.most_common(1)[0]
        if times >= 2:
            found[ids[0]] = n
json.dump(found, open(out, 'w'))
print(len(found), 'clubs with a clear hole count', Counter(found.values()))
