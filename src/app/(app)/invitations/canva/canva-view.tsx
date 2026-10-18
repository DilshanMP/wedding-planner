"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileImage, Link2, Link2Off, PenTool, Settings2 } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { newId, nowISO } from "@/lib/domain/ids";
import { FONTS, type InviteProject } from "@/lib/domain/invite-studio";
import { downloadBlob, familiesOf, svgToFile, svgToPng } from "@/lib/svg-export";
import { StudioTabs } from "@/components/invite/studio-tabs";
import { InviteCard } from "@/components/invite/invite-card";
import { CardThumb } from "@/components/invite/template-thumb";
import { Badge, EmptyState, Notice, PageHeader } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function CanvaView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Canva />;
}

type Status = { configured: boolean; connected: boolean; name: string };

const NOTICE: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Canva is connected." },
  denied: { tone: "warning", text: "You didn't allow access in Canva, so nothing was connected." },
  expired: { tone: "warning", text: "The sign-in took too long or was opened in another browser. Please try again." },
  error: { tone: "danger", text: "Canva couldn't finish connecting. Please try again." },
  not_configured: { tone: "warning", text: "Canva isn't set up on this server yet." },
};

const familiesFor = (p: InviteProject) => familiesOf(FONTS[p.design.fonts.names].family, FONTS[p.design.fonts.headings].family, FONTS[p.design.fonts.body].family);

