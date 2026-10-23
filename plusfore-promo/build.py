"""
Builds index.html, the PlusFore promo composition, from real app screenshots in shots/.

Call-outs are placed from the element positions measured when the screens were captured
(shots/boxes.json and the boxes below), so every ring and line lands on the real UI.
Run: python3 build.py, then npx hyperframes lint / render.
"""
import json

W, H = 1920, 1080
FOREST, RAISED, SAGE, SAGE_DEEP, LIGHT, MARK_SAGE, IVORY, CREAM, PAGE = (
    '#0F1A14', '#17271E', '#6B8F7B', '#577A67', '#ADC8A2', '#8CA98B', '#E7E1DB', '#FBF7EE', '#F2EEE8')

MARK_VIEWBOX = '210 270 667 497'
MARK_PLUS = open('mark-plus.txt').read().strip()
MARK_F = open('mark-f.txt').read().strip()

# phone: a 390 x 844 screen shown at SCREEN_W wide, in a 12px bezel
BEZEL = 12

def phone_geom(cx, top, screen_w):
    k = screen_w / 390
    return {'cx': cx, 'top': top, 'k': k, 'sw': screen_w, 'sh': 844 * k,
            'sx': cx - screen_w / 2, 'sy': top + BEZEL}

def phone_html(pid, shot, g, extra_class=''):
    w = g['sw'] + BEZEL * 2
    h = g['sh'] + BEZEL * 2
    return (f'<div id="{pid}" class="phone {extra_class}" style="left:{g["cx"] - w / 2:.1f}px;top:{g["top"]:.1f}px;'
            f'width:{w:.1f}px;height:{h:.1f}px">'
            f'<img src="shots/{shot}.png" alt="" style="width:{g["sw"]:.1f}px;height:{g["sh"]:.1f}px" /></div>')

def callouts_html(scene, g, items):
    """Rings on the screen, a drawn line and a label for each call-out. Returns (html, svg paths)."""
    rings, labels, paths = [], [], []
    for i, c in enumerate(items):
        x, y, w, h = c['box']
        pad = c.get('pad', 8)
        rx = g['sx'] + x * g['k'] - pad
        ry = g['sy'] + y * g['k'] - pad
        rw = w * g['k'] + pad * 2
        rh = h * g['k'] + pad * 2
        cid = f'{scene}-c{i}'
        rings.append(f'<div id="{cid}-ring" class="ring" style="left:{rx:.1f}px;top:{ry:.1f}px;width:{rw:.1f}px;height:{rh:.1f}px">'
                     f'<div class="ring-pulse"></div></div>')
        lw = c.get('lw', 320)
        ly = ry + rh / 2 + c.get('dy', 0)
        if c['side'] == 'right':
            lx = c.get('lx', g['sx'] + g['sw'] + 56)
            x1, x2 = rx + rw, lx - 14
        else:
            lx = c.get('lx', g['sx'] - 70 - lw)
            x1, x2 = rx, lx + lw + 14
        y1 = ry + rh / 2
        # out from the ring, then across to the label
        xm = x1 + (34 if c['side'] == 'right' else -34)
        paths.append(f'<path id="{cid}-line" class="line" d="M {x1:.1f} {y1:.1f} L {xm:.1f} {y1:.1f} L {x2:.1f} {ly:.1f}" />'
                     f'<circle id="{cid}-dot" class="dot" cx="{x1:.1f}" cy="{y1:.1f}" r="7" />')
        align = 'left' if c['side'] == 'right' else 'right'
        labels.append(f'<div id="{cid}-label" class="label label-{align}" style="left:{lx:.1f}px;top:{ly:.1f}px;width:{lw}px">'
                      f'<div class="label-num" data-layout-ignore>{i + 1:02d}</div><div class="label-title">{c["title"]}</div>'
                      f'<div class="label-sub">{c["sub"]}</div></div>')
    svg = f'<svg class="lines" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{"".join(paths)}</svg>'
    return ''.join(rings) + svg + ''.join(labels)

def chrome(n, word, counter=True):
    """Background and frame furniture shared by the feature scenes"""
    return (f'<div class="grid"></div><div class="glow"></div>'
            f'<div class="ghost" id="ghost-{n}">{word}</div>'
            '<div class="reg reg-tl"></div><div class="reg reg-tr"></div><div class="reg reg-bl"></div><div class="reg reg-br"></div>'
            f'<div class="meta meta-tl" data-layout-ignore><span class="meta-dot"></span>PLUSFORE · PRODUCT TOUR</div>'
            + (f'<div class="meta meta-br" data-layout-ignore>{n:02d} / 05</div>' if counter else ''))

def text_block(n, eyebrow, lines, sub, extra=''):
    heads = ''.join(f'<div class="hl-mask"><div class="hl" id="s{n}-hl{i}">{l}</div></div>' for i, l in enumerate(lines))
    return (f'<div class="copy" id="s{n}-copy"><div class="eyebrow" id="s{n}-eyebrow"><span>{n - 2:02d}</span>{eyebrow}</div>'
            f'{heads}<div class="sub" id="s{n}-sub">{sub}</div>{extra}</div>')

