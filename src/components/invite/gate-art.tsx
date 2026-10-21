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
/* Botanicals in relief                                                */
/* ------------------------------------------------------------------ */

/** A carved rose: a faint disc with petal ridges (alpha = height). */
function Rose({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  const w = Math.max(0.8, r * 0.13);
  return (
    <g>
      <circle cx={r1(x)} cy={r1(y)} r={r1(r)} fill={c} fillOpacity="0.55" />
      <path
        d={`M${r1(x)} ${r1(y)}m${r1(-r * 0.15)} 0a${r1(r * 0.15)} ${r1(r * 0.15)} 0 1 1 ${r1(r * 0.3)} 0a${r1(r * 0.32)} ${r1(r * 0.3)} 0 1 1 ${r1(-r * 0.62)} ${r1(r * 0.05)}a${r1(r * 0.5)} ${r1(r * 0.48)} 0 1 1 ${r1(r * 0.98)} ${r1(-r * 0.1)}a${r1(r * 0.68)} ${r1(r * 0.64)} 0 1 1 ${r1(-r * 1.32)} ${r1(r * 0.2)}`}
        fill="none" stroke={c} strokeWidth={r1(w)} strokeLinecap="round" />
      <circle cx={r1(x)} cy={r1(y)} r={r1(r * 0.12)} fill={c} />
    </g>
  );
}

function Leaf({ x, y, s, rot, c }: { x: number; y: number; s: number; rot: number; c: string }) {
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${r1(s * 10) / 10})`}>
      <path d="M0 0C6-6 16-6 22 0C16 6 6 6 0 0Z" fill={c} fillOpacity="0.7" />
      <path d="M1 0H20" stroke={c} strokeWidth="1.2" />
    </g>
  );
}

/** A cluster of roses and leaves scattered around a point. */
function Cluster({ x, y, spread, n, seed, t, size = 1 }: { x: number; y: number; spread: number; n: number; seed: number; t: GateTints; size?: number }) {
  const rand = rng(seed);
  const leaves: ReactNode[] = [];
  const roses: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * spread;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.8;
    leaves.push(<Leaf key={`l${i}`} x={px + (rand() - 0.5) * 10} y={py + (rand() - 0.5) * 10} s={(0.7 + rand() * 0.6) * size} rot={rand() * 360} c={t.leaf} />);
    roses.push(<Rose key={`r${i}`} x={px} y={py} r={(5 + rand() * 7) * size} c={t.rose} />);
  }
  return (
    <>
      <g>{leaves}</g>
      <g>{roses}</g>
    </>
  );
}

/** Roses following a path of points. */
function Garland({ points, seed, t, size = 1 }: { points: [number, number][]; seed: number; t: GateTints; size?: number }) {
  return (
    <>
      {points.map(([x, y], i) => <Cluster key={i} x={x} y={y} spread={10 * size} n={3} seed={seed + i * 7} t={t} size={size} />)}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Doors                                                               */
/* ------------------------------------------------------------------ */

/**
 * One door, sized for half a tall phone screen (viewBox 0 0 200 860). The
 * right door is the left one mirrored — inside each filtered group, because
 * Chrome renders lighting filters black in a mirrored coordinate system.
 */
export function Door({ ids, t, side }: { ids: GateIds; t: GateTints; side: "left" | "right" }) {
  const flip = side === "right" ? "translate(200 0) scale(-1 1)" : undefined;
  const lit = (children: ReactNode, soft?: boolean) => <g filter={`url(#${soft ? ids.reliefSoft : ids.relief})`}><g transform={flip}>{children}</g></g>;
  const arch: [number, number][] = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI + (i / 10) * Math.PI;
    return [100 + Math.cos(a) * 82, 236 + Math.sin(a) * 82];
  });
  const climb: [number, number][] = Array.from({ length: 8 }, (_, i) => [16 + (i % 2) * 7, 300 + i * 48]);
  const seed = side === "left" ? 0 : 6;
  return (
    <svg viewBox="0 0 200 860" preserveAspectRatio={side === "left" ? "xMaxYMid slice" : "xMinYMid slice"} className="mx-door-svg" aria-hidden="true">
      <rect width="200" height="860" fill={t.base} />
      <g transform={flip}>
        <path d="M30 640V236A70 70 0 0 1 170 236V640Z" fill={mix(t.base, t.ink, 0.05)} />
      </g>
      {lit(
        <g opacity="0.55">
          {[46, 72, 98, 124, 150].map((x, i) => <path key={x} d={`M${x} 640V${470 - (i % 2) * 50}C${x - 10} ${448 - (i % 2) * 50} ${x + 10} ${426 - (i % 2) * 50} ${x} ${404 - (i % 2) * 50}`} stroke={t.leaf} strokeWidth="6" fill="none" />)}
        </g>,
        true,
      )}
      {lit(
        <>
          <rect x="6" y="6" width="188" height="848" fill="none" stroke={t.carve} strokeWidth="5" />
          <rect x="14" y="14" width="172" height="832" fill="none" stroke={t.carve} strokeWidth="1.6" />
          <path d="M30 640V236A70 70 0 0 1 170 236V640Z" fill="none" stroke={t.carve} strokeWidth="6" />
          <path d="M40 640V236A60 60 0 0 1 160 236V640" fill="none" stroke={t.carve} strokeWidth="2" />
          <path d="M100 168V640M40 330H160M40 450H160M40 560H160" stroke={t.carve} strokeWidth="3" />
          <path d="M40 236A30 30 0 0 1 100 236M100 236A30 30 0 0 1 160 236" fill="none" stroke={t.carve} strokeWidth="2.4" />
          <circle cx="100" cy="202" r="15" fill="none" stroke={t.carve} strokeWidth="2.4" />
          <circle cx="100" cy="202" r="5" fill={t.carve} />
          <rect x="14" y="664" width="172" height="182" fill={`url(#${ids.lattice})`} />
          <rect x="14" y="664" width="172" height="182" fill="none" stroke={t.carve} strokeWidth="3" />
          <path d="M14 664H186" stroke={t.carve} strokeWidth="6" />
          <path d="M188 420V470" stroke={t.carve} strokeWidth="5" strokeLinecap="round" />
          <path d="M40 60C70 40 130 40 160 60M60 84C80 72 120 72 140 84" fill="none" stroke={t.carve} strokeWidth="2.2" />
        </>,
      )}
      {lit(
        <>
          <Garland points={arch} seed={11 + seed} t={t} size={1.3} />
          <Garland points={climb} seed={31 + seed} t={t} size={0.95} />
          <Cluster x={34} y={120} spread={34} n={10} seed={41 + seed} t={t} size={1.2} />
          <Cluster x={100} y={52} spread={22} n={6} seed={45 + seed} t={t} size={1.05} />
          <Cluster x={58} y={668} spread={50} n={14} seed={51 + seed} t={t} size={1.2} />
          <Cluster x={150} y={700} spread={36} n={9} seed={57 + seed} t={t} />
          <Cluster x={70} y={800} spread={40} n={10} seed={61 + seed} t={t} />
        </>,
      )}
      {/* Seam where the doors meet. */}
      <g transform={flip}><rect x="197" width="3" height="860" fill={mix(t.base, t.ink, 0.22)} opacity="0.6" /></g>
    </svg>
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

/* ------------------------------------------------------------------ */
/* Stage behind the doors                                              */
/* ------------------------------------------------------------------ */

function Column({ x, t, ids, seed }: { x: number; t: GateTints; ids: GateIds; seed: number }) {
  return (
    <g>
      <g filter={`url(#${ids.relief})`}>
        <rect x={x - 20} y="300" width="40" height="480" fill={t.carve} fillOpacity="0.55" />
        {[-12, -4, 4, 12].map((dx) => <path key={dx} d={`M${x + dx} 316V764`} stroke={t.carve} strokeWidth="3" />)}
        <path d={`M${x - 30} 300H${x + 30}V286H${x - 30}Z`} fill={t.carve} />
        <circle cx={x - 28} cy="292" r="7" fill="none" stroke={t.carve} strokeWidth="3" />
        <circle cx={x + 28} cy="292" r="7" fill="none" stroke={t.carve} strokeWidth="3" />
        <path d={`M${x - 26} 780H${x + 26}V798H${x - 26}Z`} fill={t.carve} />
      </g>
      <g filter={`url(#${ids.relief})`}>
        <Garland points={Array.from({ length: 9 }, (_, i) => [x + Math.sin(i * 1.3) * 16, 330 + i * 52] as [number, number])} seed={seed} t={t} size={1.1} />
      </g>
    </g>
  );
}

export function Stage({ ids, t, children }: { ids: GateIds; t: GateTints; children?: ReactNode }) {
  return (
    <svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" className="mx-stage-svg" aria-hidden="true">
      {/* Curtains */}
      <g>
        <path d="M0 0H150C138 160 96 380 52 520C78 620 60 760 0 860Z" fill={`url(#${ids.curtain})`} />
        <path d="M400 0H250C262 160 304 380 348 520C322 620 340 760 400 860Z" fill={`url(#${ids.curtain})`} />
        <g filter={`url(#${ids.reliefSoft})`} opacity="0.9">
          {[18, 44, 70, 96, 120].map((x, i) => <path key={x} d={`M${x} 0C${x - i * 2} 200 ${x - 30 - i * 10} 420 ${44 + i * 2} 520C${46 + i} 640 ${30 + i * 4} 760 ${x / 3} 860`} stroke={t.curtain} strokeWidth="5" fill="none" />)}
          {[382, 356, 330, 304, 280].map((x, i) => <path key={x} d={`M${x} 0C${x + i * 2} 200 ${x + 30 + i * 10} 420 ${356 - i * 2} 520C${354 - i} 640 ${370 - i * 4} 760 ${400 - (400 - x) / 3} 860`} stroke={t.curtain} strokeWidth="5" fill="none" />)}
        </g>
        {/* Tie-backs */}
        <g filter={`url(#${ids.relief})`}>
          <path d="M30 512C46 520 62 522 74 516" stroke={t.carve} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M370 512C354 520 338 522 326 516" stroke={t.carve} strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
        {/* Valance */}
        <g filter={`url(#${ids.reliefSoft})`}>
          <path d="M0 0H400V34C366 70 334 70 300 34C266 70 234 70 200 34C166 70 134 70 100 34C66 70 34 70 0 34Z" fill={t.curtain} />
          <path d="M0 26C34 60 66 60 100 26C134 60 166 60 200 26C234 60 266 60 300 26C334 60 366 60 400 26" stroke={t.carve} strokeWidth="3" fill="none" />
        </g>
      </g>

      <Column x={74} t={t} ids={ids} seed={71} />
      <Column x={326} t={t} ids={ids} seed={79} />

      {/* Arch over the card */}
      <g filter={`url(#${ids.relief})`}>
        <path d="M74 300V260A126 126 0 0 1 326 260V300" fill="none" stroke={t.carve} strokeWidth="11" />
        <path d="M92 300V262A108 108 0 0 1 308 262V300" fill="none" stroke={t.carve} strokeWidth="3" />
      </g>
      <g filter={`url(#${ids.relief})`}>
        <Cluster x={200} y={150} spread={60} n={20} seed={91} t={t} size={1.35} />
        <Cluster x={110} y={210} spread={30} n={8} seed={93} t={t} size={1.1} />
        <Cluster x={290} y={210} spread={30} n={8} seed={97} t={t} size={1.1} />
      </g>

      {/* Balustrade and rose beds */}
      <g filter={`url(#${ids.relief})`}>
        <rect x="0" y="796" width="400" height="64" fill={`url(#${ids.lattice})`} />
        <path d="M0 796H400" stroke={t.carve} strokeWidth="6" />
      </g>
      <g filter={`url(#${ids.relief})`}>
        <Cluster x={40} y={790} spread={48} n={14} seed={101} t={t} size={1.2} />
        <Cluster x={200} y={806} spread={70} n={16} seed={103} t={t} size={1.1} />
        <Cluster x={360} y={790} spread={48} n={14} seed={107} t={t} size={1.2} />
      </g>

      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Rings and golden light                                              */
/* ------------------------------------------------------------------ */

/** Soft rays of light around a point. */
export function Rays({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g style={{ mixBlendMode: "screen" }} opacity="0.55">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const w = i % 2 ? 0.05 : 0.09;
        const len = i % 2 ? 120 : 170;
        const p = (d: number, da: number) => `${r1(cx + Math.cos(a + da) * d)} ${r1(cy + Math.sin(a + da) * d)}`;
        return <path key={i} d={`M${cx} ${cy}L${p(len, -w)}L${p(len, w)}Z`} fill="#FFE6A6" opacity={i % 2 ? 0.5 : 0.8} />;
      })}
    </g>
  );
}

