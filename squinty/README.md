# Squinty landing page

A single page site for Squinty, an AI marketing and automation agency. It is plain HTML, CSS and a little JavaScript with no build step, so it can be hosted anywhere (Vercel, Netlify or any static host).

The page is laid out like an agency site: a copy led hero with a quote card, a scrolling ticker of services, a "What we do" panel of six service cards, a three step "How it works", a "Why Squinty" section, three audience cards, an example results panel, a full width statement band, an FAQ and finally the free audit form, followed by a closing quote and a giant wordmark footer. The copy, logo, colours and visuals are original to Squinty.

## Preview locally

```
npx serve squinty
```

## Brand

Colours follow the Squinty brand guidelines:

| Token | Hex | Use |
| --- | --- | --- |
| Charcoal | `#0B0B0C` | Dark panels, body text |
| Lime | `#D6FF24` | Core accent: buttons, highlighted words, the i dot |
| Purple | `#A78BFA` | Supporting: gradients, icon tiles, closing line |
| Mint | `#2EE6B6` | Supporting: gradients, icon tiles |
| Soft Blue | `#60A5FA` | Supporting: gradients, icon tiles |
| Off White | `#F7F7F4` | Page background, phone screens |

The brand motif is the thick gradient arc (lime to mint to blue to purple) and the lime to mint half circle, drawn as SVG in each dark panel. The gradients are defined once at the top of the `<body>` (`#g-arc`, `#g-blob`, `#g-cool`). Feature icons sit on coloured rounded tiles, as in the iconography guidelines. Change the colours in the `:root` block at the top of `index.html`.

Headlines are Manrope ExtraBold in sentence case with tight tracking. Body copy is Manrope. The font is self hosted in `assets/fonts` under the SIL Open Font License.

Logo files live in `assets/`, built from the master logo with transparent backgrounds:

- `squinty-logo-light.png`: off white letters with the lime q and i dot, for dark backgrounds (nav, hero, panels, footer)
- `squinty-logo-dark.png`: charcoal letters with the lime q and i dot, for light backgrounds (phone screens, closing line)
- `favicon-32.png`, `favicon-48.png`, `icon-192.png`, `icon-512.png` and `apple-touch-icon.png`: the supplied app icon (the q and lime dot on a charcoal tile), trimmed to the tile. The Apple icon has a charcoal fill behind the corners because iOS rounds them itself
- `og-image.png`: the 1200 by 630 social sharing preview

In `index.html` each logo is an `<img class="logo">` inside a `.wordmark` wrapper. Its height comes from the wrapper's `font-size`, so resize it there.

## Connecting the audit form

The form runs in demo mode until you give it an endpoint. Near the bottom of `index.html`:

```js
const AUDIT_ENDPOINT = "";
```

Paste any URL that accepts a JSON `POST` (Formspree, Tally, a Zapier or Make webhook, or your own API). Each enquiry sends:

```json
{ "name": "", "email": "", "website": "", "goal": "", "source": "squinty-landing", "submittedAt": "" }
```

## Things to update before launch

- The three figures in the "What to expect" results panel (3x, under 60 seconds, 10 hours) are example figures. Replace them with real client results, or soften the wording, before promoting the site.
- The "Limited audit slots each month" line in the audit section, if that is not true for you.
- The FAQ answers. They describe month to month terms and a 30 minute audit call, so change them if your offer differs.
- Social links in the footer (currently `#`).
- Add a canonical link and `og:url` once the domain is live, and make the `og:image` URL absolute.
- Add a contact email to `privacy.html`, and have the privacy and cookies pages checked before launch.
- The audience cards, the audit panel and the statement band use illustrations drawn in SVG. Photography in the guideline style (moody, with purple and lime light) would suit the audience cards.
- If you have the logo as an SVG, swap it in for the PNGs for the sharpest result at large sizes.
