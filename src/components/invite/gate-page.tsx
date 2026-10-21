"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarPlus, MapPin, RotateCcw } from "lucide-react";
import { countdown } from "@/lib/domain/digital-invite";
import { formatDate, formatLongDate, formatTime } from "@/lib/domain/dates";
import { googleCalendarUrl, mapLink, startInstant } from "@/lib/domain/invite-links";
import type { InviteContent, InviteDesign, StoryIcon } from "@/lib/domain/invite-studio";
import { ActionBar, RsvpForm, saveCalendarFile, useNow, type RsvpHandler } from "./invitation-page";
import { CornerScroll, Crest, DressFigures, MiniEnvelope, SideColumn, Sketch, sketchFor, type GateIds, type GateTints, type SketchName } from "./gate-art";

const STORY_SKETCH: Record<StoryIcon, SketchName> = { meet: "cups", adventure: "plane", question: "ringbox", wedding: "bouquet", heart: "heart", home: "home" };

function Rise({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.section className={className} initial={reduce ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.section>
  );
}

function Message({ content, ids, t }: { content: InviteContent; ids: GateIds; t: GateTints }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.section className="mx-section mx-message" onViewportEnter={() => setTimeout(() => setOpen(true), 500)} viewport={{ once: true, amount: 0.6 }}>
      <button type="button" className="mx-env-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close the message" : "Open the message"}>
        <MiniEnvelope ids={ids} t={t} open={open} />
      </button>
      <p className="mx-caps">There is a message for you</p>
      <motion.div className="mx-message-body" initial={false} animate={{ opacity: open ? 1 : 0.0, y: open ? 0 : 12 }} transition={{ duration: 0.8 }}>
        <h2 className="mx-script mx-script--md">You are invited to our wedding</h2>
        {content.blessing && <p className="mx-caps mx-soft">{content.blessing}</p>}
        <p className="mx-body mx-pre">{content.inviteMessage}</p>
      </motion.div>
    </motion.section>
  );
}

function Count({ content, ids, t }: { content: InviteContent; ids: GateIds; t: GateTints }) {
  const now = useNow(1000);
  const target = useMemo(() => startInstant(content), [content]);
  const c = now ? countdown(target, now) : null;
  return (
    <Rise className="mx-section mx-count">
      <SideColumn ids={ids} t={t} className="mx-col mx-col--l" />
      <SideColumn ids={ids} t={t} className="mx-col mx-col--r" flip />
      <h2 className="mx-script">Countdown</h2>
      <p className="mx-small">The big day is getting closer</p>
      {c && !c.done ? (
        <div className="mx-count-row" role="timer" aria-label={`${c.days} days, ${c.hours} hours and ${c.minutes} minutes to go`}>
          {([[c.days, "Days"], [c.hours, "Hours"], [c.minutes, "Minutes"]] as [number, string][]).map(([n, l]) => (
            <div key={l}><span className="mx-num">{n}</span><span className="mx-caps mx-tiny">{l}</span></div>
          ))}
        </div>
      ) : (
        <p className="mx-body">{c?.done ? "Today is the day!" : " "}</p>
      )}
      <p className="mx-body mx-italic">Let&apos;s celebrate the beginning of the loveliest chapter of our story.</p>
    </Rise>
  );
}

function Story({ content }: { content: InviteContent }) {
  const chapters = content.story.filter((x) => x.title.trim() || x.text.trim());
  if (!chapters.length) return null;
  return (
    <section className="mx-section">
      <Rise>
        <h2 className="mx-script">Our Story</h2>
        <p className="mx-small">A love story in a few short chapters</p>
      </Rise>
      <ol className="mx-story">
        {chapters.map((ch, i) => (
          <Rise key={i} className={`mx-chapter${i % 2 ? " mx-chapter--alt" : ""}`} delay={80}>
            <Sketch name={STORY_SKETCH[ch.icon] ?? "heart"} className="mx-sketch" />
            <div>
              <h3 className="mx-script mx-script--sm">{ch.title}</h3>
              <p className="mx-body mx-pre">{ch.text}</p>
            </div>
          </Rise>
        ))}
      </ol>
    </section>
  );
}

function Day({ content, design }: { content: InviteContent; design: InviteDesign }) {
  const fromPlan = design.showDayPlan ? content.moments.filter((m) => m.title.trim()) : [];
  const items = fromPlan.length
    ? fromPlan
    : [
        content.ceremonyTitle && { time: content.ceremonyTime, title: content.ceremonyTitle },
        content.receptionTitle && { time: content.receptionTime, title: content.receptionTitle },
      ].filter((x): x is { time: string; title: string } => Boolean(x));
  if (!items.length) return null;
  return (
    <section className="mx-section">
      <Rise>
        <p className="mx-caps mx-soft">Join us for</p>
        <h2 className="mx-script">Our Wedding Day</h2>
        <p className="mx-small">{formatLongDate(content.date)}{content.venueName ? ` · ${content.venueName}` : ""}</p>
      </Rise>
      <ol className="mx-day">
        {items.map((m, i) => (
          <Rise key={`${m.time}-${i}`} className={`mx-day-item${i % 2 ? " mx-day-item--alt" : ""}`} delay={60}>
            <Sketch name={sketchFor(m.title)} className="mx-sketch" />
            <div>
              <h3 className="mx-script mx-script--sm">{m.title}</h3>
              {m.time && <p className="mx-caps mx-tiny">{formatTime(m.time)}</p>}
            </div>
          </Rise>
        ))}
      </ol>
    </section>
  );
}

