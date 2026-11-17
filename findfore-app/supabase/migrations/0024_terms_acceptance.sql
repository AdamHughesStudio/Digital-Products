-- PlusFore: a record of each golfer agreeing to the terms of use and privacy policy.
--
-- Apple asks apps with user content to have people agree to the terms before they take part.
-- Sign-up records it straight away; anyone who signed up before this, or before a later change
-- to the terms, is asked once in the app. One row per version agreed, kept with the account.

create table if not exists public.terms_acceptances (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version text not null check (char_length(version) <= 20),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.terms_acceptances enable row level security;
create policy "see your own agreements" on public.terms_acceptances for select to authenticated using (user_id = auth.uid());

create or replace function public.accept_terms(v text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.terms_acceptances (user_id, version) values (auth.uid(), v) on conflict do nothing;
end $$;
revoke execute on function public.accept_terms(text) from anon, public;
grant execute on function public.accept_terms(text) to authenticated;
