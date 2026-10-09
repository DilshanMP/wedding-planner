"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown, X } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { WeddingGate } from "@/components/shell/wedding-gate";
import { endTime, sortTimeline } from "@/lib/domain/day";
import { formatLongDate, formatTime, minutesToTime, timeToMinutes } from "@/lib/domain/dates";
import { SCENE_COPY, SCENE_LABEL } from "@/lib/domain/scenes";
import { guestMetrics } from "@/lib/domain/guests";
import { summarizeBudget } from "@/lib/domain/budget";
import { computeReadiness } from "@/lib/domain/readiness";
import { formatLKR } from "@/lib/domain/money";
import type { TimelineEvent, WeddingData } from "@/lib/domain/types";
import { JasmineMark, LotusMark, Skeleton } from "@/components/ui/primitives";
import { PoruwaScene } from "@/components/features/poruwa-scene";
import { loadStudio } from "@/lib/studio";

/**
 * "Experience your wedding": the planned day as a sequence of scenes,
 * moved by scroll. Cross-fades and slow parallax, never autoplay.
 */
export function SimulatorView() {
  return (
    <WeddingGate>
      <Simulator />
    </WeddingGate>
  );
}

function Simulator() {
  const page = usePage();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  if (!page) return <div className="mx-auto max-w-[720px] p-6"><Skeleton style={{ height: 320 }} /></div>;
  const { data } = page;
  const events = sortTimeline(data.timeline).filter((e) => e.scene !== "other" || e.description);

  return (
    <div className="bg-surface text-ink">
      <motion.div className="fixed inset-x-0 top-0 z-20 h-[3px] origin-left bg-wine-600" style={{ scaleX: progress }} aria-hidden="true" />
      <Link href="/timeline" className="wos-iconbtn fixed top-4 right-4 z-20" aria-label="Close simulator"><X className="wos-icon" aria-hidden="true" /></Link>

      <Scene evening={false}>
        <div className="flex flex-col items-center gap-6 text-center">
          <LotusMark className="size-16 text-champagne-700" />
          <span className="wos-overline">Experience your wedding</span>
          <h1 className="m-0 font-display text-[44px] leading-[48px] font-normal md:text-[64px] md:leading-[68px] tracking-[-0.01em]">
            {data.wedding.brideName} &amp; {data.wedding.groomName}
          </h1>
          <p className="m-0 text-[16px] leading-[26px] text-ink-muted">{formatLongDate(data.wedding.weddingDate)}{data.wedding.venue ? ` · ${data.wedding.venue}` : ""}{data.wedding.location ? `, ${data.wedding.location}` : ""}</p>
          {events.length === 0 ? (
            <Link href="/timeline?new=1" className="wos-btn wos-btn--primary">Add Your First Moment</Link>
          ) : (
            <>
              <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-ink-muted">Scroll to walk through the day <ArrowDown className="wos-icon" aria-hidden="true" /></span>
              <Link href="/studio" className="wos-btn wos-btn--secondary">Open Poruwa Studio</Link>
            </>
          )}
        </div>
      </Scene>

      {events.map((e, i) => (
        <EventScene key={e.id} event={e} index={i} total={events.length} data={data} />
      ))}

      {events.length > 0 && <Finale data={data} />}
    </div>
  );
}

function Scene({ children, evening, label }: { children: ReactNode; evening: boolean; label?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [48, -48]);
  return (
    <section ref={ref} aria-label={label} data-theme={evening ? "evening" : undefined} className="sim-scene bg-surface px-6 text-ink" style={{ transition: "background var(--dur-cinematic) var(--ease-silk)" }}>
      <motion.div className="mx-auto w-full max-w-[760px] py-16" style={reduce ? undefined : { opacity, y }}>
        {children}
      </motion.div>
    </section>
  );
}

