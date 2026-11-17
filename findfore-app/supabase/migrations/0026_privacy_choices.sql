-- PlusFore: each golfer's analytics and advert choices, from Profile, then Privacy.
--
-- Nothing reads these yet, because the app has no analytics or adverts. When they're added they
-- must check here first (and on the phone, which keeps its own copy), and this table is the record
-- of when each person said yes or no, which UK GDPR and PECR expect us to be able to show.
create table if not exists public.privacy_choices (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  analytics boolean not null default false,
  personalised_ads boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.privacy_choices enable row level security;
create policy "see your own choices" on public.privacy_choices for select to authenticated using (user_id = auth.uid());
create policy "make your own choices" on public.privacy_choices for insert to authenticated with check (user_id = auth.uid());
create policy "change your own choices" on public.privacy_choices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
