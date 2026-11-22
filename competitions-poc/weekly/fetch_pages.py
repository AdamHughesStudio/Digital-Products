"""
Fetch the club pages PlusFore takes its opens from, for the weekly check.

    python3 -I fetch_pages.py urls.json pages.json

urls.json is a JSON list of page addresses. Each page is read once by competitions-poc/fetch.js,
which uses the browser on this machine (no following links). pages.json gets back, for each one:
the address, its text, and a fingerprint of that text, so the check can skip pages that haven't
changed.

fetch.js keeps the ground rules: booking platforms and Golf Empire are never fetched, robots.txt
is respected and each site gets one page at a time with a pause. It replaced Apify in November
2026, when the free plan's allowance ran out; pages read this way give slightly different text, so
the first run after the switch sees every page as changed.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

FETCH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fetch.js')


def fingerprint(text):
    # dates and counters that change on every load ("Updated 2 minutes ago") would make every page look new
    text = re.sub(r'\s+', ' ', text or '').strip().lower()
    return hashlib.sha256(text.encode()).hexdigest()


def main(src, out):
    wanted = json.load(open(src))
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, 'raw.json')
        subprocess.run(['node', FETCH, src, raw], check=True)
        items = json.load(open(raw))
        report = json.load(open(os.path.join(tmp, 'raw.report.json')))
    pages = []
    for it in items:
        md = it.get('markdown') or ''
        pages.append({'url': it['url'], 'loadedUrl': it['crawl']['loadedUrl'], 'markdown': md, 'hash': fingerprint(md)})
    skipped = [s['url'] for s in report['skipped']]
    missing = sorted(set(wanted) - {p['url'] for p in pages} - set(skipped))
    json.dump({'pages': pages, 'missing': missing, 'skipped': report['skipped'], 'failed': report['failed']}, open(out, 'w'), indent=1)
    print(f"{len(pages)} pages read, {len(missing)} did not load, {len(skipped)} skipped (robots.txt or booking platform)")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
