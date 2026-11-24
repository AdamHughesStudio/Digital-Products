# Family Secret Santa

A phone friendly web app for the family Secret Santa. One person sets up a group, sends the link round, everyone signs up with their name and a PIN, and the organiser draws names. Each person then opens the link and taps a gift tag to see who they are buying for.

It is a single static page (`index.html`, no build step) talking to the Supabase project `secret-santa` (eu-west-2).

## How it works

1. **Organiser** opens the site, fills in "Organising this year?" (group name, their name, budget, gift swap date, PIN) and gets a share link like `/?g=K7MQ2X`.
2. **Family** open the link, tap **Join**, enter their name and choose a 4 to 8 digit PIN. They can see who else has joined.
3. Once at least 3 people have joined, the organiser taps **Draw names**. Sign-ups close.
4. Everyone opens the link again (their phone remembers them; on a new phone they use **I've joined** with their name and PIN) and taps the tag to reveal their person.

The draw shuffles everyone into one loop, so nobody gets themselves and everyone gives and receives exactly one present.

Organiser tools: share or copy the link, edit budget and date, remove someone (before the draw), reset someone's PIN (they choose a new one at their next sign-in), and undo the draw to add a latecomer.

## Privacy

The database tables can't be read through the public API at all. The page can only call the functions in `supabase/schema.sql`, and the only match any function returns is the signed-in person's own. The organiser cannot see anyone else's match. PINs are stored bcrypt hashed and sign-in tokens SHA-256 hashed. Eight wrong PINs lock that name for 15 minutes.

## Deploy

On Vercel: **Add New > Project**, import this repository and set **Root Directory** to `secret-santa`. Framework preset "Other", no build command. Every push redeploys.

Preview locally with `npx serve secret-santa`.

## Database

`supabase/schema.sql` is the full schema, already applied to the `secret-santa` Supabase project. The URL and publishable key at the top of the script in `index.html` point at that project; the publishable key is meant to be public.
