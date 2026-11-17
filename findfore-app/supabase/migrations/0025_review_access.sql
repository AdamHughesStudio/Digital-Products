-- PlusFore: the App Store and Play Store review account signs in with a fixed code, because the
-- reviewers can't receive our emailed codes. Only a SHA-256 hash of the code is kept, and no one
-- can read this table from the app: row level security is on with no policies, so only the server
-- (api/review-sign-in.js, with the service key) reads it. Change the code by replacing the hash.
create table if not exists public.review_access (
  email text primary key,
  code_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.review_access enable row level security;
-- the row itself is added outside the repo, so the hash isn't published
