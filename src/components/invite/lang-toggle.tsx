"use client";

import type { GuestLanguage } from "@/lib/domain/invite-studio";

/** English / සිංහල switch for guests, shown by the "tap to open" button. */
export function LangToggle({ lang, onChange, className }: { lang: GuestLanguage; onChange: (l: GuestLanguage) => void; className?: string }) {
  return (
    <div className={`inv-lang ${className ?? ""}`} role="radiogroup" aria-label="Language / භාෂාව">
      <button type="button" role="radio" aria-checked={lang === "en"} onClick={() => onChange("en")} lang="en">English</button>
      <button type="button" role="radio" aria-checked={lang === "si"} onClick={() => onChange("si")} lang="si">සිංහල</button>
    </div>
  );
}

