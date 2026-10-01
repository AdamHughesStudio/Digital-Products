# FindFore landing page

A single-file waitlist landing page for FindFore. It is plain HTML, CSS and a small amount of JavaScript, with no build step, so it can be hosted anywhere (Vercel, Netlify, GitHub Pages or any static host).

## Preview locally

Open `index.html` in a browser, or serve the folder:

```
npx serve findfore
```

## Brand

| Token | Hex | Use |
| --- | --- | --- |
| FindFore Lime | `#C7FF00` | Core. Headlines on dark, buttons, highlights |
| Charcoal Black | `#0B0B0B` | Core. Dark panels, body text |
| Golf Green | `#1F3D1F` | Supporting only. Course contour lines, one illustration tile |
| Slate Grey | `#6B7280` | Secondary text, placeholders |
| Light Grey | `#F3F4F6` | "How it works" panel, app screens |
| White | `#FFFFFF` | Page background |

Lime is never used as text on white (it fails contrast). On light sections it appears as a highlighter stripe behind charcoal text instead.

Logo files live in `assets/`: `findfore-logo-light.png` (white Find, for dark backgrounds) and `findfore-logo-mono-dark.png` (all charcoal, for light backgrounds), plus the app icon set: `favicon.ico` (site root), `favicon-32.png`, `icon-192.png`, `icon-512.png` and `apple-touch-icon.png` (full bleed, iOS rounds the corners). `site.webmanifest` lists the icons for Android home screens.

The social sharing preview is `assets/og-image.jpg` (1200 x 630), showing the app icon, logo and headline.

Fonts: Archivo (Black, expanded) for headlines and Manrope for body copy, both loaded from Google Fonts.

## Connecting the waitlist form

The form runs in demo mode until you give it an endpoint. Near the bottom of `index.html`:

```js
const WAITLIST_ENDPOINT = "";
```

Paste any URL that accepts a JSON `POST` (Formspree, Loops, Tally, a Zapier or Make webhook, or your own API). Each sign up sends:

```json
{ "name": "", "email": "", "handicap": "", "source": "findfore-landing", "submittedAt": "" }
```

## Domain

The site is live at https://findfore.app (www.findfore.app redirects to it). DNS is managed at Namecheap and points to the Vercel project `findfore`. The canonical, `og:url`, `og:image` and `twitter:image` links in the `<head>` of `index.html` use this domain; update them if the domain ever changes.

## Search engines

`robots.txt` allows all crawlers and points at `sitemap.xml`, which lists the single page. The `<head>` carries a canonical link, a robots meta tag and JSON-LD structured data (Organization, WebSite, WebPage and MobileApplication).

Google Search Console is best verified as a Domain property with a DNS TXT record at Namecheap, which covers findfore.app and www.findfore.app together. If you prefer the HTML tag method instead, paste the tag Google gives you into the commented line under the canonical link in `index.html`. After verifying, submit `https://findfore.app/sitemap.xml` under Sitemaps and request indexing for the home page.

## Things to update before launch

- App Store and Google Play badge links in the hero (currently `#`). Point them at the real store listings once the app is live.
- Social links and the Privacy Policy / Cookie Settings links in the footer (currently `#`).
- "Launching 2027" in the hero, if your date differs.
- The three phone mock ups use real app screenshots in `assets/` (`app-profile.jpg`, `app-feed-*.jpg`, `app-inbox-*.jpg`). Replace these files if the app design changes.
