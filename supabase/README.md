# Supabase

## Set up cloud mode

1. Create a Supabase project.
2. Set up the database: open **SQL Editor → New query**, paste the whole of [`setup.sql`](setup.sql) and press **Run** (it is the migrations combined, in order). With the Supabase CLI you can run `supabase db push` instead.
3. In *Authentication → URL configuration*, add your site URL (and `http://localhost:3000` for development) to the redirect URLs, so magic links return to `/dashboard`.
   **Already set up an earlier version?** Run only the new migration files you haven't run yet, e.g. [`migrations/20261010000000_activity.sql`](migrations/20261010000000_activity.sql) for the activity feed. Each migration is safe to run more than once.
4. Copy the project URL and the anon (publishable) key into `.env.local` (see `.env.example`) or your Vercel project settings.

The browser only ever uses the anon key; Row Level Security restricts every row to members of its wedding. Never put the service-role key in a `NEXT_PUBLIC_` variable.

## Verify the migration on plain Postgres

`tests/00_auth_stub.sql` creates a minimal stand-in for Supabase's `auth` schema so the migration can be checked without Supabase:

```bash
createdb wos_test
psql -d wos_test -f tests/00_auth_stub.sql
for f in migrations/*.sql; do psql -d wos_test -f "$f"; done
psql -d wos_test -f tests/01_rls_smoke.sql   # second user sees 0 rows; insert is blocked
```

## Integration tests (no Supabase account needed)

The repository and cloud features are tested against real Postgres + [PostgREST](https://postgrest.org) (the REST layer Supabase uses), with the migrations and RLS applied:

```bash
# 1. Database with the auth stand-in and migrations (see above), then PostgREST:
cat > postgrest.conf <<'CONF'
db-uri = "postgres://authenticator:authenticator@127.0.0.1:5432/wos_test"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "a-local-secret-of-at-least-32-characters"
server-port = 54330
CONF
postgrest postgrest.conf

# 2. Repository + sharing + RSVP tests through supabase-js:
POSTGREST_URL=http://127.0.0.1:54330 JWT_SECRET=a-local-secret-of-at-least-32-characters \
PG_ADMIN_URL=postgres://postgres@127.0.0.1:5432/wos_test npx vitest run src/lib/data/supabase.integration.test.ts

# 3. The whole app in cloud mode, in a browser:
node e2e/local-gateway.mjs &                    # /rest/v1 -> PostgREST, minimal /auth/v1
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331 NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT signed with the secret> npx next dev -p 3300 &
BASE_URL=http://localhost:3300 JWT_SECRET=… PG_ADMIN_URL=… npm run test:e2e:cloud
```

Not covered locally: real email delivery (Supabase Auth) and Storage uploads — check both once on your Supabase project after deploying.
