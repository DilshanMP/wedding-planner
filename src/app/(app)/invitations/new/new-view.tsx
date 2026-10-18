"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { TEMPLATES, designFromTemplate, initials, matchColors, templateById, type InviteContent } from "@/lib/domain/invite-studio";
import { CardThumb, TemplateThumb } from "@/components/invite/template-thumb";
import { ChoiceChips, TextField } from "@/components/ui/fields";
import { PageHeader, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";

export function NewInvitationView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Wizard />;
}

const STEPS = ["Template", "Your details", "Colours", "Create"] as const;
const SWATCHES = ["#D9B3B8", "#E8D4B0", "#722F37", "#C8B8DC", "#A8B5A0", "#C6A15B", "#8FA9C4", "#1C1416"];

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { create, save, weddingContent } = useInvites();
  const fromUrl = params.get("template");
  const [templateId, setTemplateId] = useState(TEMPLATES.some((t) => t.id === fromUrl) ? (fromUrl as string) : TEMPLATES[0].id);
  const [step, setStep] = useState(fromUrl ? 1 : 0);
  const [content, setContent] = useState<InviteContent>(() => weddingContent());
  const [colorMode, setColorMode] = useState<"template" | "match">("template");
  const [primary, setPrimary] = useState("#D9B3B8");
  const [mood, setMood] = useState<"light" | "dark">("light");
  const [name, setName] = useState("");
  const set = <K extends keyof InviteContent>(k: K, v: InviteContent[K]) => setContent((c) => ({ ...c, [k]: v }));

  const design = useMemo(() => {
    const d = designFromTemplate(templateId);
    d.seal.text = initials(content.brideName, content.groomName);
    if (colorMode === "match") d.colors = matchColors(primary, mood);
    return d;
  }, [templateId, colorMode, primary, mood, content.brideName, content.groomName]);

  const finish = () => {
    const p = create(templateId, content, name.trim() || templateById(templateId).name);
    if (colorMode === "match") save({ ...p, design: { ...p.design, colors: design.colors } });
    router.push(`/invitations/${p.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader overline="EverAfter Studio" title="Create an invitation" lead="Four quick steps. You can change everything later in the editor." />
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
              className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold", step === i ? "border-wine-600 bg-wine-600 text-white" : i < step ? "border-line bg-surface-raised text-ink" : "border-line text-ink-muted")}>
              <span className="grid size-5 place-items-center rounded-full bg-white/25 text-[11px]">{i < step ? <Check className="size-3" aria-hidden="true" /> : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="wos-card flex flex-col gap-5">
          {step === 0 && (
            <>
              <h2 className="wos-h2">Choose a template</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Template">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={templateId === t.id} onClick={() => setTemplateId(t.id)}
                    className={cx("flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-2 bg-surface-raised p-0 text-left", templateId === t.id ? "border-wine-600 shadow-[var(--shadow-md)]" : "border-transparent")}>
                    <TemplateThumb templateId={t.id} content={content} className="aspect-[4/5] w-full" />
                    <span className="flex flex-col gap-0.5 p-2.5">
                      <strong className="text-[13px] leading-[18px] text-ink">{t.name}</strong>
                      <span className="text-[11px] text-ink-muted">{t.tagline}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="wos-h2">Your details</h2>
              <p className="m-0 -mt-3 text-[14px] text-ink-muted">Filled in from your wedding — check them.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Bride's name" value={content.brideName} onChange={(v) => set("brideName", v)} />
                <TextField label="Groom's name" value={content.groomName} onChange={(v) => set("groomName", v)} />
                <TextField label="Wedding date" type="date" value={content.date} onChange={(v) => set("date", v)} />
                <TextField label="Starts at" type="time" value={content.time} onChange={(v) => set("time", v)} />
                <TextField label="Venue" value={content.venueName} onChange={(v) => set("venueName", v)} />
                <TextField label="Address / town" value={content.address} onChange={(v) => set("address", v)} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="wos-h2">Colours</h2>
              <ChoiceChips label="Palette" value={colorMode} onChange={setColorMode} options={[{ value: "template", label: "Keep the template's colours" }, { value: "match", label: "Match my wedding colour" }]} />
              {colorMode === "match" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Main colour">
                    {SWATCHES.map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={primary === c} aria-label={c} onClick={() => setPrimary(c)}
                        className={cx("size-9 rounded-full border-2", primary === c ? "border-wine-600 ring-2 ring-wine-600/30" : "border-white shadow-[var(--shadow-sm)]")} style={{ background: c }} />
                    ))}
                    <label className="ml-2 inline-flex items-center gap-2 text-[14px] text-ink-muted">Custom <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent" /></label>
                  </div>
                  <ChoiceChips label="Mood" value={mood} onChange={setMood} options={[{ value: "light", label: "Light & airy" }, { value: "dark", label: "Deep & dramatic" }]} />
                  <p className="m-0 text-[13px] text-ink-muted">We build the envelope, card, ink, seal and flower colours from your choice and keep the text readable.</p>
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="wos-h2">Name this design</h2>
              <TextField label="Design name" help="Only you see this — e.g. “Main invitation” or “Homecoming”." value={name} onChange={setName} placeholder={templateById(templateId).name} />
              <p className="m-0 text-[14px] text-ink-muted">Next you&apos;ll open the editor to write the wording, add a photo, and choose the envelope, seal and animation.</p>
            </>
          )}

          <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-line pt-4">
            {step === 0 ? <Link href="/invitations" className="wos-btn wos-btn--ghost">Cancel</Link> : <button type="button" className="wos-btn wos-btn--ghost" onClick={() => setStep(step - 1)}><ArrowLeft className="wos-icon" aria-hidden="true" />Back</button>}
            {step < STEPS.length - 1 ? (
              <button type="button" className="wos-btn wos-btn--primary" onClick={() => setStep(step + 1)}>Next<ArrowRight className="wos-icon" aria-hidden="true" /></button>
            ) : (
              <button type="button" className="wos-btn wos-btn--primary" onClick={finish}><Sparkles className="wos-icon" aria-hidden="true" />Create and open the editor</button>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-2 lg:sticky lg:top-6 lg:self-start" aria-label="Preview">
          <CardThumb content={content} design={design} className="aspect-[4/5] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]" />
          <p className="m-0 text-center text-[13px] text-ink-muted">{templateById(templateId).name}</p>
        </aside>
      </div>
    </div>
  );
}
