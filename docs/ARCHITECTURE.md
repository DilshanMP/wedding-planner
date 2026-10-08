# Architecture

## Starting point

The repository was empty, so the recommended stack from `AGENT.md` was initialised:

- **Next.js 16** (App Router, Cache Components, Turbopack), **React 19**, **TypeScript strict**
- **Tailwind CSS 4** for layout, on top of the **Wedding OS design system** (`src/styles/wos.css`, ported verbatim from `docs/design/wos.css`, in the `components` layer so utilities can adjust it)
- **Motion** for number transitions, journey reveal, onboarding steps and the scroll-driven simulator; all motion respects `prefers-reduced-motion`
- **Lucide** icons, **Zod** form validation
- **Supabase** (Postgres, Auth, RLS, Storage) as the optional cloud backend
- **Vitest** for domain and store tests

shadcn/ui was not added: the supplied design system already defines every component the screens need (buttons, inputs, cards, badges, tabs, tables, notices, dialogs), and native `<dialog>` gives focus trapping and Esc handling without extra dependencies.

## Structure

```
src/
  app/                    routes (server files are thin; screens are client views)
    (app)/                screens inside the app shell: dashboard, tasks, guests, budget, vendors, timeline, settings
    onboarding/ login/ wedding-day/ simulator/ page.tsx (landing)
  components/
    ui/                   primitives (Badge, Card, Notice, Ring, Money…), dialog, form fields
    shell/                app shell, sidebar + bottom nav, gate, toast
    features/             reusable feature pieces (journey, task row, forms, budget bars…)
  lib/
    domain/               pure business logic: types, catalog, dates, money, budget, guests,
                          tasks + templates, quotes, readiness, insights, notifications, day, factory, sample data
    data/                 repository interface + local (browser) and Supabase implementations
    store/                WeddingStore (optimistic writes, ordered persistence) + React provider
    hooks/                useClock, usePage, useQueryState
supabase/
  migrations/             schema, indexes, triggers, RLS, storage policies
  tests/                  plain-Postgres verification of the migration and RLS
docs/design/              the design handoff (tokens, CSS, mockups)
```

Business rules live in `lib/domain` and never in components. Screens read through `usePage()` (wedding + today's date) and write through the store, which talks only to the `WeddingRepository` interface.

## Rendering

Every route prerenders a static shell. The wedding and the current time are client-only (`useSyncExternalStore` with a `null` server snapshot), so pages show a skeleton until hydration and nothing time-dependent is baked into HTML. Filters and open drawers live in the URL (`?filter=overdue`, `?guest=…`, `?new=1`), so every state is linkable from insights and reminders.

## Data model

`WeddingData` is one aggregate per wedding: `wedding`, `people`, `tasks`, `guests`, `budgetItems`, `vendors`, `quotes`, `payments`, `timeline`. Money is whole LKR integers; dates are calendar `YYYY-MM-DD`; times are `HH:mm`.

Database tables (`supabase/migrations/20261008000000_initial_schema.sql`):

| Table | Notes |
| --- | --- |
| `profiles` | one per auth user, with `plan` for future Free / Premium / Planner / Vendor |
| `weddings` | owner, details, blueprint, assumptions, soft delete, `public_slug` for a future public page |
| `wedding_members` | account access per wedding (`owner`, `editor`, `viewer`, `planner`, `vendor`) — one user, many weddings |
| `participants` | people in the plan (bride, groom, families, coordinator), optionally linked to a user |
| `tasks` | status, priority, owner, vendor, costs, dependencies, template key |
| `guests` | one row per party; invitation + RSVP status, adults/children, meal, table, `rsvp_token` for future online RSVP |
| `vendors`, `vendor_quotes` | booking status, day-of status; quotes with all hidden charges and compared features |
| `budget_items`, `payments` | planned / quoted / final; scheduled and paid payments linked to items and vendors |
| `timeline_events` | wedding-day moments with vendors, owner and simulator scene |
| `documents`, `notifications` | Phase 2 (document vault in a private storage bucket scoped by wedding id) |

Every wedding-scoped table has RLS: members read, owners/editors/planners write. `is_wedding_member()` and `can_edit_wedding()` are `security definer` to avoid recursive policy evaluation. Creating a wedding automatically adds the owner membership. `supabase/tests/` verifies on plain Postgres that a second user can't read, update or insert into someone else's wedding.

## Calculations (shown to the couple)

- **Expected cost** of a line: final, else quoted, else planned. **Committed**: booked lines. **Paid**: payments marked paid. **Projected**: all non-cancelled lines. **Remaining**: original budget − committed.
- **Category state**: over plan by more than 5% is "over"; anything above 0% is "watch". Insights ignore overruns under LKR 25,000.
- **Savings and estimates** round to the nearest LKR 5,000 (LKR 1,000 under LKR 20,000) to avoid false precision.
- **Value Score** = 40% cost efficiency (lowest true cost ÷ this true cost) + 35% quality rating + 25% compared features included; weights re-normalise when a signal is missing. True cost includes additional charges, overtime, transport and taxes. The cheapest quote is labelled, never auto-selected.
- **Readiness** = simple average of Budget (committed ÷ forecast), Guests (invitation coverage and RSVP replies), Vendors (vendor-backed budget categories booked), Ceremony (Poruwa / ritual / registration tasks done), Invitations (people invited) and Wedding Day (day-of tasks + a timeline of 6+ moments). Each row carries its own explanation.
- **Expected attendance** = confirmed + 50% of maybe + a configurable share (default 75%) of those still to reply.
- **Task generation**: each template is dated `weddingDate − daysBefore`. If that's already past, the task is rescheduled into the next few weeks and marked "catch-up". Changing the wedding date shifts every open task.

## Phases

| Phase | Status |
| --- | --- |
| 1 — Core: setup, date, dashboard, countdown, checklist, guests, budget, vendors, timeline | Built. Authentication is built for cloud mode (magic link) |
| 2 — Intelligence: quote comparison, planner vs self-plan, payments, readiness | Built. Documents: schema and storage policies only; upload UI next. Advanced analytics and PDF/Excel export next (CSV export exists for guests and budget) |
| 3 — Signature: Wedding Day Mode, Simulator | Built. Public RSVP (`rsvp_token`, `public_slug` ready), AI assistant and SaaS plans next |

### AI assistant boundary

`lib/domain` already answers the assistant's questions deterministically from real data: `budgetInsights()` (where am I overspending?), `nextActions()` / `upcomingTasks()` (what should I do this month?), `scoreQuotes()` (compare these packages), `summarizeBudget()` (can I afford this?). A future assistant should call these as tools rather than reason over raw rows, so answers stay consistent with the UI.

## Risks and follow-ups

- **Cloud mode is not yet exercised against a live Supabase project.** The migration, RLS, and the column mapping of the full sample wedding were verified on local Postgres 16; the Supabase JS adapter itself should be smoke-tested once a project exists.
- **Local mode is single-device.** Clearing site data deletes the plan; export regularly.
- **Collaboration**: the schema supports family members and planners, but invitations to a wedding (writing `wedding_members`) need a small server endpoint.
- **Offline**: the app is installable (manifest, icons) but has no service worker yet.
