"use client";

import { useId, type ReactNode } from "react";
import type { DesignColors } from "@/lib/domain/invite-studio";
import { mix } from "@/lib/theme-colors";

/**
 * Artwork for the "garden gate" opening: carved-plaster doors tied with a
 * silk ribbon, a floral arch stage, two gold rings and a crystal backdrop.
 * Everything is drawn here (no photos) and tinted from the design colours.
 *
 * The sculpted look comes from an SVG lighting filter: each layer's alpha is
 * used as a height map, so strokes read as ridges and faint fills as hollows.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Deterministic pseudo-random numbers, so the art is identical everywhere. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function useGateIds() {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  return { relief: `rl${u}`, reliefSoft: `rs${u}`, silk: `sk${u}`, gold: `gd${u}`, goldRim: `gr${u}`, beam: `bm${u}`, blur: `bl${u}`, blurWide: `bw${u}`, halo: `hl${u}`, glass: `gl${u}`, curtain: `ct${u}`, lattice: `lt${u}`, clipA: `ca${u}`, card: `cd${u}` };
}
export type GateIds = ReturnType<typeof useGateIds>;

export interface GateTints {
  base: string;
  carve: string;
  rose: string;
  leaf: string;
  curtain: string;
  ribbon: string;
  ink: string;
  gold: string;
  card: string;
  shadow: string;
}

export function gateTints(c: DesignColors): GateTints {
  const base = mix(c.envelope, c.card, 0.35);
  return {
    base,
    carve: mix(base, "#ffffff", 0.25),
    rose: mix(c.floralA, base, 0.45),
    leaf: mix(c.floralB, base, 0.55),
    curtain: mix(c.liner, c.card, 0.35),
    ribbon: mix(c.card, "#ffffff", 0.5),
    ink: c.ink,
    gold: c.accent,
    card: c.card,
    shadow: mix(c.ink, c.envelope, 0.55),
  };
}

/** Shared filters and gradients. */
export function GateDefs({ ids, t }: { ids: GateIds; t: GateTints }) {
  return (
    <defs>
      {/* Carved plaster: alpha as height, lit from the top left. */}
      <filter id={ids.relief} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="h" />
        <feDiffuseLighting in="h" surfaceScale="2.6" diffuseConstant="1.32" lightingColor="#ffffff" result="d">
          <feDistantLight azimuth="235" elevation="50" />
        </feDiffuseLighting>
        <feSpecularLighting in="h" surfaceScale="2.6" specularConstant="0.5" specularExponent="22" lightingColor="#ffffff" result="s">
          <feDistantLight azimuth="235" elevation="55" />
        </feSpecularLighting>
        <feComposite in="d" in2="SourceAlpha" operator="in" result="d2" />
        <feComposite in="s" in2="SourceAlpha" operator="in" result="s2" />
        <feBlend in="SourceGraphic" in2="d2" mode="multiply" result="lit" />
        <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="shine" />
        <feDropShadow dx="0.6" dy="1.2" stdDeviation="1" floodColor={t.shadow} floodOpacity="0.32" />
      </filter>
      <filter id={ids.reliefSoft} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="h" />
        <feDiffuseLighting in="h" surfaceScale="3.2" diffuseConstant="1.3" lightingColor="#ffffff" result="d">
          <feDistantLight azimuth="235" elevation="48" />
        </feDiffuseLighting>
        <feComposite in="d" in2="SourceAlpha" operator="in" result="d2" />
        <feBlend in="SourceGraphic" in2="d2" mode="multiply" />
      </filter>
      <filter id={ids.blur} x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="7" /></filter>
      <filter id={ids.blurWide} x="-80%" y="-10%" width="260%" height="120%"><feGaussianBlur stdDeviation="18" /></filter>

      <linearGradient id={ids.silk} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix(t.ribbon, t.ink, 0.1)} />
        <stop offset="0.28" stopColor="#ffffff" />
        <stop offset="0.55" stopColor={mix(t.ribbon, t.ink, 0.06)} />
        <stop offset="0.8" stopColor="#ffffff" />
        <stop offset="1" stopColor={mix(t.ribbon, t.ink, 0.16)} />
      </linearGradient>
      <linearGradient id={ids.gold} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8A6526" />
        <stop offset="0.22" stopColor="#F6E2A6" />
        <stop offset="0.42" stopColor="#C9A048" />
        <stop offset="0.6" stopColor="#FFF4CF" />
        <stop offset="0.8" stopColor="#B88A34" />
        <stop offset="1" stopColor="#6E4E1C" />
      </linearGradient>
      <linearGradient id={ids.goldRim} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5C3F12" />
        <stop offset="0.5" stopColor="#D9B567" />
        <stop offset="1" stopColor="#5C3F12" />
      </linearGradient>
      <linearGradient id={ids.beam} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#FFD98A" stopOpacity="0" />
        <stop offset="0.35" stopColor="#FFD98A" stopOpacity="0.55" />
        <stop offset="0.8" stopColor="#FFF3D1" stopOpacity="0.9" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={ids.halo}>
        <stop offset="0" stopColor="#FFF6DA" stopOpacity="0.95" />
        <stop offset="0.45" stopColor="#F5CF7A" stopOpacity="0.45" />
        <stop offset="1" stopColor="#F5CF7A" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={ids.curtain} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={mix(t.curtain, t.ink, 0.08)} />
        <stop offset="0.5" stopColor={t.curtain} />
        <stop offset="1" stopColor={mix(t.curtain, "#ffffff", 0.4)} />
      </linearGradient>
      <pattern id={ids.lattice} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0H16M0 0V16" stroke={t.carve} strokeWidth="2.4" fill="none" />
      </pattern>
    </defs>
  );
}

