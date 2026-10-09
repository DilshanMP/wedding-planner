import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * A traditional Sri Lankan Poruwa with the couple, drawn in SVG so it scales,
 * animates and exports cleanly. Used on the sign-in screen, as a loader, and
 * in the Poruwa Studio where couples dress the scene and add their photos.
 */

export type BrideOutfit = "kandyan" | "saree" | "gown";
export type GroomOutfit = "nilame" | "national" | "suit";
export type HallTheme = "ivory" | "wine" | "garden" | "evening";

export interface Face {
  /** Image URL (a data URL keeps exports self-contained). */
  src: string;
  /** 1 = the photo just fills the face circle. */
  zoom: number;
  /** Offset as a fraction of the face radius. */
  x: number;
  y: number;
}

export interface CoupleLook {
  brideOutfit: BrideOutfit;
  brideColor: string;
  brideAccent: string;
  groomOutfit: GroomOutfit;
  groomColor: string;
  groomAccent: string;
  brideSkin: string;
  groomSkin: string;
  brideFace?: Face | null;
  groomFace?: Face | null;
}

export const DEFAULT_LOOK: CoupleLook = {
  brideOutfit: "kandyan",
  brideColor: "#f8f1e2",
  brideAccent: "#c9a24a",
  groomOutfit: "nilame",
  groomColor: "#fbf7ee",
  groomAccent: "#c9a24a",
  brideSkin: "#c99a6e",
  groomSkin: "#b98a5e",
};

interface Theme {
  wall: string;
  wallShade: string;
  arch: string;
  drape: string;
  drapeShade: string;
  floor: string;
  carpet: string;
  trim: string;
  poruwa: string;
  roof: string;
  flower: string;
  flower2: string;
  leaf: string;
  glow: string;
}

export const THEMES: Record<HallTheme, Theme> = {
  ivory: { wall: "#f6efe3", wallShade: "#ece1cf", arch: "#efe3cf", drape: "#fffaf2", drapeShade: "#e7d8bd", floor: "#eadcc6", carpet: "#7b1e2b", trim: "#b8955c", poruwa: "#fffaf3", roof: "#f4e6c8", flower: "#fffdf7", flower2: "#c0392b", leaf: "#6f8f5a", glow: "#ffe7a8" },
  wine: { wall: "#5c1824", wallShade: "#4a121c", arch: "#6e1d2b", drape: "#8a2434", drapeShade: "#6a1826", floor: "#3d1018", carpet: "#c9a24a", trim: "#e2c07a", poruwa: "#fff6e8", roof: "#e9cf94", flower: "#fffaf0", flower2: "#e8b4b8", leaf: "#7f9a63", glow: "#ffd98a" },
  garden: { wall: "#e7efe2", wallShade: "#d8e4d0", arch: "#dce8d2", drape: "#ffffff", drapeShade: "#dfe8d8", floor: "#cfdcc4", carpet: "#f7f3ea", trim: "#9c7b45", poruwa: "#ffffff", roof: "#f2ead8", flower: "#ffffff", flower2: "#e89aa7", leaf: "#4a6a4c", glow: "#fff1c4" },
  evening: { wall: "#1d1a2b", wallShade: "#15131f", arch: "#26223a", drape: "#332b4a", drapeShade: "#272038", floor: "#191623", carpet: "#7b1e2b", trim: "#e6c27a", poruwa: "#f7efe0", roof: "#e6c27a", flower: "#fffaf0", flower2: "#d4707c", leaf: "#7f9a63", glow: "#ffd27a" },
};

export interface PoruwaSceneProps {
  look?: CoupleLook;
  theme?: HallTheme;
  /** Draw the wedding hall around the Poruwa. */
  hall?: boolean;
  /** Petals, lamp flames and lights move (respects reduced motion via CSS). */
  animated?: boolean;
  /** Couple walks in from the sides. Change `entranceKey` to replay. */
  entrance?: boolean;
  entranceKey?: number;
  /** Show the pirith thread glowing around joined hands. */
  thread?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Extra layers drawn over the scene (e.g. captions in exports). */
  children?: ReactNode;
  svgRef?: React.Ref<SVGSVGElement>;
}

/** Trig results can differ in the last digit between server and browser; round for stable hydration. */
const r2 = (n: number) => Math.round(n * 100) / 100;

const PETALS = Array.from({ length: 16 }, (_, i) => ({
  x: 40 + ((i * 97) % 720),
  delay: -((i * 1.37) % 9),
  dur: 8 + ((i * 13) % 7),
  size: 4 + (i % 3) * 1.5,
  hue: i % 3,
}));

