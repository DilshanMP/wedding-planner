/**
 * Sound for the online invitation, made live with the Web Audio API — no
 * audio files to download and nothing copyrighted. An original music-box
 * lullaby in D major (3/4), a paper "whoosh" when the envelope opens, and
 * little bell sparkles for happy moments.
 *
 * Browsers only allow sound after a tap, so `start()` must be called from a
 * click handler.
 */

import type { InviteMusic } from "./domain/planner";

const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 3;

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Chord roots (MIDI) for 16 bars: D Bm G A | D Bm G A | D Bm G Em | D Bm A D */
const CHORDS: number[][] = [
  [50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61],
  [50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61],
  [50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [40, 47, 52, 55],
  [50, 57, 62, 66], [47, 54, 59, 62], [45, 52, 57, 61], [50, 57, 62, 66],
];

/** Melody per bar: [beat, midi, beats]. Written for this app. */
const MELODY: [number, number, number][][] = [
  [[0, 78, 2], [2, 81, 1]],
  [[0, 83, 1.5], [1.5, 81, 0.5], [2, 78, 1]],
  [[0, 79, 1], [1, 83, 1], [2, 86, 1]],
  [[0, 85, 2], [2, 81, 1]],
  [[0, 86, 1.5], [1.5, 85, 0.5], [2, 83, 1]],
  [[0, 81, 1], [1, 78, 1], [2, 74, 1]],
  [[0, 76, 1], [1, 79, 1], [2, 83, 1]],
  [[0, 81, 3]],
  [[0, 81, 2], [2, 78, 1]],
  [[0, 83, 1], [1, 85, 1], [2, 86, 1]],
  [[0, 83, 2], [2, 79, 1]],
  [[0, 76, 1], [1, 79, 1], [2, 83, 1]],
  [[0, 78, 1.5], [1.5, 79, 0.5], [2, 81, 1]],
  [[0, 86, 2], [2, 83, 1]],
  [[0, 85, 1], [1, 81, 1], [2, 76, 1]],
  [[0, 86, 3]],
];

export class InviteSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBar = 0;
  private bar = 0;
  private music: InviteMusic = "music-box";
  muted = false;

  get supported(): boolean {
    return typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (!this.supported) return null;
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // A small hall: noise that fades out, used as a reverb impulse.
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    verb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    wet.connect(verb).connect(master);
    this.ctx = ctx;
    this.master = master;
    this.wet = wet;
    return ctx;
  }

  private out(node: AudioNode) {
    node.connect(this.master!);
    node.connect(this.wet!);
  }

  /** A bell-like note: music box (bright, short) or soft piano. */
  private note(at: number, freq: number, gain: number, length: number, voice: "box" | "piano" | "bell" = "box") {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + (voice === "piano" ? 0.012 : 0.004));
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const partials: [number, number, OscillatorType][] =
      voice === "piano" ? [[1, 1, "triangle"], [2, 0.18, "sine"]]
        : voice === "bell" ? [[1, 1, "sine"], [2.76, 0.25, "sine"], [5.4, 0.08, "sine"]]
          : [[1, 1, "sine"], [2, 0.3, "sine"], [3.01, 0.12, "sine"]];
    for (const [ratio, amp, type] of partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(env);
      osc.start(at);
      osc.stop(at + length + 0.05);
    }
    if (voice === "piano") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      env.connect(lp);
      this.out(lp);
    } else this.out(env);
  }

  private scheduleBar(at: number, index: number) {
    const chord = CHORDS[index % CHORDS.length];
    const voice = this.music === "piano" ? "piano" : "box";
    const accomp = this.music === "piano" ? 0.05 : 0.035;
    // Left hand: low root, then a rolling arpeggio in eighths.
    this.note(at, midi(chord[0]), accomp * 1.6, BAR * 1.1, "piano");
    const pattern = [1, 2, 3, 2, 3, 2];
    pattern.forEach((p, i) => this.note(at + (i * BEAT) / 2, midi(chord[p] + 12), accomp, BEAT * 1.6, voice));
    for (const [beat, n, beats] of MELODY[index % MELODY.length]) {
      this.note(at + beat * BEAT, midi(n), this.music === "piano" ? 0.14 : 0.11, Math.max(0.9, beats * BEAT * 1.4), voice);
    }
  }

  private tick = () => {
    const ctx = this.ctx;
    if (!ctx || this.music === "none") return;
    while (this.nextBar < ctx.currentTime + 0.6) {
      this.scheduleBar(this.nextBar, this.bar);
      this.bar += 1;
      // A breath between verses.
      this.nextBar += this.bar % 16 === 0 ? BAR * 2 : BAR;
    }
  };

  /** Call from a tap. Starts the music (unless "none") with a gentle fade-in. */
  start(music: InviteMusic) {
    const ctx = this.ensure();
    if (!ctx) return;
    this.music = music;
    void ctx.resume();
    if (!this.muted) this.master!.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
    if (music !== "none" && !this.timer) {
      this.nextBar = ctx.currentTime + 0.9;
      this.bar = 0;
      this.timer = setInterval(this.tick, 150);
      this.tick();
    }
  }

  setMusic(music: InviteMusic) {
    this.music = music;
    if (music === "none" && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    } else if (music !== "none" && this.ctx && !this.timer) this.start(music);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    const ctx = this.ctx;
    if (!ctx) return;
    if (muted) this.master!.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    else {
      void ctx.resume();
      this.master!.gain.setTargetAtTime(0.9, ctx.currentTime, 0.3);
      if (this.nextBar < ctx.currentTime) this.nextBar = ctx.currentTime + 0.2;
    }
  }

  /** Pause while the page is hidden; carry on when it's back. */
  setHidden(hidden: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (hidden) void ctx.suspend();
    else if (!this.muted) {
      void ctx.resume().then(() => {
        if (this.nextBar < ctx.currentTime) this.nextBar = ctx.currentTime + 0.2;
      });
    }
  }

  /** Paper sliding out of the envelope. */
  whoosh() {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const at = ctx.currentTime + 0.02;
    const len = 0.7;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(500, at);
    bp.frequency.exponentialRampToValueAtTime(3200, at + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22, at + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(bp).connect(g);
    this.out(g);
    src.start(at);
  }

  /** Rising bells when the seal breaks. */
  chime() {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const at = ctx.currentTime + 0.05;
    [74, 78, 81, 86, 90, 93].forEach((n, i) => this.note(at + i * 0.08, midi(n), 0.12, 2.4, "bell"));
  }

  /** A sprinkle of high bells (RSVP sent, confetti). */
  sparkle() {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const at = ctx.currentTime + 0.02;
    const scale = [86, 88, 90, 93, 95, 98, 100];
    for (let i = 0; i < 9; i++) this.note(at + i * 0.06 + Math.random() * 0.03, midi(scale[Math.floor(Math.random() * scale.length)]), 0.06, 1.2, "bell");
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
