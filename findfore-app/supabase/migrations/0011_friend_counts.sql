-- PlusFore: how many friends each golfer has, shown on profiles in place of a public rating. Each
-- golfer can only read their own friendships, so this hands out the counts alone, never who.

create or replace function public.friend_counts()
returns table (golfer uuid, friends integer)
language sql stable security definer set search_path = public as $$
  select golfer, count(*)::integer
  from (
    select requester as golfer from public.friendships where status = 'accepted'
    union all
    select addressee from public.friendships where status = 'accepted'
  ) f
  group by golfer;
$$;
revoke execute on function public.friend_counts() from anon, public;
grant execute on function public.friend_counts() to authenticated;
