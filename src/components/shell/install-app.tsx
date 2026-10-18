"use client";

import { useState, type ReactNode } from "react";
import { Download, MoreVertical, Share, SquarePlus, X } from "lucide-react";
import { useInstall, type InstallPlatform } from "@/lib/hooks/use-install";
import { Dialog } from "@/components/ui/dialog";
import { cx } from "@/components/ui/primitives";

const DISMISS_KEY = "wos-install-dismissed";

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 flex-none place-items-center rounded-full bg-wine-600 text-[13px] font-bold text-white">{n}</span>
      <span className="pt-0.5 text-[15px] leading-[22px] text-ink">{children}</span>
    </li>
  );
}

function Steps({ platform }: { platform: InstallPlatform }) {
  if (platform === "inapp") {
    return (
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        <Step n={1}>This page is open inside another app (Facebook, Instagram…), which can&apos;t install apps.</Step>
        <Step n={2}>Tap <MoreVertical className="inline size-4 align-[-3px]" aria-label="the menu" /> and choose <strong>Open in browser</strong> (Chrome or Safari).</Step>
        <Step n={3}>Then tap <strong>Install app</strong> again.</Step>
      </ol>
    );
  }
  if (platform === "ios") {
    return (
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        <Step n={1}>Open this page in <strong>Safari</strong>.</Step>
        <Step n={2}>Tap the <strong>Share</strong> button <Share className="inline size-4 align-[-3px]" aria-hidden="true" /> at the bottom of the screen.</Step>
        <Step n={3}>Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus className="inline size-4 align-[-3px]" aria-hidden="true" />.</Step>
        <Step n={4}>Tap <strong>Add</strong>. Wedding OS appears on your home screen.</Step>
      </ol>
    );
  }
  if (platform === "android") {
    return (
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        <Step n={1}>Open this page in <strong>Chrome</strong>.</Step>
        <Step n={2}>Tap the menu <MoreVertical className="inline size-4 align-[-3px]" aria-hidden="true" /> at the top right.</Step>
        <Step n={3}>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>), then <strong>Install</strong>.</Step>
      </ol>
    );
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      <Step n={1}>Use <strong>Chrome</strong> or <strong>Edge</strong>.</Step>
      <Step n={2}>Click the install icon <Download className="inline size-4 align-[-3px]" aria-hidden="true" /> at the right end of the address bar — or open the menu <MoreVertical className="inline size-4 align-[-3px]" aria-hidden="true" /> and choose <strong>Install Wedding OS</strong> (under “Cast, save and share” in Chrome).</Step>
      <Step n={3}>On a Mac with Safari: <strong>File → Add to Dock</strong>.</Step>
    </ol>
  );
}

/** Button that installs the app, or shows how to on phones that don't allow a button. Hidden once installed. */
export function InstallApp({ variant = "button", className }: { variant?: "button" | "nav" | "tile"; className?: string }) {
  const install = useInstall();
  const [help, setHelp] = useState(false);
  if (!install.ready || install.installed) return null;

  const onClick = async () => {
    if (install.canPrompt) {
      const outcome = await install.prompt();
      if (outcome !== "unavailable") return;
    }
    setHelp(true);
  };

  const label = "Install app";
  const button =
    variant === "nav" ? (
      <button type="button" onClick={onClick} title={label} className={cx("app-install-nav", className)}>
        <Download className="wos-icon" aria-hidden="true" />
        <span className="nav-label">{label}</span>
      </button>
    ) : variant === "tile" ? (
      <button type="button" onClick={onClick} className={cx("flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface-raised px-2 py-4 text-center text-[13px] leading-4 font-semibold text-ink", className)}>
        <span className="grid size-10 place-items-center rounded-xl bg-wine-50 text-wine-600"><Download className="wos-icon" aria-hidden="true" /></span>
        {label}
      </button>
    ) : (
      <button type="button" onClick={onClick} className={cx("wos-btn wos-btn--primary", className)}>
        <Download className="wos-icon" aria-hidden="true" />{label}
      </button>
    );

  return (
    <>
      {button}
      <Dialog open={help} onClose={() => setHelp(false)} variant="modal" title="Install Wedding OS" description="Open it from your home screen like any app — full screen, and it works offline.">
        <Steps platform={install.platform} />
      </Dialog>
    </>
  );
}

/** A one-time card on Home for phones, until installed or dismissed. */
export function InstallBanner() {
  const install = useInstall();
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!install.ready || install.installed || hidden) return null;
  return (
    <section className="wos-card flex flex-wrap items-center gap-3 !py-4" aria-label="Install the app">
      {/* eslint-disable-next-line @next/next/no-img-element -- static icon */}
      <img src="/icons/icon-192.png" alt="" className="size-11 rounded-xl" />
      <div className="min-w-[180px] flex-1">
        <p className="m-0 text-[15px] font-semibold text-ink">Put Wedding OS on your home screen</p>
        <p className="m-0 text-[13px] text-ink-muted">Opens in one tap, full screen, and works without internet.</p>
      </div>
      <InstallApp className="wos-btn--sm" />
      <button type="button" className="wos-iconbtn" aria-label="Not now" onClick={() => {
        setHidden(true);
        try {
          window.localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // Private mode: it just comes back next time.
        }
      }}><X className="wos-icon" aria-hidden="true" /></button>
    </section>
  );
}
