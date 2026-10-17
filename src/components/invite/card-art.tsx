import { useId, type ReactNode } from "react";
import { mix } from "@/lib/theme-colors";
import type { CardShape, DesignColors, Florals, Ornament } from "@/lib/domain/invite-studio";

/**
 * Decorative pieces for invitation cards: borders, florals, crests, motifs.
 * All drawn in SVG units of 0.1 mm so they print at real size.
 */

export const CARD_W = 1270;
export const CARD_H = 1778;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Gradient ids shared by one card (unique per card on the page). */
export function useCardIds() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return { foil: `foil-${uid}`, clip: `clip-${uid}`, photo: `photo-${uid}`, wash: `wash-${uid}`, blur: `blur-${uid}` };
}

export function CardDefs({ ids, c }: { ids: ReturnType<typeof useCardIds>; c: DesignColors }) {
  return (
    <defs>
      <linearGradient id={ids.foil} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={mix(c.accent, "#fff6dc", 0.55)} />
        <stop offset="35%" stopColor={c.accent} />
        <stop offset="55%" stopColor={mix(c.accent, "#fff3d0", 0.7)} />
        <stop offset="75%" stopColor={mix(c.accent, "#3a2a10", 0.25)} />
        <stop offset="100%" stopColor={mix(c.accent, "#fff6dc", 0.4)} />
      </linearGradient>
      <radialGradient id={ids.wash}>
        <stop offset="0%" stopColor={c.floralA} stopOpacity="0.55" />
        <stop offset="100%" stopColor={c.floralA} stopOpacity="0" />
      </radialGradient>
      <filter id={ids.blur} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>
  );
}

/** The card's outline: rectangle, rounded, arch-topped or scalloped. */
export function shapePath(shape: CardShape, w = CARD_W, h = CARD_H): string {
  if (shape === "rounded") {
    const r = 60;
    return `M${r} 0H${w - r}Q${w} 0 ${w} ${r}V${h - r}Q${w} ${h} ${w - r} ${h}H${r}Q0 ${h} 0 ${h - r}V${r}Q0 0 ${r} 0Z`;
  }
  if (shape === "arch") return `M0 ${w / 2}A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2}V${h}H0Z`;
  if (shape === "scallop") {
    const n = 14;
    const step = w / n;
    let d = `M0 ${step / 2}`;
    for (let i = 0; i < n; i++) d += `A${step / 2} ${step / 2} 0 0 1 ${r1((i + 1) * step)} ${step / 2}`;
    d += `V${h - step / 2}`;
    for (let i = n; i > 0; i--) d += `A${step / 2} ${step / 2} 0 0 1 ${r1((i - 1) * step)} ${h - step / 2}`;
    return `${d}Z`;
  }
  return `M0 0H${w}V${h}H0Z`;
}

/* ------------------------------------------------------------------ */
/* Botanicals                                                          */
/* ------------------------------------------------------------------ */

function Rose({ x, y, r, c, ink }: { x: number; y: number; r: number; c: string; ink: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c} opacity="0.9" />
      <circle cx={x - r * 0.18} cy={y - r * 0.15} r={r * 0.68} fill={mix(c, "#ffffff", 0.25)} />
      <path d={`M${x} ${y}m${-r * 0.14} 0a${r * 0.14} ${r * 0.14} 0 1 1 ${r * 0.28} 0a${r * 0.3} ${r * 0.28} 0 1 1 ${-r * 0.58} ${r * 0.05}a${r * 0.48} ${r * 0.46} 0 1 1 ${r * 0.94} ${-r * 0.1}a${r * 0.64} ${r * 0.6} 0 1 1 ${-r * 1.26} ${r * 0.2}`}
        fill="none" stroke={ink} strokeWidth={r * 0.05} strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

function Leaf({ x, y, s, rot, c, opacity = 0.9 }: { x: number; y: number; s: number; rot: number; c: string; opacity?: number }) {
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${s})`}>
      <path d="M0 0C18-16 46-16 64 0C46 16 18 16 0 0Z" fill={c} opacity={opacity} />
      <path d="M2 0H60" stroke={mix(c, "#000000", 0.25)} strokeWidth="1.2" opacity="0.4" />
    </g>
  );
}

function Sprig({ x, y, len, rot, c, flower }: { x: number; y: number; len: number; rot: number; c: string; flower: string }) {
  const buds = Array.from({ length: 7 }, (_, i) => i);
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})`}>
      <path d={`M0 0Q${len * 0.1} ${-len * 0.5} 0 ${-len}`} stroke={c} strokeWidth="4" fill="none" />
      {buds.map((i) => (
        <ellipse key={i} cx={(i % 2 ? 9 : -9) + Math.sin(i) * 2} cy={-len * 0.3 - i * (len * 0.1)} rx="9" ry="15" fill={flower} opacity="0.9" transform={`rotate(${i % 2 ? 25 : -25} ${(i % 2 ? 9 : -9)} ${-len * 0.3 - i * (len * 0.1)})`} />
      ))}
    </g>
  );
}

