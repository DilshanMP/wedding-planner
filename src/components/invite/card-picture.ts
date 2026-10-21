import { FONTS, type GuestLanguage, type InviteContent, type InviteDesign } from "@/lib/domain/invite-studio";
import { clock, localise, longDate, words } from "@/lib/domain/invite-i18n";
import { mix } from "@/lib/theme-colors";

/**
 * The garden-gate invitation as one picture to send on WhatsApp: the carved
 * frame in the wedding colours with the names, message, date and venue.
 */
const W = 1080;
const H = 1446; // the frame art is 896 × 1200
const CX = W / 2;
const SI_HEAD = "'Abhaya Libre', 'Noto Serif Sinhala', serif";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the card art."));
    img.src = src;
  });
}

/** Splits text into lines that fit `width`, at most `max` lines (the last one ends with "…"). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  if (lines.length <= max) return lines;
  const cut = lines.slice(0, max);
  cut[max - 1] = `${cut[max - 1].replace(/[\s,.;:]+$/, "")}…`;
  return cut;
}

export async function gateCardPicture(content: InviteContent, design: InviteDesign, lang: GuestLanguage): Promise<Blob> {
  const w = words(lang);
  const { content: c } = localise(content, "", lang);
  const si = lang === "si";
  const script = FONTS[design.fonts.names].family;
  const head = si ? SI_HEAD : FONTS[design.fonts.headings].family;
  const body = si ? SI_HEAD : FONTS[design.fonts.body].family;
  const ink = mix(design.colors.ink, "#000000", 0.25);
  const accent = design.colors.accent;

  const kicker = si ? w.gettingMarried : w.gettingMarried.toUpperCase();
  const date = si ? longDate(c.date, lang) : longDate(c.date, lang).toUpperCase();
  const time = c.time ? clock(c.time, lang) : "";
  const sample = `${kicker} ${c.brideName} ${c.groomName} ${c.inviteMessage} ${date} ${time} ${c.venueName} ${c.address}`;

  const [art] = await Promise.all([
    loadImage("/everafter/gate/frame.webp"),
    // Fetch just the font files this text needs (Sinhala fonts load by character range).
    ...[`64px ${script}`, `700 28px ${head}`, `italic 28px ${body}`, `28px ${body}`].map((f) => document.fonts.load(f, sample).catch(() => [])),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't draw the picture.");

  ctx.drawImage(art, 0, 0, W, H);
  // Tint the ivory carving with the wedding colours (as on the invitation).
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = mix(design.colors.floralA, "#ffffff", 0.15);
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const spacing = (px: number) => {
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  };
  const fit = (text: string, font: (size: number) => string, start: number, maxWidth: number) => {
    let size = start;
    ctx.font = font(size);
    while (size > 24 && ctx.measureText(text).width > maxWidth) ctx.font = font((size -= 2));
  };

  // Kicker
  ctx.fillStyle = ink;
  spacing(si ? 0 : 5);
  fit(kicker, (s) => `700 ${s}px ${head}`, si ? 36 : 27, 540);
  ctx.fillText(kicker, CX, 470);
  spacing(0);

  // Names
  fit(c.brideName, (s) => `${s}px ${script}`, 128, 580);
  ctx.fillText(c.brideName, CX, 625);
  ctx.fillStyle = accent;
  ctx.font = `84px ${script}`;
  ctx.fillText("&", CX, 712);
  ctx.fillStyle = ink;
  fit(c.groomName, (s) => `${s}px ${script}`, 128, 580);
  ctx.fillText(c.groomName, CX, 818);

  // Divider
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(CX - 120, 872);
  ctx.lineTo(CX - 20, 872);
  ctx.moveTo(CX + 20, 872);
  ctx.lineTo(CX + 120, 872);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(CX, 860);
  ctx.lineTo(CX + 12, 872);
  ctx.lineTo(CX, 884);
  ctx.lineTo(CX - 12, 872);
  ctx.closePath();
  ctx.fill();

  // Message
  ctx.fillStyle = ink;
  ctx.font = si ? `30px ${body}` : `italic 33px ${body}`;
  const lines = wrap(ctx, c.inviteMessage.trim(), 560, 3);
  lines.forEach((l, i) => ctx.fillText(l, CX, 940 + i * 44));

  // Date, time, venue
  let y = 940 + Math.max(1, lines.length) * 44 + 34;
  spacing(si ? 0 : 3);
  fit(date, (s) => `700 ${s}px ${head}`, si ? 36 : 31, 580);
  ctx.fillText(date, CX, y);
  spacing(0);
  if (time) {
    y += 48;
    ctx.font = `600 ${si ? 32 : 30}px ${head}`;
    ctx.fillText(time, CX, y);
  }
  if (c.venueName) {
    y += 58;
    fit(c.venueName, (s) => `${si ? "" : "italic "}600 ${s}px ${head}`, 42, 580);
    ctx.fillText(c.venueName, CX, y);
  }
  if (c.address && y < 1190) {
    y += 44;
    ctx.globalAlpha = 0.85;
    ctx.font = `28px ${body}`;
    ctx.fillText(wrap(ctx, c.address, 540, 1)[0] ?? "", CX, y);
    ctx.globalAlpha = 1;
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the picture."))), "image/jpeg", 0.9));
}
