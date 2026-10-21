"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarPlus, Check, Clock3, Copy, MapPin, MessageCircle, Phone, RotateCcw, Share2, Shirt, Sparkles } from "lucide-react";
import { countdown } from "@/lib/domain/digital-invite";
import { formatDate } from "@/lib/domain/dates";
import { calendarFile, googleCalendarUrl, mapLink, placeOf, startInstant } from "@/lib/domain/invite-links";
import { checkRsvp, type GuestLanguage, type InviteContent, type InviteDesign } from "@/lib/domain/invite-studio";
import { clock, localise, longDate, words } from "@/lib/domain/invite-i18n";
import type { GuestReply } from "@/lib/data/published";
import { celebrate } from "@/lib/confetti";
import { InviteCard } from "./invite-card";

/** What happens when a guest replies. Resolves to an error message, or null when sent. */
export interface RsvpHandler {
  submit: (reply: GuestReply) => Promise<string | null>;
  initialName?: string;
  /** Answer already on record (personal links). */
  current?: "pending" | "yes" | "no" | "maybe";
  /** Hide the name field (personal links know who it is). */
  knownGuest?: boolean;
}

export function useNow(ms: number) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.section className={className} initial={reduce ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.section>
  );
}

function Countdown({ content, lang }: { content: InviteContent; lang?: GuestLanguage }) {
  const w = words(lang);
  const now = useNow(1000);
  const target = useMemo(() => startInstant(content), [content]);
  if (!now) return <div className="ea-count" style={{ minHeight: 92 }} />;
  const c = countdown(target, now);
  if (c.done) return <p className="ea-lead">{now.getTime() - target.getTime() < 12 * 3600_000 ? `${w.today} 💛` : w.thanksAfter}</p>;
  return (
    <div className="ea-count" role="timer" aria-label={`${c.days} days, ${c.hours} hours and ${c.minutes} minutes to go`}>
      {([[c.days, c.days === 1 ? w.day : w.days], [c.hours, w.hours], [c.minutes, w.minutes], [c.seconds, w.seconds]] as [number, string][]).map(([n, l], i) => (
        <div key={i} className="ea-tile"><span key={n} className="ea-tile-n">{i === 0 ? n : String(n).padStart(2, "0")}</span><span className="ea-tile-l">{l}</span></div>
      ))}
    </div>
  );
}

export function RsvpForm({ content, rsvp, lang }: { content: InviteContent; rsvp: RsvpHandler; lang?: GuestLanguage }) {
  const w = words(lang);
  const max = Math.max(1, content.maxParty || 1);
  const [name, setName] = useState(rsvp.initialName ?? "");
  const [attending, setAttending] = useState<"yes" | "no" | "maybe" | null>(rsvp.current && rsvp.current !== "pending" ? rsvp.current : null);
  const [party, setParty] = useState(rsvp.knownGuest ? max : 1);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<"yes" | "no" | "maybe" | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  if (sent) {
    return (
      <div className="ea-thanks" role="status">
        <span className="ea-thanks-mark" aria-hidden="true">{sent === "yes" ? "🥂" : sent === "maybe" ? "🌸" : "💌"}</span>
        <h3 className="ea-h3">{sent === "yes" ? w.thanksYes : w.thanksOther}</h3>
        <p className="ea-lead">{sent === "yes" ? w.haveReply(`${content.brideName} & ${content.groomName}`) : sent === "maybe" ? w.maybeNote : w.noNote}</p>
        <button type="button" className="ea-link" onClick={() => setSent(null)}>{w.changeReply}</button>
      </div>
    );
  }

  return (
    <form className="ea-form" onSubmit={async (e) => {
      e.preventDefault();
      if (!attending) return setError(w.chooseComing);
      const problem = rsvp.knownGuest ? null : checkRsvp({ name, attending, party, message }, max);
      if (problem) return setError(problem);
      setBusy(true);
      setError(null);
      const failure = await rsvp.submit({ name: name.trim(), attending, party: attending === "yes" ? party : 0, message: message.trim(), contact: contact.trim() });
      setBusy(false);
      if (failure) return setError(failure);
      setSent(attending);
      if (attending === "yes") celebrate(btn.current, 70);
    }}>
      {!rsvp.knownGuest && (
        <label className="ea-field">
          <span>{w.yourName}</span>
          <input className="ea-input" value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} autoComplete="name" required />
        </label>
      )}
      <fieldset className="ea-answers">
        <legend>{w.willYouJoin}</legend>
        {([["yes", w.accepts, "💐"], ["maybe", w.notSure, "🤍"], ["no", w.declines, "💌"]] as const).map(([v, label, icon]) => (
          <label key={v} className={`ea-answer${attending === v ? " is-on" : ""}`}>
            <input type="radio" name="attending" value={v} checked={attending === v} onChange={() => setAttending(v)} />
            <span aria-hidden="true">{icon}</span>{label}
          </label>
        ))}
      </fieldset>
      {attending === "yes" && max > 1 && (
        <div className="ea-field ea-field--row">
          <span id="ea-party">{w.howMany}</span>
          <div className="ea-stepper" role="group" aria-labelledby="ea-party">
            <button type="button" aria-label={w.oneFewer} disabled={party <= 1} onClick={() => setParty((n) => Math.max(1, n - 1))}>−</button>
            <output aria-live="polite">{party}</output>
            <button type="button" aria-label={w.oneMore} disabled={party >= max} onClick={() => setParty((n) => Math.min(max, n + 1))}>+</button>
          </div>
        </div>
      )}
      <label className="ea-field">
        <span>{w.wish} <em>{w.optional}</em></span>
        <textarea className="ea-input" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={w.wishPlaceholder} />
      </label>
      {!rsvp.knownGuest && (
        <label className="ea-field">
          <span>{w.phone} <em>{w.phoneHint}</em></span>
          <input className="ea-input" inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value.slice(0, 60))} />
        </label>
      )}
      {error && <p className="ea-error" role="alert">{error}</p>}
      <button ref={btn} type="submit" className="ea-btn" disabled={busy}>{busy ? w.sending : w.send}</button>
    </form>
  );
}

