-- Wedding OS — complete database setup for a new Supabase project.
-- Paste this whole file into Supabase → SQL Editor → New query, and Run once.
-- Generated from supabase/migrations (same content, in order).

-- ===== 20261008000000_initial_schema.sql =====
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

-- Every wedding-scoped table: members read, editors write.
do $$
declare t text;
begin
  foreach t in array array['participants', 'vendors', 'budget_items', 'vendor_quotes', 'payments', 'tasks',
                           'guests', 'timeline_events', 'documents', 'notifications']
  loop
    execute format('alter table public.%I enable row level security', t);
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

-- ===== 20261009000000_sharing_and_rsvp.sql =====
-- Wedding OS — family sharing and online RSVP
--
-- Sharing: the owner invites people by email. If they already have an
-- account they join immediately; otherwise the invitation waits until they
-- sign in and call claim_invites().
--
-- RSVP: every guest row has a secret rsvp_token. When the couple turns RSVP
-- on, anyone holding a token can read that one invitation and answer it
-- through two narrow security-definer functions. Nothing else is exposed to
-- anonymous visitors.

alter table public.weddings add column if not exists rsvp_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- Invitations to collaborate
-- ---------------------------------------------------------------------------

create table public.wedding_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%'),
  role text not null default 'editor' check (role in ('editor', 'viewer', 'planner')),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (wedding_id, email)
);
create index wedding_invites_email_idx on public.wedding_invites (email) where accepted_at is null;

alter table public.wedding_invites enable row level security;

create policy "wedding_invites: members read" on public.wedding_invites
  for select using (public.is_wedding_member(wedding_id));
create policy "wedding_invites: owner manages" on public.wedding_invites
  for all using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = auth.uid())
  );

-- Invite by email. Joins immediately when the account exists.
create or replace function public.invite_to_wedding(target uuid, invitee_email text, invitee_role text default 'editor')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(invitee_email));
  existing uuid;
begin
  if not exists (select 1 from public.weddings w where w.id = target and w.owner_id = auth.uid()) then
    raise exception 'Only the wedding owner can invite people.' using errcode = '42501';
  end if;
  if invitee_role not in ('editor', 'viewer', 'planner') then
    raise exception 'Unknown role %', invitee_role using errcode = '22023';
  end if;

  select u.id into existing from auth.users u where lower(u.email) = normalized;
  if existing is not null then
    insert into public.wedding_members (wedding_id, user_id, role, invited_by)
    values (target, existing, invitee_role, auth.uid())
    on conflict (wedding_id, user_id) do update set role = excluded.role;
    insert into public.wedding_invites (wedding_id, email, role, accepted_at)
    values (target, normalized, invitee_role, now())
    on conflict (wedding_id, email) do update set role = excluded.role, accepted_at = now();
    return 'added';
  end if;

  insert into public.wedding_invites (wedding_id, email, role)
  values (target, normalized, invitee_role)
  on conflict (wedding_id, email) do update set role = excluded.role, accepted_at = null;
  return 'pending';
end;
$$;

-- Called after sign-in: turns pending invitations for this email into memberships.
create or replace function public.claim_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  my_email text;
  claimed integer;
begin
  select lower(u.email) into my_email from auth.users u where u.id = auth.uid();
  if my_email is null then
    return 0;
  end if;
  insert into public.wedding_members (wedding_id, user_id, role, invited_by)
  select i.wedding_id, auth.uid(), i.role, i.invited_by
  from public.wedding_invites i
  where i.email = my_email and i.accepted_at is null
  on conflict (wedding_id, user_id) do nothing;
  get diagnostics claimed = row_count;
  update public.wedding_invites set accepted_at = now() where email = my_email and accepted_at is null;
  return claimed;
end;
$$;

-- Members with their emails, for the sharing screen. Members only.
create or replace function public.list_wedding_members(target uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.wedding_members m
  join auth.users u on u.id = m.user_id
  where m.wedding_id = target and public.is_wedding_member(target)
  order by m.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Online RSVP
-- ---------------------------------------------------------------------------

create or replace function public.rsvp_lookup(token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'guestName', g.name,
    'adults', g.adults,
    'children', g.children,
    'rsvp', g.rsvp,
    'meal', g.meal,
    'brideName', w.bride_name,
    'groomName', w.groom_name,
    'weddingDate', w.wedding_date,
    'venue', w.venue,
    'location', w.location
  )
  from public.guests g
  join public.weddings w on w.id = g.wedding_id
  where g.rsvp_token = token and w.rsvp_enabled and w.deleted_at is null;
$$;

create or replace function public.rsvp_submit(token uuid, response text, meal_choice text, attending integer, message text default '')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.guests%rowtype;
begin
  if response not in ('yes', 'no', 'maybe') then
    raise exception 'Choose yes, no or maybe.' using errcode = '22023';
  end if;
  if meal_choice not in ('unknown', 'veg', 'non_veg', 'mixed') then
    raise exception 'Unknown meal choice.' using errcode = '22023';
  end if;

  select g.* into target
  from public.guests g
  join public.weddings w on w.id = g.wedding_id
  where g.rsvp_token = token and w.rsvp_enabled and w.deleted_at is null
  for update of g;
  if not found then
    return false;
  end if;
  if attending is not null and (attending < 0 or attending > target.adults + target.children) then
    raise exception 'That is more people than this invitation covers.' using errcode = '22023';
  end if;

  update public.guests set
    rsvp = response,
    meal = meal_choice,
    invitation = 'confirmed',
    -- A partial "yes" (fewer people than invited) is recorded on the adults count.
    adults = case when response = 'yes' and attending is not null and attending < target.adults + target.children
                  then greatest(attending - least(target.children, attending), 0) else target.adults end,
    children = case when response = 'yes' and attending is not null and attending < target.adults + target.children
                    then least(target.children, attending) else target.children end,
    notes = case when coalesce(trim(message), '') = '' then target.notes
                 else trim(both from target.notes || E'\n' || 'RSVP note: ' || left(trim(message), 500)) end
  where id = target.id;
  return true;
end;
$$;

revoke all on function public.rsvp_lookup(uuid) from public;
revoke all on function public.rsvp_submit(uuid, text, text, integer, text) from public;
grant execute on function public.rsvp_lookup(uuid) to anon, authenticated;
grant execute on function public.rsvp_submit(uuid, text, text, integer, text) to anon, authenticated;
grant execute on function public.invite_to_wedding(uuid, text, text) to authenticated;
grant execute on function public.claim_invites() to authenticated;
grant execute on function public.list_wedding_members(uuid) to authenticated;

