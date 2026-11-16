-- PlusFore: competitions a club has paid to highlight on Home.
--
-- A competition is promoted while promoted_until is in the future, so a paid slot ends by itself
-- with no clean up. promoted_by notes who arranged it, for our own records. Anyone can read these
-- columns with the rest of the listing; only the service role and admins change them.

alter table public.competitions
  add column if not exists promoted_until timestamptz,
  add column if not exists promoted_by text;

create index if not exists competitions_promoted_until_idx
  on public.competitions (promoted_until)
  where promoted_until is not null;