/* ------------------------------------------------------------------ */
/* Ribbon                                                              */
/* ------------------------------------------------------------------ */

/** The silk band across both doors (viewBox 0 0 400 40). */
export function RibbonBand({ ids, t, half }: { ids: GateIds; t: GateTints; half: "left" | "right" }) {
  const d = half === "left" ? "M0 6C60 2 120 10 200 8V32C120 34 60 28 0 34Z" : "M200 8C280 10 340 2 400 6V34C340 28 280 34 200 32Z";
  return (
    <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="mx-band-svg" aria-hidden="true">
      <path d={d} fill={`url(#${ids.silk})`} />
      <path d={d} fill="none" stroke={mix(t.ribbon, t.ink, 0.2)} strokeWidth="0.6" />
    </svg>
  );
}

/** The bow, with loops, knot and frayed tails (viewBox 0 0 200 200). */
export function RibbonBow({ ids, t }: { ids: GateIds; t: GateTints }) {
  const edge = mix(t.ribbon, t.ink, 0.22);
  const fold = mix(t.ribbon, t.ink, 0.12);
  return (
    <svg viewBox="0 0 200 200" className="mx-bow-svg" aria-hidden="true">
      <g className="mx-bow-tails">
        <path d="M92 92C80 120 62 150 40 186L58 192C74 160 90 126 100 98Z" fill={`url(#${ids.silk})`} stroke={edge} strokeWidth="0.8" />
        <path d="M108 92C122 122 140 150 168 182L150 190C130 160 112 128 100 98Z" fill={`url(#${ids.silk})`} stroke={edge} strokeWidth="0.8" />
        <path d="M40 186l3 4 3-4 3 5 3-4 3 5" stroke={edge} strokeWidth="0.8" fill="none" />
        <path d="M150 190l3-4 3 5 3-4 3 5 3-4" stroke={edge} strokeWidth="0.8" fill="none" />
      </g>
      <g className="mx-bow-loops">
        <path d="M100 96C78 66 30 50 18 78C8 104 54 116 100 104Z" fill={`url(#${ids.silk})`} stroke={edge} strokeWidth="0.8" />
        <path d="M100 96C122 66 170 50 182 78C192 104 146 116 100 104Z" fill={`url(#${ids.silk})`} stroke={edge} strokeWidth="0.8" />
        <path d="M96 98C70 80 40 72 30 82" stroke={fold} strokeWidth="1.4" fill="none" />
        <path d="M104 98C130 80 160 72 170 82" stroke={fold} strokeWidth="1.4" fill="none" />
        <ellipse cx="100" cy="100" rx="12" ry="14" fill={`url(#${ids.silk})`} stroke={edge} strokeWidth="0.8" />
        {/* Tiny pearls on the knot. */}
        {[[-4, -5], [4, -4], [0, 2], [-5, 5], [5, 6]].map(([dx, dy], i) => <circle key={i} cx={100 + dx} cy={100 + dy} r="1.8" fill="#ffffff" stroke={edge} strokeWidth="0.4" />)}
      </g>
    </svg>
  );
}

export function Sparkle({ x, y, s, className, style }: { x: number; y: number; s: number; className?: string; style?: React.CSSProperties }) {
  return <path className={className} style={style} d={`M${x} ${y - s}L${x + s * 0.22} ${y - s * 0.22}L${x + s} ${y}L${x + s * 0.22} ${y + s * 0.22}L${x} ${y + s}L${x - s * 0.22} ${y + s * 0.22}L${x - s} ${y}L${x - s * 0.22} ${y - s * 0.22}Z`} fill="#FFFBEA" />;
}

