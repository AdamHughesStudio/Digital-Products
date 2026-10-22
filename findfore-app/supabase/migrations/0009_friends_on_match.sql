-- Being accepted into someone's game is the match: the host and the golfer become friends, so they
-- can message and invite each other. Either can remove the friend or block later, like unmatching.

-- where a friendship came from: a request one of them sent, or a game match. Game matches don't send
-- their own "now friends" alert, because the golfer's "You're in" alert already says so.
alter table public.friendships add column if not exists source text not null default 'request'
  check (source in ('request', 'game'));

create or replace function public.respond_to_request(request uuid, accept boolean)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  if l.taken + 1 >= (l.g).spaces_total then
    update public.game_requests set status = 'declined' where game_id = r.game_id and status = 'pending';
  end if;
  -- the match: host and golfer become friends (a pending request between them is completed too)
  insert into public.friendships (requester, addressee, status, responded_at, source)
  values (r.golfer_id, (l.g).host_id, 'accepted', now(), 'game')
  on conflict ((least(requester, addressee)), (greatest(requester, addressee)))
  do update set status = 'accepted', responded_at = coalesce(public.friendships.responded_at, now()), source = 'game'
  where public.friendships.status <> 'accepted';
  return 'accepted';
end $function$;