def mark_svg(cls, pid=''):
    return (f'<svg class="{cls}" viewBox="{MARK_VIEWBOX}"><path class="m-plus" {pid and f"id={pid}-plus"} fill="{MARK_SAGE}" d="{MARK_PLUS}"/>'
            f'<path class="m-f" {pid and f"id={pid}-f"} fill="{CREAM}" d="{MARK_F}"/></svg>')

# ---------- scenes ----------

scenes = []

# S1 brand open
scenes.append(f'''
<div id="scene1" class="scene">
  <div class="grid"></div><div class="glow glow-centre" id="s1-glow"></div>
  <div class="reg reg-tl"></div><div class="reg reg-tr"></div><div class="reg reg-bl"></div><div class="reg reg-br"></div>
  <div class="meta meta-tl" id="s1-meta"><span class="meta-dot"></span>PLUSFORE · 2026</div>
  <div class="meta meta-br" id="s1-meta2">THE GOLF APP FOR FINDING A GAME</div>
  <div class="open-centre">
    <div class="open-mark">{mark_svg("mark", "s1")}</div>
    <div class="open-word" id="s1-word">{''.join(f'<span class="ch">{c}</span>' for c in 'Plus')}<span class="fore">{''.join(f'<span class="ch">{c}</span>' for c in 'Fore')}</span></div>
    <div class="open-rule" id="s1-rule"></div>
    <div class="open-tag" id="s1-tag">Find your four.</div>
  </div>
</div>''')

# S2 hook
scenes.append(f'''
<div id="scene2" class="scene">
  <div class="grid"></div><div class="glow glow-right"></div>
  <div class="ghost ghost-four" id="s2-ghost">4</div>
  <div class="reg reg-tl"></div><div class="reg reg-tr"></div><div class="reg reg-bl"></div><div class="reg reg-br"></div>
  <div class="meta meta-tl"><span class="meta-dot"></span>PLUSFORE · PRODUCT TOUR</div>
  <div class="hook">
    <div class="hook-line" id="s2-l0">Short of a fourth?</div>
    <div class="hook-line" id="s2-l1">New to the club?</div>
    <div class="hook-line" id="s2-l2">Fancy a round this weekend?</div>
    <div class="hook-answer" id="s2-ans">PlusFore finds your four.</div>
  </div>
  <div class="four">
    <div class="player" id="s2-p0"><span>01</span></div>
    <div class="player" id="s2-p1"><span>02</span></div>
    <div class="player" id="s2-p2"><span>03</span></div>
    <div class="player player-open" id="s2-p3"><span>04</span></div>
  </div>
  <div class="four-label" id="s2-flabel">FOURBALL · 3 OF 4</div>
  <div class="four-label four-label-on" id="s2-flabel2">FOURBALL · 4 OF 4</div>
</div>''')

boxes = json.load(open('shots/boxes.json'))

def feature(n, word, eyebrow, lines, sub, phones, callouts, extra=''):
    stage = ''.join(phone_html(pid, shot, g, cls) for pid, shot, g, cls in phones)
    main_g = phones[-1][2]
    return (f'<div id="scene{n}" class="scene">{chrome(n - 2, word)}'
            f'{text_block(n, eyebrow, lines, sub, extra)}'
            f'<div class="stage" id="s{n}-stage">{stage}{callouts_html(f"s{n}", main_g, callouts)}</div></div>')

TOP = 95
SW = 400

# S3 discover: the home feed
g3 = phone_geom(1250, TOP, SW)
scenes.append(feature(3, 'DISCOVER', 'DISCOVER', ['Every game near you.', 'One feed.'],
    'Games, club opens and championships, sorted by day.',
    [('s3-phone', 'home', g3, '')],
    [
        {'box': [20, 84, 368, 32], 'side': 'right', 'title': 'When suits you', 'sub': 'Today, tomorrow or the weekend', 'dy': -50},
        {'box': [20, 133, 352, 73], 'side': 'right', 'title': 'Games and competitions', 'sub': 'Switch between them in a tap', 'dy': 110},
        {'box': [20, 360, 350, 368], 'side': 'right', 'title': 'Real courses, real tee times', 'sub': 'Price, players and spaces at a glance', 'dy': 120, 'pad': 6},
    ]))

# S4 join: a game
g4 = phone_geom(1250, TOP, SW)
steps = ('<div class="steps" id="s4-steps"><div class="step" id="s4-st0">Request</div><div class="step-arrow" id="s4-ar0">›</div>'
         '<div class="step" id="s4-st1">Host accepts</div><div class="step-arrow" id="s4-ar1">›</div>'
         '<div class="step step-on" id="s4-st2">You’re in</div></div>')
