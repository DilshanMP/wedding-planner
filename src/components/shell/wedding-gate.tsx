"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAuth, useStore, useStoreState } from "@/lib/store/provider";
import { Notice, Skeleton } from "@/components/ui/primitives";

/**
 * Routes to sign-in or onboarding when there is no wedding to show. Children
 * always render (screens show their own skeleton until data arrives), which
 * keeps every route segment in the prerendered shell.
 */
export function WeddingGate({ children }: { children: ReactNode }) {
  const state = useStoreState();
  const auth = useAuth();
  const router = useRouter();
  const store = useStore();

  const signedOut = auth.mode === "cloud" && auth.status === "signed_out";
  useEffect(() => {
    if (signedOut) router.replace("/login");
    else if (state.status === "empty") router.replace("/onboarding");
  }, [signedOut, state.status, router]);

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Notice tone="danger" role="alert" icon={<AlertTriangle className="wos-icon" />} title="We couldn't open your wedding."
          action={<button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => void store.init()}>Try Again</button>}>
          {state.message}
        </Notice>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <Skeleton style={{ height: 40, width: 280 }} />
      <Skeleton style={{ height: 220, borderRadius: 24 }} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 120, borderRadius: 16 }} />
        ))}
      </div>
      <Skeleton style={{ height: 320, borderRadius: 16 }} />
    </div>
  );
}
