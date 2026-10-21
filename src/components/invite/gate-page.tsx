"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarPlus, MapPin, RotateCcw } from "lucide-react";
import { countdown } from "@/lib/domain/digital-invite";
import { googleCalendarUrl, mapLink, startInstant } from "@/lib/domain/invite-links";
import { clock, localise, longDate, words, type InviteWords } from "@/lib/domain/invite-i18n";
import type { GuestLanguage, InviteContent, InviteDesign, StoryIcon } from "@/lib/domain/invite-studio";
import { ActionBar, RsvpForm, saveCalendarFile, useNow, type RsvpHandler } from "./invitation-page";
import { DressFigures, Sketch, sketchFor, type GateIds, type GateTints, type SketchName } from "./gate-art";

const ART = "/everafter/gate";
const STORY_SKETCH: Record<StoryIcon, SketchName> = { meet: "cups", adventure: "plane", question: "ringbox", wedding: "bouquet", heart: "heart", home: "home" };

function Rise({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.section className={className} initial={reduce ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.section>
  );
}

/** The couple in carved plaster — he in a full suit, she in a Kandyan osariya. */
function Couple({ content, w }: { content: InviteContent; w: InviteWords }) {
  const reduce = useReducedMotion();
  return (
    <section className="mx-section mx-couple">
      <motion.div className="mx-couple-art" initial={reduce ? false : { opacity: 0, scale: 0.94, y: 40 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
        <img src={`${ART}/couple.webp`} alt={`${content.brideName} and ${content.groomName}`} loading="lazy" />
        <div className="mx-tint" aria-hidden="true" />
        <span className="mx-couple-shine" aria-hidden="true" />
      </motion.div>
      <p className="mx-caps mx-soft">{w.ourCouple}</p>
      <h2 className="mx-script mx-script--lg mx-names">{content.brideName} &amp; {content.groomName}</h2>
    </section>
  );
}

function Message({ content, w }: { content: InviteContent; w: InviteWords }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.section className="mx-section mx-message" onViewportEnter={() => setTimeout(() => setOpen(true), 400)} viewport={{ once: true, amount: 0.5 }}>
      <button type="button" className={`mx-env${open ? " is-open" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? w.closeMessage : w.openMessage}>
        <span className="mx-env-letter" aria-hidden="true"><span>♡</span></span>
        {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
        <img src={`${ART}/envelope.webp`} alt="" className="mx-env-img" loading="lazy" />
      </button>
      <p className="mx-caps">{w.messageForYou}</p>
      <motion.div className="mx-message-body" initial={false} animate={{ opacity: open ? 1 : 0, y: open ? 0 : 12 }} transition={{ duration: 0.8 }}>
        <h2 className="mx-script mx-script--md">{w.invitedTitle}</h2>
        {content.blessing && <p className="mx-caps mx-soft">{content.blessing}</p>}
        <p className="mx-body mx-pre">{content.inviteMessage}</p>
      </motion.div>
    </motion.section>
  );
}

function Column({ side }: { side: "l" | "r" }) {
  // eslint-disable-next-line @next/next/no-img-element -- static art
  return <img src={`${ART}/column.webp`} alt="" aria-hidden="true" className={`mx-col mx-col--${side}`} loading="lazy" />;
}

function Count({ content, w }: { content: InviteContent; w: InviteWords }) {
  const now = useNow(1000);
  const target = useMemo(() => startInstant(content), [content]);
  const c = now ? countdown(target, now) : null;
  return (
    <Rise className="mx-section mx-count">
      <Column side="l" />
      <Column side="r" />
      <h2 className="mx-script">{w.countdown}</h2>
      <p className="mx-small">{w.countdownSub}</p>
      {c && !c.done ? (
        <div className="mx-count-row" role="timer" aria-label={`${c.days} ${w.days}, ${c.hours} ${w.hours}, ${c.minutes} ${w.minutes}`}>
          {([[c.days, w.days], [c.hours, w.hours], [c.minutes, w.minutes]] as [number, string][]).map(([n, l]) => (
            <div key={l}><span className="mx-num">{n}</span><span className="mx-caps mx-tiny">{l}</span></div>
          ))}
        </div>
      ) : (
        <p className="mx-body">{c?.done ? w.today : " "}</p>
      )}
      <p className="mx-body mx-italic">{w.celebrateLine}</p>
    </Rise>
  );
}

function Story({ content, w }: { content: InviteContent; w: InviteWords }) {
  const chapters = content.story.filter((x) => x.title.trim() || x.text.trim());
  if (!chapters.length) return null;
  return (
    <section className="mx-section">
      <Rise>
        <h2 className="mx-script">{w.ourStory}</h2>
        <p className="mx-small">{w.storySub}</p>
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

function Day({ content, design, w, lang }: { content: InviteContent; design: InviteDesign; w: InviteWords; lang: GuestLanguage }) {
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
        <p className="mx-caps mx-soft">{w.joinUsFor}</p>
        <h2 className="mx-script">{w.weddingDay}</h2>
        <p className="mx-small">{longDate(content.date, lang)}{content.venueName ? ` · ${content.venueName}` : ""}</p>
      </Rise>
      <ol className="mx-day">
        {items.map((m, i) => (
          <Rise key={`${m.time}-${i}`} className={`mx-day-item${i % 2 ? " mx-day-item--alt" : ""}`} delay={60}>
            <Sketch name={sketchFor(m.title)} className="mx-sketch" />
            <div>
              <h3 className="mx-script mx-script--sm">{m.title}</h3>
              {m.time && <p className="mx-caps mx-tiny">{clock(m.time, lang)}</p>}
            </div>
          </Rise>
        ))}
      </ol>
    </section>
  );
}

function Details({ content, w, lang }: { content: InviteContent; w: InviteWords; lang: GuestLanguage }) {
  const map = mapLink(content);
  const ceremonyPlace = content.ceremonyVenue || content.venueName;
  const receptionPlace = content.receptionVenue || content.venueName;
  return (
    <Rise className="mx-section">
      <div className="mx-frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
        <img src={`${ART}/frame.webp`} alt="" aria-hidden="true" className="mx-frame-img" loading="lazy" />
        <div className="mx-frame-body">
          <p className="mx-caps mx-soft">{w.joinToCelebrate}</p>
          <h2 className="mx-script mx-script--md">{w.eventDetails}</h2>
          <p className="mx-body">{longDate(content.date, lang)}</p>
          {content.ceremonyTitle && (
            <>
              <p className="mx-caps">{w.at(content.ceremonyTitle, content.ceremonyTime ? clock(content.ceremonyTime, lang) : "")}</p>
              {ceremonyPlace && <p className="mx-script mx-script--sm">{ceremonyPlace}</p>}
            </>
          )}
          {content.receptionTitle && (
            <>
              <span className="mx-rule" aria-hidden="true" />
              <p className="mx-caps">{w.at(content.receptionTitle, content.receptionTime ? clock(content.receptionTime, lang) : "")}</p>
              {receptionPlace && <p className="mx-script mx-script--sm">{receptionPlace}</p>}
            </>
          )}
        </div>
      </div>
      {content.address && <p className="mx-small">{content.address}</p>}
      <div className="mx-pills">
        {map && <a className="mx-pill" href={map} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />{w.openMaps}</a>}
        <a className="mx-pill" href={googleCalendarUrl(content)} target="_blank" rel="noopener noreferrer"><CalendarPlus aria-hidden="true" />{w.addCalendar}</a>
        <button type="button" className="mx-pill" onClick={() => saveCalendarFile(content)}><CalendarPlus aria-hidden="true" />{w.appleOutlook}</button>
      </div>
    </Rise>
  );
}

export function GatePage({ content: raw, design, rsvp, shareUrl, onReplay, startOpen, lang }: {
  content: InviteContent;
  design: InviteDesign;
  ids: GateIds;
  t: GateTints;
  lang: GuestLanguage;
  rsvp?: RsvpHandler;
  shareUrl?: string;
  onReplay: () => void;
  startOpen?: boolean;
}) {
  const w = words(lang);
  const { content, closing } = localise(raw, design.closingMessage, lang);
  const rsvpRef = useRef<HTMLDivElement>(null);
  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const photo = design.photo.src && (design.photo.placement === "reveal" || design.photo.placement === "both") ? design.photo.src : null;
  return (
    <article className="mx-page">
      <Couple content={content} w={w} />
      <Message content={content} w={w} />
      {design.showCountdown && <Count content={content} w={w} />}
      {photo && (
        <Rise className="mx-section">
          <div className="mx-photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- user photo stored as a data URL */}
            <img src={photo} alt={`${content.brideName} and ${content.groomName}`} style={{ objectPosition: `${design.photo.x}% ${design.photo.y}%` }} />
          </div>
        </Rise>
      )}
      <Story content={content} w={w} />
      <Day content={content} design={design} w={w} lang={lang} />
      <Details content={content} w={w} lang={lang} />
      {content.dressCode && (
        <Rise className="mx-section">
          <h2 className="mx-script">{w.dressCode}</h2>
          <p className="mx-body">{content.dressCode}</p>
          <DressFigures className="mx-figures" />
        </Rise>
      )}
      <div ref={rsvpRef} id="rsvp" className="w-full">
        <Rise className="mx-section mx-rsvp">
          <h2 className="mx-script">{w.kindlyReply}</h2>
          {content.rsvpDeadline && <p className="mx-caps mx-soft">{w.replyBy}: {longDate(content.rsvpDeadline, lang)}</p>}
          <RsvpForm content={content} lang={lang} rsvp={rsvp ?? { submit: async () => null }} />
        </Rise>
      </div>
      {content.contacts && (
        <Rise className="mx-section">
          <p className="mx-caps mx-soft">{w.questions}</p>
          <p className="mx-body mx-pre">{content.contacts}</p>
        </Rise>
      )}
      <Rise className="mx-section mx-closing">
        <p className="mx-body mx-italic">{closing}</p>
        <p className="mx-script mx-script--lg mx-names">{content.brideName} &amp; {content.groomName}</p>
        {!startOpen && <button type="button" className="ea-link" onClick={onReplay}><RotateCcw aria-hidden="true" className="ea-ico" /> {w.watchAgain}</button>}
        <p className="ea-made">{w.madeWith}</p>
      </Rise>
      <ActionBar content={content} lang={lang} shareUrl={url} onRsvp={() => rsvpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    </article>
  );
}
