"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Armchair, CalendarClock, ImagePlus, ListChecks, Mail, Palette, Sparkles, UtensilsCrossed, Users, Wallet, type LucideIcon } from "lucide-react";
import { formatLongDate, formatTime, greeting } from "@/lib/domain/dates";
import { formatLKR, percent } from "@/lib/domain/money";
import { menuProgress, seatsUsed } from "@/lib/domain/planner";
import type { TimelineEvent, WeddingData } from "@/lib/domain/types";
import { useFileUrl } from "@/lib/hooks/use-file-url";
import { Ring, cx } from "@/components/ui/primitives";

/** The home banner: your venue photo (or your colours), names and the countdown. */
export function PhotoHero({ data, daysLeft, keyMoments, lead, readiness, onReadiness }: {
  data: WeddingData;
  today: string;
  daysLeft: number;
  keyMoments: TimelineEvent[];
  lead: string;
  readiness: number;
  onReadiness: () => void;
}) {
  const { wedding, planner } = data;
  const photo = useFileUrl(planner.theme.heroDocumentId);
  return (
    <section aria-label="Your wedding" className="home-hero wos-reveal">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- private, signed URLs; next/image can't optimise them
        <img src={photo} alt="" className="home-hero__photo" />
      ) : (
        <div className="home-hero__pattern" aria-hidden="true" />
      )}
      <div className="home-hero__shade" aria-hidden="true" />
      <div className="home-hero__body">
        <div className="flex flex-col gap-2">
          <span className="home-hero__overline">{greeting()} · {formatLongDate(wedding.weddingDate)}</span>
          <h1 className="m-0 font-display text-[40px] leading-[44px] font-medium md:text-[60px] md:leading-[62px]">
            {wedding.brideName} <span className="font-light italic opacity-90">&amp;</span> {wedding.groomName}
          </h1>
          <p className="m-0 text-[15px] leading-6 opacity-90">{wedding.venue || wedding.location ? [wedding.venue, wedding.location].filter(Boolean).join(", ") : "Add your venue in Settings"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {keyMoments.map((e) => (
              <span key={e.id} className="home-hero__chip">
                {e.scene === "going_away" ? "Going-away" : e.scene === "poruwa" ? "Poruwa" : "Reception"} <b className="wos-num">{formatTime(e.time)}</b>
              </span>
            ))}
            <span className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-1" title={planner.theme.name}>
              {planner.theme.colors.slice(0, 4).map((c) => <i key={c} className="block size-4 rounded-full border border-white/70" style={{ background: c }} />)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-3">
            {daysLeft > 0 ? (
              <>
                <span className="wos-num font-display text-[84px] leading-[72px] font-light md:text-[112px] md:leading-[96px]">{daysLeft}</span>
                <span className="pb-2 font-display text-[24px] leading-7 md:text-[30px]">{daysLeft === 1 ? "day to go" : "days to go"}</span>
              </>
            ) : (
              <span className="font-display text-[40px] leading-[44px]">{daysLeft === 0 ? "Today is the day." : `Married ${-daysLeft} days ago`}</span>
            )}
          </div>
          <button type="button" onClick={onReadiness} className="home-hero__ring" aria-label={`Wedding readiness ${readiness} percent. Show how it's calculated`}>
            <Ring value={readiness} size={104} />
          </button>
        </div>
        <p className="m-0 max-w-[560px] text-[15px] leading-6 opacity-90">{lead}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/design" className="home-hero__btn"><ImagePlus className="wos-icon" aria-hidden="true" />{photo ? "Change photo & colours" : "Add your venue photo & colours"}</Link>
        </div>
      </div>
    </section>
  );
}

interface Tile {
  href: string;
  title: string;
  icon: LucideIcon;
  value: ReactNode;
  detail: string;
  /** 0–100, or null when there's nothing to measure yet. */
  progress: number | null;
}