scenes.append(feature(4, 'JOIN', 'JOIN', ['Ask to join', 'in one tap.'],
    'The host accepts, you become friends, and the game is on.',
    [('s4-phone', 'game', g4, '')],
    [
        {'box': [20, 292, 350, 162], 'side': 'right', 'title': 'Everything up front', 'sub': 'Tee time, spaces and price', 'dy': -20},
        {'box': [20, 470, 350, 200], 'side': 'right', 'title': 'See who’s playing', 'sub': 'Handicap and games played', 'dy': 20},
        {'box': [20, 775, 350, 53], 'side': 'right', 'title': 'One tap to ask', 'sub': 'Hosts choose who joins', 'dy': -10},
    ], steps))

# S5 chat: two phones, the reaction picker in front
g5b = phone_geom(935, TOP + 40, 340)
g5 = phone_geom(1310, TOP, SW)
scenes.append(feature(5, 'CHAT', 'CHAT', ['Sort it here.', 'Then just play.'],
    'Every game gets its own group chat.',
    [('s5-back', 'chat', g5b, 'phone-back'), ('s5-phone', 'chat-react', g5, '')],
    [
        {'box': [0, 56, 390, 56], 'side': 'right', 'title': 'A chat for every game', 'sub': 'Everyone playing, in one place', 'pad': 4},
        {'box': [20, 318, 305, 46], 'side': 'right', 'title': 'Hold to react', 'sub': 'Just like WhatsApp', 'dy': 30},
        {'box': [20, 740, 350, 42], 'side': 'right', 'title': 'Quick replies', 'sub': '“Running 5 mins late”', 'dy': -30},
    ]))

# S6 compete: filters with dates, and the filtered feed behind
g6b = phone_geom(935, TOP + 40, 340)
g6 = phone_geom(1310, TOP, SW)
scenes.append(feature(6, 'COMPETE', 'COMPETE', ['Every open.', 'One feed.'],
    'Filter by dates, country, format and who can play.',
    [('s6-back', 'comps-filtered', g6b, 'phone-back'), ('s6-phone', 'filters', g6, '')],
    [
        {'box': [20, 255, 350, 48], 'side': 'right', 'title': 'Pick your dates', 'sub': 'Any start, any finish', 'dy': -30},
        {'box': [22, 312, 346, 368], 'side': 'right', 'title': 'Opens and championships', 'sub': 'Every competition in range', 'dy': 50, 'pad': 4},
        {'box': [155, 770, 215, 53], 'side': 'right', 'title': '7 matches', 'sub': 'Straight back to your feed', 'dy': -10},
    ]))

# S7 you: profile in front, season calendar behind
g7b = phone_geom(935, TOP + 40, 340)
g7 = phone_geom(1310, TOP, SW)
scenes.append(feature(7, 'SEASON', 'YOUR SEASON', ['Your golf.', 'Your people.'],
    'Friends, mutual friends and every round on one calendar.',
    [('s7-back', 'season', g7b, 'phone-back'), ('s7-phone', 'profile', g7, '')],
    [
        {'box': [40, 210, 310, 46], 'side': 'right', 'title': 'No star ratings', 'sub': 'Games played and friends instead', 'dy': -30},
        {'box': [20, 368, 350, 128], 'side': 'right', 'title': 'Mutual friends', 'sub': 'Know someone who knows them', 'dy': 20},
        {'box': [20, 600, 350, 100], 'side': 'right', 'title': 'Their open games', 'sub': 'Ask to join straight from here', 'dy': 40},
    ]))

# S8 word wall
words = ['Games.', 'Opens.', 'Championships.', 'Group chats.', 'Your season.']
scenes.append('<div id="scene8" class="scene"><div class="wall-bg" id="s8-bg"></div>'
              + ''.join(f'<div class="wall-word" id="s8-w{i}">{w}</div>' for i, w in enumerate(words))
              + '<div class="meta meta-tl wall-meta"><span class="meta-dot"></span>ALL IN ONE APP</div></div>')

# S9 call to action
scenes.append(f'''
<div id="scene9" class="scene">
  <div class="grid"></div><div class="glow glow-centre" id="s9-glow"></div>
  <div class="reg reg-tl"></div><div class="reg reg-tr"></div><div class="reg reg-bl"></div><div class="reg reg-br"></div>
  <div class="cta">
    <div class="cta-mark" id="s9-markwrap">{mark_svg("mark", "s9")}</div>
    <div class="cta-word" id="s9-word">Plus<span class="fore">Fore</span></div>
    <div class="cta-tag" id="s9-tag">Find your four.</div>
    <div class="cta-url" id="s9-url">getplusfore.app</div>
  </div>
  <div class="meta meta-br" id="s9-meta">COMING SOON TO SCOTLAND</div>
</div>''')

css = open('style.css').read()
js = open('timeline.js').read()

html = f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8" />
<script src="vendor/gsap.min.js"></script>
<style>
{css}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-width="{W}" data-height="{H}" data-start="0" data-duration="60">
{''.join(scenes)}
<div class="wipe" id="wipe"></div>
</div>
<script>
{js}
</script>
</body>
</html>
'''
open('index.html', 'w').write(html)
print('index.html written')
