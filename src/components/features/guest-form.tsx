"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/provider";
import { INVITATION_LABEL, MEAL_LABEL, PARTY_LABEL, RELATION_LABEL, RSVP_LABEL } from "@/lib/domain/catalog";
import { fieldErrors, guestSchema } from "@/lib/domain/schemas";
import { newId, nowISO } from "@/lib/domain/ids";
import { INVITATION_STATUSES, RSVP_STATUSES, type Guest, type InvitationStatus, type MealPreference, type PartyType, type Relation, type RsvpStatus } from "@/lib/domain/types";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { ChoiceChips, NumberField, SelectField, TextArea, TextField, Toggle } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";

type Draft = Omit<Guest, "id" | "createdAt" | "updatedAt" | "rsvpToken">;

const blank: Draft = {
  name: "", phone: "", email: "", side: "bride", relation: "family", vip: false, partyType: "single",
  adults: 1, children: 0, invitation: "not_sent", rsvp: "pending", meal: "unknown", vegCount: 0,
  table: "", needsTransport: false, needsAccommodation: false, notes: "",
};

const PARTY_DEFAULTS: Record<PartyType, [number, number]> = { single: [1, 0], couple: [2, 0], family: [2, 2], group: [4, 0] };

export function GuestForm({ open, guest, onClose }: { open: boolean; guest?: Guest; onClose: () => void }) {
  return <Inner key={`${guest?.id ?? "new"}-${open}`} open={open} guest={guest} onClose={onClose} />;
}

function Inner({ open, guest, onClose }: { open: boolean; guest?: Guest; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => {
    if (!guest) return blank;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, rsvpToken, ...rest } = guest;
    return rest;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = (another = false) => {
    const res = guestSchema.safeParse(draft);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    store.upsert("guests", { ...(guest ?? { id: newId(), createdAt: now, rsvpToken: newId() }), ...res.data, updatedAt: now } as Guest);
    toast(guest ? "Guest updated." : `${res.data.name} added.`);
    if (another) {
      setDraft({ ...blank, side: draft.side, relation: draft.relation });
      setErrors({});
    } else onClose();
  };

  const size = draft.adults + draft.children;

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={guest ? "Edit guest" : "Add a guest"}
        description="A guest can be one person, a couple, a family or a group."
        footer={
          <>
            {guest && <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
            <span className="spacer" />
            {!guest && <button type="button" className="wos-btn wos-btn--secondary" onClick={() => save(true)}>Save and Add Another</button>}
            <button type="button" className="wos-btn wos-btn--primary" onClick={() => save()}>{guest ? "Save Changes" : "Add Guest"}</button>
          </>
        }
      >
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <ChoiceChips className="full" label="Side" value={draft.side} onChange={(v) => set("side", v)} options={[{ value: "bride", label: "Bride side" }, { value: "groom", label: "Groom side" }]} />
          <TextField className="full" label="Name" value={draft.name} onChange={(v) => set("name", v)} error={errors.name} placeholder="Perera family" autoFocus={!guest} />
          <SelectField<Relation> label="Relationship" value={draft.relation} onChange={(v) => set("relation", v)} options={(Object.keys(RELATION_LABEL) as Relation[]).map((r) => ({ value: r, label: RELATION_LABEL[r] }))} />
          <SelectField<PartyType> label="Party" value={draft.partyType} onChange={(v) => setDraft((d) => ({ ...d, partyType: v, adults: PARTY_DEFAULTS[v][0], children: PARTY_DEFAULTS[v][1] }))} options={(Object.keys(PARTY_LABEL) as PartyType[]).map((p) => ({ value: p, label: PARTY_LABEL[p] }))} />
          <NumberField label="Adults" value={draft.adults} onChange={(v) => set("adults", v ?? 0)} error={errors.adults} max={100} />
          <NumberField label="Children" value={draft.children} onChange={(v) => set("children", v ?? 0)} max={100} />
          <TextField label="Phone" type="tel" value={draft.phone} onChange={(v) => set("phone", v)} placeholder="077 123 4567" />
          <TextField label="Email" type="email" value={draft.email} onChange={(v) => set("email", v)} error={errors.email} />
          <SelectField<InvitationStatus> label="Invitation" value={draft.invitation} onChange={(v) => set("invitation", v)} options={INVITATION_STATUSES.map((s) => ({ value: s, label: INVITATION_LABEL[s] }))} />
          <SelectField<RsvpStatus> label="RSVP" value={draft.rsvp} onChange={(v) => set("rsvp", v)} options={RSVP_STATUSES.map((s) => ({ value: s, label: RSVP_LABEL[s] }))} />
          <SelectField<MealPreference> label="Meal" value={draft.meal} onChange={(v) => set("meal", v)} options={(Object.keys(MEAL_LABEL) as MealPreference[]).map((m) => ({ value: m, label: MEAL_LABEL[m] }))} />
          {draft.meal === "mixed" ? (
            <NumberField label="Vegetarian in party" value={draft.vegCount} onChange={(v) => set("vegCount", Math.min(v ?? 0, size))} max={size} help={`Of ${size}`} />
          ) : (
            <TextField label="Table" value={draft.table} onChange={(v) => set("table", v)} placeholder="Table 12" />
          )}
          {draft.meal === "mixed" && <TextField label="Table" value={draft.table} onChange={(v) => set("table", v)} placeholder="Table 12" />}
          <div className="full flex flex-wrap gap-x-6 gap-y-3">
            <Toggle label="VIP" checked={draft.vip} onChange={(v) => set("vip", v)} />
            <Toggle label="Needs transport" checked={draft.needsTransport} onChange={(v) => set("needsTransport", v)} />
            <Toggle label="Needs accommodation" checked={draft.needsAccommodation} onChange={(v) => set("needsAccommodation", v)} />
          </div>
          <TextArea className="full" label="Notes" value={draft.notes} onChange={(v) => set("notes", v)} rows={2} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (guest) store.remove("guests", guest.id);
          toast("Guest removed.");
          setConfirmDelete(false);
          onClose();
        }}
        title="Remove this guest?"
        body={`${guest?.name ?? "This guest"} (${size} ${size === 1 ? "person" : "people"}) will be removed from the list.`}
        confirmLabel="Remove Guest"
        danger
      />
    </>
  );
}