/** Download an .ics file for Apple Calendar / Outlook. */
export function saveCalendarFile(content: InviteContent) {
  const blob = new Blob([calendarFile(content, `${content.date}-${content.brideName}-${content.groomName}`.replace(/\s+/g, ""))], { type: "text/calendar" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${content.brideName}-${content.groomName}-wedding.ics`.replace(/\s+/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** The sticky bar at the bottom of an opened invitation. */
export function ActionBar({ content, shareUrl, onRsvp, lang }: { content: InviteContent; shareUrl: string; onRsvp: () => void; lang?: GuestLanguage }) {
  const w = words(lang);
  const [copied, setCopied] = useState(false);
  const map = mapLink(content);
  const share = async () => {
    const text = `${content.brideName} & ${content.groomName} — wedding invitation`;
    try {
      if (navigator.share) await navigator.share({ title: text, text, url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Cancelled.
    }
  };
  return (
    <nav className="ea-bar" aria-label="Invitation actions">
      <button type="button" onClick={onRsvp}><Check aria-hidden="true" />{w.barRsvp}</button>
      {map && <a href={map} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />{w.barLocation}</a>}
      <a href={googleCalendarUrl(content)} target="_blank" rel="noopener noreferrer"><CalendarPlus aria-hidden="true" />{w.barCalendar}</a>
      <button type="button" onClick={() => void share()}>{copied ? <><Copy aria-hidden="true" />{w.barCopied}</> : <><Share2 aria-hidden="true" />{w.barShare}</>}</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${content.brideName} & ${content.groomName}'s wedding invitation 💌 ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"><MessageCircle aria-hidden="true" />WhatsApp</a>
    </nav>
  );
}

export function InvitationPage({ content: raw, design, rsvp, shareUrl, onReplay, startOpen, framed, lang }: {
  content: InviteContent;
  design: InviteDesign;
  lang?: GuestLanguage;
  rsvp?: RsvpHandler;
  shareUrl?: string;
  onReplay: () => void;
  startOpen?: boolean;
  framed?: boolean;
}) {
  const w = words(lang);
  const { content, closing } = localise(raw, design.closingMessage, lang);
  const map = mapLink(content);
  const place = placeOf(content);
  const photo = design.photo.src && (design.photo.placement === "reveal" || design.photo.placement === "both") ? design.photo.src : null;
  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const rsvpRef = useRef<HTMLDivElement>(null);

  const ics = () => saveCalendarFile(content);

  const ceremony = content.ceremonyTitle && { title: content.ceremonyTitle, time: content.ceremonyTime, venue: content.ceremonyVenue || content.venueName };
  const reception = content.receptionTitle && { title: content.receptionTitle, time: content.receptionTime, venue: content.receptionVenue || content.venueName };
  const moments = design.showDayPlan ? content.moments.filter((m) => m.title.trim()) : [];

  return (
    <article className={`ea-page${framed ? " ea-page--framed" : ""}`}>
      <motion.div className="ea-hero-card" initial={startOpen ? false : { opacity: 0.6, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <InviteCard content={content} design={design} className="ea-card-svg" />
      </motion.div>

      <Reveal className="ea-center">
        {content.blessing && <p className="ea-over">{content.blessing}</p>}
        <h1 className="ea-names"><span>{content.brideName}</span><i>&amp;</i><span>{content.groomName}</span></h1>
        <p className="ea-lead ea-pre">{content.inviteMessage}</p>
      </Reveal>

      {design.showCountdown && (
        <Reveal className="ea-center" delay={80}>
          <p className="ea-over">{w.countingDown}</p>
          <Countdown content={content} lang={lang} />
        </Reveal>
      )}

      <Reveal className="ea-grid" delay={60}>
        <div className="ea-panel">
          <p className="ea-over">{w.when}</p>
          <p className="ea-big">{longDate(content.date, lang)}</p>
          {content.time && <p className="ea-row"><Clock3 aria-hidden="true" />{lang === "si" ? `${clock(content.time, lang)} ${w.from}` : `${w.from} ${clock(content.time)}`}</p>}
        </div>
        {ceremony && (
          <div className="ea-panel">
            <p className="ea-over">{ceremony.title}</p>
            {ceremony.time && <p className="ea-big">{clock(ceremony.time, lang)}</p>}
            {ceremony.venue && <p className="ea-row"><MapPin aria-hidden="true" />{ceremony.venue}</p>}
          </div>
        )}
        {reception && (
          <div className="ea-panel">
            <p className="ea-over">{reception.title}</p>
            {reception.time && <p className="ea-big">{clock(reception.time, lang)}</p>}
            {reception.venue && <p className="ea-row"><MapPin aria-hidden="true" />{reception.venue}</p>}
          </div>
        )}
      </Reveal>

      {photo && (
        <Reveal className="ea-photo-wrap">
          <motion.div className="ea-photo" initial={{ clipPath: "inset(45% 30% 45% 30% round 200px)" }} whileInView={{ clipPath: "inset(0% 0% 0% 0% round 200px 200px 24px 24px)" }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- user photo stored as a data URL */}
            <img src={photo} alt={`${content.brideName} and ${content.groomName}`} style={{ objectPosition: `${design.photo.x}% ${design.photo.y}%` }} />
          </motion.div>
        </Reveal>
      )}

      {(place || map) && (
        <Reveal className="ea-panel ea-center">
          <p className="ea-over">{w.where}</p>
          <p className="ea-big">{content.venueName || "Venue"}</p>
          {content.address && <p className="ea-lead">{content.address}</p>}
          <div className="ea-actions">
            {map && <a className="ea-btn ea-btn--soft" href={map} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />{w.viewLocation}</a>}
            <a className="ea-btn ea-btn--soft" href={googleCalendarUrl(content)} target="_blank" rel="noopener noreferrer"><CalendarPlus aria-hidden="true" />{w.googleCalendar}</a>
            <button type="button" className="ea-btn ea-btn--soft" onClick={ics}><CalendarPlus aria-hidden="true" />{w.appleOutlook}</button>
          </div>
        </Reveal>
      )}

      {moments.length > 0 && (
        <Reveal className="ea-center">
          <p className="ea-over">{w.theCelebration}</p>
          <ol className="ea-moments">
            {moments.map((m, i) => (
              <li key={`${m.time}-${i}`}><span className="ea-moment-time">{clock(m.time, lang)}</span><span className="ea-moment-dot" aria-hidden="true" /><span>{m.title}</span></li>
            ))}
          </ol>
        </Reveal>
      )}

      {(content.dressCode || content.rsvpDeadline || content.contacts) && (
        <Reveal className="ea-grid">
          {content.dressCode && <div className="ea-panel"><p className="ea-over"><Shirt aria-hidden="true" className="ea-ico" /> {w.dressCode}</p><p className="ea-lead">{content.dressCode}</p></div>}
          {content.rsvpDeadline && <div className="ea-panel"><p className="ea-over"><Sparkles aria-hidden="true" className="ea-ico" /> {w.replyBy}</p><p className="ea-big">{lang === "si" ? longDate(content.rsvpDeadline, lang) : formatDate(content.rsvpDeadline)}</p></div>}
          {content.contacts && <div className="ea-panel"><p className="ea-over"><Phone aria-hidden="true" className="ea-ico" /> {w.contact}</p><p className="ea-lead ea-pre">{content.contacts}</p></div>}
        </Reveal>
      )}

      <div ref={rsvpRef} id="rsvp">
        <Reveal className="ea-panel ea-rsvp">
          <p className="ea-over ea-center-text">{w.rsvp}</p>
          <h2 className="ea-h2 ea-center-text">{w.willYouCelebrate}</h2>
          <RsvpForm content={content} lang={lang} rsvp={rsvp ?? { submit: async () => null }} />
        </Reveal>
      </div>

      <Reveal className="ea-center ea-closing">
        <p className="ea-lead">{closing}</p>
        <p className="ea-sign">{content.brideName} &amp; {content.groomName}</p>
        {!startOpen && <button type="button" className="ea-link" onClick={onReplay}><RotateCcw aria-hidden="true" className="ea-ico" /> {w.watchAgain}</button>}
        <p className="ea-made">{w.madeWith}</p>
      </Reveal>

      <ActionBar content={content} lang={lang} shareUrl={url} onRsvp={() => rsvpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    </article>
  );
}

export type { InviteDesign };
