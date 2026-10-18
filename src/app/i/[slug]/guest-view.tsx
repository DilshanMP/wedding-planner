"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { CloudPublished, LocalPublished, type PublishedStore } from "@/lib/data/published";
import { SLUG_RE, normalizeProject, type PublishedSnapshot } from "@/lib/domain/invite-studio";
import { InvitationExperience } from "@/components/invite/invitation-experience";
import { LotusMark } from "@/components/ui/primitives";

type State = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; snap: PublishedSnapshot; store: PublishedStore };

/**
 * A published invitation, opened from its public link. Cloud links are read
 * through a security-definer function (guests never see other data); a link
 * published without a cloud account opens only in the browser that made it.
 */
async function find(slug: string): Promise<{ snap: PublishedSnapshot; store: PublishedStore } | null> {
  if (cloudEnabled) {
    const cloud = new CloudPublished(getSupabase());
    const snap = await cloud.open(slug);
    if (snap) return { snap, store: cloud };
  }
  try {
    const local = new LocalPublished(window.localStorage);
    const snap = await local.open(slug);
    if (snap) return { snap, store: local };
  } catch {
    // Storage blocked (private mode): nothing published here.
  }
  return null;
}

export function GuestInvitation() {
  const { slug } = useParams<{ slug: string }>();
  const valid = SLUG_RE.test(slug ?? "");
  const [state, setState] = useState<State>(valid ? { status: "loading" } : { status: "missing" });

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    find(slug).then(
      (r) => alive && setState(r ? { status: "ready", ...r } : { status: "missing" }),
      (e: unknown) => alive && setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." }),
    );
    return () => {
      alive = false;
    };
  }, [slug, valid]);

  if (state.status === "loading") return <main className="ea-loading" aria-busy="true"><span className="ea-loading-seal" /></main>;
  if (state.status !== "ready") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="wos-card wos-card--hero flex w-full max-w-[460px] flex-col items-center gap-3 text-center">
          <LotusMark className="size-12 text-champagne-700" />
          <h1 className="wos-h2">{state.status === "missing" ? "This invitation isn't available." : "We couldn't open the invitation."}</h1>
          <p className="m-0 text-ink-muted">{state.status === "missing" ? "The link may be mistyped, or the couple has taken it offline." : state.message}</p>
        </div>
      </main>
    );
  }

  // Older snapshots may miss newer fields.
  const p = normalizeProject({ id: state.snap.projectId, content: state.snap.content, design: state.snap.design }, state.snap.publishedAt);
  const store = state.store;
  return (
    <main>
      <InvitationExperience
        content={p.content}
        design={p.design}
        shareUrl={typeof window !== "undefined" ? window.location.href : undefined}
        rsvp={{
          submit: async (reply) => {
            try {
              const ok = await store.reply(slug, reply);
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
