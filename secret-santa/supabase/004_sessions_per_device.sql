-- Let each person stay signed in on several phones at once. Before this, signing in on a
-- second phone signed the first one out. Applied on top of 003.

create table public.sessions (
  token_hash text primary key,
  member_id  uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index sessions_member on public.sessions (member_id);
alter table public.sessions enable row level security;
revoke all on public.sessions from anon, authenticated;
insert into public.sessions (token_hash, member_id) select token_hash, id from public.members where token_hash is not null;

create or replace function public._new_token(p_member uuid) returns text language plpgsql
set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.sessions (token_hash, member_id) values (public._hash(t), p_member);
  -- keep the 10 most recent phones per person
  delete from public.sessions where member_id = p_member and token_hash not in
    (select token_hash from public.sessions where member_id = p_member order by created_at desc limit 10);
  return t;
end $$;

create or replace function public._me(p_token text) returns public.members language plpgsql
set search_path = '' as $$
declare m public.members;
begin
  select mm.* into m from public.sessions s join public.members mm on mm.id = s.member_id where s.token_hash = public._hash(coalesce(p_token, ''));
  if not found then raise exception 'You have been signed out. Please sign in again.' using errcode = 'P0001'; end if;
  return m;
end $$;

create or replace function public.new_link(p_token text, p_member uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.members := public._organiser(p_token);
begin
  update public.members set invite_key = encode(extensions.gen_random_bytes(10), 'hex')
    where id = p_member and group_id = m.group_id and not is_organiser;
  delete from public.sessions s using public.members x
    where s.member_id = x.id and x.id = p_member and x.group_id = m.group_id and not x.is_organiser;
  return public.my_santa(p_token);
end $$;

alter table public.members drop column token_hash;
revoke execute on function public._new_token(uuid), public._me(text) from public, anon, authenticated;
