-- FindFore, stage 4: push notifications.
-- Each phone's push address is saved against the golfer. When a request, invite, friend request
-- or message is created or answered, the database tells the server (api/notify on Vercel), which
-- looks the event up again with full access, checks the golfer's notification settings and sends
-- the push. The server never trusts what it's told: it re-reads the record, only acts on recent
-- changes, and logs every send so nothing goes out twice.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- the course's name travels with each game, so notifications can say where it is
alter table public.games add column if not exists course_name text check (char_length(course_name) <= 120);

-- ---------- where to send ----------
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "see your own phones" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

-- Save this phone for the signed in golfer. A phone that someone else used before moves over.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_endpoint !~ '^https://' then raise exception 'Not a push address'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth,
    user_agent = excluded.user_agent, updated_at = now();
end $$;
revoke execute on function public.save_push_subscription(text, text, text, text) from anon, public;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.remove_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.remove_push_subscription(text) from anon, public;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- ---------- what each golfer wants to hear about ----------
create table if not exists public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "see your own settings" on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());
create policy "create your own settings" on public.notification_prefs
  for insert to authenticated with check (user_id = auth.uid());
create policy "change your own settings" on public.notification_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- every push sent, so a repeat call never sends twice. Only the server reads or writes it.
create table if not exists public.push_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.push_log enable row level security;

-- the number on the app icon: unread messages, plus requests, invites and friend requests waiting
create or replace function public.badge_count(who uuid) returns integer
language sql stable security definer set search_path = public as $$
  select (
    (select count(*) from public.messages m
      where m.sender_id <> who and m.created_at > now() - interval '30 days'
        and ((m.game_id is not null and public.in_game_chat(m.game_id, who)) or who in (m.dm_low, m.dm_high))
        and m.created_at > coalesce((select r.last_read_at from public.conversation_reads r where r.user_id = who and r.conv = m.conv), '-infinity'))
    + (select count(*) from public.game_requests r join public.games g on g.id = r.game_id
        where r.status = 'pending' and not g.cancelled and g.tee_time > now()
          and ((r.kind = 'request' and g.host_id = who) or (r.kind = 'invite' and r.golfer_id = who)))
    + (select count(*) from public.friendships f where f.addressee = who and f.status = 'pending')
  )::integer;
$$;
revoke execute on function public.badge_count(uuid) from anon, public, authenticated;
grant execute on function public.badge_count(uuid) to service_role;

-- ---------- telling the server ----------
create or replace function public.push_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare ref jsonb;
begin
  -- only which record changed is sent; the server reads the record itself
  if tg_table_name = 'friendships' then
    ref := jsonb_build_object('requester', new.requester, 'addressee', new.addressee);
  else
    ref := jsonb_build_object('id', new.id);
  end if;
  perform net.http_post(
    url := 'https://findfore-app.vercel.app/api/notify',
    body := jsonb_build_object('type', tg_table_name, 'ref', ref),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000
  );
  return new;
end $$;
revoke execute on function public.push_event() from anon, public, authenticated;

create trigger messages_push after insert on public.messages
  for each row execute function public.push_event();
create trigger game_requests_push after insert or update of status on public.game_requests
  for each row execute function public.push_event();
create trigger friendships_push after insert or update of status on public.friendships
  for each row execute function public.push_event();

-- "Your game is tomorrow", every evening at 5pm UK winter time, 6pm summer time
select cron.schedule('findfore-game-reminders', '0 17 * * *', $$
  select net.http_post(
    url := 'https://findfore-app.vercel.app/api/notify',
    body := '{"type": "reminders"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);
