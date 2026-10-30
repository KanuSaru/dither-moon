import type { CSSProperties, ReactElement } from "react";
import type { DateInput, MoonOptions } from "./index.js";

export interface DitherMoonProps extends Omit<MoonOptions, "date" | "container"> {
  className?: string;
  style?: CSSProperties;
  /** Moment to show. Default: now, kept current. */
  date?: DateInput | null;
}

export declare function DitherMoon(props: DitherMoonProps): ReactElement;
