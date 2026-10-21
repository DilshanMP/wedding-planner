"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, Monitor, Redo2, RotateCcw, Smartphone, Undo2 } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { newId, nowISO } from "@/lib/domain/ids";
import { applyTemplate, templateById, type ExportKind, type InviteProject } from "@/lib/domain/invite-studio";
import { InvitationExperience } from "@/components/invite/invitation-experience";
import { InviteCard } from "@/components/invite/invite-card";
import { DesignPanel, DetailsPanel, MotionPanel, PhotoPanel, TemplatePanel, WordingPanel, type Change } from "@/components/invite/editor-panels";
import { PublishPanel } from "@/components/invite/publish-panel";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function EditorView() {
  const page = usePage();
  const { id } = useParams<{ id: string }>();
  if (!page) return <PageSkeleton />;
  return <EditorGate key={id} id={id} />;
}

function EditorGate({ id }: { id: string }) {
  const { plan } = useInvites();
  const project = plan.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <EmptyState title="We couldn't find this invitation" action={<Link href="/invitations" className="wos-btn wos-btn--primary">Back to my invitations</Link>}>
        It may have been deleted on another device.
      </EmptyState>
    );
  }
  return <Editor initial={project} />;
}

type Editable = Pick<InviteProject, "name" | "content" | "design">;
interface History { past: Editable[]; present: Editable; future: Editable[]; key: string | null; at: number }

