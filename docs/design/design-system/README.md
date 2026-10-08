Plan the wedding like a beautiful experience, but manage it like an investment. Every screen should leave the couple feeling three things: *I can see my wedding becoming real. I know exactly where my money is going. I know what I need to do next.*

The look is a Sri Lankan luxury wedding told through a luxury hotel, an editorial wedding magazine and Apple-level simplicity: ivory, champagne and wine red, with jasmine, lotus and the Poruwa as quiet references, never ornament.

## Content fundamentals

- **Voice:** warm, calm, certain. Speak to the couple as "you"; the product never says "I". Name people and places ("Perera family", "Lotus Hall, Kandy").
- **Every screen answers "What should I do next?"** State the fact, then the action: "44 guests haven't received invitations." → **Review Invitations**. "Your decoration budget is trending 18% above plan." → **Review Options**.
- **Money is intentional, never cheap.** Say "Wedding Investment", "Committed", "Paid", "Remaining", "Projected", "Value Score", "Cost Efficiency". Never "cheapest", never ROI or profit. Savings read as "could save about LKR 85,000 with similar deliverables".
- **Numbers:** `LKR 3,500,000` — currency code first, comma grouping, whole rupees in summaries, `.00` only on receipts and payment records. Dates as `12 June 2027`, times as `10:30 AM`.
- **Casing:** sentence case for headings and buttons ("Add vendor" in running text; page actions in Title Case like "Start Planning" are allowed for primary CTAs). Overlines are uppercase via CSS, written in sentence case.
- **No emoji.** Status is said in words plus a Badge.
- **Cultural terms** are used plainly and correctly: Poruwa, Poruwa ceremony, going-away, National Suit. Don't reach for generic "Indian wedding" vocabulary or motifs.

## Visual foundations

### Colour
- Ground is ivory `surface`; cards `surface-raised` with a `line` hairline and `shadow-sm`; beige wells and table heads `surface-sunken`.
- Text is `ink`, secondary text `ink-muted`. Both hold 4.5:1 on every surface and tint in both themes.
- **Wine red** `wine-600` is the one action colour: primary buttons, active nav, the key figure, links. Text on it is `on-wine`. Use it sparingly — one wine moment per region.
- **Champagne** is warmth and craft: `champagne-100` for selection and hover, `champagne-300` for rails and the committed series, `champagne-500` for decoration only (2.6:1 on ivory — never text, never the only cue), `champagne-700` for golden text such as overlines and the Premium label.
- **Natural green** `sage-600` / `sage-50` marks what is complete and calm: done journey stages, "within plan".
- **States** — `success` (teal-leaning green), `warning` (amber), `danger` (vermilion, deliberately brighter than wine), `info` (slate blue), each with a `-50` ground. A state always carries a word or icon as well as colour.
- **Bride / Groom** are `bride` (rose) and `groom` (blue-slate): they differ in hue *and* sit on the red–blue axis so they stay distinct for colour-blind viewers; the word "Bride"/"Groom" is always present.
- Themes: **Ivory** (default) and **Evening** (dark) — Evening is Wedding Day Mode after dusk and the simulator's night scenes. Wine lightens in Evening, so text on it switches to dark `on-wine`.

### Type
- **Cormorant Garamond** (`display`) carries emotion: `display-xl` hero, `display-l` countdown, `heading-1` page titles, `heading-2` sections and modal titles, `figure` for money and counts, `clock` for Wedding Day Mode only.
- **Manrope** (`sans`) runs the interface: `title`, `body-lg`, `body`, `label`, `small`, `caption`, `overline`.
- Use tabular numerals (`font-variant-numeric: tabular-nums`) in tables and columns; lining numerals in figures.
- One serif headline per card at most. Never set paragraphs or form labels in the serif.
- Both faces load from Google Fonts (`components/bundle.css` imports them).

### Space, radius, shadow
- 4px base: `space-4` mobile gutter, `space-6` desktop gutter, `space-5` card padding and gaps, `space-7` between sections, `space-9` landing rhythm.
- Soft but not bubbly: `radius-md` controls, `radius-lg` cards, `radius-xl` modals, drawers, hero cards and the mobile bottom nav, `radius-pill` badges and bars.
- Elevation is quiet: `shadow-sm` at rest, `shadow-md` on hover and floating bars, `shadow-lg` for overlays. Borders do most of the separating.

### Layout & responsive
- Mobile first. Below `bp-tablet`: single column, floating bottom nav (Home, Tasks, ＋, Guests, Budget), sheets instead of drawers, tables become card lists.
- `bp-tablet` → icon sidebar and two-column dashboard. `bp-laptop` → full sidebar with labels, drawers. `bp-desktop` → 1280px content max, three-column dashboard.
- Dashboard order: countdown + readiness (hero), budget health, guests, vendors, upcoming tasks, upcoming payments, next milestone, journey. No more than six cards above the fold.
- Wedding Day Mode replaces the whole shell: NowNext, vendor status, coordinator notes, emergency tasks, nothing else.

### Motion
Motion should feel slow enough to be premium and fast enough to stay usable. Tokens live in `components/bundle.css`:

| Token | Value | For |
| --- | --- | --- |
| `--dur-quick` | 160ms | hover, press, toggles |
| `--dur-base` | 280ms | tabs, page transitions, card reveal |
| `--dur-slow` | 480ms | progress fills, modal/drawer entry, journey stage completing |
| `--dur-cinematic` | 900ms | readiness ring, countdown roll, simulator scene changes |
| `--ease-silk` | cubic-bezier(.22,.61,.36,1) | default easing |
| `--ease-bloom` | cubic-bezier(.34,1.32,.64,1) | completion and celebration only |

- Budget figures count to their new value over `--dur-slow`; guest confirmations bloom the badge once; a completed checklist item or journey stage may release a single petal.
- The Wedding Simulator moves by scroll: cross-fades and slow parallax between scenes, never autoplay, never game-like.
- The only loop in the product is the "Now" pulse in Wedding Day Mode.
- Under `prefers-reduced-motion` every duration becomes 0 and loops stop; state changes still happen instantly.

### States
- **Focus:** 2px solid `focus` outline at 2px offset on every interactive element.
- **Hover:** champagne-100 ground for quiet controls, wine-700 for primary.
- **Disabled:** 45% opacity plus a label saying why.
- **Loading:** Skeleton blocks after 300ms; no full-page spinners.
- **Empty:** EmptyState with one next action. **Error:** danger Notice saying what happened and how to recover. **Success:** success Notice or a one-time bloom.

## Iconography
- Lucide icons (the product's chosen set), 1.6px stroke, round caps, 18px in UI and 24px in navigation, coloured by `currentColor` (ink-muted, wine-600 when active).
- Cultural marks — lotus, jasmine, Poruwa canopy — are drawn as single-weight line marks in `champagne-700` for empty states and section breaks only. Never filled, never coloured, never more than one per screen.
- No emoji, no cartoon wedding graphics, no clip-art florals.

## Logo
There is no logo yet. Until one is supplied, set the product name in Cormorant Garamond at `heading-2` in `ink`; inside the app the couple's names take the logo's place in the sidebar.

## Not synced
This system was built from the product briefs (AGENT.md and the UI/UX brief), not from code: the repository `DilshanMP/wedding-planner` could not be read. Components are a CSS component library (`components/bundle.css`, class prefix `wos-`) with static previews; there is no JavaScript bundle. No logo, font files or icon files were supplied — fonts load from Google Fonts.
