"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, CreditCard, FileText, Heart, ListChecks, Quote, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import { timeAgo, type ActivityEntry } from "@/lib/domain/activity";
import type { Wedding } from "@/lib/domain/types";
import { useActivity } from "@/lib/hooks/use-activity";
import { useAuth } from "@/lib/store/provider";
import { Card, Skeleton, cx } from "@/components/ui/primitives";

const KIND_ICON: Record<ActivityEntry["kind"], LucideIcon> = {
  wedding: Heart,
  people: Users,
  tasks: ListChecks,
  guests: Users,
  budgetItems: Wallet,
  vendors: Store,
  quotes: Quote,
  payments: CreditCard,
  timeline: CalendarClock,
  documents: FileText,
};

/** Bride and groom get their own colours; everyone else a neutral one. */
export function actorTone(name: string, wedding: Wedding): "bride" | "groom" | "other" {
  const first = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const n = first(name);
  if (n && n === first(wedding.brideName)) return "bride";
  if (n && n === first(wedding.groomName)) return "groom";
  return "other";
}

const TONE_CLASS = {
  bride: "bg-[color-mix(in_srgb,var(--bride)_14%,transparent)] text-[var(--bride)]",
  groom: "bg-[color-mix(in_srgb,var(--groom)_14%,transparent)] text-[var(--groom)]",
  other: "bg-champagne-100 text-champagne-700",
};

export function ActivityRow({ entry, wedding, now, first }: { entry: ActivityEntry; wedding: Wedding; now: Date; first?: boolean }) {
  const Icon = KIND_ICON[entry.kind] ?? Heart;
  const tone = actorTone(entry.actorName, wedding);
  return (
    <li className={cx("grid grid-cols-[36px_1fr] gap-3", !first && "border-t border-line pt-3")}>
      <span className={cx("relative grid size-9 place-items-center rounded-full text-[14px] font-bold", TONE_CLASS[tone])} aria-hidden="true">
        {entry.actorName.charAt(0).toUpperCase() || "?"}
        <span className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full border border-line bg-surface-raised text-ink-muted">
          <Icon style={{ width: 11, height: 11 }} />
        </span>
      </span>
      <div className="flex min-w-0 flex-col pb-3">
        <p className="m-0 text-[14px] leading-5 text-ink">
          <b className="font-semibold">{entry.actorName}</b> {entry.summary}
        </p>
        <time className="text-[12px] leading-4 font-medium text-ink-muted" dateTime={entry.at} title={new Date(entry.at).toLocaleString("en-GB")}>
          {timeAgo(entry.at, now)}
        </time>
      </div>
    </li>
  );
}

/** The current time, ticking every minute, for "5 min ago" labels. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function RecentActivityCard({ wedding }: { wedding: Wedding }) {
  const activity = useActivity(5);
  const now = useNow();
  const auth = useAuth();
  return (
    <Card title="Recent activity" action={<Link className="wos-link" href="/activity">See all</Link>} className="!gap-3">
      {activity.status === "loading" ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 40 }} />)}</div>
      ) : activity.status === "unavailable" ? (
        <p className="m-0 text-[14px] leading-5 text-ink-muted">The activity feed isn&apos;t set up in the database yet.</p>
      ) : activity.entries.length === 0 ? (
        <p className="m-0 text-[14px] leading-5 text-ink-muted">
          {auth.mode === "cloud" ? "When you or your family change something, it shows up here." : "Your changes will show up here. Share the plan in cloud mode to see what your partner does too."}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {activity.entries.map((e, i) => <ActivityRow key={e.id} entry={e} wedding={wedding} now={now} first={i === 0} />)}
        </ul>
      )}
    </Card>
  );
}
