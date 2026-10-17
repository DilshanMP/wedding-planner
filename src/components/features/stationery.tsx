import type { ReactNode } from "react";
import type { CardTemplate, StationeryPlan } from "@/lib/domain/planner";
import { isLight, mix } from "@/lib/theme-colors";

/**
 * Printable wedding stationery drawn in SVG at real size (units are 0.1 mm),
 * so what you see is what prints. Templates: blush watercolour, arch with
 * photo, wax seal, Kandyan, floral, modern, lotus.
 */

export interface Palette {
  bg: string;
  main: string;
  accent: string;
  soft: string;
}

const TEMPLATE_COLORS: Record<CardTemplate, Omit<Palette, "soft">> = {
  blush: { bg: "#fbf7f0", main: "#9c5a64", accent: "#c3a06e" },
  arch: { bg: "#fffaf5", main: "#6e4b52", accent: "#c9a87a" },
  seal: { bg: "#f7f1e8", main: "#8c4a55", accent: "#b89466" },
  kandyan: { bg: "#fbf5e8", main: "#7b1e2b", accent: "#c9a24a" },
  floral: { bg: "#f8fafc", main: "#2f4a6d", accent: "#8fa9c9" },
  modern: { bg: "#ffffff", main: "#1f2a44", accent: "#b8955c" },
  lotus: { bg: "#fff8f4", main: "#8a3a52", accent: "#d9a3ae" },
};

export const TEMPLATE_LABEL: Record<CardTemplate, string> = {
  blush: "Ivory & blush watercolour",
  arch: "Arch with our photo",
  seal: "Ribbon & wax seal",
  kandyan: "Kandyan gold",
  floral: "Blue florals",
  modern: "Modern minimal",
  lotus: "Lotus blush",
};

export function stationeryPalette(plan: StationeryPlan, themeColors: string[]): Palette {
  const t = TEMPLATE_COLORS[plan.template];
  if (!plan.useTheme || themeColors.length < 2) return { ...t, soft: mix(t.accent, t.bg, 0.7) };
  const [main, accent] = themeColors;
  const light = themeColors.find((c) => isLight(c)) ?? mix(accent, "#ffffff", 0.9);
  const bg = mix(light, "#ffffff", 0.55);
  return { bg, main, accent, soft: mix(accent, bg, 0.7) };
}

const DISPLAY = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS = "'Manrope', 'Segoe UI', system-ui, sans-serif";
const SCRIPT = "'Great Vibes', 'Pinyon Script', cursive";
const SINHALA = "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', 'Sinhala Sangam MN', sans-serif";

/** Break text into lines of roughly `max` characters. */
export function wrap(text: string, max: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function Lines({ x, y, lines, size, gap = 1.35, ...rest }: { x: number; y: number; lines: string[]; size: number; gap?: number; fill: string; family?: string; weight?: number; italic?: boolean; spacing?: number; upper?: boolean }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fill={rest.fill} fontFamily={rest.family ?? DISPLAY} fontWeight={rest.weight ?? 500} fontStyle={rest.italic ? "italic" : undefined} letterSpacing={rest.spacing}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * gap}>{rest.upper ? l.toUpperCase() : l}</tspan>
      ))}
    </text>
  );
}

const LOTUS = "M32 14c-6 7-6 18 0 26 6-8 6-19 0-26zM32 40c-9-1-17-8-19-17 9 0 16 6 19 17zM32 40c9-1 17-8 19-17-9 0-16 6-19 17zM32 40c-12 2-22-2-26-8 9-3 19 0 26 8zM32 40c12 2 22-2 26-8-9-3-19 0-26 8zM18 48h28";