function Canva() {
  const params = useSearchParams();
  const toast = useToast();
  const { plan, setPlan } = useInvites();
  const [status, setStatus] = useState<Status | null>(null);
  const [projectId, setProjectId] = useState(params.get("project") ?? plan.mainId ?? plan.projects[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const art = useRef<HTMLDivElement>(null);
  const flash = NOTICE[params.get("canva") ?? ""];
  const project = plan.projects.find((p) => p.id === projectId) ?? null;

  useEffect(() => {
    let alive = true;
    fetch("/api/canva/status", { cache: "no-store" })
      .then((r) => r.json() as Promise<Status>)
      .then((s) => alive && setStatus(s), () => alive && setStatus({ configured: false, connected: false, name: "" }));
    return () => {
      alive = false;
    };
  }, []);

  const record = (p: InviteProject, ok: boolean, detail: string) => setPlan((prev) => ({
    ...prev,
    projects: prev.projects.map((x) => (x.id === p.id ? { ...x, exports: [{ id: newId(), kind: "canva" as const, status: ok ? "done" as const : "failed" as const, at: nowISO(), detail }, ...x.exports].slice(0, 20) } : x)),
  }));

  const svg = () => {
    const el = art.current?.querySelector("svg");
    if (!el) throw new Error("The card isn't ready yet.");
    return el;
  };

  const send = async () => {
    if (!project) return;
    setBusy("send");
    setLink(null);
    try {
      const png = await svgToPng(svg(), 1500, familiesFor(project));
      const res = await fetch(`/api/canva/send?title=${encodeURIComponent(`${project.content.brideName} & ${project.content.groomName} — ${project.name}`)}`, { method: "POST", headers: { "Content-Type": "image/png" }, body: png });
      const body = (await res.json()) as { editUrl?: string; error?: string };
      if (!res.ok || !body.editUrl) {
        if (res.status === 401) setStatus((s) => (s ? { ...s, connected: false } : s));
        throw new Error(body.error ?? "Canva didn't accept the card.");
      }
      setLink(body.editUrl);
      record(project, true, body.editUrl);
      window.open(body.editUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      record(project, false, e instanceof Error ? e.message : "failed");
      toast(e instanceof Error ? e.message : "Couldn't send to Canva.", "danger");
    } finally {
      setBusy(null);
    }
  };

  const download = async (kind: "png" | "svg") => {
    if (!project) return;
    setBusy(kind);
    try {
      const name = `${project.content.brideName}-${project.content.groomName}-invitation`.replace(/[^\w-]+/g, "-").toLowerCase();
      downloadBlob(kind === "svg" ? await svgToFile(svg(), familiesFor(project)) : await svgToPng(svg(), 1500, familiesFor(project)), `${name}.${kind}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't prepare the file.", "danger");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await fetch("/api/canva/disconnect", { method: "POST" });
      setStatus((s) => (s ? { ...s, connected: false, name: "" } : s));
      toast("Canva disconnected.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader overline="EverAfter Studio" title="Canva" lead="Send your card into Canva as a new design you can keep editing there." />
      <StudioTabs />
      {flash && <Notice tone={flash.tone} icon={<CheckCircle2 className="wos-icon" aria-hidden="true" />} title={flash.text} role="status" />}

      {plan.projects.length === 0 ? (
        <EmptyState title="Create an invitation first" action={<Link href="/invitations/new" className="wos-btn wos-btn--primary">Create an invitation</Link>}>Then send its card to Canva from here.</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="wos-card flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="wos-h2 !text-[22px]">Canva connection</h2>
              {status === null ? <Badge>Checking…</Badge> : !status.configured ? <Badge tone="warning">Pending setup</Badge> : status.connected ? <Badge tone="success">Connected</Badge> : <Badge>Not connected</Badge>}
            </div>

            {status && !status.configured && (
              <Notice tone="warning" icon={<Settings2 className="wos-icon" aria-hidden="true" />} title="Waiting for Canva authorization">
                <span className="flex flex-col gap-2">
                  <span>The direct Canva connection needs a Canva Connect integration approved for this app. Until it&apos;s set up, download the card below and upload it in Canva (Uploads → Upload files).</span>
                  <span className="text-[13px]">For the person running the app: see <strong>docs/canva.md</strong> — create the integration in Canva&apos;s Developer Portal, add the redirect URL <code>/api/canva/callback</code>, then set CANVA_CLIENT_ID, CANVA_CLIENT_SECRET and CANVA_TOKEN_KEY on the server.</span>
                </span>
              </Notice>
            )}
            {status?.configured && !status.connected && (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[14px] text-ink-muted">You&apos;ll sign in on Canva and allow this app to add designs to your account. Your Canva password is never shared with us.</p>
                <a href={`/api/canva/authorize${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`} className="wos-btn wos-btn--primary self-start"><Link2 className="wos-icon" aria-hidden="true" />Connect Canva</a>
              </div>
            )}
            {status?.connected && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="m-0 text-[14px] text-ink">Connected{status.name ? ` as ${status.name}` : ""}.</p>
                <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" disabled={busy !== null} onClick={disconnect}><Link2Off className="wos-icon" aria-hidden="true" />Disconnect</button>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <SelectField label="Invitation" value={projectId} onChange={setProjectId} options={plan.projects.map((p) => ({ value: p.id, label: p.name }))} />
              <div className="flex flex-wrap gap-2">
                {status?.connected && <button type="button" className="wos-btn wos-btn--primary" disabled={busy !== null || !project} onClick={send}><PenTool className="wos-icon" aria-hidden="true" />{busy === "send" ? "Sending to Canva…" : "Send to Canva"}</button>}
                <button type="button" className="wos-btn wos-btn--secondary" disabled={busy !== null || !project} onClick={() => download("png")}><FileImage className="wos-icon" aria-hidden="true" />{busy === "png" ? "Preparing…" : "Download PNG for Canva"}</button>
                <button type="button" className="wos-btn wos-btn--ghost" disabled={busy !== null || !project} onClick={() => download("svg")}>SVG</button>
              </div>
              {link && <a className="wos-link inline-flex items-center gap-1 text-[14px]" href={link} target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden="true" />Open the design in Canva</a>}
              <p className="m-0 text-[13px] text-ink-muted">Canva receives a picture of the card (1500 × 2100 px, 5 × 7 in at 300 dpi). The animated envelope stays here.</p>
            </div>
          </section>
          {project && (
            <aside className="flex flex-col gap-2">
              <CardThumb content={project.content} design={project.design} className="aspect-[4/5] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]" />
              <div ref={art} aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0 w-[635px]">
                <InviteCard content={project.content} design={project.design} />
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
