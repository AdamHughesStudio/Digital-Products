-- PlusFore: reactions on messages, as in WhatsApp. One reaction per golfer per message; picking
-- another swaps it. Taking a reaction off sets it to null rather than deleting the row, so the
-- change reaches the others live through the same row level security as everything else (live
-- deletes skip those checks).

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text check (emoji is null or char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;

-- anyone who can see the message can see its reactions (the messages check runs as the reader)
create policy "see reactions in your conversations" on public.message_reactions
  for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id));
create policy "react as yourself" on public.message_reactions
  for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id));
create policy "change your own reaction" on public.message_reactions
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id));

alter publication supabase_realtime add table public.message_reactions;
