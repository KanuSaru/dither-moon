// Draws the Moon into a canvas as 1-bit pixel art: a lit sphere at the real
// phase, textured, then ordered-dithered. Returns a small controller.

import { moonPhase } from "./phase.js";
import { hash, mapSampler, proceduralSampler } from "./surface.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const DEG = Math.PI / 180;

const DEFAULTS = {
  date: null, // null = now, kept current
  color: null, // null = the canvas's CSS `color`
  pixelSize: "auto", // screen pixels per moon pixel; "auto" = 2 when small, else 3
  surface: "nasa", // "nasa" | "procedural" | a map object (see mapSampler)
  drift: "sway", // "sway" (gentle libration-like wobble) | "spin" | "none"
  speed: 1,
  stars: 1, // star density; 0 = none
  fps: 9,
  seed: 0, // varies the stars and the procedural surface
  relief: 1, // crater relief strength when the surface has elevation; 0 = flat
  hemisphere: "north", // "south" shows the Moon the way it looks from the southern hemisphere
  motion: "auto", // "auto" respects prefers-reduced-motion; "always" | "never"
  label: null, // accessible description; null = "<phase>, <n>% lit"
  container: null, // element whose width sets the size; default: the canvas's parent
};

/** Load a named surface. "nasa" is loaded on demand, so it costs nothing until used. */
async function resolveSurface(surface, seed, relief) {
  if (surface && typeof surface === "object") return mapSampler(surface, 0.05 * relief);
  if (surface === "nasa") {
    const { loadNasaSurface } = await import("./nasa.js");
    return mapSampler(await loadNasaSurface(), 0.05 * relief);
  }
  return proceduralSampler(seed);
}

