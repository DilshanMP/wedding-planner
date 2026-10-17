"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarPlus, Clock3, Heart, MapPin, Music2, RotateCcw, Shirt, Volume2, VolumeX } from "lucide-react";
import {
  calendarFile, countdown, googleCalendarUrl, invitePalette, mapUrl, monogram, placeLine, startTime, weddingInstant,
  type InviteContent,
} from "@/lib/domain/digital-invite";
import { formatDate, formatTime } from "@/lib/domain/dates";
import { MEAL_LABEL } from "@/lib/domain/catalog";
import type { MealPreference, SimulatorScene } from "@/lib/domain/types";
import { InviteSound } from "@/lib/invite-sound";
import { themeVars } from "@/lib/theme-colors";
import { DEFAULT_LOOK, PoruwaScene } from "./poruwa-scene";
import { cx } from "@/components/ui/primitives";

/**
 * The animated online invitation. A sealed envelope with the couple's wax
 * monogram; tapping it breaks the seal (bells, a paper whoosh, a burst of
 * petals) and the card slides out into a scrolling story: names, the Poruwa,
 * a live countdown, the evening's moments, the venue, and the RSVP.
 */

export type RsvpAnswer = "yes" | "no" | "maybe";

export interface InviteReply {
  response: RsvpAnswer;
  attending: number | null;
  meal: MealPreference;
  message: string;
}

export interface InviteRsvp {
  current: RsvpAnswer | "pending";
  meal: MealPreference;
  /** Resolves to an error message, or null when it was sent. */
  submit: (reply: InviteReply) => Promise<string | null>;
}

const SCENE_ICON: Partial<Record<SimulatorScene, string>> = {
  arrival: "✨", poruwa: "🪷", reception: "🥂", dinner: "🍽️", cake: "🎂", entertainment: "💃", going_away: "🚗",
};

const COUPLE = { ...DEFAULT_LOOK, groomOutfit: "suit" as const, groomColor: "#3b3540", groomAccent: "#d9c3a0" };

/* ------------------------------------------------------------------ */
/* Falling petals, sparkles and bursts                                 */
/* ------------------------------------------------------------------ */

const PETALS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: -((i * 1.9) % 14),
  dur: 11 + ((i * 7) % 8),
  size: 10 + ((i * 5) % 9),
  sway: 30 + ((i * 11) % 50),
  tone: i % 3,
}));

const SPARKS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 29) % 100,
  delay: -((i * 0.73) % 5),
  size: 2 + (i % 3),
}));

function Sky({ effect, paused }: { effect: InviteContent["settings"]["effect"]; paused: boolean }) {
  return (
    <div className={cx("dinv-sky", paused && "is-paused")} aria-hidden="true">
      <span className="dinv-orb dinv-orb--a" />
      <span className="dinv-orb dinv-orb--b" />
      <span className="dinv-orb dinv-orb--c" />
      {effect !== "petals" && SPARKS.map((s, i) => (
        <span key={`s${i}`} className="dinv-spark" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
      ))}
      {effect !== "sparkles" && PETALS.map((p, i) => (
        <span key={`p${i}`} className={`dinv-petal dinv-petal--${p.tone}`}
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.8, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, "--sway": `${p.sway}px` } as CSSProperties} />
      ))}
    </div>
  );
}

interface Burst { id: number; x: number; y: number }

