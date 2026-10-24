-- PlusFore: @mentions in chats, and hosts removing a player from their game.

-- who a message mentions, so they get a "mentioned you" notification
alter table public.messages add column if not exists mentions uuid[];
alter table public.messages add constraint messages_mentions_check check (mentions is null or cardinality(mentions) <= 12);

-- when the host released a confirmed player's place. The request reads as declined, so every
-- existing rule (chat access, spaces, friends) treats them as no longer playing.
alter table public.game_requests add column if not exists removed_at timestamptz;

-- The host takes a confirmed player out of their game: the space opens again, the player loses
-- the group chat, and they're told their place was released. Only the game's host can do this.
create or replace function public.remove_from_game(request uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.game_requests; l record;
begin
  select * into r from public.game_requests where id = request;
  if not found then raise exception 'That player is no longer in this game'; end if;
  select * into l from public.lock_game(r.game_id);
  if (l.g).host_id is distinct from me then raise exception 'Only the host can remove a player'; end if;
  select * into r from public.game_requests where id = request;
  if r.status <> 'accepted' then return r.status; end if;
  update public.game_requests set status = 'declined', removed_at = now() where id = request;
  return 'removed';
end $$;
revoke execute on function public.remove_from_game(uuid) from anon, public;
grant execute on function public.remove_from_game(uuid) to authenticated;
