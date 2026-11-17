-- PlusFore: where to send notifications for the iPhone and Android apps.
--
-- Each app install has an Expo push token, sent through Expo's push service (which passes it on to
-- Apple and Google). The web app's subscriptions stay in push_subscriptions. A token that someone
-- else used before moves over to whoever signs in on that phone.

create table if not exists public.push_devices (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_devices_user_idx on public.push_devices (user_id);
alter table public.push_devices enable row level security;
create policy "see your own app installs" on public.push_devices for select to authenticated using (user_id = auth.uid());

create or replace function public.save_push_device(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.push_devices (token, user_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end $$;
revoke execute on function public.save_push_device(text, text) from anon, public;
grant execute on function public.save_push_device(text, text) to authenticated;

create or replace function public.remove_push_device(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_devices where token = p_token and user_id = auth.uid();
$$;
revoke execute on function public.remove_push_device(text) from anon, public;
grant execute on function public.remove_push_device(text) to authenticated;
