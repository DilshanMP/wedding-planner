import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEntry } from "@/lib/domain/activity";
import type { CollectionItem, CollectionKey, Wedding, WeddingData } from "@/lib/domain/types";
import { normalizeWeddingData } from "@/lib/domain/normalize";
import { fromRow, TABLES, toRow } from "./mapping";
import type { WeddingRepository, WeddingSummary } from "./repository";

/**
 * Cloud persistence on Supabase. Authorisation is enforced by Row Level
 * Security in the database (see supabase/migrations); this class only maps
 * the domain aggregate to tables.
 */

/** Insert order respects foreign keys (vendors before budget items before payments …). */
const INSERT_ORDER: CollectionKey[] = ["people", "vendors", "budgetItems", "quotes", "payments", "tasks", "guests", "timeline", "documents"];

export class SupabaseRepository implements WeddingRepository {
  readonly mode = "cloud" as const;

  constructor(private readonly client: SupabaseClient) {}

  private fail(action: string, error: { message: string } | null): void {
    if (error) throw new Error(`Couldn't ${action}: ${error.message}`);
  }

  async listWeddings(): Promise<WeddingSummary[]> {
    const { data, error } = await this.client
      .from("weddings")
      .select("id, bride_name, groom_name, wedding_date, location")
      .is("deleted_at", null)
      .order("wedding_date");
    this.fail("load your weddings", error);
    return (data ?? []).map((r) => fromRow<WeddingSummary>(r));
  }

  async loadWedding(id: string): Promise<WeddingData | null> {
    const { data: weddingRow, error } = await this.client.from("weddings").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
    this.fail("load the wedding", error);
    if (!weddingRow) return null;
    // weddings.owner_id is the account that owns the wedding; it isn't part of the domain model.
    const { ownerId, ...wedding } = fromRow<Wedding & { ownerId?: string }>(weddingRow);
    void ownerId;
    const result = { wedding } as WeddingData;
    await Promise.all(
      INSERT_ORDER.map(async (key) => {
        const { data, error: e } = await this.client.from(TABLES[key]).select("*").eq("wedding_id", id);
        this.fail(`load ${TABLES[key].replace("_", " ")}`, e);
        (result as unknown as Record<string, unknown[]>)[key] = (data ?? []).map((r) => fromRow(r));
      }),
    );
    return normalizeWeddingData(result);
  }

  async createWedding(data: WeddingData): Promise<void> {
    const { error } = await this.client.from("weddings").insert(toRow(data.wedding));
    this.fail("create the wedding", error);
    for (const key of INSERT_ORDER) {
      const items = data[key] as { id: string }[];
      if (items.length === 0) continue;
      const { error: e } = await this.client.from(TABLES[key]).insert(items.map((i) => toRow(i, data.wedding.id)));
      this.fail(`save ${TABLES[key].replace("_", " ")}`, e);
    }
  }

  async saveWedding(wedding: Wedding): Promise<void> {
    const row = toRow(wedding);
    delete row.created_at;
    const { error } = await this.client.from("weddings").update(row).eq("id", wedding.id);
    this.fail("save the wedding", error);
  }

  async upsert<K extends CollectionKey>(weddingId: string, key: K, items: CollectionItem<K>[]): Promise<void> {
    if (items.length === 0) return;
    const { error } = await this.client.from(TABLES[key]).upsert(items.map((i) => toRow(i, weddingId)));
    this.fail("save your changes", error);
  }

  async remove(weddingId: string, key: CollectionKey, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client.from(TABLES[key]).delete().eq("wedding_id", weddingId).in("id", ids);
    this.fail("delete", error);
  }

  async deleteWedding(id: string): Promise<void> {
    // Soft delete: keeps data recoverable for 30 days (purged by a scheduled job).
    const { error } = await this.client.from("weddings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    this.fail("delete the wedding", error);
  }

  async logActivity(entries: ActivityEntry[]): Promise<void> {
    if (entries.length === 0) return;
    // actor_id defaults to auth.uid() in the database, so it can't be spoofed.
    const { error } = await this.client.from("activity").insert(
      entries.map((e) => ({ id: e.id, wedding_id: e.weddingId, actor_name: e.actorName, kind: e.kind, summary: e.summary, created_at: e.at })),
    );
    this.fail("record activity", error);
  }

  async listActivity(weddingId: string, limit: number): Promise<ActivityEntry[]> {
    const { data, error } = await this.client
      .from("activity")
      .select("id, wedding_id, actor_id, actor_name, kind, summary, created_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(limit);
    this.fail("load activity", error);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      weddingId: r.wedding_id as string,
      actorId: (r.actor_id as string | null) ?? null,
      actorName: r.actor_name as string,
      kind: r.kind as ActivityEntry["kind"],
      summary: r.summary as string,
      at: new Date(r.created_at as string).toISOString(),
    }));
  }
}
