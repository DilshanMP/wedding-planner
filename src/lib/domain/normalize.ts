import { newId } from "./ids";
import type { WeddingData } from "./types";

/**
 * Bring stored data up to the current model. Fills fields added after a
 * wedding was first saved, so older browsers and exports keep working.
 */
export function normalizeWeddingData(raw: WeddingData): WeddingData {
  const data = { ...raw } as WeddingData;
  data.people = (data.people ?? []).map((p) => ({ ...p, phone: p.phone ?? "" }));
  data.tasks ??= [];
  data.guests = (data.guests ?? []).map((g) => (g.rsvpToken ? g : { ...g, rsvpToken: newId() }));
  data.budgetItems ??= [];
  data.vendors ??= [];
  data.quotes ??= [];
  data.payments ??= [];
  data.timeline ??= [];
  data.documents ??= [];
  data.wedding = {
    ...data.wedding,
    rsvpEnabled: data.wedding.rsvpEnabled ?? false,
    dayNotes: data.wedding.dayNotes ?? [],
    plannerQuotes: data.wedding.plannerQuotes ?? {},
    pendingAttendanceRate: data.wedding.pendingAttendanceRate ?? 0.75,
  };
  return data;
}
