-- Wedding OS — initial schema
--
-- Multi-tenant by wedding: a user can own or collaborate on many weddings.
-- Every wedding-scoped table carries wedding_id and is protected by Row Level
-- Security through public.is_wedding_member(). Money is whole LKR (bigint).
-- Category and status vocabularies live in the application catalog
-- (src/lib/domain/catalog.ts) and are enforced here with CHECK constraints.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  plan text not null default 'free' check (plan in ('free', 'premium', 'planner', 'vendor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Weddings and access
-- ---------------------------------------------------------------------------

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bride_name text not null check (char_length(bride_name) between 1 and 120),
  groom_name text not null check (char_length(groom_name) between 1 and 120),
  wedding_date date not null,
  venue text not null default '',
  location text not null default '',
  estimated_guests integer not null default 0 check (estimated_guests >= 0),
  budget bigint not null default 0 check (budget >= 0),
  style text not null default 'traditional',
  priorities text[] not null default '{}',
  must_have text[] not null default '{}',
  nice_to_have text[] not null default '{}',
  avoid_overspending text[] not null default '{}',
  blueprint jsonb not null default '{}'::jsonb,
  pending_attendance_rate numeric(3, 2) not null default 0.75 check (pending_attendance_rate between 0 and 1),
  planner_quotes jsonb not null default '{}'::jsonb,
  day_notes jsonb not null default '[]'::jsonb,
  setup_complete boolean not null default false,
  public_slug text unique,                -- future: public wedding page / online RSVP
  deleted_at timestamptz,                 -- soft delete
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weddings_owner_idx on public.weddings (owner_id) where deleted_at is null;

-- Account-level access: who can open a wedding and with what role.
create table public.wedding_members (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer', 'planner', 'vendor')),
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create index wedding_members_user_idx on public.wedding_members (user_id);

-- Security definer avoids recursive RLS evaluation on wedding_members.
create or replace function public.is_wedding_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = target and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_wedding(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = target and m.user_id = auth.uid()
      and m.role in ('owner', 'editor', 'planner')
  );
$$;

-- The creator of a wedding becomes its owner member.
create or replace function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wedding_members (wedding_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger weddings_add_owner
after insert on public.weddings
for each row execute function public.add_owner_membership();

-- People involved in the wedding (task owners, family, coordinator). These are
-- not necessarily app users.
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  role text not null check (role in ('bride', 'groom', 'bride_family', 'groom_family', 'planner', 'coordinator')),
  phone text not null default '',
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index participants_wedding_idx on public.participants (wedding_id);

-- ---------------------------------------------------------------------------
-- Vendors, budget, quotes, payments
-- ---------------------------------------------------------------------------

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  category_id text not null,
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  location text not null default '',
  status text not null default 'researching'
    check (status in ('researching', 'contacted', 'quoted', 'negotiating', 'booked', 'completed', 'cancelled')),
  rating numeric(2, 1) check (rating between 0 and 5),
  notes text not null default '',
  day_status text not null default 'not_arrived'
    check (day_status in ('not_arrived', 'on_the_way', 'on_site', 'ready', 'delayed', 'done')),
  arrival_time text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vendors_wedding_idx on public.vendors (wedding_id, category_id);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  category_id text not null,
  name text not null,
  planned bigint not null default 0 check (planned >= 0),
  quoted bigint check (quoted >= 0),
  final bigint check (final >= 0),
  vendor_id uuid references public.vendors (id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned', 'quoted', 'negotiating', 'booked', 'partially_paid', 'paid', 'cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budget_items_wedding_idx on public.budget_items (wedding_id, category_id);
create index budget_items_vendor_idx on public.budget_items (vendor_id);

create table public.vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  package_name text not null,
  price bigint not null check (price >= 0),
  additional_charges bigint not null default 0 check (additional_charges >= 0),
  overtime bigint not null default 0 check (overtime >= 0),
  transport bigint not null default 0 check (transport >= 0),
  taxes bigint not null default 0 check (taxes >= 0),
  hours numeric(4, 1),
  deliverables text not null default '',
  features jsonb not null default '{}'::jsonb,
  payment_terms text not null default '',
  review_score numeric(2, 1) check (review_score between 0 and 5),
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vendor_quotes_wedding_idx on public.vendor_quotes (wedding_id);
create index vendor_quotes_vendor_idx on public.vendor_quotes (vendor_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete set null,
  budget_item_id uuid references public.budget_items (id) on delete set null,
  label text not null,
  amount bigint not null check (amount > 0),
  due_date date not null,
  paid_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'paid')),
  method text not null default '',
  reference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_wedding_due_idx on public.payments (wedding_id, status, due_date);
create index payments_vendor_idx on public.payments (vendor_id);
create index payments_budget_item_idx on public.payments (budget_item_id);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null,
  category_id text not null,
  description text not null default '',
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  owner_id uuid references public.participants (id) on delete set null,
  estimated_cost bigint check (estimated_cost >= 0),
  actual_cost bigint check (actual_cost >= 0),
  vendor_id uuid references public.vendors (id) on delete set null,
  notes text not null default '',
  depends_on uuid[] not null default '{}',
  status text not null default 'not_started'
    check (status in ('not_started', 'planning', 'in_progress', 'waiting', 'completed', 'cancelled')),
  completed_at timestamptz,
  template_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_wedding_due_idx on public.tasks (wedding_id, status, due_date);
create index tasks_owner_idx on public.tasks (owner_id);
create index tasks_vendor_idx on public.tasks (vendor_id);

-- ---------------------------------------------------------------------------
-- Guests (a guest row is an invited party; invitation and RSVP live on it)
-- ---------------------------------------------------------------------------

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  side text not null check (side in ('bride', 'groom')),
  relation text not null default 'family' check (relation in ('family', 'friend', 'colleague', 'other')),
  vip boolean not null default false,
  party_type text not null default 'single' check (party_type in ('single', 'couple', 'family', 'group')),
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  invitation text not null default 'not_sent'
    check (invitation in ('not_sent', 'sent', 'delivered', 'opened', 'confirmed')),
  rsvp text not null default 'pending' check (rsvp in ('pending', 'yes', 'no', 'maybe')),
  meal text not null default 'unknown' check (meal in ('unknown', 'veg', 'non_veg', 'mixed')),
  veg_count integer not null default 0 check (veg_count >= 0),
  "table" text not null default '',
  needs_transport boolean not null default false,
  needs_accommodation boolean not null default false,
  notes text not null default '',
  rsvp_token uuid not null default gen_random_uuid() unique, -- future: online RSVP links
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_party_size check (adults + children >= 1)
);
create index guests_wedding_idx on public.guests (wedding_id, side, rsvp);

-- ---------------------------------------------------------------------------
-- Wedding day timeline
-- ---------------------------------------------------------------------------

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  "time" text not null check ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  duration_minutes integer not null default 30 check (duration_minutes between 0 and 1440),
  title text not null,
  location text not null default '',
  description text not null default '',
  vendor_ids uuid[] not null default '{}',
  owner_id uuid references public.participants (id) on delete set null,
  scene text not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index timeline_events_wedding_idx on public.timeline_events (wedding_id, "time");

-- ---------------------------------------------------------------------------
-- Phase 2: documents and notifications
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  kind text not null check (kind in ('contract', 'quotation', 'receipt', 'invoice', 'guest', 'wedding', 'vendor', 'other')),
  title text not null,
  storage_path text not null,           -- path inside the private "documents" bucket: <wedding_id>/<uuid>-<name>
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  notes text not null default '',
  vendor_id uuid references public.vendors (id) on delete set null,
  budget_item_id uuid references public.budget_items (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  uploaded_by uuid default auth.uid() references auth.users (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_wedding_idx on public.documents (wedding_id) where deleted_at is null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null check (kind in ('task_due', 'payment_due', 'rsvp_pending', 'invitation_pending', 'contract_deadline', 'final_confirmation')),
  title text not null,
  body text not null default '',
  href text not null default '',
  due_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['profiles', 'weddings', 'participants', 'vendors', 'budget_items', 'vendor_quotes',
                           'payments', 'tasks', 'guests', 'timeline_events', 'documents']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
                   t || '_touch_updated_at', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;

create policy "profiles: own row" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "weddings: members read" on public.weddings
  for select using (owner_id = auth.uid() or public.is_wedding_member(id));
create policy "weddings: owner creates" on public.weddings
  for insert with check (owner_id = auth.uid());
create policy "weddings: editors update" on public.weddings
  for update using (public.can_edit_wedding(id)) with check (public.can_edit_wedding(id));
create policy "weddings: owner deletes" on public.weddings
  for delete using (owner_id = auth.uid());

create policy "wedding_members: members read" on public.wedding_members
  for select using (public.is_wedding_member(wedding_id));
create policy "wedding_members: owner manages" on public.wedding_members
  for all using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = auth.uid())
  );

-- Every wedding-scoped table: RLS on (written out so dashboards can see it),
-- then members read, editors write.
alter table public.participants enable row level security;
alter table public.vendors enable row level security;
alter table public.budget_items enable row level security;
alter table public.vendor_quotes enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
alter table public.guests enable row level security;
alter table public.timeline_events enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

do $$
declare t text;
begin
  foreach t in array array['participants', 'vendors', 'budget_items', 'vendor_quotes', 'payments', 'tasks',
                           'guests', 'timeline_events', 'documents', 'notifications']
  loop
    execute format('create policy %I on public.%I for select using (public.is_wedding_member(wedding_id))',
                   t || ': members read', t);
    execute format('create policy %I on public.%I for insert with check (public.can_edit_wedding(wedding_id))',
                   t || ': editors insert', t);
    execute format('create policy %I on public.%I for update using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id))',
                   t || ': editors update', t);
    execute format('create policy %I on public.%I for delete using (public.can_edit_wedding(wedding_id))',
                   t || ': editors delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: private documents bucket, scoped by the wedding id prefix
-- (only applied where the Supabase storage schema exists)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
    on conflict (id) do nothing;

    execute $p$
      create policy "documents: members read" on storage.objects for select
      using (bucket_id = 'documents' and public.is_wedding_member(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy "documents: editors write" on storage.objects for insert
      with check (bucket_id = 'documents' and public.can_edit_wedding(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy "documents: editors delete" on storage.objects for delete
      using (bucket_id = 'documents' and public.can_edit_wedding(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end;
$$;
