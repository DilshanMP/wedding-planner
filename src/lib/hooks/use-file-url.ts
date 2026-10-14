"use client";

import { useEffect, useState } from "react";
import { useFileStore, useWeddingDataOrNull } from "@/lib/store/provider";

/**
 * A viewable URL for a document in the vault (photos for the home screen,
 * vision board, card designs). Null while loading or when missing.
 */
export function useFileUrl(documentId: string | null | undefined): string | null {
  const files = useFileStore();
  const data = useWeddingDataOrNull();
  const path = documentId ? data?.documents.find((d) => d.id === documentId)?.storagePath ?? null : null;
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    let live = true;
    let url: string | null = null;
    files.open(path).then(
      (u) => {
        url = u;
        if (live) setLoaded({ path, url: u });
        else files.release(u);
      },
      () => {},
    );
    return () => {
      live = false;
      if (url) files.release(url);
    };
  }, [files, path]);

  return loaded && loaded.path === path ? loaded.url : null;
}
