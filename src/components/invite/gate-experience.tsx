"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, FastForward, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { FONTS, addressFor, readableOn } from "@/lib/domain/invite-studio";
import { InviteSound } from "@/lib/invite-sound";
import { mix } from "@/lib/theme-colors";
import { Beam, CrystalBackdrop, Rays, Door, GateDefs, RibbonBand, RibbonBow, Rings, Sparkle, Stage, gateTints, useGateIds } from "./gate-art";
import { GatePage } from "./gate-page";
import type { ExperienceProps } from "./invitation-experience";

/**
 * "Garden gate" opening. Carved doors tied with a silk ribbon; a tap unties
 * the bow, the doors swing open onto a floral arch with the card, then two
 * gold rings rise in a beam of golden light. Below it the invitation
 * continues: a message, countdown, story, the day, details and RSVP.
 */

type Phase = 0 | 1 | 2 | 3 | 4 | 5;
// 0 tied · 1 ribbon falls · 2 doors open · 3 card appears · 4 rings rise · 5 open (scroll)

const PRESET_PACE = { gentle: 1.25, cinematic: 1.1, swift: 0.7, royal: 1.05 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;
const EASE_DOOR = [0.6, 0, 0.25, 1] as const;

const RINGS_Y = 284;
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({ x: 184 + ((i * 37) % 32), d: (i * 0.37) % 2.6, s: 1 + (i % 3) * 0.6 }));
const TWINKLES = Array.from({ length: 16 }, (_, i) => ({ left: (i * 61) % 100, top: (i * 37 + 11) % 100, d: (i * 0.53) % 4, s: 6 + (i % 4) * 3 }));

