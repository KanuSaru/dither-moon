// <dither-moon> custom element.
//
//   <dither-moon style="width: 240px; color: #e7e2d6"></dither-moon>
//
// Attributes: date, color, pixel-size, surface, drift, speed, stars, fps,
// seed, relief, hemisphere, motion, label, interactive, settle, info, lang. All optional.
//
//   info   show the phase, % lit and next full moon under the image
//   lang   "en" or "es" for the caption; defaults to the page's language

import { createMoon } from "./render.js";
import { moonInfo } from "./info.js";

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
  interactive: "interactive",
  settle: "settle",
};
const NUMERIC = new Set(["speed", "stars", "fps", "seed", "relief", "settle"]);

// Lets this file be imported during server rendering, where HTMLElement doesn't exist.
const Base = typeof HTMLElement === "undefined" ? class {} : HTMLElement;

export class DitherMoonElement extends Base {
  static observedAttributes = [...Object.keys(ATTRS), "info", "lang"];

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML =
        "<style>:host{display:block}canvas{display:block;max-width:100%}" +
        "[part=info]{margin:.6em 0 0;font:inherit;font-size:.875em;line-height:1.35}" +
        "[part=info] span{display:block}[part=info] span:first-child{font-weight:600}</style>" +
        '<canvas></canvas><p part="info" hidden><span></span><span></span><span></span></p>';
    }
    this.moon = createMoon(this.shadowRoot.querySelector("canvas"), { ...this.#options(), container: this });
    this.#refreshInfo();
    // keep the caption current; the image updates on its own
    this.timer = setInterval(() => this.#refreshInfo(), 600_000);
  }

  disconnectedCallback() {
    this.moon?.destroy();
    this.moon = null;
    clearInterval(this.timer);
  }

  attributeChangedCallback() {
    if (!this.moon) return;
    this.moon.update(this.#options());
    this.#refreshInfo();
  }

  #lang() {
    return this.closest("[lang]")?.getAttribute("lang") || "en";
  }

  #refreshInfo() {
    const box = this.shadowRoot?.querySelector("[part=info]");
    if (!box) return;
    const on = this.hasAttribute("info") && this.getAttribute("info") !== "false";
    box.hidden = !on;
    const date = this.getAttribute("date");
    const info = moonInfo(date || undefined, this.#lang());
    if (on) {
      const [a, b, c] = box.children;
      a.textContent = info.phase;
      b.textContent = info.lit;
      c.textContent = info.next;
    }
    // describe the image in the caption's language too, unless a label was given
    if (!this.getAttribute("label")) this.moon?.update({ label: `${info.phase}, ${info.lit}` });
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
      else if (key === "interactive") o[key] = v !== "false";
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