function Lotus({ x, y, s, color, sw = 1.6 }: { x: number; y: number; s: number; color: string; sw?: number }) {
  return <path d={LOTUS} transform={`translate(${x - 32 * s} ${y - 32 * s}) scale(${s})`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
}

/** A small curling vine used in Kandyan borders. */
function Curl({ x, y, s, color, flip = 1, rot = 0 }: { x: number; y: number; s: number; color: string; flip?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * flip} ${s})`} fill="none" stroke={color} strokeWidth={1.4 / s} strokeLinecap="round">
      <path d="M0 0 C 10 -14 30 -14 34 0 C 37 10 26 16 20 9 C 15 4 22 -2 26 2" />
      <path d="M34 0 C 44 -10 58 -6 60 4" />
      <circle cx="60" cy="6" r="2.2" fill={color} stroke="none" />
    </g>
  );
}

function Flower({ x, y, r, color, center }: { x: number; y: number; r: number; color: string; center: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x} cy={y - r * 0.55} rx={r * 0.42} ry={r * 0.62} fill="none" stroke={color} strokeWidth={r * 0.07} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r={r * 0.2} fill={center} />
    </g>
  );
}

function Leaf({ x, y, s, rot, color }: { x: number; y: number; s: number; rot: number; color: string }) {
  return <path d="M0 0 C 20 -18 50 -18 70 0 C 50 18 20 18 0 0 Z M0 0 L70 0" transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} fill="none" stroke={color} strokeWidth={2 / s} />;
}

/** Template-specific border and corner decoration for any card size. */
/** A loose watercolour rose: soft wash, then a spiral of petals. */
function Rose({ x, y, r, color, ink }: { x: number; y: number; r: number; color: string; ink: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} opacity="0.55" filter="url(#wc-blur)" />
      <circle cx={x - r * 0.15} cy={y - r * 0.1} r={r * 0.7} fill={color} opacity="0.6" />
      <path d={`M${x} ${y} m${-r * 0.15} 0 a${r * 0.15} ${r * 0.15} 0 1 1 ${r * 0.3} 0 a${r * 0.32} ${r * 0.3} 0 1 1 ${-r * 0.62} ${r * 0.05} a${r * 0.5} ${r * 0.48} 0 1 1 ${r * 0.98} ${-r * 0.1} a${r * 0.66} ${r * 0.62} 0 1 1 ${-r * 1.3} ${r * 0.2}`}
        fill="none" stroke={ink} strokeWidth={r * 0.045} strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

function WashLeaf({ x, y, s, rot, color }: { x: number; y: number; s: number; rot: number; color: string }) {
  return <path d="M0 0 C 18 -16 46 -16 64 0 C 46 16 18 16 0 0 Z" transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} fill={color} opacity="0.55" />;
}

/** Corner bouquet for the blush and arch designs. */
function Bouquet({ x, y, m, p, flip = 1 }: { x: number; y: number; m: number; p: Palette; flip?: number }) {
  const sage = "#9aae8c";
  const blush = mix(p.main, "#ffffff", 0.55);
  return (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <WashLeaf x={m * 0.02} y={m * 0.16} s={m / 260} rot={-50} color={sage} />
      <WashLeaf x={m * 0.12} y={m * 0.03} s={m / 300} rot={10} color={sage} />
      <WashLeaf x={m * 0.24} y={m * 0.11} s={m / 380} rot={35} color={mix(sage, "#ffffff", 0.3)} />
      <WashLeaf x={m * 0.05} y={m * 0.28} s={m / 420} rot={-80} color={mix(sage, "#ffffff", 0.3)} />
      <Rose x={m * 0.12} y={m * 0.12} r={m * 0.075} color={blush} ink={p.main} />
      <Rose x={m * 0.24} y={m * 0.05} r={m * 0.045} color={mix(p.accent, "#ffffff", 0.45)} ink={p.accent} />
      <Rose x={m * 0.04} y={m * 0.25} r={m * 0.04} color={mix(blush, "#ffffff", 0.3)} ink={p.main} />
      {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={m * (0.2 + k * 0.035)} cy={m * (0.2 + (k % 2) * 0.02)} r={m * 0.008} fill={p.accent} opacity="0.7" />)}
    </g>
  );
}

/** The arch window used by the arch design (also clips the photo). */
export function archPath(w: number, h: number): string {
  const x0 = w * 0.16;
  const x1 = w * 0.84;
  const top = h * 0.1;
  const bottom = h * 0.6;
  const r = (x1 - x0) / 2;
  return `M${x0} ${bottom} L${x0} ${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} L${x1} ${bottom} Z`;
}

export function Decor({ w, h, template, p }: { w: number; h: number; template: CardTemplate; p: Palette }) {
  const m = Math.min(w, h);
  const defs = (
    <defs>
      <filter id="wc-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={m * 0.012} /></filter>
    </defs>
  );
  if (template === "blush") {
    return (
      <g>
        {defs}
        <ellipse cx={w * 0.1} cy={h * 0.06} rx={m * 0.42} ry={m * 0.3} fill={mix(p.main, "#ffffff", 0.82)} opacity="0.7" filter="url(#wc-blur)" />
        <ellipse cx={w * 0.92} cy={h * 0.95} rx={m * 0.45} ry={m * 0.28} fill={mix(p.accent, "#ffffff", 0.75)} opacity="0.7" filter="url(#wc-blur)" />
        <rect x={m * 0.045} y={m * 0.045} width={w - m * 0.09} height={h - m * 0.09} rx={m * 0.02} fill="none" stroke={p.accent} strokeWidth={m * 0.0025} />
        <rect x={m * 0.06} y={m * 0.06} width={w - m * 0.12} height={h - m * 0.12} rx={m * 0.015} fill="none" stroke={p.accent} strokeWidth={m * 0.001} />
        <Bouquet x={-m * 0.02} y={-m * 0.02} m={m * 0.82} p={p} />
        <g transform={`rotate(180 ${w / 2} ${h / 2})`}><Bouquet x={-m * 0.02} y={-m * 0.02} m={m * 0.72} p={p} /></g>
      </g>
    );
  }
  if (template === "arch") {
    return (
      <g>
        {defs}
        <path d={archPath(w, h)} fill={mix(p.accent, "#ffffff", 0.82)} />
        <path d={archPath(w, h)} fill="none" stroke={p.accent} strokeWidth={m * 0.004} transform={`translate(${w / 2} ${h * 0.35}) scale(1.035) translate(${-w / 2} ${-h * 0.35})`} />
        <path d={archPath(w, h)} fill="none" stroke={p.accent} strokeWidth={m * 0.0015} />
        <Bouquet x={w * 0.5 - m * 0.18} y={h * 0.06} m={m * 0.75} p={p} />
        <rect x={m * 0.04} y={m * 0.04} width={w - m * 0.08} height={h - m * 0.08} fill="none" stroke={p.accent} strokeWidth={m * 0.0015} />
      </g>
    );
  }
  if (template === "seal") {
    const lines = [];
    for (let y = m * 0.02; y < h; y += m * 0.012) lines.push(<line key={y} x1={0} x2={w} y1={y} y2={y} stroke={p.accent} strokeWidth={m * 0.0006} opacity="0.18" />);
    return (
      <g>
        {defs}
        {lines}
        <rect x={m * 0.035} y={m * 0.035} width={w - m * 0.07} height={h - m * 0.07} fill="none" stroke={p.main} strokeWidth={m * 0.0015} />
        <rect x={m * 0.05} y={m * 0.05} width={w - m * 0.1} height={h - m * 0.1} fill="none" stroke={p.accent} strokeWidth={m * 0.001} />
      </g>
    );
  }
  if (template === "kandyan") {
    const i = m * 0.045;
    const curls: ReactNode[] = [];
    const step = m * 0.12;
    for (let x = i * 2.4 + step; x < w - i * 2.4 - step; x += step) {
      curls.push(<Curl key={`t${x}`} x={x} y={i * 1.9} s={m / 1400} color={p.accent} flip={((x / step) | 0) % 2 ? 1 : -1} />);
      curls.push(<Curl key={`b${x}`} x={x} y={h - i * 1.9} s={m / 1400} color={p.accent} flip={((x / step) | 0) % 2 ? -1 : 1} rot={180} />);
    }
    return (
      <g>
        <rect x={i} y={i} width={w - 2 * i} height={h - 2 * i} fill="none" stroke={p.accent} strokeWidth={m * 0.006} />
        <rect x={i * 1.5} y={i * 1.5} width={w - 3 * i} height={h - 3 * i} fill="none" stroke={p.main} strokeWidth={m * 0.002} />
        <rect x={i * 2.6} y={i * 2.6} width={w - 5.2 * i} height={h - 5.2 * i} fill="none" stroke={p.accent} strokeWidth={m * 0.002} strokeDasharray={`${m * 0.004} ${m * 0.01}`} />
        {curls}
        {[[i * 2.2, i * 2.2], [w - i * 2.2, i * 2.2], [i * 2.2, h - i * 2.2], [w - i * 2.2, h - i * 2.2]].map(([x, y], k) => (
          <g key={k}>
            <circle cx={x} cy={y} r={m * 0.03} fill={p.bg} stroke={p.accent} strokeWidth={m * 0.004} />
            <circle cx={x} cy={y} r={m * 0.012} fill={p.main} />
          </g>
        ))}
      </g>
    );
  }
  if (template === "floral") {
    const corner = (x: number, y: number, sx: number, sy: number, key: string) => (
      <g key={key} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
        <Leaf x={m * 0.06} y={m * 0.2} s={m / 450} rot={-35} color={p.main} />
        <Leaf x={m * 0.2} y={m * 0.06} s={m / 520} rot={20} color={p.main} />
        <Leaf x={m * 0.02} y={m * 0.34} s={m / 600} rot={-70} color={p.accent} />
        <Flower x={m * 0.14} y={m * 0.14} r={m * 0.07} color={p.main} center={p.accent} />
        <Flower x={m * 0.3} y={m * 0.05} r={m * 0.04} color={p.accent} center={p.main} />
        <Flower x={m * 0.05} y={m * 0.3} r={m * 0.035} color={p.accent} center={p.main} />
      </g>
    );
    return (
      <g>
        <rect x={m * 0.03} y={m * 0.03} width={w - m * 0.06} height={h - m * 0.06} fill="none" stroke={p.accent} strokeWidth={m * 0.002} />
        {corner(0, 0, 1, 1, "tl")}
        {corner(w, h, -1, -1, "br")}
        {corner(w, 0, -1, 1, "tr")}
      </g>
    );
  }
  if (template === "lotus") {
    return (
      <g>
        <ellipse cx={w / 2} cy={h * 0.08} rx={w * 0.7} ry={h * 0.22} fill={p.soft} opacity="0.55" />
        <ellipse cx={w / 2} cy={h * 1.02} rx={w * 0.8} ry={h * 0.16} fill={p.soft} opacity="0.5" />
        <rect x={m * 0.04} y={m * 0.04} width={w - m * 0.08} height={h - m * 0.08} rx={m * 0.03} fill="none" stroke={p.accent} strokeWidth={m * 0.003} />
        <Lotus x={w / 2} y={h - m * 0.12} s={m / 700} color={p.main} sw={1.8} />
      </g>
    );
  }
  // modern
  return (
    <g>
      <rect x={m * 0.05} y={m * 0.05} width={w - m * 0.1} height={h - m * 0.1} fill="none" stroke={p.main} strokeWidth={m * 0.0015} />
      <line x1={w / 2 - m * 0.08} x2={w / 2 + m * 0.08} y1={h - m * 0.11} y2={h - m * 0.11} stroke={p.accent} strokeWidth={m * 0.004} />
    </g>
  );
}

export interface CardProps {
  plan: StationeryPlan;
  p: Palette;
  bride: string;
  groom: string;
  date: string;
  className?: string;
  /** Couple photo for the arch design (URL). */
  photo?: string | null;
}

/** Name text style: calligraphy (bigger, upright) or the classic italic serif. */
const nameStyle = (plan: StationeryPlan, size: number) =>
  plan.nameFont === "serif" ? { size, family: DISPLAY, italic: true, weight: 500 } : { size: Math.round(size * 1.18), family: SCRIPT, italic: false, weight: 400 };

/** A wax seal with the couple's initials. */
function WaxSeal({ x, y, r, p, bride, groom }: { x: number; y: number; r: number; p: Palette; bride: string; groom: string }) {
  const blob = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * (1 + (i % 2 ? 0.07 : -0.03));
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <polygon points={blob} fill={mix(p.main, "#000000", 0.15)} />
      <circle cx={x} cy={y} r={r * 0.86} fill={p.main} />
      <circle cx={x} cy={y} r={r * 0.7} fill="none" stroke={mix(p.main, "#ffffff", 0.35)} strokeWidth={r * 0.04} />
      <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.22} fill="#ffffff" opacity="0.12" />
      <text x={x} y={y + r * 0.2} textAnchor="middle" fontSize={r * 0.62} fontFamily={SCRIPT} fill={mix(p.main, "#ffffff", 0.75)}>
        {(bride.trim()[0] ?? "").toUpperCase()}&amp;{(groom.trim()[0] ?? "").toUpperCase()}
      </text>
    </g>
  );
}

function Frame({ w, h, p, template, children, className, label }: { w: number; h: number; p: Palette; template: CardTemplate; children: ReactNode; className?: string; label: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg" data-mm={`${w / 10}x${h / 10}`}>
      <rect width={w} height={h} fill={p.bg} />
      <Decor w={w} h={h} template={template} p={p} />
      {children}
    </svg>
  );
}


/** 5×7 inch invitation, front cover. */
export function InvitationCover({ plan, p, bride, groom, date, className, photo }: CardProps) {
  const W = 1270;
  const H = 1780;
  const t = plan.text;
  const n = nameStyle(plan, 150);
  if (plan.template === "arch") {
    const nn = nameStyle(plan, 110);
    return (
      <Frame w={W} h={H} p={p} template={plan.template} className={className} label="Invitation cover">
        <defs><clipPath id="arch-photo"><path d={archPath(W, H)} /></clipPath></defs>
        {photo ? (
          <g>
            <image href={photo} x={W * 0.16} y={H * 0.1} width={W * 0.68} height={H * 0.5} preserveAspectRatio="xMidYMid slice" clipPath="url(#arch-photo)" />
            <Bouquet x={W * 0.5 - Math.min(W, H) * 0.18} y={H * 0.06} m={Math.min(W, H) * 0.75} p={p} />
          </g>
        ) : (
          <g>
            <Lotus x={W / 2} y={H * 0.36} s={3} color={p.accent} sw={1.4} />
            <Lines x={W / 2} y={H * 0.47} lines={["Add your photo"]} size={34} fill={p.accent} family={SANS} weight={600} spacing={4} upper />
          </g>
        )}
        <Lines x={W / 2} y={H * 0.67} lines={[t.coverLine]} size={34} fill={p.main} family={SANS} weight={600} spacing={6} upper />
        <Lines x={W / 2} y={H * 0.67 + 150} lines={[`${bride || "Bride"} & ${groom || "Groom"}`]} size={nn.size} fill={p.main} family={nn.family} italic={nn.italic} weight={nn.weight} />
        <line x1={W / 2 - 140} x2={W / 2 + 140} y1={H * 0.67 + 230} y2={H * 0.67 + 230} stroke={p.accent} strokeWidth={4} />
        <Lines x={W / 2} y={H * 0.67 + 310} lines={[date]} size={42} fill={p.main} family={SANS} weight={600} spacing={4} upper />
      </Frame>
    );
  }
  return (
    <Frame w={W} h={H} p={p} template={plan.template} className={className} label="Invitation cover">
      {t.sinhalaLine && <Lines x={W / 2} y={300} lines={[t.sinhalaLine]} size={58} fill={p.main} family={SINHALA} weight={600} />}
      {plan.template !== "seal" && <Lotus x={W / 2} y={470} s={2.6} color={p.accent} sw={1.5} />}
      <Lines x={W / 2} y={640} lines={[t.coverLine]} size={40} fill={p.main} family={SANS} weight={600} spacing={6} upper />
      <Lines x={W / 2} y={860} lines={[bride || "Bride"]} size={n.size} fill={p.main} family={n.family} italic={n.italic} weight={n.weight} />
      <Lines x={W / 2} y={990} lines={["&"]} size={90} fill={p.accent} italic />
      <Lines x={W / 2} y={1140} lines={[groom || "Groom"]} size={n.size} fill={p.main} family={n.family} italic={n.italic} weight={n.weight} />
      <line x1={W / 2 - 160} x2={W / 2 + 160} y1={1260} y2={1260} stroke={p.accent} strokeWidth={4} />
      <Lines x={W / 2} y={1350} lines={[date]} size={46} fill={p.main} family={SANS} weight={600} spacing={4} upper />
      {plan.template === "seal" && (
        <g>
          <rect x={0} y={1480} width={W} height={70} fill={mix(p.main, "#ffffff", 0.2)} />
          <rect x={0} y={1488} width={W} height={4} fill={mix(p.main, "#ffffff", 0.45)} />
          <rect x={0} y={1538} width={W} height={4} fill={mix(p.main, "#ffffff", 0.45)} />
          <WaxSeal x={W / 2} y={1515} r={115} p={p} bride={bride} groom={groom} />
        </g>
      )}
    </Frame>
  );
}

/** 5×7 inch invitation, inside page with the full wording. */
export function InvitationInside({ plan, p, bride, groom, date, className }: CardProps) {
  const W = 1270;
  const H = 1780;
  const t = plan.text;
  type Block = { lines: string[]; size: number; opts: Partial<Parameters<typeof Lines>[0]>; after: number };
  const blocks: Block[] = [
    { lines: wrap(t.blessing, 38), size: 40, opts: { italic: true, fill: p.accent }, after: 50 },
    { lines: wrap(t.hosts, 34), size: 44, opts: { family: SANS, weight: 600 }, after: 30 },
    { lines: wrap(t.inviteLine, 42), size: 40, opts: { italic: true }, after: 60 },
    { lines: [t.brideFull || bride || "Bride"], size: nameStyle(plan, 92).size, opts: { italic: nameStyle(plan, 92).italic, family: nameStyle(plan, 92).family, weight: nameStyle(plan, 92).weight }, after: 10 },
    { lines: ["&"], size: 60, opts: { italic: true, fill: p.accent }, after: 10 },
    { lines: [t.groomFull || groom || "Groom"], size: nameStyle(plan, 92).size, opts: { italic: nameStyle(plan, 92).italic, family: nameStyle(plan, 92).family, weight: nameStyle(plan, 92).weight }, after: 60 },
    { lines: [t.dateLine || date], size: 44, opts: { family: SANS, weight: 700, spacing: 3 }, after: 20 },
    { lines: wrap(t.timeLine, 44), size: 38, opts: { family: SANS, weight: 500 }, after: 20 },
    { lines: wrap(t.venueLine || "Venue", 40), size: 40, opts: { weight: 600 }, after: 60 },
    { lines: wrap(t.rsvpLine, 46), size: 32, opts: { family: SANS, weight: 500, fill: p.accent }, after: 0 },
  ];
  const tops = blocks.reduce<number[]>((acc, b, i) => [...acc, i === 0 ? 290 : acc[i - 1] + blocks[i - 1].size * 1.35 * blocks[i - 1].lines.length + blocks[i - 1].after], []);
  return (
    <Frame w={W} h={H} p={p} template={plan.template} className={className} label="Invitation inside">
      {blocks.map((b, i) => <Lines key={i} x={W / 2} y={tops[i]} lines={b.lines} size={b.size} fill={p.main} {...b.opts} />)}
    </Frame>
  );
}

/** Envelope front, 190 × 135 mm. */
export function Envelope({ plan, p, bride, groom, className }: CardProps) {
  const W = 1900;
  const H = 1350;
  return (
    <Frame w={W} h={H} p={p} template={plan.template} className={className} label="Envelope">
      <path d={`M60 60 L${W / 2} ${H * 0.52} L${W - 60} 60`} fill="none" stroke={p.accent} strokeWidth={3} opacity="0.6" />
      <WaxSeal x={W / 2} y={H * 0.52} r={130} p={p} bride={bride} groom={groom} />
      <Lines x={W / 2} y={H * 0.78} lines={[`${bride || "Bride"} & ${groom || "Groom"}`]} size={nameStyle(plan, 86).size} fill={p.main} family={nameStyle(plan, 86).family} italic={nameStyle(plan, 86).italic} weight={nameStyle(plan, 86).weight} />
      <Lines x={W / 2} y={H * 0.86} lines={["To: ______________________________"]} size={40} fill={p.main} family={SANS} weight={500} />
    </Frame>
  );
}

/** Square cake-box lid label, 90 mm. */
export function BoxLid({ plan, p, bride, groom, date, className }: CardProps) {
  const S = 900;
  return (
    <Frame w={S} h={S} p={p} template={plan.template} className={className} label="Cake box lid">
      <Lotus x={S / 2} y={230} s={1.5} color={p.accent} />
      <Lines x={S / 2} y={420} lines={[`${bride || "Bride"}`]} size={nameStyle(plan, 86).size} fill={p.main} family={nameStyle(plan, 86).family} italic={nameStyle(plan, 86).italic} weight={nameStyle(plan, 86).weight} />
      <Lines x={S / 2} y={500} lines={["&"]} size={56} fill={p.accent} italic />
      <Lines x={S / 2} y={600} lines={[`${groom || "Groom"}`]} size={nameStyle(plan, 86).size} fill={p.main} family={nameStyle(plan, 86).family} italic={nameStyle(plan, 86).italic} weight={nameStyle(plan, 86).weight} />
      <Lines x={S / 2} y={700} lines={[date]} size={30} fill={p.main} family={SANS} weight={700} spacing={3} upper />
    </Frame>
  );
}

/** Band that wraps around a cake box, 240 × 45 mm. */
export function BoxBand({ plan, p, bride, groom, className }: CardProps) {
  const W = 2400;
  const H = 450;
  return (
    <Frame w={W} h={H} p={{ ...p, bg: p.main, main: p.bg }} template="modern" className={className} label="Cake box band">
      <Lines x={W / 2} y={H / 2 - 10} lines={[plan.boxLine]} size={64} fill={p.bg} italic />
      <Lines x={W / 2} y={H / 2 + 80} lines={[`${bride || "Bride"} & ${groom || "Groom"}`]} size={36} fill={p.accent} family={SANS} weight={700} spacing={6} upper />
    </Frame>
  );
}

/** Tent card for a table, 100 × 70 mm (fold along the top). */
export function TableCard({ plan, p, label, className }: { plan: StationeryPlan; p: Palette; label: string; className?: string }) {
  const W = 1000;
  const H = 700;
  const num = label.replace(/^Table\s*/i, "");
  const isNumber = /^\d+$/.test(num);
  return (
    <Frame w={W} h={H} p={p} template={plan.template} className={className} label={label}>
      {isNumber && <Lines x={W / 2} y={260} lines={["Table"]} size={54} fill={p.accent} family={SANS} weight={700} spacing={8} upper />}
      <Lines x={W / 2} y={isNumber ? 470 : 400} lines={[isNumber ? num : label]} size={isNumber ? 220 : 90} fill={p.main} italic weight={500} />
    </Frame>
  );
}

/** Thank-you card, A6 landscape. */
export function ThankYouCard({ plan, p, bride, groom, className }: CardProps) {
  const W = 1480;
  const H = 1050;
  return (
    <Frame w={W} h={H} p={p} template={plan.template} className={className} label="Thank-you card">
      <Lines x={W / 2} y={360} lines={["Thank you"]} size={nameStyle(plan, 150).size} fill={p.main} family={nameStyle(plan, 150).family} italic={nameStyle(plan, 150).italic} weight={nameStyle(plan, 150).weight} />
      <Lines x={W / 2} y={500} lines={wrap(plan.thankYouLine, 44)} size={42} fill={p.main} weight={500} />
      <Lines x={W / 2} y={800} lines={[`With love, ${bride || "Bride"} & ${groom || "Groom"}`]} size={46} fill={p.accent} italic />
    </Frame>
  );
}
