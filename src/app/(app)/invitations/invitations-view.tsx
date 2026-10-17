"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Copy, Eye, Link2, Maximize2, MessageCircle, Play, Send, X } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { usePlanner } from "@/lib/hooks/use-planner";
import { useAuth, useStore } from "@/lib/store/provider";
import { contentFromWedding } from "@/lib/domain/digital-invite";
import { invitationMessage, inviteUrl, whatsAppLink } from "@/lib/domain/invitations";
import { INVITATION_LABEL, RSVP_LABEL } from "@/lib/domain/catalog";
import { PALETTES, type InviteEffect, type InviteMusic, type InviteSettings } from "@/lib/domain/planner";
import type { Guest, WeddingData } from "@/lib/domain/types";
import { DigitalInvitation } from "@/components/features/digital-invitation";
import { RsvpSettings } from "@/components/features/guest-invite";
import { Badge, Notice, PageHeader, SideChip, cx } from "@/components/ui/primitives";
import { ChoiceChips, TextArea } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function InvitationsView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Invitations data={page.data} />;
}

type Filter = "to_send" | "sent" | "replied" | "all";

const isSent = (g: Guest) => g.invitation !== "not_sent";
const replied = (g: Guest) => g.rsvp !== "pending";

function Swatch({ colors, label, on, onPick }: { colors: string[]; label: string; on: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={on} className={cx("inv-swatch", on && "is-on")}>
      <span className="inv-swatch-dots" aria-hidden="true">{colors.slice(0, 4).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
      <span className="inv-swatch-label">{label}</span>
      {on && <Check className="inv-swatch-check" aria-hidden="true" />}
    </button>
  );
}

function Invitations({ data }: { data: WeddingData }) {
  const store = useStore();
  const auth = useAuth();
  const toast = useToast();
  const [stationery, setStationery] = usePlanner("stationery");
  const [theme] = usePlanner("theme");
  const settings = stationery.invite;
  const set = (patch: Partial<InviteSettings>) => setStationery((s) => ({ ...s, invite: { ...s.invite, ...patch } }));
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [full, setFull] = useState(false);
  const [filter, setFilter] = useState<Filter>("to_send");

  const { wedding, guests } = data;
  const online = auth.mode === "cloud" && wedding.rsvpEnabled;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewGuest = guests.find((g) => g.id === previewId) ?? null;
  const content = useMemo(() => contentFromWedding(data, previewGuest), [data, previewGuest]);

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

  const paletteChoices = [{ name: "theme", label: theme.name ? `Our colours (${theme.name})` : "Our wedding colours", colors: theme.colors }, ...PALETTES.map((p) => ({ name: p.name, label: p.name, colors: p.colors }))];

  return (
    <>
      <PageHeader
        overline="Create"
        title="Digital invitations"
        lead="An animated invitation that opens like a real envelope — with music, falling petals and a live countdown. Each guest gets their own link to reply."
        actions={<button type="button" className="wos-btn wos-btn--secondary" onClick={() => setFull(true)}><Maximize2 className="wos-icon" aria-hidden="true" />Full screen</button>}
      />

      <div className="inv-layout">
        <div className="inv-preview">
          <div className="phone-frame">
            <div className="phone-screen">
              <DigitalInvitation key={`${replay}-${previewId}`} content={content} framed />
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
                <h2 className="wos-h2 !text-[22px] !leading-[28px]">Make it yours</h2>
                <p className="m-0 text-[14px] text-ink-muted">Names, blessing and times come from <Link href="/cards" className="wos-link">Cards &amp; boxes</Link> and <Link href="/timeline" className="wos-link">Day plan</Link>.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[14px] leading-5 font-semibold">Colours</span>
              <div className="inv-swatches">
                {paletteChoices.map((p) => <Swatch key={p.name} colors={p.colors} label={p.label} on={settings.palette === p.name} onPick={() => set({ palette: p.name })} />)}
              </div>
            </div>
            <ChoiceChips<InviteMusic> label="Music" value={settings.music} onChange={(music) => set({ music })}
              options={[{ value: "music-box", label: "🎶 Music box" }, { value: "piano", label: "🎹 Soft piano" }, { value: "none", label: "🔇 Silent" }]} />
            <ChoiceChips<InviteEffect> label="Effects" value={settings.effect} onChange={(effect) => set({ effect })}
              options={[{ value: "both", label: "🌸✨ Petals & sparkles" }, { value: "petals", label: "🌸 Petals" }, { value: "sparkles", label: "✨ Sparkles" }]} />
            <TextArea label="A note from you both" value={settings.note} onChange={(note) => set({ note: note.slice(0, 300) })} rows={3} />
            <TextArea label="Dress code (optional)" value={settings.dressCode} onChange={(dressCode) => set({ dressCode: dressCode.slice(0, 200) })} rows={2} />
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
          <DigitalInvitation content={content} />
          <button type="button" className="inv-full-close" onClick={() => setFull(false)} aria-label="Close preview"><X aria-hidden="true" /></button>
        </div>
      )}
    </>
  );
}