function parseColor(css) {
  const s = (css || "").trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = s.match(/^#([0-9a-f]{6})/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [m[1], m[2], m[3]].map((n) => Math.round(Number(n)));
  return [230, 226, 214];
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Partial<typeof DEFAULTS>} [options]
 */
export function createMoon(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("dither-moon: canvas 2D is not available");

  let opts = { ...DEFAULTS, ...options };
  let sampler = null;
  let surfaceKey = null;
  let S = 0;
  let image = null;
  let stars = [];
  let timer = 0;
  let visible = true;
  let destroyed = false;
  let lastLabel = "";
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const out = [0, 0, 0];

  canvas.setAttribute("role", "img");
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";
  canvas.style.imageRendering = "pixelated";

  const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const animated = () =>
    opts.motion === "always" || (opts.motion !== "never" && !(reduce && reduce.matches));
  const box = () => opts.container || canvas.parentElement || canvas;

  function setup() {
    const width = box().clientWidth;
    if (!width) return false;
    const px = opts.pixelSize === "auto" ? (width < 260 ? 2 : 3) : Math.max(1, Number(opts.pixelSize) || 3);
    const size = Math.max(24, Math.floor(width / px));
    if (size !== S || !image) {
      S = size;
      canvas.width = S;
      canvas.height = S;
      image = ctx.createImageData(S, S);
    }
    canvas.style.width = `${S * px}px`;
    canvas.style.height = `${S * px}px`;
    stars = [];
    const want = Math.round(S * 0.35 * Math.max(0, Number(opts.stars) || 0));
    const r = S * 0.4;
    for (let k = 0; stars.length < want && k < 6000; k++) {
      const x = Math.floor(hash(k, 7, opts.seed + 1) * S);
      const y = Math.floor(hash(k, 3, opts.seed + 9) * S);
      if (Math.hypot(x - S / 2, y - S / 2) > r + 4) stars.push({ x, y, b: hash(k, 1, opts.seed + 4) });
    }
    return true;
  }

  function draw() {
    if (destroyed || !sampler || !image) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const t = animated() ? (now - start) / 1000 : 0;
    const phase = moonPhase(opts.date ?? new Date());
    const ink = parseColor(opts.color || getComputedStyle(canvas).color);

    // sunlight direction in view space (x right, y up, z toward the viewer)
    const i = phase.phaseAngle * DEG;
    const theta = phase.waxing ? Math.PI - i : Math.PI + i;
    const Lx = Math.sin(theta), Lz = -Math.cos(theta);

    // which way the surface is turned
    const sp = Number(opts.speed) || 0;
    let yaw = 0, pitch = 0;
    if (opts.drift === "spin") yaw = t * 0.035 * sp;
    else if (opts.drift === "sway") {
      yaw = 7 * DEG * Math.sin(t * 0.21 * sp);
      pitch = 5 * DEG * Math.sin(t * 0.17 * sp + 1.1);
    }
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), spn = Math.sin(pitch);
    const flip = opts.hemisphere === "south" ? -1 : 1;

    const data = image.data;
    data.fill(0);
    const R = S * 0.4, c = S / 2;

    for (let j = 0; j < S; j++) {
      for (let k = 0; k < S; k++) {
        const x = (flip * (k + 0.5 - c)) / R;
        const y = (flip * (c - j - 0.5)) / R;
        const d2 = x * x + y * y;
        if (d2 > 1) continue;
        const z = Math.sqrt(1 - d2);

        // view -> Moon-fixed (pitch about x, then yaw about y)
        const y1 = y * cp - z * spn;
        const z1 = y * spn + z * cp;
        const mx = x * cy + z1 * sy;
        const mz = -x * sy + z1 * cy;
        sampler(mx, y1, mz, out);

        // tilt the normal by the surface slope, in the Moon's own frame, then turn it back to the view
        let nx = x, ny = y, nz = z;
        if (out[1] || out[2]) {
          const h = Math.hypot(mx, mz) || 1;
          const ex = mz / h, ez = -mx / h; // local east
          const Nx = y1 * ez, Ny = mz * ex - mx * ez, Nz = -y1 * ex; // local north = n × east
          let ax = mx - out[1] * ex - out[2] * Nx;
          let ay = y1 - out[2] * Ny;
          let az = mz - out[1] * ez - out[2] * Nz;
          const len = Math.hypot(ax, ay, az);
          ax /= len; ay /= len; az /= len;
          // undo yaw, then pitch
          const vx = ax * cy - az * sy;
          const vz1 = ax * sy + az * cy;
          nx = vx;
          ny = ay * cp + vz1 * spn;
          nz = -ay * spn + vz1 * cp;
        }

        // Lommel–Seeliger reflectance: unlike a matte ball, the Moon stays evenly
        // bright up to its edge, which is why a full moon looks like a flat disc
        const mu0 = nx * Lx + nz * Lz; // sunlight angle
        const mu = Math.max(0.02, nz); // viewing angle
        const albedo = out[0];
        // the tone curve keeps the lit side solid in 1 bit; the gradient stays near the shadow line
        const light = mu0 > 0 ? albedo * Math.pow(Math.min(1, (2.5 * mu0) / (mu0 + mu)), 0.7) : albedo * 0.05;
        if (light > BAYER[(j & 3) * 4 + (k & 3)]) {
          const p = (j * S + k) * 4;
          data[p] = ink[0];
          data[p + 1] = ink[1];
          data[p + 2] = ink[2];
          data[p + 3] = 255;
        }
      }
    }

    for (const s of stars) {
      const flicker = t ? 0.5 + 0.5 * Math.sin(t * (0.6 + s.b * 1.8) + s.b * 40) : 1;
      const a = Math.round(255 * (0.25 + 0.55 * s.b) * flicker);
      if (a < 40) continue;
      const p = (s.y * S + s.x) * 4;
      data[p] = ink[0];
      data[p + 1] = ink[1];
      data[p + 2] = ink[2];
      data[p + 3] = a;
    }
    ctx.putImageData(image, 0, 0);

    const label = opts.label || `${phase.phaseName}, ${Math.round(phase.illumination * 100)}% lit`;
    if (label !== lastLabel) {
      canvas.setAttribute("aria-label", label);
      lastLabel = label;
    }
  }

  function schedule() {
    clearInterval(timer);
    const moving = animated() && (opts.drift !== "none" || opts.stars > 0);
    // still moons redraw every 10 minutes so the phase stays current
    const every = moving ? 1000 / Math.max(1, Math.min(60, Number(opts.fps) || 9)) : 600_000;
    timer = setInterval(() => {
      if (visible && !(typeof document !== "undefined" && document.hidden)) draw();
    }, every);
  }

  async function loadSurface() {
    const key = typeof opts.surface === "object" ? opts.surface : `${opts.surface}|${opts.seed}|${opts.relief}`;
    if (key === surfaceKey) return;
    surfaceKey = key;
    const next = await resolveSurface(opts.surface, opts.seed, Number(opts.relief) || 0).catch((err) => {
      console.warn("dither-moon: surface failed to load, using the procedural one", err);
      return proceduralSampler(opts.seed);
    });
    if (key !== surfaceKey || destroyed) return;
    sampler = next;
    draw();
  }

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => setup() && draw()) : null;
  ro?.observe(box());
  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
        })
      : null;
  io?.observe(canvas);
  const onMotionPref = () => {
    schedule();
    draw();
  };
  reduce?.addEventListener?.("change", onMotionPref);

  setup();
  schedule();
  loadSurface();

  return {
    /** Change any option; unchanged options keep their values. */
    update(next = {}) {
      const prevBox = box();
      opts = { ...opts, ...next };
      if (box() !== prevBox && ro) {
        ro.unobserve(prevBox);
        ro.observe(box());
      }
      setup();
      schedule();
      loadSurface();
      draw();
    },
    /** The phase currently shown. */
    get phase() {
      return moonPhase(opts.date ?? new Date());
    },
    destroy() {
      destroyed = true;
      clearInterval(timer);
      ro?.disconnect();
      io?.disconnect();
      reduce?.removeEventListener?.("change", onMotionPref);
    },
  };
}