function Details({ content, ids, t }: { content: InviteContent; ids: GateIds; t: GateTints }) {
  const map = mapLink(content);
  const ceremonyPlace = content.ceremonyVenue || content.venueName;
  const receptionPlace = content.receptionVenue || content.venueName;
  return (
    <Rise className="mx-section mx-frame-wrap">
      <div className="mx-frame">
        <Crest ids={ids} t={t} className="mx-crest" />
        <CornerScroll ids={ids} t={t} className="mx-corner mx-corner--tl" />
        <CornerScroll ids={ids} t={t} className="mx-corner mx-corner--tr" fx />
        <CornerScroll ids={ids} t={t} className="mx-corner mx-corner--bl" fy />
        <CornerScroll ids={ids} t={t} className="mx-corner mx-corner--br" fx fy />
        <p className="mx-caps mx-soft">Join us to celebrate</p>
        <h2 className="mx-script">Event Details</h2>
        <p className="mx-body">{formatLongDate(content.date)}</p>
        {content.ceremonyTitle && (
          <>
            <p className="mx-caps">{content.ceremonyTitle}{content.ceremonyTime ? ` at ${formatTime(content.ceremonyTime)}` : ""}</p>
            {ceremonyPlace && <p className="mx-script mx-script--sm">{ceremonyPlace}</p>}
          </>
        )}
        {content.address && <p className="mx-small">{content.address}</p>}
        <div className="mx-pills">
          {map && <a className="mx-pill" href={map} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />Open in Google Maps</a>}
          <a className="mx-pill" href={googleCalendarUrl(content)} target="_blank" rel="noopener noreferrer"><CalendarPlus aria-hidden="true" />Add to Google Calendar</a>
          <button type="button" className="mx-pill" onClick={() => saveCalendarFile(content)}><CalendarPlus aria-hidden="true" />Apple / Outlook</button>
        </div>
        {content.receptionTitle && (
          <>
            <span className="mx-rule" aria-hidden="true" />
            <p className="mx-caps">{content.receptionTitle}{content.receptionTime ? ` at ${formatTime(content.receptionTime)}` : ""}</p>
            {receptionPlace && <p className="mx-script mx-script--sm">{receptionPlace}</p>}
          </>
        )}
      </div>
    </Rise>
  );
}

export function GatePage({ content, design, ids, t, rsvp, shareUrl, onReplay, startOpen }: {
  content: InviteContent;
  design: InviteDesign;
  ids: GateIds;
  t: GateTints;
  rsvp?: RsvpHandler;
  shareUrl?: string;
  onReplay: () => void;
  startOpen?: boolean;
}) {
  const rsvpRef = useRef<HTMLDivElement>(null);
  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const photo = design.photo.src && (design.photo.placement === "reveal" || design.photo.placement === "both") ? design.photo.src : null;
  return (
    <article className="mx-page">
      <Message content={content} ids={ids} t={t} />
      {design.showCountdown && <Count content={content} ids={ids} t={t} />}
      {photo && (
        <Rise className="mx-section">
          <div className="mx-photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- user photo stored as a data URL */}
            <img src={photo} alt={`${content.brideName} and ${content.groomName}`} style={{ objectPosition: `${design.photo.x}% ${design.photo.y}%` }} />
          </div>
        </Rise>
      )}
      <Story content={content} />
      <Day content={content} design={design} />
      <Details content={content} ids={ids} t={t} />
      {content.dressCode && (
        <Rise className="mx-section">
          <h2 className="mx-script">Dress Code</h2>
          <p className="mx-body">{content.dressCode}</p>
          <DressFigures className="mx-figures" />
        </Rise>
      )}
      <div ref={rsvpRef} id="rsvp">
        <Rise className="mx-section mx-rsvp">
          <h2 className="mx-script">Kindly Reply</h2>
          {content.rsvpDeadline && <p className="mx-caps mx-soft">Please reply by {formatDate(content.rsvpDeadline)}</p>}
          <RsvpForm content={content} rsvp={rsvp ?? { submit: async () => null }} />
        </Rise>
      </div>
      {content.contacts && (
        <Rise className="mx-section">
          <p className="mx-caps mx-soft">Questions?</p>
          <p className="mx-body mx-pre">{content.contacts}</p>
        </Rise>
      )}
      <Rise className="mx-section mx-closing">
        <p className="mx-body mx-italic">{design.closingMessage}</p>
        <p className="mx-script mx-script--lg">{content.brideName} &amp; {content.groomName}</p>
        {!startOpen && <button type="button" className="ea-link" onClick={onReplay}><RotateCcw aria-hidden="true" className="ea-ico" /> Watch the opening again</button>}
        <p className="ea-made">Made with EverAfter Studio</p>
      </Rise>
      <ActionBar content={content} shareUrl={url} onRsvp={() => rsvpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    </article>
  );
}
