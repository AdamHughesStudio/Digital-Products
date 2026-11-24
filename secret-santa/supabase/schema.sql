-- Secret Santa schema.
-- The tables are not readable or writable by the public API at all.
-- Every action goes through a SECURITY DEFINER function below, so the
-- browser can only ever learn its own match.

create extension if not exists pgcrypto with schema extensions;

create table groups (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null check (char_length(name) between 1 and 60),
  budget        text check (char_length(budget) <= 40),
  exchange_date date,
  drawn_at      timestamptz,
  created_at    timestamptz not null default now()
);

create table members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  pin_hash      text,
  token_hash    text unique,
  is_organiser  boolean not null default false,
  failed_logins int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);
create unique index members_group_name on members (group_id, lower(name));

create table assignments (
  group_id    uuid not null references groups(id) on delete cascade,
  giver_id    uuid not null references members(id) on delete cascade,
  receiver_id uuid not null references members(id) on delete cascade,
  primary key (group_id, giver_id)
);

alter table groups enable row level security;
alter table members enable row level security;
alter table assignments enable row level security;
revoke all on groups, members, assignments from anon, authenticated;

-- Helpers (not exposed) ------------------------------------------------

create function _hash(t text) returns text language sql immutable
set search_path = '' as $$
  select encode(extensions.digest(t, 'sha256'), 'hex')
$$;

create function _new_token(p_member uuid) returns text language plpgsql
set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  update public.members set token_hash = public._hash(t) where id = p_member;
  return t;
end $$;

create function _me(p_token text) returns public.members language plpgsql
set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where token_hash = public._hash(p_token);
  if not found then raise exception 'You have been signed out. Please sign in again.' using errcode = 'P0001'; end if;
  return m;
end $$;

create function _organiser(p_token text) returns public.members language plpgsql
set search_path = '' as $$
declare m public.members := public._me(p_token);
begin
  if not m.is_organiser then raise exception 'Only the organiser can do that.' using errcode = 'P0001'; end if;
  return m;
end $$;

