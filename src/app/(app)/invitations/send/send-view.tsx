"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Eye, Link2, Maximize2, MessageCircle, Play, Send, Sparkles, X } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { addressKind } from "@/lib/domain/invite-studio";
import { useAuth, useStore } from "@/lib/store/provider";
import { invitationMessage, inviteUrl, whatsAppLink } from "@/lib/domain/invitations";
import { INVITATION_LABEL, RSVP_LABEL } from "@/lib/domain/catalog";
import type { Guest, WeddingData } from "@/lib/domain/types";
import { InvitationExperience } from "@/components/invite/invitation-experience";
import { StudioTabs } from "@/components/invite/studio-tabs";
import { RsvpSettings } from "@/components/features/guest-invite";
import { Badge, Notice, PageHeader, SideChip, cx } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function SendView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Invitations data={page.data} />;
}

type Filter = "to_send" | "sent" | "replied" | "all";

const isSent = (g: Guest) => g.invitation !== "not_sent";
const replied = (g: Guest) => g.rsvp !== "pending";

function Invitations({ data }: { data: WeddingData }) {
  const store = useStore();
  const auth = useAuth();
  const toast = useToast();
  const { plan, setPlan, publish } = useInvites();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [full, setFull] = useState(false);
  const [filter, setFilter] = useState<Filter>("to_send");
  const main = plan.projects.find((p) => p.id === plan.mainId) ?? null;
  const { wedding, guests } = data;
  const online = auth.mode === "cloud" && wedding.rsvpEnabled;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewGuest = guests.find((g) => g.id === previewId) ?? null;

  const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter((g) => (filter === "to_send" ? !isSent(g) : filter === "sent" ? isSent(g) && !replied(g) : filter === "replied" ? replied(g) : true));
  const sent = guests.filter(isSent).length;
  const opened = guests.filter((g) => g.invitation === "opened" || g.invitation === "confirmed" || replied(g)).length;
  const yes = guests.filter((g) => g.rsvp === "yes").length;
  const nextGuest = sorted.find((g) => !isSent(g) && whatsAppLink(g, ""));

  const linkFor = (g: Guest) => (online ? inviteUrl(origin, g) : null);
  const markSent = (g: Guest) => {
    if (g.invitation === "not_sent") store.upsert("guests", { ...g, invitation: "sent" });
  };
  const copy = async (g: Guest) => {
    const link = linkFor(g);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(invitationMessage(wedding, g, link));
      toast(`Invitation for ${g.name} copied — paste it in any chat.`);
      markSent(g);
    } catch {
      toast("Couldn't copy. Long-press the link to copy it instead.", "danger");
    }
  };
  const sendNext = () => {
    if (!nextGuest) return;
    const wa = whatsAppLink(nextGuest, invitationMessage(wedding, nextGuest, linkFor(nextGuest)));
    if (!wa) return;
    window.open(wa, "_blank", "noopener,noreferrer");
    markSent(nextGuest);
    setPreviewId(nextGuest.id);
  };

  return (
    <>
      <PageHeader
        overline="EverAfter Studio"
        title="Send to guests"
        lead="Each guest gets their own link: the envelope shows their name, and their reply updates your guest list."
        actions={main ? <button type="button" className="wos-btn wos-btn--secondary" onClick={() => setFull(true)}><Maximize2 className="wos-icon" aria-hidden="true" />Full screen</button> : undefined}
      />
      <StudioTabs />

      <div className="inv-layout">
        <div className="inv-preview">
          <div className="phone-frame">
            <div className="phone-screen">
              {main ? (
                <InvitationExperience key={`${replay}-${previewId}-${main.id}`} content={main.content} design={main.design} guestName={previewGuest?.name} addressee={previewGuest ? addressKind(previewGuest) : undefined} framed silent />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center text-ink-muted">Choose or create a design to preview it here.</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setReplay((n) => n + 1)}><Play className="wos-icon" aria-hidden="true" />Play again</button>
            <span className="text-[13px] text-ink-muted">{previewGuest ? `As ${previewGuest.name} sees it` : "Preview"}</span>
            {previewGuest && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setPreviewId(null)}>Clear guest</button>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="wos-card flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="inv-step">1</span>
              <div>
                <h2 className="wos-h2 !text-[22px] !leading-[28px]">Choose the design</h2>
                <p className="m-0 text-[14px] text-ink-muted">Personal links show this design. Edit it any time in <Link href="/invitations" className="wos-link">My invitations</Link>.</p>
              </div>
            </div>
            {plan.projects.length === 0 ? (
              <Link href="/invitations/new" className="wos-btn wos-btn--primary self-start"><Sparkles className="wos-icon" aria-hidden="true" />Create your invitation</Link>
            ) : (
              <SelectField label="Design for personal links" value={plan.mainId ?? ""} onChange={async (id) => {
                const p = plan.projects.find((x) => x.id === id);
                if (!p) return;
                setPlan((prev) => ({ ...prev, mainId: id }));
                if (auth.mode === "cloud") {
                  try {
                    await publish(p, { main: true });
                    toast("Personal links now use this design.");
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Couldn't publish the design.", "danger");
                  }
                }
              }} options={[{ value: "", label: "Choose…" }, ...plan.projects.map((p) => ({ value: p.id, label: `${p.name}${p.publishedAt ? " · published" : " · draft"}` }))]} />
            )}
          </section>

          <section className="wos-card flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="inv-step">2</span>
              <div>
                <h2 className="wos-h2 !text-[22px] !leading-[28px]">Turn on guest links</h2>
                <p className="m-0 text-[14px] text-ink-muted">Every guest gets a private link. Only they can see their invitation.</p>
              </div>
            </div>
            <RsvpSettings wedding={wedding} />
          </section>

          <section className="wos-card flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="inv-step">3</span>
              <div className="min-w-0 flex-1">
                <h2 className="wos-h2 !text-[22px] !leading-[28px]">Send</h2>
                <p className="m-0 text-[14px] text-ink-muted">Tap WhatsApp: the message and link are written for you. We mark it sent.</p>
              </div>
            </div>
            <div className="inv-stats">
              <div><strong className="wos-num">{sent}</strong><span>of {guests.length} sent</span></div>
              <div><strong className="wos-num">{opened}</strong><span>opened</span></div>
              <div><strong className="wos-num">{yes}</strong><span>coming</span></div>
            </div>
            {!online && (
              <Notice tone="info" icon={<Link2 className="wos-icon" />} title={auth.mode === "cloud" ? "Guest links are off." : "Messages will go without a link."}>
                {auth.mode === "cloud" ? "Turn on guest links above so each message carries the animated invitation." : "Animated invitation links need the free cloud account (Settings → Sync). WhatsApp messages still work."}
              </Notice>
            )}
            {nextGuest && (
              <button type="button" className="wos-btn wos-btn--primary wos-btn--lg" onClick={sendNext}>
                <Send className="wos-icon" aria-hidden="true" />Send to next guest: {nextGuest.name}
              </button>
            )}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Show guests">
              {([["to_send", "To send"], ["sent", "Waiting for reply"], ["replied", "Replied"], ["all", "All"]] as [Filter, string][]).map(([f, label]) => (
                <button key={f} type="button" className={cx("wos-chip", filter === f && "is-on")} aria-pressed={filter === f} onClick={() => setFilter(f)}>{label}</button>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="m-0 py-4 text-center text-ink-muted">{guests.length === 0 ? <>Add guests first on the <Link href="/guests" className="wos-link">Guests</Link> page.</> : "Nobody here. 🎉"}</p>
            ) : (
              <ul className="inv-list">
                {shown.map((g) => {
                  const wa = whatsAppLink(g, invitationMessage(wedding, g, linkFor(g)));
                  return (
                    <li key={g.id} className={cx("inv-row", previewId === g.id && "is-on")}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold">{g.name}</span>
                          <SideChip side={g.side} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-muted">
                          {g.category && <span>{g.category} ·</span>}
                          <span>{g.adults + g.children} {g.adults + g.children === 1 ? "person" : "people"}</span>
                          <Badge tone={replied(g) ? (g.rsvp === "yes" ? "success" : g.rsvp === "no" ? "danger" : "warning") : isSent(g) ? "info" : "neutral"}>
                            {replied(g) ? RSVP_LABEL[g.rsvp] : INVITATION_LABEL[g.invitation]}
                          </Badge>
                          {!wa && <span className="text-[12px]">No WhatsApp number</span>}
                          <label className="inline-flex items-center gap-1 text-[12px]">
                            <span className="sr-only">Greeting for {g.name}</span>
                            <select className="rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[12px] text-ink" value={addressKind(g)}
                              onChange={(e) => store.upsert("guests", { ...g, partyType: e.target.value === "you" ? "single" : e.target.value === "both" ? "couple" : g.partyType === "group" ? "group" : "family" })}>
                              <option value="you">“You”</option>
                              <option value="both">“You Both”</option>
                              <option value="family">“You &amp; Your Family”</option>
                            </select>
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-none gap-1">
                        <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !px-2.5" aria-label={`Preview ${g.name}'s invitation`} title="Preview" onClick={() => { setPreviewId(g.id); setReplay((n) => n + 1); }}>
                          <Eye className="wos-icon" aria-hidden="true" />
                        </button>
                        {linkFor(g) && (
                          <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !px-2.5" aria-label={`Copy invitation for ${g.name}`} title="Copy message and link" onClick={() => void copy(g)}>
                            <Copy className="wos-icon" aria-hidden="true" />
                          </button>
                        )}
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="wos-btn wos-btn--secondary wos-btn--sm" aria-label={`Send invitation to ${g.name} on WhatsApp`} onClick={() => markSent(g)}>
                            <MessageCircle className="wos-icon" aria-hidden="true" />WhatsApp
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {full && (
        <div className="inv-full" role="dialog" aria-modal="true" aria-label="Invitation preview">
          {main && <InvitationExperience content={main.content} design={main.design} guestName={previewGuest?.name} addressee={previewGuest ? addressKind(previewGuest) : undefined} silent />}
          <button type="button" className="inv-full-close" onClick={() => setFull(false)} aria-label="Close preview"><X aria-hidden="true" /></button>
        </div>
      )}
    </>
  );
}
