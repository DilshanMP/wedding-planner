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
| `npm run test:e2e` | Acceptance flow in a real browser against a running app (`BASE_URL`, optional `CHROMIUM_PATH`) |
| `npm run test:e2e:cloud` | Cloud-mode flow (sign-in gate, sharing, online RSVP) — see `supabase/README.md` |

## Storage modes

- **Local mode (default).** With no environment variables, the plan is stored in the browser (localStorage, files in IndexedDB). Nothing leaves the device, and the installed app works fully offline. Use *Settings → Export All Data* / *Import Backup*.
- **Cloud mode.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) and apply `supabase/migrations/`. Adds email sign-in, sync between devices, sharing with family and planners, online RSVP links for guests, and a private cloud document vault — all protected by Row Level Security. See [`supabase/README.md`](supabase/README.md).
- **Assistant.** Answers common questions from your own data with no setup. Set `ANTHROPIC_API_KEY` on the server to add "Explain in more detail" answers from Claude (only aggregate figures are sent — no guest names or contacts).

Deploy on Vercel as a standard Next.js app; add the variables in the project settings.

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
| `/documents` | Document vault: contracts, quotations, receipts, linked to vendors, budget lines and tasks |
| `/reports` | Budget, guest, vendor, task, payment and readiness reports — PDF (print) and Excel |
| `/assistant` | Ask about your wedding |
| `/settings` | Details, blueprint, people, sharing, assumptions, weddings, backup |
| `/login` | Sign-in (cloud mode) |
| `/rsvp/[token]` | A guest's personal RSVP page (cloud mode, when online RSVP is on) |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — stack, structure, data model, calculations, phases and risks
- [Design handoff](docs/design/HANDOFF.md) — the Wedding OS design system the UI is built from
