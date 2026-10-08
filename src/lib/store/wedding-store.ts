import { rescheduleTasks } from "@/lib/domain/tasks";
import { nowISO } from "@/lib/domain/ids";
import type { CollectionItem, CollectionKey, Wedding, WeddingData } from "@/lib/domain/types";
import type { WeddingRepository, WeddingSummary } from "@/lib/data/repository";
import { toSummary } from "@/lib/data/repository";

export type StoreState =
  | { status: "loading" }
  | { status: "empty"; weddings: WeddingSummary[] }
  | { status: "ready"; weddings: WeddingSummary[]; data: WeddingData; saving: boolean; error: string | null }
  | { status: "error"; message: string };

type Listener = () => void;

const ACTIVE_KEY = "wedding-os:active";

/**
 * Client state for the active wedding. Writes are applied optimistically,
 * then persisted through the repository in order. If a write fails the error
 * is surfaced and the wedding is reloaded from the source of truth.
 */
export class WeddingStore {
  private state: StoreState = { status: "loading" };
  private listeners = new Set<Listener>();
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;

  constructor(
    readonly repo: WeddingRepository,
    private readonly prefs: { get(k: string): string | null; set(k: string, v: string | null): void },
  ) {}

  getState = (): StoreState => this.state;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(next: StoreState) {
    this.state = next;
    for (const fn of this.listeners) fn();
  }

  private get ready() {
    if (this.state.status !== "ready") throw new Error("No wedding is open.");
    return this.state;
  }

  async init(): Promise<void> {
    try {
      const weddings = await this.repo.listWeddings();
      const preferred = this.prefs.get(ACTIVE_KEY);
      const active = weddings.find((w) => w.id === preferred) ?? weddings[0];
      if (!active) return this.set({ status: "empty", weddings });
      await this.open(active.id, weddings);
    } catch (e) {
      this.set({ status: "error", message: e instanceof Error ? e.message : "Couldn't load your wedding." });
    }
  }

  private async open(id: string, weddings?: WeddingSummary[]) {
    const list = weddings ?? (await this.repo.listWeddings());
    const data = await this.repo.loadWedding(id);
    if (!data) return this.set({ status: "empty", weddings: list });
    this.prefs.set(ACTIVE_KEY, id);
    this.set({ status: "ready", weddings: list, data, saving: false, error: null });
  }

  selectWedding = (id: string) => this.open(id);

  async createWedding(data: WeddingData): Promise<void> {
    await this.repo.createWedding(data);
    await this.open(data.wedding.id);
  }

  async deleteWedding(id: string): Promise<void> {
    await this.repo.deleteWedding(id);
    if (this.prefs.get(ACTIVE_KEY) === id) this.prefs.set(ACTIVE_KEY, null);
    await this.init();
  }

  dismissError = () => {
    if (this.state.status === "ready") this.set({ ...this.state, error: null });
  };

  /** Run a persistence step after an optimistic update. */
  private persist(step: () => Promise<void>) {
    this.pending++;
    if (this.state.status === "ready") this.set({ ...this.state, saving: true });
    this.queue = this.queue
      .then(step)
      .catch(async (e: unknown) => {
        const message = e instanceof Error ? e.message : "Couldn't save your change.";
        const s = this.state;
        if (s.status === "ready") {
          const fresh = await this.repo.loadWedding(s.data.wedding.id).catch(() => null);
          this.set({ ...s, data: fresh ?? s.data, error: message });
        }
      })
      .finally(() => {
        this.pending--;
        if (this.pending === 0 && this.state.status === "ready") this.set({ ...this.state, saving: false });
      });
    return this.queue;
  }

  /** Resolves when all queued writes have finished. */
  flush = () => this.queue;

  updateWedding(patch: Partial<Omit<Wedding, "id" | "createdAt">>) {
    const s = this.ready;
    const old = s.data.wedding;
    const wedding: Wedding = { ...old, ...patch, updatedAt: nowISO() };
    let data: WeddingData = { ...s.data, wedding };
    let movedTasks: WeddingData["tasks"] = [];
    // Moving the date moves the plan with it.
    if (patch.weddingDate && patch.weddingDate !== old.weddingDate) {
      const tasks = rescheduleTasks(s.data.tasks, old.weddingDate, patch.weddingDate);
      movedTasks = tasks.filter((t, i) => t !== s.data.tasks[i]);
      data = { ...data, tasks };
    }
    const weddings = s.weddings.map((w) => (w.id === wedding.id ? toSummary(wedding) : w));
    this.set({ ...s, data, weddings });
    return this.persist(async () => {
      await this.repo.saveWedding(wedding);
      if (movedTasks.length) await this.repo.upsert(wedding.id, "tasks", movedTasks);
    });
  }

