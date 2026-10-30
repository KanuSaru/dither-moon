import { test } from "node:test";
import assert from "node:assert/strict";
import { moonPhase, nextFullMoon, nextNewMoon, nextPhase } from "../src/phase.js";

// Every eclipse happens at a new or full moon, so eclipse dates make good checks.
// Times are the published new / full moon instants, UTC.
const NEW = ["2017-08-21T18:30Z", "2024-04-08T18:21Z", "2024-10-02T18:49Z"];
const FULL = ["2019-01-21T05:16Z", "2024-10-17T11:26Z", "2025-03-14T06:55Z", "2025-09-07T18:09Z"];
const TOLERANCE_MIN = 20;

const minutesApart = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;
const daysBefore = (iso, days) => new Date(new Date(iso).getTime() - days * 86_400_000);

test("finds known new moons", () => {
  for (const when of NEW) {
    const found = nextNewMoon(daysBefore(when, 3));
    const off = minutesApart(found, when);
    assert.ok(off < TOLERANCE_MIN, `${when}: off by ${off.toFixed(1)} min`);
  }
});

test("finds known full moons", () => {
  for (const when of FULL) {
    const found = nextFullMoon(daysBefore(when, 3));
    const off = minutesApart(found, when);
    assert.ok(off < TOLERANCE_MIN, `${when}: off by ${off.toFixed(1)} min`);
  }
});

test("illumination and names at the extremes", () => {
  for (const when of FULL) {
    const p = moonPhase(when);
    assert.ok(p.illumination > 0.99, `${when}: ${p.illumination}`);
    assert.equal(p.phaseName, "Full moon");
  }
  for (const when of NEW) {
    const p = moonPhase(when);
    assert.ok(p.illumination < 0.01, `${when}: ${p.illumination}`);
    assert.equal(p.phaseName, "New moon");
  }
});

test("quarters are half lit and in the right order", () => {
  const start = nextNewMoon("2026-01-01T00:00Z");
  const first = nextPhase(0.25, start);
  const full = nextFullMoon(start);
  const last = nextPhase(0.75, start);
  assert.ok(start < first && first < full && full < last);
  assert.ok(Math.abs(moonPhase(first).illumination - 0.5) < 0.02);
  assert.ok(Math.abs(moonPhase(last).illumination - 0.5) < 0.02);
  assert.equal(moonPhase(first).waxing, true);
  assert.equal(moonPhase(last).waxing, false);
});

test("accepts strings and timestamps, rejects nonsense", () => {
  assert.equal(moonPhase("2025-03-14T06:55Z").phaseIndex, moonPhase(Date.parse("2025-03-14T06:55Z")).phaseIndex);
  assert.throws(() => moonPhase("not a date"), TypeError);
});
