/**
 * Turn an on-screen SVG (cards, boxes) into a high-resolution PNG. SVGs drawn
 * as images can't see the page's web fonts, so the display and body fonts are
 * embedded into the copy first.
 */

const fontCss = new Map<string, Promise<string>>();
const APP_FONTS = ["Cormorant Garamond", "Manrope", "Great Vibes"];

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

/** @font-face rules for the given families (Latin, plus Sinhala for Noto Sinhala), with the files inlined. */
function embeddedFonts(families: string[]): Promise<string> {
  const key = [...families].sort().join("|");
  const wanted = new Set(families.map((f) => f.toLowerCase()));
  const cached = fontCss.get(key);
  if (cached) return cached;
  const job = (async () => {
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
        const plain = family.replace(/["']/g, "").trim().toLowerCase();
        const range = rule.style.getPropertyValue("unicode-range");
        // Browsers write ranges as "U+0-FF" or "U+0000-00FF".
        const latin = !range || /U\+0{1,4}-/i.test(range);
        const sinhala = plain.includes("sinhala") && /U\+0?D[89A-F]/i.test(range);
        if (!wanted.has(plain) || !(latin || sinhala)) continue;
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
  fontCss.set(key, job);
  return job;
}

/** Family names (without fallbacks) from CSS font stacks like "'Playfair Display', Georgia, serif". */
export function familiesOf(...stacks: string[]): string[] {
  const generic = /^(serif|sans-serif|cursive|system-ui|monospace|georgia)$/i;
  return [...new Set(stacks.flatMap((s) => s.split(",").map((f) => f.replace(/["']/g, "").trim()).filter((f) => f && !generic.test(f))))];
}

/** A standalone copy: fonts and photos inlined, so it opens anywhere (Canva, Illustrator, a printer). */
async function standalone(svg: SVGSVGElement, width: string, height: string, families: string[]): Promise<string> {
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
  const css = await embeddedFonts(families);
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }
  return new XMLSerializer().serializeToString(clone);
}

/** Vector file at real size (mm), for Canva or a print shop. */
export async function svgToFile(svg: SVGSVGElement, families = APP_FONTS): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const xml = await standalone(svg, `${vb.width / 10}mm`, `${vb.height / 10}mm`, families);
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`], { type: "image/svg+xml" });
}

export async function svgToPng(svg: SVGSVGElement, widthPx: number, families = APP_FONTS, type: "image/png" | "image/jpeg" = "image/png"): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const heightPx = Math.round(widthPx * (vb.height / vb.width));
  const xml = await standalone(svg, String(widthPx), String(heightPx), families);
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
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, widthPx, heightPx);
    }
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the picture."))), type, 0.92));
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

/**
 * A one-page PDF holding one JPEG at the given size in points (72 per inch).
 * Written by hand — a PDF with a single DCT image needs only five objects.
 */
export async function jpegToPdf(jpeg: Blob, pxW: number, pxH: number, ptW: number, ptH: number): Promise<Blob> {
  const img = new Uint8Array(await jpeg.arrayBuffer());
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body();
    push("\nendobj\n");
  };
  const draw = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img);
    push("\nendstream");
  });
  obj(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
