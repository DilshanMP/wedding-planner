-- Activity feed: who did what in a wedding, so partners and family can see
-- each other's work. Rows are written by the app after each saved change.

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  -- Always the signed-in account: the default can't be overridden (see policy).
  actor_id uuid default auth.uid() references auth.users (id) on delete set null,
  actor_name text not null default '' check (char_length(actor_name) <= 120),
  kind text not null check (char_length(kind) <= 40),
  summary text not null check (char_length(summary) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists activity_wedding_created_idx on public.activity (wedding_id, created_at desc);

alter table public.activity enable row level security;

drop policy if exists "Members read activity" on public.activity;
create policy "Members read activity" on public.activity
  for select using (public.is_wedding_member(wedding_id));

drop policy if exists "Editors record their own activity" on public.activity;
create policy "Editors record their own activity" on public.activity
  for insert with check (public.can_edit_wedding(wedding_id) and actor_id = auth.uid());

-- No update or delete policies: the feed is append-only for everyone.
grant select, insert on public.activity to authenticated;