function EventScene({ event, index, total, data }: { event: TimelineEvent; index: number; total: number; data: WeddingData }) {
  const start = timeToMinutes(event.time);
  const evening = start >= 18 * 60 || start < 5 * 60;
  const vendors = data.vendors.filter((v) => event.vendorIds.includes(v.id));
  const owner = data.people.find((p) => p.id === event.ownerId);
  const copy = event.description && event.scene === "other" ? event.description : SCENE_COPY[event.scene];
  const gm = guestMetrics(data.guests, data.wedding);
  const Mark = event.scene === "preparation" || event.scene === "bride" ? JasmineMark : null;
  return (
    <Scene evening={evening} label={`${formatTime(event.time)}, ${event.title}`}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="wos-overline">Scene {index + 1} of {total} · {SCENE_LABEL[event.scene]}</span>
        </div>
        <span className="wos-num font-display text-[56px] leading-[56px] font-light text-champagne-700 md:text-[72px] md:leading-[72px]">{formatTime(event.time)}</span>
        <h2 className="m-0 font-display text-[40px] leading-[44px] font-normal md:text-[56px] md:leading-[60px]">{event.title}</h2>
        {copy && <p className="m-0 max-w-[600px] text-[17px] leading-[28px] text-ink-muted">{copy}</p>}
        {event.description && event.scene !== "other" && <p className="m-0 max-w-[600px] text-[15px] leading-6">{event.description}</p>}
        <dl className="m-0 mt-2 grid max-w-[600px] grid-cols-2 gap-4 border-t border-line pt-5 text-[14px] sm:grid-cols-3">
          {event.location && <Fact label="Where" value={event.location} />}
          <Fact label="Until" value={formatTime(minutesToTime(endTime(event)))} />
          {owner && <Fact label="Led by" value={owner.name} />}
          {(event.scene === "arrival" || event.scene === "reception" || event.scene === "dinner") && <Fact label="Guests" value={`About ${gm.expectedAttendance}`} />}
          {vendors.length > 0 && <Fact label="With" value={vendors.map((v) => v.name).join(", ")} />}
        </dl>
        {Mark && <Mark className="mt-4 size-12 text-champagne-700" />}
        {event.scene === "poruwa" && <PoruwaMoment weddingId={data.wedding.id} />}
      </div>
    </Scene>
  );
}

/** The couple on the Poruwa, dressed as they chose in Poruwa Studio. */
function PoruwaMoment({ weddingId }: { weddingId: string }) {
  const [studio] = useState(() => loadStudio(weddingId));
  return (
    <figure className="m-0 mt-4 flex flex-col gap-2">
      <div className="overflow-hidden rounded-[24px] border border-line">
        <PoruwaScene look={studio.look} theme={studio.theme} animated={studio.animated} className="block h-auto w-full" />
      </div>
      <figcaption className="text-[14px] text-ink-muted">
        <Link href="/studio" className="wos-link">Dress the scene and add your photos in Poruwa Studio</Link>
      </figcaption>
    </figure>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="wos-overline !text-ink-muted">{label}</dt>
      <dd className="m-0 font-semibold">{value}</dd>
    </div>
  );
}

function Finale({ data }: { data: WeddingData }) {
  const budget = summarizeBudget(data.wedding, data.budgetItems, data.payments);
  const readiness = computeReadiness(data);
  const weakest = [...readiness.components].sort((a, b) => a.score - b.score)[0];
  return (
    <Scene evening label="After the day">
      <div className="flex flex-col items-center gap-6 text-center">
        <LotusMark className="size-14 text-champagne-700" />
        <h2 className="m-0 font-display text-[44px] leading-[48px] font-normal md:text-[56px] md:leading-[60px]">That&apos;s your day.</h2>
        <p className="m-0 max-w-[520px] text-[16px] leading-[26px] text-ink-muted">
          {readiness.overall}% ready, with a projected investment of {formatLKR(budget.forecast)}. The area that needs you most is {weakest.label.toLowerCase()} — {weakest.explanation.charAt(0).toLowerCase() + weakest.explanation.slice(1)}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={weakest.href} className="wos-btn wos-btn--primary">Work on {weakest.label}</Link>
          <Link href="/timeline" className="wos-btn wos-btn--secondary">Edit the Timeline</Link>
        </div>
      </div>
    </Scene>
  );
}
