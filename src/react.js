"use client";

// React component. Works with React 18 and 19, including Next.js (client only).
//
//   import { DitherMoon } from "dither-moon/react";
//   <DitherMoon style={{ width: 240, color: "#e7e2d6" }} />

import { createElement, useEffect, useRef } from "react";
import { createMoon } from "./render.js";

export function DitherMoon({
  className,
  style,
  date,
  color,
  pixelSize,
  surface,
  drift,
  speed,
  stars,
  fps,
  seed,
  relief,
  hemisphere,
  motion,
  label,
  interactive,
  settle,
}) {
  const box = useRef(null);
  const canvas = useRef(null);
  const moon = useRef(null);
  const time = date == null ? null : new Date(date).getTime();
  // a map object is passed through as is; names ("nasa", "procedural") are compared by value
  const surfaceObj = surface && typeof surface === "object" ? surface : null;
  const surfaceName = typeof surface === "string" ? surface : "nasa";
  const opts = { color, pixelSize, drift, speed, stars, fps, seed, relief, hemisphere, motion, label, interactive, settle };
  for (const k of Object.keys(opts)) if (opts[k] === undefined) delete opts[k];
  const optsKey = JSON.stringify(opts);

  useEffect(() => {
    moon.current = createMoon(canvas.current, {
      ...opts,
      surface: surfaceObj ?? surfaceName,
      date: time == null ? null : new Date(time),
      container: box.current,
    });
    return () => moon.current?.destroy();
    // created once; later changes go through update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    moon.current?.update({
      color: null,
      label: null,
      ...opts,
      surface: surfaceObj ?? surfaceName,
      date: time == null ? null : new Date(time),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optsKey, time, surfaceObj, surfaceName]);

  return createElement("div", { ref: box, className, style }, createElement("canvas", { ref: canvas }));
}
