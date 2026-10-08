"use client";

import { Link2, MessageCircle } from "lucide-react";
import { useAuth, useStore } from "@/lib/store/provider";
import { invitationMessage, rsvpUrl, whatsAppLink } from "@/lib/domain/invitations";
import type { Guest, Wedding } from "@/lib/domain/types";
import { Toggle } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";

/** Send by WhatsApp (marks the invitation sent) and copy the personal RSVP link. */
export function GuestInviteActions({ guest, wedding }: { guest: Guest; wedding: Wedding }) {
  const store = useStore();
  const auth = useAuth();
  const toast = useToast();
  const online = auth.mode === "cloud" && wedding.rsvpEnabled;
  const link = online && typeof window !== "undefined" ? rsvpUrl(window.location.origin, guest) : null;
  const wa = whatsAppLink(guest, invitationMessage(wedding, guest, link));

  return (
    <span className="inline-flex gap-1">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="wos-btn wos-btn--ghost wos-btn--sm !px-2.5"
          aria-label={`Send invitation to ${guest.name} on WhatsApp`}
          title="Send on WhatsApp"
          onClick={() => {
            if (guest.invitation === "not_sent") store.upsert("guests", { ...guest, invitation: "sent" });
          }}
        >
          <MessageCircle className="wos-icon" aria-hidden="true" />
        </a>
      )}
      {link && (
        <button
          type="button"
          className="wos-btn wos-btn--ghost wos-btn--sm !px-2.5"
          aria-label={`Copy RSVP link for ${guest.name}`}
          title="Copy RSVP link"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast(`RSVP link for ${guest.name} copied.`);
            } catch {
              toast("Couldn't copy. Long-press the link to copy it instead.", "danger");
            }
          }}
        >
          <Link2 className="wos-icon" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export function RsvpSettings({ wedding }: { wedding: Wedding }) {
  const store = useStore();
  const auth = useAuth();
  const toast = useToast();
  if (auth.mode !== "cloud") {
    return (
      <p className="m-0 text-[13px] leading-[18px] text-ink-muted">
        Send invitations on WhatsApp from each guest&apos;s row. Personal online RSVP links need a cloud account (see Settings).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Toggle
        label="Online RSVP — guests can reply through their personal link"
        checked={wedding.rsvpEnabled}
        onChange={(on) => {
          store.updateWedding({ rsvpEnabled: on });
          toast(on ? "Online RSVP is on. Replies update your list automatically." : "Online RSVP is off. Links stop working until you turn it back on.");
        }}
      />
      <span className="pl-8 text-[13px] leading-[18px] text-ink-muted">Each link only shows that guest&apos;s invitation. Nobody can see your guest list.</span>
    </div>
  );
}
