-- Clubs with more than one course, e.g. Hilton Park (Hilton and Allander).
-- The course list is ours: written up by FindFore, never edited by golfers. Golfers can only suggest.

alter table public.clubs add column if not exists layouts jsonb
  check (layouts is null or jsonb_typeof(layouts) = 'array');
comment on column public.clubs.layouts is 'Curated list of the club''s courses: [{"name": "Allander Course", "holes": 18}]. Null means one course.';

-- The course within the club a game is on. games.course_name carries the full label for notifications,
-- e.g. "Hilton Park · Allander Course".
alter table public.games add column if not exists layout text check (char_length(layout) <= 60);

-- "Don't see your course?" Golfers suggest, we review. Nothing here shows in the app.
create table if not exists public.course_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  club_id text,
  club_name text not null check (char_length(club_name) between 2 and 120),
  course_name text check (char_length(course_name) <= 80),
  town text check (char_length(town) <= 80),
  note text check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'added', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.course_submissions enable row level security;

create policy "golfers suggest courses" on public.course_submissions
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "golfers see their own suggestions" on public.course_submissions
  for select to authenticated
  using (user_id = auth.uid());

-- at most 10 suggestions a day each, so the review queue stays sane
create or replace function public.limit_course_submissions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from course_submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many suggestions today' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.limit_course_submissions() from public, anon, authenticated;
create trigger course_submissions_limit before insert on public.course_submissions
  for each row execute function public.limit_course_submissions();

-- To review suggestions: select * from course_submissions where status = 'pending' order by created_at;
-- To add courses to a club:  update clubs set layouts = '[{"name":"Hilton Course","holes":18},{"name":"Allander Course","holes":18}]' where id = 'osm-w87148149';
