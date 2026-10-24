-- PlusFore: GIFs in chats. A GIF message carries its picture here and "GIF" as its text, so
-- inbox previews and notifications still read sensibly. Only pictures from KLIPY's own servers
-- are accepted, so a chat can't be used to plant other images (or tracking pixels) on people.
alter table public.messages add column if not exists gif jsonb;
alter table public.messages drop constraint if exists messages_gif_check;
alter table public.messages add constraint messages_gif_check check (
  gif is null or (
    jsonb_typeof(gif) = 'object'
    and gif->>'url' ~ '^https://([a-z0-9-]+\.)*klipy\.com/'
    and char_length(gif->>'url') < 600
    and (gif->'width') is not null and (gif->'height') is not null
  )
);
