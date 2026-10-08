"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cloud, Download, HardDrive, Plus, Upload } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useAuth, useFileStore, useStore, useStoreState } from "@/lib/store/provider";
import { BUDGET_CATEGORIES, ROLE_LABEL, STYLE_LABEL } from "@/lib/domain/catalog";
import { formatDate } from "@/lib/domain/dates";
import { fieldErrors, setupSchema } from "@/lib/domain/schemas";
import { generateTasks } from "@/lib/domain/tasks";
import { nowISO } from "@/lib/domain/ids";
import { normalizeWeddingData } from "@/lib/domain/normalize";
import type { Blueprint, WeddingData, WeddingStyle } from "@/lib/domain/types";
import { getSupabase } from "@/lib/supabase/client";
import { Card, PageHeader } from "@/components/ui/primitives";
import { ChoiceChips, MoneyField, MultiChips, NumberField, TagInput, TextArea, TextField } from "@/components/ui/fields";
import { ConfirmDialog } from "@/components/ui/dialog";
import { SharingCard } from "@/components/features/sharing-card";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function SettingsView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Settings data={page.data} today={page.today} />;
}

function Settings({ data, today }: { data: WeddingData; today: string }) {
  const store = useStore();
  const toast = useToast();
  const { wedding } = data;
  const [d, setD] = useState({
    brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate, venue: wedding.venue, location: wedding.location,
    estimatedGuests: wedding.estimatedGuests, budget: wedding.budget, style: wedding.style, priorities: wedding.priorities,
    mustHave: wedding.mustHave, niceToHave: wedding.niceToHave, avoidOverspending: wedding.avoidOverspending,
  });
  const [blueprint, setBlueprint] = useState<Blueprint>(wedding.blueprint);
  const [rate, setRate] = useState(Math.round(wedding.pendingAttendanceRate * 100));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  const saveDetails = () => {
    const res = setupSchema.safeParse(d);
    if (!res.success) return setErrors(fieldErrors(res.error));
    setErrors({});
    const moved = res.data.weddingDate !== wedding.weddingDate;
    store.updateWedding(res.data);
    toast(moved ? "Saved. Open tasks moved with your new date." : "Wedding details saved.");
  };

  return (
    <>
      <PageHeader overline="Settings" title="Your wedding" lead="Everything here shapes your plan and its recommendations." />

      <Card title="Wedding details">
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); saveDetails(); }} noValidate>
          <TextField label="Bride's name" value={d.brideName} onChange={(v) => set("brideName", v)} error={errors.brideName} />
          <TextField label="Groom's name" value={d.groomName} onChange={(v) => set("groomName", v)} error={errors.groomName} />
          <TextField label="Wedding date" type="date" value={d.weddingDate} onChange={(v) => set("weddingDate", v)} error={errors.weddingDate} help="Open tasks move with the date." />
          <TextField label="Venue" value={d.venue} onChange={(v) => set("venue", v)} />
          <TextField label="Town or city" value={d.location} onChange={(v) => set("location", v)} />
          <NumberField label="Estimated guests" value={d.estimatedGuests} onChange={(v) => set("estimatedGuests", v ?? 0)} error={errors.estimatedGuests} />
          <MoneyField className="full" label="Original budget" value={d.budget} onChange={(v) => set("budget", v ?? 0)} error={errors.budget} help="Changing it doesn't re-allocate your categories." />
          <ChoiceChips<WeddingStyle> className="full" label="Style" value={d.style} onChange={(v) => set("style", v)} options={(Object.keys(STYLE_LABEL) as WeddingStyle[]).map((s) => ({ value: s, label: STYLE_LABEL[s] }))} />
          <div className="full"><MultiChips label="Top priorities" max={5} values={d.priorities} onChange={(v) => set("priorities", v)} options={BUDGET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} /></div>
          <div className="full"><TagInput label="Must have" values={d.mustHave} onChange={(v) => set("mustHave", v)} /></div>
          <div className="full"><TagInput label="Nice to have" values={d.niceToHave} onChange={(v) => set("niceToHave", v)} /></div>
          <div className="full"><TagInput label="Don't overspend on" values={d.avoidOverspending} onChange={(v) => set("avoidOverspending", v)} /></div>
          <div className="full flex justify-end"><button type="submit" className="wos-btn wos-btn--primary">Save Details</button></div>
        </form>
      </Card>

      <Card title="Wedding blueprint" action={<span className="text-[13px] text-ink-muted">Your north star when choices get hard</span>}>
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); store.updateWedding({ blueprint }); toast("Blueprint saved."); }}>
          <TextArea className="full" label="Wedding vision" value={blueprint.vision} onChange={(v) => setBlueprint((b) => ({ ...b, vision: v }))} placeholder="How should the day feel?" />
          <TextArea label="Guest experience" value={blueprint.guestExperience} onChange={(v) => setBlueprint((b) => ({ ...b, guestExperience: v }))} />
          <TextArea label="Ceremony" value={blueprint.ceremony} onChange={(v) => setBlueprint((b) => ({ ...b, ceremony: v }))} />
          <TextArea label="Photography" value={blueprint.photography} onChange={(v) => setBlueprint((b) => ({ ...b, photography: v }))} />
          <TextArea label="Food" value={blueprint.food} onChange={(v) => setBlueprint((b) => ({ ...b, food: v }))} />
          <div className="full flex justify-end"><button type="submit" className="wos-btn wos-btn--primary">Save Blueprint</button></div>
        </form>
      </Card>

      <div className="flex flex-wrap items-start gap-6">
        <Card title="People" className="flex-[1_1_360px]">
          <p className="m-0 text-[14px] text-ink-muted">Names and phone numbers used for task owners and on the wedding day.</p>
          <ul className="wos-list">
            {data.people.map((p) => (
              <li key={p.id}>
                <label className="sr-only" htmlFor={`person-${p.id}`}>{ROLE_LABEL[p.role]} name</label>
                <input id={`person-${p.id}`} className="wos-input flex-1" defaultValue={p.name}
                  onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== p.name) { store.upsert("people", { ...p, name }); toast("Name updated."); } }} />
                <label className="sr-only" htmlFor={`phone-${p.id}`}>{ROLE_LABEL[p.role]} phone</label>
                <input id={`phone-${p.id}`} className="wos-input w-[140px]" type="tel" placeholder="Phone" defaultValue={p.phone}
                  onBlur={(e) => { const phone = e.target.value.trim(); if (phone !== p.phone) { store.upsert("people", { ...p, phone }); toast("Phone saved."); } }} />
                <span className="hidden w-[110px] text-[13px] text-ink-muted sm:inline">{ROLE_LABEL[p.role]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Guest assumptions" className="flex-[1_1_300px]">
          <NumberField label="Share of pending guests expected to attend (%)" value={rate} onChange={(v) => setRate(Math.min(100, Math.max(0, v ?? 0)))} max={100} help="Used for expected attendance and catering estimates. 75% is a common Sri Lankan planning assumption." />
          <button type="button" className="wos-btn wos-btn--secondary self-start" onClick={() => { store.updateWedding({ pendingAttendanceRate: rate / 100 }); toast("Assumption saved."); }}>Save</button>
        </Card>
      </div>

      <SharingCard weddingId={data.wedding.id} />
      <Checklist data={data} today={today} />
      <AccountAndData data={data} />
    </>
  );
}

