"""Paints a street map into the small map on a game page capture, for the App Store screenshots.

The screenshot browser can't load real map tiles, so the game page's map comes out as a plain grid.
This draws a believable one (roads, a river, parkland and the course itself) into the same box and
puts the club's label back on top. Usage: python3 mock_map.py <capture> <out> <font dir> <label>
Box and label positions are for a 440 x 902 point capture at 3x.
"""
import math, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

src, out, fonts, label = sys.argv[1:5]
im = Image.open(src).convert('RGB')
L, T, R, B = 63, 2076, 1257, 2475  # inside the map card, down to the top of the footer
w, h = R - L, B - T
S = 2  # draw at double size, then shrink, for smooth edges
m = Image.new('RGB', (w * S, h * S), (238, 239, 233))
d = ImageDraw.Draw(m)
rnd = random.Random(7)

def P(x, y):
    return (x * S, y * S)

# blocks of houses, in a loose grid that the roads cut through
for gx in range(-20, w, 74):
    for gy in range(-20, h, 62):
        if rnd.random() < 0.8:
            bw, bh = rnd.randint(40, 60), rnd.randint(30, 46)
            d.rounded_rectangle([*P(gx + 8, gy + 8), *P(gx + 8 + bw, gy + 8 + bh)], radius=6 * S, fill=(228, 228, 220))

# parkland to the north east, and the golf course in the middle
d.ellipse([*P(w - 300, -120), *P(w + 80, 150)], fill=(214, 229, 204))
course = [(330, 40), (520, 10), (760, 60), (880, 170), (840, 330), (640, 420), (420, 400), (280, 300), (260, 150)]
d.polygon([P(x, y) for x, y in course], fill=(207, 226, 196))
# fairways and greens on the course
for (x1, y1, x2, y2) in [(360, 120, 600, 170), (520, 220, 800, 270), (380, 300, 640, 345)]:
    d.rounded_rectangle([*P(x1, y1), *P(x2, y2)], radius=25 * S, fill=(190, 216, 176))
for (x, y) in [(612, 145), (812, 245), (650, 322)]:
    d.ellipse([*P(x - 16, y - 16), *P(x + 16, y + 16)], fill=(176, 208, 160))
for (x, y) in [(590, 182), (790, 280), (395, 290)]:
    d.ellipse([*P(x - 12, y - 7), *P(x + 12, y + 7)], fill=(236, 226, 196))

# a river across the bottom left
river = [(-30, 300 + 40 * math.sin(i / 3)) for i in range(0)]
pts = [(-40 + i * 40, 330 + 60 * math.sin(i / 4.0) - i * 4) for i in range(36)]
d.line([P(x, y) for x, y in pts], fill=(196, 219, 232), width=34 * S, joint='curve')

def road(points, width, edge=(214, 214, 206)):
    d.line([P(x, y) for x, y in points], fill=edge, width=(width + 4) * S, joint='curve')
    d.line([P(x, y) for x, y in points], fill=(255, 255, 255), width=width * S, joint='curve')

# minor streets, then the main roads over them
for y in (70, 190, 360):
    road([(-20, y), (w + 20, y + 30)], 7)
for x in (130, 980, 1120):
    road([(x, -20), (x + 40, h + 20)], 7)
road([(-20, 20), (300, 30), (520, 0)], 9)
road([(-20, 250), (200, 230), (260, 160), (330, 120)], 9)
road([(w + 20, 120), (950, 160), (880, 330), (900, h + 20)], 9)
main = [(-20, 160 - 0.0), (240, 210), (520, 470)]
road([(-20, 120), (250, 450 - 0), (300, h + 20)], 16, (236, 214, 170))
road([(700, -20), (900, 120), (1000, 260), (w + 20, 330)], 16, (236, 214, 170))

m = m.resize((w, h), Image.LANCZOS)
# keep the card's rounded top corners and border
mask = Image.new('L', (w, h), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, w, h + 60], radius=45, fill=255)
im.paste(m, (L, T), mask)

# the club's label, as the app draws it: light sage pill, forest text, soft shadow
font = ImageFont.truetype(f'{fonts}/700Bold/PlusJakartaSans_700Bold.ttf', 45)
tw = ImageDraw.Draw(im).textlength(label, font=font)
cx, cy = 660, 2249
pw, ph = tw + 72, 92
box = [cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2]
shadow = Image.new('RGBA', im.size, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([box[0], box[1] + 10, box[2], box[3] + 10], radius=ph / 2, fill=(15, 26, 20, 60))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))
im = Image.alpha_composite(im.convert('RGBA'), shadow).convert('RGB')
dd = ImageDraw.Draw(im)
dd.rounded_rectangle(box, radius=ph / 2, fill=(173, 200, 162))
dd.text((cx, cy), label, font=font, fill=(15, 26, 20), anchor='mm')
im.save(out)
print('saved', out)
