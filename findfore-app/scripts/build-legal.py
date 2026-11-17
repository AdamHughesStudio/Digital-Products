"""Copies the terms and privacy policy from legal-drafts/ into the app as src/constants/legal.ts.

Run after editing either document:  python3 scripts/build-legal.py
The "(draft for review)" note and the reviewer's quote block are left out of the app copy.
"""
import json, pathlib, re

root = pathlib.Path(__file__).resolve().parents[2]
docs = {'terms': 'terms-of-use.md', 'privacy': 'app-privacy-policy.md'}
out = {}
for key, name in docs.items():
    text = (root / 'legal-drafts' / name).read_text()
    lines = [l for l in text.splitlines() if not l.startswith('>')]
    title = lines[0].lstrip('# ').replace(' (draft for review)', '').strip()
    body = re.sub(r'\n{3,}', '\n\n', '\n'.join(lines[1:])).strip()
    out[key] = {'title': title[0].upper() + title[1:], 'body': body}

ts = '// Made by scripts/build-legal.py from legal-drafts/. Edit those, then run the script.\n\n'
ts += '/** The version golfers agree to. Change it when the terms change in a way that matters, and everyone is asked again. */\n'
ts += "export const TERMS_VERSION = '2026-11';\n\n"
ts += f'export const LEGAL = {json.dumps(out, indent=2, ensure_ascii=False)} as const;\n\n'
ts += 'export type LegalDoc = keyof typeof LEGAL;\n'
(root / 'findfore-app/src/constants/legal.ts').write_text(ts)
print('wrote', {k: len(v['body']) for k, v in out.items()})
