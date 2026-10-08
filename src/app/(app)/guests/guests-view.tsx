"use client";

import { useMemo, useState } from "react";
import { Download, Mail, Plus, Send } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { useStore } from "@/lib/store/provider";
import { GUEST_GROUP_LABEL, guestGroup, guestMetrics, partySize, type GuestGroupId } from "@/lib/domain/guests";
import { INVITATION_LABEL, INVITATION_TONE, MEAL_LABEL, PARTY_LABEL, RSVP_LABEL, RSVP_TONE } from "@/lib/domain/catalog";
import { INVITATION_STATUSES, RSVP_STATUSES, type Guest, type InvitationStatus, type RsvpStatus } from "@/lib/domain/types";
import { downloadCSV } from "@/lib/export";
import { Badge, Card, EmptyState, Notice, PageHeader, ProgressBar, SideChip, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { GuestForm } from "@/components/features/guest-form";
import { GuestDonut } from "@/components/features/guest-donut";
import { GuestInviteActions, RsvpSettings } from "@/components/features/guest-invite";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/shell/toast";

export function GuestsView() {
  const page = usePage();
  const q = useQueryState();
  const store = useStore();
  const toast = useToast();
  const [bloom, setBloom] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const side = q.get("side") ?? "";
  const group = (q.get("group") ?? "") as GuestGroupId | "";
  const invitation = (q.get("invitation") ?? "") as InvitationStatus | "";
  const rsvp = (q.get("rsvp") ?? "") as RsvpStatus | "";
  const search = q.get("q") ?? "";
  const editingId = q.get("guest");
  const creating = q.get("new") === "1";

  const filtered = useMemo(() => {
    if (!page) return [];
    const term = search.trim().toLowerCase();
    return page.data.guests
      .filter((g) => (!side || g.side === side) && (!group || guestGroup(g) === group) && (!invitation || g.invitation === invitation) && (!rsvp || g.rsvp === rsvp))
      .filter((g) => !term || `${g.name} ${g.phone} ${g.email} ${g.table} ${g.notes}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [page, side, group, invitation, rsvp, search]);

  if (!page) return <PageSkeleton />;
  const { data } = page;
  const m = guestMetrics(data.guests, data.wedding);
  const fm = guestMetrics(filtered, data.wedding);
  const editing = data.guests.find((g) => g.id === editingId);
  const filtersOn = Boolean(side || group || invitation || rsvp || search);

  const patch = (g: Guest, changes: Partial<Guest>) => {
    // Confirming an RSVP implies the invitation reached them.
    const next = { ...g, ...changes };
    if (changes.rsvp && changes.rsvp !== "pending" && (g.invitation === "not_sent" || g.invitation === "sent" || g.invitation === "delivered" || g.invitation === "opened")) next.invitation = "confirmed";
    if (changes.rsvp === "yes") setBloom(g.id);
    store.upsert("guests", next);
  };

  const notSentShown = filtered.filter((g) => g.invitation === "not_sent");
  const exportCSV = () =>
    downloadCSV(`guests-${data.wedding.brideName}-${data.wedding.groomName}.csv`.toLowerCase().replace(/\s+/g, "-"), [
      ["Name", "Side", "Group", "Party", "Adults", "Children", "Invitation", "RSVP", "Meal", "Table", "Phone", "Email", "Transport", "Accommodation", "Notes"],
      ...filtered.map((g) => [g.name, g.side === "bride" ? "Bride" : "Groom", GUEST_GROUP_LABEL[guestGroup(g)], PARTY_LABEL[g.partyType], g.adults, g.children, INVITATION_LABEL[g.invitation], RSVP_LABEL[g.rsvp], MEAL_LABEL[g.meal], g.table, g.phone, g.email, g.needsTransport ? "Yes" : "", g.needsAccommodation ? "Yes" : "", g.notes]),
    ]);

  return (
    <>
      <PageHeader
        overline="People"
        title="Guests"
        lead={m.total ? `${m.total} people in ${m.parties} invitations · ${m.confirmed} confirmed · about ${m.expectedAttendance} expected.` : "Build your list one family at a time."}
        actions={
          <>
            {m.total > 0 && <button type="button" className="wos-btn wos-btn--secondary" onClick={exportCSV}><Download className="wos-icon" aria-hidden="true" />Export</button>}
            <button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}><Plus className="wos-icon" aria-hidden="true" />Add Guest</button>
          </>
        }
      />

      {m.total === 0 ? (
        <EmptyState mark="jasmine" title="No guests yet." action={<button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}>Add Guest</button>}>
          Add families and friends from both sides. Each entry can be a single guest, a couple, a family or a group.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-6">
            <Card title="Attendance" className="flex-[1_1_320px]">
              <GuestDonut m={m} />
              <p className="m-0 text-[13px] leading-[18px] text-ink-muted">
                Expected attendance = confirmed + half of “maybe” + {Math.round(data.wedding.pendingAttendanceRate * 100)}% of those still to reply. Change the assumption in Settings.
              </p>
            </Card>
            <Card title="Bride and groom sides" className="flex-[2_1_420px]">
              <ProgressBar label={<SideChip side="bride" />} detail={`${m.bySide.bride.confirmed} of ${m.bySide.bride.total} confirmed`} value={(m.bySide.bride.confirmed / Math.max(1, m.bySide.bride.total)) * 100} tone="bride" />
              <ProgressBar label={<SideChip side="groom" />} detail={`${m.bySide.groom.confirmed} of ${m.bySide.groom.total} confirmed`} value={(m.bySide.groom.confirmed / Math.max(1, m.bySide.groom.total)) * 100} tone="groom" />
              <RsvpSettings wedding={data.wedding} />
              <dl className="m-0 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
                {[
                  ["Invitation coverage", `${m.invitationCoverage}%`],
                  ["RSVP replies", `${m.rsvpCompletion}%`],
                  ["Pending", m.pending],
                  ["Declined", m.declined],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <dt className="wos-overline !text-ink-muted">{k}</dt>
                    <dd className="m-0 wos-num font-display text-[26px] leading-[30px] font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          {m.notInvited > 0 && invitation !== "not_sent" && (
            <Notice tone="info" icon={<Mail className="wos-icon" />} title={`${m.notInvited} guests haven't received invitations.`}
              action={<button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => q.set({ invitation: "not_sent", rsvp: null })}>Review Invitations</button>}>
              Mark them as sent once they go out, and their RSVP will start to count.
            </Notice>
          )}

          <div className="flex flex-col gap-3">
            <div className="wos-tabs" role="tablist" aria-label="Side">
              {[["", "Everyone"], ["bride", "Bride side"], ["groom", "Groom side"]].map(([v, l]) => (
                <button key={v} type="button" role="tab" className="wos-tab" aria-selected={side === v} onClick={() => q.set({ side: v })}>{l}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="sr-only" htmlFor="g-search">Search guests</label>
              <input id="g-search" type="search" className="wos-input max-w-[300px] flex-[1_1_200px]" placeholder="Search name, phone, table" value={search} onChange={(e) => q.set({ q: e.target.value })} />
              <FilterSelect id="g-group" label="Group" value={group} onChange={(v) => q.set({ group: v })} options={(Object.keys(GUEST_GROUP_LABEL) as GuestGroupId[]).map((k) => [k, GUEST_GROUP_LABEL[k]])} all="All groups" />
              <FilterSelect id="g-inv" label="Invitation" value={invitation} onChange={(v) => q.set({ invitation: v })} options={INVITATION_STATUSES.map((s) => [s, INVITATION_LABEL[s]])} all="Any invitation" />
              <FilterSelect id="g-rsvp" label="RSVP" value={rsvp} onChange={(v) => q.set({ rsvp: v })} options={RSVP_STATUSES.map((s) => [s, RSVP_LABEL[s]])} all="Any RSVP" />
              {filtersOn && <button type="button" className="wos-btn wos-btn--ghost" onClick={() => q.set({ side: null, group: null, invitation: null, rsvp: null, q: null })}>Clear filters</button>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-[13px] font-medium text-ink-muted" aria-live="polite">
                Showing {filtered.length} {filtered.length === 1 ? "invitation" : "invitations"} · {fm.total} people
              </p>
              {notSentShown.length > 0 && invitation === "not_sent" && (
                <button type="button" className="wos-btn wos-btn--primary wos-btn--sm" onClick={() => setConfirmBulk(true)}>
                  <Send className="wos-icon" aria-hidden="true" />Mark {notSentShown.length} as Sent
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No guests match." action={<button type="button" className="wos-btn wos-btn--secondary" onClick={() => q.set({ side: null, group: null, invitation: null, rsvp: null, q: null })}>Clear Filters</button>}>
              {invitation === "not_sent" ? "Every invitation has gone out." : "Try a different filter or search."}
            </EmptyState>
          ) : (
            <>
              {/* Table from tablet up */}
              <div className="wos-table-wrap hidden md:block">
                <table className="wos-table">
                  <thead>
                    <tr>
                      <th>Guest</th><th>Side</th><th className="num">People</th><th>Invitation</th><th>RSVP</th><th>Meal</th><th>Table</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g) => (
                      <tr key={g.id}>
                        <td className="wrap">
                          <strong>{g.name}{g.vip && <Badge tone="champagne" plain className="ml-2 align-middle">VIP</Badge>}</strong>
                          <em>{GUEST_GROUP_LABEL[guestGroup(g)]}{g.phone ? ` · ${g.phone}` : ""}</em>
                        </td>
                        <td><SideChip side={g.side} /></td>
                        <td className="num">{partySize(g)}{g.children > 0 && <em className="block">{g.children} {g.children === 1 ? "child" : "children"}</em>}</td>
                        <td><InlineSelect label={`Invitation for ${g.name}`} value={g.invitation} options={INVITATION_STATUSES.map((s) => [s, INVITATION_LABEL[s]])} tone={INVITATION_TONE[g.invitation]} onChange={(v) => patch(g, { invitation: v as InvitationStatus })} /></td>
                        <td><span className={cx(bloom === g.id && "wos-bloom inline-block")}><InlineSelect label={`RSVP for ${g.name}`} value={g.rsvp} options={RSVP_STATUSES.map((s) => [s, RSVP_LABEL[s]])} tone={RSVP_TONE[g.rsvp]} onChange={(v) => patch(g, { rsvp: v as RsvpStatus })} /></span></td>
                        <td>{g.meal === "unknown" ? <em>—</em> : MEAL_LABEL[g.meal]}</td>
                        <td>{g.table || <em>—</em>}</td>
                        <td className="whitespace-nowrap">
                          <GuestInviteActions guest={g} wedding={data.wedding} />
                          <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => q.set({ guest: g.id })} aria-label={`Edit ${g.name}`}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Card list on mobile */}
              <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
                {filtered.map((g) => (
                  <li key={g.id} className="wos-card flex flex-col gap-3 !p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="flex flex-col border-0 bg-transparent p-0 text-left text-ink cursor-pointer" onClick={() => q.set({ guest: g.id })}>
                        <b className="text-[15px] leading-[22px] font-semibold">{g.name}</b>
                        <span className="text-[13px] leading-[18px] text-ink-muted">{GUEST_GROUP_LABEL[guestGroup(g)]} · {partySize(g)} {partySize(g) === 1 ? "person" : "people"}{g.table ? ` · ${g.table}` : ""}</span>
                      </button>
                      <SideChip side={g.side} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <InlineSelect label={`Invitation for ${g.name}`} value={g.invitation} options={INVITATION_STATUSES.map((s) => [s, INVITATION_LABEL[s]])} tone={INVITATION_TONE[g.invitation]} onChange={(v) => patch(g, { invitation: v as InvitationStatus })} />
                      <InlineSelect label={`RSVP for ${g.name}`} value={g.rsvp} options={RSVP_STATUSES.map((s) => [s, RSVP_LABEL[s]])} tone={RSVP_TONE[g.rsvp]} onChange={(v) => patch(g, { rsvp: v as RsvpStatus })} />
                      <span className="ml-auto"><GuestInviteActions guest={g} wedding={data.wedding} /></span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <GuestForm open={creating || Boolean(editing)} guest={editing} onClose={() => q.set({ guest: null, new: null })} />
      <ConfirmDialog
        open={confirmBulk}
        onCancel={() => setConfirmBulk(false)}
        onConfirm={() => {
          store.upsert("guests", notSentShown.map((g) => ({ ...g, invitation: "sent" as const })));
          toast(`${notSentShown.length} invitations marked as sent.`);
          setConfirmBulk(false);
          q.set({ invitation: null });
        }}
        title={`Mark ${notSentShown.length} invitations as sent?`}
        body="Use this once the invitations have actually gone out. You can change any guest individually afterwards."
        confirmLabel="Mark as Sent"
      />
    </>
  );
}

function FilterSelect({ id, label, value, onChange, options, all }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][]; all: string }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select id={id} className="wos-input w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </>
  );
}

const toneStyle: Record<string, string> = {
  success: "bg-success-50 text-success",
  warning: "bg-warning-50 text-warning",
  danger: "bg-danger-50 text-danger",
  info: "bg-info-50 text-info",
  neutral: "bg-surface-sunken text-ink-muted",
  champagne: "bg-champagne-100 text-champagne-700",
  wine: "bg-wine-50 text-wine-600",
};

/** A status badge that is also a select, for fast RSVP / invitation updates. */
function InlineSelect({ label, value, options, tone, onChange }: { label: string; value: string; options: [string, string][]; tone: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx("h-7 cursor-pointer appearance-none rounded-full border-0 pr-7 pl-3 text-[12px] leading-4 font-semibold", toneStyle[tone])}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='currentColor' stroke-width='1.6'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
