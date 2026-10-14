"use client";

import { useState } from "react";
import { Moon } from "lucide-react";
import { newId, nowISO } from "@/lib/domain/ids";
import { eveningTimeline } from "@/lib/domain/planner";
import type { WeddingData } from "@/lib/domain/types";
import { useStore } from "@/lib/store/provider";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/shell/toast";

/** Replace the day plan with an evening wedding: Poruwa at 5.30 pm, reception until midnight. */
export function EveningTemplateButton({ data }: { data: WeddingData }) {
  const store = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const apply = () => {
    const ids = data.timeline.map((e) => e.id);
    if (ids.length) store.remove("timeline", ids);
    store.upsert("timeline", eveningTimeline(nowISO(), newId));
    setOpen(false);
    toast("Evening schedule added. Adjust any time to suit you.");
  };
  return (
    <>
      <button type="button" className="wos-btn wos-btn--secondary" onClick={() => setOpen(true)}><Moon className="wos-icon" aria-hidden="true" />Evening Wedding Plan</button>
      <ConfirmDialog
        open={open}
        onCancel={() => setOpen(false)}
        onConfirm={apply}
        title="Use the evening wedding plan?"
        body={`Poruwa at 5.30 pm, family photos, change to going-away, reception, dinner and dancing until midnight (registration done before the day). ${data.timeline.length ? `This replaces your ${data.timeline.length} current moments.` : ""}`}
        confirmLabel="Use Evening Plan"
      />
    </>
  );
}
