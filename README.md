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
| `npm run test:e2e:studio` | EverAfter Studio: create, edit, undo, publish, PNG/PDF/SVG downloads, guest reply, Replies (local mode) |
| `npm run test:e2e:cloud-studio` | The same in cloud mode, plus personal `/invite/<token>` links |

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
| `/dashboard` | Home: your venue photo and colours, countdown, next steps, plan-at-a-glance tiles, activity |
| `/tasks` | Master A–Z checklist |
| `/checklist` | One-page checklist of the main points — tick off, print / PDF, share on WhatsApp |
| `/guests` | Guests, invitations and RSVPs (list or spreadsheet view) |
| `/tables` | Table planner: hall layout, drag tables, seat guest parties, 3D walk-in view, print |
| `/budget` | Budget: overview, spreadsheet (edit like Excel), categories, payments, planner vs self-plan |
| `/menu` | Menu planner: venue menu (Paradise Inn “Crystal Glow” 2027 included), choose dishes per course, cost per plate, add to budget, share |
| `/vendors` | Vendors and quote comparison with Value Score and an advisor |
| `/design` | Our look: wedding colours (recolour the app), vision board, real-photo preview in your venue, outfits with a style advisor |
| `/invitations` | EverAfter Studio: animated envelope invitations — 8 templates, wizard, editor with live phone/computer preview, undo/redo, publish to a link with QR and WhatsApp, PNG/PDF/SVG downloads |
| `/invitations/rsvps` | Replies from published invitations (add them to the guest list, CSV) |
| `/invitations/send` | Send each guest their personal link, using your chosen design |
| `/invitations/canva` | Send the card to Canva (Canva Connect, see [docs/canva.md](docs/canva.md)) |
| `/everafter` | EverAfter Studio showcase and template gallery |
| `/i/[slug]` | A published invitation, as guests see it |
| `/cards` | Cards & boxes: invitation (cover + inside), envelope, cake-box lid and band, table cards, thank-you card — print or 300 dpi PNG |
| `/timeline` | Wedding-day schedule and planning timeline |
| `/wedding-day` | Wedding Day Mode (Ivory / Evening) |
| `/simulator` | Experience Your Wedding: walk through the day scene by scene |
| `/studio` | Poruwa Studio: the couple on an illustrated Poruwa — outfits, hall themes, your own photos (kept on the device), download or share as a picture |
| `/activity` | Who did what: every change by you, your partner and family, filterable by person |
| `/documents` | Document vault: contracts, quotations, receipts, linked to vendors, budget lines and tasks |
| `/reports` | Budget, guest, vendor, task, payment and readiness reports — PDF (print) and Excel |
| `/assistant` | Ask about your wedding |
| `/settings` | Details, blueprint, people, sharing, assumptions, weddings, backup |
| `/login` | Sign-in (cloud mode) |
| `/rsvp/[token]` | A guest's personal RSVP page (cloud mode, when online RSVP is on) |
| `/invite/[token]` | A guest's personal animated invitation (cloud mode) |

## Documentation

- [Canva setup](docs/canva.md) — connecting "Send to Canva" (optional)
- [Architecture](docs/ARCHITECTURE.md) — stack, structure, data model, calculations, phases and risks
- [Design handoff](docs/design/HANDOFF.md) — the Wedding OS design system the UI is built from
