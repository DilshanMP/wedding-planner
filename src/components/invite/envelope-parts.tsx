import { useId } from "react";
import { mix } from "@/lib/theme-colors";
import { readableOn, type DesignColors, type EnvelopeTexture, type FlapStyle, type LinerStyle, type SealStyle } from "@/lib/domain/invite-studio";

/**
 * Paper pieces of the envelope, each its own SVG layer so they can be
 * stacked around the card: back (with liner) · card · pocket · flap · seal.
 * Drawn in a 100 × 140 box (a portrait invitation pocket).
 */

export const ENV_RATIO = 1.4;
/** Flap height as a share of the envelope. */
export const FLAP_SHARE = 0.46;

const FLAP_PATH: Record<FlapStyle, string> = {
  pointed: "M0 0H100L54.5 59Q50 63 45.5 59Z",
  rounded: "M0 0H100C100 30 76 62 50 62C24 62 0 30 0 0Z",
  straight: "M0 0H100V40H0Z",
  scalloped: (() => {
    let d = "M0 0H100V34";
    const n = 6;
    for (let i = n; i > 0; i--) d += `A${(100 / n / 2).toFixed(3)} 9 0 0 1 ${(((i - 1) * 100) / n).toFixed(3)} 34`;
    return `${d}Z`;
  })(),
};

/** Where the seal sits (share of envelope height) for each flap. */
export const SEAL_AT: Record<FlapStyle, number> = { pointed: (58 / 64) * FLAP_SHARE, rounded: (60 / 64) * FLAP_SHARE, straight: (40 / 64) * FLAP_SHARE, scalloped: (40 / 64) * FLAP_SHARE };

function Texture({ id, kind, base }: { id: string; kind: EnvelopeTexture; base: string }) {
  const dark = mix(base, "#000000", 0.35);
  const light = mix(base, "#ffffff", 0.5);
  switch (kind) {
    case "linen":
      return (
        <pattern id={id} width="1.6" height="1.6" patternUnits="userSpaceOnUse">
          <path d="M0 0.4H1.6M0 1.2H1.6" stroke={dark} strokeWidth="0.12" opacity="0.18" />
          <path d="M0.4 0V1.6M1.2 0V1.6" stroke={light} strokeWidth="0.12" opacity="0.22" />
        </pattern>
      );
    case "kraft":
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          {[[1, 1], [4, 2], [2, 4.5], [5, 5], [3, 0.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.25 + (i % 2) * 0.15} fill={dark} opacity="0.3" />)}
        </pattern>
      );
    case "marble":
      return (
        <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 12C12 8 18 22 30 18S48 6 60 10M-4 38C10 30 20 48 34 42S52 30 64 36M8 60C14 50 26 56 34 52" stroke={dark} strokeWidth="0.35" fill="none" opacity="0.22" />
        </pattern>
      );
    default:
      return null;
  }
}

function Sheen({ id, kind, base }: { id: string; kind: EnvelopeTexture; base: string }) {
  if (kind === "foil") {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="52%" stopColor="#fff6dc" stopOpacity="0.32" />
        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
      </linearGradient>
    );
  }
  if (kind === "velvet") {
    return (
      <radialGradient id={id} cx="0.35" cy="0.3" r="0.9">
        <stop offset="0%" stopColor={mix(base, "#ffffff", 0.25)} stopOpacity="0.55" />
        <stop offset="60%" stopColor={base} stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
      </radialGradient>
    );
  }
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
    </linearGradient>
  );
}