function Bursts({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="dinv-bursts" aria-hidden="true">
      {bursts.map((b) => (
        <span key={b.id} className="dinv-burst" style={{ left: b.x, top: b.y }}>
          {Array.from({ length: 28 }, (_, i) => {
            const angle = (i / 28) * Math.PI * 2 + (b.id % 7) * 0.2;
            const dist = 90 + ((i * 37 + b.id) % 110);
            return (
              <i key={i} className={`dinv-bit dinv-bit--${i % 4}`}
                style={{ "--dx": `${Math.round(Math.cos(angle) * dist)}px`, "--dy": `${Math.round(Math.sin(angle) * dist - 40)}px`, "--rot": `${(i * 47) % 360}deg`, animationDelay: `${(i % 5) * 0.02}s` } as CSSProperties} />
            );
          })}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces of the story                                                 */
/* ------------------------------------------------------------------ */

function useNow(ms: number) {
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

function CountdownTiles({ content }: { content: InviteContent }) {
  const now = useNow(1000);
  const target = useMemo(() => weddingInstant(content.weddingDate, startTime(content)), [content]);
  if (!now) return <div className="dinv-count" style={{ minHeight: 96 }} />;
  const c = countdown(target, now);
  if (c.done) return <p className="dinv-lead">{now.getTime() - target.getTime() < 12 * 3600_000 ? "Today is the day! 💛" : "Thank you for celebrating with us."}</p>;
  const tiles: [number, string][] = [[c.days, c.days === 1 ? "day" : "days"], [c.hours, "hours"], [c.minutes, "minutes"], [c.seconds, "seconds"]];
  return (
    <div className="dinv-count" role="timer" aria-label={`${c.days} days, ${c.hours} hours and ${c.minutes} minutes to go`}>
      {tiles.map(([n, label]) => (
        <div key={label} className="dinv-tile">
          <span key={n} className="dinv-tile-n">{label === "days" || label === "day" ? n : String(n).padStart(2, "0")}</span>
          <span className="dinv-tile-l">{label}</span>
        </div>
      ))}
    </div>
  );
}

function Reveal({ children, className, delay = 0, as: Tag = "section" }: { children: ReactNode; className?: string; delay?: number; as?: "section" | "div" }) {
  return <Tag className={cx("dinv-reveal", className)} style={{ "--d": `${delay}ms` } as CSSProperties}>{children}</Tag>;
}

function Ornament() {
  return (
    <svg className="dinv-orn" viewBox="0 0 220 24" aria-hidden="true">
      <path d="M2 12 H86 M134 12 H218" stroke="currentColor" strokeWidth="1" />
      <path d="M110 3 C104 9 104 15 110 21 C116 15 116 9 110 3 Z" fill="currentColor" />
      <path d="M96 12 C100 8 104 8 106 12 C104 16 100 16 96 12 Z M124 12 C120 8 116 8 114 12 C116 16 120 16 124 12 Z" fill="currentColor" opacity=".7" />
      <circle cx="90" cy="12" r="1.6" fill="currentColor" /><circle cx="130" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

const ANSWERS: { value: RsvpAnswer; label: string; emoji: string }[] = [
  { value: "yes", label: "Joyfully attending", emoji: "💐" },
  { value: "maybe", label: "Not sure yet", emoji: "🤔" },
  { value: "no", label: "Regretfully can't", emoji: "💌" },
];

function RsvpCard({ content, rsvp, onCelebrate }: { content: InviteContent; rsvp: InviteRsvp; onCelebrate: (el: HTMLElement) => void }) {
  const [answer, setAnswer] = useState<RsvpAnswer | null>(rsvp.current === "pending" ? null : rsvp.current);
  const [attending, setAttending] = useState(content.partySize);
  const [meal, setMeal] = useState<MealPreference>(rsvp.meal);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<RsvpAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  if (sent) {
    return (
      <div className="dinv-thanks" role="status">
        <span className="dinv-thanks-mark" aria-hidden="true">{sent === "yes" ? "🎉" : sent === "maybe" ? "🌸" : "💌"}</span>
        <h3 className="dinv-h3">{sent === "yes" ? "See you there!" : "Thank you for letting us know"}</h3>
        <p className="dinv-lead">
          {sent === "yes" ? `${content.brideName} & ${content.groomName} can't wait to celebrate with you.` : sent === "maybe" ? "Come back to this link any time to update your reply." : "You'll be in our hearts on the day."}
        </p>
        <button type="button" className="dinv-link" onClick={() => setSent(null)}>Change my reply</button>
      </div>
    );
  }

  return (
    <form
      className="dinv-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!answer) return;
        setBusy(true);
        setError(null);
        const failure = await rsvp.submit({ response: answer, attending: answer === "yes" ? attending : null, meal: answer === "no" ? "unknown" : meal, message: message.trim() });
        setBusy(false);
        if (failure) return setError(failure);
        setSent(answer);
        if (answer === "yes" && button.current) onCelebrate(button.current);
      }}
    >
      <fieldset className="dinv-answers">
        <legend className="sr-only">Will you join us?</legend>
        {ANSWERS.map((a) => (
          <label key={a.value} className={cx("dinv-answer", answer === a.value && "is-on")}>
            <input type="radio" name="rsvp" value={a.value} checked={answer === a.value} onChange={() => setAnswer(a.value)} />
            <span aria-hidden="true" className="dinv-answer-emoji">{a.emoji}</span>
            <span>{a.label}</span>
          </label>
        ))}
      </fieldset>
      {answer === "yes" && content.partySize > 1 && (
        <div className="dinv-row">
          <span className="dinv-label" id="dinv-count-label">How many of you will come?</span>
          <div className="dinv-stepper" role="group" aria-labelledby="dinv-count-label">
            <button type="button" aria-label="One fewer" disabled={attending <= 1} onClick={() => setAttending((n) => Math.max(1, n - 1))}>−</button>
            <output aria-live="polite">{attending}</output>
            <button type="button" aria-label="One more" disabled={attending >= content.partySize} onClick={() => setAttending((n) => Math.min(content.partySize, n + 1))}>+</button>
          </div>
        </div>
      )}
      {answer && answer !== "no" && (
        <label className="dinv-row">
          <span className="dinv-label">Meal preference</span>
          <select className="dinv-input" value={meal} onChange={(e) => setMeal(e.target.value as MealPreference)}>
            {(["unknown", "veg", "non_veg", "mixed"] as MealPreference[]).map((m) => <option key={m} value={m}>{m === "unknown" ? "No preference" : MEAL_LABEL[m]}</option>)}
          </select>
        </label>
      )}
      <label className="dinv-row dinv-row--stack">
        <span className="dinv-label">A note or blessing for the couple <span className="opacity-70">(optional)</span></span>
        <textarea className="dinv-input" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Wishing you a lifetime of happiness…" />
      </label>
      {error && <p className="dinv-error" role="alert">{error}</p>}
      <button ref={button} type="submit" className="dinv-btn" disabled={!answer || busy}>{busy ? "Sending…" : "Send my reply"}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* The invitation                                                      */
/* ------------------------------------------------------------------ */

type Stage = "sealed" | "opening" | "open";

export function DigitalInvitation({ content, rsvp, framed = false, startOpen = false, onOpen }: {
  content: InviteContent;
  rsvp?: InviteRsvp;
  /** Called once when the guest breaks the seal. */
  onOpen?: () => void;
  /** Inside a phone frame in the app, rather than the whole screen. */
  framed?: boolean;
  /** Skip the envelope (used for screenshots and replays). */
  startOpen?: boolean;
}) {
  const [stage, setStage] = useState<Stage>(startOpen ? "open" : "sealed");
  const [muted, setMuted] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [hidden, setHidden] = useState(false);
  const sound = useRef<InviteSound | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const palette = useMemo(() => invitePalette(content.settings, content.themeColors), [content.settings, content.themeColors]);
  const [b, g] = monogram(content.brideName, content.groomName);
  const music = content.settings.music;

  const vars = useMemo(() => ({
    ...themeVars([palette.primary, palette.gold, palette.paper]),
    "--inv-paper": palette.paper,
    "--inv-primary": palette.primary,
    "--inv-gold": palette.gold,
    "--inv-blush": palette.blush,
    "--inv-ink": palette.ink,
    "--inv-on-primary": palette.onPrimary,
  }) as CSSProperties, [palette]);

  useEffect(() => () => sound.current?.dispose(), []);
  useEffect(() => {
    sound.current?.setMusic(music);
  }, [music]);
  useEffect(() => {
    const onVis = () => {
      setHidden(document.hidden);
      sound.current?.setHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const burst = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    setBursts((list) => [...list.slice(-3), { id, x, y }]);
    setTimeout(() => setBursts((list) => list.filter((it) => it.id !== id)), 1900);
  }, []);

  const burstAt = useCallback((el: HTMLElement) => {
    const box = root.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return;
    burst(r.left - box.left + r.width / 2, r.top - box.top + r.height / 2);
  }, [burst]);

  const open = (el: HTMLElement) => {
    if (stage !== "sealed") return;
    sound.current ??= new InviteSound();
    sound.current.setMuted(muted);
    sound.current.start(music);
    sound.current.chime();
    setTimeout(() => sound.current?.whoosh(), 420);
    burstAt(el);
    onOpen?.();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage("opening");
    setTimeout(() => {
      setStage("open");
      scroller.current?.scrollTo({ top: 0 });
    }, reduce ? 200 : 2100);
  };

  // Reveal sections as they scroll into view.
  useEffect(() => {
    if (stage !== "open") return;
    const els = scroller.current?.querySelectorAll(".dinv-reveal") ?? [];
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) {
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }, { root: scroller.current, threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stage]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (!sound.current && !next) {
      sound.current = new InviteSound();
      sound.current.start(music);
    }
    sound.current?.setMuted(next);
  };

  const downloadIcs = () => {
    const blob = new Blob([calendarFile(content, `${content.weddingDate}-${b}${g}`)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.brideName}-${content.groomName}-wedding.ics`.replace(/\s+/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const place = placeLine(content);
  const map = mapUrl(content);
  const [y, mo, d] = content.weddingDate.split("-");
  const monthYear = formatDate(content.weddingDate).split(" ").slice(1).join(" ");
  const weekday = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const moments = content.moments.filter((m) => m.title.trim());

  return (
    <div ref={root} className={cx("dinv", framed && "dinv--framed", `dinv--${stage}`)} style={vars}>
      <Sky effect={content.settings.effect} paused={hidden} />
      <div ref={scroller} className="dinv-scroll">
        {stage !== "open" ? (
          <div className="dinv-cover">
            <p className="dinv-overline">{content.guestName ? `Dear ${content.guestName}` : "Dear guest"}</p>
            <p className="dinv-cover-line">you have a letter from<br /><span className="dinv-script">{content.brideName} &amp; {content.groomName}</span></p>
            <div className="dinv-env" data-stage={stage}>
              <div className="dinv-env-back" />
              <div className="dinv-env-card">
                <span className="dinv-script">{b} &amp; {g}</span>
                <span className="dinv-env-date">{formatDate(content.weddingDate)}</span>
              </div>
              <div className="dinv-env-pocket" />
              <div className="dinv-env-flap" />
              <button type="button" className="dinv-seal" onClick={(e) => open(e.currentTarget)} aria-label="Break the seal and open your invitation" disabled={stage !== "sealed"}>
                <span className="dinv-seal-ring" aria-hidden="true" />
                <span className="dinv-seal-mono" aria-hidden="true">{b}<i>&amp;</i>{g}</span>
              </button>
            </div>
            <p className="dinv-hint" aria-hidden={stage !== "sealed"}>
              <span className="dinv-hint-dot" />Tap the seal to open
            </p>
            {music !== "none" && <p className="dinv-sound-hint"><Music2 aria-hidden="true" />Best with sound on</p>}
          </div>
        ) : (
          <article className="dinv-story">
            <Reveal className="dinv-hero">
              {content.text.blessing && <p className="dinv-overline">{content.text.blessing}</p>}
              {content.text.sinhalaLine && <p className="dinv-sinhala" lang="si">{content.text.sinhalaLine}</p>}
              {content.text.coverLine && <p className="dinv-small">{content.text.coverLine}</p>}
              <h1 className="dinv-names">
                <span className="dinv-name">{content.brideName}</span>
                <span className="dinv-amp">&amp;</span>
                <span className="dinv-name">{content.groomName}</span>
              </h1>
              <Ornament />
              <div className="dinv-scene">
                <PoruwaScene look={COUPLE} theme="ivory" hall={false} title={`${content.brideName} and ${content.groomName} on the Poruwa`} />
              </div>
              {content.text.inviteLine && <p className="dinv-lead">{content.text.hosts && !content.text.hosts.includes("___") ? `${content.text.hosts} ` : ""}{content.text.inviteLine}</p>}
            </Reveal>

            <Reveal className="dinv-date">
              <span className="dinv-date-side">{weekday}</span>
              <span className="dinv-date-day">{Number(d)}</span>
              <span className="dinv-date-side">{monthYear}</span>
            </Reveal>
            <Reveal className="dinv-center" delay={80}>
              <p className="dinv-when"><Clock3 aria-hidden="true" />{content.text.timeLine || `From ${formatTime(startTime(content))}`}</p>
              {place && <p className="dinv-when"><MapPin aria-hidden="true" />{place}</p>}
            </Reveal>

            {(content.guestName || content.settings.note) && (
              <Reveal className="dinv-card dinv-note">
                <Heart className="dinv-note-heart" aria-hidden="true" />
                {content.guestName && <p className="dinv-h3">For {content.guestName}</p>}
                {content.settings.note && <p className="dinv-lead">{content.settings.note}</p>}
                {content.guestName && content.partySize > 1 && <p className="dinv-small">We have reserved {content.partySize} seats for you.</p>}
              </Reveal>
            )}

            <Reveal className="dinv-center">
              <p className="dinv-overline">Counting down</p>
              <CountdownTiles content={content} />
            </Reveal>

            {moments.length > 0 && (
              <Reveal className="dinv-center">
                <p className="dinv-overline">The evening</p>
                <ol className="dinv-moments">
                  {moments.map((m, i) => (
                    <li key={`${m.time}-${i}`} className="dinv-moment dinv-reveal" style={{ "--d": `${i * 70}ms` } as CSSProperties}>
                      <span className="dinv-moment-icon" aria-hidden="true">{SCENE_ICON[m.scene] ?? "✨"}</span>
                      <span className="dinv-moment-time">{formatTime(m.time)}</span>
                      <span className="dinv-moment-title">{m.title}</span>
                    </li>
                  ))}
                </ol>
              </Reveal>
            )}

            <Reveal className="dinv-card dinv-center">
              <p className="dinv-overline">Where</p>
              <p className="dinv-h3">{content.venue || "Venue to be announced"}</p>
              {content.location && <p className="dinv-small">{content.location}</p>}
              <div className="dinv-actions">
                {map && <a className="dinv-btn dinv-btn--soft" href={map} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />Directions</a>}
                <a className="dinv-btn dinv-btn--soft" href={googleCalendarUrl(content)} target="_blank" rel="noopener noreferrer"><CalendarPlus aria-hidden="true" />Google Calendar</a>
                <button type="button" className="dinv-btn dinv-btn--soft" onClick={downloadIcs}><CalendarPlus aria-hidden="true" />Apple / Outlook</button>
              </div>
            </Reveal>

            {content.settings.dressCode && (
              <Reveal className="dinv-center">
                <p className="dinv-overline"><Shirt aria-hidden="true" className="inline size-4 align-[-3px]" /> Dress code</p>
                <div className="dinv-swatches" aria-hidden="true">
                  {[palette.paper, palette.blush, palette.gold, palette.primary].map((c) => <span key={c} style={{ background: c }} />)}
                </div>
                <p className="dinv-lead">{content.settings.dressCode}</p>
              </Reveal>
            )}

            <Reveal className="dinv-card" as="div">
              <p className="dinv-overline dinv-center">Will you join us?</p>
              {content.text.rsvpLine && !content.text.rsvpLine.includes("___") && <p className="dinv-small dinv-center">{content.text.rsvpLine}</p>}
              <RsvpCard
                content={content}
                rsvp={rsvp ?? { current: "pending", meal: "unknown", submit: async () => null }}
                onCelebrate={(el) => {
                  sound.current?.sparkle();
                  burstAt(el);
                  setTimeout(() => burstAt(el), 350);
                }}
              />
            </Reveal>

            <Reveal className="dinv-center dinv-footer">
              <Ornament />
              <p className="dinv-small">With love</p>
              <p className="dinv-script dinv-sign">{content.brideName} &amp; {content.groomName}</p>
              <p className="dinv-tiny">Made with Poruwa Planner</p>
            </Reveal>
          </article>
        )}
      </div>
      <Bursts bursts={bursts} />
      <div className="dinv-controls">
        {stage === "open" && (
          <button type="button" className="dinv-ctl" aria-label="Close the invitation and open it again" title="Open again" onClick={() => setStage("sealed")}>
            <RotateCcw aria-hidden="true" />
          </button>
        )}
        {music !== "none" && (
          <button type="button" className={cx("dinv-ctl", !muted && stage !== "sealed" && "is-playing")} aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"} title={muted ? "Sound on" : "Sound off"} onClick={toggleMute}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            <span className="dinv-eq" aria-hidden="true"><i /><i /><i /></span>
          </button>
        )}
      </div>
    </div>
  );
}
