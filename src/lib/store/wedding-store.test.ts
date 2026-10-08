import { describe, expect, it } from "vitest";
import { LocalRepository, MemoryStorage } from "@/lib/data/local-repository";
import { createSampleWedding } from "@/lib/domain/sample-data";
import { WeddingStore } from "./wedding-store";

function makeStore() {
  const storage = new MemoryStorage();
  const prefs = new Map<string, string>();
  const repo = new LocalRepository(storage);
  const store = new WeddingStore(repo, { get: (k) => prefs.get(k) ?? null, set: (k, v) => (v === null ? prefs.delete(k) : prefs.set(k, v)) });
  return { store, storage };
}

describe("WeddingStore with local persistence", () => {
  it("starts empty, creates a wedding and persists edits across reloads", async () => {
    const { store, storage } = makeStore();
    await store.init();
    expect(store.getState().status).toBe("empty");
    await store.createWedding(createSampleWedding("2026-10-08", "2026-10-08T00:00:00Z"));
    const s = store.getState();
    if (s.status !== "ready") throw new Error("not ready");
    const guest = s.data.guests[0];
    store.upsert("guests", { ...guest, rsvp: "no" });
    await store.flush();

    const reopened = new WeddingStore(new LocalRepository(storage), { get: () => null, set: () => {} });
    await reopened.init();
    const r = reopened.getState();
    if (r.status !== "ready") throw new Error("not ready");
    expect(r.data.guests.find((g) => g.id === guest.id)?.rsvp).toBe("no");
  });

  it("moving the wedding date moves open tasks", async () => {
    const { store } = makeStore();
    await store.createWedding(createSampleWedding("2026-10-08", "2026-10-08T00:00:00Z"));
    const before = store.getState();
    if (before.status !== "ready") throw new Error();
    const open = before.data.tasks.find((t) => t.status === "not_started")!;
    store.updateWedding({ weddingDate: "2027-06-19" });
    await store.flush();
    const after = store.getState();
    if (after.status !== "ready") throw new Error();
    const moved = after.data.tasks.find((t) => t.id === open.id)!;
    expect(moved.dueDate! > open.dueDate!).toBe(true);
  });

  it("deleting a vendor clears references and removes its quotes", async () => {
    const { store, storage } = makeStore();
    await store.createWedding(createSampleWedding("2026-10-08", "2026-10-08T00:00:00Z"));
    const s = store.getState();
    if (s.status !== "ready") throw new Error();
    const vendor = s.data.vendors.find((v) => v.name === "Ceylon Frames")!;
    store.remove("vendors", vendor.id);
    await store.flush();
    const reopened = new WeddingStore(new LocalRepository(storage), { get: () => null, set: () => {} });
    await reopened.init();
    const r = reopened.getState();
    if (r.status !== "ready") throw new Error();
    expect(r.data.vendors.some((v) => v.id === vendor.id)).toBe(false);
    expect(r.data.quotes.some((q) => q.vendorId === vendor.id)).toBe(false);
    expect(r.data.payments.some((p) => p.vendorId === vendor.id)).toBe(false);
    expect(r.data.budgetItems.some((b) => b.vendorId === vendor.id)).toBe(false);
  });
});