function Liner({ id, kind, c }: { id: string; kind: LinerStyle; c: DesignColors }) {
  const bg = c.liner;
  const fg = mix(bg, readableOn(bg) === "#FFF9F0" ? "#ffffff" : "#000000", 0.35);
  const soft = mix(bg, c.card, 0.55);
  switch (kind) {
    case "florals":
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={soft} />
          <circle cx="4" cy="4" r="2.2" fill={c.floralA} />
          <circle cx="3.4" cy="3.5" r="1.2" fill={mix(c.floralA, "#ffffff", 0.35)} />
          <path d="M6 5c2-1 3.5 0 4 1.5-2 .4-3.2-.2-4-1.5z" fill={c.floralB} />
          <circle cx="12" cy="12" r="1.6" fill={mix(c.floralA, "#ffffff", 0.4)} />
          <path d="M10 13c-2 1-3.4 0-3.8-1.4 2-.4 3.1.2 3.8 1.4z" fill={c.floralB} />
        </pattern>
      );
    case "damask":
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={bg} />
          <path d="M7 1.5C9 4 9 5.5 7 7C5 5.5 5 4 7 1.5ZM7 12.5C5 10 5 8.5 7 7C9 8.5 9 10 7 12.5ZM1.5 7C4 5 5.5 5 7 7C5.5 9 4 9 1.5 7ZM12.5 7C10 9 8.5 9 7 7C8.5 5 10 5 12.5 7Z" fill={fg} opacity="0.55" />
          <circle cx="0" cy="0" r="1.2" fill={fg} opacity="0.5" /><circle cx="14" cy="14" r="1.2" fill={fg} opacity="0.5" />
        </pattern>
      );
    case "stripes":
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="6" fill={bg} />
          <rect width="3" height="6" fill={fg} opacity="0.5" />
        </pattern>
      );
    case "lotus":
      return (
        <pattern id={id} width="18" height="16" patternUnits="userSpaceOnUse">
          <rect width="18" height="16" fill={bg} />
          <path d="M9 3C7.6 5 7.6 7 9 9C10.4 7 10.4 5 9 3ZM9 9C6.8 8.6 5.2 7.2 4.8 5.4 6.8 5.8 8.2 7 9 9ZM9 9C11.2 8.6 12.8 7.2 13.2 5.4 11.2 5.8 9.8 7 9 9ZM5 10.5H13" stroke={fg} strokeWidth="0.5" fill="none" opacity="0.8" />
        </pattern>
      );
    case "deco":
      return (
        <pattern id={id} width="10" height="6" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" fill={bg} />
          <path d="M0 6A5 5 0 0 1 10 6M2 6A3 3 0 0 1 8 6M4 6A1 1 0 0 1 6 6" stroke={fg} strokeWidth="0.4" fill="none" />
        </pattern>
      );
    case "leaves":
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={soft} />
          <path d="M2 12C4 8 8 5 12 3" stroke={c.floralB} strokeWidth="0.5" fill="none" />
          {[0, 1, 2].map((i) => <ellipse key={i} cx={4 + i * 3} cy={9.5 - i * 2.6} rx="1.6" ry="0.8" fill={c.floralB} transform={`rotate(-40 ${4 + i * 3} ${9.5 - i * 2.6})`} />)}
          <circle cx="11" cy="11" r="0.9" fill={c.floralA} />
        </pattern>
      );
    default:
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={bg} />
        </pattern>
      );
  }
}

const uidOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

