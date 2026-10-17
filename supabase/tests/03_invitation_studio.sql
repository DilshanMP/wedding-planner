-- EverAfter Studio security test. Run after setup.sql (or the migrations).
-- Every check raises an exception when it fails, so a clean run is a pass.
begin;
insert into auth.users values ('a1111111-1111-1111-1111-111111111111', 'couple@example.com'), ('b2222222-2222-2222-2222-222222222222', 'stranger@example.com')
  on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', true);
insert into public.weddings (id, bride_name, groom_name, wedding_date, rsvp_enabled) values ('cccccccc-0000-0000-0000-000000000001', 'Sachini', 'Dilshan', '2027-05-27', true);
insert into public.published_invitations (slug, wedding_id, project_id, is_main, data)
values ('sachini-and-dilshan-ab12', 'cccccccc-0000-0000-0000-000000000001', 'p1', true, '{"version":1,"content":{"brideName":"Sachini","maxParty":3},"design":{}}');
update public.weddings set invite_projects = '{"projects":[],"mainId":null}' where id = 'cccccccc-0000-0000-0000-000000000001';

-- A stranger can't see, change or add invitations for this wedding.
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', true);
do $$ begin
  if (select count(*) from public.published_invitations) <> 0 then raise exception 'FAIL: stranger can read invitations'; end if;
  update public.published_invitations set views = 999;
  begin
    insert into public.published_invitations (slug, wedding_id, project_id, data) values ('evil-link-01', 'cccccccc-0000-0000-0000-000000000001', 'x', '{}');
    raise exception 'FAIL: stranger inserted an invitation';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Guests (anon) open by slug and reply, but can't list anything.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare d jsonb;
begin
  d := public.published_invitation('sachini-and-dilshan-ab12');
  if d -> 'content' ->> 'brideName' <> 'Sachini' then raise exception 'FAIL: guest could not open the invitation'; end if;
  if public.published_invitation('no-such-link-00') is not null then raise exception 'FAIL: unknown slug returned data'; end if;
  if not public.submit_published_rsvp('sachini-and-dilshan-ab12', 'Nimal Perera', 'yes', 2, 'See you!', '0771234567') then raise exception 'FAIL: reply refused'; end if;
  begin
    perform public.submit_published_rsvp('sachini-and-dilshan-ab12', 'Too Many', 'yes', 4, '', '');
    raise exception 'FAIL: party above the limit accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_published_rsvp('sachini-and-dilshan-ab12', '   ', 'no', 0, '', '');
    raise exception 'FAIL: empty name accepted';
  exception when invalid_parameter_value then null;
  end;
  -- Row Level Security: guests see no rows at all.
  if (select count(*) from public.invitation_rsvps) <> 0 then raise exception 'FAIL: guest could read replies'; end if;
  if (select count(*) from public.published_invitations) <> 0 then raise exception 'FAIL: guest could list invitations'; end if;
  begin
    insert into public.invitation_rsvps (slug, wedding_id, name, attending) values ('sachini-and-dilshan-ab12', 'cccccccc-0000-0000-0000-000000000001', 'Direct', 'yes');
    raise exception 'FAIL: guest inserted a reply directly';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The couple sees the reply and the view count; a stranger doesn't.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', true);
do $$ begin
  if (select count(*) from public.invitation_rsvps where name = 'Nimal Perera' and party = 2) <> 1 then raise exception 'FAIL: couple cannot see the reply'; end if;
  if (select views from public.published_invitations where slug = 'sachini-and-dilshan-ab12') <> 1 then raise exception 'FAIL: views not counted'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', true);
do $$ begin
  if (select count(*) from public.invitation_rsvps) <> 0 then raise exception 'FAIL: stranger can read replies'; end if;
end $$;

-- Unpublishing closes the link.
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', true);
update public.published_invitations set unpublished_at = now() where slug = 'sachini-and-dilshan-ab12';
set local role anon;
do $$ begin
  if public.published_invitation('sachini-and-dilshan-ab12') is not null then raise exception 'FAIL: unpublished link still opens'; end if;
  if public.submit_published_rsvp('sachini-and-dilshan-ab12', 'Late', 'no', 0, '', '') then raise exception 'FAIL: unpublished link took a reply'; end if;
end $$;
select 'invitation studio: all checks passed' as result;
rollback;
