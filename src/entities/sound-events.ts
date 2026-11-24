/**
 * Audio cue recorded by game logic. Plain data, so the core stays headless: the audio layer
 * decides what each cue sounds like. Like `Effect`, it never changes game state.
 */
export interface SoundEvent {
  kind: "shot" | "hit" | "kill" | "spawn" | "leak";
  /** Tower type id for "shot"; creep type id for the other kinds. */
  id: string;
  /** Set on shots from splash towers, so the audio layer can add a low burst. */
  splash?: boolean;
}

/**
 * Cap on cues held between drains. The browser drains every frame, but the simulator and tests
 * never do, so the list is trimmed to keep it from growing without bound.
 */
export const MAX_SOUND_EVENTS = 64;
