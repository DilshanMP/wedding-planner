"use client";

import { PoruwaScene } from "./poruwa-scene";

/** Full-screen "opening your wedding" moment: the couple walks onto the Poruwa. */
export function CoupleLoader({ message = "Opening your wedding…" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-sm" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="w-[min(340px,80vw)] overflow-hidden rounded-[28px]" style={{ aspectRatio: "1 / 1" }}>
          <PoruwaScene hall={false} entrance className="h-full w-full" style={{ transform: "scale(1.5) translateY(-2%)" }} title="The bride and groom walking onto the Poruwa" />
        </div>
        <p className="m-0 font-display text-[26px] leading-8 text-ink">{message}</p>
        <span className="loader-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  );
}
