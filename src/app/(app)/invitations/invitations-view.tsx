"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Pencil, Plus, Share2, Smartphone, Sparkles, Star, Trash2 } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useInvites } from "@/lib/hooks/use-invites";
import { useStore } from "@/lib/store/provider";
import { TEMPLATES, hasUnpublishedChanges, templateById, type InviteProject } from "@/lib/domain/invite-studio";
import { StudioTabs } from "@/components/invite/studio-tabs";
import { CardThumb, TemplateThumb } from "@/components/invite/template-thumb";
import { SharePanel } from "@/components/invite/share-panel";
import { Badge, EmptyState, Notice, PageHeader } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function InvitationsView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Dashboard />;
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Dashboard() {
  const store = useStore();
  const toast = useToast();
  const { plan, setPlan, duplicate, remove, publish, weddingId, weddingContent, cloud } = useInvites();
  const [views, setViews] = useState<Record<string, number>>({});
  const [sharing, setSharing] = useState<InviteProject | null>(null);
  const [deleting, setDeleting] = useState<InviteProject | null>(null);
  const content = useMemo(() => weddingContent(), [weddingContent]);
  const published = plan.projects.filter((p) => p.publishedAt).length;

  useEffect(() => {
    let alive = true;
    store.repo.published.list(weddingId).then(
      (rows) => alive && setViews(Object.fromEntries(rows.map((r) => [r.projectId, r.views]))),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [store, weddingId, published]);

  const makeMain = async (p: InviteProject) => {
    setPlan((prev) => ({ ...prev, mainId: p.id }));
    if (p.publishedAt) {
      try {
        await publish(p, { main: true });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't update the guest links.", "danger");
        return;
      }
    }
    toast(`Personal guest links now use “${p.name}”.`);
  };

  const sorted = [...plan.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="EverAfter Studio"
        title="My invitations"
        lead="Design an animated envelope invitation, publish it to its own link, and collect replies in one place."
        actions={<Link href="/invitations/new" className="wos-btn wos-btn--primary"><Plus className="wos-icon" aria-hidden="true" />New invitation</Link>}
      />
      <StudioTabs />

      {!cloud && (
        <Notice tone="info" icon={<Smartphone className="wos-icon" aria-hidden="true" />} title="You're planning on this device only">
          Published links open on this browser so you can try the whole flow. Sign in with a cloud account to share them with guests.
        </Notice>
      )}

      {sorted.length === 0 ? (
        <>
          <EmptyState title="No invitations yet" action={<Link href="/invitations/new" className="wos-btn wos-btn--primary"><Sparkles className="wos-icon" aria-hidden="true" />Create your first invitation</Link>}>
            Pick a template below — your names, date and venue are filled in from your wedding details.
          </EmptyState>
          <section className="flex flex-col gap-3">
            <h2 className="wos-h2">Start from a template</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {TEMPLATES.map((t) => (
                <Link key={t.id} href={`/invitations/new?template=${t.id}`} className="wos-card !p-0 flex flex-col overflow-hidden no-underline transition-transform hover:-translate-y-0.5">
                  <TemplateThumb templateId={t.id} content={content} className="aspect-[4/5]" />
                  <span className="flex flex-col gap-0.5 p-3">
                    <strong className="text-[14px] text-ink">{t.name}</strong>
                    <span className="text-[12px] text-ink-muted">{t.mood.join(" · ")}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="invite-projects">
          {sorted.map((p) => {
            const main = plan.mainId === p.id;
            const pending = hasUnpublishedChanges(p);
            return (
              <article key={p.id} className="wos-card !p-0 flex flex-col overflow-hidden" data-testid="invite-project">
                <Link href={`/invitations/${p.id}`} aria-label={`Edit ${p.name}`}>
                  <CardThumb content={p.content} design={p.design} className="aspect-[5/4]" />
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="m-0 font-[family-name:var(--wos-serif)] text-[20px] leading-[26px] text-ink">{p.name}</h2>
                    <p className="m-0 text-[13px] text-ink-muted">{templateById(p.design.templateId).name} · edited {when(p.updatedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.publishedAt ? <Badge tone="success">Live</Badge> : <Badge>Draft</Badge>}
                    {p.publishedAt && pending && <Badge tone="warning">Changes not published</Badge>}
                    {main && <Badge tone="wine">Guest links</Badge>}
                    {p.publishedAt && <Badge plain>{views[p.id] ?? 0} {(views[p.id] ?? 0) === 1 ? "view" : "views"}</Badge>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={`/invitations/${p.id}`} className="wos-btn wos-btn--primary wos-btn--sm"><Pencil className="wos-icon" aria-hidden="true" />Edit</Link>
                    <Link href={`/invitations/${p.id}/preview`} className="wos-btn wos-btn--secondary wos-btn--sm"><Eye className="wos-icon" aria-hidden="true" />Preview</Link>
                    {p.publishedAt && p.slug && <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => setSharing(p)}><Share2 className="wos-icon" aria-hidden="true" />Share</button>}
                  </div>
                  <div className="flex flex-wrap gap-1 border-t border-line pt-2">
                    {!main && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => void makeMain(p)}><Star className="wos-icon" aria-hidden="true" />Use for guest links</button>}
                    <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => { duplicate(p); toast("Copy made."); }}><Copy className="wos-icon" aria-hidden="true" />Duplicate</button>
                    <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !text-[var(--danger)]" onClick={() => setDeleting(p)}><Trash2 className="wos-icon" aria-hidden="true" />Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="m-0 text-[14px] text-ink-muted">Want to see how it feels for guests? <Link href="/everafter" className="wos-link">Open the EverAfter showcase</Link>.</p>

      <Dialog open={Boolean(sharing)} onClose={() => setSharing(null)} title="Share your invitation" description="Anyone with this link can open the invitation and reply.">
        {sharing?.slug && <SharePanel slug={sharing.slug} content={sharing.content} />}
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const p = deleting;
          setDeleting(null);
          if (!p) return;
          try {
            await remove(p);
            toast("Invitation deleted.");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't delete it.", "danger");
          }
        }}
        title={`Delete “${deleting?.name ?? ""}”?`}
        body={deleting?.publishedAt ? "Its link stops working for guests. Replies you've already received are kept." : "This design will be removed."}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
