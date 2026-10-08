"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAuth, useStore, useStoreState } from "@/lib/store/provider";
import { useClock } from "@/lib/hooks/use-clock";
import { BUDGET_CATEGORIES, STYLE_LABEL } from "@/lib/domain/catalog";
import { createWeddingData, type WeddingSetup } from "@/lib/domain/factory";
import { createSampleWedding } from "@/lib/domain/sample-data";
import { addDays, daysBetween, formatLongDate } from "@/lib/domain/dates";
import { fieldErrors, setupSchema } from "@/lib/domain/schemas";
import { formatLKR } from "@/lib/domain/money";
import { nowISO } from "@/lib/domain/ids";
import { TASK_TEMPLATES } from "@/lib/domain/task-templates";
import type { WeddingStyle } from "@/lib/domain/types";
import { ChoiceChips, MoneyField, MultiChips, NumberField, TagInput, TextField } from "@/components/ui/fields";
import { LotusMark, Notice } from "@/components/ui/primitives";
import { AlertTriangle } from "lucide-react";

const STEPS = ["The couple", "Date and place", "Guests and budget", "Style and priorities", "What matters most"] as const;

const MUST_HAVE_SUGGESTIONS = ["Excellent food", "Beautiful Poruwa", "Photography", "Family experience", "Traditional drummers"];
const NICE_SUGGESTIONS = ["Photo booth", "Fireworks", "Premium invitations", "Live band", "Drone video"];
const AVOID_SUGGESTIONS = ["Excessive decoration", "Unnecessary favours", "Expensive invitations", "Imported flowers"];

