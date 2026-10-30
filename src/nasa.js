// NASA's Moon, from the CGI Moon Kit by NASA's Scientific Visualization Studio
// (LRO color mosaic and LOLA elevation, public domain): downsampled to grayscale
// and embedded in nasa-data.js, so nothing is fetched from NASA at runtime.

import { ALBEDO, ELEVATION } from "./nasa-data.js";

let loading = null;

async function decode({ src, width, height }) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = rgba[i * 4];
  return gray;
}

/** Decode the embedded maps once; later calls share the result. */
export function loadNasaSurface() {
  loading ??= (async () => {
    if (!ALBEDO) throw new Error("NASA map not embedded in this build");
    const [albedo, elevation] = await Promise.all([decode(ALBEDO), ELEVATION ? decode(ELEVATION) : null]);
    return {
      width: ALBEDO.width,
      height: ALBEDO.height,
      albedo,
      elevation: elevation ?? undefined,
      elevationWidth: ELEVATION?.width,
      elevationHeight: ELEVATION?.height,
    };
  })();
  return loading;
}