/** Envelope back: paper outside, liner showing inside the opening. */
export function EnvelopeBack({ c, texture, liner }: { c: DesignColors; texture: EnvelopeTexture; liner: LinerStyle }) {
  const u = uidOf(useId());
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="none" className="ea-layer" aria-hidden="true">
      <defs>
        <Texture id={`tx${u}`} kind={texture} base={c.envelope} />
        <Sheen id={`sh${u}`} kind={texture} base={c.envelope} />
        <Liner id={`ln${u}`} kind={liner} c={c} />
        <linearGradient id={`in${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100" height="140" rx="2.2" fill={mix(c.envelope, "#000000", 0.08)} />
      <rect x="2.2" y="1.6" width="95.6" height="136" rx="1.6" fill={`url(#ln${u})`} />
      <rect x="2.2" y="1.6" width="95.6" height="136" rx="1.6" fill={`url(#in${u})`} />
    </svg>
  );
}

/** Front pocket with side and bottom folds; can carry the guest's name. */
/** The pocket's opening sits just under the closed flap, so a sealed envelope hides the card. */
function pocketTop(flap: FlapStyle): { left: number; mid: number } {
  if (flap === "straight") return { left: 37, mid: 37 };
  if (flap === "scalloped") return { left: 32, mid: 32 };
  const tip = SEAL_AT[flap] * 140;
  return { left: 0.5, mid: tip - 1.5 };
}

export function EnvelopePocket({ c, texture, flap, guestName, couple, font, modern }: { c: DesignColors; texture: EnvelopeTexture; flap: FlapStyle; guestName?: string; couple?: string; font: string; modern?: boolean }) {
  const u = uidOf(useId());
  const { left, mid } = pocketTop(flap);
  const body = `M0 ${left}L50 ${mid}L100 ${left}V140H0Z`;
  const ink = readableOn(c.envelope) === "#FFF9F0" ? mix(c.envelope, "#ffffff", 0.85) : mix(c.envelope, "#1c1416", 0.78);
  const fold = mix(c.envelope, "#000000", 0.16);
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="none" className="ea-layer" aria-hidden="true">
      <defs>
        <Texture id={`tx${u}`} kind={texture} base={c.envelope} />
        <Sheen id={`sh${u}`} kind={texture} base={c.envelope} />
        <linearGradient id={`sd${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.16" />
          <stop offset="12%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={body} fill={c.envelope} />
      <path d={body} fill={`url(#tx${u})`} />
      {/* side flaps */}
      <path d={`M0 ${left}L44 92L0 140Z`} fill={mix(c.envelope, "#ffffff", 0.06)} />
      <path d={`M100 ${left}L56 92L100 140Z`} fill={mix(c.envelope, "#000000", 0.05)} />
      {/* bottom flap */}
      <path d="M0 140L46 90Q50 87 54 90L100 140Z" fill={mix(c.envelope, "#ffffff", 0.1)} />
      <path d="M0 140L46 90Q50 87 54 90L100 140" fill="none" stroke={fold} strokeWidth="0.35" />
      <path d={`M0 ${left}L44 92M100 ${left}L56 92`} stroke={fold} strokeWidth="0.3" opacity="0.6" />
      <path d={body} fill={`url(#sh${u})`} className={texture === "foil" ? "ea-foil-sheen" : undefined} />
      <path d={`M0 ${left}L50 ${mid}L100 ${left}`} fill="none" stroke={`url(#sd${u})`} strokeWidth="2" />
      {guestName && (
        <g>
          <text x="50" y="112" textAnchor="middle" fontSize="3.4" fontFamily="'Manrope', sans-serif" fill={ink} letterSpacing="0.8" opacity="0.8">FOR</text>
          {modern ? (
            <text x="50" y="121.5" textAnchor="middle" fontSize="4.6" fontFamily={font} fontWeight="500" fill={ink} letterSpacing="1.1">{guestName.toUpperCase()}</text>
          ) : (
            <text x="50" y="122" textAnchor="middle" fontSize="7.2" fontFamily={font} fill={ink}>{guestName.length > 24 ? `${guestName.slice(0, 22)}…` : guestName}</text>
          )}
          {couple && <text x="50" y="131" textAnchor="middle" fontSize="3" fontFamily="'Manrope', sans-serif" fill={ink} letterSpacing="0.6" opacity="0.7">{couple.toUpperCase()}</text>}
        </g>
      )}
    </svg>
  );
}

/** One face of the flap: outside paper, or the liner on the inside. */
export function FlapFace({ c, flap, texture, liner, inner }: { c: DesignColors; flap: FlapStyle; texture: EnvelopeTexture; liner: LinerStyle; inner?: boolean }) {
  const u = uidOf(useId());
  const d = FLAP_PATH[flap];
  return (
    <svg viewBox="0 0 100 64" preserveAspectRatio="none" className="ea-layer" aria-hidden="true">
      <defs>
        <Texture id={`tx${u}`} kind={texture} base={c.envelope} />
        <Sheen id={`sh${u}`} kind={texture} base={c.envelope} />
        <Liner id={`ln${u}`} kind={liner} c={c} />
        <linearGradient id={`fs${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      {inner ? (
        <>
          <path d={d} fill={mix(c.envelope, "#000000", 0.05)} />
          <path d={d} fill={`url(#ln${u})`} transform="translate(50 0) scale(0.94 0.94) translate(-50 0)" />
        </>
      ) : (
        <>
          <path d={d} fill={c.envelope} />
          <path d={d} fill={`url(#tx${u})`} />
          <path d={d} fill={`url(#fs${u})`} />
          <path d={d} fill={`url(#sh${u})`} className={texture === "foil" ? "ea-foil-sheen" : undefined} />
          <path d={d} fill="none" stroke={mix(c.envelope, "#000000", 0.18)} strokeWidth="0.35" />
        </>
      )}
    </svg>
  );
}

/** Wax, gold foil or ribbon seal with the couple's initials. */
export function SealArt({ style, color, text, font, accent }: { style: SealStyle; color: string; text: string; font: string; accent: string }) {
  const u = uidOf(useId());
  const label = text.replace(/\s+/g, "");
  const ink = readableOn(color);
  if (style === "none") return null;
  if (style === "foil") {
    return (
      <svg viewBox="0 0 120 120" className="ea-seal-art" aria-hidden="true">
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={mix(color, "#fff6dc", 0.6)} />
            <stop offset="45%" stopColor={color} />
            <stop offset="60%" stopColor={mix(color, "#fff3d0", 0.7)} />
            <stop offset="100%" stopColor={mix(color, "#3a2a10", 0.35)} />
          </linearGradient>
        </defs>
        <path d={Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const r = i % 2 ? 56 : 51; return `${i ? "L" : "M"}${(60 + Math.cos(a) * r).toFixed(2)} ${(60 + Math.sin(a) * r).toFixed(2)}`; }).join("") + "Z"} fill={`url(#g${u})`} />
        <circle cx="60" cy="60" r="42" fill="none" stroke={mix(color, "#3a2a10", 0.35)} strokeWidth="1.5" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={mix(color, "#fff6dc", 0.5)} strokeWidth="0.8" />
        <text x="60" y="71" textAnchor="middle" fontSize="34" fontFamily={font} fill={mix(color, "#2a1c08", 0.55)}>{label}</text>
      </svg>
    );
  }
  if (style === "ribbon") {
    return (
      <svg viewBox="0 0 120 120" className="ea-seal-art" aria-hidden="true">
        <path d="M60 60L30 112L46 106L54 120L60 66Z" fill={mix(accent, "#000000", 0.15)} />
        <path d="M60 60L90 112L74 106L66 120L60 66Z" fill={mix(accent, "#000000", 0.25)} />
        <circle cx="60" cy="56" r="36" fill={accent} />
        <circle cx="60" cy="56" r="29" fill="none" stroke={mix(accent, "#ffffff", 0.45)} strokeWidth="1.2" />
        <text x="60" y="66" textAnchor="middle" fontSize="28" fontFamily={font} fill={readableOn(accent)}>{label}</text>
      </svg>
    );
  }
  // Wax: an irregular drop with a pressed rim and a soft highlight.
  const blob = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const r = 55 + (i % 3 === 0 ? 4 : i % 2 ? -1.5 : 1.5);
    return `${(60 + Math.cos(a) * r).toFixed(2)},${(60 + Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 120 120" className="ea-seal-art" aria-hidden="true">
      <defs>
        <radialGradient id={`w${u}`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0%" stopColor={mix(color, "#ffffff", 0.35)} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={mix(color, "#000000", 0.35)} />
        </radialGradient>
      </defs>
      <polygon points={blob} fill={`url(#w${u})`} />
      <circle cx="60" cy="60" r="40" fill={mix(color, "#000000", 0.12)} />
      <circle cx="60" cy="60" r="40" fill="none" stroke={mix(color, "#ffffff", 0.3)} strokeWidth="2" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={mix(color, "#000000", 0.25)} strokeWidth="1" />
      <ellipse cx="46" cy="40" rx="14" ry="7" fill="#ffffff" opacity="0.18" transform="rotate(-30 46 40)" />
      <text x="60" y="71" textAnchor="middle" fontSize="32" fontFamily={font} fill={mix(color, ink === "#FFF9F0" ? "#ffffff" : "#000000", 0.55)}>{label}</text>
    </svg>
  );
}
