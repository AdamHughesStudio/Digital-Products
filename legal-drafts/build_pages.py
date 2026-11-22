"""Turn the app's legal drafts into pages on getplusfore.app.

    python3 -I legal-drafts/build_pages.py

Writes findfore/app-privacy.html and findfore/terms.html from the Markdown drafts in this folder, so
the website says exactly what the app shows. Anything marked [CONFIRM: ...] is kept and highlighted,
and the pages stay out of search engines until no [CONFIRM] is left.
"""
import html
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', 'findfore')

PAGES = [
    {
        'src': 'app-privacy-policy.md',
        'out': 'app-privacy.html',
        'path': '/app-privacy',
        'title': 'App Privacy Policy | PlusFore',
        'description': 'How the PlusFore app collects, uses and protects your personal information, and the rights you have over it.',
        'h1': 'App privacy <span class="mark">policy</span>',
        'lede': 'What the PlusFore app collects, who can see it and what you can ask us to do with it.',
        'nav': 'App Privacy Policy',
    },
    {
        'src': 'terms-of-use.md',
        'out': 'terms.html',
        'path': '/terms',
        'title': 'Terms of Use | PlusFore',
        'description': 'The agreement between you and PlusFore for using the PlusFore app.',
        'h1': 'Terms of <span class="mark">use</span>',
        'lede': 'The agreement between you and PlusFore, in plain English.',
        'nav': 'Terms of Use',
    },
]

FOOTER_LINKS = [
    ('/support', 'Support'),
    ('/app-privacy', 'App Privacy Policy'),
    ('/terms', 'Terms of Use'),
    ('/privacy', 'Website Privacy Policy'),
    ('/cookies', 'Cookie Settings'),
]


def inline(text):
    """Escape, then bold, [CONFIRM] marks and known web addresses."""
    out = html.escape(text, quote=False)
    out = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', out)
    out = re.sub(r'\[CONFIRM(:[^\]]*)?\]', lambda m: f'<mark class="confirm">{m.group(0)}</mark>', out)
    out = out.replace('ico.org.uk/make-a-complaint', '<a href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</a>')
    out = re.sub(r'(?<![/\w])getplusfore\.app/privacy', '<a href="/privacy">getplusfore.app/privacy</a>', out)
    return out


def convert(md):
    """The small part of Markdown the drafts use: headings, lists, tables, paragraphs."""
    lines = md.split('\n')
    blocks, i = [], 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.startswith('# ') or line.startswith('>'):
            i += 1
            continue
        if line.startswith('## '):
            blocks.append(('h2', line[3:].strip()))
            i += 1
        elif line.startswith('### '):
            blocks.append(('h3', line[4:].strip()))
            i += 1
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'-+', c) for c in cells):
                    rows.append(cells)
                i += 1
            blocks.append(('table', rows))
        elif line.startswith('- '):
            items = []
            while i < len(lines) and (lines[i].startswith('- ') or lines[i].startswith('  ')):
                if lines[i].startswith('- '):
                    items.append(lines[i][2:].strip())
                else:
                    items[-1] += ' ' + lines[i].strip()
                i += 1
            blocks.append(('ul', items))
        else:
            para = []
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(('#', '|', '- ', '>')):
                para.append(lines[i].strip())
                i += 1
            blocks.append(('p', ' '.join(para)))
    return blocks


def render(blocks):
    out, updated = [], None
    summary_open = False
    for kind, body in blocks:
        if kind == 'p' and body.startswith('Last updated') and updated is None:
            updated = body
            continue
        if summary_open and kind == 'h2':
            out.append('      </section>\n')
            summary_open = False
        if kind == 'h2' and body == 'The short version':
            out.append('      <section class="summary" aria-labelledby="summary-title">\n        <h2 id="summary-title">The short version</h2>')
            summary_open = True
        elif kind == 'h2':
            out.append(f'      <h2>{inline(body)}</h2>')
        elif kind == 'h3':
            out.append(f'      <h3>{inline(body)}</h3>')
        elif kind == 'p':
            out.append(f'      <p>{inline(body)}</p>')
        elif kind == 'ul':
            out.append('      <ul>\n' + '\n'.join(f'        <li>{inline(x)}</li>' for x in body) + '\n      </ul>')
        elif kind == 'table':
            head, rows = body[0], body[1:]
            th = ''.join(f'<th scope="col">{inline(h)}</th>' for h in head)
            trs = []
            for r in rows:
                tds = [f'<td>{inline(r[0])}</td>'] + [f'<td data-label="{html.escape(head[k])}">{inline(c)}</td>' for k, c in enumerate(r) if k]
                trs.append('          <tr>' + ''.join(tds) + '</tr>')
            out.append(f'      <table class="table">\n        <thead><tr>{th}</tr></thead>\n        <tbody>\n' + '\n'.join(trs) + '\n        </tbody>\n      </table>')
    if summary_open:
        out.append('      </section>\n')
    return '\n'.join(out), updated


def footer(current):
    links = '\n'.join(
        f'        <a href="{href}"{" aria-current=\"page\"" if href == current else ""}>{label}</a>' for href, label in FOOTER_LINKS
    )
    return f'''  <footer class="footer">
    <div class="footer__inner">
      <span>© PlusFore 2026</span>
      <nav class="footer__links" aria-label="Legal">
{links}
      </nav>
    </div>
  </footer>'''


def page(p, body, updated, draft):
    robots = 'noindex, follow' if draft else 'index, follow'
    banner = (
        '\n      <p class="callout draft-note"><strong>Draft.</strong> Highlighted items are still to be confirmed.</p>' if draft else ''
    )
    return f'''<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{p['title']}</title>
  <meta name="description" content="{p['description']}" />
  <meta name="theme-color" content="#0F1A14" />
  <meta name="robots" content="{robots}" />
  <link rel="canonical" href="https://getplusfore.app{p['path']}" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
  <link rel="preload" href="/assets/fonts/archivo-variable.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/manrope-variable.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/fonts.css" />
  <link rel="stylesheet" href="/assets/legal.css" />
</head>
<body>
  <header class="topbar">
    <div class="topbar__inner">
      <a href="/" aria-label="PlusFore home"><img src="/assets/plusfore-logo-light.png" alt="PlusFore" width="1785" height="330" /></a>
      <a class="topbar__back" href="/support">Get help</a>
    </div>
  </header>

  <main>
    <div class="wrap hero">
      <p class="eyebrow">Legal</p>
      <h1>{p['h1']}</h1>
      <p class="lede">{p['lede']}</p>
      <p class="updated">{inline(updated or '')}</p>{banner}
    </div>

    <div class="wrap content">
{body}
    </div>
  </main>

{footer(p['path'])}
</body>
</html>
'''


def main():
    for p in PAGES:
        md = open(os.path.join(HERE, p['src']), encoding='utf-8').read()
        body, updated = render(convert(md))
        # the review note at the top (lines starting ">") mentions [CONFIRM] itself, so skip it
        draft = any('[CONFIRM' in line for line in md.split('\n') if not line.startswith('>'))
        with open(os.path.join(SITE, p['out']), 'w', encoding='utf-8') as f:
            f.write(page(p, body, updated, draft))
        print(p['out'], 'draft' if draft else 'final', md.count('[CONFIRM'), 'to confirm')


if __name__ == '__main__':
    main()
