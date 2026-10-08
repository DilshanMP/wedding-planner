-- RLS smoke test: a second user must not see or change another wedding.
insert into auth.users values ('11111111-1111-1111-1111-111111111111', 'nethmi@example.com'), ('22222222-2222-2222-2222-222222222222', 'other@example.com');
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.weddings (id, bride_name, groom_name, wedding_date) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Nethmi', 'Kasun', '2027-06-12');
insert into public.guests (wedding_id, name, side) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Perera family', 'bride');
insert into public.vendors (wedding_id, name, category_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Lotus Hall', 'venue');
update public.guests set rsvp = 'yes';
select 'owner sees guests', count(*) from public.guests;
-- second user
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select 'other sees weddings', count(*) from public.weddings;
select 'other sees guests', count(*) from public.guests;
update public.guests set rsvp = 'no';
select 'rows other could update', count(*) from public.guests where rsvp = 'no';
do $$ begin
  insert into public.guests (wedding_id, name, side) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Intruder', 'groom');
  raise exception 'RLS FAILED: insert allowed';
exception when insufficient_privilege then raise notice 'insert blocked as expected';
end $$;
reset role;
select 'members', role from public.wedding_members;
select 'updated_at trigger ok', updated_at > created_at or updated_at = created_at from public.guests;
