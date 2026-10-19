-- FindFore, stage 3: real time messages.
-- Two kinds of conversation: a game's group chat (the host and everyone confirmed) and a direct
-- chat between two friends. Each message carries a conversation key ('game:<id>' or
-- 'dm:<lower id>:<higher id>') so reads and live updates can be matched to it.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id uuid references public.games (id) on delete cascade,
  dm_low uuid references public.profiles (id) on delete cascade,
  dm_high uuid references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  conv text generated always as (
    case when game_id is not null then 'game:' || game_id::text else 'dm:' || dm_low::text || ':' || dm_high::text end
  ) stored,
  -- exactly one kind, and direct chats always store the pair in the same order
  check ((game_id is not null and dm_low is null and dm_high is null) or (game_id is null and dm_low is not null and dm_high is not null and dm_low < dm_high))
);
create index if not exists messages_conv_idx on public.messages (conv, created_at);
create index if not exists messages_game_idx on public.messages (game_id);

-- who is in a game's chat: the host and everyone with a confirmed space
create or replace function public.in_game_chat(game uuid, who uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.games where id = game and host_id = who)
      or exists (select 1 from public.game_requests where game_id = game and golfer_id = who and status = 'accepted');
$$;
revoke execute on function public.in_game_chat(uuid, uuid) from anon, public;
grant execute on function public.in_game_chat(uuid, uuid) to authenticated;

-- whether the signed in golfer belongs to a conversation, by its key
create or replace function public.in_conversation(key text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); parts text[];
begin
  if me is null then return false; end if;
  if key like 'game:%' then
    return public.in_game_chat(substr(key, 6)::uuid, me);
  elsif key like 'dm:%' then
    parts := string_to_array(substr(key, 4), ':');
    return me::text = parts[1] or me::text = parts[2];
  end if;
  return false;
exception when others then
  return false;
end $$;
revoke execute on function public.in_conversation(text) from anon, public;
grant execute on function public.in_conversation(text) to authenticated;

-- direct messages are for friends only
create or replace function public.can_message_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.are_friends(auth.uid(), other);
$$;
revoke execute on function public.can_message_friend(uuid) from anon, public;
grant execute on function public.can_message_friend(uuid) to authenticated;

alter table public.messages enable row level security;

create policy "read your own conversations" on public.messages
  for select to authenticated using (
    (game_id is not null and public.in_game_chat(game_id, auth.uid())) or auth.uid() in (dm_low, dm_high)
  );

-- post as yourself, into a game you're playing in, or to a friend
create policy "post to your own conversations" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and (
      (game_id is not null and public.in_game_chat(game_id, auth.uid()))
      or (game_id is null and auth.uid() in (dm_low, dm_high)
          and public.can_message_friend(case when dm_low = auth.uid() then dm_high else dm_low end))
    )
  );

-- ---------- read receipts ----------
create table if not exists public.conversation_reads (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  conv text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conv)
);
alter table public.conversation_reads enable row level security;

-- everyone in a conversation can see how far the others have read, for "Seen"
create policy "see reads in your conversations" on public.conversation_reads
  for select to authenticated using (public.in_conversation(conv));
create policy "record your own reads" on public.conversation_reads
  for insert to authenticated with check (user_id = auth.uid() and public.in_conversation(conv));
create policy "update your own reads" on public.conversation_reads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- live updates ----------
-- messages arrive instantly; changes to games, requests and friends prompt the app to reload
alter publication supabase_realtime add table public.messages, public.conversation_reads, public.games, public.game_requests, public.friendships;