function Daisy({ x, y, r, c, center }: { x: number; y: number; r: number; c: string; center: string }) {
  return (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <ellipse key={a} cx={x} cy={y - r * 0.55} rx={r * 0.22} ry={r * 0.5} fill={c} transform={`rotate(${a} ${x} ${y})`} />)}
      <circle cx={x} cy={y} r={r * 0.25} fill={center} />
    </g>
  );
}

export function LotusFlower({ x, y, s, c, line }: { x: number; y: number; s: number; c: string; line: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0-60C-16-34-16-8 0 10C16-8 16-34 0-60Z" fill={c} stroke={line} strokeWidth="2" />
      <path d="M0 10C-26 4-46-16-50-40C-24-36-8-20 0 10Z" fill={mix(c, "#ffffff", 0.2)} stroke={line} strokeWidth="2" />
      <path d="M0 10C26 4 46-16 50-40C24-36 8-20 0 10Z" fill={mix(c, "#ffffff", 0.2)} stroke={line} strokeWidth="2" />
      <path d="M0 12C-34 14-62 2-74-14C-44-20-18-10 0 12Z" fill={mix(c, "#ffffff", 0.4)} stroke={line} strokeWidth="2" />
      <path d="M0 12C34 14 62 2 74-14C44-20 18-10 0 12Z" fill={mix(c, "#ffffff", 0.4)} stroke={line} strokeWidth="2" />
      <path d="M-56 22H56" stroke={line} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** Traditional oil lamp (pol thel pahana). */
export function OilLamp({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0-70C6-60 6-52 0-46C-6-52-6-60 0-70Z" fill="#f4b23c" />
      <path d="M-30-40H30L22-30H-22Z" fill={c} />
      <rect x="-4" y="-30" width="8" height="70" fill={c} />
      <path d="M-22 40H22L30 52H-30Z" fill={c} />
      <ellipse cx="0" cy="-2" rx="14" ry="5" fill={c} />
    </g>
  );
}

function Orchid({ x, y, r, c, lip }: { x: number; y: number; r: number; c: string; lip: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x} cy={y - r * 0.5} rx={r * 0.32} ry={r * 0.55} fill={c} transform={`rotate(${a} ${x} ${y})`} />)}
      <ellipse cx={x} cy={y + r * 0.15} rx={r * 0.25} ry={r * 0.3} fill={lip} />
    </g>
  );
}

