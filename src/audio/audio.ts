import type { SoundEvent } from "../entities/sound-events";

/** Sound effects the UI triggers directly, from button presses and round events. */
export type Sfx = "build" | "wave" | "leak" | "sell" | "win" | "lose";

/** One oscillator tone. `sweepTo` glides the pitch across the duration. */
interface Tone {
  kind: "tone";
  type: OscillatorType;
  freq: number;
  sweepTo?: number;
  /** Seconds to hold the tone before it fades out. */
  duration: number;
  /** Peak gain before the master bus. */
  gain: number;
  /** Delay before this part starts, in seconds. Lets one effect play a short sequence. */
  delay?: number;
}

/** A short burst of filtered white noise, for clicks, sprays and thuds. */
interface Burst {
  kind: "noise";
  filter: BiquadFilterType;
  freq: number;
  q: number;
  duration: number;
  gain: number;
  delay?: number;
}

type Part = Tone | Burst;

function tone(type: OscillatorType, freq: number, duration: number, gain: number, extra: Partial<Tone> = {}): Tone {
  return { kind: "tone", type, freq, duration, gain, ...extra };
}

function burst(filter: BiquadFilterType, freq: number, duration: number, gain: number, q = 1): Burst {
  return { kind: "noise", filter, freq, q, duration, gain };
}

/** Master level. The compressor after it stops stacked sounds from clipping. */
const MASTER_GAIN = 0.8;
/** Same cue key may not replay within this many seconds. */
const COOLDOWN = 0.04;
/** Upper bound on live oscillator and noise sources. Extra cues are dropped rather than piling up. */
const MAX_SOURCES = 32;
/** Detune range for tones, in cents. 50 cents is about 3% of pitch, enough to stop repeats sounding identical. */
const JITTER_CENTS = 50;

const UI: Record<Sfx, Part[]> = {
  build: [tone("square", 660, 0.06, 0.08)],
  sell: [tone("triangle", 440, 0.08, 0.08)],
  wave: [tone("sawtooth", 180, 0.25, 0.08)],
  leak: [tone("sawtooth", 220, 0.45, 0.1, { sweepTo: 55 }), tone("square", 110, 0.45, 0.05, { sweepTo: 40 })],
  win: [
    tone("triangle", 523, 0.15, 0.08),
    tone("triangle", 659, 0.15, 0.08, { delay: 0.15 }),
    tone("triangle", 784, 0.3, 0.08, { delay: 0.3 }),
  ],
  lose: [tone("triangle", 330, 0.25, 0.08), tone("triangle", 220, 0.4, 0.08, { delay: 0.25 })],
};

/** Shot sound per tower type id. Each is short, since towers fire about once a second. */
const SHOTS: Record<string, Part[]> = {
  pellet: [tone("square", 880, 0.08, 0.06, { sweepTo: 440 })],
  squirt: [burst("bandpass", 1800, 0.12, 0.1, 2), tone("sine", 600, 0.1, 0.03, { sweepTo: 300 })],
  dart: [tone("triangle", 1400, 0.07, 0.05, { sweepTo: 2200 })],
  snap: [burst("highpass", 3000, 0.03, 0.12), tone("square", 1000, 0.02, 0.04)],
  // Swarm fires fastest, so its tick is quiet to avoid a buzz.
  swarm: [tone("square", 1800, 0.02, 0.025)],
  // Two close tones beat against each other, which gives the frost shimmer.
  frost: [tone("sine", 1200, 0.25, 0.06), tone("sine", 1208, 0.25, 0.06)],
  bash: [tone("sine", 120, 0.25, 0.14, { sweepTo: 50 })],
};
const DEFAULT_SHOT: Part[] = [tone("triangle", 600, 0.08, 0.06)];
const SPLASH_BURST = burst("lowpass", 400, 0.15, 0.08);

const HIT: Part[] = [burst("bandpass", 2000, 0.02, 0.02, 4)];

/** Death sound per creep type id. Smaller creeps sound higher, armored ones lower, and the boss booms. */
const KILLS: Record<string, Part[]> = {
  normal: [tone("sine", 520, 0.1, 0.07, { sweepTo: 260 })],
  fast: [tone("sine", 700, 0.08, 0.06, { sweepTo: 350 })],
  air: [tone("triangle", 900, 0.1, 0.06, { sweepTo: 1200 })],
  splitter: [tone("sine", 400, 0.12, 0.07, { sweepTo: 200 })],
  armored: [tone("triangle", 260, 0.14, 0.08, { sweepTo: 120 })],
  immune: [tone("sawtooth", 380, 0.12, 0.05, { sweepTo: 190 })],
  boss: [tone("sine", 90, 0.7, 0.18, { sweepTo: 40 }), burst("lowpass", 300, 0.5, 0.1)],
};
const DEFAULT_KILL: Part[] = [tone("sine", 500, 0.1, 0.07, { sweepTo: 250 })];