export function PoruwaScene({ look = DEFAULT_LOOK, theme = "ivory", hall = true, animated = true, entrance = false, entranceKey = 0, thread = true, className, style, title, children, svgRef }: PoruwaSceneProps) {
  const t = THEMES[theme];
  const uid = useId().replace(/:/g, "");
  const anim = animated ? "ps-anim" : "";
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 600"
      className={[className, anim].filter(Boolean).join(" ")}
      style={style}
      role="img"
      aria-label={title ?? "A bride and groom standing on a decorated Poruwa"}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor={t.glow} stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.wallShade} />
          <stop offset="100%" stopColor={t.wall} />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.floor} />
          <stop offset="100%" stopColor={t.wallShade} />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3dc9b" />
          <stop offset="55%" stopColor="#c9a24a" />
          <stop offset="100%" stopColor="#9c7b35" />
        </linearGradient>
      </defs>

      {hall && <Hall t={t} uid={uid} evening={theme === "evening"} />}
      <Poruwa t={t} uid={uid} />

      <g className={entrance ? "ps-couple ps-enter" : "ps-couple"} key={entranceKey} transform="translate(400 470) scale(1.14) translate(-400 -470)">
        <g className={entrance ? "ps-enter-left" : undefined}>
          <Groom look={look} uid={uid} />
        </g>
        <g className={entrance ? "ps-enter-right" : undefined}>
          <Bride look={look} uid={uid} />
        </g>
        {/* Joined hands, with the pirith thread around the little fingers. */}
        <circle cx="400" cy="352" r="6.5" fill={look.groomSkin} />
        <circle cx="404" cy="350" r="6" fill={look.brideSkin} />
        {thread && <path className="ps-thread" d="M392 349 q8 -6 17 0 q-8 7 -17 0" fill="none" stroke="#fff6d6" strokeWidth="1.6" />}
      </g>

      <PoruwaFront t={t} uid={uid} />
      <Lamp x={140} t={t} uid={uid} />
      <Lamp x={660} t={t} uid={uid} />

      {animated && (
        <g aria-hidden="true">
          {PETALS.map((p, i) => (
            <ellipse
              key={i}
              className="ps-petal"
              cx={p.x}
              cy={-20}
              rx={p.size}
              ry={p.size * 0.6}
              fill={p.hue === 0 ? t.flower2 : p.hue === 1 ? "#fff8ec" : "#f3c6cc"}
              opacity="0.85"
              style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
            />
          ))}
        </g>
      )}
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hall                                                                */
/* ------------------------------------------------------------------ */