export function PlanTiles({ data, m }: {
  data: WeddingData;
  m: { budget: { committed: number; committedPct: number; original: number }; guests: { confirmed: number; total: number; expectedAttendance: number; rsvpCompletion: number }; tasks: { completed: number; total: number; overdue: number; completionPct: number } };
}) {
  const { planner } = data;
  const menu = menuProgress(planner.menu);
  const partySize = (id: string) => {
    const g = data.guests.find((x) => x.id === id);
    return g ? g.adults + g.children : 0;
  };
  const seated = planner.seating.tables.reduce((n, t) => n + seatsUsed(t, partySize), 0);
  const people = data.guests.reduce((n, g) => n + g.adults + g.children, 0);
  const st = planner.stationery.text;
  const cardFields = [st.brideFull, st.groomFull, st.dateLine, st.venueLine, st.hosts.includes("___") ? "" : st.hosts];
  const cardDone = cardFields.filter((f) => f.trim()).length;
  const photos = planner.vision.items.length;
  const outfitsDone = planner.vision.outfits.filter((o) => o.done).length;
  const dayMoments = data.timeline.length;

  const tiles: Tile[] = [
    { href: "/tasks", title: "Checklist", icon: ListChecks, value: `${m.tasks.completed} / ${m.tasks.total}`, detail: m.tasks.overdue ? `${m.tasks.overdue} overdue` : "Nothing overdue", progress: m.tasks.completionPct },
    { href: "/budget", title: "Budget", icon: Wallet, value: formatLKR(m.budget.committed), detail: `${m.budget.committedPct}% of ${formatLKR(m.budget.original)} committed`, progress: m.budget.committedPct },
    { href: "/guests", title: "Guests", icon: Users, value: `${m.guests.confirmed} / ${m.guests.total}`, detail: `Expect about ${m.guests.expectedAttendance}`, progress: m.guests.rsvpCompletion },
    { href: "/menu", title: "Menu", icon: UtensilsCrossed, value: planner.menu.menuName || "Not started", detail: menu.total ? (menu.open.length ? `${menu.done} of ${menu.total} courses chosen` : planner.menu.finalizedAt ? "Final" : "All chosen — mark it final") : "Pick your venue's menu", progress: menu.total ? percent(menu.done, menu.total) : null },
    { href: "/tables", title: "Tables", icon: Armchair, value: planner.seating.tables.length ? `${planner.seating.tables.length} tables` : "Not started", detail: planner.seating.tables.length ? `${seated} of ${people} seated` : "Lay out the hall", progress: planner.seating.tables.length && people ? percent(Math.min(seated, people), people) : null },
    { href: "/design", title: "Our look", icon: Palette, value: planner.theme.name || "Colours", detail: `${photos} inspiration photo${photos === 1 ? "" : "s"} · ${outfitsDone}/${planner.vision.outfits.length} outfits`, progress: planner.vision.outfits.length ? percent(outfitsDone, planner.vision.outfits.length) : null },
    { href: "/cards", title: "Cards & boxes", icon: Mail, value: cardDone === cardFields.length ? "Ready to print" : "Draft", detail: `${cardDone} of ${cardFields.length} details filled`, progress: percent(cardDone, cardFields.length) },
    { href: "/timeline", title: "Day plan", icon: CalendarClock, value: `${dayMoments} moments`, detail: dayMoments ? "Walk through it in the simulator" : "Add your evening schedule", progress: null },
    { href: "/simulator", title: "Simulator", icon: Sparkles, value: "See your day", detail: "Scene by scene, with your photos", progress: null },
  ];

  return (
    <section aria-labelledby="h-tiles" className="flex flex-col gap-3">
      <h2 id="h-tiles" className="wos-h2">Your plan at a glance</h2>
      <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="plan-tile">
              <span className="flex items-center justify-between">
                <span className="text-[13px] leading-[18px] font-bold tracking-[.08em] text-ink-muted uppercase">{t.title}</span>
                <span className="grid size-9 place-items-center rounded-xl bg-wine-50 text-wine-600"><t.icon className="wos-icon" aria-hidden="true" /></span>
              </span>
              <span className="truncate font-display text-[26px] leading-8 font-medium">{t.value}</span>
              <span className={cx("text-[13px] leading-[18px] font-medium", t.detail.includes("overdue") && !t.detail.startsWith("Nothing") ? "text-danger" : "text-ink-muted")}>{t.detail}</span>
              {t.progress !== null && (
                <span className="plan-tile__bar" aria-hidden="true"><i style={{ width: `${Math.max(3, t.progress)}%` }} /></span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
