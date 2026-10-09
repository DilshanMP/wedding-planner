"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityEntry } from "@/lib/domain/activity";
import { useStore, useStoreState } from "@/lib/store/provider";

export type ActivityState = { status: "loading" } | { status: "ready"; entries: ActivityEntry[] } | { status: "unavailable" };

const POLL_MS = 30_000;

/**
 * The newest activity for the open wedding. Refreshes after your own saves,
 * when you come back to the app, and every 30 seconds while it's open — so
 * your partner's changes show up without reloading.
 */
export function useActivity(limit: number): ActivityState {
  const store = useStore();
  const state = useStoreState();
  const weddingId = state.status === "ready" ? state.data.wedding.id : null;
  const saving = state.status === "ready" && state.saving;
  const [result, setResult] = useState<ActivityState>({ status: "loading" });

  const load = useCallback(async () => {
    if (!weddingId) return;
    try {
      const entries = await store.repo.listActivity(weddingId, limit);
      setResult({ status: "ready", entries });
    } catch {
      // Most likely the activity table hasn't been created in this project yet.
      setResult((r) => (r.status === "ready" ? r : { status: "unavailable" }));
    }
  }, [store, weddingId, limit]);

  useEffect(() => {
    if (saving) return;
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, saving]);

  return result;
}