/** Spawn sound per creep type id. The boss gets a low horn-like rise. */
const SPAWNS: Record<string, Part[]> = {
  boss: [tone("sawtooth", 110, 0.6, 0.05, { sweepTo: 165 }), tone("square", 165, 0.6, 0.03)],
};
const DEFAULT_SPAWN: Part[] = [tone("sine", 440, 0.08, 0.04, { sweepTo: 880 })];

/** Gap between cues for the same key. Returns true while the key is still cooling down. */
export function isCoolingDown(last: number | undefined, now: number, cooldown = COOLDOWN): boolean {
  return last !== undefined && now - last < cooldown;
}

/** Gain for `count` identical cues in one frame: louder than one, but sub-linear so a crowd does not blast. */
export function batchGain(count: number): number {
  return Math.min(1, 1 / Math.sqrt(Math.max(1, count)));
}

/** Random detune in cents for one tone. `r` is a uniform value in [0, 1). */
export function jitterCents(r: number): number {
  return (r * 2 - 1) * JITTER_CENTS;
}

/** Maps a headless cue to the cooldown key and sound parts that play it. */
function recipeFor(ev: SoundEvent): { key: string; parts: Part[] } {
  switch (ev.kind) {
    case "shot":
      return {
        key: `shot:${ev.id}`,
        parts: ev.splash ? [...(SHOTS[ev.id] ?? DEFAULT_SHOT), SPLASH_BURST] : (SHOTS[ev.id] ?? DEFAULT_SHOT),
      };
    case "hit":
      return { key: "hit", parts: HIT };
    case "kill":
      return { key: `kill:${ev.id}`, parts: KILLS[ev.id] ?? DEFAULT_KILL };
    case "spawn":
      return { key: `spawn:${ev.id}`, parts: SPAWNS[ev.id] ?? DEFAULT_SPAWN };
    case "leak":
      return { key: "leak", parts: UI.leak };
  }
}

/**
 * Plays synthesized sound effects through WebAudio. The audio context is created lazily
 * on first use, because browsers only allow audio after a user gesture.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private sources = 0;
  private lastCue = new Map<string, number>();

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Plays a UI sound effect. `gain` scales it, for example when several are batched together. */
  play(sfx: Sfx, gain = 1): void {
    this.emit(sfx, UI[sfx], gain);
  }

  /** Plays one headless game cue. `count` is how many identical cues were batched into this frame. */
  cue(ev: SoundEvent, count = 1): void {
    const { key, parts } = recipeFor(ev);
    this.emit(key, parts, batchGain(count));
  }

  private emit(key: string, parts: Part[], gain: number): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx || !this.bus) return;

    const now = ctx.currentTime;
    if (isCoolingDown(this.lastCue.get(key), now)) return;
    if (this.sources + parts.length > MAX_SOURCES) return;
    this.lastCue.set(key, now);

    for (const part of parts) this.schedule(ctx, this.bus, part, now, gain);
  }

  private schedule(ctx: AudioContext, bus: AudioNode, part: Part, now: number, gain: number): void {
    const start = now + (part.delay ?? 0);
    const env = ctx.createGain();
    env.gain.setValueAtTime(part.gain * gain, start);
    env.gain.exponentialRampToValueAtTime(0.001, start + part.duration);
    env.connect(bus);

    if (part.kind === "tone") {
      const osc = ctx.createOscillator();
      osc.type = part.type;
      osc.frequency.setValueAtTime(part.freq, start);
      if (part.sweepTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(part.sweepTo, start + part.duration);
      }
      osc.detune.value = jitterCents(Math.random());
      osc.connect(env);
      this.track(osc, start, part.duration);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = part.filter;
      filter.frequency.value = part.freq;
      filter.Q.value = part.q;
      src.connect(filter).connect(env);
      // Start at a random point in the noise buffer so each burst sounds different.
      this.track(src, start, part.duration, Math.random() * 0.5);
    }
  }

  private track(node: AudioScheduledSourceNode, start: number, duration: number, offset?: number): void {
    this.sources += 1;
    node.onended = () => {
      this.sources -= 1;
    };
    if (node instanceof AudioBufferSourceNode && offset !== undefined) {
      node.start(start, offset);
    } else {
      node.start(start);
    }
    node.stop(start + duration);
  }

  private context(): AudioContext | null {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        const bus = ctx.createGain();
        bus.gain.value = MASTER_GAIN;
        bus.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
        this.noise = makeNoise(ctx);
        this.bus = bus;
        this.ctx = ctx;
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
}

/** One second of white noise, shared by every burst. */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
