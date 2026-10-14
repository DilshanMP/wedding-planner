"use client";

import { useEffect } from "react";
import { useStoreState } from "@/lib/store/provider";
import { themeVars } from "@/lib/theme-colors";

/** Recolours the whole app with the couple's wedding colours when they turn it on. */
export function WeddingTheme() {
  const state = useStoreState();
  const theme = state.status === "ready" ? state.data.planner.theme : null;
  const key = theme?.applyToApp ? theme.colors.join(",") : "";

  useEffect(() => {
    if (!key) return;
    const vars = themeVars(key.split(","));
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
    };
  }, [key]);

  return null;
}
