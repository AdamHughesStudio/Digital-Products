-- PlusFore: open competitions that clubs publish themselves.
--
-- Rows come from each club's own website (or an association calendar), read by the competitions
-- pipeline. Every row keeps the page it came from, so golfers can check it and enter on the club's
-- own site. Nothing here is copied from another listings site.
--
-- club_id points at clubs.id where we could match the club. Clubs we have written up ourselves
-- replace their OpenStreetMap row in the app, so the club's name and position are kept as well
-- and the app matches on those when the id is not in its list.

create table if not exists public.competitions (
  id text primary key,
  club_id text references public.clubs (id) on delete set null,
  host text not null,
  lat double precision,
  lng double precision,
  title text not null,
  starts_on date not null,
  ends_on date,
  gender text not null check (gender in ('men', 'women', 'mixed')),
  seniors boolean not null default false,
  juniors boolean not null default false,
  format text check (format in ('stableford', 'stroke', 'scramble', 'greensomes', 'fourball', 'matchplay', 'foursomes', 'other')),
  holes integer,
  entry text check (entry in ('individual', 'pairs', 'teams')),
  fee_gbp numeric(8, 2),
  fee_basis text check (fee_basis in ('per person', 'per pair', 'per team')),
  max_handicap numeric(4, 1),
  start_time text,
  entry_url text,
  source_url text not null,
  notes text,
  confirmed boolean not null default true,
  active boolean not null default true,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists competitions_starts_on_idx on public.competitions (starts_on) where active;
create index if not exists competitions_club_idx on public.competitions (club_id);
alter table public.competitions enable row level security;
create policy "anyone can see competitions" on public.competitions for select to anon, authenticated using (active);
