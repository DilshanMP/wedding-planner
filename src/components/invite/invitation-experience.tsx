"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { FastForward, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { ADDRESS_TEXT, FONTS, readableOn, type AddressKind, type GuestLanguage, type InviteContent, type InviteDesign } from "@/lib/domain/invite-studio";
import { words } from "@/lib/domain/invite-i18n";
import { LangToggle } from "./lang-toggle";
import { InviteSound } from "@/lib/invite-sound";
import { mix } from "@/lib/theme-colors";
import { Ambience } from "./ambience";
import { EnvelopeBack, EnvelopePocket, FLAP_SHARE, FlapFace, SEAL_AT, SealArt } from "./envelope-parts";
import { InviteCard } from "./invite-card";
import { InvitationPage, type RsvpHandler } from "./invitation-page";
import { GateExperience } from "./gate-experience";

/**
 * The signature moment. A sealed envelope floats in soft light; one tap
 * breaks the seal, the flap turns back in 3D, the card rises out of the
 * pocket and comes forward, and the full invitation unfolds beneath it.
 *
 * Layers, back to front: envelope back (with liner) · card · pocket · flap ·
 * seal. Respects reduced motion (goes straight to the invitation), and can
 * be skipped or replayed.
 */

type Phase = 0 | 1 | 2 | 3 | 4 | 5;
// 0 sealed · 1 seal breaks · 2 flap opens · 3 card rises · 4 card comes forward · 5 invitation

const PRESET_PACE: Record<InviteDesign["animation"]["preset"], number> = { gentle: 1.3, cinematic: 1.15, swift: 0.7, royal: 1.1 };
const BASE = { seal: 0.55, flap: 0.9, rise: 1.05, present: 0.95 };
const EASE_SOFT = [0.22, 1, 0.36, 1] as const;
const EASE_PAPER = [0.65, 0, 0.35, 1] as const;

export interface ExperienceProps {
  content: InviteContent;
  design: InviteDesign;
  /** The guest's name, for personal links ("Dear …" when the design addresses guests by name). */
  guestName?: string;
  /** "You", "You Both" or "You & Your Family" — personal links and, if the design says so, the shared link. */
  addressee?: AddressKind;
  rsvp?: RsvpHandler;
  /** Link guests share (published URL). */
  shareUrl?: string;
  /** Inside a frame in the editor rather than the whole screen. */
  framed?: boolean;
  /** Start opened (editor "Invitation" tab, screenshots). */
  startOpen?: boolean;
  /** Mute music (editor preview). */
  silent?: boolean;
  onOpen?: () => void;
}

/** Envelope or garden-gate opening, as the design chooses. */
export function InvitationExperience(props: ExperienceProps) {
  return props.design.opening === "gate" ? <GateExperience {...props} /> : <EnvelopeExperience {...props} />;
}

