"use client";

import { ImageOff } from "lucide-react";
import { useFileUrl } from "@/lib/hooks/use-file-url";
import { cx } from "@/components/ui/primitives";

/** A photo from the wedding's file vault. */
export function StoredPhoto({ documentId, alt = "", className, fit = "cover" }: { documentId: string | null; alt?: string; className?: string; fit?: "cover" | "contain" }) {
  const url = useFileUrl(documentId);
  if (!documentId) {
    return (
      <span className={cx("grid place-items-center bg-surface-sunken text-ink-muted", className)}>
        <ImageOff className="wos-icon" aria-hidden="true" />
      </span>
    );
  }
  if (!url) return <span className={cx("wos-skel block", className)} aria-busy="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- private, signed URLs; next/image can't optimise them
  return <img src={url} alt={alt} className={cx("block", className)} style={{ objectFit: fit }} />;
}