const TABS = [
  { id: "template", label: "Template" },
  { id: "details", label: "Details" },
  { id: "wording", label: "Wording" },
  { id: "design", label: "Design" },
  { id: "photo", label: "Photo" },
  { id: "motion", label: "Motion & sound" },
  { id: "publish", label: "Publish & share" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const pick = (p: InviteProject): Editable => ({ name: p.name, content: p.content, design: p.design });

function Editor({ initial }: { initial: InviteProject }) {
  const toast = useToast();
  const { plan, setPlan, publish, unpublish, weddingContent, cloud } = useInvites();
  const [h, setH] = useState<History>(() => ({ past: [], present: pick(initial), future: [], key: null, at: 0 }));
  const [saved, setSaved] = useState<Editable>(h.present);
  const [tab, setTab] = useState<Tab>("details");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [mode, setMode] = useState<"envelope" | "invitation" | "card">("envelope");
  const [replay, setReplay] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  // The stored project carries the publish state; the editor owns the design.
  const live = plan.projects.find((p) => p.id === initial.id) ?? initial;
  const draft = h.present;
  const project: InviteProject = useMemo(() => ({ ...live, ...draft }), [live, draft]);
  const dirty = draft !== saved;

  const write = useCallback((e: Editable) => {
    const now = nowISO();
    setPlan((prev) => ({ ...prev, projects: prev.projects.map((x) => (x.id === initial.id ? { ...x, ...e, updatedAt: now } : x)) }));
    setSaved(e);
  }, [initial.id, setPlan]);

  // Autosave half a second after the last change, and on leaving the page.
  const pending = useRef<Editable | null>(null);
  const writeRef = useRef(write);
  useEffect(() => {
    writeRef.current = write;
  }, [write]);
  useEffect(() => {
    pending.current = draft === saved ? null : draft;
    if (draft === saved) return;
    const t = setTimeout(() => write(draft), 500);
    return () => clearTimeout(t);
  }, [draft, saved, write]);
  useEffect(() => () => {
    if (pending.current) writeRef.current(pending.current);
  }, []);

  const change: Change = useCallback((fn, key) => {
    setH((s) => {
      const before: InviteProject = { ...initial, ...s.present };
      const after = fn(before);
      if (after === before) return s;
      const next: Editable = pick(after);
      const now = Date.now();
      const coalesce = Boolean(key) && key === s.key && now - s.at < 1200;
      return { past: coalesce ? s.past : [...s.past.slice(-79), s.present], present: next, future: [], key: key ?? null, at: now };
    });
  }, [initial]);

  const undo = useCallback(() => setH((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], key: null, at: 0 } : s)), []);
  const redo = useCallback(() => setH((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), key: null, at: 0 } : s)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return; // let fields undo their own typing
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const fail = (m: string) => toast(m, "danger");
  const flushed = (): InviteProject => {
    if (dirty) write(draft);
    return { ...live, ...draft, updatedAt: nowISO() };
  };

  const preview = useMemo(() => {
    if (mode === "card") {
      return (
        <div className="grid h-full place-items-center overflow-auto p-6" style={{ background: draft.design.colors.background }}>
          <InviteCard content={draft.content} design={draft.design} className="max-h-full w-auto max-w-full drop-shadow-[0_18px_30px_rgba(40,20,10,.25)]" />
        </div>
      );
    }
    return <InvitationExperience key={`${replay}-${mode}`} content={draft.content} design={draft.design} framed silent startOpen={mode === "invitation"} />;
  }, [mode, replay, draft]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/invitations" className="wos-iconbtn" aria-label="Back to my invitations"><ArrowLeft className="wos-icon" aria-hidden="true" /></Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="wos-overline">EverAfter Studio · {templateById(draft.design.templateId).name}</span>
          <input
            aria-label="Design name"
            value={draft.name}
            onChange={(e) => change((p) => ({ ...p, name: e.target.value }), "name")}
            className="min-w-0 border-0 bg-transparent p-0 font-[family-name:var(--wos-display)] text-[26px] leading-[32px] text-ink outline-none focus-visible:underline"
          />
        </div>
        <span className="text-[13px] text-ink-muted" role="status" aria-live="polite" data-testid="save-state">{dirty ? "Saving…" : cloud ? "Saved to your account" : "Saved on this device"}</span>
        <div className="flex items-center gap-1">
          <button type="button" className="wos-iconbtn" onClick={undo} disabled={!h.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 className="wos-icon" aria-hidden="true" /></button>
          <button type="button" className="wos-iconbtn" onClick={redo} disabled={!h.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 className="wos-icon" aria-hidden="true" /></button>
          <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setConfirmReset(true)}><RotateCcw className="wos-icon" aria-hidden="true" />Reset design</button>
          <Link href={`/invitations/${initial.id}/preview`} className="wos-btn wos-btn--secondary wos-btn--sm"><Eye className="wos-icon" aria-hidden="true" />Preview</Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
        <section className="wos-card flex min-w-0 flex-col gap-4 lg:max-h-[calc(100dvh-160px)]">
          <div className="wos-tabs wos-tabs--line shrink-0 flex-wrap !gap-x-4 !gap-y-1" role="tablist" aria-label="Editor sections">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls="editor-panel" aria-selected={tab === t.id} className="wos-tab !px-1" onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div id="editor-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:-mr-3 lg:overflow-y-auto lg:pr-3">
            {tab === "template" && <TemplatePanel p={project} onPick={(id) => { change((p) => applyTemplate(p, id)); toast(`${templateById(id).name} — undo with Ctrl+Z.`); }} />}
            {tab === "details" && <DetailsPanel p={project} change={change} onRefreshMoments={() => change((p) => ({ ...p, content: { ...p.content, moments: weddingContent().moments } }))} />}
            {tab === "wording" && <WordingPanel p={project} change={change} />}
            {tab === "design" && <DesignPanel p={project} change={change} />}
            {tab === "photo" && <PhotoPanel p={project} change={change} onError={fail} />}
            {tab === "motion" && <MotionPanel p={project} change={change} onReplay={() => { setMode("envelope"); setReplay((r) => r + 1); }} />}
            {tab === "publish" && (
              <PublishPanel
                project={project}
                isMain={plan.mainId === initial.id}
                cloud={cloud}
                onPublish={async () => {
                  await publish(flushed());
                  toast("Your invitation is live.");
                }}
                onUnpublish={async () => {
                  await unpublish(live);
                  toast("The link is offline.");
                }}
                onMakeMain={async () => {
                  if (live.publishedAt) await publish(flushed(), { main: true });
                  else setPlan((prev) => ({ ...prev, mainId: initial.id }));
                  toast("Personal guest links now use this design.");
                }}
                onExported={(kind: ExportKind, ok, detail) => setPlan((prev) => ({
                  ...prev,
                  projects: prev.projects.map((x) => (x.id === initial.id ? { ...x, exports: [{ id: newId(), kind, status: ok ? "done" as const : "failed" as const, at: nowISO(), detail }, ...x.exports].slice(0, 20) } : x)),
                }))}
                onError={fail}
              />
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:self-start" aria-label="Live preview">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="wos-tabs" role="radiogroup" aria-label="Preview">
              {(["envelope", "invitation", "card"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} className="wos-tab" onClick={() => { setMode(m); if (m === "envelope") setReplay((r) => r + 1); }}>{m === "envelope" ? "Opening" : m === "invitation" ? "Invitation" : "Card"}</button>
              ))}
            </div>
            <div className="wos-tabs" role="radiogroup" aria-label="Screen">
              <button type="button" role="radio" aria-checked={device === "mobile"} className="wos-tab" onClick={() => setDevice("mobile")}><Smartphone className="size-4" aria-hidden="true" />Phone</button>
              <button type="button" role="radio" aria-checked={device === "desktop"} className="wos-tab" onClick={() => setDevice("desktop")}><Monitor className="size-4" aria-hidden="true" />Computer</button>
            </div>
          </div>
          <div className={cx("mx-auto w-full", device === "mobile" ? "max-w-[380px]" : "max-w-[960px]")}>
            {device === "mobile" ? (
              <div className="phone-frame"><div className="phone-screen" data-testid="editor-preview">{preview}</div></div>
            ) : (
              <div className="overflow-hidden rounded-[18px] border-[10px] border-[#2a2326] bg-[#2a2326] shadow-[var(--shadow-lg)]">
                <div className="aspect-[16/10] overflow-hidden rounded-[8px] bg-white" data-testid="editor-preview">{preview}</div>
              </div>
            )}
          </div>
          {mode === "envelope" && <p className="m-0 text-center text-[13px] text-ink-muted">{draft.design.opening === "gate" ? "Tap the doors" : "Tap the envelope"} to play the opening. Music is muted in the editor.</p>}
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          change((p) => applyTemplate(p, p.design.templateId));
          toast("Design reset to the template. Undo with Ctrl+Z.");
        }}
        title="Reset the design?"
        body="Colours, envelope, fonts and animation go back to the template. Your wording, details and photo stay."
        confirmLabel="Reset design"
      />
    </div>
  );
}
