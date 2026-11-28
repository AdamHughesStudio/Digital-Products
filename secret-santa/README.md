# Family Secret Santa

A phone friendly web app for the family Secret Santa. One person sets up a group, sends the link round, everyone signs up with their name and a PIN, and the organiser draws names. Each person then opens the link and taps a gift tag to see who they are buying for.

It is a single static page (`index.html`, no build step) talking to the Supabase project `secret-santa` (eu-west-2).

## How it works

1. **Organiser** opens the site and fills in "Organising this year?": the game's name, their own name, everyone else taking part, a gift budget (up to £50), the gift swap day and a PIN. Tapping **Create game and draw names** draws the names straight away, in secret.
2. The organiser page lists everyone with their own **personal link** and a Send link or Copy button. The organiser sends each person their link individually.
3. **Family** open their link and land straight on their gift tag, then tap it to see who they're buying for. No name list, no PIN. Their phone remembers them, so the plain site address works for them afterwards too.

The draw shuffles everyone into one loop, so nobody gets themselves and everyone gives and receives exactly one present.

Organiser tools: send or copy each person's link, see who has opened their link and who has seen their person, make a new link for someone (the old one stops working at once), add or remove someone (this redraws everyone in secret), and change the budget or date. To manage the game from another phone, the organiser enters the game code and signs in with their name and PIN.

## Privacy

The database tables can't be read through the public API at all. The page can only call the functions in the `supabase` folder.

- Someone with only the game code sees the game's name and nothing else: no names, budget or date.
- A personal link shows that one person's match and nothing about anyone else.
- Name and PIN sign-in only works for the organiser, so nobody can claim another person's name.
- The organiser's page holds everyone's links, so the organiser could in principle open one. Revealing a tag marks that person as "Seen their person" on the tracker, so peeking would show.
- Links are 20 random hex characters. Sign-in keys are stored SHA-256 hashed and the organiser PIN bcrypt hashed. Eight wrong PINs lock the organiser sign-in for 15 minutes.

## Deploy

On Vercel: **Add New > Project**, import this repository and set **Root Directory** to `secret-santa`. Framework preset "Other", no build command. Every push redeploys.

Preview locally with `npx serve secret-santa`.

## Database

`supabase/schema.sql` is the original schema, `002_draw_on_create.sql` draws on creation with a £50 cap, `003_personal_links.sql` adds personal links and `004_sessions_per_device.sql` lets people stay signed in on several phones. All four are already applied to the `secret-santa` Supabase project. The URL and publishable key at the top of the script in `index.html` point at that project; the publishable key is meant to be public.
