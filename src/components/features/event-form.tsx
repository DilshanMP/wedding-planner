"use client";

import { useState } from "react";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { fieldErrors, timelineEventSchema } from "@/lib/domain/schemas";
import { newId, nowISO } from "@/lib/domain/ids";
import { SCENE_LABEL } from "@/lib/domain/scenes";
import type { SimulatorScene, TimelineEvent } from "@/lib/domain/types";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { NumberField, SelectField, TextArea, TextField, Toggle } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";

type Draft = Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">;

export function EventForm({ open, event, onClose }: { open: boolean; event?: TimelineEvent; onClose: () => void }) {
  return <Inner key={`${event?.id ?? "new"}-${open}`} open={open} event={event} onClose={onClose} />;
}

function Inner({ open, event, onClose }: { open: boolean; event?: TimelineEvent; onClose: () => void }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => event ? { ...event } : { time: "12:00", durationMinutes: 30, title: "", location: "", description: "", vendorIds: [], ownerId: null, scene: "other" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const res = timelineEventSchema.safeParse(draft);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    store.upsert("timeline", { ...(event ?? { id: newId(), createdAt: now }), ...res.data, updatedAt: now } as TimelineEvent);
    toast(event ? "Moment updated." : "Moment added to the day.");
    onClose();
  };

  return (
    <>
      <Dialog open={open && !confirmDelete} onClose={onClose} title={event ? "Edit moment" : "Add a moment"}
        footer={<>
          {event && <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
          <span className="spacer" />
          <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="wos-btn wos-btn--primary" onClick={save}>{event ? "Save Changes" : "Add Moment"}</button>
        </>}>
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <TextField className="full" label="Moment" value={draft.title} onChange={(v) => set("title", v)} error={errors.title} placeholder="Poruwa ceremony" autoFocus={!event} />
          <TextField label="Starts at" type="time" value={draft.time} onChange={(v) => set("time", v)} error={errors.time} />
          <NumberField label="Duration (minutes)" value={draft.durationMinutes} onChange={(v) => set("durationMinutes", v ?? 0)} error={errors.durationMinutes} max={1440} step={5} />
          <TextField label="Location" value={draft.location} onChange={(v) => set("location", v)} placeholder="Main hall" />
          <SelectField<SimulatorScene> label="Simulator scene" value={draft.scene} onChange={(v) => set("scene", v)} options={(Object.keys(SCENE_LABEL) as SimulatorScene[]).map((s) => ({ value: s, label: SCENE_LABEL[s] }))} />
          <SelectField className="full" label="Responsible" value={draft.ownerId ?? ""} onChange={(v) => set("ownerId", v || null)} options={[{ value: "", label: "Not assigned" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
          {data.vendors.length > 0 && (
            <fieldset className="full m-0 border-0 p-0">
              <legend className="mb-2 text-[14px] font-semibold">Vendors involved</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.vendors.filter((v) => v.status !== "cancelled").map((v) => (
                  <Toggle key={v.id} label={v.name} checked={draft.vendorIds.includes(v.id)} onChange={(on) => set("vendorIds", on ? [...draft.vendorIds, v.id] : draft.vendorIds.filter((x) => x !== v.id))} />
                ))}
              </div>
            </fieldset>
          )}
          <TextArea className="full" label="Notes" value={draft.description} onChange={(v) => set("description", v)} rows={2} />
        </form>
      </Dialog>
      <ConfirmDialog open={confirmDelete} onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { if (event) store.remove("timeline", event.id); toast("Moment removed."); setConfirmDelete(false); onClose(); }}
        title="Remove this moment?" body={`“${event?.title ?? ""}” will be removed from the day.`} confirmLabel="Remove Moment" danger />
    </>
  );
}
