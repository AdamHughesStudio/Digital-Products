-- PlusFore: blocks and reports that work across accounts, not just on one phone.
--
-- Blocking someone ends any friendship between you, so messages and game invites stop (both
-- need you to be friends), and neither of you can send the other a friend request or ask to join
-- the other's games while the block stands. The person blocked isn't told.
--
-- Reports reach PlusFore: each is stored with who reported whom and why, admins are notified, and
-- the admin screen lists open reports to act on.

create table if not exists public.blocks (
  blocker uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "see who you've blocked" on public.blocks for select to authenticated using (blocker = auth.uid());

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke execute on function public.is_blocked(uuid, uuid) from anon, public, authenticated;

create or replace function public.block_golfer(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  if target = me then raise exception 'That’s you'; end if;
  insert into public.blocks (blocker, blocked) values (me, target) on conflict do nothing;
  delete from public.friendships where (requester = me and addressee = target) or (requester = target and addressee = me);
  -- any open request or invite between you is closed
  update public.game_requests r set status = 'withdrawn'
    from public.games g
    where g.id = r.game_id and r.status = 'pending'
      and ((g.host_id = me and r.golfer_id = target) or (g.host_id = target and r.golfer_id = me));
end $$;
revoke execute on function public.block_golfer(uuid) from anon, public;
grant execute on function public.block_golfer(uuid) to authenticated;

create or replace function public.unblock_golfer(target uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.blocks where blocker = auth.uid() and blocked = target;
$$;
revoke execute on function public.unblock_golfer(uuid) from anon, public;
grant execute on function public.unblock_golfer(uuid) to authenticated;

-- no friend requests either way while a block stands
create or replace function public.send_friend_request(target uuid, note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  if target = me then raise exception 'That’s you'; end if;
  if public.is_blocked(me, target) then raise exception 'You can’t add this golfer'; end if;
  update public.friendships set status = 'accepted', responded_at = now()
    where requester = target and addressee = me and status = 'pending';
  if found then return 'accepted'; end if;
  if exists (select 1 from public.friendships where least(requester, addressee) = least(me, target) and greatest(requester, addressee) = greatest(me, target)) then
    return 'exists';
  end if;
  insert into public.friendships (requester, addressee, note) values (me, target, nullif(trim(note), ''));
  return 'sent';
end $$;

-- no asking to join the game of someone who has blocked you, or whom you have blocked
create or replace function public.request_to_join(game uuid, request_id uuid default gen_random_uuid(), note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l record; existing public.game_requests;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into l from public.lock_game(game);
  if (l.g).host_id = me then raise exception 'This is your game'; end if;
  if public.is_blocked(me, (l.g).host_id) then raise exception 'You can’t join this game'; end if;
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

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid default auth.uid() references public.profiles (id) on delete set null,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('no_show', 'inappropriate', 'spam', 'misuse', 'other')),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution text check (char_length(resolution) <= 500)
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
create policy "report other golfers" on public.reports for insert to authenticated with check (reporter = auth.uid() and reported <> auth.uid());
create policy "admins see reports" on public.reports for select to authenticated using (public.is_admin());
create policy "admins resolve reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- tell admins about a new report straight away
create trigger reports_push after insert on public.reports
  for each row execute function public.push_event();
