-- PlusFore: a photo for each club, where we have one we're allowed to use.
--
-- Photos come from Wikimedia Commons (much of it Geograph Britain and Ireland), under open licences
-- such as CC BY-SA, and must be shown with their credit. Only photos of the golf course or the
-- clubhouse are chosen, and each one has been looked at before it is set. A club's own photos,
-- sent to us with permission, replace these over time.

alter table public.clubs
  add column if not exists photo_url text,
  add column if not exists photo_credit text,
  add column if not exists photo_page text,
  add column if not exists photo_licence text,
  add column if not exists photo_source text;
