# Wedding OS — UI handoff

Reference designs for implementing the Wedding OS UI in this codebase.

## Files
- `design-system/README.md` — brand rules: voice, colours, type, spacing, motion, iconography. Follow it.
- `design-system/tokens.json` — all design tokens (colours for Ivory + Evening themes, type scale, spacing, radius, shadow, breakpoints).
- `wos.css` — tokens as CSS variables (`:root` = Ivory, `.wos-evening` = Evening) plus the component classes (`wos-btn`, `wos-card`, `wos-badge`, `wos-nav`, `wos-ring`, `wos-journey`, `wos-notice`, `wos-table` ...).
- `screens/` — the four designed screens (HTML mockups; ignore the `<x-dc>`, `<helmet>` and `support.js` wrapper, they belong to the design tool):
  - `Main.dc.html` — Dashboard (desktop, responsive)
  - `Budget.dc.html` — Wedding Investment page (desktop, responsive)
  - `Mobile.dc.html` — Home on mobile (390 px) with floating bottom nav
  - `WeddingDay.dc.html` — Wedding Day Mode, Evening (dark) theme

## Notes for implementation
- Fonts: Cormorant Garamond (display, money figures) + Manrope (UI), from Google Fonts.
- Icons: Lucide, 1.6 stroke.
- All numbers and names in the mockups are sample data — wire them to real data.
- Mobile first: below 768 px use the bottom nav and single column; sidebar from 1024 px.