function Checklist({ data, today }: { data: WeddingData; today: string }) {
  const store = useStore();
  const toast = useToast();
  const existing = new Set(data.tasks.map((t) => t.templateKey).filter(Boolean));
  const missing = generateTasks({ weddingDate: data.wedding.weddingDate, today, people: data.people, now: nowISO() }).filter((t) => !existing.has(t.templateKey));
  return (
    <Card title="Recommended checklist">
      <p className="m-0 text-[14px] text-ink-muted">
        {missing.length === 0 ? "Every recommended task is in your checklist." : `${missing.length} recommended ${missing.length === 1 ? "task isn't" : "tasks aren't"} in your checklist (you may have deleted them).`}
      </p>
      {missing.length > 0 && (
        <button type="button" className="wos-btn wos-btn--secondary self-start" onClick={() => { store.upsert("tasks", missing.map((t) => ({ ...t, dependsOn: [] }))); toast(`${missing.length} tasks restored.`); }}>
          <Plus className="wos-icon" aria-hidden="true" />Restore {missing.length} Tasks
        </button>
      )}
    </Card>
  );
}

function AccountAndData({ data }: { data: WeddingData }) {
  const auth = useAuth();
  const store = useStore();
  const files = useFileStore();
  const state = useStoreState();
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const weddings = state.status === "ready" ? state.weddings : [];

  const [importError, setImportError] = useState<string | null>(null);
  const importBackup = async (file: File) => {
    setImportError(null);
    try {
      const parsed = JSON.parse(await file.text()) as { format?: string; version?: number; data?: WeddingData };
      if (parsed.format !== "wedding-os" || parsed.version !== 1 || !parsed.data?.wedding?.id) throw new Error("This isn't a Wedding OS backup file.");
      if (weddings.some((w) => w.id === parsed.data!.wedding.id)) throw new Error("This wedding is already here. Delete it first if you want to restore the backup over it.");
      await store.createWedding(normalizeWeddingData(parsed.data));
      toast(`${parsed.data.wedding.brideName} & ${parsed.data.wedding.groomName}'s wedding restored.`);
      router.push("/dashboard");
    } catch (e) {
      setImportError(e instanceof SyntaxError ? "That file couldn't be read as a backup." : e instanceof Error ? e.message : "Import failed.");
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ format: "wedding-os", version: 1, exportedAt: nowISO(), data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wedding-os-${data.wedding.brideName}-${data.wedding.groomName}.json`.toLowerCase().replace(/\s+/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <Card title="Account and storage" className="flex-[1_1_360px]">
        {auth.mode === "local" ? (
          <div className="flex gap-3">
            <HardDrive className="wos-icon mt-1 text-champagne-700" aria-hidden="true" />
            <p className="m-0 text-[14px] text-ink-muted">Your plan is saved in this browser only. Nothing leaves this device. Export a copy regularly, or connect a Supabase project to sync between devices and share with family (see README).</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Cloud className="wos-icon mt-1 text-champagne-700" aria-hidden="true" />
              <p className="m-0 text-[14px] text-ink-muted">Signed in{auth.status === "signed_in" && auth.email ? ` as ${auth.email}` : ""}. Your plan syncs securely to the cloud.</p>
            </div>
            <button type="button" className="wos-btn wos-btn--secondary self-start" onClick={async () => { await getSupabase().auth.signOut(); router.replace("/login"); }}>Sign Out</button>
          </div>
        )}
        <p className="m-0 text-[14px]"><b>Plan:</b> Free — everything in the app is included. <Link href="/#plans" className="wos-link">See plans</Link></p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="wos-btn wos-btn--secondary" onClick={exportJSON}><Download className="wos-icon" aria-hidden="true" />Export All Data</button>
          <label className="wos-btn wos-btn--ghost cursor-pointer">
            <Upload className="wos-icon" aria-hidden="true" />Import Backup
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importBackup(f); }} />
          </label>
        </div>
        {importError && <p role="alert" className="m-0 text-[13px] text-danger">{importError}</p>}
      </Card>

      <Card title="Weddings" className="flex-[1_1_300px]">
        <ul className="wos-list">
          {weddings.map((w) => (
            <li key={w.id}>
              <span className="flex flex-1 flex-col">
                <b className="text-[14px] font-semibold">{w.brideName} &amp; {w.groomName}</b>
                <span className="text-[13px] text-ink-muted">{formatDate(w.weddingDate)}{w.location ? ` · ${w.location}` : ""}</span>
              </span>
              {w.id === data.wedding.id ? <span className="text-[13px] font-semibold text-wine-600">Open</span> : <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => void store.selectWedding(w.id)}>Switch</button>}
            </li>
          ))}
        </ul>
        <Link href="/onboarding" className="wos-btn wos-btn--secondary self-start"><Plus className="wos-icon" aria-hidden="true" />Plan Another Wedding</Link>
        <div className="border-t border-line pt-4">
          <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirm(true)}>Delete This Wedding</button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await files.remove(data.documents.map((d) => d.storagePath)).catch(() => undefined);
          await store.deleteWedding(data.wedding.id);
          router.replace("/dashboard");
        }}
        title={`Delete ${data.wedding.brideName} & ${data.wedding.groomName}'s wedding?`}
        body={`This removes ${data.guests.length} guests, ${data.tasks.length} tasks, ${data.vendors.length} vendors and all payments${auth.mode === "local" ? " from this browser. It can't be undone — export a copy first if you might need it." : ". It can be recovered for 30 days by contacting support."}`}
        confirmLabel="Delete Wedding"
        danger
      />
    </div>
  );
}
