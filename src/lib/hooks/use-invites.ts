"use client";

import { useCallback } from "react";
import { usePlanner } from "./use-planner";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { newId, nowISO } from "@/lib/domain/ids";
import {
  MAX_SNAPSHOT_BYTES, contentFromWedding, makeSlug, newProject, snapshot, snapshotBytes, type InviteContent, type InviteProject, type PublishedInvitation,
} from "@/lib/domain/invite-studio";

/** The couple's invitation projects, with the actions every studio page needs. */
export function useInvites() {
  const store = useStore();
  const data = useWeddingData();
  const [plan, setPlan] = usePlanner("invites");
  const weddingId = data.wedding.id;

  const weddingContent = useCallback((): InviteContent => {
    const moments = [...data.timeline]
      .filter((e) => ["arrival", "poruwa", "reception", "dinner", "cake", "entertainment", "going_away"].includes(e.scene))
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((e) => ({ time: e.time, title: e.title }));
    return contentFromWedding(data.wedding, moments);
  }, [data.wedding, data.timeline]);

  const create = useCallback((templateId: string, content?: InviteContent, name?: string): InviteProject => {
    const p = newProject(templateId, content ?? weddingContent(), nowISO(), newId, name);
    setPlan((prev) => ({ ...prev, projects: [...prev.projects, p] }));
    return p;
  }, [setPlan, weddingContent]);

  const save = useCallback((p: InviteProject) => {
    setPlan((prev) => ({ ...prev, projects: prev.projects.map((x) => (x.id === p.id ? p : x)) }));
  }, [setPlan]);

  const duplicate = useCallback((p: InviteProject): InviteProject => {
    const now = nowISO();
    const copy: InviteProject = { ...structuredClone(p), id: newId(), name: `${p.name} (copy)`, slug: null, publishedAt: null, createdAt: now, updatedAt: now, exports: [] };
    setPlan((prev) => ({ ...prev, projects: [...prev.projects, copy] }));
    return copy;
  }, [setPlan]);

  const remove = useCallback(async (p: InviteProject) => {
    if (p.slug && p.publishedAt) await store.repo.published.unpublish(weddingId, p.slug);
    setPlan((prev) => ({ projects: prev.projects.filter((x) => x.id !== p.id), mainId: prev.mainId === p.id ? null : prev.mainId }));
  }, [setPlan, store, weddingId]);

  /** Publish (or update) the live link. Returns the slug. */
  const publish = useCallback(async (p: InviteProject, opts: { main?: boolean } = {}): Promise<string> => {
    const now = nowISO();
    const isMain = opts.main ?? (plan.mainId === p.id || !plan.mainId);
    const snap = snapshot(p, now);
    if (snapshotBytes(snap) > MAX_SNAPSHOT_BYTES) throw new Error("The invitation is too large to publish — try a smaller photo.");
    let slug = p.slug ?? makeSlug(p.content.brideName, p.content.groomName);
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec: PublishedInvitation = { slug, weddingId, projectId: p.id, isMain, data: snap, publishedAt: now, views: 0, active: true };
      try {
        await store.repo.published.publish(rec);
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        // Someone else has this link (or row security refused it): try a fresh one.
        if (e instanceof Error && /taken|row-level security|violates/i.test(e.message) && !p.publishedAt) slug = makeSlug(p.content.brideName, p.content.groomName);
        else break;
      }
    }
    if (lastError) throw lastError;
    setPlan((prev) => ({
      projects: prev.projects.map((x) => (x.id === p.id ? { ...x, slug, publishedAt: now, updatedAt: now } : x)),
      mainId: isMain ? p.id : prev.mainId,
    }));
    return slug;
  }, [plan.mainId, setPlan, store, weddingId]);

  const unpublish = useCallback(async (p: InviteProject) => {
    if (p.slug) await store.repo.published.unpublish(weddingId, p.slug);
    setPlan((prev) => ({ projects: prev.projects.map((x) => (x.id === p.id ? { ...x, publishedAt: null } : x)), mainId: prev.mainId === p.id ? null : prev.mainId }));
  }, [setPlan, store, weddingId]);

  return { plan, setPlan, weddingId, create, save, duplicate, remove, publish, unpublish, weddingContent, cloud: store.repo.mode === "cloud" };
}
