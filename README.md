# Wedding OS

> Plan the wedding like a beautiful experience, but manage it like an investment.

A wedding planning and wedding investment system for Sri Lankan weddings: a dated A–Z checklist, guests by bride and groom side, a budget that shows committed, paid and projected spend, vendor quote comparison, timelines, Wedding Day Mode and an interactive wedding simulator.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Open the app, choose **Start Planning** for your own wedding, or **Explore Sample Wedding** to load Nethmi & Kasun's wedding (12 June 2027, Lotus Hall, Kandy).

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Domain, store and persistence tests (Vitest) |

## Storage modes

- **Local mode (default).** With no environment variables, the plan is stored in the browser (localStorage). Nothing leaves the device. Use *Settings → Export All Data* for a backup.
- **Cloud mode.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) and apply `supabase/migrations/` to your project. The app then requires sign-in (email magic link), and every row is protected by Row Level Security. See [`supabase/README.md`](supabase/README.md).

Deploy on Vercel as a standard Next.js app; add the two variables in the project settings to enable cloud mode.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing page |
| `/onboarding` | Wedding setup (or load the sample wedding) |
| `/dashboard` | Countdown, readiness, needs-attention, investment, guests, payments, vendors, journey |
| `/tasks` | Master A–Z checklist |
| `/guests` | Guests, invitations and RSVPs |
| `/budget` | Wedding Investment: overview, categories, payments, planner vs self-plan |
| `/vendors` | Vendors and quote comparison with Value Score |
| `/timeline` | Wedding-day schedule and planning timeline |
| `/wedding-day` | Wedding Day Mode (Ivory / Evening) |
| `/simulator` | Experience Your Wedding |
| `/settings` | Details, blueprint, people, assumptions, weddings, data |
| `/login` | Sign-in (cloud mode) |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — stack, structure, data model, calculations, phases and risks
- [Design handoff](docs/design/HANDOFF.md) — the Wedding OS design system the UI is built from
