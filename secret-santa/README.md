# Family Secret Santa

A phone friendly web app for the family Secret Santa. One person sets up a group, sends the link round, everyone signs up with their name and a PIN, and the organiser draws names. Each person then opens the link and taps a gift tag to see who they are buying for.

It is a single static page (`index.html`, no build step) talking to the Supabase project `secret-santa` (eu-west-2).

## How it works

1. **Organiser** opens the site and fills in "Organising this year?": the game's name, their own name, everyone else taking part, a gift budget (up to £50) and the gift swap day, plus a PIN. Tapping **Create game and draw names** draws the names straight away, in secret.
2. The organiser sends everyone the link (it looks like `/?g=K7MQ2X`), or just the 6 character code.
3. **Family** open the link, tap their name and, the first time only, choose a PIN so nobody else can peek. They land straight on a gift tag and tap it to see who they're buying for. Their phone remembers them, so opening the link again goes straight back to the tag.

The draw shuffles everyone into one loop, so nobody gets themselves and everyone gives and receives exactly one present.

Organiser tools: share or copy the link, see who has seen their person, add or remove someone (this redraws everyone in secret), reset a forgotten PIN, and change the budget or date. The organiser only ever sees their own match.

## Privacy

The database tables can't be read through the public API at all. The page can only call the functions in `supabase/schema.sql`, and the only match any function returns is the signed-in person's own. The organiser cannot see anyone else's match. PINs are stored bcrypt hashed and sign-in tokens SHA-256 hashed. Eight wrong PINs lock that name for 15 minutes.

## Deploy

On Vercel: **Add New > Project**, import this repository and set **Root Directory** to `secret-santa`. Framework preset "Other", no build command. Every push redeploys.

Preview locally with `npx serve secret-santa`.

## Database

`supabase/schema.sql` is the original schema and `supabase/002_draw_on_create.sql` the change to drawing on creation with a £50 cap. Both are already applied to the `secret-santa` Supabase project. The URL and publishable key at the top of the script in `index.html` point at that project; the publishable key is meant to be public.