/** A corner cluster in the chosen floral style. `flip` mirrors it. */
export function FloralCluster({ kind, x, y, s, c, flipX = 1, flipY = 1 }: { kind: Florals; x: number; y: number; s: number; c: DesignColors; flipX?: number; flipY?: number }) {
  if (kind === "none") return null;
  const green = c.floralB;
  const leafy = mix(green, "#ffffff", 0.15);
  const body = (() => {
    switch (kind) {
      case "roses":
        return (
          <>
            <Leaf x={20} y={170} s={2.4} rot={-60} c={leafy} />
            <Leaf x={150} y={40} s={2.2} rot={5} c={leafy} />
            <Leaf x={250} y={130} s={1.6} rot={35} c={mix(green, "#ffffff", 0.35)} />
            <Leaf x={40} y={300} s={1.5} rot={-85} c={mix(green, "#ffffff", 0.35)} />
            <Rose x={120} y={120} r={72} c={c.floralA} ink={c.ink} />
            <Rose x={235} y={55} r={44} c={mix(c.floralA, "#ffffff", 0.35)} ink={c.ink} />
            <Rose x={45} y={245} r={40} c={mix(c.accent, "#ffffff", 0.45)} ink={c.ink} />
            {[0, 1, 2, 3].map((k) => <circle key={k} cx={210 + k * 28} cy={190 + (k % 2) * 18} r="7" fill={c.accent} opacity="0.75" />)}
          </>
        );
      case "wildflowers":
        return (
          <>
            <Sprig x={60} y={330} len={300} rot={30} c={green} flower={c.floralA} />
            <Sprig x={30} y={300} len={240} rot={60} c={green} flower={mix(c.floralA, "#ffffff", 0.3)} />
            <Leaf x={30} y={120} s={1.6} rot={-40} c={leafy} />
            <Leaf x={120} y={40} s={1.5} rot={10} c={leafy} />
            <Daisy x={95} y={110} r={48} c="#ffffff" center={c.accent} />
            <Daisy x={190} y={60} r={34} c={mix(c.floralA, "#ffffff", 0.5)} center={c.accent} />
            <Daisy x={60} y={200} r={30} c="#ffffff" center={c.accent} />
          </>
        );
      case "eucalyptus":
        return (
          <>
            <path d="M0 330C80 250 170 140 320 20" stroke={green} strokeWidth="4" fill="none" />
            {Array.from({ length: 9 }, (_, i) => (
              <circle key={i} cx={30 + i * 33} cy={300 - i * 33 + (i % 2 ? 22 : -22)} r={24 - i} fill={i % 2 ? leafy : mix(green, "#ffffff", 0.4)} opacity="0.9" />
            ))}
          </>
        );
      case "lotus":
        return (
          <>
            <Leaf x={20} y={200} s={2} rot={-30} c={leafy} />
            <Leaf x={130} y={60} s={1.8} rot={15} c={leafy} />
            <LotusFlower x={140} y={170} s={1.5} c={c.floralA} line={c.accent} />
            <LotusFlower x={60} y={70} s={0.8} c={mix(c.floralA, "#ffffff", 0.3)} line={c.accent} />
          </>
        );
      case "orchids":
        return (
          <>
            <path d="M10 320C60 220 140 120 300 40" stroke={green} strokeWidth="5" fill="none" />
            <Orchid x={120} y={150} r={70} c={c.floralA} lip={c.accent} />
            <Orchid x={220} y={80} r={46} c={mix(c.floralA, "#ffffff", 0.3)} lip={c.accent} />
            <Orchid x={50} y={260} r={42} c={mix(c.floralA, "#ffffff", 0.2)} lip={c.accent} />
          </>
        );
    }
  })();
  return <g transform={`translate(${x} ${y}) scale(${s * flipX} ${s * flipY})`}>{body}</g>;
}

/** A ring of florals (used around a monogram or a photo). */
export function Wreath({ cx, cy, r, kind, c }: { cx: number; cy: number; r: number; kind: Florals; c: DesignColors }) {
  const n = 14;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.floralB} strokeWidth="5" opacity="0.7" />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = r1(cx + Math.cos(a) * r);
        const y = r1(cy + Math.sin(a) * r);
        const deg = r1((a * 180) / Math.PI + 90);
        return i % 3 === 0 && kind !== "eucalyptus"
          ? kind === "lotus" ? <LotusFlower key={i} x={x} y={y} s={0.5} c={c.floralA} line={c.accent} />
            : kind === "wildflowers" ? <Daisy key={i} x={x} y={y} r={26} c="#ffffff" center={c.accent} />
              : <Rose key={i} x={x} y={y} r={30} c={i % 2 ? c.floralA : mix(c.floralA, "#ffffff", 0.35)} ink={c.ink} />
          : <Leaf key={i} x={x} y={y} s={1.1} rot={deg} c={i % 2 ? c.floralB : mix(c.floralB, "#ffffff", 0.3)} />;
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Borders                                                             */
/* ------------------------------------------------------------------ */

