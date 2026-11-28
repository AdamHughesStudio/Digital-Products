-- Database-level guarantees for the draw, on top of the draw logic itself:
-- nobody can be given to two Secret Santas, and nobody can buy for themselves.
-- Any draw that broke either rule would be refused and never saved. Applied on top of 004.

alter table public.assignments add constraint assignments_one_giver_per_receiver unique (group_id, receiver_id);
alter table public.assignments add constraint assignments_not_self check (giver_id <> receiver_id);
