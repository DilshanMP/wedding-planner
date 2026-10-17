import type { SupabaseClient } from "@supabase/supabase-js";
import type { ID } from "@/lib/domain/types";
import type { InvitationRsvp, PublishedInvitation, PublishedSnapshot } from "@/lib/domain/invite-studio";
import type { KeyValueStore } from "./local-repository";

/**
 * Published invitations and their RSVPs.
 *
 * Cloud: rows in `published_invitations` / `invitation_rsvps`. Members of the
 * wedding manage them through Row Level Security; guests (not signed in) can
 * only read one invitation by its slug and add a reply, through two
 * security-definer functions — they can never list invitations or read
 * anyone's replies.
 *
 * Local (no cloud account): the same records in this browser's storage, so
 * the whole flow can be previewed on one device.
 */

export interface GuestReply {
  name: string;
  attending: "yes" | "no" | "maybe";
  party: number;
  message: string;
  contact: string;
}

const PUB = (slug: string) => `wedding-os:published:${slug}`;
const INDEX = (weddingId: string) => `wedding-os:published-index:${weddingId}`;
const RSVPS = (weddingId: string) => `wedding-os:invitation-rsvps:${weddingId}`;

function readJson<T>(storage: KeyValueStore, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage: KeyValueStore, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("This browser's storage is full. Remove the photo or connect a cloud account to publish.");
  }
}

export interface PublishedStore {
  publish(p: PublishedInvitation): Promise<void>;
  unpublish(weddingId: ID, slug: string): Promise<void>;
  list(weddingId: ID): Promise<PublishedInvitation[]>;
  rsvps(weddingId: ID): Promise<InvitationRsvp[]>;
  removeRsvp(weddingId: ID, id: ID): Promise<void>;
  /** Guest side: the invitation (counts a view), or null if it's not live. */
  open(slug: string): Promise<PublishedSnapshot | null>;
  reply(slug: string, r: GuestReply): Promise<boolean>;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export class LocalPublished implements PublishedStore {
  constructor(private readonly storage: KeyValueStore) {}

  async publish(p: PublishedInvitation) {
    const existing = readJson<PublishedInvitation | null>(this.storage, PUB(p.slug), null);
    if (existing && existing.weddingId !== p.weddingId) throw new Error("That link is already taken. Try another.");
    writeJson(this.storage, PUB(p.slug), { ...p, views: existing?.views ?? 0, active: true });
    const index = readJson<string[]>(this.storage, INDEX(p.weddingId), []);
    if (!index.includes(p.slug)) writeJson(this.storage, INDEX(p.weddingId), [...index, p.slug]);
    if (p.isMain) for (const other of await this.list(p.weddingId)) if (other.slug !== p.slug && other.isMain) writeJson(this.storage, PUB(other.slug), { ...other, isMain: false });
  }

  async unpublish(weddingId: ID, slug: string) {
    const p = readJson<PublishedInvitation | null>(this.storage, PUB(slug), null);
    if (p && p.weddingId === weddingId) writeJson(this.storage, PUB(slug), { ...p, active: false, isMain: false });
  }

  async list(weddingId: ID): Promise<PublishedInvitation[]> {
    return readJson<string[]>(this.storage, INDEX(weddingId), [])
      .map((s) => readJson<PublishedInvitation | null>(this.storage, PUB(s), null))
      .filter((p): p is PublishedInvitation => Boolean(p));
  }

  /** What a guest sees (counts a view). */
  async open(slug: string): Promise<PublishedSnapshot | null> {
    const p = readJson<PublishedInvitation | null>(this.storage, PUB(slug), null);
    if (!p || !p.active) return null;
    writeJson(this.storage, PUB(slug), { ...p, views: p.views + 1 });
    return p.data;
  }

  async reply(slug: string, r: GuestReply, id = uid(), now = new Date().toISOString()): Promise<boolean> {
    const p = readJson<PublishedInvitation | null>(this.storage, PUB(slug), null);
    if (!p || !p.active) return false;
    const list = readJson<InvitationRsvp[]>(this.storage, RSVPS(p.weddingId), []);
    list.unshift({ id, slug, weddingId: p.weddingId, ...r, party: r.attending === "yes" ? r.party : 0, createdAt: now });
    writeJson(this.storage, RSVPS(p.weddingId), list.slice(0, 2000));
    return true;
  }

  async rsvps(weddingId: ID): Promise<InvitationRsvp[]> {
    return readJson<InvitationRsvp[]>(this.storage, RSVPS(weddingId), []);
  }

  async removeRsvp(weddingId: ID, id: ID) {
    writeJson(this.storage, RSVPS(weddingId), (await this.rsvps(weddingId)).filter((r) => r.id !== id));
  }
}

/* ------------------------------------------------------------------ */
/* Cloud                                                               */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const fromRow = (r: Row): PublishedInvitation => ({
  slug: r.slug as string,
  weddingId: r.wedding_id as string,
  projectId: r.project_id as string,
  isMain: Boolean(r.is_main),
  data: r.data as PublishedSnapshot,
  publishedAt: new Date(r.published_at as string).toISOString(),
  views: Number(r.views ?? 0),
  active: !r.unpublished_at,
});

const rsvpFromRow = (r: Row): InvitationRsvp => ({
  id: r.id as string,
  slug: r.slug as string,
  weddingId: r.wedding_id as string,
  name: r.name as string,
  attending: r.attending as InvitationRsvp["attending"],
  party: Number(r.party ?? 0),
  message: (r.message as string) ?? "",
  contact: (r.contact as string) ?? "",
  createdAt: new Date(r.created_at as string).toISOString(),
});

const MIGRATION = "run supabase/migrations/20261020000000_invitation_studio.sql in the Supabase SQL Editor";

function explain(action: string, error: { message: string; code?: string } | null) {
  if (!error) return;
  if (/published_invitations|invitation_rsvps|schema cache|does not exist/i.test(error.message)) throw new Error(`Couldn't ${action}: this needs a one-time database update — ${MIGRATION}.`);
  if (error.code === "23505") throw new Error("That link is already taken. Try another.");
  throw new Error(`Couldn't ${action}: ${error.message}`);
}

export class CloudPublished implements PublishedStore {
  constructor(private readonly client: SupabaseClient) {}

