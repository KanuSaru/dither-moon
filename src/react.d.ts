import type { CSSProperties, ReactElement } from "react";
import type { DateInput, MoonOptions } from "./index.js";

export interface DitherMoonProps extends Omit<MoonOptions, "date" | "container"> {
  className?: string;
  style?: CSSProperties;
  /** Moment to show. Default: now, kept current. */
  date?: DateInput | null;
  /** Show the phase, % lit and next full moon under the image (in a <p class="dither-moon-info">). */
  info?: boolean;
  /** Caption language: "en" (default) or "es". */
  lang?: string;
}

export declare function DitherMoon(props: DitherMoonProps): ReactElement;
