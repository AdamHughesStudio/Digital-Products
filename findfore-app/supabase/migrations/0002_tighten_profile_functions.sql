-- Fixes from the Supabase security check after stage 1.
-- The updated_at trigger gets a fixed search path, and only signed in golfers can check usernames
-- (the app only checks after the email code, so nobody signed out needs it).
alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.username_available(text) from anon, public;
grant execute on function public.username_available(text) to authenticated;