function KandyanCurl({ x, y, s, c, flip = 1, rot = 0 }: { x: number; y: number; s: number; c: string; flip?: number; rot?: number }) {
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${rot}) scale(${s * flip} ${s})`} fill="none" stroke={c} strokeWidth={2.2 / s} strokeLinecap="round">
      <path d="M0 0C10-14 30-14 34 0C37 10 26 16 20 9C15 4 22-2 26 2" />
      <path d="M34 0C44-10 58-6 60 4" />
      <circle cx="60" cy="6" r="2.4" fill={c} stroke="none" />
    </g>
  );
}

export function Border({ kind, c, foil, w = CARD_W, h = CARD_H }: { kind: Ornament; c: DesignColors; foil: string; w?: number; h?: number }) {
  const gold = `url(#${foil})`;
  switch (kind) {
    case "double":
      return (
        <g fill="none">
          <rect x="48" y="48" width={w - 96} height={h - 96} stroke={gold} strokeWidth="6" />
          <rect x="66" y="66" width={w - 132} height={h - 132} stroke={c.accent} strokeWidth="1.6" />
        </g>
      );
    case "thin":
      return <rect x="60" y="60" width={w - 120} height={h - 120} fill="none" stroke={c.accent} strokeWidth="1.6" />;
    case "floral":
      return <rect x="56" y="56" width={w - 112} height={h - 112} rx="40" fill="none" stroke={c.accent} strokeWidth="2.4" strokeDasharray="1 14" strokeLinecap="round" />;
    case "royal": {
      const corner = (x: number, y: number, sx: number, sy: number, k: string) => (
        <g key={k} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={gold} strokeWidth="4">
          <path d="M0 140V40Q0 0 40 0H140" />
          <path d="M22 120V52Q22 22 52 22H120" strokeWidth="2" />
          <path d="M40 40m-22 0a22 22 0 1 0 44 0a22 22 0 1 0 -44 0" fill={gold} stroke="none" opacity="0.9" />
          <path d="M70 30C90 10 120 18 116 40C112 56 92 54 94 42" strokeWidth="2.4" />
          <path d="M30 70C10 90 18 120 40 116C56 112 54 92 42 94" strokeWidth="2.4" />
        </g>
      );
      return (
        <g>
          <rect x="70" y="70" width={w - 140} height={h - 140} fill="none" stroke={gold} strokeWidth="3" />
          <rect x="88" y="88" width={w - 176} height={h - 176} fill="none" stroke={c.accent} strokeWidth="1.2" />
          {corner(48, 48, 1, 1, "tl")}{corner(w - 48, 48, -1, 1, "tr")}{corner(48, h - 48, 1, -1, "bl")}{corner(w - 48, h - 48, -1, -1, "br")}
        </g>
      );
    }
    case "kandyan": {
      const curls: ReactNode[] = [];
      for (let x = 160; x < w - 160; x += 118) {
        const flip = Math.round(x / 118) % 2 ? 1 : -1;
        curls.push(<KandyanCurl key={`t${x}`} x={x} y={92} s={1.2} c={c.accent} flip={flip} />);
        curls.push(<KandyanCurl key={`b${x}`} x={x} y={h - 92} s={1.2} c={c.accent} flip={-flip} rot={180} />);
      }
      return (
        <g>
          <rect x="44" y="44" width={w - 88} height={h - 88} fill="none" stroke={gold} strokeWidth="7" />
          <rect x="60" y="60" width={w - 120} height={h - 120} fill="none" stroke={c.ink} strokeWidth="1.4" />
          <rect x="128" y="128" width={w - 256} height={h - 256} fill="none" stroke={c.accent} strokeWidth="1.6" strokeDasharray="4 12" />
          {curls}
          {[[96, 96], [w - 96, 96], [96, h - 96], [w - 96, h - 96]].map(([x, y], k) => (
            <g key={k}><circle cx={x} cy={y} r="34" fill={c.card} stroke={gold} strokeWidth="5" /><circle cx={x} cy={y} r="13" fill={c.ink} /></g>
          ))}
        </g>
      );
    }
    case "deco": {
      const stepped = (x: number, y: number, sx: number, sy: number, k: string) => (
        <g key={k} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={gold} strokeWidth="4">
          <path d="M0 220V60H60V0H220" />
          <path d="M24 200V84H84V24H200" strokeWidth="2" />
          <path d="M48 48L130 130" strokeWidth="2" />
          <circle cx="48" cy="48" r="9" fill={gold} stroke="none" />
        </g>
      );
      return (
        <g>
          <rect x="70" y="70" width={w - 140} height={h - 140} fill="none" stroke={gold} strokeWidth="2.4" />
          {stepped(50, 50, 1, 1, "tl")}{stepped(w - 50, 50, -1, 1, "tr")}{stepped(50, h - 50, 1, -1, "bl")}{stepped(w - 50, h - 50, -1, -1, "br")}
        </g>
      );
    }
    default:
      return null;
  }
}

