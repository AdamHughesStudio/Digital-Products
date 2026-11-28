-- Draw names as soon as the organiser creates the game, cap the budget at £50,
-- and track who has seen their person. Applied on top of schema.sql.

alter table public.groups add column budget_gbp int not null default 50 check (budget_gbp between 1 and 50);
update public.groups set budget_gbp = least(50, greatest(1, coalesce(nullif(regexp_replace(coalesce(budget, ''), '[^0-9]', '', 'g'), '')::int, 50)));
alter table public.groups drop column budget;
alter table public.members add column seen_at timestamptz;

drop function public.create_group(text, text, text, text, date);
drop function public.join_group(text, text, text);
drop function public.draw_names(text);
drop function public.undo_draw(text);
drop function public.update_details(text, text, date);
drop function public.remove_member(text, uuid);
drop function public.reset_pin(text, uuid);
drop function public.my_santa(text);
drop function public.group_info(text);

create function public._draw(p_group uuid) returns void language plpgsql
set search_path = '' as $$
declare ids uuid[]; n int;
begin
  select array_agg(id order by random()) into ids from public.members where group_id = p_group;
  n := coalesce(array_length(ids, 1), 0);
  if n < 3 then raise exception 'You need at least 3 people for a Secret Santa.' using errcode = 'P0001'; end if;
  delete from public.assignments where group_id = p_group;
  -- one shuffled loop: everyone buys for the next person, so nobody gets themselves
  insert into public.assignments (group_id, giver_id, receiver_id)
    select p_group, ids[i], ids[(i % n) + 1] from generate_series(1, n) i;
  update public.members set seen_at = null where group_id = p_group;
  update public.groups set drawn_at = now() where id = p_group;
end $$;

create function public._check_budget(p int) returns void language plpgsql
set search_path = '' as $$
begin
  if p is null or p < 1 or p > 50 then raise exception 'The budget can be anything up to £50.' using errcode = 'P0001'; end if;
end $$;

revoke execute on function public._draw(uuid), public._check_budget(int) from public, anon, authenticated;

create function public.create_game(p_group_name text, p_your_name text, p_pin text, p_budget int, p_exchange_date date, p_names text[])
returns json language plpgsql security definer set search_path = '' as $$
declare g public.groups; m public.members; c text; me text; nm text; seen text[] := '{}'; others text[] := '{}';
begin
  perform public._check_pin(p_pin);
  perform public._check_budget(p_budget);
  if public._clean(p_group_name) is null then raise exception 'Give your Secret Santa a name.' using errcode = 'P0001'; end if;
  me := public._clean(p_your_name);
  if me is null then raise exception 'Add your name.' using errcode = 'P0001'; end if;
  if char_length(me) > 40 then raise exception 'Names can be up to 40 characters.' using errcode = 'P0001'; end if;
  seen := array[lower(me)];
  foreach nm in array coalesce(p_names, '{}') loop
    nm := public._clean(nm);
    continue when nm is null;
    if char_length(nm) > 40 then raise exception 'Names can be up to 40 characters.' using errcode = 'P0001'; end if;
    if lower(nm) = any(seen) then
      raise exception 'There are two people called %. Add a surname or initial to one of them.', nm using errcode = 'P0001';
    end if;
    seen := seen || lower(nm); others := others || nm;
  end loop;
  if coalesce(array_length(others, 1), 0) < 2 then raise exception 'Add at least 2 other people so there is someone to draw.' using errcode = 'P0001'; end if;
  if array_length(others, 1) > 99 then raise exception 'That is more people than this can handle.' using errcode = 'P0001'; end if;
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') into c from generate_series(1, 6);
    exit when not exists (select 1 from public.groups where code = c);
  end loop;
  insert into public.groups (code, name, budget_gbp, exchange_date)
    values (c, public._clean(p_group_name), p_budget, p_exchange_date) returning * into g;
  insert into public.members (group_id, name, pin_hash, is_organiser)
    values (g.id, me, extensions.crypt(p_pin, extensions.gen_salt('bf')), true) returning * into m;
  insert into public.members (group_id, name) select g.id, x from unnest(others) x;
  perform public._draw(g.id);
  return json_build_object('code', g.code, 'token', public._new_token(m.id));
end $$;

create function public.group_info(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'There is no Secret Santa with that code.' using errcode = 'P0001'; end if;
  return json_build_object(
    'code', g.code, 'name', g.name, 'budget', g.budget_gbp, 'exchange_date', g.exchange_date,
    'members', (select coalesce(json_agg(json_build_object('name', name, 'has_pin', pin_hash is not null) order by is_organiser desc, lower(name)), '[]')
                from public.members where group_id = g.id));
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
    'members', (select coalesce(json_agg(json_build_object(
        'id', x.id, 'name', x.name, 'organiser', x.is_organiser,
        'has_pin', x.pin_hash is not null, 'seen', x.seen_at is not null) order by x.is_organiser desc, lower(x.name)), '[]')
      from public.members x where x.group_id = g.id));
end $$;

create function public.mark_seen(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._me(p_token);
begin
  update public.members set seen_at = coalesce(seen_at, now()) where id = m.id;
end $$;

create function public.add_person(p_token text, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token); nm text := public._clean(p_name);
begin
  if nm is null then raise exception 'Add their name.' using errcode = 'P0001'; end if;
  if char_length(nm) > 40 then raise exception 'Names can be up to 40 characters.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.members where group_id = m.group_id and lower(name) = lower(nm)) then
    raise exception 'Someone called % is already in. Add a surname or initial.', nm using errcode = 'P0001'; end if;
  if (select count(*) from public.members where group_id = m.group_id) >= 100 then raise exception 'This group is full.' using errcode = 'P0001'; end if;
  insert into public.members (group_id, name) values (m.group_id, nm);
  perform public._draw(m.group_id);
  return public.my_santa(p_token);
end $$;

create function public.remove_member(p_token text, p_member uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  if p_member = m.id then raise exception 'You cannot remove yourself as organiser.' using errcode = 'P0001'; end if;
  if (select count(*) from public.members where group_id = m.group_id) <= 3 then
    raise exception 'You need at least 3 people, so add someone before removing anyone.' using errcode = 'P0001'; end if;
  delete from public.members where id = p_member and group_id = m.group_id;
  perform public._draw(m.group_id);
  return public.my_santa(p_token);
end $$;

create function public.update_details(p_token text, p_budget int, p_exchange_date date) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  perform public._check_budget(p_budget);
  update public.groups set budget_gbp = p_budget, exchange_date = p_exchange_date where id = m.group_id;
  return public.my_santa(p_token);
end $$;

create function public.reset_pin(p_token text, p_member uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  update public.members set pin_hash = null, token_hash = null, failed_logins = 0, locked_until = null
    where id = p_member and group_id = m.group_id and id <> m.id;
  return public.my_santa(p_token);
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_game(text, text, text, int, date, text[]), public.group_info(text), public.sign_in(text, text, text),
  public.my_santa(text), public.mark_seen(text), public.add_person(text, text), public.remove_member(text, uuid),
  public.update_details(text, int, date), public.reset_pin(text, uuid) to anon;
