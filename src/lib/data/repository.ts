import type { ActivityEntry } from "@/lib/domain/activity";
import type { PlannerData, PlannerKey } from "@/lib/domain/planner";
import type { PublishedStore } from "./published";
import type { CollectionItem, CollectionKey, Wedding, WeddingData } from "@/lib/domain/types";

export interface WeddingSummary {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
}

/**
 * Persistence boundary. The UI and store only talk to this interface, so the
 * local (browser) and cloud (Supabase) backends are interchangeable.
 *
 * Writes are item-level so a cloud backend can map each one to a single
 * row upsert/delete protected by Row Level Security.
 */
export interface WeddingRepository {
  readonly mode: "local" | "cloud";
  listWeddings(): Promise<WeddingSummary[]>;
  loadWedding(id: string): Promise<WeddingData | null>;
  createWedding(data: WeddingData): Promise<void>;
  saveWedding(wedding: Wedding): Promise<void>;
  upsert<K extends CollectionKey>(weddingId: string, key: K, items: CollectionItem<K>[]): Promise<void>;
  remove(weddingId: string, key: CollectionKey, ids: string[]): Promise<void>;
  deleteWedding(id: string): Promise<void>;
  /** Save one part of the creative plan (colours, menu, tables…) without touching the rest. */
  savePlanner<K extends PlannerKey>(weddingId: string, key: K, value: PlannerData[K]): Promise<void>;
  /** Who did what. Logging is best effort: a failure never blocks a save. */
  logActivity(entries: ActivityEntry[]): Promise<void>;
  /** Newest first. */
  listActivity(weddingId: string, limit: number): Promise<ActivityEntry[]>;
  /** Published invitations and the replies to them. */
  readonly published: PublishedStore;
}

export function toSummary(w: Wedding): WeddingSummary {
  return { id: w.id, brideName: w.brideName, groomName: w.groomName, weddingDate: w.weddingDate, location: w.location };
}
