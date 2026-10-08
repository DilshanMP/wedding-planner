-- Minimal stand-in for the Supabase auth schema so the migration can be
-- verified on plain Postgres (see supabase/README.md). Never run on Supabase.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant usage on schema public to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