function EnvelopeExperience(props: ExperienceProps) {
  const { content, design, guestName, addressee, framed, startOpen, silent, onOpen } = props;
  const [lang, setLang] = useState<GuestLanguage>(design.language ?? "en");
  const w = words(lang);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(startOpen ? 5 : 0);
  const [muted, setMuted] = useState(Boolean(silent));
  type Box = { left: number; top: number; width: number };
  const [present, setPresent] = useState<{ from: Box; to: Box } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sound = useRef<InviteSound | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const c = design.colors;
  const pace = PRESET_PACE[design.animation.preset] / Math.min(2, Math.max(0.5, design.animation.speed || 1));
  const T = { seal: BASE.seal * pace, flap: BASE.flap * pace, rise: BASE.rise * pace, present: BASE.present * pace };

  // Gentle 3D tilt that follows the pointer while the envelope waits.
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rx = useSpring(tiltX, { stiffness: 120, damping: 14 });
  const ry = useSpring(tiltY, { stiffness: 120, damping: 14 });

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reset = useCallback(() => {
    clear();
    setPresent(null);
    setPhase(startOpen ? 5 : 0);
    scroller.current?.scrollTo({ top: 0 });
  }, [startOpen]);

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
    at(T.seal * 0.7, () => {
      setPhase(2);
      if (!silent) sound.current?.whoosh();
    });
    at(T.seal * 0.7 + T.flap, () => {
      setPhase(3);
      if (!silent) sound.current?.whoosh();
    });
    at(T.seal * 0.7 + T.flap + T.rise, () => {
      const from = cardRef.current?.getBoundingClientRect();
      const box = root.current?.getBoundingClientRect();
      if (from && box) {
        const width = Math.min(box.width * 0.9, 460);
        // Positions relative to the experience, so it also works inside a frame.
        setPresent({
          from: { left: from.left - box.left, top: from.top - box.top, width: from.width },
          to: { left: (box.width - width) / 2, top: Math.max(28, box.height * 0.06), width },
        });
      }
      setPhase(4);
      if (!silent) sound.current?.sparkle();
    });
    at(T.seal * 0.7 + T.flap + T.rise + T.present, () => {
      setPhase(5);
      setPresent(null);
    });
  };

  const skip = () => {
    clear();
    setPresent(null);
    if (phase === 0) onOpen?.();
    setPhase(5);
  };

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
    "--ea-bg": c.background,
    "--ea-on-bg": readableOn(c.background),
    "--ea-card": c.card,
    "--ea-ink": c.ink,
    "--ea-accent": c.accent,
    "--ea-soft": mix(c.floralA, c.card, 0.6),
    "--ea-glow": mix(c.accent, "#fff3d6", 0.5),
    "--ea-names": FONTS[design.fonts.names].family,
    "--ea-head": FONTS[design.fonts.headings].family,
    "--ea-body": FONTS[design.fonts.body].family,
    "--ea-env-w": "min(78vw, 37dvh, 400px)",
  }) as CSSProperties, [c, design.fonts]);

  const sealTop = SEAL_AT[design.envelope.flap];
  const couple = `${content.brideName} & ${content.groomName}`;
  const scriptFont = FONTS[design.fonts.names].family;
  // "You / You Both / You & Your Family" in a clean modern face, or the guest's name in script.
  const modern = design.addressing !== "name" || !guestName;
  const kind = addressee ?? (guestName ? "you" : design.publicAddress !== "none" ? design.publicAddress : null);
  const to = modern ? (kind ? ADDRESS_TEXT[kind][lang] : null) : guestName ?? null;
  const opened = phase >= 5;

  return (
    <div ref={root} className={`ea-root${framed ? " ea-root--framed" : ""} ea-preset--${design.animation.preset}${lang === "si" ? " is-si" : ""}`} style={vars} data-phase={phase}>
      <div className="ea-light" aria-hidden="true" />
      <Ambience kind={design.ambience} c={c} />
      <div ref={scroller} className="ea-scroll">
        {!opened ? (
          <div className="ea-stage"
            onPointerMove={(e) => {
              if (phase !== 0 || e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 10);
              tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
            }}
            onPointerLeave={() => {
              tiltX.set(0);
              tiltY.set(0);
            }}>
            <motion.p className={`ea-greeting${to && modern ? " ea-greeting--modern" : ""}`} animate={{ opacity: phase === 0 ? 1 : 0, y: phase === 0 ? 0 : -12 }} transition={{ duration: 0.5 }}>
              {to ? (modern ? <>{w.invitationFor}<b className="ea-to">{to}</b></> : <>{w.dear} <b>{to}</b></>) : <>{couple}</>}
            </motion.p>

            <motion.div className="ea-camera" animate={{ scale: design.animation.preset === "cinematic" && phase >= 3 ? 1.06 : 1 }} transition={{ duration: T.rise * 1.4, ease: EASE_SOFT }}>
              <motion.div className="ea-env-wrap"
                style={{ rotateX: rx, rotateY: ry }}
                animate={phase >= 4 ? { y: "70%", opacity: 0, scale: 0.94 } : phase >= 3 ? { y: "34%", opacity: 1, scale: 1 } : { y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: phase >= 4 ? T.present * 0.8 : T.rise, ease: EASE_SOFT }}>
                <button type="button" className="ea-env" onClick={open} disabled={phase !== 0}
                  aria-label={`${design.openingText}. Opens the wedding invitation from ${couple}.`}>
                  <span className="ea-env-shadow" aria-hidden="true" />
                  <span className="ea-part ea-back"><EnvelopeBack c={c} texture={design.envelope.texture} liner={design.envelope.liner} /></span>

                  <motion.span ref={cardRef} className="ea-part ea-card-slot"
                    animate={phase >= 3 ? { y: "-74%", scale: 1.02 } : { y: "0%", scale: 1 }}
                    transition={{ duration: T.rise, ease: EASE_SOFT }}
                    style={{ opacity: phase >= 4 ? 0 : 1 }}>
                    <InviteCard content={content} design={design} className="ea-card-svg" />
                  </motion.span>

                  <span className="ea-part ea-pocket"><EnvelopePocket c={c} texture={design.envelope.texture} flap={design.envelope.flap} guestName={to ?? undefined} couple={to ? couple : undefined} font={modern ? FONTS.jost.family : scriptFont} modern={modern} /></span>

                  <motion.span className="ea-flap" style={{ height: `${FLAP_SHARE * 100}%`, zIndex: phase >= 3 ? 1 : 4 }}
                    animate={{ rotateX: phase >= 2 ? 178 : 0 }} transition={{ duration: T.flap, ease: EASE_PAPER }}>
                    <span className="ea-face ea-face--front"><FlapFace c={c} flap={design.envelope.flap} texture={design.envelope.texture} liner={design.envelope.liner} /></span>
                    <span className="ea-face ea-face--inner"><FlapFace c={c} flap={design.envelope.flap} texture={design.envelope.texture} liner={design.envelope.liner} inner /></span>
                  </motion.span>

                  {design.seal.style !== "none" && (
                    <span className="ea-seal" style={{ top: `${sealTop * 100}%` }}>
                      {phase === 0 && <span className="ea-seal-ring" aria-hidden="true" />}
                      {(["left", "right"] as const).map((half) => (
                        <motion.span key={half} className={`ea-seal-half ea-seal-half--${half}`}
                          animate={phase >= 1 ? { x: half === "left" ? -34 : 34, y: 26, rotate: half === "left" ? -24 : 24, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                          transition={{ duration: T.seal, ease: "easeOut" }}>
                          <SealArt style={design.seal.style} color={c.seal} text={design.seal.text} font={scriptFont} accent={c.accent} />
                        </motion.span>
                      ))}
                      {phase === 1 && Array.from({ length: 10 }, (_, i) => (
                        <motion.i key={i} className="ea-crumb" style={{ background: c.seal }}
                          initial={{ x: 0, y: 0, opacity: 1 }}
                          animate={{ x: Math.cos(i * 0.63) * (40 + (i % 3) * 14), y: Math.sin(i * 0.63) * 30 + 40, opacity: 0, rotate: i * 40 }}
                          transition={{ duration: T.seal * 1.2, ease: "easeOut" }} />
                      ))}
                    </span>
                  )}
                  {design.animation.preset === "cinematic" && phase >= 2 && <span className="ea-sweep" aria-hidden="true" />}
                  {design.animation.preset === "royal" && phase === 1 && <span className="ea-glint" aria-hidden="true" />}
                </button>
              </motion.div>
            </motion.div>

            <motion.button type="button" className="ea-hint" onClick={open} animate={{ opacity: phase === 0 ? 1 : 0 }} transition={{ duration: 0.4 }} tabIndex={phase === 0 ? 0 : -1}>
              <span className="ea-hint-dot" aria-hidden="true" />{lang === "si" ? w.tapToOpen : design.openingText}
            </motion.button>
            {phase === 0 && <LangToggle lang={lang} onChange={setLang} className="ea-lang" />}
          </div>
        ) : (
          <InvitationPage {...props} lang={lang} onReplay={reset} />
        )}
      </div>

      {present && (
        <motion.div className="ea-present"
          initial={present.from}
          animate={present.to}
          transition={{ duration: T.present, ease: EASE_SOFT }}>
          <InviteCard content={content} design={design} className="ea-card-svg" />
        </motion.div>
      )}

      <div className="ea-controls">
        {phase > 0 && phase < 5 && <button type="button" className="ea-ctl" onClick={skip}><FastForward aria-hidden="true" />{w.skipShort}</button>}
        {phase === 0 && <button type="button" className="ea-ctl" onClick={skip}>{w.skip}</button>}
        {opened && <LangToggle lang={lang} onChange={setLang} className="inv-lang--sm" />}
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
