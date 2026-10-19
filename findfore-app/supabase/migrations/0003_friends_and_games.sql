-- FindFore, stage 2: friends and shared games.
-- Reading is done through row level security. Anything that changes a game's line up goes through
-- the functions at the bottom, so the rules (spaces, who may accept what, friends only invites)
-- are enforced on the server rather than trusted to the app.

-- ---------- friends ----------
create table if not exists public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- one friendship per pair, whichever way round it was asked
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

drop policy if exists "see your own friendships" on public.friendships;
create policy "see your own friendships" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));

-- accept a request sent to you
drop policy if exists "accept requests sent to you" on public.friendships;
create policy "accept requests sent to you" on public.friendships
  for update to authenticated using (auth.uid() = addressee and status = 'pending')
  with check (auth.uid() = addressee and status = 'accepted');

-- decline, cancel or remove: either golfer can end it
drop policy if exists "end your own friendships" on public.friendships;
create policy "end your own friendships" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted' and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;
-- only the functions below use this, so nobody can check who else is friends with whom
revoke execute on function public.are_friends(uuid, uuid) from anon, public, authenticated;

-- Send a request. If they have already asked you, this accepts theirs instead.
create or replace function public.send_friend_request(target uuid, note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  if target = me then raise exception 'That’s you'; end if;
  update public.friendships set status = 'accepted', responded_at = now()
    where requester = target and addressee = me and status = 'pending';
  if found then return 'accepted'; end if;
  if exists (select 1 from public.friendships where least(requester, addressee) = least(me, target) and greatest(requester, addressee) = greatest(me, target)) then
    return 'exists';
  end if;
  insert into public.friendships (requester, addressee, note) values (me, target, nullif(trim(note), ''));
  return 'sent';
end $$;
revoke execute on function public.send_friend_request(uuid, text) from anon, public;
grant execute on function public.send_friend_request(uuid, text) to authenticated;

-- ---------- games ----------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id text not null,
  tee_time timestamptz not null,
  spaces_total integer not null check (spaces_total between 1 and 7),
  cost_per_golfer numeric(6,2) check (cost_per_golfer >= 0),
  visitor_fee numeric(6,2) check (visitor_fee >= 0),
  member_host boolean not null default false,
  handicap jsonb not null default '{"kind":"any"}',
  description text not null default '' check (char_length(description) <= 600),
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists games_tee_time_idx on public.games (tee_time);
create index if not exists games_host_idx on public.games (host_id);

drop trigger if exists games_touch on public.games;
create trigger games_touch before update on public.games
  for each row execute function public.touch_updated_at();

alter table public.games enable row level security;

drop policy if exists "games are visible to signed in golfers" on public.games;
create policy "games are visible to signed in golfers" on public.games
  for select to authenticated using (true);

drop policy if exists "post your own games" on public.games;
create policy "post your own games" on public.games
  for insert to authenticated with check (host_id = auth.uid() and cancelled = false);

drop policy if exists "hosts edit their own games" on public.games;
create policy "hosts edit their own games" on public.games
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

-- ---------- requests and invites ----------
create table if not exists public.game_requests (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  golfer_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('request', 'invite')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  message text check (char_length(message) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, golfer_id)
);
create index if not exists game_requests_golfer_idx on public.game_requests (golfer_id);

drop trigger if exists game_requests_touch on public.game_requests;
create trigger game_requests_touch before update on public.game_requests
  for each row execute function public.touch_updated_at();

alter table public.game_requests enable row level security;

create or replace function public.is_game_host(game uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.games where id = game and host_id = auth.uid());
$$;
revoke execute on function public.is_game_host(uuid) from anon, public;
grant execute on function public.is_game_host(uuid) to authenticated;

-- who's playing is public to signed in golfers; pending and declined ones only to the two involved
drop policy if exists "see line ups and your own requests" on public.game_requests;
create policy "see line ups and your own requests" on public.game_requests
  for select to authenticated using (status = 'accepted' or golfer_id = auth.uid() or public.is_game_host(game_id));

-- no insert, update or delete policies: changes go through the functions below

-- spaces already filled in a game, locking the game so two accepts can't overfill it
create or replace function public.lock_game(game uuid, out g public.games, out taken integer)
language plpgsql security definer set search_path = public as $$
begin
  select * into g from public.games where id = game for update;
  if not found then raise exception 'That game no longer exists'; end if;
  select count(*) into taken from public.game_requests where game_id = game and status = 'accepted';
end $$;
revoke execute on function public.lock_game(uuid) from anon, public, authenticated;

create or replace function public.request_to_join(game uuid, request_id uuid default gen_random_uuid(), note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l record; existing public.game_requests;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into l from public.lock_game(game);
  if (l.g).host_id = me then raise exception 'This is your game'; end if;
  if (l.g).cancelled then raise exception 'This game has been cancelled'; end if;
  if (l.g).tee_time < now() then raise exception 'This game has already been played'; end if;
  select * into existing from public.game_requests where game_id = game and golfer_id = me;
  if found and existing.status in ('pending', 'accepted') then return existing.id; end if;
  if l.taken >= (l.g).spaces_total then raise exception 'This game is full'; end if;
  if existing.id is not null then
    update public.game_requests set kind = 'request', status = 'pending', message = nullif(trim(note), ''), created_at = now()
      where id = existing.id;
    return existing.id;
  end if;
  insert into public.game_requests (id, game_id, golfer_id, kind, message)
    values (coalesce(request_id, gen_random_uuid()), game, me, 'request', nullif(trim(note), ''));
  return (select id from public.game_requests where game_id = game and golfer_id = me);
end $$;
revoke execute on function public.request_to_join(uuid, uuid, text) from anon, public;
grant execute on function public.request_to_join(uuid, uuid, text) to authenticated;

-- hosts can only invite friends
create or replace function public.invite_to_game(game uuid, golfer uuid, request_id uuid default gen_random_uuid()) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l record; existing public.game_requests;
begin
  select * into l from public.lock_game(game);
  if (l.g).host_id is distinct from me then raise exception 'Only the host can invite golfers'; end if;
  if not public.are_friends(me, golfer) then raise exception 'You can only invite friends'; end if;
  if (l.g).cancelled or (l.g).tee_time < now() then raise exception 'This game is no longer open'; end if;
  select * into existing from public.game_requests where game_id = game and golfer_id = golfer;
  if found and existing.status in ('pending', 'accepted') then return existing.id; end if;
  if l.taken >= (l.g).spaces_total then raise exception 'This game is full'; end if;
  if existing.id is not null then
    update public.game_requests set kind = 'invite', status = 'pending', message = null, created_at = now() where id = existing.id;
    return existing.id;
  end if;
  insert into public.game_requests (id, game_id, golfer_id, kind) values (coalesce(request_id, gen_random_uuid()), game, golfer, 'invite');
  return (select id from public.game_requests where game_id = game and golfer_id = golfer);
end $$;
revoke execute on function public.invite_to_game(uuid, uuid, uuid) from anon, public;
grant execute on function public.invite_to_game(uuid, uuid, uuid) to authenticated;

-- The host answers requests, the invited golfer answers invites. Returns the request's new status.
create or replace function public.respond_to_request(request uuid, accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.game_requests; l record;
begin
  select * into r from public.game_requests where id = request;
  if not found then raise exception 'That request no longer exists'; end if;
  select * into l from public.lock_game(r.game_id);
  select * into r from public.game_requests where id = request;
  if r.kind = 'request' and (l.g).host_id is distinct from me then raise exception 'Only the host can answer this'; end if;
  if r.kind = 'invite' and r.golfer_id is distinct from me then raise exception 'Only the invited golfer can answer this'; end if;
  if r.status <> 'pending' then return r.status; end if;
  if not accept then
    update public.game_requests set status = 'declined' where id = request;
    return 'declined';
  end if;
  if (l.g).cancelled then raise exception 'This game has been cancelled'; end if;
  if l.taken >= (l.g).spaces_total then
    update public.game_requests set status = 'declined' where id = request;
    return 'full';
  end if;
  update public.game_requests set status = 'accepted' where id = request;
  -- that was the last space: close off everyone still waiting
  if l.taken + 1 >= (l.g).spaces_total then
    update public.game_requests set status = 'declined' where game_id = r.game_id and status = 'pending';
  end if;
  return 'accepted';
end $$;
revoke execute on function public.respond_to_request(uuid, boolean) from anon, public;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;

-- The golfer withdraws a request or leaves a game; the host withdraws an invite
create or replace function public.withdraw_request(request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.game_requests;
begin
  select * into r from public.game_requests where id = request;
  if not found then return; end if;
  if r.golfer_id = me or (r.kind = 'invite' and r.status = 'pending' and public.is_game_host(r.game_id)) then
    update public.game_requests set status = 'withdrawn' where id = request and status in ('pending', 'accepted');
  else
    raise exception 'You can’t change this request';
  end if;
end $$;
revoke execute on function public.withdraw_request(uuid) from anon, public;
grant execute on function public.withdraw_request(uuid) to authenticated;

-- Undo: the golfer reopens their withdrawn request, or the host reopens one they declined
create or replace function public.restore_request(request uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.game_requests; l record;
begin
  select * into r from public.game_requests where id = request;
  if not found then raise exception 'That request no longer exists'; end if;
  if not ((r.golfer_id = me and r.status = 'withdrawn') or (r.status = 'declined' and public.is_game_host(r.game_id))) then
    return r.status;
  end if;
  select * into l from public.lock_game(r.game_id);
  if (l.g).cancelled or l.taken >= (l.g).spaces_total then return r.status; end if;
  update public.game_requests set status = 'pending' where id = request;
  return 'pending';
end $$;
revoke execute on function public.restore_request(uuid) from anon, public;
grant execute on function public.restore_request(uuid) to authenticated;

create or replace function public.cancel_game(game uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.games set cancelled = true where id = game and host_id = auth.uid();
  if not found then raise exception 'Only the host can cancel this game'; end if;
  update public.game_requests set status = 'declined' where game_id = game and status = 'pending';
end $$;
revoke execute on function public.cancel_game(uuid) from anon, public;
grant execute on function public.cancel_game(uuid) to authenticated;