/** A golden beam from below (drawn in stage coordinates, centred on x=200). */
export function Beam({ ids, top }: { ids: GateIds; top: number }) {
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <rect x="120" y={top} width="160" height={860 - top} fill={`url(#${ids.beam})`} filter={`url(#${ids.blurWide})`} opacity="0.85" />
      <rect x="178" y={top} width="44" height={860 - top} fill={`url(#${ids.beam})`} filter={`url(#${ids.blur})`} />
      <rect x="194" y={top} width="12" height={860 - top} fill={`url(#${ids.beam})`} opacity="0.9" />
    </g>
  );
}

function Ring({ cx, cy, ids, gem }: { cx: number; cy: number; ids: GateIds; gem?: boolean }) {
  const R = 25;
  const r = 19;
  return (
    <g>
      <path d={`M${cx - R} ${cy}a${R} ${R} 0 1 0 ${R * 2} 0a${R} ${R} 0 1 0 ${-R * 2} 0ZM${cx - r} ${cy}a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0Z`}
        fill={`url(#${ids.gold})`} fillRule="evenodd" stroke={`url(#${ids.goldRim})`} strokeWidth="0.8" />
      <path d={`M${cx - R + 3} ${cy - 6}A${R - 3} ${R - 3} 0 0 1 ${cx + 4} ${cy - R + 3}`} stroke="#FFFBEA" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85" />
      {gem && (
        <g transform={`translate(${cx} ${cy - R - 5})`}>
          <path d="M-7 0L-4-5H4L7 0L0 8Z" fill="#F4FBFF" stroke="#9FB8C8" strokeWidth="0.6" />
          <path d="M-7 0H7M-4-5L-2 0L0 8M4-5L2 0L0 8M-2 0L0-5L2 0" stroke="#B7CFDD" strokeWidth="0.5" fill="none" />
          <path d="M-5 3L-3 6L0 9" stroke={`url(#${ids.gold})`} strokeWidth="1.4" fill="none" />
          <path d="M5 3L3 6L0 9" stroke={`url(#${ids.gold})`} strokeWidth="1.4" fill="none" />
        </g>
      )}
    </g>
  );
}

