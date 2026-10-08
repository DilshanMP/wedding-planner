"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { LocalRepository, MemoryStorage, type KeyValueStore } from "@/lib/data/local-repository";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import type { WeddingData } from "@/lib/domain/types";
import { WeddingStore, type StoreState } from "./wedding-store";

export type AuthState =
  | { mode: "local" }
  | { mode: "cloud"; status: "loading" | "signed_out" }
  | { mode: "cloud"; status: "signed_in"; email: string | null };

interface Ctx {
  store: WeddingStore;
  auth: AuthState;
}

const StoreContext = createContext<Ctx | null>(null);

function browserStorage(): KeyValueStore {
  try {
    const probe = "__wos_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage(); // private mode or blocked storage
  }
}

function makeStore(): WeddingStore {
  const storage = typeof window === "undefined" ? new MemoryStorage() : browserStorage();
  const prefs = {
    get: (k: string) => storage.getItem(k),
    set: (k: string, v: string | null) => (v === null ? storage.setItem(k, "") : storage.setItem(k, v)),
  };
  const repo = cloudEnabled && typeof window !== "undefined" ? new SupabaseRepository(getSupabase()) : new LocalRepository(storage);
  return new WeddingStore(repo, prefs);
}

export function WeddingProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  const [auth, setAuth] = useState<AuthState>(cloudEnabled ? { mode: "cloud", status: "loading" } : { mode: "local" });

  useEffect(() => {
    if (!cloudEnabled) {
      void store.init();
      return;
    }
    const supabase = getSupabase();
    const apply = (session: Session | null) => {
      if (session) {
        setAuth({ mode: "cloud", status: "signed_in", email: session.user.email ?? null });
        void store.init();
      } else setAuth({ mode: "cloud", status: "signed_out" });
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") apply(session);
    });
    return () => data.subscription.unsubscribe();
  }, [store]);

  const value = useMemo(() => ({ store, auth }), [store, auth]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("WeddingProvider is missing.");
  return ctx;
}

const LOADING: StoreState = { status: "loading" };

export function useStore(): WeddingStore {
  return useCtx().store;
}

export function useAuth(): AuthState {
  return useCtx().auth;
}

export function useStoreState(): StoreState {
  const { store } = useCtx();
  return useSyncExternalStore(store.subscribe, store.getState, () => LOADING);
}

/** The open wedding. Only call inside screens gated by <WeddingGate>. */
export function useWeddingData(): WeddingData {
  const state = useStoreState();
  if (state.status !== "ready") throw new Error("useWeddingData called before a wedding is open.");
  return state.data;
}

/** The open wedding, or null while loading / before onboarding. */
export function useWeddingDataOrNull(): WeddingData | null {
  const state = useStoreState();
  return state.status === "ready" ? state.data : null;
}
