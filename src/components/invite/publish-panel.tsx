"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Download, FileImage, FileText, Globe, PenTool, Star, Video } from "lucide-react";
import { FONTS, hasUnpublishedChanges, type ExportKind, type InviteProject } from "@/lib/domain/invite-studio";
import { downloadBlob, familiesOf, jpegToPdf, svgToFile, svgToPng } from "@/lib/svg-export";
import { Badge, Notice } from "@/components/ui/primitives";
import { InviteCard } from "./invite-card";
import { SharePanel } from "./share-panel";

const PX_W = 1500; // 5 in at 300 dpi
const PX_H = Math.round(PX_W * (1778 / 1270));

export function PublishPanel({ project, isMain, cloud, onPublish, onUnpublish, onMakeMain, onExported, onError }: {
  project: InviteProject;
  isMain: boolean;
  cloud: boolean;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
  onMakeMain: () => Promise<void>;
  onExported: (kind: ExportKind, ok: boolean, detail: string) => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const art = useRef<HTMLDivElement>(null);
  const live = Boolean(project.publishedAt && project.slug);
  const pending = hasUnpublishedChanges(project);
  const base = `${project.content.brideName}-${project.content.groomName}-invitation`.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase();

  const run = async (key: string, job: () => Promise<void>) => {
    setBusy(key);
    try {
      await job();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const exportFile = (kind: "png" | "svg" | "pdf") => run(kind, async () => {
    const svg = art.current?.querySelector("svg");
    if (!svg) throw new Error("The card isn't ready yet.");
    const d = project.design;
    const families = familiesOf(FONTS[d.fonts.names].family, FONTS[d.fonts.headings].family, FONTS[d.fonts.body].family);
    const name = `${base}.${kind}`;
    try {
      if (kind === "svg") downloadBlob(await svgToFile(svg, families), name);
      else if (kind === "png") downloadBlob(await svgToPng(svg, PX_W, families), name);
      else downloadBlob(await jpegToPdf(await svgToPng(svg, PX_W, families, "image/jpeg"), PX_W, PX_H, 360, 504), name);
      onExported(kind, true, name);
    } catch (e) {
      onExported(kind, false, name);
      throw e;
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 font-[family-name:var(--wos-serif)] text-[18px] text-ink">Publish</h3>
          {live ? <Badge tone="success">Live</Badge> : <Badge>Draft</Badge>}
          {live && pending && <Badge tone="warning">Changes not published</Badge>}
        </div>
        {!cloud && <p className="m-0 text-[13px] text-ink-muted">You&apos;re not signed in to a cloud account, so the link opens only on this browser — good for a test run.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--primary" disabled={busy !== null} onClick={() => run("publish", onPublish)}>
            <Globe className="wos-icon" aria-hidden="true" />{busy === "publish" ? "Publishing…" : live ? (pending ? "Publish changes" : "Publish again") : "Publish"}
          </button>
          {live && <button type="button" className="wos-btn wos-btn--ghost" disabled={busy !== null} onClick={() => run("unpublish", onUnpublish)}>Take offline</button>}
        </div>
        {live && project.slug && <SharePanel slug={project.slug} content={project.content} />}
        {isMain ? (
          <p className="m-0 flex items-center gap-1.5 text-[13px] text-ink-muted"><Star className="size-4 text-champagne-700" aria-hidden="true" />Personal guest links (Send to guests) use this design.</p>
        ) : (
          <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm self-start" disabled={busy !== null} onClick={() => run("main", onMakeMain)}><Star className="wos-icon" aria-hidden="true" />Use for personal guest links</button>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="m-0 font-[family-name:var(--wos-serif)] text-[18px] text-ink">Download</h3>
        <p className="m-0 text-[13px] text-ink-muted">The card at 5 × 7 in, ready to print or post.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" disabled={busy !== null} onClick={() => exportFile("png")}><FileImage className="wos-icon" aria-hidden="true" />{busy === "png" ? "Preparing…" : "PNG (300 dpi)"}</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" disabled={busy !== null} onClick={() => exportFile("pdf")}><FileText className="wos-icon" aria-hidden="true" />{busy === "pdf" ? "Preparing…" : "PDF for print"}</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" disabled={busy !== null} onClick={() => exportFile("svg")}><Download className="wos-icon" aria-hidden="true" />{busy === "svg" ? "Preparing…" : "SVG (vector)"}</button>
        </div>
        <Link href={`/invitations/canva?project=${project.id}`} className="wos-btn wos-btn--ghost wos-btn--sm self-start"><PenTool className="wos-icon" aria-hidden="true" />Open in Canva</Link>
        <Notice tone="info" icon={<Video className="wos-icon" aria-hidden="true" />} title="Video export isn't available yet">
          To share the opening as a video, open Preview and use your phone&apos;s screen recorder.
        </Notice>
        {project.exports.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12px] text-ink-muted">
            {project.exports.slice(0, 4).map((x) => (
              <li key={x.id}>{x.kind.toUpperCase()} · {x.status === "done" ? "downloaded" : "failed"} · {new Date(x.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</li>
            ))}
          </ul>
        )}
      </section>

      {/* The card at full size for downloads (kept off screen). */}
      <div ref={art} aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0 w-[635px]">
        <InviteCard content={project.content} design={project.design} />
      </div>
    </div>
  );
}
