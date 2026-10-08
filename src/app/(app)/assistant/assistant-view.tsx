"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useAuth } from "@/lib/store/provider";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { answerLocally, assistantContext, SUGGESTED_QUESTIONS, type AssistantAnswer } from "@/lib/domain/assistant";
import { LotusMark, PageHeader, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";

interface Turn {
  id: number;
  question: string;
  answer: AssistantAnswer | null;
  deep?: { status: "loading" } | { status: "done"; text: string } | { status: "error"; text: string };
}

export function AssistantView() {
  const page = usePage();
  const auth = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [deepEnabled, setDeepEnabled] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    let active = true;
    fetch("/api/assistant").then((r) => r.json()).then((j: { enabled?: boolean }) => active && setDeepEnabled(Boolean(j.enabled)), () => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  if (!page) return <PageSkeleton />;
  const { data, today } = page;

  const askDeep = async (id: number, question: string) => {
    setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, deep: { status: "loading" } } : t)));
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (cloudEnabled && auth.mode === "cloud") {
        const { data: s } = await getSupabase().auth.getSession();
        if (s.session) headers.authorization = `Bearer ${s.session.access_token}`;
      }
      const res = await fetch("/api/assistant", { method: "POST", headers, body: JSON.stringify({ question, context: assistantContext(data, today) }) });
      const json = (await res.json()) as { answer?: string; error?: string };
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, deep: res.ok && json.answer ? { status: "done", text: json.answer } : { status: "error", text: json.error ?? "The assistant couldn't answer right now." } } : t)));
    } catch {
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, deep: { status: "error", text: "You seem to be offline." } } : t)));
    }
  };

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const id = nextId.current++;
    const answer = answerLocally(q, data, today);
    setTurns((ts) => [...ts, { id, question: q, answer }]);
    setDraft("");
    if (!answer && deepEnabled) void askDeep(id, q);
  };

  return (
    <>
      <PageHeader overline="Assistant" title="Ask about your wedding" lead="Answers come from your own plan — your budget, guests, vendors and timeline." />

      <section aria-label="Conversation" aria-live="polite" className="flex flex-col gap-4">
        {turns.length === 0 && (
          <div className="wos-card flex flex-col items-center gap-4 !p-8 text-center">
            <LotusMark className="size-12 text-champagne-700" />
            <p className="m-0 max-w-[460px] text-ink-muted">Try one of these, or ask in your own words.</p>
            <div className="wos-chips justify-center">
              {SUGGESTED_QUESTIONS.map((s) => <button key={s} type="button" className="wos-chip" onClick={() => ask(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id} className="flex flex-col gap-3">
            <p className="m-0 self-end rounded-2xl rounded-br-md bg-wine-600 px-4 py-2.5 text-[15px] text-on-wine max-w-[85%]">{t.question}</p>
            <div className="wos-card flex max-w-[92%] flex-col gap-3 !p-5">
              {t.answer ? (
                <p className="m-0 whitespace-pre-line text-[15px] leading-6">{t.answer.text}</p>
              ) : !t.deep ? (
                <p className="m-0 text-[15px] leading-6 text-ink-muted">
                  The built-in assistant answers questions about your budget, overspending, affordability, what to book next, contingency, quotes, guests, payments, tasks and readiness. {deepEnabled ? "" : "Deeper answers in your own words need the server's ANTHROPIC_API_KEY (see README)."}
                </p>
              ) : null}
              {t.answer && t.answer.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {t.answer.links.map((l) => <Link key={l.href + l.label} href={l.href} className="wos-btn wos-btn--secondary wos-btn--sm">{l.label}</Link>)}
                </div>
              )}
              {t.deep?.status === "loading" && <div className="flex flex-col gap-2" aria-label="Thinking"><div className="wos-skel h-4 w-3/4" /><div className="wos-skel h-4 w-1/2" /></div>}
              {t.deep?.status === "done" && (
                <div className={cx("flex flex-col gap-2", t.answer && "border-t border-line pt-3")}>
                  <span className="wos-overline inline-flex items-center gap-1.5"><Sparkles className="wos-icon size-3.5" aria-hidden="true" />In more detail</span>
                  <p className="m-0 whitespace-pre-line text-[15px] leading-6">{t.deep.text}</p>
                </div>
              )}
              {t.deep?.status === "error" && <p className="m-0 text-[14px] text-danger">{t.deep.text}</p>}
              {deepEnabled && t.answer && !t.deep && (
                <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm self-start" onClick={() => void askDeep(t.id, t.question)}>
                  <Sparkles className="wos-icon" aria-hidden="true" />Explain in More Detail
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <form className="sticky bottom-[104px] z-10 flex gap-2 md:bottom-6" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="ask" className="sr-only">Your question</label>
        <input id="ask" className="wos-input flex-1 !h-12 shadow-[var(--shadow-md)]" value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} placeholder="Can we afford the Grand Lotus decoration package?" autoComplete="off" />
        <button type="submit" className="wos-btn wos-btn--primary !h-12 !w-12 !p-0" aria-label="Ask" disabled={!draft.trim()}><ArrowUp className="wos-icon" aria-hidden="true" /></button>
      </form>
    </>
  );
}
