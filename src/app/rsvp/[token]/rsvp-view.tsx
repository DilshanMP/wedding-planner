"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { rsvpLookup, rsvpSubmit, type RsvpInvitation } from "@/lib/data/cloud-services";
import { formatLongDate } from "@/lib/domain/dates";
import { MEAL_LABEL } from "@/lib/domain/catalog";
import type { MealPreference } from "@/lib/domain/types";
import { ChoiceChips, NumberField, SelectField, TextArea } from "@/components/ui/fields";
import { JasmineMark, LotusMark, Notice, Skeleton } from "@/components/ui/primitives";

type Answer = "yes" | "no" | "maybe";

export function RsvpView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; invite: RsvpInvitation }>(
    cloudEnabled ? { status: "loading" } : { status: "missing" },
  );
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attending, setAttending] = useState<number | null>(null);
  const [meal, setMeal] = useState<MealPreference>("unknown");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled) return;
    let active = true;
    rsvpLookup(getSupabase(), token).then(
      (invite) => {
        if (!active) return;
        if (!invite) return setState({ status: "missing" });
        setState({ status: "ready", invite });
        if (invite.rsvp !== "pending") setAnswer(invite.rsvp);
        setMeal(invite.meal);
        setAttending(invite.adults + invite.children);
      },
      (e: unknown) => active && setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." }),
    );
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async () => {
    if (!answer || state.status !== "ready") return;
    setBusy(true);
    setFailure(null);
    try {
      const ok = await rsvpSubmit(getSupabase(), token, { response: answer, meal: answer === "no" ? "unknown" : meal, attending: answer === "yes" ? attending : null, message });
      if (ok) setDone(true);
      else setFailure("This invitation is no longer accepting replies.");
    } catch (e) {
      setFailure(e instanceof Error ? e.message.replace(/^Couldn't send your reply: /, "") : "Couldn't send your reply.");
    }
    setBusy(false);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="wos-card wos-card--hero flex w-full max-w-[520px] flex-col gap-6">
        {state.status === "loading" ? (
          <div className="flex flex-col gap-4" aria-busy="true"><Skeleton style={{ height: 48, width: "60%" }} /><Skeleton style={{ height: 160 }} /></div>
        ) : state.status === "missing" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <LotusMark className="size-12 text-champagne-700" />
            <h1 className="wos-h2">This invitation link isn&apos;t active.</h1>
            <p className="m-0 text-ink-muted">The couple may have closed online replies. Please reply to them directly.</p>
          </div>
        ) : state.status === "error" ? (
          <Notice tone="danger" role="alert" icon={<AlertTriangle className="wos-icon" />} title="We couldn't open your invitation.">{state.message}</Notice>
        ) : done ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="wos-icon size-12 text-success" aria-hidden="true" />
            <h1 className="wos-h1">Thank you.</h1>
            <p className="m-0 text-[16px] leading-[26px] text-ink-muted">
              {answer === "yes" ? `${state.invite.brideName} & ${state.invite.groomName} look forward to celebrating with you.` : answer === "maybe" ? "We've let them know. You can come back to this link to update your reply." : "We've let them know. Thank you for replying."}
            </p>
            <button type="button" className="wos-btn wos-btn--ghost" onClick={() => setDone(false)}>Change My Reply</button>
          </div>
        ) : (
          <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <div className="flex flex-col items-center gap-3 text-center">
              <JasmineMark className="size-10 text-champagne-700" />
              <span className="wos-overline">You&apos;re invited</span>
              <h1 className="m-0 font-display text-[40px] leading-[44px] font-normal">{state.invite.brideName} &amp; {state.invite.groomName}</h1>
              <p className="m-0 text-[16px] leading-[26px] text-ink-muted">
                {formatLongDate(state.invite.weddingDate)}
                {[state.invite.venue, state.invite.location].filter(Boolean).length ? <><br />{[state.invite.venue, state.invite.location].filter(Boolean).join(", ")}</> : null}
              </p>
            </div>
            <p className="m-0 border-t border-line pt-5 text-[16px] leading-[26px]">Dear {state.invite.guestName}, will you join us?</p>
            <ChoiceChips<Answer> label="Your reply" value={answer ?? ("" as Answer)} onChange={setAnswer}
              options={[{ value: "yes", label: "Joyfully attending" }, { value: "maybe", label: "Not sure yet" }, { value: "no", label: "Regretfully can't" }]} />
            {answer === "yes" && state.invite.adults + state.invite.children > 1 && (
              <NumberField label="How many of you will come?" value={attending} min={1} max={state.invite.adults + state.invite.children}
                onChange={(v) => setAttending(v === null ? null : Math.min(Math.max(1, v), state.invite.adults + state.invite.children))}
                help={`Your invitation is for ${state.invite.adults + state.invite.children}.`} />
            )}
            {answer && answer !== "no" && (
              <SelectField<MealPreference> label="Meal preference" value={meal} onChange={setMeal}
                options={(["unknown", "veg", "non_veg", "mixed"] as MealPreference[]).map((m) => ({ value: m, label: m === "unknown" ? "No preference" : MEAL_LABEL[m] }))} />
            )}
            <TextArea label="A note for the couple (optional)" value={message} onChange={setMessage} rows={3} />
            {failure && <Notice tone="danger" role="alert" icon={<AlertTriangle className="wos-icon" />} title="Your reply wasn't sent.">{failure}</Notice>}
            <button type="submit" className="wos-btn wos-btn--primary wos-btn--lg" disabled={!answer || busy}>{busy ? "Sending…" : "Send My Reply"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
