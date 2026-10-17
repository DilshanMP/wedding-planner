"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { invitationLookup, invitationOpened, rsvpSubmit, type InvitationData } from "@/lib/data/cloud-services";
import { contentFromLookup } from "@/lib/domain/digital-invite";
import { DigitalInvitation } from "@/components/features/digital-invitation";
import { LotusMark } from "@/components/ui/primitives";

type State = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; invite: InvitationData };

/** The guest's personal, animated invitation. */
export function InviteView() {
  const { token } = useParams<{ token: string }>();
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

  if (state.status === "loading") return <main className="dinv-loading" aria-busy="true"><span className="dinv-loading-seal" /></main>;
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
  return (
    <main>
      <DigitalInvitation
        content={contentFromLookup(invite)}
        onOpen={() => void invitationOpened(getSupabase(), token)}
        rsvp={{
          current: invite.rsvp,
          meal: invite.meal,
          submit: async (reply) => {
            try {
              const ok = await rsvpSubmit(getSupabase(), token, { response: reply.response, meal: reply.meal, attending: reply.attending, message: reply.message });
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