function Hall({ t, uid, evening }: { t: Theme; uid: string; evening: boolean }) {
  const swags = Array.from({ length: 8 }, (_, i) => i * 100);
  return (
    <g aria-hidden="true">
      <rect width="800" height="440" fill={`url(#${uid}-wall)`} />
      {/* Wall panels */}
      {[60, 740].map((x) => (
        <rect key={x} x={x - 30} y="120" width="60" height="320" rx="4" fill="none" stroke={t.trim} strokeOpacity="0.25" />
      ))}
      {/* Grand arch behind the Poruwa */}
      <path d="M170 440 V200 Q170 50 400 40 Q630 50 630 200 V440 Z" fill={t.arch} />
      <path d="M170 440 V200 Q170 50 400 40 Q630 50 630 200 V440" fill="none" stroke={t.trim} strokeWidth="3" strokeOpacity="0.7" />
      <path d="M186 440 V204 Q186 66 400 56 Q614 66 614 204 V440" fill="none" stroke={t.trim} strokeWidth="1" strokeOpacity="0.45" strokeDasharray="2 6" />
      {/* Floor */}
      <rect y="440" width="800" height="160" fill={`url(#${uid}-floor)`} />
      <path d="M0 440 H800" stroke={t.trim} strokeOpacity="0.35" />
      {[1, 2, 3].map((i) => (
        <path key={i} d={`M0 ${440 + i * 40} H800`} stroke={t.trim} strokeOpacity="0.08" />
      ))}
      {/* Carpet to the Poruwa */}
      <path d="M318 528 H482 L560 600 H240 Z" fill={t.carpet} />
      <path d="M326 528 L252 600 M474 528 L548 600" stroke={t.trim} strokeWidth="2" strokeOpacity="0.8" />
      {/* Side curtains */}
      <path d="M0 0 H110 Q90 160 120 300 Q70 330 60 440 H0 Z" fill={t.drape} />
      <path d="M800 0 H690 Q710 160 680 300 Q730 330 740 440 H800 Z" fill={t.drape} />
      <path d="M30 0 Q40 200 20 440 M70 0 Q80 150 55 300" stroke={t.drapeShade} strokeWidth="6" fill="none" opacity="0.7" />
      <path d="M770 0 Q760 200 780 440 M730 0 Q720 150 745 300" stroke={t.drapeShade} strokeWidth="6" fill="none" opacity="0.7" />
      <circle cx="110" cy="300" r="8" fill={t.trim} />
      <circle cx="690" cy="300" r="8" fill={t.trim} />
      {/* Top swags */}
      {swags.map((x) => (
        <path key={x} d={`M${x} 0 Q${x + 50} 48 ${x + 100} 0 Z`} fill={t.drape} stroke={t.drapeShade} strokeWidth="2" />
      ))}
      {swags.map((x) => (
        <circle key={x} cx={x} cy="4" r="5" fill={t.trim} />
      ))}
      {/* Chandeliers */}
      {[205, 595].map((x) => (
        <g key={x}>
          <path d={`M${x} 0 V36`} stroke={t.trim} strokeWidth="2" />
          <circle cx={x} cy="74" r="46" fill={`url(#${uid}-glow)`} className="ps-twinkle" />
          <path d={`M${x - 30} 56 Q${x} 82 ${x + 30} 56`} fill="none" stroke={t.trim} strokeWidth="3" />
          <path d={`M${x - 18} 44 Q${x} 62 ${x + 18} 44`} fill="none" stroke={t.trim} strokeWidth="2.5" />
          <circle cx={x} cy="40" r="5" fill={t.trim} />
          {[-30, -15, 0, 15, 30].map((dx) => (
            <g key={dx}>
              <path d={`M${x + dx} ${dx === 0 ? 70 : 62} v12`} stroke="#fff" strokeOpacity="0.7" />
              <circle cx={x + dx} cy={dx === 0 ? 86 : 78} r="2.6" fill="#fffbe9" />
            </g>
          ))}
          {[-24, 24].map((dx) => (
            <path key={dx} d={`M${x + dx} 48 v-8`} stroke={t.glow} strokeWidth="3" strokeLinecap="round" className="ps-flame" />
          ))}
        </g>
      ))}
      {/* Flower stands */}
      {[96, 704].map((x) => (
        <g key={x}>
          <path d={`M${x - 10} 520 L${x - 4} 420 H${x + 4} L${x + 10} 520 Z`} fill={t.trim} opacity="0.85" />
          <ellipse cx={x} cy="520" rx="18" ry="5" fill={t.trim} />
          <FlowerBall cx={x} cy={404} r={30} t={t} />
        </g>
      ))}
      {evening && (
        <g className="ps-twinkle-all">
          {Array.from({ length: 28 }, (_, i) => (
            <circle key={i} className="ps-twinkle" style={{ animationDelay: `${(i % 7) * -0.45}s` }} cx={14 + i * 28.5} cy={r2(44 + Math.sin(i * 1.3) * 10)} r="2.2" fill={t.glow} />
          ))}
        </g>
      )}
    </g>
  );
}

function FlowerBall({ cx, cy, r, t }: { cx: number; cy: number; r: number; t: Theme }) {
  const dots = Array.from({ length: 18 }, (_, i) => {
    const a = i * 2.4;
    const d = (r * 0.75 * ((i * 37) % 10)) / 10;
    return { x: r2(cx + Math.cos(a) * d), y: r2(cy + Math.sin(a) * d * 0.8), c: i % 4 === 0 ? t.flower2 : t.flower };
  });
  return (
    <g>
      <ellipse cx={cx} cy={cy + 4} rx={r} ry={r * 0.8} fill={t.leaf} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={r * 0.22} fill={d.c} stroke="#000" strokeOpacity="0.06" />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Poruwa                                                              */
/* ------------------------------------------------------------------ */

function Garland({ x1, x2, y, sag, t }: { x1: number; x2: number; y: number; sag: number; t: Theme }) {
  const n = 14;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return { x: r2(x1 + (x2 - x1) * u), y: r2(y + sag * 4 * u * (1 - u)) };
  });
  return (
    <g>
      <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + sag * 2} ${x2} ${y}`} fill="none" stroke={t.leaf} strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i % 3 === 0 ? 4 : 3} fill={i % 3 === 0 ? t.flower2 : t.flower} stroke="#000" strokeOpacity="0.07" />
      ))}
    </g>
  );
}

function Pillar({ x, top, w, t, uid }: { x: number; top: number; w: number; t: Theme; uid: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={top} width={w} height={470 - top} fill={t.poruwa} stroke={t.trim} strokeOpacity="0.5" />
      {[top + 8, top + 40, 300, 380, 454].map((y) => (
        <rect key={y} x={x - w / 2 - 2} y={y} width={w + 4} height="5" rx="2" fill={`url(#${uid}-gold)`} />
      ))}
      {/* Jasmine wrapped around the pillar */}
      <path d={`M${x - w / 2} ${top + 50} ${Array.from({ length: 9 }, (_, i) => `L${i % 2 ? x - w / 2 : x + w / 2} ${top + 70 + i * 26}`).join(" ")}`} fill="none" stroke={t.flower} strokeWidth="3" strokeDasharray="1 4" strokeLinecap="round" />
    </g>
  );
}