  async publish(p: PublishedInvitation) {
    if (p.isMain) {
      const { error } = await this.client.from("published_invitations").update({ is_main: false }).eq("wedding_id", p.weddingId).neq("slug", p.slug);
      explain("publish", error);
    }
    const { error } = await this.client.from("published_invitations").upsert({
      slug: p.slug, wedding_id: p.weddingId, project_id: p.projectId, is_main: p.isMain, data: p.data, published_at: p.publishedAt, unpublished_at: null,
    });
    explain("publish", error);
  }

  async unpublish(weddingId: ID, slug: string) {
    const { error } = await this.client.from("published_invitations").update({ unpublished_at: new Date().toISOString(), is_main: false }).eq("wedding_id", weddingId).eq("slug", slug);
    explain("unpublish", error);
  }

  async list(weddingId: ID): Promise<PublishedInvitation[]> {
    const { data, error } = await this.client.from("published_invitations").select("slug, wedding_id, project_id, is_main, data, published_at, views, unpublished_at").eq("wedding_id", weddingId);
    explain("load published invitations", error);
    return (data ?? []).map(fromRow);
  }

  async rsvps(weddingId: ID): Promise<InvitationRsvp[]> {
    const { data, error } = await this.client.from("invitation_rsvps").select("id, slug, wedding_id, name, attending, party, message, contact, created_at").eq("wedding_id", weddingId).order("created_at", { ascending: false }).limit(2000);
    explain("load replies", error);
    return (data ?? []).map(rsvpFromRow);
  }

  async removeRsvp(weddingId: ID, id: ID) {
    const { error } = await this.client.from("invitation_rsvps").delete().eq("wedding_id", weddingId).eq("id", id);
    explain("delete the reply", error);
  }

  /** Guest side (works signed out). */
  async open(slug: string): Promise<PublishedSnapshot | null> {
    const { data, error } = await this.client.rpc("published_invitation", { p_slug: slug });
    explain("open the invitation", error);
    return (data as PublishedSnapshot | null) ?? null;
  }

  async reply(slug: string, r: GuestReply): Promise<boolean> {
    const { data, error } = await this.client.rpc("submit_published_rsvp", {
      p_slug: slug, p_name: r.name, p_attending: r.attending, p_party: r.party, p_message: r.message, p_contact: r.contact,
    });
    explain("send your reply", error);
    return Boolean(data);
  }
}
