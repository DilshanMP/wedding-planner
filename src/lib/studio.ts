import { DEFAULT_LOOK, type CoupleLook, type HallTheme } from "@/components/features/poruwa-scene";

/**
 * Poruwa Studio settings, kept in this browser only. Photos never leave the
 * device: they're shrunk and stored as data URLs next to the outfit choices.
 */
export interface StudioSettings {
  look: CoupleLook;
  theme: HallTheme;
  animated: boolean;
}

export const DEFAULT_STUDIO: StudioSettings = { look: DEFAULT_LOOK, theme: "ivory", animated: true };

const key = (weddingId: string) => `wedding-os:studio:${weddingId}`;

export function loadStudio(weddingId: string): StudioSettings {
  try {
    const raw = window.localStorage.getItem(key(weddingId));
    if (!raw) return DEFAULT_STUDIO;
    const parsed = JSON.parse(raw) as Partial<StudioSettings>;
    return { ...DEFAULT_STUDIO, ...parsed, look: { ...DEFAULT_LOOK, ...parsed.look } };
  } catch {
    return DEFAULT_STUDIO;
  }
}

/** Returns false when the browser's storage is full (usually because of large photos). */
export function saveStudio(weddingId: string, settings: StudioSettings): boolean {
  try {
    window.localStorage.setItem(key(weddingId), JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** Shrink a photo to a small square-ish JPEG data URL suitable for the face circle. */
export async function photoToDataUrl(file: File, max = 480): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file isn't a photo we can open."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't prepare photos.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Render the scene SVG to a PNG with a caption band underneath. */
export async function sceneToPng(svg: SVGSVGElement, caption: { title: string; detail: string }): Promise<Blob> {
  const W = 1600;
  const H = 1200;
  const BAND = 220;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(W));
  clone.setAttribute("height", String(H));
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  // Petals sit above the frame when not animated; drop them from the still.
  clone.querySelectorAll(".ps-petal").forEach((n) => n.remove());
  const xml = new XMLSerializer().serializeToString(clone);
  const src = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't draw the picture."));
      i.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H + BAND;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't create pictures.");
    ctx.fillStyle = "#fbf8f2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, W, H);
    const root = getComputedStyle(document.documentElement);
    const display = root.getPropertyValue("--wos-display").trim() || "Georgia, serif";
    const sans = root.getPropertyValue("--wos-sans").trim() || "system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#2a1f1c";
    ctx.font = `500 84px ${display}`;
    ctx.fillText(caption.title, W / 2, H + 112);
    ctx.fillStyle = "#7a5a2b";
    ctx.font = `600 30px ${sans}`;
    ctx.fillText(caption.detail.toUpperCase(), W / 2, H + 168);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the picture."))), "image/png"));
  } finally {
    URL.revokeObjectURL(src);
  }
}