export function GateExperience(props: ExperienceProps) {
  const { content, design, guestName, party, framed, startOpen, silent, onOpen } = props;
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(startOpen ? 5 : 0);
  const [muted, setMuted] = useState(Boolean(silent));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sound = useRef<InviteSound | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ids = useGateIds();
  const c = design.colors;
  const t = useMemo(() => gateTints(c), [c]);
  const pace = PRESET_PACE[design.animation.preset] / Math.min(2, Math.max(0.5, design.animation.speed || 1));
  const T = { ribbon: 0.9 * pace, doors: 1.7 * pace, card: 2.3 * pace, rings: 2.4 * pace };

  const personal = Boolean(guestName || party);
  const modern = design.addressing !== "name" || !guestName;
  const to = personal ? (modern ? addressFor(party ?? { adults: 1, children: 0 }) : guestName!) : null;
  const script = FONTS[design.fonts.names].family;
  const head = FONTS[design.fonts.headings].family;
  const dateCaps = useMemo(() => {
    const [y, m, d] = content.date.split("-").map(Number);
    if (!y) return "";
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).toUpperCase();
  }, [content.date]);
  const nameSize = (n: string) => Math.max(18, Math.min(34, 260 / Math.max(6, n.length * 0.55)));

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => {
    clear();
    sound.current?.dispose();
  }, []);
  useEffect(() => {
    const onVis = () => sound.current?.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const at = (s: number, fn: () => void) => timers.current.push(setTimeout(fn, s * 1000));

  const open = () => {
    if (phase !== 0) return;
    onOpen?.();
    if (!silent) {
      sound.current ??= new InviteSound();
      sound.current.setMuted(muted);
      sound.current.start(design.music);
      sound.current.chime();
    }
    if (reduce) {
      setPhase(5);
      return;
    }
    setPhase(1);
    at(T.ribbon * 0.8, () => {
      setPhase(2);
      if (!silent) sound.current?.whoosh();
    });
    at(T.ribbon * 0.8 + T.doors * 0.85, () => setPhase(3));
    at(T.ribbon * 0.8 + T.doors * 0.85 + T.card, () => {
      setPhase(4);
      if (!silent) sound.current?.sparkle();
    });
    at(T.ribbon * 0.8 + T.doors * 0.85 + T.card + T.rings, () => setPhase(5));
  };

  const skip = () => {
    clear();
    if (phase === 0) onOpen?.();
    setPhase(5);
  };

  const reset = useCallback(() => {
    clear();
    setPhase(startOpen ? 5 : 0);
    scroller.current?.scrollTo({ top: 0 });
  }, [startOpen]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (!sound.current && !next && !silent) {
      sound.current = new InviteSound();
      sound.current.start(design.music);
    }
    sound.current?.setMuted(next);
  };

  const vars = useMemo(() => ({
    "--mx-bg": c.background,
    "--mx-ink": c.ink,
    "--mx-accent": c.accent,
    "--mx-card": c.card,
    "--mx-soft": mix(c.ink, c.card, 0.45),
    "--mx-line": mix(c.accent, c.card, 0.5),
    "--mx-glow": mix(c.accent, "#fff3d6", 0.55),
    "--mx-tint": t.base,
    "--mx-script": script,
    "--mx-head": head,
    "--mx-body": FONTS[design.fonts.body].family,
    // The RSVP form and controls are shared with the envelope experience.
    "--ea-bg": c.background,
    "--ea-on-bg": readableOn(c.background),
    "--ea-card": c.card,
    "--ea-ink": c.ink,
    "--ea-accent": c.accent,
    "--ea-soft": mix(c.floralA, c.card, 0.6),
    "--ea-names": script,
    "--ea-head": head,
    "--ea-body": FONTS[design.fonts.body].family,
  }) as CSSProperties, [c, t.base, script, head, design.fonts.body]);

  const opened = phase === 5;
  const show = (p: Phase) => phase >= p;
  const instant = reduce || startOpen;

  return (
    <div className={`mx-root${framed ? " mx-root--framed" : ""}`} style={vars} data-phase={phase}>
      <div className="mx-crystal" aria-hidden="true">
        <CrystalBackdrop c={c} />
        <div className="mx-prism" />
        {TWINKLES.map((s, i) => (
          <svg key={i} className="mx-twinkle" viewBox="-10 -10 20 20" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}><Sparkle x={0} y={0} s={9} /></svg>
        ))}
      </div>
      <svg width="0" height="0" className="mx-defs" aria-hidden="true"><GateDefs ids={ids} t={t} /></svg>

      <div ref={scroller} className="mx-scroll" style={{ overflowY: opened ? "auto" : "hidden" }}>
        <section className="mx-hero" aria-label={`${content.brideName} and ${content.groomName} are getting married`}>
          <div className="mx-stage">
            <Stage ids={ids} t={t}>
              {/* Golden light rises behind the card. */}
              <motion.g initial={false} animate={show(4) ? { opacity: phase === 4 ? 1 : 0.55, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
                transition={{ duration: instant ? 0 : T.rings * 0.55, ease: EASE }} style={{ transformBox: "view-box", transformOrigin: "200px 860px" }}>
                <Beam ids={ids} top={170} />
              </motion.g>

              {/* The card */}
              <motion.g initial={false} animate={{ opacity: show(2) ? 1 : 0 }} transition={{ duration: instant ? 0 : 0.6 }}>
                <rect x="118" y="330" width="164" height="340" rx="3" fill={c.card} opacity="0.96" />
                <rect x="126" y="338" width="148" height="324" rx="2" fill="none" stroke={c.accent} strokeOpacity="0.45" strokeWidth="0.8" />
                {[
                  { y: 382, el: <text x="200" y="382" textAnchor="middle" fontFamily={head} fontSize="8.2" fontWeight="600" letterSpacing="1.5" fill={c.ink} opacity="0.8">WE&apos;RE GETTING MARRIED</text> },
                  { y: 446, el: <text x="200" y="446" textAnchor="middle" fontFamily={script} fontSize={nameSize(content.brideName)} fill={c.ink}>{content.brideName}</text> },
                  { y: 478, el: <text x="200" y="478" textAnchor="middle" fontFamily={script} fontSize="18" fill={c.accent}>&amp;</text> },
                  { y: 516, el: <text x="200" y="516" textAnchor="middle" fontFamily={script} fontSize={nameSize(content.groomName)} fill={c.ink}>{content.groomName}</text> },
                  { y: 552, el: <g><path d="M162 552H192M208 552H238" stroke={c.accent} strokeWidth="0.8" /><path d="M200 548L204 552L200 556L196 552Z" fill={c.accent} /></g> },
                  { y: 582, el: <text x="200" y="582" textAnchor="middle" fontFamily={head} fontSize="10.5" fontWeight="600" letterSpacing="2.6" fill={c.ink}>{dateCaps}</text> },
                  { y: 604, el: <text x="200" y="604" textAnchor="middle" fontFamily={head} fontSize="10" fontStyle="italic" fill={c.ink} opacity="0.8">{content.venueName}</text> },
                ].map((row, i) => (
                  <motion.g key={i} initial={false} animate={show(3) ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ duration: instant ? 0 : 0.9, delay: instant ? 0 : i * 0.16 * pace, ease: EASE }}>
                    {row.el}
                  </motion.g>
                ))}
              </motion.g>

              {/* Halo, rays, rings and sparkles */}
              <motion.g initial={false} animate={show(4) ? { opacity: 1, rotate: 360 } : { opacity: 0, rotate: 0 }}
                transition={{ opacity: { duration: instant ? 0 : 1.2, delay: instant ? 0 : T.rings * 0.45 }, rotate: { duration: 60, ease: "linear", repeat: Infinity } }}
                style={{ transformBox: "view-box", transformOrigin: `200px ${RINGS_Y}px` }}>
                <Rays cx={200} cy={RINGS_Y} />
              </motion.g>
              <motion.circle cx="200" cy={RINGS_Y} r="110" fill={`url(#${ids.halo})`} initial={false}
                animate={show(4) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }} transition={{ duration: instant ? 0 : T.rings * 0.7, delay: instant ? 0 : T.rings * 0.35 }}
                style={{ transformBox: "fill-box", transformOrigin: "center", mixBlendMode: "screen" }} />
              <g transform={`translate(200 ${RINGS_Y})`}>
                <motion.g initial={false} animate={show(4) ? { y: 0, opacity: 1, rotate: 0, scale: 1 } : { y: 560, opacity: 0, rotate: -24, scale: 0.7 }}
                  transition={{ duration: instant ? 0 : T.rings, ease: EASE }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <g className={opened ? "mx-ring-float" : undefined}><Rings ids={ids} /></g>
                </motion.g>
                {show(4) && [[-40, -30, 7, 0], [42, -36, 6, 0.6], [-30, 34, 5, 1.1], [36, 30, 6, 0.3], [0, -58, 8, 0.9], [58, 4, 4, 1.4], [-60, 2, 4, 1.8]].map(([x, y, s, d], i) => (
                  <Sparkle key={i} x={x} y={y} s={s} className="mx-spark" style={{ animationDelay: `${d + (instant ? 0 : T.rings * 0.6)}s` }} />
                ))}
              </g>
              {show(4) && !opened && PARTICLES.map((p, i) => (
                <circle key={i} cx={p.x} cy="780" r={p.s} fill="#FFE9B0" className="mx-mote" style={{ animationDelay: `${p.d}s` }} />
              ))}
            </Stage>
          </div>

          {/* Doors */}
          <div className="mx-doors" aria-hidden={phase >= 3}>
            <motion.div className="mx-door mx-door--l" initial={false} animate={show(2) ? { rotateY: -112, opacity: phase >= 3 ? 0 : 1 } : { rotateY: 0, opacity: 1 }}
              transition={{ rotateY: { duration: instant ? 0 : T.doors, ease: EASE_DOOR }, opacity: { duration: instant ? 0 : 0.5, delay: instant ? 0 : 0.2 } }}>
              <Door ids={ids} t={t} side="left" />
            </motion.div>
            <motion.div className="mx-door mx-door--r" initial={false} animate={show(2) ? { rotateY: 112, opacity: phase >= 3 ? 0 : 1 } : { rotateY: 0, opacity: 1 }}
              transition={{ rotateY: { duration: instant ? 0 : T.doors, ease: EASE_DOOR }, opacity: { duration: instant ? 0 : 0.5, delay: instant ? 0 : 0.2 } }}>
              <Door ids={ids} t={t} side="right" />
            </motion.div>
          </div>

          {/* Ribbon */}
          {phase < 3 && (
            <div className="mx-ribbon" aria-hidden="true">
              <motion.div className="mx-band mx-band--l" initial={false} animate={show(1) ? { x: "-70%", y: 140, rotate: -14, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: instant ? 0 : T.ribbon * 1.4, ease: [0.5, 0, 0.75, 0.4] }}>
                <RibbonBand ids={ids} t={t} half="left" />
              </motion.div>
              <motion.div className="mx-band mx-band--r" initial={false} animate={show(1) ? { x: "70%", y: 160, rotate: 12, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: instant ? 0 : T.ribbon * 1.4, ease: [0.5, 0, 0.75, 0.4] }}>
                <RibbonBand ids={ids} t={t} half="right" />
              </motion.div>
              <motion.div className="mx-bow" initial={false} animate={show(1) ? { scale: 0.4, y: 220, rotate: 18, opacity: 0 } : { scale: 1, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: instant ? 0 : T.ribbon * 1.3, ease: [0.45, 0, 0.7, 0.5] }}>
                <RibbonBow ids={ids} t={t} />
              </motion.div>
            </div>
          )}

          {phase === 0 && (
            <>
              {to && (
                <p className={`mx-to${modern ? " mx-to--modern" : ""}`}>
                  {modern ? <>An invitation for<b>{to}</b></> : <>Dear <b>{to}</b></>}
                </p>
              )}
              <button type="button" className="mx-tap" onClick={open} aria-label={`${design.openingText}. Opens the wedding invitation from ${content.brideName} and ${content.groomName}.`} />
              <button type="button" className="mx-hint" onClick={open} tabIndex={-1}><span aria-hidden="true" className="mx-hint-dot" />{design.openingText}</button>
            </>
          )}

          {opened && (
            <motion.button type="button" className="mx-scroll-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              onClick={() => scroller.current?.scrollBy({ top: (scroller.current?.clientHeight ?? 600) * 0.85, behavior: "smooth" })}>
              Scroll<ChevronDown aria-hidden="true" />
            </motion.button>
          )}
        </section>

        {opened && <GatePage content={content} design={design} ids={ids} t={t} rsvp={props.rsvp} shareUrl={props.shareUrl} onReplay={reset} startOpen={startOpen} />}
      </div>

      <div className="ea-controls mx-controls">
        {phase > 0 && phase < 5 && <button type="button" className="ea-ctl" onClick={skip}><FastForward aria-hidden="true" />Skip</button>}
        {phase === 0 && <button type="button" className="ea-ctl" onClick={skip}>Skip animation</button>}
        {opened && !startOpen && <button type="button" className="ea-ctl ea-ctl--icon" onClick={reset} aria-label="Replay the opening" title="Replay"><RotateCcw aria-hidden="true" /></button>}
        {!silent && design.music !== "none" && (
          <button type="button" className="ea-ctl ea-ctl--icon" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? "Turn music on" : "Turn music off"}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
