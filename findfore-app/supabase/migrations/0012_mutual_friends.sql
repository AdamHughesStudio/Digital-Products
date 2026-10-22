-- PlusFore: the friends you share with another golfer, shown on their profile. It only ever names
-- golfers who are already your own friends, so it reveals nothing about anyone you don't know.

create or replace function public.mutual_friends(other uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when requester = auth.uid() then addressee else requester end as golfer
    from public.friendships
    where status = 'accepted' and auth.uid() in (requester, addressee)
  ),
  theirs as (
    select case when requester = other then addressee else requester end as golfer
    from public.friendships
    where status = 'accepted' and other in (requester, addressee)
  )
  select golfer from mine
  intersect
  select golfer from theirs;
$$;
revoke execute on function public.mutual_friends(uuid) from anon, public;
grant execute on function public.mutual_friends(uuid) to authenticated;
