"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useStore, useStoreState } from "@/lib/store/provider";

interface Toast {
  id: number;
  tone: "success" | "danger";
  message: string;
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** One-line success feedback, and save errors from the store. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const state = useStoreState();
  const store = useStore();
  const show = useCallback((message: string, tone: Toast["tone"] = "success") => setToast({ id: Date.now(), tone, message }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === "danger" ? 8000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Save errors come straight from the store and clear themselves.
  const error = state.status === "ready" ? state.error : null;
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(store.dismissError, 8000);
    return () => clearTimeout(t);
  }, [error, store]);
  const shown: Toast | null = error ? { id: -1, tone: "danger", message: `${error} Your last change was undone.` } : toast;

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status">
        {shown && (
          <div key={shown.id} className={`wos-toast wos-notice wos-notice--${shown.tone}`} style={{ alignItems: "center" }}>
            <span className="wos-notice__icon" aria-hidden="true">
              {shown.tone === "success" ? <CheckCircle2 className="wos-icon" /> : <AlertTriangle className="wos-icon" />}
            </span>
            <div className="wos-notice__body"><b>{shown.message}</b></div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
