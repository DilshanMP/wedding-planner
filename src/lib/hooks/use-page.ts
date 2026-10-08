"use client";

import { useWeddingDataOrNull } from "@/lib/store/provider";
import type { WeddingData } from "@/lib/domain/types";
import { useClock, type Clock } from "./use-clock";

/**
 * Everything a screen needs to render: the open wedding and the current
 * date/time. Null until both are available on the client, so screens render
 * a skeleton during prerender and hydration.
 */
export function usePage(): ({ data: WeddingData } & Clock) | null {
  const data = useWeddingDataOrNull();
  const clock = useClock();
  if (!data || !clock) return null;
  return { data, ...clock };
}
