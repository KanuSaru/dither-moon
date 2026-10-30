// <dither-moon> custom element.
//
//   <dither-moon style="width: 240px; color: #e7e2d6"></dither-moon>
//
// Attributes: date, color, pixel-size, surface, drift, speed, stars, fps,
// seed, relief, hemisphere, motion, label. All optional.

import { createMoon } from "./render.js";

const ATTRS = {
  date: "date",
  color: "color",
  "pixel-size": "pixelSize",
  surface: "surface",
  drift: "drift",
  speed: "speed",
  stars: "stars",
  fps: "fps",
  seed: "seed",
  relief: "relief",
  hemisphere: "hemisphere",
  motion: "motion",
  label: "label",
};
const NUMERIC = new Set(["speed", "stars", "fps", "seed", "relief"]);

// Lets this file be imported during server rendering, where HTMLElement doesn't exist.
const Base = typeof HTMLElement === "undefined" ? class {} : HTMLElement;

export class DitherMoonElement extends Base {
  static observedAttributes = Object.keys(ATTRS);

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = "<style>:host{display:block}canvas{display:block;max-width:100%}</style><canvas></canvas>";
    }
    this.moon = createMoon(this.shadowRoot.querySelector("canvas"), { ...this.#options(), container: this });
  }

  disconnectedCallback() {
    this.moon?.destroy();
    this.moon = null;
  }

  attributeChangedCallback() {
    this.moon?.update(this.#options());
  }

  /** The phase currently shown (see moonPhase). */
  get phase() {
    return this.moon?.phase;
  }

  #options() {
    const o = {};
    for (const [attr, key] of Object.entries(ATTRS)) {
      const v = this.getAttribute(attr);
      if (v == null || v === "") continue;
      if (key === "pixelSize") o[key] = v === "auto" ? "auto" : Number(v);
      else if (NUMERIC.has(key)) o[key] = Number(v);
      else o[key] = v;
    }
    // removed attributes go back to their defaults
    return { date: null, color: null, label: null, ...o };
  }
}

/** Register the element (once). */
export function defineDitherMoon(name = "dither-moon") {
  if (typeof customElements !== "undefined" && !customElements.get(name)) {
    customElements.define(name, class extends DitherMoonElement {});
  }
}