/** Two interlocking wedding bands; the left one passes over the right at the bottom. */
export function Rings({ ids }: { ids: GateIds }) {
  return (
    <g>
      <defs>
        <clipPath id={ids.clipA}><rect x="-40" y="2" width="80" height="40" /></clipPath>
      </defs>
      <Ring cx={-13} cy={0} ids={ids} />
      <g transform="rotate(14 13 0)"><Ring cx={13} cy={0} ids={ids} gem /></g>
      {/* Re-draw the lower half of the left ring on top to interlock them. */}
      <g clipPath={`url(#${ids.clipA})`}><Ring cx={-13} cy={0} ids={ids} /></g>
    </g>
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

/** A carved corner scroll for frames (viewBox 0 0 80 80, top-left corner). */
export function CornerScroll({ ids, t, className, fx, fy }: { ids: GateIds; t: GateTints; className?: string; fx?: boolean; fy?: boolean }) {
  const f = fx || fy ? `translate(${fx ? 80 : 0} ${fy ? 80 : 0}) scale(${fx ? -1 : 1} ${fy ? -1 : 1})` : undefined;
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <g filter={`url(#${ids.relief})`}><g transform={f}>
        <path d="M6 74V30C6 16 16 6 30 6H74" fill="none" stroke={t.carve} strokeWidth="4" />
        <path d="M14 70V34C14 22 22 14 34 14H70" fill="none" stroke={t.carve} strokeWidth="1.6" />
        <path d="M22 30C22 22 30 20 34 24C38 28 34 34 30 32C27 31 28 27 31 27" fill="none" stroke={t.carve} strokeWidth="2.6" />
        <Rose x={20} y={20} r={9} c={t.rose} />
        <Leaf x={30} y={30} s={0.8} rot={45} c={t.leaf} />
      </g></g>
    </svg>
  );
}

/** A crest of roses over a frame (viewBox 0 0 240 90). */
export function Crest({ ids, t, className }: { ids: GateIds; t: GateTints; className?: string }) {
  return (
    <svg viewBox="0 0 240 90" className={className} aria-hidden="true">
      <g filter={`url(#${ids.relief})`}>
        <path d="M10 86C40 86 60 60 120 40C180 60 200 86 230 86" fill="none" stroke={t.carve} strokeWidth="4" />
        <path d="M60 80C70 64 90 52 120 50C150 52 170 64 180 80" fill="none" stroke={t.carve} strokeWidth="1.8" />
        <path d="M96 56C96 44 108 40 112 46C115 51 109 56 106 52M144 56C144 44 132 40 128 46C125 51 131 56 134 52" fill="none" stroke={t.carve} strokeWidth="2.4" />
      </g>
      <g filter={`url(#${ids.relief})`}>
        <Cluster x={120} y={34} spread={26} n={9} seed={131} t={t} size={1.1} />
      </g>
    </svg>
  );
}

/** A carved column with roses, for the sides of the countdown (viewBox 0 0 60 220). */
export function SideColumn({ ids, t, className, flip }: { ids: GateIds; t: GateTints; className?: string; flip?: boolean }) {
  const f = flip ? "translate(60 0) scale(-1 1)" : undefined;
  return (
    <svg viewBox="0 0 60 220" className={className} aria-hidden="true">
      <g filter={`url(#${ids.relief})`}><g transform={f}>
        <rect x="18" y="26" width="24" height="170" fill={t.carve} fillOpacity="0.5" />
        {[22, 28, 34, 38].map((x) => <path key={x} d={`M${x} 32V190`} stroke={t.carve} strokeWidth="2" />)}
        <path d="M10 26H50V16H10Z" fill={t.carve} />
        <path d="M12 196H48V210H12Z" fill={t.carve} />
      </g></g>
      <g filter={`url(#${ids.relief})`}><g transform={f}>
        <Garland points={[[30, 20], [24, 60], [36, 100], [24, 140], [34, 186]]} seed={151} t={t} size={0.85} />
      </g></g>
    </svg>
  );
}

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

/** Small envelope for "there is a message for you" (viewBox 0 0 160 120). */
export function MiniEnvelope({ ids, t, open }: { ids: GateIds; t: GateTints; open: boolean }) {
  return (
    <svg viewBox="0 0 160 120" className="mx-mini-env" aria-hidden="true">
      <rect x="10" y="30" width="140" height="84" rx="4" fill={mix(t.base, t.ink, 0.06)} />
      {/* Once open, the flap sits behind the letter. */}
      <path className={`mx-mini-backflap${open ? " is-open" : ""}`} d="M10 30L80 -20L150 30Z" fill={mix(t.base, t.ink, 0.04)} stroke={mix(t.base, t.ink, 0.2)} strokeWidth="0.8" />
      {/* The letter rises when opened. */}
      <g className={`mx-mini-letter${open ? " is-open" : ""}`}>
        <rect x="22" y="36" width="116" height="70" rx="2" fill={t.card} stroke={t.gold} strokeOpacity="0.5" strokeWidth="0.8" />
        <path d="M50 56H110M60 66H100M56 76H104" stroke={t.ink} strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <path d="M10 30V114H150V30L80 80Z" fill={t.base} />
      <g filter={`url(#${ids.relief})`}>
        <path d="M10 30V114H150V30" fill="none" stroke={t.carve} strokeWidth="3" />
        <path d="M10 114L66 72M150 114L94 72" stroke={t.carve} strokeWidth="2.4" />
        <path d="M14 108H146" stroke={t.carve} strokeWidth="1.2" />
      </g>
      <path className={`mx-mini-flap${open ? " is-open" : ""}`} d="M10 30L80 80L150 30Z" fill={mix(t.base, "#ffffff", 0.35)} stroke={mix(t.base, t.ink, 0.2)} strokeWidth="0.8" />
      <g filter={`url(#${ids.relief})`} className={`mx-mini-roses${open ? " is-open" : ""}`}>
        <Cluster x={80} y={76} spread={12} n={5} seed={171} t={t} size={0.85} />
        <Cluster x={24} y={102} spread={10} n={3} seed={173} t={t} size={0.7} />
        <Cluster x={138} y={104} spread={8} n={2} seed={179} t={t} size={0.6} />
      </g>
    </svg>
  );
}
