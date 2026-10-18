"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { InvitationExperience } from "@/components/invite/invitation-experience";
import { EmptyState } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";

export function PreviewView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Preview />;
}

/** Full screen, exactly as a guest sees it (replies here aren't saved). */
function Preview() {
  const { id } = useParams<{ id: string }>();
  const { plan } = useInvites();
  const [run, setRun] = useState(0);
  const [guest, setGuest] = useState("");
  const p = plan.projects.find((x) => x.id === id);
  if (!p) {
    return <EmptyState title="We couldn't find this invitation" action={<Link href="/invitations" className="wos-btn wos-btn--primary">Back to my invitations</Link>} />;
  }
  return (
    <div className="fixed inset-0 z-[90] bg-black" data-testid="full-preview">
      <InvitationExperience
        key={run}
        content={p.content}
        design={p.design}
        guestName={guest || undefined}
        rsvp={{ submit: async () => null }}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex items-center justify-between gap-2 p-3">
        <Link href={`/invitations/${p.id}`} className="wos-btn wos-btn--secondary wos-btn--sm pointer-events-auto shadow-[var(--shadow-md)]"><ArrowLeft className="wos-icon" aria-hidden="true" />Back to editor</Link>
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 shadow-[var(--shadow-md)] backdrop-blur">
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            For
            <input className="w-[120px] rounded-full border border-line bg-white px-2 py-1 text-[13px] text-ink" placeholder="Guest name" value={guest} onChange={(e) => setGuest(e.target.value)} />
          </label>
          <button type="button" className="wos-iconbtn" aria-label="Replay" onClick={() => setRun((r) => r + 1)}><RotateCcw className="wos-icon" aria-hidden="true" /></button>
        </div>
      </div>
      <p className="sr-only" role="status">Preview — replies sent here are not saved.</p>
    </div>
  );
}
