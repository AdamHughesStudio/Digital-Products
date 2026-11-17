"""Puts an iPhone status bar on top of each captured app screen, so they read as real phone screens.

Captures are 440 x 902 points at 3x (the app's own screens, from the web build with demo data).
The status bar adds the 54 point strip a 6.9 inch iPhone has above them: 1320 x 2868 pixels in all.
Usage: python3 compose_screens.py <captures dir> <out dir> <font dir>
"""
import sys
from PIL import Image, ImageDraw, ImageFont

src, out, fonts = sys.argv[1:4]
S = 3  # pixels per point
SHOTS = {
    'home': 'home.png',
    'game': 'game--clean.png',
    'open': 'open0--clean.png',
    'season': 'season.png',
    'chat': 'chat-group.png',
    'golfer': 'golfer.png',
}
time_font = ImageFont.truetype(f'{fonts}/700Bold/PlusJakartaSans_700Bold.ttf', 17 * S)

for name, file in SHOTS.items():
    shot = Image.open(f'{src}/{file}').convert('RGB')
    top = shot.getpixel((shot.width // 2, 2))
    dark = sum(top) / 3 < 110
    ink = (255, 255, 255) if dark else (12, 18, 14)
    im = Image.new('RGB', (440 * S, 956 * S), top)
    im.paste(shot, (0, 54 * S))
    d = ImageDraw.Draw(im)
    # time, left
    d.text((52 * S, 29 * S), '9:41', font=time_font, fill=ink, anchor='mm')
    # dynamic island
    d.rounded_rectangle([(220 - 63) * S, 11 * S, (220 + 63) * S, 48 * S], radius=19 * S, fill=(0, 0, 0))
    # signal bars
    x = 330
    for i, h in enumerate([4, 6, 8.5, 11]):
        d.rounded_rectangle([(x + i * 4.6) * S, (34 - h) * S, (x + i * 4.6 + 3) * S, 34 * S], radius=1 * S, fill=ink)
    # wifi: three arcs and a dot
    cx, cy = 360, 34
    for r in (11, 7.5, 4):
        d.arc([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], 225, 315, fill=ink, width=int(2.2 * S))
    d.ellipse([(cx - 1.6) * S, (cy - 3) * S, (cx + 1.6) * S, (cy + 0.2) * S], fill=ink)
    # battery
    bx = 378
    d.rounded_rectangle([bx * S, 23.5 * S, (bx + 25) * S, 35.5 * S], radius=3.5 * S, outline=ink, width=int(1.1 * S))
    d.rounded_rectangle([(bx + 2) * S, 25.5 * S, (bx + 21) * S, 33.5 * S], radius=2 * S, fill=ink)
    d.rounded_rectangle([(bx + 26) * S, 27.5 * S, (bx + 27.6) * S, 31.5 * S], radius=1 * S, fill=ink)
    im.save(f'{out}/{name}.png', optimize=True)
    print(name, im.size, 'dark' if dark else 'light')
