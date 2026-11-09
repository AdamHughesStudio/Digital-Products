-- PlusFore: leads for open competitions we haven't found on a club's own website yet.
--
-- A lead is a confirmed competition seen on another listings site (Golf Empire) that is missing
-- from public.competitions. We never publish a lead as it stands: someone checks it against a
-- second, independent source first (normally the club's booking page, which is not crawled), and
-- only then does it become a competition. Only the bare facts are kept: club, date, event name.
--
-- Only admins can see or review leads.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
create policy "admins can see admins" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table if not exists public.competition_leads (
  id text primary key,
  source text not null default 'golf-empire',
  source_ref text,
  source_club text not null,
  region text,
  club_id text references public.clubs (id) on delete set null,
  title text not null,
  starts_on date not null,
  gender text not null default 'mixed' check (gender in ('men', 'women', 'mixed')),
  seniors boolean not null default false,
  juniors boolean not null default false,
  -- where a person can check it: the club's booking page if we know it, else the listing's club page
  check_url text,
  listing_url text,
  status text not null default 'new' check (status in ('new', 'covered', 'confirmed', 'not_found', 'unmatched')),
  competition_id text references public.competitions (id) on delete set null,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists competition_leads_status_idx on public.competition_leads (status, starts_on);
alter table public.competition_leads enable row level security;
create policy "admins can see leads" on public.competition_leads for select to authenticated using (public.is_admin());

-- Leads we already have from a club's own site (same club, same day) need no checking.
create or replace function public.mark_covered_leads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.competition_leads l
     set status = 'covered', updated_at = now()
   where l.status in ('new', 'unmatched')
     and l.club_id is not null
     and exists (
       select 1 from public.competitions c
        where c.active and c.club_id = l.club_id
          and l.starts_on between c.starts_on and coalesce(c.ends_on, c.starts_on)
     );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- An admin's verdict on one or more leads. Confirmed leads become competitions, linked to the page
-- the admin checked, which is also where golfers go to enter.
create or replace function public.review_leads(lead_ids text[], verdict text, checked_url text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review leads';
  end if;
  if verdict not in ('confirmed', 'not_found', 'new') then
    raise exception 'Unknown verdict %', verdict;
  end if;

  if verdict = 'confirmed' then
    insert into public.competitions (id, club_id, host, lat, lng, title, starts_on, gender, seniors, juniors, entry_url, source_url, notes, confirmed)
    select 'c-' || l.id, l.club_id, coalesce(k.name, l.source_club), k.lat, k.lng, l.title, l.starts_on, l.gender, l.seniors, l.juniors,
           coalesce(checked_url, l.check_url), coalesce(checked_url, l.check_url),
           'Entry is through the club''s booking page.', true
      from public.competition_leads l
      left join public.clubs k on k.id = l.club_id
     where l.id = any (lead_ids) and l.club_id is not null and coalesce(checked_url, l.check_url) is not null
    on conflict (id) do update set active = true, entry_url = excluded.entry_url, source_url = excluded.source_url, updated_at = now();

    update public.competition_leads
       set status = 'confirmed', competition_id = 'c-' || id, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now(),
           check_url = coalesce(checked_url, check_url)
     where id = any (lead_ids) and club_id is not null and coalesce(checked_url, check_url) is not null;
    get diagnostics n = row_count;
  else
    -- "not found", or undo: take down anything published from these leads
    update public.competitions set active = false, updated_at = now()
     where id in (select 'c-' || id from public.competition_leads where id = any (lead_ids) and status = 'confirmed');
    update public.competition_leads
       set status = verdict, competition_id = null, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
     where id = any (lead_ids);
    get diagnostics n = row_count;
  end if;
  return n;
end;
$$;

revoke all on function public.review_leads(text[], text, text) from public, anon;
grant execute on function public.review_leads(text[], text, text) to authenticated;
revoke all on function public.mark_covered_leads() from public, anon, authenticated;
