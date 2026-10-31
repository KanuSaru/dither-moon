export type DateInput = Date | string | number;

export interface MoonPhase {
  date: Date;
  /** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
  cycle: number;
  /** Fraction of the visible disc that is lit, 0 to 1 */
  illumination: number;
  /** Sun–Moon–Earth angle in degrees: 180 at new moon, 0 at full */
  phaseAngle: number;
  /** 0 New, 1 Waxing crescent, 2 First quarter, 3 Waxing gibbous, 4 Full, 5 Waning gibbous, 6 Last quarter, 7 Waning crescent */
  phaseIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  phaseName: string;
  waxing: boolean;
  /** Approximate days since the last new moon */
  age: number;
  distanceKm: number;
}

export declare const PHASE_NAMES: readonly string[];
export declare const SYNODIC_MONTH: number;

export declare function moonPhase(date?: DateInput): MoonPhase;
/** Next moment the Moon reaches `cycle` (0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter). */
export declare function nextPhase(cycle: number, after?: DateInput): Date;
export declare function nextFullMoon(after?: DateInput): Date;
export declare function nextNewMoon(after?: DateInput): Date;

/** Equirectangular grayscale maps, 0–255: longitude -180..180 left to right, latitude 90..-90 top to bottom. */
export interface MoonMap {
  width: number;
  height: number;
  albedo: ArrayLike<number>;
  elevation?: ArrayLike<number>;
  elevationWidth?: number;
  elevationHeight?: number;
}

export interface MoonOptions {
  /** Moment to show. Default: now, kept current. */
  date?: Date | null;
  /** Pixel color. Default: the canvas's CSS `color`. */
  color?: string | null;
  /** Screen pixels per moon pixel. Default "auto": 2 when narrow, else 3. */
  pixelSize?: number | "auto";
  /** Default "nasa". */
  surface?: "nasa" | "procedural" | MoonMap;
  /** Default "sway", a gentle libration-like wobble. */
  drift?: "sway" | "spin" | "none";
  /** Drift speed multiplier. Default 1. */
  speed?: number;
  /** Star density; 0 for none. Default 1. */
  stars?: number;
  /** Frames per second while moving. Default 9. */
  fps?: number;
  /** Varies the stars and the procedural surface. Default 0. */
  seed?: number;
  /** Crater relief strength when the surface has elevation; 0 = flat. Default 1. */
  relief?: number;
  /** "south" shows the Moon as seen from the southern hemisphere. Default "north". */
  hemisphere?: "north" | "south";
  /** "auto" respects prefers-reduced-motion. Default "auto". */
  motion?: "auto" | "always" | "never";
  /** Accessible description. Default: "<phase>, <n>% lit". */
  label?: string | null;
  /** Drag (or use arrow keys) to turn the Moon and see the far side. Default true. */
  interactive?: boolean;
  /** Seconds after letting go before it eases back to the real view; 0 = stay where left. Default 6. */
  settle?: number;
  /** Element whose width sets the size. Default: the canvas's parent. */
  container?: Element | null;
}

export interface MoonController {
  update(options: MoonOptions): void;
  readonly phase: MoonPhase;
  destroy(): void;
}

export declare function createMoon(canvas: HTMLCanvasElement, options?: MoonOptions): MoonController;

export declare function mapSampler(
  map: MoonMap,
  reliefScale?: number,
): (x: number, y: number, z: number, out: number[]) => void;
export declare function proceduralSampler(seed?: number): (x: number, y: number, z: number, out: number[]) => void;

export declare class DitherMoonElement extends HTMLElement {
  readonly phase: MoonPhase | undefined;
}
export declare function defineDitherMoon(name?: string): void;
