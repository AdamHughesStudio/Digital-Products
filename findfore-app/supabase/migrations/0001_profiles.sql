-- FindFore, stage 1: accounts, profiles and profile photos.
-- Paste the whole file into Supabase, SQL Editor, New query, then Run. Safe to run more than once.

-- ---------- profiles: one row per signed in golfer ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9._]{3,20}$' and username !~ '^[._]' and username !~ '[._]$'),
  first_name text not null check (char_length(first_name) between 1 and 40),
  last_name text not null check (char_length(last_name) between 1 and 40),
  handicap numeric(4,1),
  handicap_verified boolean not null default false,
  home_club text,
  bio text not null default '' check (char_length(bio) <= 300),
  location_name text,
  location_lat double precision,
  location_lng double precision,
  radius_miles integer not null default 25 check (radius_miles between 5 and 200),
  photo_path text,
  show_surname boolean not null default true,
  show_home_club boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- keep updated_at honest
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- who can do what ----------
alter table public.profiles enable row level security;

-- any signed in golfer can see profiles (needed for search, games and friends)
drop policy if exists "profiles are visible to signed in golfers" on public.profiles;
create policy "profiles are visible to signed in golfers" on public.profiles
  for select to authenticated using (true);

-- you can only create and change your own profile
drop policy if exists "golfers create their own profile" on public.profiles;
create policy "golfers create their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "golfers edit their own profile" on public.profiles;
create policy "golfers edit their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- deleting your account removes the profile through the auth.users cascade

-- a quick, safe check the app uses while someone types a username
create or replace function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(candidate));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- profile photos ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- photos live at avatars/<user id>/<file>; anyone can view, only you can add or change yours
drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "golfers upload their own avatar" on storage.objects;
create policy "golfers upload their own avatar" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "golfers replace their own avatar" on storage.objects;
create policy "golfers replace their own avatar" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "golfers remove their own avatar" on storage.objects;
create policy "golfers remove their own avatar" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
