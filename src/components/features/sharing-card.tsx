"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/store/provider";
import { getSupabase } from "@/lib/supabase/client";
import { cancelInvite, inviteToWedding, listMembers, listPendingInvites, removeMember, type PendingInvite, type WeddingMember } from "@/lib/data/cloud-services";
import { Badge, Card } from "@/components/ui/primitives";
import { SelectField, TextField } from "@/components/ui/fields";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/shell/toast";

const ROLE_HELP: Record<PendingInvite["role"], string> = {
  editor: "Family — can edit everything",
  planner: "Planner — can edit everything",
  viewer: "Can view, not edit",
};

/** Share the wedding with family or a planner (cloud mode). */
export function SharingCard({ weddingId }: { weddingId: string }) {
  const auth = useAuth();
  if (auth.mode !== "cloud") {
    return (
      <Card title="Share with family">
        <div className="flex gap-3">
          <Users className="wos-icon mt-1 text-champagne-700" aria-hidden="true" />
          <p className="m-0 text-[14px] text-ink-muted">
            Sharing lets both families and your planner work on the same plan, each with their own sign-in. It needs a cloud account: connect a Supabase project (see README), sign in, and invite people here by email.
          </p>
        </div>
      </Card>
    );
  }
  return <CloudSharing weddingId={weddingId} myEmail={auth.status === "signed_in" ? auth.email : null} />;
}

function CloudSharing({ weddingId, myEmail }: { weddingId: string; myEmail: string | null }) {
  const toast = useToast();
  const [members, setMembers] = useState<WeddingMember[] | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PendingInvite["role"]>("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<WeddingMember | null>(null);

  const refresh = useCallback(async () => {
    const client = getSupabase();
    const [m, i] = await Promise.all([listMembers(client, weddingId), listPendingInvites(client, weddingId).catch(() => [])]);
    setMembers(m);
    setInvites(i);
  }, [weddingId]);

  useEffect(() => {
    let active = true;
    const client = getSupabase();
    Promise.all([listMembers(client, weddingId), listPendingInvites(client, weddingId).catch(() => [] as PendingInvite[])]).then(
      ([m, i]) => {
        if (!active) return;
        setMembers(m);
        setInvites(i);
      },
      (e: unknown) => active && setError(e instanceof Error ? e.message : "Couldn't load people."),
    );
    return () => {
      active = false;
    };
  }, [weddingId]);

  const isOwner = members?.some((m) => m.role === "owner" && m.email.toLowerCase() === myEmail?.toLowerCase()) ?? false;

  const invite = async () => {
    const parsed = z.email("Enter a valid email address.").safeParse(email.trim().toLowerCase());
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    try {
      const result = await inviteToWedding(getSupabase(), weddingId, parsed.data, role);
      toast(result === "added" ? `${parsed.data} now has access.` : `Invitation saved. ${parsed.data} gets access when they sign in with that email.`);
      setEmail("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Couldn't send the invitation: /, "") : "Couldn't invite.");
    }
    setBusy(false);
  };

  return (
    <Card title="Share with family" action={members ? <span className="text-[13px] text-ink-muted">{members.length} with access</span> : undefined}>
      {members === null && !error ? (
        <div className="wos-skel h-20" />
      ) : (
        <ul className="wos-list">
          {(members ?? []).map((m) => (
            <li key={m.userId}>
              <span className="flex flex-1 flex-col">
                <b className="text-[14px] font-semibold">{m.email}{m.email.toLowerCase() === myEmail?.toLowerCase() ? " (you)" : ""}</b>
                <span className="text-[13px] text-ink-muted">{m.role === "owner" ? "Owner" : ROLE_HELP[m.role]}</span>
              </span>
              {isOwner && m.role !== "owner" && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setRemoving(m)}>Remove</button>}
            </li>
          ))}
          {invites.map((i) => (
            <li key={i.id}>
              <span className="flex flex-1 flex-col">
                <b className="text-[14px] font-semibold">{i.email}</b>
                <span className="text-[13px] text-ink-muted">{ROLE_HELP[i.role]}</span>
              </span>
              <Badge tone="warning">Waiting to sign in</Badge>
              {isOwner && (
                <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={async () => { await cancelInvite(getSupabase(), i.id); await refresh(); toast("Invitation cancelled."); }}>Cancel</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isOwner ? (
        <form className="wos-form border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); void invite(); }} noValidate>
          <TextField label="Email" type="email" value={email} onChange={(v) => { setEmail(v); setError(null); }} error={error ?? undefined} placeholder="amma@example.com" />
          <SelectField<PendingInvite["role"]> label="Access" value={role} onChange={setRole} options={(Object.keys(ROLE_HELP) as PendingInvite["role"][]).map((r) => ({ value: r, label: ROLE_HELP[r] }))} />
          <div className="full flex justify-end">
            <button type="submit" className="wos-btn wos-btn--primary" disabled={busy}><UserPlus className="wos-icon" aria-hidden="true" />{busy ? "Inviting…" : "Invite"}</button>
          </div>
        </form>
      ) : (
        members && <p className="m-0 text-[13px] text-ink-muted">Only the wedding&apos;s owner can invite people.</p>
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        onCancel={() => setRemoving(null)}
        danger
        confirmLabel="Remove Access"
        title={`Remove ${removing?.email ?? ""}?`}
        body="They'll lose access to this wedding straight away. Nothing they added is deleted."
        onConfirm={async () => {
          if (!removing) return;
          try {
            await removeMember(getSupabase(), weddingId, removing.userId);
            toast("Access removed.");
            await refresh();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't remove access.", "danger");
          }
          setRemoving(null);
        }}
      />
    </Card>
  );
}
