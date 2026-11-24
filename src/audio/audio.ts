/** Sound effects the UI can trigger. Each is a short synthesized blip, so no audio files are needed. */
export type Sfx = "build" | "wave" | "leak" | "sell" | "win" | "lose";

interface Tone {
  freq: number;
  /** Seconds to hold the tone before it fades out. */
  duration: number;
  type: OscillatorType;
  /** Delay before this tone starts, in seconds. Lets one effect play a short sequence. */
  delay?: number;
}

const SOUNDS: Record<Sfx, Tone[]> = {
  build: [{ freq: 660, duration: 0.06, type: "square" }],
  sell: [{ freq: 440, duration: 0.08, type: "triangle" }],
  wave: [{ freq: 180, duration: 0.25, type: "sawtooth" }],
  leak: [{ freq: 110, duration: 0.2, type: "sawtooth" }],
  win: [
    { freq: 523, duration: 0.15, type: "triangle" },
    { freq: 659, duration: 0.15, type: "triangle", delay: 0.15 },
    { freq: 784, duration: 0.3, type: "triangle", delay: 0.3 },
  ],
  lose: [
    { freq: 330, duration: 0.25, type: "triangle" },
    { freq: 220, duration: 0.4, type: "triangle", delay: 0.25 },
  ],
};

/**
 * Plays synthesized sound effects through WebAudio. The audio context is created lazily
 * on first use, because browsers only allow audio after a user gesture.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  play(sfx: Sfx): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (const tone of SOUNDS[sfx]) {
      const start = now + (tone.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + tone.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + tone.duration);
    }
  }

  private context(): AudioContext | null {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
}
