-- FindFore: deleting a chat from your own list.
-- Messages up to cleared_at are hidden for that golfer only, on every device. The others in the
-- chat keep their copy, and a new message brings the chat back with just that message.
alter table public.conversation_reads add column if not exists cleared_at timestamptz;