create function _clean(t text) returns text language sql immutable
set search_path = '' as $$ select nullif(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'), '') $$;

create function _check_pin(p text) returns void language plpgsql
set search_path = '' as $$
begin
  if p is null or p !~ '^[0-9]{4,8}$' then
    raise exception 'Your PIN must be 4 to 8 digits.' using errcode = 'P0001';
  end if;
end $$;

revoke execute on function _hash(text), _new_token(uuid), _me(text), _organiser(text), _clean(text), _check_pin(text) from public, anon, authenticated;

-- Public functions -------------------------------------------------------

create function create_group(p_group_name text, p_your_name text, p_pin text, p_budget text, p_exchange_date date)
returns json language plpgsql security definer set search_path = '' as $$
declare g public.groups; m public.members; c text;
begin
  perform public._check_pin(p_pin);
  if public._clean(p_group_name) is null then raise exception 'Give your Secret Santa a name.' using errcode = 'P0001'; end if;
  if public._clean(p_your_name) is null then raise exception 'Add your name.' using errcode = 'P0001'; end if;
  loop
    -- 6 characters with no lookalikes (no 0/O, 1/I/L)
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
      into c from generate_series(1, 6);
    exit when not exists (select 1 from public.groups where code = c);
  end loop;
  insert into public.groups (code, name, budget, exchange_date)
    values (c, public._clean(p_group_name), public._clean(p_budget), p_exchange_date) returning * into g;
  insert into public.members (group_id, name, pin_hash, is_organiser)
    values (g.id, public._clean(p_your_name), extensions.crypt(p_pin, extensions.gen_salt('bf')), true) returning * into m;
  return json_build_object('code', g.code, 'token', public._new_token(m.id));
end $$;

create function group_info(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'There is no Secret Santa with that code.' using errcode = 'P0001'; end if;
  return json_build_object(
    'code', g.code, 'name', g.name, 'budget', g.budget, 'exchange_date', g.exchange_date,
    'drawn', g.drawn_at is not null,
    'members', (select coalesce(json_agg(name order by created_at), '[]') from public.members where group_id = g.id));
end $$;

create function join_group(p_code text, p_name text, p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
declare g public.groups; m public.members;
begin
  perform public._check_pin(p_pin);
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'There is no Secret Santa with that code.' using errcode = 'P0001'; end if;
  if g.drawn_at is not null then raise exception 'Names have already been drawn. Ask the organiser to redo the draw if you need adding.' using errcode = 'P0001'; end if;
  if public._clean(p_name) is null then raise exception 'Add your name.' using errcode = 'P0001'; end if;
  if (select count(*) from public.members where group_id = g.id) >= 100 then raise exception 'This group is full.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.members where group_id = g.id and lower(name) = lower(public._clean(p_name))) then
    raise exception 'Someone called % has already joined. If that is you, sign in instead, or add your surname.', public._clean(p_name) using errcode = 'P0001';
  end if;
  insert into public.members (group_id, name, pin_hash)
    values (g.id, public._clean(p_name), extensions.crypt(p_pin, extensions.gen_salt('bf'))) returning * into m;
  return json_build_object('code', g.code, 'token', public._new_token(m.id));
end $$;

create function sign_in(p_code text, p_name text, p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
declare g public.groups; m public.members;
begin
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'There is no Secret Santa with that code.' using errcode = 'P0001'; end if;
  select * into m from public.members where group_id = g.id and lower(name) = lower(public._clean(p_name));
  if not found then raise exception 'Nobody called % has joined yet. Check the spelling, or join instead.', coalesce(public._clean(p_name), 'that') using errcode = 'P0001'; end if;
  if m.locked_until > now() then raise exception 'Too many wrong PINs. Try again in 15 minutes, or ask the organiser to reset your PIN.' using errcode = 'P0001'; end if;
  if m.pin_hash is null then
    -- the organiser reset this PIN, so the person sets a new one now
    perform public._check_pin(p_pin);
    update public.members set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')), failed_logins = 0, locked_until = null where id = m.id;
  elsif m.pin_hash <> extensions.crypt(coalesce(p_pin, ''), m.pin_hash) then
    update public.members set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 8 then now() + interval '15 minutes' end
      where id = m.id;
    return json_build_object('error', 'That PIN is not right.');
  else
    update public.members set failed_logins = 0, locked_until = null where id = m.id;
  end if;
  return json_build_object('code', g.code, 'token', public._new_token(m.id));
end $$;

create function my_santa(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._me(p_token); g public.groups; r text;
begin
  select * into g from public.groups where id = m.group_id;
  select rm.name into r from public.assignments a join public.members rm on rm.id = a.receiver_id where a.giver_id = m.id;
  return json_build_object(
    'code', g.code, 'name', g.name, 'budget', g.budget, 'exchange_date', g.exchange_date,
    'drawn', g.drawn_at is not null, 'me', m.name, 'is_organiser', m.is_organiser,
    'recipient', r,
    'members', (select coalesce(json_agg(json_build_object(
        'id', x.id, 'name', x.name, 'organiser', x.is_organiser,
        'needs_pin', x.pin_hash is null) order by x.created_at), '[]')
      from public.members x where x.group_id = g.id));
end $$;

create function draw_names(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token); ids uuid[]; n int;
begin
  select array_agg(id order by random()) into ids from public.members where group_id = m.group_id;
  n := coalesce(array_length(ids, 1), 0);
  if n < 3 then raise exception 'You need at least 3 people to draw names.' using errcode = 'P0001'; end if;
  delete from public.assignments where group_id = m.group_id;
  -- one shuffled loop: everyone buys for the next person, so nobody gets themselves
  insert into public.assignments (group_id, giver_id, receiver_id)
    select m.group_id, ids[i], ids[(i % n) + 1] from generate_series(1, n) i;
  update public.groups set drawn_at = now() where id = m.group_id;
  return public.my_santa(p_token);
end $$;

create function undo_draw(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  delete from public.assignments where group_id = m.group_id;
  update public.groups set drawn_at = null where id = m.group_id;
  return public.my_santa(p_token);
end $$;

create function update_details(p_token text, p_budget text, p_exchange_date date) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  update public.groups set budget = public._clean(p_budget), exchange_date = p_exchange_date where id = m.group_id;
  return public.my_santa(p_token);
end $$;

create function remove_member(p_token text, p_member uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  if p_member = m.id then raise exception 'You cannot remove yourself as organiser.' using errcode = 'P0001'; end if;
  if (select drawn_at from public.groups where id = m.group_id) is not null then
    raise exception 'Undo the draw before removing anyone, then draw again.' using errcode = 'P0001'; end if;
  delete from public.members where id = p_member and group_id = m.group_id;
  return public.my_santa(p_token);
end $$;

create function reset_pin(p_token text, p_member uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  update public.members set pin_hash = null, token_hash = null, failed_logins = 0, locked_until = null
    where id = p_member and group_id = m.group_id and id <> m.id;
  return public.my_santa(p_token);
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function create_group(text, text, text, text, date), group_info(text), join_group(text, text, text),
  sign_in(text, text, text), my_santa(text), draw_names(text), undo_draw(text), update_details(text, text, date),
  remove_member(text, uuid), reset_pin(text, uuid) to anon;