  upsert<K extends CollectionKey>(key: K, items: CollectionItem<K> | CollectionItem<K>[]) {
    const s = this.ready;
    const now = nowISO();
    const list = (Array.isArray(items) ? items : [items]).map((i) => ({ ...i, updatedAt: now }) as CollectionItem<K>);
    const current = [...(s.data[key] as CollectionItem<K>[])];
    for (const item of list) {
      const idx = current.findIndex((x) => x.id === item.id);
      if (idx >= 0) current[idx] = item;
      else current.push(item);
    }
    this.set({ ...s, data: { ...s.data, [key]: current } });
    const weddingId = s.data.wedding.id;
    return this.persist(() => this.repo.upsert(weddingId, key, list));
  }

  remove(key: CollectionKey, ids: string | string[]) {
    const s = this.ready;
    const drop = new Set(Array.isArray(ids) ? ids : [ids]);
    const { data, touched, removed } = cascadeRemove(s.data, key, drop);
    this.set({ ...s, data });
    const weddingId = s.data.wedding.id;
    return this.persist(async () => {
      // Clear references first so local storage mirrors the database's ON DELETE SET NULL.
      for (const [k, items] of touched) await this.repo.upsert(weddingId, k, items as never);
      for (const [k, removedIds] of removed) await this.repo.remove(weddingId, k, removedIds);
      await this.repo.remove(weddingId, key, [...drop]);
    });
  }
}

/** Remove items and clear references to them, mirroring the database's foreign keys. */
export function cascadeRemove(data: WeddingData, key: CollectionKey, drop: Set<string>) {
  const next: WeddingData = { ...data, [key]: (data[key] as { id: string }[]).filter((x) => !drop.has(x.id)) };
  const touched = new Map<CollectionKey, unknown[]>();
  const removed = new Map<CollectionKey, string[]>();
  const patch = <K extends CollectionKey>(k: K, fn: (item: CollectionItem<K>) => CollectionItem<K> | null) => {
    const changed: CollectionItem<K>[] = [];
    const list = (next[k] as CollectionItem<K>[]).flatMap((item) => {
      const updated = fn(item);
      if (updated === null) return [];
      if (updated !== item) changed.push(updated);
      return [updated];
    });
    (next as unknown as Record<string, unknown>)[k] = list;
    if (changed.length) touched.set(k, changed);
  };

  if (key === "vendors") {
    patch("budgetItems", (i) => (i.vendorId && drop.has(i.vendorId) ? { ...i, vendorId: null } : i));
    patch("payments", (p) => (p.vendorId && drop.has(p.vendorId) ? { ...p, vendorId: null } : p));
    patch("tasks", (t) => (t.vendorId && drop.has(t.vendorId) ? { ...t, vendorId: null } : t));
    patch("timeline", (e) => (e.vendorIds.some((v) => drop.has(v)) ? { ...e, vendorIds: e.vendorIds.filter((v) => !drop.has(v)) } : e));
    // Quotes belong to their vendor (ON DELETE CASCADE).
    const orphaned = next.quotes.filter((q) => drop.has(q.vendorId)).map((q) => q.id);
    if (orphaned.length) {
      next.quotes = next.quotes.filter((q) => !drop.has(q.vendorId));
      removed.set("quotes", orphaned);
    }
  }
  if (key === "budgetItems") patch("payments", (p) => (p.budgetItemId && drop.has(p.budgetItemId) ? { ...p, budgetItemId: null } : p));
  if (key === "people") {
    patch("tasks", (t) => (t.ownerId && drop.has(t.ownerId) ? { ...t, ownerId: null } : t));
    patch("timeline", (e) => (e.ownerId && drop.has(e.ownerId) ? { ...e, ownerId: null } : e));
  }
  if (key === "tasks") patch("tasks", (t) => (t.dependsOn.some((d) => drop.has(d)) ? { ...t, dependsOn: t.dependsOn.filter((d) => !drop.has(d)) } : t));
  return { data: next, touched, removed };
}
