// Surfaces: what the Moon looks like at a point, given as a unit vector in
// Moon-fixed coordinates (x east, y north, z toward Earth at longitude 0).
// A sampler writes [albedo 0..1, east slope, north slope] into `out`.

// ---------------------------------------------------------------- maps

/**
 * Build a sampler from equirectangular maps (longitude -180..180 left to right,
 * latitude 90..-90 top to bottom, longitude 0 in the middle).
 * @param {{ width: number, height: number, albedo: ArrayLike<number>, elevation?: ArrayLike<number>,
 *   elevationWidth?: number, elevationHeight?: number }} map  values 0..255
 */
export function mapSampler(map, reliefScale = 0.05) {
  const { width: W, height: H, albedo } = map;
  const elevation = map.elevation;
  const EW = map.elevationWidth ?? W;
  const EH = map.elevationHeight ?? H;
  const dLon = (2 * Math.PI) / EW;
  const dLat = Math.PI / EH;

  function bilinear(data, w, h, fx, fy) {
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const xa = ((x0 % w) + w) % w;
    const xb = (xa + 1) % w;
    const ya = Math.min(h - 1, Math.max(0, y0));
    const yb = Math.min(h - 1, ya + 1);
    const top = data[ya * w + xa] + (data[ya * w + xb] - data[ya * w + xa]) * tx;
    const bottom = data[yb * w + xa] + (data[yb * w + xb] - data[yb * w + xa]) * tx;
    return top + (bottom - top) * ty;
  }

  return function sample(mx, my, mz, out) {
    const lon = Math.atan2(mx, mz);
    const lat = Math.asin(Math.max(-1, Math.min(1, my)));
    const u = lon / (2 * Math.PI) + 0.5;
    const v = 0.5 - lat / Math.PI;
    out[0] = bilinear(albedo, W, H, u * W - 0.5, v * H - 0.5) / 255;
    if (elevation && reliefScale) {
      const ex = u * EW - 0.5;
      const ey = v * EH - 0.5;
      const east = bilinear(elevation, EW, EH, ex + 1, ey) - bilinear(elevation, EW, EH, ex - 1, ey);
      const north = bilinear(elevation, EW, EH, ex, ey - 1) - bilinear(elevation, EW, EH, ex, ey + 1);
      const k = reliefScale / 255;
      out[1] = (k * east) / (2 * dLon * Math.max(0.05, Math.cos(lat)));
      out[2] = (k * north) / (2 * dLat);
    } else {
      out[1] = 0;
      out[2] = 0;
    }
  };
}

// ---------------------------------------------------------------- procedural

function hash(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  const lerp = (a, b, t) => a + (b - a) * t;
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

function fbm(x, y, z) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 3; o++) {
    sum += amp * noise(x * f, y * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export { hash };

/** An invented moon: noise "seas" and grain, different for every seed. */
export function proceduralSampler(seed = 0) {
  const ox = hash(seed, 11, 3) * 100, oy = hash(seed, 5, 17) * 100, oz = hash(seed, 23, 7) * 100;
  return function sample(mx, my, mz, out) {
    const maria = smooth(0.44, 0.6, fbm(mx * 1.5 + ox, my * 1.5 + oy, mz * 1.5 + oz));
    const grain = noise(mx * 9 + ox, my * 9 + oy, mz * 9 + oz);
    out[0] = (0.95 - 0.42 * maria) * (0.82 + 0.3 * grain);
    out[1] = 0;
    out[2] = 0;
  };
}
