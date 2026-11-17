-- PlusFore: entry status for club opens, and what the weekly check needs to keep the list current.
--
-- entry_status, entry_opens and entry_closes are set only when the club's page says so; null means
-- the club hasn't said. last_seen is when the weekly check last found the open on the club's page,
-- so an open that disappears can be noticed. competition_pages remembers each club page's content,
-- so a page that hasn't changed since last week needs no reading again. Only the service role
-- touches competition_pages.

alter table public.competitions
  add column if not exists entry_status text check (entry_status in ('open', 'closing', 'full', 'waiting_list', 'ballot', 'closed', 'not_open')),
  add column if not exists entry_opens date,
  add column if not exists entry_closes date,
  add column if not exists last_seen timestamptz;

update public.competitions set last_seen = coalesce(updated_at, first_seen) where last_seen is null;

create table if not exists public.competition_pages (
  url text primary key,
  content_hash text,
  checked_at timestamptz,
  changed_at timestamptz
);
alter table public.competition_pages enable row level security;
