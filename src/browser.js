// Entry for dist/dither-moon.js: registers <dither-moon> and exposes window.DitherMoon.
import * as DitherMoon from "./index.js";

DitherMoon.defineDitherMoon();
if (typeof window !== "undefined") window.DitherMoon = DitherMoon;
