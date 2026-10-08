"use client";

import Link from "next/link";
import { useStoreState } from "@/lib/store/provider";

/** "Start Planning", or "Open Your Wedding" once one exists on this device/account. */
export function LandingCta({ variant }: { variant: "nav" | "hero" | "footer" }) {
  const state = useStoreState();
  const has = state.status === "ready";
  const href = has ? "/dashboard" : "/onboarding";
  const label = has ? "Open Your Wedding" : "Start Planning";
  if (variant === "nav") return <Link href={href} className="wos-btn wos-btn--primary wos-btn--sm">{label}</Link>;
  if (variant === "footer") return <Link href={href} className="wos-btn wos-btn--lg !bg-on-wine !text-wine-600">{label}</Link>;
  return <Link href={href} className="wos-btn wos-btn--primary wos-btn--lg">{label}</Link>;
}
