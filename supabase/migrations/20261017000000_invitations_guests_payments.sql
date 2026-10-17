-- Guest groups, who paid, and the public digital invitation.
-- Safe to run more than once. Nothing existing is changed or removed.

-- Guests can be on the bride's side, the groom's side, or both (crew, brand team…).
alter table public.guests drop constraint if exists guests_side_check;
alter table public.guests add constraint guests_side_check check (side in ('bride', 'groom', 'both'));
alter table public.guests add column if not exists category text not null default '';
alter table public.guests drop constraint if exists guests_category_length;
alter table public.guests add constraint guests_category_length check (char_length(category) <= 60);

-- Who paid each payment (Groom, Bride, Bride's family…).
alter table public.payments add column if not exists paid_by text not null default '';
alter table public.payments drop constraint if exists payments_paid_by_length;
alter table public.payments add constraint payments_paid_by_length check (char_length(paid_by) <= 60);

-- The invitation design reads the couple's colours and card wording
-- (added by 20261014000000_planner.sql; repeated here so this file works alone).
alter table public.weddings add column if not exists theme jsonb not null default '{}'::jsonb;
alter table public.weddings add column if not exists stationery jsonb not null default '{}'::jsonb;

-- One guest's invitation, by their secret link. Exposes only what the
-- invitation shows: names, date, venue, the day's key moments, colours and
-- card wording — never other guests, money or contacts.
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

-- Mark that a guest opened their animated invitation (shown to the couple as "Opened").
create or replace function public.invitation_opened(token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.guests g set invitation = 'opened'
  from public.weddings w
  where g.rsvp_token = token and w.id = g.wedding_id and w.rsvp_enabled and w.deleted_at is null
    and g.invitation in ('not_sent', 'sent', 'delivered');
$$;
revoke all on function public.invitation_opened(uuid) from public;
grant execute on function public.invitation_opened(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
