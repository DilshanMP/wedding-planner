# Supabase

## Set up cloud mode

1. Create a Supabase project.
2. Apply the migration: `supabase db push` (Supabase CLI), or paste `migrations/20261008000000_initial_schema.sql` into the SQL editor.
3. In *Authentication → URL configuration*, add your site URL (and `http://localhost:3000` for development) to the redirect URLs, so magic links return to `/dashboard`.
4. Copy the project URL and the anon (publishable) key into `.env.local` (see `.env.example`) or your Vercel project settings.

The browser only ever uses the anon key; Row Level Security restricts every row to members of its wedding. Never put the service-role key in a `NEXT_PUBLIC_` variable.

## Verify the migration on plain Postgres

`tests/00_auth_stub.sql` creates a minimal stand-in for Supabase's `auth` schema so the migration can be checked without Supabase:

```bash
createdb wos_test
psql -d wos_test -f tests/00_auth_stub.sql
psql -d wos_test -f migrations/20261008000000_initial_schema.sql
psql -d wos_test -f tests/01_rls_smoke.sql   # second user sees 0 rows; insert is blocked
```
