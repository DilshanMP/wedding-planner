# Catalog and leaflet

- `catalog.pdf` — 8-page A4 catalog
- `leaflet.pdf` — double-sided A5 leaflet (front and back)

Both are built from `catalog.html` / `leaflet.html` with the app's own fonts and colours, and real screenshots of the sample wedding in `screens/`. The QR code (`qr.svg`) opens `https://wedding-planner-mauve-phi.vercel.app` — regenerate it if the address changes.

To rebuild the PDFs after editing the HTML:

```bash
node docs/marketing/render.mjs
```