function Poruwa({ t, uid }: { t: Theme; uid: string }) {
  return (
    <g aria-hidden="true">
      {/* Back pillars */}
      <Pillar x={282} top={158} w={10} t={t} uid={uid} />
      <Pillar x={518} top={158} w={10} t={t} uid={uid} />
      {/* Back cloth */}
      <path d="M287 158 H513 V470 H287 Z" fill={t.poruwa} opacity="0.55" />
      <path d="M300 164 Q400 200 500 164" fill="none" stroke={t.trim} strokeOpacity="0.4" />
      {/* Upper platform (couple stands on it) */}
      <path d="M238 470 H562 L556 502 H244 Z" fill={t.poruwa} stroke={t.trim} strokeWidth="1.5" />
      <path d="M244 482 H556" stroke={`url(#${uid}-gold)`} strokeWidth="3" />
      {Array.from({ length: 15 }, (_, i) => (
        <path key={i} d={`M${258 + i * 20} 488 l6 6 l-6 6 l-6 -6 Z`} fill={t.trim} opacity="0.75" />
      ))}
    </g>
  );
}

/** Parts of the Poruwa that sit in front of the couple. */
function PoruwaFront({ t, uid }: { t: Theme; uid: string }) {
  return (
    <g aria-hidden="true">
      {/* Lower step */}
      <path d="M212 502 H588 L594 530 H206 Z" fill={t.poruwa} stroke={t.trim} strokeWidth="1.5" />
      <path d="M210 516 H590" stroke={`url(#${uid}-gold)`} strokeWidth="2.5" />
      {/* Front pillars */}
      <Pillar x={248} top={148} w={14} t={t} uid={uid} />
      <Pillar x={552} top={148} w={14} t={t} uid={uid} />
      <g transform="translate(0 -56)">
      {/* Roof */}
      <path d="M216 214 Q236 176 300 166 Q370 150 400 122 Q430 150 500 166 Q564 176 584 214 Z" fill={t.roof} stroke={t.trim} strokeWidth="2" />
      <path d="M232 204 Q300 176 400 150 Q500 176 568 204" fill="none" stroke={t.trim} strokeWidth="1.2" strokeOpacity="0.8" />
      <path d="M216 214 H584 V222 H216 Z" fill={`url(#${uid}-gold)`} />
      {/* Finial (kotha) */}
      <path d="M393 126 Q400 92 407 126 Z" fill={`url(#${uid}-gold)`} />
      <circle cx="400" cy="104" r="5" fill={`url(#${uid}-gold)`} />
      {/* Scalloped valance */}
      {Array.from({ length: 18 }, (_, i) => (
        <path key={i} d={`M${218 + i * 20.4} 222 q10.2 14 20.4 0`} fill={t.poruwa} stroke={t.trim} strokeWidth="1" />
      ))}
      {/* Hanging jasmine strings */}
      {Array.from({ length: 17 }, (_, i) => {
        const x = 228 + i * 20.4;
        const len = 14 + ((i * 7) % 4) * 6;
        return <path key={i} className="ps-sway" style={{ animationDelay: `${-i * 0.3}s` }} d={`M${x} 234 v${len}`} stroke={t.flower} strokeWidth="3" strokeDasharray="1 4" strokeLinecap="round" />;
      })}
      {/* Front garland between pillars */}
      <Garland x1={256} x2={544} y={238} sag={6} t={t} />
      </g>
      {/* Coconut-flower sprays (pol mal) and brass pots at the front corners */}
      {[226, 574].map((x) => (
        <g key={x}>
          {Array.from({ length: 9 }, (_, i) => {
            const a = -Math.PI / 2 + (i - 4) * 0.22;
            return <path key={i} d={`M${x} 470 Q${r2(x + Math.cos(a) * 20)} ${r2(470 + Math.sin(a) * 30)} ${r2(x + Math.cos(a) * 34)} ${r2(470 + Math.sin(a) * 62)}`} fill="none" stroke="#f3e4b8" strokeWidth="2" strokeLinecap="round" />;
          })}
          <path d={`M${x - 13} 470 Q${x - 16} 492 ${x} 496 Q${x + 16} 492 ${x + 13} 470 Z`} fill={`url(#${uid}-gold)`} />
          <ellipse cx={x} cy="470" rx="13" ry="4" fill="#9c7b35" />
        </g>
      ))}
    </g>
  );
}