export function OnboardingFlow() {
  const router = useRouter();
  const store = useStore();
  const state = useStoreState();
  const auth = useAuth();
  const clock = useClock();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState<WeddingSetup>({
    brideName: "",
    groomName: "",
    weddingDate: "",
    venue: "",
    location: "",
    estimatedGuests: 250,
    budget: 3_000_000,
    style: "traditional",
    priorities: [],
    mustHave: [],
    niceToHave: [],
    avoidOverspending: [],
  });

  useEffect(() => {
    if (auth.mode === "cloud" && auth.status === "signed_out") router.replace("/login?next=/onboarding");
  }, [auth, router]);

  const set = <K extends keyof WeddingSetup>(k: K, v: WeddingSetup[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const stepFields: (keyof WeddingSetup)[][] = [["brideName", "groomName"], ["weddingDate", "venue", "location"], ["estimatedGuests", "budget"], ["style", "priorities"], ["mustHave", "niceToHave", "avoidOverspending"]];

  const validateStep = () => {
    const res = setupSchema.safeParse(form);
    if (res.success) return true;
    const all = fieldErrors(res.error);
    const relevant = Object.fromEntries(Object.entries(all).filter(([k]) => stepFields[step].includes(k.split(".")[0] as keyof WeddingSetup)));
    if (step === 1 && form.weddingDate && clock && daysBetween(clock.today, form.weddingDate) < 1) relevant.weddingDate = "Choose a date in the future.";
    setErrors(relevant);
    return Object.keys(relevant).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    const res = setupSchema.safeParse(form);
    if (!res.success || !clock) {
      if (!res.success) setErrors(fieldErrors(res.error));
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await store.createWedding(createWeddingData(res.data, clock.today, nowISO()));
      router.push("/dashboard");
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Couldn't create your wedding.");
      setBusy(false);
    }
  };

  const loadSample = async () => {
    if (!clock) return;
    setBusy(true);
    try {
      await store.createWedding(createSampleWedding(clock.today, nowISO()));
      router.push("/dashboard");
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Couldn't load the sample wedding.");
      setBusy(false);
    }
  };

  const hasWeddings = state.status === "ready" || (state.status === "empty" && state.weddings.length > 0);
  const minDate = clock ? addDays(clock.today, 1) : undefined;

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex max-w-[720px] flex-col gap-7 px-4 pt-8 pb-16 md:px-6 md:pt-14">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-[24px] leading-[28px] font-medium text-ink no-underline">Wedding OS</Link>
          {hasWeddings && <Link href="/dashboard" className="wos-link">Back to your wedding</Link>}
        </div>

        <div className="flex flex-col gap-3">
          <span className="wos-overline">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i <= step ? "var(--wine-600)" : "var(--surface-sunken)", transitionDuration: "var(--dur-base)" }} />
            ))}
          </div>
        </div>

        <form
          className="wos-card wos-card--hero flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < STEPS.length - 1) next();
            else void finish();
          }}
          noValidate
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              {step === 0 && (
                <>
                  <StepTitle title="Let's begin with the two of you." lead="Your names take the place of a logo throughout your plan." />
                  <div className="wos-form">
                    <TextField label="Bride's name" value={form.brideName} onChange={(v) => set("brideName", v)} error={errors.brideName} autoComplete="off" autoFocus />
                    <TextField label="Groom's name" value={form.groomName} onChange={(v) => set("groomName", v)} error={errors.groomName} autoComplete="off" />
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <StepTitle title="When and where?" lead="Every task date is calculated from your wedding date. You can change it later and the plan moves with it." />
                  <div className="wos-form">
                    <TextField className="full" label="Wedding date" type="date" value={form.weddingDate} min={minDate} onChange={(v) => set("weddingDate", v)} error={errors.weddingDate}
                      help={form.weddingDate && clock && daysBetween(clock.today, form.weddingDate) > 0 ? `${formatLongDate(form.weddingDate)} · ${daysBetween(clock.today, form.weddingDate)} days away` : "If you're waiting on the nekath, choose your best estimate."} />
                    <TextField label="Venue" value={form.venue} onChange={(v) => set("venue", v)} placeholder="Not booked yet" help="Optional" />
                    <TextField label="Town or city" value={form.location} onChange={(v) => set("location", v)} placeholder="Kandy" help="Optional" />
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <StepTitle title="How many guests, and what's the plan?" lead="We'll suggest a starting allocation across categories. Nothing is fixed." />
                  <div className="wos-form">
                    <NumberField label="Estimated guests" value={form.estimatedGuests} onChange={(v) => set("estimatedGuests", v ?? 0)} error={errors.estimatedGuests} min={1} max={5000} help="People, not invitations." />
                    <MoneyField label="Total budget" value={form.budget} onChange={(v) => set("budget", v ?? 0)} error={errors.budget}
                      help={form.budget && form.estimatedGuests ? `About ${formatLKR(Math.round(form.budget / form.estimatedGuests / 100) * 100)} per guest` : undefined} />
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <StepTitle title="What should it feel like?" lead="Choose a style and up to three categories that matter most. They get a larger share of the budget." />
                  <ChoiceChips<WeddingStyle> label="Wedding style" value={form.style} onChange={(v) => set("style", v)} options={(Object.keys(STYLE_LABEL) as WeddingStyle[]).map((s) => ({ value: s, label: STYLE_LABEL[s] }))} />
                  <MultiChips label="Top priorities" max={3} values={form.priorities} onChange={(v) => set("priorities", v)} help="Up to three."
                    options={BUDGET_CATEGORIES.filter((c) => !["miscellaneous", "emergency", "sound", "lighting", "album"].includes(c.id)).map((c) => ({ value: c.id, label: c.label }))} />
                </>
              )}
              {step === 4 && (
                <>
                  <StepTitle title="Spend intentionally." lead="Tell us what you won't compromise on, and where you'd rather not overspend. Recommendations will follow these." />
                  <SuggestedTags label="Must have" values={form.mustHave} onChange={(v) => set("mustHave", v)} suggestions={MUST_HAVE_SUGGESTIONS} />
                  <SuggestedTags label="Nice to have" values={form.niceToHave} onChange={(v) => set("niceToHave", v)} suggestions={NICE_SUGGESTIONS} />
                  <SuggestedTags label="Don't overspend on" values={form.avoidOverspending} onChange={(v) => set("avoidOverspending", v)} suggestions={AVOID_SUGGESTIONS} />
                  <div className="rounded-2xl bg-champagne-100 p-4 text-[14px] leading-5">
                    <b className="font-semibold">Your plan will start with</b>
                    <ul className="m-0 mt-2 list-disc pl-5 text-ink-muted">
                      <li>{TASK_TEMPLATES.length} tasks from the A–Z checklist, dated from your wedding day</li>
                      <li>A {formatLKR(form.budget)} budget split across {BUDGET_CATEGORIES.length} categories</li>
                      <li>A draft wedding-day timeline, from bride preparation to going-away</li>
                    </ul>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {failure && (
            <Notice tone="danger" role="alert" icon={<AlertTriangle className="wos-icon" />} title="Something went wrong.">{failure}</Notice>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            {step > 0 && (
              <button type="button" className="wos-btn wos-btn--ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="wos-icon" aria-hidden="true" /> Back
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <button type="submit" className="wos-btn wos-btn--primary">
                Continue <ArrowRight className="wos-icon" aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" className="wos-btn wos-btn--primary wos-btn--lg" disabled={busy || !clock} aria-disabled={busy}>
                {busy ? "Creating your plan…" : "Create Our Plan"}
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-col items-center gap-3 text-center">
          <LotusMark className="size-10 text-champagne-700" />
          <p className="m-0 max-w-[420px] text-ink-muted">Want to look around first? Explore a complete sample: Nethmi &amp; Kasun&apos;s wedding at Lotus Hall, Kandy.</p>
          <button type="button" className="wos-btn wos-btn--secondary" onClick={() => void loadSample()} disabled={busy || !clock}>
            <Sparkles className="wos-icon" aria-hidden="true" /> Explore Sample Wedding
          </button>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="wos-h1">{title}</h1>
      <p className="m-0 text-[16px] leading-[26px] text-ink-muted">{lead}</p>
    </div>
  );
}

function SuggestedTags({ label, values, onChange, suggestions }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const remaining = suggestions.filter((s) => !values.includes(s));
  return (
    <div className="flex flex-col gap-2">
      <TagInput label={label} values={values} onChange={onChange} placeholder="Type and press Enter" />
      {remaining.length > 0 && (
        <div className="wos-chips" aria-label={`Suggestions for ${label}`}>
          {remaining.map((s) => (
            <button key={s} type="button" className="wos-chip !border-dashed" onClick={() => onChange([...values, s])}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
