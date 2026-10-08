"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { JourneyStage } from "@/lib/domain/readiness";
import { formatShortDate, monthName } from "@/lib/domain/dates";
import { cx } from "@/components/ui/primitives";

/** The 12-stage Wedding Journey. Stages transform Not started → In progress → Completed. */
export function JourneyStrip({ stages, weddingDate }: { stages: JourneyStage[]; weddingDate: string }) {
  const reduce = useReducedMotion();
  const current = stages.find((s) => s.state !== "completed");
  return (
    <ol className="wos-journey m-0 list-none p-0 py-2" aria-label="Wedding journey">
      {stages.map((s, i) => {
        const isCurrent = s.id === current?.id;
        const stateText =
          s.state === "completed"
            ? "Completed"
            : isCurrent
              ? "In progress"
              : s.id === "day" ? formatShortDate(weddingDate) : s.nextDue ? `By ${monthName(s.nextDue)}` : "Not started";
        return (
          <motion.li
            key={s.id}
            className={cx("wos-stage", s.state === "completed" && "wos-stage--done", isCurrent && "wos-stage--active")}
            aria-current={isCurrent ? "step" : undefined}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reduce ? 0 : i * 0.03, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <span className="wos-stage__dot">
              {s.state === "completed" ? <Check className="wos-icon" aria-label="Completed" /> : String(s.number).padStart(2, "0")}
            </span>
            <span className="wos-stage__name">{s.label}</span>
            <span className="wos-stage__state">
              {stateText}
              {s.total > 0 && s.state !== "completed" && <span className="sr-only">, {s.done} of {s.total} tasks done</span>}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