/* ------------------------------------------------------------------ */
/* Crystal backdrop                                                    */
/* ------------------------------------------------------------------ */

export function CrystalBackdrop({ c }: { c: DesignColors }) {
  const rand = rng(7);
  const cols = 6;
  const rows = 12;
  const w = 400 / cols;
  const h = 860 / rows;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: [number, number][] = [];
    for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols;
      const edgeY = j === 0 || j === rows;
      row.push([r1(i * w + (edgeX ? 0 : (rand() - 0.5) * w * 0.8)), r1(j * h + (edgeY ? 0 : (rand() - 0.5) * h * 0.8))]);
    }
    pts.push(row);
  }
  const tints = [
    mix(c.background, "#ffffff", 0.75),
    mix(c.background, "#ffffff", 0.35),
    c.background,
    mix(c.background, c.floralA, 0.45),
    mix(c.background, c.accent, 0.18),
    mix(c.background, "#ffffff", 0.9),
    mix(c.background, c.liner, 0.35),
  ];
  const facets: ReactNode[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [a, b, cc, d] = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
      const flip = rand() > 0.5;
      const tri = flip ? [[a, b, cc], [a, cc, d]] : [[a, b, d], [b, cc, d]];
      tri.forEach((p, k) => facets.push(<polygon key={`${i}-${j}-${k}`} points={p.map((q) => q.join(",")).join(" ")} fill={tints[Math.floor(rand() * tints.length)]} />));
    }
  }
  return (
    <svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" className="mx-crystal-svg" aria-hidden="true">
      <g stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.7">{facets}</g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Sketch icons for the day plan and the story (48×48, line art)       */
/* ------------------------------------------------------------------ */

export type SketchName = "bouquet" | "rings" | "glasses" | "dinner" | "cake" | "shoes" | "car" | "camera" | "heart" | "cups" | "plane" | "ringbox" | "home" | "lamp";

export function Sketch({ name, className }: { name: SketchName; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const body = (() => {
    switch (name) {
      case "bouquet": return <><circle cx="18" cy="14" r="5" {...p} /><circle cx="28" cy="12" r="5" {...p} /><circle cx="24" cy="21" r="5" {...p} /><circle cx="14" cy="22" r="4" {...p} /><circle cx="33" cy="20" r="4" {...p} /><path d="M20 26L24 44M24 26V44M28 26L24 44M18 32H30" {...p} /><path d="M17 31C14 35 13 38 16 40M31 31C34 35 35 38 32 40" {...p} /></>;
      case "rings": return <><circle cx="19" cy="28" r="9" {...p} /><circle cx="29" cy="28" r="9" {...p} /><path d="M26 16L29 12L32 16L29 19Z" {...p} /><path d="M27 9L26 7M31 9L32 7M29 8V5" {...p} /></>;
      case "glasses": return <><path d="M12 8H22C22 18 19 22 17 22C15 22 12 18 12 8Z" {...p} /><path d="M17 22V38M12 38H22" {...p} /><path d="M26 10H36C36 20 33 24 31 24C29 24 26 20 26 10Z" {...p} /><path d="M31 24V40M26 40H36" {...p} /><path d="M21 6L27 4M24 2V7" {...p} /></>;
      case "dinner": return <><circle cx="24" cy="26" r="11" {...p} /><circle cx="24" cy="26" r="7" {...p} /><path d="M8 14V22C8 24 10 25 10 25V40M10 14V21M12 14V22C12 24 10 25 10 25" {...p} /><path d="M38 14C35 16 35 24 38 26V40" {...p} /></>;
      case "cake": return <><path d="M12 40H36V30H12Z" {...p} /><path d="M15 30V22H33V30" {...p} /><path d="M18 22V15H30V22" {...p} /><path d="M12 34C16 36 20 32 24 34C28 36 32 32 36 34M15 25C19 27 23 23 27 25C30 27 32 24 33 25" {...p} /><path d="M24 15V10M22 8C22 6 24 4 24 4C24 4 26 6 26 8C26 10 22 10 22 8Z" {...p} /></>;
      case "shoes": return <><path d="M8 30C12 30 18 22 20 16C22 18 22 24 20 28C24 30 28 32 28 36H10C8 36 7 33 8 30Z" {...p} /><path d="M18 36L16 42" {...p} /><path d="M24 26C28 26 33 18 35 13C37 15 37 21 35 25C39 27 42 29 42 33H26" {...p} /><path d="M33 33L31 39" {...p} /></>;
      case "car": return <><path d="M6 30H42V24L36 22L31 15H17L12 22L6 24Z" {...p} /><circle cx="14" cy="32" r="4" {...p} /><circle cx="34" cy="32" r="4" {...p} /><path d="M17 15L15 22H33L30 15" {...p} /><path d="M40 22C44 20 44 16 42 14M42 26C46 28 46 32 44 34" {...p} /></>;
      case "camera": return <><rect x="8" y="16" width="32" height="22" rx="3" {...p} /><circle cx="24" cy="27" r="7" {...p} /><path d="M18 16L20 11H28L30 16" {...p} /></>;
      case "heart": return <path d="M24 40C10 30 6 22 10 15C13 10 20 10 24 16C28 10 35 10 38 15C42 22 38 30 24 40Z" {...p} />;
      case "cups": return <><path d="M8 20H22V30C22 34 19 36 15 36C11 36 8 34 8 30Z" {...p} /><path d="M22 23C26 23 26 29 22 29" {...p} /><path d="M26 22H40V32C40 36 37 38 33 38C29 38 26 36 26 32Z" {...p} /><path d="M12 16C12 13 14 13 14 10M17 16C17 13 19 13 19 10M31 18C31 15 33 15 33 12" {...p} /></>;
      case "plane": return <><path d="M6 26L42 12L30 38L24 28Z" {...p} /><path d="M24 28L42 12" {...p} /><path d="M8 38C14 36 16 40 22 38" {...p} /></>;
      case "ringbox": return <><path d="M10 26H38V40H10Z" {...p} /><path d="M10 26L14 14H34L38 26" {...p} /><circle cx="24" cy="31" r="4" {...p} /><path d="M22 26L24 23L26 26" {...p} /></>;
      case "home": return <><path d="M8 24L24 10L40 24" {...p} /><path d="M12 22V40H36V22" {...p} /><path d="M21 40V30H27V40" {...p} /><path d="M24 22C22 20 20 21 21 23L24 26L27 23C28 21 26 20 24 22Z" {...p} /></>;
      case "lamp": return <><path d="M24 6C27 10 27 13 24 16C21 13 21 10 24 6Z" {...p} /><path d="M14 20H34L30 24H18Z" {...p} /><path d="M24 24V38M16 38H32L34 42H14Z" {...p} /></>;
    }
  })();
  return <svg viewBox="0 0 48 48" className={className} aria-hidden="true">{body}</svg>;
}

/** Pick a sketch for a moment of the day from its title. */
export function sketchFor(title: string): SketchName {
  const t = title.toLowerCase();
  if (/poruwa|ceremony|vow|church|temple|kovil|ring/.test(t)) return "rings";
  if (/arriv|welcome|guest|reception/.test(t)) return "bouquet";
  if (/cocktail|drink|toast|champagne|bar/.test(t)) return "glasses";
  if (/cake/.test(t)) return "cake";
  if (/dinner|lunch|buffet|meal|food|breakfast/.test(t)) return "dinner";
  if (/danc|party|music|dj|band|entertain/.test(t)) return "shoes";
  if (/going|away|depart|leave|homecoming/.test(t)) return "car";
  if (/photo/.test(t)) return "camera";
  if (/lamp|oil|nekath|auspicious/.test(t)) return "lamp";
  return "heart";
}

/* ------------------------------------------------------------------ */
/* Ornaments                                                           */
/* ------------------------------------------------------------------ */

/** Line-art guests for the dress code. */
export function DressFigures({ className }: { className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const man = (x: number) => (
    <g key={`m${x}`} transform={`translate(${x} 0)`}>
      <circle cx="0" cy="14" r="6" {...p} />
      <path d="M-10 26L-12 60H12L10 26Z" {...p} />
      <path d="M-4 26L0 40L4 26M0 40V60" {...p} />
      <path d="M-12 30L-16 58M12 30L16 58" {...p} />
      <path d="M-7 60L-7 92M7 60L7 92M-11 92H-4M4 92H11" {...p} />
    </g>
  );
  const woman = (x: number) => (
    <g key={`w${x}`} transform={`translate(${x} 0)`}>
      <circle cx="0" cy="14" r="6" {...p} />
      <path d="M4 10C8 12 8 18 6 20" {...p} />
      <path d="M-6 26C-8 34-6 40-6 44C-14 60-18 80-20 92H20C18 80 14 60 6 44C6 40 8 34 6 26Z" {...p} />
      <path d="M-6 30L-12 52M6 30L12 52" {...p} />
      <path d="M-14 70C-6 74 6 74 14 70" {...p} />
    </g>
  );
  return (
    <svg viewBox="0 0 300 100" className={className} aria-hidden="true">
      {[woman(30), man(78), woman(130), man(174), woman(224), man(270)]}
    </svg>
  );
}
