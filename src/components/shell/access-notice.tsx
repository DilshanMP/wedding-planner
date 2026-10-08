"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "@/lib/store/provider";
import { getSupabase } from "@/lib/supabase/client";
import { listMembers } from "@/lib/data/cloud-services";

/** Tells read-only collaborators up front that their edits won't be saved. */
export function AccessNotice({ weddingId }: { weddingId: string }) {
  const auth = useAuth();
  const [viewer, setViewer] = useState(false);
  const email = auth.mode === "cloud" && auth.status === "signed_in" ? auth.email : null;

  useEffect(() => {
    if (!email) return;
    let active = true;
    listMembers(getSupabase(), weddingId).then(
      (members) => active && setViewer(members.some((m) => m.role === "viewer" && m.email.toLowerCase() === email.toLowerCase())),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [email, weddingId]);

  if (!viewer) return null;
  return (
    <p role="status" className="m-0 flex w-full items-center gap-2 rounded-xl bg-info-50 px-4 py-2 text-[13px] font-semibold text-info">
      <Eye className="wos-icon size-4" aria-hidden="true" />
      You have view-only access to this wedding. Ask the owner for edit access to make changes.
    </p>
  );
}
