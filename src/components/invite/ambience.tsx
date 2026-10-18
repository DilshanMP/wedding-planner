import type { CSSProperties } from "react";
import type { Ambience as AmbienceKind, DesignColors } from "@/lib/domain/invite-studio";

/** Floating petals, sparkles, gold dust or leaves behind the envelope. CSS-only, paused when reduced motion is on. */

const N: Record<AmbienceKind, number> = { petals: 22, sparkles: 30, golddust: 40, leaves: 16, none: 0 };

export function Ambience({ kind, c, paused }: { kind: AmbienceKind; c: DesignColors; paused?: boolean }) {
  const n = N[kind];
  if (!n) return null;
  return (
    <div className={`ea-ambience ea-ambience--${kind}${paused ? " is-paused" : ""}`} aria-hidden="true"
      style={{ "--a1": c.floralA, "--a2": c.accent, "--a3": c.floralB } as CSSProperties}>
      {Array.from({ length: n }, (_, i) => {
        const left = (i * 37 + 11) % 100;
        const top = (i * 53 + 7) % 100;
        const delay = -((i * 1.37) % 12);
        const dur = kind === "sparkles" || kind === "golddust" ? 2.6 + (i % 5) * 0.7 : 10 + ((i * 7) % 9);
        const size = kind === "golddust" ? 2 + (i % 3) : kind === "sparkles" ? 3 + (i % 4) : 10 + ((i * 5) % 10);
        return (
          <i key={i} className={`ea-p ea-p--${i % 3}`}
            style={{ left: `${left}%`, top: kind === "petals" || kind === "leaves" ? "-6%" : `${top}%`, width: size, height: kind === "leaves" ? size * 0.5 : size * 0.8, animationDelay: `${delay}s`, animationDuration: `${dur}s`, "--sway": `${20 + (i * 13) % 60}px` } as CSSProperties} />
        );
      })}
    </div>
  );
}
