"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useActivity } from "@/lib/hooks/use-activity";
import { useAuth } from "@/lib/store/provider";
import { formatLongDate } from "@/lib/domain/dates";
import type { ActivityEntry } from "@/lib/domain/activity";
import { EmptyState, Notice, PageHeader, Skeleton } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { ActivityRow, useNow } from "@/components/features/activity-feed";

const LIMIT = 200;

/** Local calendar day of a timestamp, for grouping. */
function dayKey(at: string): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ActivityView() {
  const page = usePage();
  const activity = useActivity(LIMIT);
  const auth = useAuth();
  const now = useNow();
  const [who, setWho] = useState<string | null>(null);
  if (!page) return <PageSkeleton />;
  const { data, today } = page;

  const entries = activity.status === "ready" ? activity.entries : [];
  const people = [...new Set(entries.map((e) => e.actorName))];
  const shown = who ? entries.filter((e) => e.actorName === who) : entries;
  const days = new Map<string, ActivityEntry[]>();
  for (const e of shown) days.set(dayKey(e.at), [...(days.get(dayKey(e.at)) ?? []), e]);

  return (
    <>
      <PageHeader
        overline="Records"
        title="Activity"
        lead={auth.mode === "cloud" ? "Everything you, your partner and your family have done in the plan — newest first." : "Everything that's changed in your plan on this device — newest first."}
      />

      {activity.status === "loading" ? (
        <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 56 }} />)}</div>
      ) : activity.status === "unavailable" ? (
        <Notice tone="warning" icon={<AlertTriangle className="wos-icon" />} title="The activity feed isn't set up in the database yet.">
          Run <code>supabase/migrations/20261010000000_activity.sql</code> in the Supabase SQL Editor once, then reload this page.
        </Notice>
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing here yet">Tick off a task, add a guest or record a payment — it&apos;ll show up here, with who did it and when.</EmptyState>
      ) : (
        <>
          {people.length > 1 && (
            <div className="wos-tabs flex-wrap" role="tablist" aria-label="Filter by person">
              <button type="button" role="tab" className="wos-tab" aria-selected={who === null} onClick={() => setWho(null)}>Everyone <span>{entries.length}</span></button>
              {people.map((p) => (
                <button key={p} type="button" role="tab" className="wos-tab" aria-selected={who === p} onClick={() => setWho(p)}>
                  {p} <span>{entries.filter((e) => e.actorName === p).length}</span>
                </button>
              ))}
            </div>
          )}
          {[...days].map(([day, list]) => (
            <section key={day} className="wos-card flex flex-col gap-3" aria-label={formatLongDate(day)}>
              <h2 className="wos-overline m-0">{day === today ? "Today" : formatLongDate(day)}</h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {list.map((e, i) => <ActivityRow key={e.id} entry={e} wedding={data.wedding} now={now} first={i === 0} />)}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}
