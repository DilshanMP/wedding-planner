import type { CollectionItem, CollectionKey, Wedding, WeddingData } from "@/lib/domain/types";
import type { ActivityEntry } from "@/lib/domain/activity";
import { normalizeWeddingData } from "@/lib/domain/normalize";
import { toSummary, type WeddingRepository, type WeddingSummary } from "./repository";

/**
 * Browser-only persistence in localStorage. Used when no Supabase project is
 * configured, and for the demo wedding. Data never leaves the device.
 */

const KEY = "wedding-os:v1";
const ACTIVITY_KEY = (weddingId: string) => `wedding-os:activity:${weddingId}`;
const ACTIVITY_LIMIT = 300;

interface Snapshot {
  version: 1;
  weddings: Record<string, WeddingData>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalRepository implements WeddingRepository {
  readonly mode = "local" as const;
  private cache: Snapshot | null = null;

  constructor(private readonly storage: KeyValueStore) {}

  private read(): Snapshot {
    if (this.cache) return this.cache;
    let snap: Snapshot = { version: 1, weddings: {} };
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Snapshot;
        if (parsed?.version === 1 && parsed.weddings && typeof parsed.weddings === "object") snap = parsed;
      }
    } catch {
      // Corrupt or unavailable storage: start clean rather than crash.
    }
    this.cache = snap;
    return snap;
  }

  private write(): void {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.read()));
    } catch (e) {
      throw new Error(
        e instanceof Error && e.name === "QuotaExceededError"
          ? "This browser's storage is full. Export your data or connect a cloud account."
          : "Couldn't save to this browser's storage.",
      );
    }
  }

  private wedding(id: string): WeddingData {
    const weddings = this.read().weddings;
    if (!weddings[id]) throw new Error("This wedding no longer exists on this device.");
    weddings[id] = normalizeWeddingData(weddings[id]);
    return weddings[id];
  }

  async listWeddings(): Promise<WeddingSummary[]> {
    return Object.values(this.read().weddings).map((d) => toSummary(d.wedding));
  }

  async loadWedding(id: string): Promise<WeddingData | null> {
    const data = this.read().weddings[id];
    return data ? normalizeWeddingData(structuredClone(data)) : null;
  }

  async createWedding(data: WeddingData): Promise<void> {
    this.read().weddings[data.wedding.id] = structuredClone(data);
    this.write();
  }

  async saveWedding(wedding: Wedding): Promise<void> {
    this.wedding(wedding.id).wedding = structuredClone(wedding);
    this.write();
  }

  async upsert<K extends CollectionKey>(weddingId: string, key: K, items: CollectionItem<K>[]): Promise<void> {
    const data = this.wedding(weddingId);
    const list = data[key] as CollectionItem<K>[];
    for (const item of items) {
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) list[idx] = structuredClone(item);
      else list.push(structuredClone(item));
    }
    this.write();
  }

  async remove(weddingId: string, key: CollectionKey, ids: string[]): Promise<void> {
    const data = this.wedding(weddingId);
    const drop = new Set(ids);
    (data as unknown as Record<string, { id: string }[]>)[key] = (data[key] as { id: string }[]).filter((x) => !drop.has(x.id));
    this.write();
  }

  async deleteWedding(id: string): Promise<void> {
    delete this.read().weddings[id];
    this.write();
    try {
      this.storage.setItem(ACTIVITY_KEY(id), "");
    } catch {
      // Nothing to clean up.
    }
  }

  private readActivity(weddingId: string): ActivityEntry[] {
    try {
      const raw = this.storage.getItem(ACTIVITY_KEY(weddingId));
      const list = raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async logActivity(entries: ActivityEntry[]): Promise<void> {
    for (const weddingId of new Set(entries.map((e) => e.weddingId))) {
      const fresh = entries.filter((e) => e.weddingId === weddingId).reverse();
      const next = [...fresh, ...this.readActivity(weddingId)].slice(0, ACTIVITY_LIMIT);
      try {
        this.storage.setItem(ACTIVITY_KEY(weddingId), JSON.stringify(next));
      } catch {
        // A full browser store shouldn't break planning; the feed is a convenience.
      }
    }
  }

  async listActivity(weddingId: string, limit: number): Promise<ActivityEntry[]> {
    return this.readActivity(weddingId).slice(0, limit);
  }
}

/** In-memory storage for tests and when localStorage is unavailable (private mode). */
export class MemoryStorage implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}
