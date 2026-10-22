# PlusFore landing page

A single-file waitlist landing page for PlusFore. It is plain HTML, CSS and a small amount of JavaScript, with no build step, so it can be hosted anywhere (Vercel, Netlify, GitHub Pages or any static host).

## Preview locally

Open `index.html` in a browser, or serve the folder:

```
npx serve findfore
```

## Brand

From the PlusFore brand guidelines:

| Token | Hex | Use |
| --- | --- | --- |
| Forest Green | `#0F1A14` | Primary. Dark panels, headers, page chrome |
| Sage Green | `#6B8F7B` | Secondary. Accents, icons, highlights, active states |
| Ivory | `#E7E1DB` | Background. Light sections, cards, surfaces |
| Charcoal | `#1F2937` | Text. Body copy, icons, UI elements |

Supporting shades: light sage `#ADC8A2` for headlines, buttons and highlights on forest; a slightly deeper sage `#577A67` behind ivory button text so it passes contrast; light ivory `#F2EEE8` and `#FBF9F6` for page backgrounds. In the CSS the `--lime` and `--ink` variable names were kept: `--lime` is light sage and `--ink` is forest.

Logo files live in `assets/`: `plusfore-logo-light.png` (cream lettering, for dark backgrounds) and `plusfore-logo-mono-dark.png` (forest lettering, for light backgrounds), plus the app icon set: `favicon.ico` (site root), `favicon-32.png`, `icon-192.png`, `icon-512.png` and `apple-touch-icon.png` (full bleed, iOS rounds the corners). `site.webmanifest` lists the icons for Android home screens.

The social sharing preview is `assets/og-image.jpg` (1200 x 630), showing the app icon, logo and headline.

Font: Plus Jakarta Sans for headlines and body copy. It is self hosted in `assets/fonts` (SIL Open Font License) and declared in `assets/fonts.css`, so no visitor data goes to Google.

## Connecting the waitlist form

The form runs in demo mode until you give it an endpoint. Near the bottom of `index.html`:

```js
const WAITLIST_ENDPOINT = "";
```

Paste any URL that accepts a JSON `POST` (Formspree, Loops, Tally, a Zapier or Make webhook, or your own API). Each sign up sends:

```json
{ "name": "", "email": "", "handicap": "", "source": "plusfore-landing", "submittedAt": "" }
```

## Domain

The site is live at https://getplusfore.app (www.getplusfore.app redirects to it). The domain was bought through Vercel, so its DNS is managed there, and it is on the Vercel project `findfore`. The old domain, findfore.app (DNS at Namecheap), is still on the project and `vercel.json` forwards it to getplusfore.app. `vercel.json` also forwards app links (games, opens, championships, clubs, courses, golfers, profiles) to the app. The canonical, `og:url`, `og:image` and `twitter:image` links in the `<head>` of `index.html` use getplusfore.app; update them if the domain ever changes.

## Search engines

`robots.txt` allows all crawlers and points at `sitemap.xml`, which lists the single page. The `<head>` carries a canonical link, a robots meta tag and JSON-LD structured data (Organization, WebSite, WebPage and MobileApplication).

Google Search Console was set up as a Domain property for the old findfore.app under adam@adamhughes.studio, verified by a `google-site-verification` TXT record on `@` at Namecheap. Keep that TXT record in place, as removing it unverifies the property. The sitemap was submitted as `https://findfore.app/sitemap.xml`; getplusfore.app needs its own property and its sitemap, `https://getplusfore.app/sitemap.xml`, submitting. The commented verification meta tag in `index.html` is not needed while the DNS record exists.

## Privacy and cookies

`privacy.html` (served at /privacy) is the privacy policy and `cookies.html` (served at /cookies) is the cookie settings page. Both share `assets/legal.css`. `vercel.json` turns on clean URLs so the pages load without the .html ending. The site sets no cookies, stores nothing in the browser and makes no third party requests until someone submits the waitlist form, which posts to Formspree. If you add analytics or anything else that is not strictly necessary, add a consent banner first and update both pages, including the Last updated date.

## Things to update before launch

- App Store and Google Play badge links in the hero (currently `#`). Point them at the real store listings once the app is live.
- Social links in the footer (currently `#`).
- "Launching 2027" in the hero, if your date differs.
- The phone mock ups use real screenshots from the PlusFore app in `assets/`: `app-home.jpg` (Home), `app-events.jpg` (the Events tab) and `app-club.jpg` (the Buchanan Castle club profile) in the platform section, and `app-chat.jpg` (a group chat arranging a game at Haggs Castle, staged in the demo data) in the desktop hero. Each is captured at 390 by 760 points and saved 700 pixels wide. Recapture them if the app design changes.