function Lamp({ x, t, uid }: { x: number; t: Theme; uid: string }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy="372" r="34" fill={`url(#${uid}-glow)`} className="ps-twinkle" />
      <ellipse cx={x} cy="530" rx="22" ry="6" fill="#9c7b35" />
      <path d={`M${x - 16} 530 Q${x} 510 ${x + 16} 530 Z`} fill={`url(#${uid}-gold)`} />
      <rect x={x - 3} y="392" width="6" height="128" fill={`url(#${uid}-gold)`} />
      {[430, 470, 500].map((y) => (
        <ellipse key={y} cx={x} cy={y} rx="7" ry="3" fill={`url(#${uid}-gold)`} />
      ))}
      <path d={`M${x - 22} 388 Q${x} 404 ${x + 22} 388 Z`} fill={`url(#${uid}-gold)`} stroke={t.trim} strokeWidth="0.5" />
      <path d={`M${x - 4} 384 Q${x} 364 ${x + 4} 384 Z`} fill={`url(#${uid}-gold)`} />
      {[-16, -6, 6, 16].map((dx) => (
        <path key={dx} className="ps-flame" style={{ animationDelay: `${dx * 0.05}s` }} d={`M${x + dx} 386 q-3.5 -6 0 -13 q3.5 7 0 13 Z`} fill="#ffb238" stroke="#ffe27a" strokeWidth="0.8" />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

function Head({ cx, cy, r, skin, face, clipId, hair, bride }: { cx: number; cy: number; r: number; skin: string; face?: Face | null; clipId: string; hair: string; bride?: boolean }) {
  if (face) {
    const size = r * 2 * Math.max(1, face.zoom);
    return (
      <g>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <circle cx={cx} cy={cy} r={r + 1.5} fill="#fff" />
        <image href={face.src} x={cx - size / 2 + face.x * r} y={cy - size / 2 + face.y * r} width={size} height={size} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={skin} />
      {/* Hair */}
      {bride ? (
        <path d={`M${cx - r} ${cy - 1} Q${cx - r} ${cy - r - 4} ${cx} ${cy - r - 2} Q${cx + r} ${cy - r - 4} ${cx + r} ${cy - 1} Q${cx + r * 0.6} ${cy - r * 0.62} ${cx} ${cy - r * 0.7} Q${cx - r * 0.6} ${cy - r * 0.62} ${cx - r} ${cy - 1} Z`} fill={hair} />
      ) : (
        <path d={`M${cx - r} ${cy - 2} Q${cx - r} ${cy - r - 3} ${cx} ${cy - r - 1} Q${cx + r} ${cy - r - 3} ${cx + r} ${cy - 2} Q${cx + r * 0.7} ${cy - r * 0.55} ${cx} ${cy - r * 0.6} Q${cx - r * 0.7} ${cy - r * 0.55} ${cx - r} ${cy - 2} Z`} fill={hair} />
      )}
      {/* Gentle closed-eye smile */}
      <path d={`M${cx - 8} ${cy + 1} q3 3 6 0 M${cx + 2} ${cy + 1} q3 3 6 0`} fill="none" stroke="#3a2620" strokeWidth="1.4" strokeLinecap="round" />
      <path d={`M${cx - 4} ${cy + 8} q4 3.5 8 0`} fill="none" stroke="#7a3b30" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx={cx - 10} cy={cy + 6} r="2.6" fill="#e07a6a" opacity="0.28" />
      <circle cx={cx + 10} cy={cy + 6} r="2.6" fill="#e07a6a" opacity="0.28" />
    </g>
  );
}

function Groom({ look, uid }: { look: CoupleLook; uid: string }) {
  const c = look.groomColor;
  const a = look.groomAccent;
  const skin = look.groomSkin;
  const cx = 355;
  const head = <Head cx={cx} cy={262} r={19} skin={skin} face={look.groomFace} clipId={`${uid}-gface`} hair="#1d1513" />;
  const neck = <rect x={cx - 6} y="276" width="12" height="12" fill={skin} />;
  const shoes = <path d={`M${cx - 22} 470 q0 -8 10 -8 h6 v8 Z M${cx + 22} 470 q0 -8 -10 -8 h-6 v8 Z`} fill="#3a2a22" />;

  if (look.groomOutfit === "suit") {
    return (
      <g className="ps-breathe">
        {shoes}
        <path d={`M${cx - 20} 345 L${cx - 21} 464 H${cx - 3} L${cx} 360 L${cx + 3} 464 H${cx + 21} L${cx + 20} 345 Z`} fill={c} />
        {neck}
        <path d={`M${cx - 27} 292 Q${cx} 282 ${cx + 27} 292 L${cx + 24} 372 H${cx - 24} Z`} fill={c} />
        <path d={`M${cx - 9} 286 L${cx} 318 L${cx + 9} 286 Z`} fill="#fffdf8" />
        <path d={`M${cx - 3} 291 L${cx + 3} 291 L${cx + 4} 322 L${cx} 328 L${cx - 4} 322 Z`} fill={a} />
        <path d={`M${cx - 9} 286 L${cx - 2} 336 M${cx + 9} 286 L${cx + 2} 336`} stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
        <path d={`M${cx + 12} 300 h8 v4 h-8 Z`} fill={a} />
        <path d={`M${cx - 27} 292 Q${cx - 36} 296 ${cx - 35} 352 h9 L${cx - 22} 300`} fill={c} />
        <path d={`M${cx + 27} 292 Q${cx + 38} 300 ${cx + 41} 350 L${cx + 45} 350 L${cx + 40} 356 L${cx + 30} 352 L${cx + 22} 302`} fill={c} />
        <circle cx={cx - 31} cy="355" r="5" fill={skin} />
        {head}
      </g>
    );
  }

  if (look.groomOutfit === "national") {
    return (
      <g className="ps-breathe">
        {shoes}
        <path d={`M${cx - 22} 410 L${cx - 24} 464 H${cx + 24} L${cx + 22} 410 Z`} fill={c} />
        <path d={`M${cx - 23} 440 H${cx + 23}`} stroke={a} strokeWidth="3" />
        {neck}
        <path d={`M${cx - 26} 292 Q${cx} 282 ${cx + 26} 292 L${cx + 28} 420 H${cx - 28} Z`} fill={c} stroke="#000" strokeOpacity="0.08" />
        <path d={`M${cx} 288 V330`} stroke="#000" strokeOpacity="0.15" />
        {[300, 312, 324].map((y) => <circle key={y} cx={cx} cy={y} r="1.6" fill={a} />)}
        {/* Shawl over the shoulders */}
        <path d={`M${cx - 26} 292 Q${cx - 18} 330 ${cx - 22} 400 L${cx - 12} 400 Q${cx - 10} 330 ${cx - 6} 288 Z`} fill={a} opacity="0.92" />
        <path d={`M${cx + 26} 292 Q${cx + 18} 330 ${cx + 22} 400 L${cx + 12} 400 Q${cx + 10} 330 ${cx + 6} 288 Z`} fill={a} opacity="0.92" />
        <path d={`M${cx - 26} 292 Q${cx - 36} 300 ${cx - 34} 352 h9 L${cx - 22} 302`} fill={c} />
        <path d={`M${cx + 26} 292 Q${cx + 38} 300 ${cx + 41} 350 L${cx + 45} 350 L${cx + 40} 356 L${cx + 30} 352 L${cx + 22} 302`} fill={c} />
        <circle cx={cx - 30} cy="355" r="5" fill={skin} />
        {head}
      </g>
    );
  }

  // Kandyan Nilame dress: four-cornered hat, puffed sleeves, layered waist cloth.
  return (
    <g className="ps-breathe">
      {shoes}
      <path d={`M${cx - 26} 345 Q${cx - 48} 372 ${cx - 40} 404 Q${cx - 34} 436 ${cx - 30} 464 H${cx + 30} Q${cx + 34} 436 ${cx + 40} 404 Q${cx + 48} 372 ${cx + 26} 345 Z`} fill={c} stroke="#000" strokeOpacity="0.1" />
      {[360, 376, 392, 410, 428, 446].map((y, i) => (
        <path key={y} d={`M${cx - 38 + i} ${y} Q${cx} ${y + 8} ${cx + 38 - i} ${y}`} fill="none" stroke="#000" strokeOpacity="0.09" />
      ))}
      <path d={`M${cx - 30} 458 H${cx + 30}`} stroke={a} strokeWidth="5" />
      <path d={`M${cx - 30} 452 H${cx + 30}`} stroke={a} strokeWidth="1" strokeDasharray="2 3" />
      {neck}
      <path d={`M${cx - 24} 292 Q${cx} 284 ${cx + 24} 292 L${cx + 22} 348 H${cx - 22} Z`} fill={c} stroke="#000" strokeOpacity="0.1" />
      <path d={`M${cx} 290 V346`} stroke={a} strokeWidth="2" />
      {[298, 308, 318, 328, 338].map((y) => <circle key={y} cx={cx} cy={y} r="2" fill={a} />)}
      <path d={`M${cx - 16} 300 q6 10 0 20 M${cx + 16} 300 q-6 10 0 20`} stroke={a} strokeWidth="1.5" fill="none" />
      {/* Belt */}
      <rect x={cx - 25} y="342" width="50" height="9" rx="2" fill={`url(#${uid}-gold)`} />
      <circle cx={cx} cy="346.5" r="4" fill="#9e1b2a" stroke={a} />
      {/* Puffed sleeves and arms */}
      <ellipse cx={cx - 27} cy="298" rx="13" ry="12" fill={c} stroke={a} strokeWidth="1.5" />
      <ellipse cx={cx + 27} cy="298" rx="13" ry="12" fill={c} stroke={a} strokeWidth="1.5" />
      <path d={`M${cx - 36} 304 Q${cx - 40} 330 ${cx - 36} 350 h9 Q${cx - 30} 330 ${cx - 24} 306`} fill={c} />
      <path d={`M${cx + 34} 304 Q${cx + 40} 330 ${cx + 42} 348 L${cx + 46} 349 L${cx + 40} 356 L${cx + 30} 352 Q${cx + 30} 330 ${cx + 22} 306`} fill={c} />
      <path d={`M${cx - 36} 346 h9 M${cx + 32} 346 l9 1`} stroke={a} strokeWidth="2.5" />
      <circle cx={cx - 31} cy="355" r="5" fill={skin} />
      {head}
      {/* Four-cornered Toppiya hat */}
      <path d={`M${cx - 20} 250 L${cx - 24} 232 L${cx - 16} 238 L${cx - 8} 228 L${cx} 236 L${cx + 8} 228 L${cx + 16} 238 L${cx + 24} 232 L${cx + 20} 250 Z`} fill={`url(#${uid}-gold)`} stroke="#9c7b35" strokeWidth="0.8" />
      <rect x={cx - 21} y="246" width="42" height="7" rx="2" fill={c} stroke={a} />
      <path d={`M${cx} 236 V214`} stroke={`url(#${uid}-gold)`} strokeWidth="3" />
      <circle cx={cx} cy="212" r="4" fill={`url(#${uid}-gold)`} />
      <circle cx={cx} cy="242" r="2.5" fill="#9e1b2a" />
    </g>
  );
}

function Bride({ look, uid }: { look: CoupleLook; uid: string }) {
  const c = look.brideColor;
  const a = look.brideAccent;
  const skin = look.brideSkin;
  const cx = 445;
  const gold = `url(#${uid}-gold)`;
  const head = <Head cx={cx} cy={265} r={17} skin={skin} face={look.brideFace} clipId={`${uid}-bface`} hair="#1d1513" bride />;
  const bun = (
    <g>
      <circle cx={cx + 6} cy="250" r="12" fill="#1d1513" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={i} cx={r2(cx + 6 + Math.cos(i * 0.9) * 12)} cy={r2(250 + Math.sin(i * 0.9) * 12)} r="2.4" fill="#fffdf6" />
      ))}
    </g>
  );
  const neck = <rect x={cx - 5} y="278" width="10" height="11" fill={skin} />;
  const necklace = (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${cx - 9 - i * 2} 288 Q${cx} ${296 + i * 6} ${cx + 9 + i * 2} 288`} fill="none" stroke={gold} strokeWidth={i === 4 ? 2.6 : 1.8} />
      ))}
      <circle cx={cx} cy="321" r="3" fill="#9e1b2a" stroke="#c9a24a" />
    </g>
  );
  const jewels = (
    <g>
      {/* Nalal pata (forehead ornament) and earrings */}
      {!look.brideFace && <path d={`M${cx - 13} 254 Q${cx} 248 ${cx + 13} 254`} fill="none" stroke={gold} strokeWidth="2" />}
      <circle cx={cx} cy={look.brideFace ? 247 : 254} r="2.6" fill={gold} />
      <circle cx={cx - 17} cy="272" r="2.4" fill={gold} />
      <circle cx={cx + 17} cy="272" r="2.4" fill={gold} />
    </g>
  );
  const handToGroom = <path d={`M${cx - 22} 302 Q${cx - 34} 330 ${cx - 40} 348 L${cx - 44} 350 L${cx - 38} 356 L${cx - 30} 350 Q${cx - 22} 330 ${cx - 14} 306`} fill={skin} />;
  const otherArm = <path d={`M${cx + 20} 300 Q${cx + 28} 330 ${cx + 26} 356 h-6 Q${cx + 20} 330 ${cx + 14} 304`} fill={skin} />;
  const bangles = <path d={`M${cx - 38} 344 l6 3 M${cx - 37} 340 l6 3 M${cx + 20} 348 h6 M${cx + 20} 352 h6`} stroke={gold} strokeWidth="2" />;

  if (look.brideOutfit === "gown") {
    return (
      <g className="ps-breathe">
        {/* Veil */}
        <path d={`M${cx - 6} 244 Q${cx + 40} 260 ${cx + 52} 430 L${cx + 20} 430 Q${cx + 22} 330 ${cx + 6} 250 Z`} fill="#ffffff" opacity="0.55" />
        <path d={`M${cx - 18} 346 Q${cx - 52} 420 ${cx - 56} 468 H${cx + 58} Q${cx + 54} 420 ${cx + 18} 346 Z`} fill={c} stroke="#000" strokeOpacity="0.08" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${cx - 10 + i * 7} 350 Q${cx - 22 + i * 14} 410 ${cx - 36 + i * 24} 466`} fill="none" stroke="#000" strokeOpacity="0.06" />
        ))}
        <path d={`M${cx - 56} 464 Q${cx} 474 ${cx + 58} 464`} fill="none" stroke={a} strokeWidth="2" />
        {neck}
        <path d={`M${cx - 16} 290 Q${cx} 296 ${cx + 16} 290 L${cx + 18} 348 H${cx - 18} Z`} fill={c} stroke="#000" strokeOpacity="0.08" />
        <path d={`M${cx - 18} 346 Q${cx} 352 ${cx + 18} 346`} stroke={a} strokeWidth="3" fill="none" />
        {handToGroom}
        {otherArm}
        {necklace}
        {head}
        <path d={`M${cx - 11} 248 L${cx - 6} 240 L${cx} 246 L${cx + 6} 240 L${cx + 11} 248`} fill="none" stroke={gold} strokeWidth="2" />
        {bangles}
      </g>
    );
  }

  if (look.brideOutfit === "saree") {
    return (
      <g className="ps-breathe">
        {bun}
        {/* Pallu flowing behind */}
        <path d={`M${cx + 14} 292 Q${cx + 40} 330 ${cx + 38} 440 L${cx + 22} 446 Q${cx + 26} 360 ${cx + 6} 300 Z`} fill={c} opacity="0.85" />
        <path d={`M${cx - 20} 346 Q${cx - 28} 420 ${cx - 30} 468 H${cx + 30} Q${cx + 28} 420 ${cx + 20} 346 Z`} fill={c} stroke="#000" strokeOpacity="0.08" />
        {[-6, -2, 2, 6].map((d) => <path key={d} d={`M${cx + d} 360 L${cx + d * 1.6} 466`} stroke="#000" strokeOpacity="0.1" />)}
        <path d={`M${cx - 30} 462 H${cx + 30}`} stroke={a} strokeWidth="4" />
        {neck}
        <path d={`M${cx - 16} 288 Q${cx} 284 ${cx + 16} 288 L${cx + 17} 340 H${cx - 17} Z`} fill={a} />
        <rect x={cx - 17} y="326" width="34" height="20" fill={skin} />
        {/* Pallu across the chest */}
        <path d={`M${cx - 18} 348 L${cx + 18} 288 L${cx + 22} 296 L${cx - 4} 350 Z`} fill={c} />
        <path d={`M${cx + 18} 288 L${cx + 22} 296 L${cx - 4} 350`} fill="none" stroke={a} strokeWidth="2" />
        <path d={`M${cx - 20} 346 H${cx + 20}`} stroke={a} strokeWidth="3" />
        {handToGroom}
        {otherArm}
        {necklace}
        {head}
        {jewels}
        {bangles}
      </g>
    );
  }

  // Kandyan Osariya with the waist frill (pota) and layered necklaces.
  return (
    <g className="ps-breathe">
      {bun}
      <path d={`M${cx + 14} 292 Q${cx + 42} 330 ${cx + 40} 446 L${cx + 24} 450 Q${cx + 28} 360 ${cx + 6} 300 Z`} fill={c} stroke={a} strokeWidth="1.5" opacity="0.92" />
      <path d={`M${cx - 20} 360 Q${cx - 28} 420 ${cx - 30} 468 H${cx + 30} Q${cx + 28} 420 ${cx + 20} 360 Z`} fill={c} stroke="#000" strokeOpacity="0.08" />
      <path d={`M${cx - 30} 462 H${cx + 30}`} stroke={a} strokeWidth="5" />
      <path d={`M${cx - 30} 455 H${cx + 30}`} stroke={a} strokeWidth="1" strokeDasharray="2 3" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${cx - 18 + i * 12} 372 Q${cx - 16 + i * 14} 420 ${cx - 22 + i * 18} 466`} fill="none" stroke="#000" strokeOpacity="0.07" />)}
      {neck}
      <path d={`M${cx - 16} 288 Q${cx} 284 ${cx + 16} 288 L${cx + 17} 346 H${cx - 17} Z`} fill={a} />
      <path d={`M${cx - 16} 288 Q${cx} 300 ${cx + 16} 288`} fill={skin} />
      {/* Frill (pota) around the waist */}
      <path
        d={`M${cx - 22} 344 ${Array.from({ length: 6 }, (_, i) => `q3.7 ${i % 2 ? 22 : 24} 7.3 0`).join(" ")} L${cx + 22} 344 Z`}
        fill={c}
        stroke={a}
        strokeWidth="1.5"
      />
      <path d={`M${cx - 22} 344 H${cx + 22}`} stroke={gold} strokeWidth="3" />
      {/* Short puffed sleeves */}
      <ellipse cx={cx - 18} cy="296" rx="8" ry="8" fill={a} />
      <ellipse cx={cx + 18} cy="296" rx="8" ry="8" fill={a} />
      {handToGroom}
      {otherArm}
      {necklace}
      {head}
      {jewels}
      {/* Kandyan crown */}
      <path d={`M${cx - 12} 249 L${cx - 8} 241 L${cx - 4} 246 L${cx} 238 L${cx + 4} 246 L${cx + 8} 241 L${cx + 12} 249 Z`} fill={gold} />
      {bangles}
    </g>
  );
}
