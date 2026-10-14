-- Creative plan: wedding colours, menu, table layout, cards and vision board.
-- One jsonb column per part, so partners editing different parts at the same
-- time don't overwrite each other. Existing RLS on weddings applies.

alter table public.weddings add column if not exists theme jsonb not null default '{}'::jsonb;
alter table public.weddings add column if not exists menu_plan jsonb not null default '{}'::jsonb;
alter table public.weddings add column if not exists seating_plan jsonb not null default '{}'::jsonb;
alter table public.weddings add column if not exists stationery jsonb not null default '{}'::jsonb;
alter table public.weddings add column if not exists vision_board jsonb not null default '{}'::jsonb;

-- Keep each part a reasonable size (photos are stored as files, not here).
alter table public.weddings drop constraint if exists weddings_planner_size;
alter table public.weddings add constraint weddings_planner_size check (
  pg_column_size(theme) < 20000 and pg_column_size(menu_plan) < 100000 and pg_column_size(seating_plan) < 200000
  and pg_column_size(stationery) < 50000 and pg_column_size(vision_board) < 100000
);

-- PostgREST caches the schema; make the new columns visible right away.
notify pgrst, 'reload schema';
