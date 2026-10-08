import { timeToMinutes } from "./dates";
import type { TimelineEvent } from "./types";

export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export function endTime(e: TimelineEvent): number {
  return timeToMinutes(e.time) + e.durationMinutes;
}

export interface NowNext {
  current: TimelineEvent | null;
  next: TimelineEvent | null;
  /** 0–1 progress through the current event. */
  progress: number;
  phase: "before" | "during" | "between" | "after";
}

/** Which moment is happening at `minutes` past midnight, and what follows. */
export function nowNext(events: TimelineEvent[], minutes: number): NowNext {
  const sorted = sortTimeline(events);
  if (sorted.length === 0) return { current: null, next: null, progress: 0, phase: "before" };
  if (minutes < timeToMinutes(sorted[0].time)) return { current: null, next: sorted[0], progress: 0, phase: "before" };

  let current: TimelineEvent | null = null;
  for (const e of sorted) {
    const start = timeToMinutes(e.time);
    if (start <= minutes && minutes < endTime(e)) current = e;
  }
  const next = sorted.find((e) => timeToMinutes(e.time) > minutes) ?? null;
  if (current) {
    const span = Math.max(1, current.durationMinutes);
    return { current, next, progress: Math.min(1, (minutes - timeToMinutes(current.time)) / span), phase: "during" };
  }
  return { current: null, next, progress: 0, phase: next ? "between" : "after" };
}

/**
 * Moments that clash: they overlap in time *and* share a location. Parallel
 * tracks in different places are normal, and preparation is expected to
 * overlap with whatever is photographed or set up around it.
 */
export function overlaps(events: TimelineEvent[]): Set<string> {
  const sorted = sortTimeline(events);
  const ids = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (timeToMinutes(b.time) >= endTime(a)) break;
      const place = a.location.trim().toLowerCase();
      if (a.scene === "preparation" || b.scene === "preparation") continue;
      if (place && place === b.location.trim().toLowerCase()) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}
