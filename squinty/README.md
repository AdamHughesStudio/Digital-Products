# Squinty landing page

A single page site for Squinty, an AI marketing and automation agency. It is plain HTML, CSS and a little JavaScript with no build step, so it can be hosted anywhere (Vercel, Netlify or any static host).

The layout follows the reference waitlist template section by section: floating pill navigation, dark hero with a quote, a sign up form, a dark "new kind of agency" panel with a phone stack and feature list, three audience cards, a split image and call to action panel, a full width statement band, a closing quote and a giant wordmark footer. The copy, logo, colours and visuals are original to Squinty.

## Preview locally

```
npx serve squinty
```

## Brand

| Token | Hex | Use |
| --- | --- | --- |
| Squinty Night | `#0B1622` | Dark panels, body text |
| Squint Yellow | `#FFDD4A` | Headlines on dark, buttons, the eye mark |
| White | `#FFFFFF` | Page background |

Yellow is never used as text on white, as it fails contrast. The squinting eye (`#eye` symbol in `index.html`) is the logo mark and stands in for the letter O in the hero headline. Change the colours in the `:root` block at the top of `index.html`.

Fonts: Archivo (headlines) and Manrope (body), self hosted in `assets/fonts` under the SIL Open Font License.

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
- The audience cards, the audit panel and the statement band use illustrations drawn in SVG. Swap in photography if you have it.
