"use client";

import Link from "next/link";
import type { Readiness } from "@/lib/domain/readiness";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/primitives";

export function ReadinessBreakdown({ readiness, open, onClose }: { readiness: Readiness; open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Wedding readiness — ${readiness.overall}%`}
      description="The overall score is the simple average of these six areas. Each one is a plain ratio of your own records."
    >
      <ul className="wos-list">
        {readiness.components.map((c) => (
          <li key={c.id} className="!flex-col !items-stretch gap-2" style={{ padding: "16px 0" }}>
            <ProgressBar value={c.score} label={c.label} detail={`${c.score}%`} />
            <p className="m-0 text-[13px] leading-[18px] text-ink-muted">{c.explanation}</p>
            <Link href={c.href} onClick={onClose} className="wos-link self-start">Improve {c.label.toLowerCase()}</Link>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
