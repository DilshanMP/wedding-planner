import type { CollectionKey } from "@/lib/domain/types";

/** Database table for each collection in the wedding aggregate. */
export const TABLES: Record<CollectionKey, string> = {
  people: "participants",
  tasks: "tasks",
  guests: "guests",
  budgetItems: "budget_items",
  vendors: "vendors",
  quotes: "vendor_quotes",
  payments: "payments",
  timeline: "timeline_events",
  documents: "documents",
};

/** JSON / array columns whose inner keys must not be case-converted. */
const OPAQUE = new Set(["features", "blueprint", "plannerQuotes", "dayNotes", "priorities", "mustHave", "niceToHave", "avoidOverspending", "dependsOn", "vendorIds"]);

/** Database-only columns that the domain model doesn't carry. */
const DB_ONLY = new Set(["wedding_id", "deleted_at", "public_slug", "user_id", "invited_by", "uploaded_by"]);

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Numeric columns returned by PostgREST as strings (numeric type). */
const NUMERIC = new Set(["rating", "reviewScore", "hours", "pendingAttendanceRate"]);

export function toRow(item: object, weddingId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    row[toSnake(k)] = OPAQUE.has(k) ? v : v === undefined ? null : v;
  }
  if (weddingId) row.wedding_id = weddingId;
  return row;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (DB_ONLY.has(k)) continue;
    const key = toCamel(k);
    if (NUMERIC.has(key) && typeof v === "string") out[key] = Number(v);
    // Timestamps come back as "…+00:00"; keep the app's canonical ISO form.
    else if (key.endsWith("At") && typeof v === "string" && v.includes("T")) out[key] = new Date(v).toISOString();
    else out[key] = v;
  }
  return out as T;
}
