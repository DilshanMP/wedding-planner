"use client";

import type { ReactNode } from "react";
import { useStoreState } from "@/lib/store/provider";
import { AppShell } from "./app-shell";
import { ToastProvider } from "./toast";
import { WeddingGate } from "./wedding-gate";

export function AppFrame({ children }: { children: ReactNode }) {
  const state = useStoreState();
  return (
    <WeddingGate>
      {state.status === "ready" ? (
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      ) : (
        <main className="app-main">
          <div className="app-content">{children}</div>
        </main>
      )}
    </WeddingGate>
  );
}
