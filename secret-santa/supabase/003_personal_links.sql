-- Personal links: each person gets a private link that signs them in, nobody sees the
-- family's names, and name + PIN sign-in is for the organiser only. Applied on top of 002.

alter table public.members add column invite_key text unique;
alter table public.members add column opened_at timestamptz;
update public.members set invite_key = encode(extensions.gen_random_bytes(10), 'hex') where invite_key is null;
update public.members set opened_at = coalesce(seen_at, created_at) where pin_hash is not null and not is_organiser;
alter table public.members alter column invite_key set default encode(extensions.gen_random_bytes(10), 'hex');
alter table public.members alter column invite_key set not null;

drop function public.reset_pin(text, uuid);
drop function public.group_info(text);
drop function public.my_santa(text);

-- Someone holding only the code learns the game's name and nothing else.
create function public.group_info(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'There is no Secret Santa with that code.' using errcode = 'P0001'; end if;
  return json_build_object('code', g.code, 'name', g.name);
end $$;

-- A personal link signs that one person in. The organiser signs in with their PIN instead.
create function public.open_invite(p_key text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members; g public.groups;
begin
  select * into m from public.members where invite_key = lower(trim(coalesce(p_key, '')));
  if not found then raise exception 'This link is not working. It may have been replaced, so ask the organiser to send you a new one.' using errcode = 'P0001'; end if;
  if m.is_organiser then raise exception 'This is the organiser''s link. Sign in with the game code and your PIN.' using errcode = 'P0001'; end if;
  update public.members set opened_at = coalesce(opened_at, now()) where id = m.id;
  select * into g from public.groups where id = m.group_id;
  return json_build_object('code', g.code, 'token', public._new_token(m.id));
end $$;

-- Name and PIN sign-in is now for the organiser only, so nobody can claim someone else's name.
create or replace function public.sign_in(p_code text, p_name text, p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
declare g public.groups; m public.members;
begin
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'There is no Secret Santa with that code.' using errcode = 'P0001'; end if;
  select * into m from public.members where group_id = g.id and is_organiser and lower(name) = lower(public._clean(p_name));
  if not found or m.pin_hash is null then
    raise exception 'That name and PIN don''t match the organiser of this game.' using errcode = 'P0001';
  end if;
  if m.locked_until > now() then raise exception 'Too many wrong PINs. Try again in 15 minutes.' using errcode = 'P0001'; end if;
  if m.pin_hash <> extensions.crypt(coalesce(p_pin, ''), m.pin_hash) then
    update public.members set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 8 then now() + interval '15 minutes' end
      where id = m.id;
    return json_build_object('error', 'That name and PIN don''t match the organiser of this game.');
  end if;
  update public.members set failed_logins = 0, locked_until = null where id = m.id;
  return json_build_object('code', g.code, 'token', public._new_token(m.id));
end $$;

create function public.my_santa(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._me(p_token); g public.groups; r text;
begin
  select * into g from public.groups where id = m.group_id;
  select rm.name into r from public.assignments a join public.members rm on rm.id = a.receiver_id where a.giver_id = m.id;
  return json_build_object(
    'code', g.code, 'name', g.name, 'budget', g.budget_gbp, 'exchange_date', g.exchange_date,
    'me', m.name, 'is_organiser', m.is_organiser, 'recipient', r,
    -- only the organiser gets the list, with each person's link and progress
    'members', case when m.is_organiser then (select coalesce(json_agg(json_build_object(
        'id', x.id, 'name', x.name, 'organiser', x.is_organiser,
        'invite', case when x.is_organiser then null else x.invite_key end,
        'opened', x.opened_at is not null, 'seen', x.seen_at is not null) order by x.is_organiser desc, lower(x.name)), '[]')
      from public.members x where x.group_id = g.id) else null end,
    'count', (select count(*) from public.members x where x.group_id = g.id));
end $$;

create function public.new_link(p_token text, p_member uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  update public.members set invite_key = encode(extensions.gen_random_bytes(10), 'hex'), token_hash = null
    where id = p_member and group_id = m.group_id and not is_organiser;
  return public.my_santa(p_token);
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_game(text, text, text, int, date, text[]), public.group_info(text), public.sign_in(text, text, text),
  public.open_invite(text), public.my_santa(text), public.mark_seen(text), public.add_person(text, text), public.remove_member(text, uuid),
  public.update_details(text, int, date), public.new_link(text, uuid) to anon;
