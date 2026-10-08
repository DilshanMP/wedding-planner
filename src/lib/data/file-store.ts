import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Where document-vault files live. Metadata is a normal collection
 * (`documents`); the bytes go through this interface.
 */
export interface FileStore {
  readonly mode: "local" | "cloud";
  put(path: string, file: Blob): Promise<void>;
  /** A URL to view the file. Local URLs must be released with `release`. */
  open(path: string): Promise<string>;
  release(url: string): void;
  remove(paths: string[]): Promise<void>;
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Safe, readable storage path: `<weddingId>/<documentId>-<file-name>`. */
export function documentPath(weddingId: string, documentId: string, fileName: string): string {
  const clean = fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(-80) || "file";
  return `${weddingId}/${documentId}-${clean}`;
}

/* ------------------------------------------------------------------ */
/* Browser (IndexedDB)                                                 */
/* ------------------------------------------------------------------ */

const DB = "wedding-os-files";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("This browser can't store files (private mode?)."));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req ? req.result : undefined);
    };
    t.onerror = () => {
      db.close();
      reject(new Error(t.error?.name === "QuotaExceededError" ? "This browser's storage is full." : "Couldn't save the file."));
    };
  });
}

export class IndexedDbFileStore implements FileStore {
  readonly mode = "local" as const;

  async put(path: string, file: Blob) {
    await tx("readwrite", (s) => s.put(file, path));
  }

  async open(path: string) {
    const blob = (await tx<Blob>("readonly", (s) => s.get(path))) as Blob | undefined;
    if (!blob) throw new Error("This file isn't on this device any more.");
    return URL.createObjectURL(blob);
  }

  release(url: string) {
    URL.revokeObjectURL(url);
  }

  async remove(paths: string[]) {
    await tx("readwrite", (s) => {
      for (const p of paths) s.delete(p);
    });
  }
}

/* ------------------------------------------------------------------ */
/* Supabase Storage (private bucket, RLS by wedding id prefix)         */
/* ------------------------------------------------------------------ */

export class SupabaseFileStore implements FileStore {
  readonly mode = "cloud" as const;
  constructor(private readonly client: SupabaseClient, private readonly bucket = "documents") {}

  async put(path: string, file: Blob) {
    const { error } = await this.client.storage.from(this.bucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw new Error(`Couldn't upload the file: ${error.message}`);
  }

  async open(path: string) {
    // Short-lived signed URL: the bucket itself is private.
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(path, 300);
    if (error || !data) throw new Error(`Couldn't open the file: ${error?.message ?? "not found"}`);
    return data.signedUrl;
  }

  release() {}

  async remove(paths: string[]) {
    if (paths.length === 0) return;
    const { error } = await this.client.storage.from(this.bucket).remove(paths);
    if (error) throw new Error(`Couldn't delete the file: ${error.message}`);
  }
}
