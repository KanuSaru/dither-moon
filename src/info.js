// Plain-language lines about the Moon at a moment, for the optional caption.

import { moonPhase, nextFullMoon } from "./phase.js";

const TEXT = {
  en: {
    phases: [
      "New moon",
      "Waxing crescent",
      "First quarter",
      "Waxing gibbous",
      "Full moon",
      "Waning gibbous",
      "Last quarter",
      "Waning crescent",
    ],
    lit: (n) => `${n}% lit`,
    fullNow: "Full moon now",
    fullTonight: "Full moon tonight",
    fullTomorrow: "Full moon tomorrow",
    fullIn: (n) => `Full moon in ${n} days`,
  },
  es: {
    phases: [
      "Luna nueva",
      "Luna creciente",
      "Cuarto creciente",
      "Gibosa creciente",
      "Luna llena",
      "Gibosa menguante",
      "Cuarto menguante",
      "Luna menguante",
    ],
    lit: (n) => `${n}% iluminada`,
    fullNow: "Luna llena ahora",
    fullTonight: "Luna llena esta noche",
    fullTomorrow: "Luna llena mañana",
    fullIn: (n) => `Luna llena en ${n} días`,
  },
};

/** Languages the caption speaks. */
export const INFO_LANGUAGES = Object.keys(TEXT);

/**
 * Three short lines describing the Moon: phase, how much is lit, next full moon.
 * @param {Date | string | number} [date] default: now
 * @param {string} [lang] "en" (default) or "es"; "es-CO" etc. also work
 */
export function moonInfo(date, lang = "en") {
  const d = date == null ? new Date() : new Date(date);
  const t = TEXT[String(lang).slice(0, 2).toLowerCase()] ?? TEXT.en;
  const p = moonPhase(d);
  const days = (nextFullMoon(d).getTime() - d.getTime()) / 86_400_000;
  let next;
  if (p.illumination > 0.995 || days > 29.2) next = t.fullNow;
  else if (days < 1) next = t.fullTonight;
  else if (days < 1.5) next = t.fullTomorrow;
  else next = t.fullIn(Math.round(days));
  return { phase: t.phases[p.phaseIndex], lit: t.lit(Math.round(p.illumination * 100)), next };
}