/** Art-deco sunburst fan (gold foil design). */
export function Sunburst({ cx, cy, r, foil, c }: { cx: number; cy: number; r: number; foil: string; c: DesignColors }) {
  const rays = 17;
  return (
    <g>
      {Array.from({ length: rays }, (_, i) => {
        const a = Math.PI + (i / (rays - 1)) * Math.PI;
        return <line key={i} x1={cx} y1={cy} x2={r1(cx + Math.cos(a) * r)} y2={r1(cy + Math.sin(a) * r)} stroke={`url(#${foil})`} strokeWidth={i % 2 ? 2 : 5} />;
      })}
      <path d={`M${cx - r * 0.42} ${cy}A${r * 0.42} ${r * 0.42} 0 0 1 ${cx + r * 0.42} ${cy}Z`} fill={c.card} stroke={`url(#${foil})`} strokeWidth="5" />
      <line x1={cx - r - 40} x2={cx + r + 40} y1={cy} y2={cy} stroke={`url(#${foil})`} strokeWidth="4" />
    </g>
  );
}

/** Heraldic crest with the couple's initials (royal design). */
export function Crest({ cx, cy, s, text, foil, c, font }: { cx: number; cy: number; s: number; text: string; foil: string; c: DesignColors; font: string }) {
  const gold = `url(#${foil})`;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse key={i} cx={-120 - i * 6} cy={60 - i * 30} rx="12" ry="26" fill={gold} transform={`rotate(${-30 + i * 10} ${-120 - i * 6} ${60 - i * 30})`} />
          ))}
        </g>
      ))}
      <path d="M-90-110H90V10C90 80 40 120 0 140C-40 120-90 80-90 10Z" fill={c.card} stroke={gold} strokeWidth="7" />
      <path d="M-70-92H70V8C70 64 30 96 0 112C-30 96-70 64-70 8Z" fill="none" stroke={c.accent} strokeWidth="2" />
      <path d="M-46-150L-28-118H28L46-150L22-134L0-160L-22-134Z" fill={gold} />
      <text x="0" y="22" textAnchor="middle" fontSize="78" fontFamily={font} fill={c.ink}>{text}</text>
    </g>
  );
}

/** Small diamond-and-line divider. */
export function Divider({ cx, y, w, c, foil }: { cx: number; y: number; w: number; c: DesignColors; foil: string }) {
  return (
    <g>
      <line x1={cx - w / 2} x2={cx - 26} y1={y} y2={y} stroke={c.accent} strokeWidth="2" />
      <line x1={cx + 26} x2={cx + w / 2} y1={y} y2={y} stroke={c.accent} strokeWidth="2" />
      <path d={`M${cx} ${y - 14}L${cx + 14} ${y}L${cx} ${y + 14}L${cx - 14} ${y}Z`} fill={`url(#${foil})`} />
    </g>
  );
}
