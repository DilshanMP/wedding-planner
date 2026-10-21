"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { invitationLookup, invitationOpened, rsvpSubmit, type InvitationData } from "@/lib/data/cloud-services";
import { ADDRESS_KINDS, addressKind, contentFromWedding, designFromTemplate, initials, normalizeProject, type AddressKind, type InviteContent, type InviteDesign } from "@/lib/domain/invite-studio";
import { InvitationExperience } from "@/components/invite/invitation-experience";
import { LotusMark } from "@/components/ui/primitives";

type State = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; invite: InvitationData };

const SCENES = ["arrival", "poruwa", "reception", "dinner", "cake", "entertainment", "going_away"];

/** The couple's chosen design, or a template with their details when none is published yet. */
function inviteFor(inv: InvitationData): { content: InviteContent; design: InviteDesign } {
  const party = Math.max(1, inv.adults + inv.children);
  if (inv.design?.content && inv.design.design) {
    const p = normalizeProject({ id: inv.design.projectId, content: inv.design.content, design: inv.design.design }, inv.design.publishedAt);
    return { content: { ...p.content, maxParty: party }, design: p.design };
  }
  const moments = (inv.moments ?? []).filter((m) => SCENES.includes(m.scene)).map((m) => ({ time: String(m.time).slice(0, 5), title: m.title }));
  const content = { ...contentFromWedding({ brideName: inv.brideName, groomName: inv.groomName, weddingDate: inv.weddingDate, venue: inv.venue ?? "", location: inv.location ?? "" }, moments), maxParty: party };
  const design = designFromTemplate("ivory-champagne");
  design.seal.text = initials(inv.brideName, inv.groomName);
  return { content, design };
}

/** The guest's personal, animated invitation. */
export function InviteView() {
  const { token } = useParams<{ token: string }>();
  const to = useSearchParams().get("to");
  const [state, setState] = useState<State>(cloudEnabled ? { status: "loading" } : { status: "missing" });

  useEffect(() => {
    if (!cloudEnabled) return;
    let active = true;
    invitationLookup(getSupabase(), token).then(
      (invite) => active && setState(invite ? { status: "ready", invite } : { status: "missing" }),
      (e: unknown) => active && setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." }),
    );
    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === "loading") return <main className="ea-loading" aria-busy="true"><span className="ea-loading-seal" /></main>;
  if (state.status !== "ready") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="wos-card wos-card--hero flex w-full max-w-[460px] flex-col items-center gap-3 text-center">
          <LotusMark className="size-12 text-champagne-700" />
          <h1 className="wos-h2">{state.status === "missing" ? "This invitation link isn't active." : "We couldn't open your invitation."}</h1>
          <p className="m-0 text-ink-muted">{state.status === "missing" ? "The couple may have closed online replies. Please reply to them directly." : state.message}</p>
        </div>
      </main>
    );
  }

  const invite = state.invite;
  const { content, design } = inviteFor(invite);
  return (
    <main>
      <InvitationExperience
        content={content}
        design={design}
        guestName={invite.guestName}
        addressee={ADDRESS_KINDS.includes(to as AddressKind) ? (to as AddressKind) : addressKind({ adults: invite.adults, children: invite.children })}
        onOpen={() => void invitationOpened(getSupabase(), token)}
        rsvp={{
          knownGuest: true,
          initialName: invite.guestName,
          current: invite.rsvp,
          submit: async (reply) => {
            try {
              const ok = await rsvpSubmit(getSupabase(), token, { response: reply.attending, meal: invite.meal, attending: reply.attending === "yes" ? reply.party : null, message: reply.message });
              return ok ? null : "This invitation is no longer accepting replies.";
            } catch (e) {
              return e instanceof Error ? e.message.replace(/^Couldn't send your reply: /, "") : "Couldn't send your reply.";
            }
          },
        }}
      />
    </main>
  );
}
