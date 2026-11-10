"""Contact sheets from already-downloaded thumbnails: one row per club, candidates numbered 1 to 6.

Usage: python3 -I sheets2.py candidates.json thumbs-all.json outdir
"""
import base64
import io
import json
import os
import sys

from PIL import Image, ImageDraw

TW, TH, LABEL, PER_SHEET, PER_CLUB = 230, 154, 22, 5, 6
data, thumbs, outdir = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3]
os.makedirs(outdir, exist_ok=True)


def img(key):
    raw = thumbs.get(key)
    if not raw:
        return None
    try:
        im = Image.open(io.BytesIO(base64.b64decode(raw.split(',', 1)[1]))).convert('RGB')
        im.thumbnail((TW, TH))
        return im
    except Exception:
        return None


clubs = [c for c in data if any(f"{c['id']}|{i}" in thumbs for i in range(PER_CLUB))]
index = {}
for s in range(0, len(clubs), PER_SHEET):
    chunk = clubs[s:s + PER_SHEET]
    sheet = Image.new('RGB', (PER_CLUB * (TW + 6) + 6, len(chunk) * (TH + LABEL + 10)), 'white')
    draw = ImageDraw.Draw(sheet)
    for row, c in enumerate(chunk):
        y = row * (TH + LABEL + 10)
        draw.text((6, y + 4), f"{'ABCDE'[row]}. {c['name']}", fill='black')
        for i in range(min(PER_CLUB, len(c['candidates']))):
            im = img(f"{c['id']}|{i}")
            if not im:
                continue
            x = 6 + i * (TW + 6)
            sheet.paste(im, (x, y + LABEL))
            draw.rectangle([x, y + LABEL, x + 22, y + LABEL + 16], fill='black')
            draw.text((x + 7, y + LABEL + 2), str(i + 1), fill='white')
    name = f'sheet-{s // PER_SHEET + 1:03d}.jpg'
    sheet.save(os.path.join(outdir, name), quality=82)
    index[name] = [{'row': 'ABCDE'[r], 'id': c['id'], 'name': c['name']} for r, c in enumerate(chunk)]
json.dump(index, open(os.path.join(outdir, 'index.json'), 'w'), indent=1)
print(len(clubs), 'clubs on', len(index), 'sheets')
