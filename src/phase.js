// Moon phase from the positions of the Sun and the Moon.
//
// Uses the standard low-precision series: the Sun's equation of center and the
// largest periodic terms of the Moon's longitude, latitude and distance.
// New and full moons come out within a few minutes for dates around the
// present century, which is far more than a phase widget needs.

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const DAY_MS = 86_400_000;

/** Average length of a lunar cycle, in days. */
export const SYNODIC_MONTH = 29.530588853;

/** English names, in order of `phaseIndex`. */
export const PHASE_NAMES = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
];

const sin = (deg) => Math.sin(deg * DEG);
const cos = (deg) => Math.cos(deg * DEG);
const wrap360 = (deg) => ((deg % 360) + 360) % 360;

function toDate(value) {
  if (value == null) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new TypeError(`dither-moon: not a valid date: ${value}`);
  return d;
}

/** Julian centuries since J2000.0 */
function centuries(ms) {
  return (ms / DAY_MS + 2440587.5 - 2451545.0) / 36525;
}

function positions(T) {
  // Sun
  const M = 357.5291092 + 35999.0502909 * T; // mean anomaly
  const L0 = 280.46646 + 36000.76983 * T; // mean longitude
  const C =
    (1.914602 - 0.004817 * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const sunLon = wrap360(L0 + C);
  const sunKm = (1.000140 - 0.016708 * cos(M) - 0.000141 * cos(2 * M)) * AU_KM;

  // Moon
  const Lm = 218.3164477 + 481267.88123421 * T; // mean longitude
  const D = 297.8501921 + 445267.1114034 * T; // mean elongation
  const Mm = 134.9633964 + 477198.8675055 * T; // mean anomaly
  const F = 93.272095 + 483202.0175233 * T; // argument of latitude
  const E = 1 - 0.002516 * T; // Earth's orbit eccentricity factor

  const moonLon = wrap360(
    Lm +
      6.288774 * sin(Mm) +
      1.274027 * sin(2 * D - Mm) +
      0.658314 * sin(2 * D) +
      0.213618 * sin(2 * Mm) -
      0.186116 * E * sin(M) -
      0.114332 * sin(2 * F) +
      0.058793 * sin(2 * D - 2 * Mm) +
      0.057066 * E * sin(2 * D - M - Mm) +
      0.053322 * sin(2 * D + Mm) +
      0.045758 * E * sin(2 * D - M) -
      0.040923 * E * sin(M - Mm) -
      0.03472 * sin(D) -
      0.030383 * E * sin(M + Mm),
  );
  const moonLat =
    5.128122 * sin(F) +
    0.280602 * sin(Mm + F) +
    0.277693 * sin(Mm - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - Mm + F) +
    0.046271 * sin(2 * D - Mm - F);
  const moonKm =
    385000.56 - 20905.355 * cos(Mm) - 3699.111 * cos(2 * D - Mm) - 2955.968 * cos(2 * D) - 569.925 * cos(2 * Mm);

  return { sunLon, sunKm, moonLon, moonLat, moonKm };
}

/** Where the Moon is in its cycle at a moment: 0 = new, 0.5 = full. */
function cycleAt(ms) {
  const p = positions(centuries(ms));
  return wrap360(p.moonLon - p.sunLon) / 360;
}

/**
 * The Moon's phase at a moment (default: now).
 * @param {Date | string | number} [date]
 */
export function moonPhase(date) {
  const d = toDate(date);
  const p = positions(centuries(d.getTime()));
  const separation = wrap360(p.moonLon - p.sunLon);
  // elongation from the Sun, then the Sun–Moon–Earth phase angle
  const psi = Math.acos(Math.min(1, Math.max(-1, cos(p.moonLat) * cos(separation))));
  const phaseAngle = Math.atan2(p.sunKm * Math.sin(psi), p.moonKm - p.sunKm * Math.cos(psi));
  const cycle = separation / 360;
  const phaseIndex = Math.round(cycle * 8) % 8;
  return {
    date: d,
    /** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
    cycle,
    /** fraction of the visible disc that is lit, 0 to 1 */
    illumination: (1 + Math.cos(phaseAngle)) / 2,
    /** Sun–Moon–Earth angle in degrees: 180 at new moon, 0 at full */
    phaseAngle: phaseAngle / DEG,
    phaseIndex,
    phaseName: PHASE_NAMES[phaseIndex],
    waxing: cycle < 0.5,
    /** approximate days since the last new moon */
    age: cycle * SYNODIC_MONTH,
    distanceKm: p.moonKm,
  };
}

/**
 * The next moment the Moon reaches a point in its cycle
 * (0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter).
 * @param {number} cycle
 * @param {Date | string | number} [after]
 */
export function nextPhase(cycle, after) {
  const start = toDate(after).getTime();
  const target = ((cycle % 1) + 1) % 1;
  let t = start + (((target - cycleAt(start)) % 1) + 1) % 1 * SYNODIC_MONTH * DAY_MS;
  for (let i = 0; i < 12; i++) {
    const off = ((((target - cycleAt(t)) % 1) + 1.5) % 1) - 0.5; // shortest way round, -0.5..0.5
    const step = off * SYNODIC_MONTH * DAY_MS;
    t += step;
    if (Math.abs(step) < 1000) break;
  }
  return new Date(t);
}

/** @param {Date | string | number} [after] */
export const nextFullMoon = (after) => nextPhase(0.5, after);
/** @param {Date | string | number} [after] */
export const nextNewMoon = (after) => nextPhase(0, after);
