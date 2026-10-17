/**
 * Turn an on-screen SVG (cards, boxes) into a high-resolution PNG. SVGs drawn
 * as images can't see the page's web fonts, so the display and body fonts are
 * embedded into the copy first.
 */

let fontCss: Promise<string> | null = null;

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** @font-face rules for the app's Latin fonts, with the files inlined. */
function embeddedFonts(): Promise<string> {
  fontCss ??= (async () => {
    const rules: string[] = [];
    for (const sheet of [...document.styleSheets]) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of [...list]) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue("font-family");
        const range = rule.style.getPropertyValue("unicode-range");
        if (!/Cormorant|Manrope|Great Vibes/i.test(family) || (range && !/U\+0000/i.test(range))) continue;
        const src = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
        if (!src) continue;
        try {
          const data = await toDataUrl(new URL(src, sheet.href ?? location.href).href);
          rules.push(`@font-face{font-family:${family};font-style:${rule.style.getPropertyValue("font-style") || "normal"};font-weight:${rule.style.getPropertyValue("font-weight") || "400"};src:url(${data}) format("woff2");}`);
        } catch {
          // Missing font file: the export falls back to Georgia.
        }
      }
    }
    return rules.join("\n");
  })();
  return fontCss;
}

/** A standalone copy: fonts and photos inlined, so it opens anywhere (Canva, Illustrator, a printer). */
async function standalone(svg: SVGSVGElement, width: string, height: string): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  clone.removeAttribute("class");
  for (const img of [...clone.querySelectorAll("image")]) {
    const href = img.getAttribute("href") ?? img.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (href && !href.startsWith("data:")) {
      try {
        img.setAttribute("href", await toDataUrl(href));
      } catch {
        img.remove();
      }
    }
  }
  const css = await embeddedFonts();
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }
  return new XMLSerializer().serializeToString(clone);
}

/** Vector file at real size (mm), for Canva or a print shop. */
export async function svgToFile(svg: SVGSVGElement): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const xml = await standalone(svg, `${vb.width / 10}mm`, `${vb.height / 10}mm`);
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`], { type: "image/svg+xml" });
}

export async function svgToPng(svg: SVGSVGElement, widthPx: number): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const heightPx = Math.round(widthPx * (vb.height / vb.width));
  const xml = await standalone(svg, String(widthPx), String(heightPx));
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't draw the design."));
      i.src = url;
    });
    // Give the embedded fonts a moment to apply inside the SVG image.
    await new Promise((r) => setTimeout(r, 60));
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't create pictures.");
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the picture."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
