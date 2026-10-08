"use client";

import { useSyncExternalStore } from "react";
import { nowTime, todayISO } from "@/lib/domain/dates";

/**
 * A shared minute-resolution clock. Server render returns null so nothing
 * time-dependent is prerendered (avoids hydration mismatches and keeps the
 * static shell cacheable); the client fills it in after hydration.
 */

let snapshot: string | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function read(): string {
  const now = new Date();
  return `${todayISO(now)}T${nowTime(now)}`;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!timer) {
    timer = setInterval(() => {
      const next = read();
      if (next !== snapshot) {
        snapshot = next;
        listeners.forEach((l) => l());
      }
    }, 15_000);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  snapshot ??= read();
  return snapshot;
}

export interface Clock {
  /** YYYY-MM-DD */
  today: string;
  /** HH:mm */
  time: string;
  minutes: number;
}

export function useClock(): Clock | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => null);
  if (!value) return null;
  const [today, time] = value.split("T");
  const [h, m] = time.split(":").map(Number);
  return { today, time, minutes: h * 60 + m };
}
