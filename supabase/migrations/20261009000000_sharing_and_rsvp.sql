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
