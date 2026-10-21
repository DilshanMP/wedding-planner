"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, FastForward, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { ADDRESS_TEXT, FONTS, readableOn, type GuestLanguage } from "@/lib/domain/invite-studio";
import { localise, shortDate, words } from "@/lib/domain/invite-i18n";
import { InviteSound } from "@/lib/invite-sound";
import { mix } from "@/lib/theme-colors";
import { CrystalBackdrop, GateDefs, RibbonBand, RibbonBow, Sparkle, gateTints, useGateIds } from "./gate-art";
import { GatePage } from "./gate-page";
import { LangToggle } from "./lang-toggle";
import type { ExperienceProps } from "./invitation-experience";

/**
 * "Garden gate" opening, on photographic sculpted-plaster art. A tap unties
 * the silk ribbon (petals burst upward), the carved doors swing open onto a
 * floral arch, the camera moves in on the card, then two gold rings rise in
 * a beam of golden light. Below it the invitation continues.
 *
 * Art (public/everafter/gate) was generated for this app and is tinted with
 * the design colours on top.
 */

type Phase = 0 | 1 | 2 | 3 | 4 | 5;
// 0 tied · 1 ribbon + petals · 2 doors open · 3 card (camera in) · 4 rings rise · 5 open (scroll)

const ART = "/everafter/gate";
// The stage art is 768 × 1376; the blank panel sits at x 256–512, y 530–925.
const W = 768;
const H = 1376;
const CX = 384;
const RINGS_Y = 418;

