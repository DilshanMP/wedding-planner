/**
 * Turn the couple's wedding colours into the app's design tokens, keeping
 * text readable: the main colour is darkened until white text on it passes
 * WCAG AA, and the accent used for small text is darkened against the page.
 */

type RGB = [number, number, number];

export function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

export function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a) ?? [0, 0, 0];
  const y = parseHex(b) ?? [0, 0, 0];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex) ?? [0, 0, 0];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Darken (towards near-black ink) until the colour reaches `ratio` against `against`. */
export function darkenFor(color: string, against: string, ratio: number): string {
  let c = color;
  for (let i = 0; i < 20 && contrast(c, against) < ratio; i++) c = mix(c, "#1a1214", 0.12);
  return c;
}

export function isLight(hex: string): boolean {
  return luminance(hex) > 0.6;
}

/** CSS custom properties for the app, from the wedding colours. */
export function themeVars(colors: string[]): Record<string, string> {
  const valid = colors.filter((c) => parseHex(c));
  if (valid.length === 0) return {};
  const main = darkenFor(valid[0], "#ffffff", 4.6);
  const accent = valid[1] ?? mix(main, "#ffffff", 0.5);
  const light = valid.find((c) => isLight(c)) ?? mix(accent, "#ffffff", 0.9);
  const surface = mix(light, "#ffffff", 0.45);
  return {
    "--wine-600": main,
    "--wine-700": mix(main, "#120a0c", 0.22),
    "--wine-50": mix(main, "#ffffff", 0.9),
    "--on-wine": "#fffdf9",
    "--focus": main,
    "--champagne-100": mix(accent, surface, 0.8),
    "--champagne-300": mix(accent, surface, 0.45),
    "--champagne-500": accent,
    "--champagne-700": darkenFor(accent, surface, 4.6),
    "--surface": surface,
    "--surface-raised": mix(light, "#ffffff", 0.8),
    "--surface-sunken": mix(light, accent, 0.1),
    "--line": mix(light, accent, 0.22),
  };
}

/** The most characterful colours in a photo: venue, flowers, a saree swatch… */
export async function paletteFromImage(url: string, count = 5): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Couldn't read that photo."));
    i.src = url;
  });
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser can't read photos.");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  // Bucket colours (5 bits per channel) and keep a running average per bucket.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(key, e);
  }
  const candidates = [...buckets.values()]
    .map((e) => {
      const rgb: RGB = [e.r / e.n, e.g / e.n, e.b / e.n];
      const max = Math.max(...rgb);
      const min = Math.min(...rgb);
      const sat = max === 0 ? 0 : (max - min) / max;
      // Favour colourful, mid-tone colours; plain white/black walls matter less.
      const score = e.n * (0.35 + sat) * (max > 30 && min < 245 ? 1 : 0.3);
      return { hex: toHex(rgb), rgb, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked: { hex: string; rgb: RGB }[] = [];
  for (const c of candidates) {
    if (picked.every((p) => Math.hypot(p.rgb[0] - c.rgb[0], p.rgb[1] - c.rgb[1], p.rgb[2] - c.rgb[2]) > 60)) picked.push(c);
    if (picked.length === count) break;
  }
  // Main colour first: the darkest of the strong ones reads best as a brand colour.
  const strong = picked.slice(0, 3).sort((a, b) => luminance(a.hex) - luminance(b.hex));
  return [...strong, ...picked.slice(3)].map((p) => p.hex);
}
