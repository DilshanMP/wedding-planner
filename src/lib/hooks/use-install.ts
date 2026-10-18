"use client";

import { useSyncExternalStore } from "react";

/**
 * "Install app": Chrome, Edge and Samsung Internet fire `beforeinstallprompt`
 * (often before React has mounted), so it is caught here at module load.
 * iPhone/iPad never fire it — Safari's Share → "Add to Home Screen" is the
 * only way — so those get written steps instead.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "ios" | "android" | "desktop" | "inapp";
export interface InstallState {
  ready: boolean;
  installed: boolean;
  canPrompt: boolean;
  platform: InstallPlatform;
}

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    notify();
  });
}

function platformOf(): InstallPlatform {
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|; wv\)/i.test(ua)) return "inapp";
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

let cached: InstallState | null = null;
function snapshot(): InstallState {
  const next: InstallState = { ready: true, installed: justInstalled || standalone(), canPrompt: Boolean(deferred), platform: platformOf() };
  if (cached && cached.installed === next.installed && cached.canPrompt === next.canPrompt && cached.platform === next.platform) return cached;
  cached = next;
  return next;
}
const SERVER: InstallState = { ready: false, installed: false, canPrompt: false, platform: "desktop" };

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useInstall(): InstallState & { prompt: () => Promise<"accepted" | "dismissed" | "unavailable"> } {
  const state = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  return {
    ...state,
    prompt: async () => {
      const e = deferred;
      if (!e) return "unavailable";
      await e.prompt();
      const { outcome } = await e.userChoice;
      deferred = null;
      notify();
      return outcome;
    },
  };
}
