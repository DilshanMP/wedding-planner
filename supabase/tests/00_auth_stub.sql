-- Minimal stand-in for the Supabase auth schema and API roles, so the
-- migrations can be verified on plain Postgres + PostgREST (see
-- supabase/README.md). Never run this on a real Supabase project.
create role anon nologin;
create role authenticated nologin;
create role authenticator login password 'authenticator' noinherit;
grant anon, authenticated to authenticator;

create schema auth;
create table auth.users (id uuid primary key, email text unique);
-- Same contract as Supabase: the user id is the JWT "sub" claim.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')
  )::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
