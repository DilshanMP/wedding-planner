import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEntry } from "@/lib/domain/activity";
import type { PlannerData, PlannerKey } from "@/lib/domain/planner";
import type { CollectionItem, CollectionKey, Wedding, WeddingData } from "@/lib/domain/types";
import { normalizeWeddingData } from "@/lib/domain/normalize";
import { fromRow, TABLES, toRow } from "./mapping";
import type { WeddingRepository, WeddingSummary } from "./repository";
import { CloudPublished } from "./published";

/**
 * Cloud persistence on Supabase. Authorisation is enforced by Row Level
 * Security in the database (see supabase/migrations); this class only maps
 * the domain aggregate to tables.
 */

/** Insert order respects foreign keys (vendors before budget items before payments …). */
/** Each part of the creative plan has its own jsonb column on `weddings`. */
const PLANNER_COLUMNS: Record<PlannerKey, string> = { theme: "theme", menu: "menu_plan", seating: "seating_plan", stationery: "stationery", vision: "vision_board", invites: "invite_projects" };

function splitPlanner(row: Record<string, unknown>): { row: Record<string, unknown>; planner: Partial<PlannerData> } {
  const rest = { ...row };
  const planner: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(PLANNER_COLUMNS)) {
    if (col in rest) {
      // Empty objects mean "not set yet"; normalisation fills defaults.
      const v = rest[col];
      if (v && typeof v === "object" && Object.keys(v).length > 0) planner[key] = v;
      delete rest[col];
    }
  }
  return { row: rest, planner: planner as Partial<PlannerData> };
}

const INSERT_ORDER: CollectionKey[] = ["people", "vendors", "budgetItems", "quotes", "payments", "tasks", "guests", "timeline", "documents"];

/** "Could not find the 'category' column of 'guests' in the schema cache" → "category". */
function missingColumn(message: string): string | null {
  return /Could not find the '([a-z_]+)' column/i.exec(message)?.[1] ?? null;
}

export class SupabaseRepository implements WeddingRepository {
  readonly mode = "cloud" as const;
  /** Newer columns the project's database doesn't have yet (a migration wasn't run). */
  readonly missingColumns = new Set<string>();

  /**
   * Insert or upsert, leaving out columns the database doesn't know yet, so
   * a new app version keeps saving before its migration has been applied.
   */
  private async write(table: string, rows: Record<string, unknown>[], mode: "insert" | "upsert") {
    for (let attempt = 0; attempt < 6; attempt++) {
      const clean = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !this.missingColumns.has(`${table}.${k}`))));
      const q = this.client.from(table);
      const { error } = mode === "insert" ? await q.insert(clean) : await q.upsert(clean);
      const col = error ? missingColumn(error.message) : null;
      if (!col || this.missingColumns.has(`${table}.${col}`)) return error;
      this.missingColumns.add(`${table}.${col}`);
    }
    return null;
  }

  readonly published: CloudPublished;

  constructor(private readonly client: SupabaseClient) {
    this.published = new CloudPublished(client);
  }

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
    const { row, planner } = splitPlanner(weddingRow);
    // weddings.owner_id is the account that owns the wedding; it isn't part of the domain model.
    const { ownerId, ...wedding } = fromRow<Wedding & { ownerId?: string }>(row);
    void ownerId;
    const result = { wedding, planner } as unknown as WeddingData;
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
    const row = toRow(data.wedding);
    for (const [key, col] of Object.entries(PLANNER_COLUMNS)) row[col] = data.planner[key as PlannerKey];
    const error = await this.write("weddings", [row], "insert");
    this.fail("create the wedding", error);
    for (const key of INSERT_ORDER) {
      const items = data[key] as { id: string }[];
      if (items.length === 0) continue;
      const e = await this.write(TABLES[key], items.map((i) => toRow(i, data.wedding.id)), "insert");
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
    const error = await this.write(TABLES[key], items.map((i) => toRow(i, weddingId)), "upsert");
    this.fail("save your changes", error);
  }

  async remove(weddingId: string, key: CollectionKey, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client.from(TABLES[key]).delete().eq("wedding_id", weddingId).in("id", ids);
    this.fail("delete", error);
  }

  async savePlanner<K extends PlannerKey>(weddingId: string, key: K, value: PlannerData[K]): Promise<void> {
    const { error } = await this.client.from("weddings").update({ [PLANNER_COLUMNS[key]]: value }).eq("id", weddingId);
    if (error && /column|schema cache/i.test(error.message)) {
      throw new Error(key === "invites"
        ? "This needs a one-time database update: run supabase/migrations/20261020000000_invitation_studio.sql in the Supabase SQL Editor."
        : "This needs a one-time database update: run supabase/migrations/20261014000000_planner.sql in the Supabase SQL Editor.");
    }
    this.fail("save your changes", error);
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
