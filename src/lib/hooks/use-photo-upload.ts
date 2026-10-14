"use client";

import { useCallback } from "react";
import { documentPath, MAX_FILE_BYTES } from "@/lib/data/file-store";
import { newId, nowISO } from "@/lib/domain/ids";
import type { DocumentKind } from "@/lib/domain/types";
import { useFileStore, useStore } from "@/lib/store/provider";

/** Large phone photos are shrunk before upload: faster on mobile data and kinder to storage. */
async function shrink(file: File, max = 1800): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file isn't a photo we can open."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // PNGs may have transparency (cut-out photos), so keep them as PNG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), type, 0.86));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Save a photo into the wedding's file vault (shared with your partner in
 * cloud mode) and return the new document id.
 */
export function usePhotoUpload(weddingId: string) {
  const store = useStore();
  const files = useFileStore();
  return useCallback(
    async (file: File, meta: { title?: string; kind?: DocumentKind; notes?: string } = {}): Promise<string> => {
      const blob = await shrink(file);
      if (blob.size > MAX_FILE_BYTES) throw new Error("That photo is larger than 20 MB.");
      const id = newId();
      const name = blob === file ? file.name : file.name.replace(/\.[^.]+$/, blob.type === "image/png" ? ".png" : ".jpg");
      const path = documentPath(weddingId, id, name);
      await files.put(path, blob);
      const now = nowISO();
      store.upsert("documents", {
        id,
        kind: meta.kind ?? "wedding",
        title: (meta.title ?? file.name.replace(/\.[^.]+$/, "")).slice(0, 120) || "Photo",
        notes: meta.notes ?? "",
        vendorId: null,
        budgetItemId: null,
        taskId: null,
        storagePath: path,
        mimeType: blob.type || file.type || "image/jpeg",
        sizeBytes: blob.size,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    },
    [files, store, weddingId],
  );
}
