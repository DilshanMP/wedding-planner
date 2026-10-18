"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search, Trash2, UserPlus } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { useStore } from "@/lib/store/provider";
import { newId, nowISO } from "@/lib/domain/ids";
import type { InvitationRsvp } from "@/lib/domain/invite-studio";
import type { Guest, WeddingData } from "@/lib/domain/types";
import { downloadBlob } from "@/lib/svg-export";
import { StudioTabs } from "@/components/invite/studio-tabs";
import { Badge, EmptyState, Notice, PageHeader, Stat } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/fields";
import { ConfirmDialog } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function RsvpsView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Rsvps data={page.data} />;
}

const ANSWER: Record<InvitationRsvp["attending"], { label: string; tone: "success" | "danger" | "warning" }> = {
  yes: { label: "Coming", tone: "success" },
  no: { label: "Can't come", tone: "danger" },
  maybe: { label: "Maybe", tone: "warning" },
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Names compared loosely: "Nimal Perera " matches "nimal perera". */
const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

function Rsvps({ data }: { data: WeddingData }) {
  const store = useStore();
  const toast = useToast();
  const { plan, weddingId, cloud } = useInvites();
  const [rows, setRows] = useState<InvitationRsvp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | InvitationRsvp["attending"]>("all");
  const [slug, setSlug] = useState("all");
  const [q, setQ] = useState("");
  const [removing, setRemoving] = useState<InvitationRsvp | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    store.repo.published.rsvps(weddingId).then(
      (r) => alive && (setRows(r), setError(null)),
      (e: unknown) => alive && (setRows([]), setError(e instanceof Error ? e.message : "Couldn't load replies.")),
    );
    return () => {
      alive = false;
    };
  }, [store, weddingId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const nameOf = (s: string) => plan.projects.find((p) => p.slug === s)?.name ?? s;
  const slugs = [...new Set((rows ?? []).map((r) => r.slug))];
  const shown = useMemo(() => (rows ?? []).filter((r) => (filter === "all" || r.attending === filter) && (slug === "all" || r.slug === slug) && (!q.trim() || `${r.name} ${r.message} ${r.contact}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, filter, slug, q]);
  const all = rows ?? [];
  const coming = all.filter((r) => r.attending === "yes");
  const people = coming.reduce((n, r) => n + r.party, 0);

  const inList = (r: InvitationRsvp) => data.guests.find((g) => same(g.name, r.name));
  const addToGuests = (r: InvitationRsvp) => {
    const existing = inList(r);
    const now = nowISO();
    const rsvp = r.attending;
    if (existing) {
      store.upsert("guests", { ...existing, rsvp, invitation: "confirmed", adults: rsvp === "yes" ? Math.max(1, r.party) : existing.adults, updatedAt: now });
      toast(`${existing.name} updated in your guest list.`);
      return;
    }
    const g: Guest = {
      id: newId(), name: r.name.trim(), phone: r.contact.trim(), email: "", side: "both", category: "", relation: "friend", vip: false,
      partyType: r.party > 2 ? "family" : r.party === 2 ? "couple" : "single", adults: Math.max(1, r.party), children: 0,
      invitation: "confirmed", rsvp, meal: "unknown", vegCount: 0, table: "", needsTransport: false, needsAccommodation: false,
      notes: r.message ? `Invitation reply: ${r.message}` : "Added from an invitation reply", rsvpToken: newId(), createdAt: now, updatedAt: now,
    };
    store.upsert("guests", g);
    toast(`${g.name} added to your guest list.`);
  };

  const exportCsv = () => {
    const head = ["Name", "Answer", "People", "Message", "Contact", "Invitation", "Replied"];
    const lines = shown.map((r) => [r.name, ANSWER[r.attending].label, r.party, r.message, r.contact, nameOf(r.slug), new Date(r.createdAt).toLocaleString("en-GB")].map(csvCell).join(","));
    downloadBlob(new Blob([`﻿${[head.map(csvCell).join(","), ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" }), "invitation-replies.csv");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader overline="EverAfter Studio" title="Replies" lead="Everyone who answered through a published invitation link." actions={<button type="button" className="wos-btn wos-btn--secondary" onClick={reload}><RefreshCw className="wos-icon" aria-hidden="true" />Refresh</button>} />
      <StudioTabs />
      {!cloud && <Notice tone="info" icon={<RefreshCw className="wos-icon" aria-hidden="true" />} title="Test replies on this device">Replies you send to your own test link appear here. Sign in with a cloud account to receive guests&apos; replies.</Notice>}
      {error && <Notice tone="danger" icon={<RefreshCw className="wos-icon" aria-hidden="true" />} title="Couldn't load replies" role="alert">{error}</Notice>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat overline="Replies" value={String(all.length)} label="in total" />
        <Stat overline="Coming" value={String(coming.length)} label={`${people} ${people === 1 ? "person" : "people"}`} keyFigure />
        <Stat overline="Can't come" value={String(all.filter((r) => r.attending === "no").length)} label="sent regrets" />
        <Stat overline="Maybe" value={String(all.filter((r) => r.attending === "maybe").length)} label="not sure yet" />
      </div>

      {rows === null ? (
        <p className="m-0 text-ink-muted" aria-busy="true">Loading replies…</p>
      ) : all.length === 0 ? (
        <EmptyState title="No replies yet">Publish an invitation and share its link — replies appear here as they arrive.</EmptyState>
      ) : (
        <section className="wos-card flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="wos-field min-w-[200px] flex-1">
              <span className="sr-only">Search replies</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <input className="wos-input !pl-9" type="search" placeholder="Search names or messages" value={q} onChange={(e) => setQ(e.target.value)} />
              </span>
            </label>
            <SelectField label="Answer" value={filter} onChange={setFilter} options={[{ value: "all", label: "All answers" }, { value: "yes", label: "Coming" }, { value: "no", label: "Can't come" }, { value: "maybe", label: "Maybe" }]} />
            {slugs.length > 1 && <SelectField label="Invitation" value={slug} onChange={setSlug} options={[{ value: "all", label: "All invitations" }, ...slugs.map((s) => ({ value: s, label: nameOf(s) }))]} />}
            <button type="button" className="wos-btn wos-btn--secondary" onClick={exportCsv} disabled={!shown.length}><Download className="wos-icon" aria-hidden="true" />Download CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="wos-table w-full" data-testid="rsvp-table">
              <thead>
                <tr><th>Name</th><th>Answer</th><th className="text-right">People</th><th>Message</th><th>Replied</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const g = inList(r);
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong>{r.contact && <span className="block text-[12px] text-ink-muted">{r.contact}</span>}</td>
                      <td><Badge tone={ANSWER[r.attending].tone}>{ANSWER[r.attending].label}</Badge></td>
                      <td className="text-right tabular-nums">{r.attending === "yes" ? r.party : "—"}</td>
                      <td className="wrap max-w-[320px] text-[14px] text-ink-muted">{r.message || "—"}</td>
                      <td className="whitespace-nowrap text-[13px] text-ink-muted">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => addToGuests(r)}><UserPlus className="wos-icon" aria-hidden="true" />{g ? (g.rsvp === r.attending ? "In guest list" : "Update guest") : "Add to guests"}</button>
                          <button type="button" className="wos-iconbtn" aria-label={`Delete reply from ${r.name}`} onClick={() => setRemoving(r)}><Trash2 className="wos-icon" aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && <p className="m-0 p-4 text-center text-ink-muted">No replies match.</p>}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          const r = removing;
          setRemoving(null);
          if (!r) return;
          try {
            await store.repo.published.removeRsvp(weddingId, r.id);
            setRows((list) => (list ?? []).filter((x) => x.id !== r.id));
          } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't delete the reply.", "danger");
          }
        }}
        title="Delete this reply?"
        body={`${removing?.name ?? ""}'s reply will be removed. Your guest list isn't changed.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
