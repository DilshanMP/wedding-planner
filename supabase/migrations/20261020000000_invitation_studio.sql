-- EverAfter Studio: animated invitation projects, published invitation links,
-- guest replies and Canva connection details.
-- Safe to run more than once. Only adds things; nothing existing is changed or removed.

-- 1. Invitation projects (drafts and designs) live with the wedding, like the
--    rest of the creative plan.
alter table public.weddings add column if not exists invite_projects jsonb not null default '{}'::jsonb;

-- 2. Published invitations: a frozen copy of a project, opened by its slug.
create table if not exists public.published_invitations (
  slug text primary key check (slug ~ '^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])$'),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  project_id text not null check (char_length(project_id) between 1 and 64),
  is_main boolean not null default false,
  data jsonb not null check (pg_column_size(data) < 2000000),
  views integer not null default 0,
  published_by uuid default auth.uid() references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  unpublished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists published_invitations_wedding_idx on public.published_invitations (wedding_id);
-- One design per wedding is used for the guests' personal links.
create unique index if not exists published_invitations_one_main on public.published_invitations (wedding_id) where is_main;

drop trigger if exists published_invitations_touch_updated_at on public.published_invitations;
create trigger published_invitations_touch_updated_at before update on public.published_invitations
  for each row execute function public.touch_updated_at();

alter table public.published_invitations enable row level security;

drop policy if exists "published_invitations: members read" on public.published_invitations;
create policy "published_invitations: members read" on public.published_invitations
  for select using (public.is_wedding_member(wedding_id));
drop policy if exists "published_invitations: editors add" on public.published_invitations;
create policy "published_invitations: editors add" on public.published_invitations
  for insert with check (public.can_edit_wedding(wedding_id));
drop policy if exists "published_invitations: editors change" on public.published_invitations;
create policy "published_invitations: editors change" on public.published_invitations
  for update using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id));
drop policy if exists "published_invitations: editors remove" on public.published_invitations;
create policy "published_invitations: editors remove" on public.published_invitations
  for delete using (public.can_edit_wedding(wedding_id));

-- 3. Replies from the published invitation page. Guests can only add one
--    through submit_published_rsvp(); only the wedding's members can read them.
create table if not exists public.invitation_rsvps (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.published_invitations (slug) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  attending text not null check (attending in ('yes', 'no', 'maybe')),
  party integer not null default 1 check (party between 0 and 20),
  message text not null default '' check (char_length(message) <= 500),
  contact text not null default '' check (char_length(contact) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists invitation_rsvps_wedding_idx on public.invitation_rsvps (wedding_id, created_at desc);
create index if not exists invitation_rsvps_slug_idx on public.invitation_rsvps (slug, created_at desc);

alter table public.invitation_rsvps enable row level security;

drop policy if exists "invitation_rsvps: members read" on public.invitation_rsvps;
create policy "invitation_rsvps: members read" on public.invitation_rsvps
  for select using (public.is_wedding_member(wedding_id));
drop policy if exists "invitation_rsvps: editors remove" on public.invitation_rsvps;
create policy "invitation_rsvps: editors remove" on public.invitation_rsvps
  for delete using (public.can_edit_wedding(wedding_id));

-- 4. Canva: who connected and when. The OAuth tokens themselves never reach
--    the database or the browser — they stay in an encrypted, http-only cookie
--    handled by the app's server.
create table if not exists public.canva_connections (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  scopes text not null default '' check (char_length(scopes) <= 500),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.canva_connections enable row level security;
drop policy if exists "canva_connections: own row" on public.canva_connections;
create policy "canva_connections: own row" on public.canva_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5. Guest-side functions. They work signed out but reveal nothing beyond the
--    one invitation whose slug the guest already has.
create or replace function public.published_invitation(p_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.published_invitations p
     set views = p.views + 1
   where p.slug = p_slug
     and p.unpublished_at is null
     and exists (select 1 from public.weddings w where w.id = p.wedding_id and w.deleted_at is null)
  returning p.data into result;
  return result;
end;
$$;
revoke all on function public.published_invitation(text) from public;
grant execute on function public.published_invitation(text) to anon, authenticated;

create or replace function public.submit_published_rsvp(
  p_slug text, p_name text, p_attending text, p_party integer, p_message text default '', p_contact text default ''
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  inv public.published_invitations%rowtype;
  max_party integer;
  recent integer;
begin
  if coalesce(btrim(p_name), '') = '' or char_length(btrim(p_name)) > 80 then
    raise exception 'Please write your name.' using errcode = '22023';
  end if;
  if p_attending not in ('yes', 'no', 'maybe') then
    raise exception 'Choose whether you can come.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_message, '')) > 500 or char_length(coalesce(p_contact, '')) > 60 then
    raise exception 'Please keep the message shorter.' using errcode = '22023';
  end if;

  select * into inv from public.published_invitations p
   where p.slug = p_slug and p.unpublished_at is null
     and exists (select 1 from public.weddings w where w.id = p.wedding_id and w.deleted_at is null);
  if not found then
    return false;
  end if;

  max_party := least(20, greatest(1, coalesce((inv.data -> 'content' ->> 'maxParty')::integer, 2)));
  if p_attending = 'yes' and (p_party is null or p_party < 1 or p_party > max_party) then
    raise exception 'This invitation is for up to % people.', max_party using errcode = '22023';
  end if;

  -- A light brake on floods from one link.
  select count(*) into recent from public.invitation_rsvps r
   where r.slug = p_slug and r.created_at > now() - interval '1 minute';
  if recent >= 30 then
    raise exception 'Lots of replies right now — please try again in a minute.' using errcode = '53400';
  end if;

  insert into public.invitation_rsvps (slug, wedding_id, name, attending, party, message, contact)
  values (p_slug, inv.wedding_id, btrim(p_name), p_attending,
          case when p_attending = 'yes' then p_party else 0 end,
          btrim(coalesce(p_message, '')), btrim(coalesce(p_contact, '')));
  return true;
end;
$$;
revoke all on function public.submit_published_rsvp(text, text, text, integer, text, text) from public;
grant execute on function public.submit_published_rsvp(text, text, text, integer, text, text) to anon, authenticated;

-- 6. Guests' personal links (/invite/<token>) show the wedding's main design.
create or replace function public.invitation_lookup(token uuid)
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
    'location', w.location,
    'theme', w.theme,
    'stationery', w.stationery,
    'design', (
      select p.data from public.published_invitations p
       where p.wedding_id = w.id and p.is_main and p.unpublished_at is null
       limit 1
    ),
    'moments', coalesce((
      select json_agg(json_build_object('time', e."time", 'title', e.title, 'scene', e.scene, 'location', e.location) order by e."time")
      from public.timeline_events e
      where e.wedding_id = w.id and e.scene in ('arrival', 'poruwa', 'reception', 'dinner', 'cake', 'entertainment', 'going_away')
    ), '[]'::json)
  )
  from public.guests g
  join public.weddings w on w.id = g.wedding_id
  where g.rsvp_token = token and w.rsvp_enabled and w.deleted_at is null;
$$;
revoke all on function public.invitation_lookup(uuid) from public;
grant execute on function public.invitation_lookup(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
