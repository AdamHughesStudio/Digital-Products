-- PlusFore: replying to a particular message, as in WhatsApp.

-- the message being answered. If it goes, the reply stays and simply loses its quote.
alter table public.messages add column if not exists reply_to uuid references public.messages (id) on delete set null;
create index if not exists messages_reply_to_idx on public.messages (reply_to) where reply_to is not null;

-- A reply can only quote a message from the same conversation, so nobody can pull a message from a
-- chat they're not in into one they are. Runs as the owner, as the quoted row may not be visible yet.
create or replace function public.check_reply_to() returns trigger
language plpgsql security definer set search_path = public as $$
declare q public.messages;
begin
  if new.reply_to is null then return new; end if;
  select * into q from public.messages where id = new.reply_to;
  if not found
     or q.game_id is distinct from new.game_id
     or q.dm_low is distinct from new.dm_low
     or q.dm_high is distinct from new.dm_high then
    raise exception 'You can only reply to a message in this chat';
  end if;
  return new;
end $$;
revoke execute on function public.check_reply_to() from anon, authenticated, public;

create or replace trigger messages_reply_to before insert or update of reply_to on public.messages
  for each row execute function public.check_reply_to();
