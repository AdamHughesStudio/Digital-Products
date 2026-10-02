# Squinty landing page

A single page site for Squinty, an AI marketing and automation agency. It is plain HTML, CSS and a little JavaScript with no build step, so it can be hosted anywhere (Vercel, Netlify or any static host).

The layout follows the reference waitlist template section by section: floating pill navigation, dark hero with a quote, a sign up form, a dark "new kind of agency" panel with a phone stack and feature list, three audience cards, a split image and call to action panel, a full width statement band, a closing quote and a giant wordmark footer. The copy, logo, colours and visuals are original to Squinty.

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

The logo is currently a placeholder text wordmark (`.wordmark` in `index.html`: lowercase "squinty" with a lime half on the q and a lime i dot). Swap it for the real logo file when it is ready, along with `assets/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` and `og-image.png`.

## Connecting the audit form

The form runs in demo mode until you give it an endpoint. Near the bottom of `index.html`:

```js
const AUDIT_ENDPOINT = "";
```

Paste any URL that accepts a JSON `POST` (Formspree, Tally, a Zapier or Make webhook, or your own API). Each enquiry sends:

```json
{ "name": "", "email": "", "website": "", "source": "squinty-landing", "submittedAt": "" }
```

The "Run the Squinty test" box copies the website someone types into the audit form and scrolls them up to it.

## Things to update before launch

- The "120+ brands" figure under the form. It is a placeholder, so use your real number or remove it.
- The phone screens show example figures (revenue, booked calls). They are illustrative UI, so adjust them if you prefer.
- Social links in the footer (currently `#`).
- Add a canonical link and `og:url` once the domain is live, and make the `og:image` URL absolute.
- Add a contact email to `privacy.html`, and have the privacy and cookies pages checked before launch.
- The audience cards, the audit panel and the statement band use illustrations drawn in SVG. Photography in the guideline style (moody, with purple and lime light) would suit the audience cards.
- Replace the placeholder wordmark and icons with the real logo files.