const PRESET_PACE = { gentle: 1.2, cinematic: 1.08, swift: 0.72, royal: 1.02 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;
const EASE_DOOR = [0.6, 0, 0.25, 1] as const;

const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const PETALS = Array.from({ length: 44 }, (_, i) => ({
  dx: (rnd(i, 1) - 0.5) * 130,
  rise: 50 + rnd(i, 2) * 50,
  rot: (rnd(i, 3) - 0.5) * 540,
  size: 18 + rnd(i, 4) * 18,
  delay: rnd(i, 5) * 0.9,
  dur: 3.4 + rnd(i, 6) * 2,
  hue: rnd(i, 7),
}));
const DRIFT = Array.from({ length: 12 }, (_, i) => ({ left: rnd(i, 8) * 100, size: 16 + rnd(i, 9) * 14, delay: rnd(i, 10) * 9, dur: 9 + rnd(i, 11) * 7 }));
const TWINKLES = Array.from({ length: 16 }, (_, i) => ({ left: (i * 61) % 100, top: (i * 37 + 11) % 100, d: (i * 0.53) % 4, s: 6 + (i % 4) * 3 }));
const GLINTS = Array.from({ length: 9 }, (_, i) => ({ left: 12 + ((i * 47) % 76), top: 8 + ((i * 29) % 70), d: (i * 0.7) % 4, s: 8 + (i % 3) * 4 }));

function Petal({ color, edge }: { color: string; edge: string }) {
  return (
    <svg viewBox="0 0 20 24" aria-hidden="true">
      <path d="M10 1C15 5 19 11 17 17C15 22 5 22 3 17C1 11 5 5 10 1Z" fill={color} />
      <path d="M10 1C15 5 19 11 17 17C16 19.5 13 21 10 21C12 15 12.5 8 10 1Z" fill="#000" opacity="0.1" />
      <path d="M8.5 4C6 8 5 12 6 16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M10 3C11 9 10.5 15 9 21" stroke={edge} strokeWidth="0.6" fill="none" opacity="0.6" />
    </svg>
  );
}

export function GateExperience(props: ExperienceProps) {
  const { design, guestName, addressee, framed, startOpen, silent, onOpen } = props;
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(startOpen ? 5 : 0);
  const [muted, setMuted] = useState(Boolean(silent));
  const [lang, setLang] = useState<GuestLanguage>(design.language ?? "en");
  const w = words(lang);
  const content = localise(props.content, design.closingMessage, lang).content;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sound = useRef<InviteSound | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ids = useGateIds();
  const c = design.colors;
  const t = useMemo(() => gateTints(c), [c]);
  const pace = PRESET_PACE[design.animation.preset] / Math.min(2, Math.max(0.5, design.animation.speed || 1));
  const T = { ribbon: 1.1 * pace, doors: 2.8 * pace, card: 3.4 * pace, rings: 2.6 * pace };

  const modern = design.addressing !== "name" || !guestName;
  const kind = addressee ?? (guestName ? "you" : design.publicAddress !== "none" ? design.publicAddress : null);
  const to = modern ? (kind ? ADDRESS_TEXT[kind][lang] : null) : guestName ?? null;
  const script = FONTS[design.fonts.names].family;
  const head = lang === "si" ? "'Abhaya Libre', 'Noto Serif Sinhala', serif" : FONTS[design.fonts.headings].family;
  const body = lang === "si" ? "'Abhaya Libre', 'Noto Serif Sinhala', serif" : FONTS[design.fonts.body].family;
  const nameSize = (n: string) => Math.max(34, Math.min(64, 540 / Math.max(6, n.length * 0.55)));
  const tint = mix(c.floralA, "#ffffff", 0.15);
  const petal = [c.floralA, mix(c.floralA, c.seal, 0.35), mix(c.floralA, "#ffffff", 0.3), mix(c.floralA, "#8a3442", 0.3)];

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
    const doors = T.ribbon * 0.9;
    const card = doors + T.doors * 0.8;
    const rings = card + T.card;
    at(doors, () => {
      setPhase(2);
      if (!silent) sound.current?.whoosh();
    });
    at(card, () => setPhase(3));
    at(rings, () => {
      setPhase(4);
      if (!silent) sound.current?.sparkle();
    });
    at(rings + T.rings, () => setPhase(5));
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
    "--mx-ink": mix(c.ink, "#000000", 0.25),
    "--mx-accent": c.accent,
    "--mx-card": c.card,
    "--mx-soft": mix(c.ink, c.card, 0.22),
    "--mx-line": mix(c.accent, c.card, 0.45),
    "--mx-glow": mix(c.accent, "#fff3d6", 0.55),
    "--mx-tint-color": tint,
    "--mx-script": script,
    "--mx-head": head,
    "--mx-body": body,
    "--ea-bg": c.background,
    "--ea-on-bg": readableOn(c.background),
    "--ea-card": c.card,
    "--ea-ink": mix(c.ink, "#000000", 0.25),
    "--ea-accent": c.accent,
    "--ea-soft": mix(c.floralA, c.card, 0.6),
    "--ea-names": script,
    "--ea-head": head,
    "--ea-body": body,
  }) as CSSProperties, [c, tint, script, head, body]);

  const opened = phase === 5;
  const show = (p: Phase) => phase >= p;
  const instant = reduce || startOpen;
  const ink = mix(c.ink, "#000000", 0.3);
  // Camera: move in on the card while it is read, ease back for the rings.
  const camera = phase === 3 ? { scale: 1.2, y: "-3%" } : phase === 4 ? { scale: 1.06, y: "0%" } : { scale: 1, y: "0%" };

  return (
    <div className={`mx-root${framed ? " mx-root--framed" : ""}${lang === "si" ? " is-si" : ""}`} style={vars} data-phase={phase} lang={lang}>
      <div className="mx-crystal" aria-hidden="true">
        <CrystalBackdrop c={c} />
        <div className="mx-prism" />
        {TWINKLES.map((s, i) => (
          <svg key={i} className="mx-twinkle" viewBox="-10 -10 20 20" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}><Sparkle x={0} y={0} s={9} /></svg>
        ))}
      </div>
      <svg width="0" height="0" className="mx-defs" aria-hidden="true"><GateDefs ids={ids} t={t} /></svg>

      <div ref={scroller} className="mx-scroll" style={{ overflowY: opened ? "auto" : "hidden" }}>
        <section className="mx-hero" aria-label={`${content.brideName} & ${content.groomName}`}>
          <motion.div className="mx-camera" initial={false} animate={camera} transition={{ duration: instant ? 0 : phase === 3 ? T.card * 0.6 : 1.4, ease: EASE }}>
            <div className="mx-stage">
              {/* eslint-disable-next-line @next/next/no-img-element -- static art, sized by CSS */}
              <img src={`${ART}/stage.webp`} alt="" className="mx-fill" draggable={false} />
              <div className="mx-tint" aria-hidden="true" />
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="mx-overlay" aria-hidden="true">
                {/* Golden light rising behind the card */}
                <motion.g initial={false} animate={show(4) ? { opacity: phase === 4 ? 1 : 0.6, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
                  transition={{ duration: instant ? 0 : T.rings * 0.5, ease: EASE }} style={{ transformBox: "view-box", transformOrigin: `${CX}px ${H}px`, mixBlendMode: "screen" }}>
                  <rect x={CX - 150} y="200" width="300" height={H - 200} fill={`url(#${ids.beam})`} filter={`url(#${ids.blurWide})`} />
                  <rect x={CX - 40} y="220" width="80" height={H - 220} fill={`url(#${ids.beam})`} filter={`url(#${ids.blur})`} />
                  <rect x={CX - 10} y="240" width="20" height={H - 240} fill={`url(#${ids.beam})`} opacity="0.9" />
                </motion.g>

                {/* Card text on the blank panel */}
                {[
                  <text key="k" x={CX} y="588" textAnchor="middle" fontFamily={head} fontSize={lang === "si" ? 21 : 15} fontWeight="700" letterSpacing={lang === "si" ? 0.5 : 3.2} fill={ink}>{lang === "si" ? w.gettingMarried : w.gettingMarried.toUpperCase()}</text>,
                  <text key="b" x={CX} y="672" textAnchor="middle" fontFamily={script} fontSize={nameSize(content.brideName)} fill={ink}>{content.brideName}</text>,
                  <text key="a" x={CX} y="716" textAnchor="middle" fontFamily={script} fontSize="34" fill={c.accent}>&amp;</text>,
                  <text key="g" x={CX} y="772" textAnchor="middle" fontFamily={script} fontSize={nameSize(content.groomName)} fill={ink}>{content.groomName}</text>,
                  <g key="d"><path d={`M${CX - 70} 812H${CX - 12}M${CX + 12} 812H${CX + 70}`} stroke={c.accent} strokeWidth="1.6" /><path d={`M${CX} 805L${CX + 7} 812L${CX} 819L${CX - 7} 812Z`} fill={c.accent} /></g>,
                  <text key="t" x={CX} y="856" textAnchor="middle" fontFamily={head} fontSize={lang === "si" ? 22 : 18} fontWeight="700" letterSpacing={lang === "si" ? 0.5 : 3.6} fill={ink}>{shortDate(content.date, lang)}</text>,
                  <text key="v" x={CX} y="892" textAnchor="middle" fontFamily={head} fontSize={lang === "si" ? 19 : 17} fontStyle={lang === "si" ? undefined : "italic"} fontWeight="600" fill={ink} opacity="0.9">{content.venueName}</text>,
                ].map((el, i) => (
                  <motion.g key={i} initial={false} animate={show(3) ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                    transition={{ duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.35 + i * 0.2 * pace, ease: EASE }}>
                    {el}
                  </motion.g>
                ))}

                {/* Halo and the rings */}
                <motion.circle cx={CX} cy={RINGS_Y} r="190" fill={`url(#${ids.halo})`} initial={false}
                  animate={show(4) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }} transition={{ duration: instant ? 0 : T.rings * 0.7, delay: instant ? 0 : T.rings * 0.3 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center", mixBlendMode: "screen" }} />
                <g transform={`translate(${CX} ${RINGS_Y})`}>
                  <motion.g initial={false} animate={show(4) ? { y: 0, opacity: 1, rotate: 0, scale: 1 } : { y: 900, opacity: 0, rotate: -18, scale: 0.6 }}
                    transition={{ duration: instant ? 0 : T.rings, ease: EASE }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                    <g className={opened ? "mx-ring-float" : undefined}>
                      <image href={`${ART}/rings.webp`} x="-74" y="-87" width="148" height="174" />
                    </g>
                  </motion.g>
                  {show(4) && [[-92, -60, 12, 0], [96, -72, 10, 0.6], [-70, 70, 9, 1.1], [80, 62, 11, 0.3], [0, -118, 14, 0.9], [120, 6, 8, 1.4], [-124, 4, 8, 1.8]].map(([x, y, s, d], i) => (
                    <Sparkle key={i} x={x} y={y} s={s} className="mx-spark" style={{ animationDelay: `${d + (instant ? 0 : T.rings * 0.6)}s` }} />
                  ))}
                </g>
              </svg>
            </div>
          </motion.div>

          {/* Crystal glints over the scene */}
          <div className="mx-glints" aria-hidden="true">
            {GLINTS.map((s, i) => (
              <svg key={i} className="mx-twinkle" viewBox="-10 -10 20 20" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}><Sparkle x={0} y={0} s={9} /></svg>
            ))}
          </div>

          {/* Doors: the generated art split down the middle */}
          <div className="mx-doors" aria-hidden={phase >= 3}>
            {(["l", "r"] as const).map((side) => (
              <motion.div key={side} className={`mx-door mx-door--${side}`} initial={false}
                animate={show(2) ? { rotateY: side === "l" ? -82 : 82, opacity: phase >= 3 ? 0 : 1 } : { rotateY: 0, opacity: 1 }}
                transition={{ rotateY: { duration: instant ? 0 : T.doors, ease: EASE_DOOR }, opacity: { duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.2 } }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static art, sized by CSS */}
                <img src={`${ART}/doors.webp`} alt="" className={`mx-door-img mx-door-img--${side}`} draggable={false} />
                <div className="mx-tint" />
                <div className={`mx-door-shade mx-door-shade--${side}`} />
              </motion.div>
            ))}
          </div>

          {/* Ribbon */}
          {phase < 3 && (
            <div className="mx-ribbon" aria-hidden="true">
              <motion.div className="mx-band mx-band--l" initial={false} animate={show(1) ? { x: "-75%", y: 160, rotate: -16, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: instant ? 0 : T.ribbon * 1.3, ease: [0.5, 0, 0.75, 0.4] }}>
                <RibbonBand ids={ids} t={t} half="left" />
              </motion.div>
              <motion.div className="mx-band mx-band--r" initial={false} animate={show(1) ? { x: "75%", y: 180, rotate: 14, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: instant ? 0 : T.ribbon * 1.3, ease: [0.5, 0, 0.75, 0.4] }}>
                <RibbonBand ids={ids} t={t} half="right" />
              </motion.div>
              <motion.div className="mx-bow" initial={false} animate={show(1) ? { scale: 0.3, y: -40, rotate: 20, opacity: 0 } : { scale: 1, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: instant ? 0 : T.ribbon, ease: [0.45, 0, 0.7, 0.5] }}>
                <RibbonBow ids={ids} t={t} />
              </motion.div>
            </div>
          )}

          {/* Petals burst upward as the ribbon unties, then drift down softly */}
          {show(1) && !instant && phase < 5 && (
            <div className="mx-petals" aria-hidden="true">
              {PETALS.map((p, i) => (
                <span key={i} className="mx-petal" style={{ "--dx": `${p.dx}vw`, "--rise": `${p.rise}dvh`, "--rot": `${p.rot}deg`, width: p.size, height: p.size * 1.2, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` } as CSSProperties}>
                  <Petal color={petal[Math.floor(p.hue * petal.length)]} edge={c.ink} />
                </span>
              ))}
            </div>
          )}
          {show(2) && (
            <div className="mx-drift" aria-hidden="true">
              {DRIFT.map((p, i) => (
                <span key={i} className="mx-drift-petal" style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.2, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
                  <Petal color={petal[i % petal.length]} edge={c.ink} />
                </span>
              ))}
            </div>
          )}

          {phase === 0 && (
            <>
              {to && (
                <p className={`mx-to${modern ? " mx-to--modern" : ""}`}>
                  {modern ? <>{w.invitationFor}<b>{to}</b></> : <>{w.dear} <b>{to}</b></>}
                </p>
              )}
              <button type="button" className="mx-tap" onClick={open} aria-label={`${lang === "si" ? w.tapToOpen : design.openingText} — ${content.brideName} & ${content.groomName}`} />
              <div className="mx-hint-wrap">
                <button type="button" className="mx-hint" onClick={open} tabIndex={-1}><span aria-hidden="true" className="mx-hint-dot" />{lang === "si" ? w.tapToOpen : design.openingText}</button>
                <LangToggle lang={lang} onChange={setLang} />
              </div>
            </>
          )}

          {opened && (
            <motion.button type="button" className="mx-scroll-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              onClick={() => scroller.current?.scrollBy({ top: (scroller.current?.clientHeight ?? 600) * 0.85, behavior: "smooth" })}>
              {w.scroll}<ChevronDown aria-hidden="true" />
            </motion.button>
          )}
        </section>

        {opened && <GatePage content={props.content} design={design} ids={ids} t={t} lang={lang} rsvp={props.rsvp} shareUrl={props.shareUrl} onReplay={reset} startOpen={startOpen} />}
      </div>

      <div className="ea-controls mx-controls">
        {opened && <LangToggle lang={lang} onChange={setLang} className="inv-lang--sm" />}
        {phase > 0 && phase < 5 && <button type="button" className="ea-ctl" onClick={skip}><FastForward aria-hidden="true" />{w.skipShort}</button>}
        {phase === 0 && <button type="button" className="ea-ctl" onClick={skip}>{w.skip}</button>}
        {opened && !startOpen && <button type="button" className="ea-ctl ea-ctl--icon" onClick={reset} aria-label={w.replay} title={w.replay}><RotateCcw aria-hidden="true" /></button>}
        {!silent && design.music !== "none" && (
          <button type="button" className="ea-ctl ea-ctl--icon" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? w.musicOn : w.musicOff}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
