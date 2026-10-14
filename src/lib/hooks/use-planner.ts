"use client";

import { useCallback } from "react";
import type { PlannerData, PlannerKey } from "@/lib/domain/planner";
import { useStore, useWeddingData } from "@/lib/store/provider";

/** One part of the creative plan and a setter that saves it (debounced, shared with your partner). */
export function usePlanner<K extends PlannerKey>(key: K): [PlannerData[K], (next: PlannerData[K] | ((prev: PlannerData[K]) => PlannerData[K])) => void] {
  const store = useStore();
  const value = useWeddingData().planner[key];
  const set = useCallback(
    (next: PlannerData[K] | ((prev: PlannerData[K]) => PlannerData[K])) => {
      const s = store.getState();
      if (s.status !== "ready") return;
      const prev = s.data.planner[key];
      store.updatePlanner(key, typeof next === "function" ? (next as (p: PlannerData[K]) => PlannerData[K])(prev) : next);
    },
    [store, key],
  );
  return [value, set];
}
