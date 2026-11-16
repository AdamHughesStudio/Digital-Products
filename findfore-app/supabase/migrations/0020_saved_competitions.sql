-- PlusFore: the competitions each golfer has saved, kept on their account rather than one phone.
--
-- A golfer sees their own saves and their friends' saves, which is what shows "Ryan is interested"
-- on a competition and fills the friends shelf on Home. Nobody else's are visible. event_id is a
-- club open's id from competitions or a national championship's id from the app, so it is text
-- with no foreign key.

create table if not exists public.saved_competitions (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index if not exists saved_competitions_event_idx on public.saved_competitions (event_id);

alter table public.saved_competitions enable row level security;

drop policy if exists "see your own and your friends' saves" on public.saved_competitions;
create policy "see your own and your friends' saves" on public.saved_competitions
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester = auth.uid() and f.addressee = saved_competitions.user_id)
          or (f.addressee = auth.uid() and f.requester = saved_competitions.user_id))
    )
  );

drop policy if exists "save for yourself" on public.saved_competitions;
create policy "save for yourself" on public.saved_competitions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "unsave your own" on public.saved_competitions;
create policy "unsave your own" on public.saved_competitions
  for delete to authenticated using (user_id = auth.uid());
