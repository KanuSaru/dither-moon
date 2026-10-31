# dither-moon

The Moon at its real phase, right now, drawn as 1-bit dithered pixel art.

- **A tag for any web page**: `<dither-moon>`, one script, no build step. Works on Neocities, Nekoweb, GitHub Pages or anywhere else.
- **A React component**: `<DitherMoon />`, client-only, works in Next.js.
- **The phase math on its own**: `moonPhase()`, `nextFullMoon()`, `nextNewMoon()`. No dependencies.

The surface is NASA's map of the Moon, so the real seas and craters show up, and crater relief catches the light along the shadow line. The phase comes from the positions of the Sun and the Moon, not an average month: new and full moons land within a few minutes of the published times (see `test/`).

## Any web page

```html
<script src="https://cdn.jsdelivr.net/npm/dither-moon@1/dist/dither-moon.js"></script>

<dither-moon style="width: 240px; color: #e7e2d6"></dither-moon>
```

Size it with CSS `width`; it stays square. The pixels take the element's CSS `color`.

## React

```bash
npm install dither-moon
```

```jsx
import { DitherMoon } from "dither-moon/react";

<DitherMoon style={{ width: 240, color: "#e7e2d6" }} label="Today's moon" />
```

## Just the phase

```js
import { moonPhase, nextFullMoon, nextNewMoon, nextPhase } from "dither-moon";

moonPhase();            // now
moonPhase("2026-12-24"); // any date
// {
//   phaseName: "Waxing gibbous", phaseIndex: 3, waxing: true,
//   illumination: 0.83, cycle: 0.37, age: 10.9, phaseAngle: 48.2, distanceKm: 371204, date
// }

nextFullMoon();          // Date
nextNewMoon();           // Date
nextPhase(0.25);         // next first quarter (0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter)
```

`phaseIndex` runs 0–7 (new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent), handy for translating the name. `PHASE_NAMES` has the English ones.

## Options

As attributes on the tag (`pixel-size="4"`), props in React (`pixelSize={4}`), or options to `createMoon`.

| Option | Default | What it does |
| --- | --- | --- |
| `date` | now | The moment to show. Without it, the Moon stays current. |
| `color` | CSS `color` | Pixel color. |
| `pixel-size` | `auto` | Screen pixels per moon pixel. `auto` is 2 when small, else 3. |
| `surface` | `nasa` | `nasa`, `procedural` (an invented moon; change it with `seed`), or your own map in JS. |
| `drift` | `sway` | `sway` rocks gently, like the Moon's real libration, sped up. `spin` turns it. `none` holds still. |
| `speed` | `1` | Drift speed. |
| `stars` | `1` | Star density. `0` for none. |
| `fps` | `9` | Frames per second. Low on purpose. |
| `seed` | `0` | Changes the stars and the procedural surface. |
| `relief` | `1` | Crater relief at the shadow line. `0` for flat. |
| `hemisphere` | `north` | `south` turns it the way it looks from the southern hemisphere. |
| `motion` | `auto` | `auto` holds still for people who turn off motion. `always` or `never`. |
| `label` | phase and % lit | Accessible description, e.g. a translation. |
| `interactive` | `true` | Drag (or use arrow keys) to turn the Moon and see the far side. `false` to turn it off. |
| `settle` | `6` | Seconds after letting go before it eases back to the side that faces Earth. `0` keeps it where you left it. |

Animation pauses when the Moon is off screen or the tab is hidden.

## Plain JavaScript

```js
import { createMoon } from "dither-moon";

const moon = createMoon(document.querySelector("canvas"), { hemisphere: "south" });
moon.update({ date: new Date("2026-12-24") });
moon.phase;     // what's shown
moon.destroy();
```

The canvas fills the width of its parent (or of `container`).

## How it's drawn

Each pixel inside the disc is a point on a sphere, lit from the Sun's direction for the current phase with Lommel–Seeliger reflectance (the model used for the Moon: it stays evenly bright up to the edge, unlike a matte ball), with brightness from NASA's albedo map and the surface normal tilted by the elevation map. The result is reduced to 1 bit with a 4×4 Bayer matrix (ordered dithering). The canvas is small and scaled up with `image-rendering: pixelated`.

NASA's map is simplified before it's embedded: softened slightly, then pushed toward two tones, so the highlands come out solid and the seas as an even dot pattern. At 100-odd pixels across, the full detail of small craters and rays only turns into speckle. To rebuild the embedded maps (for example from a different NASA map):

```bash
python3 scripts/build-nasa-data.py lroc_color_poles_2k.jpg ldem_3_8bit.jpg
```

## Development

```bash
npm test         # phase accuracy against eclipse dates
npm run build    # dist/dither-moon.js
```

Open `demo/index.html` to see it.

## Credits

Moon maps: [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720), NASA's Scientific Visualization Studio (LRO color mosaic and LOLA elevation), public domain. Downsampled to grayscale and embedded (about 33 KB), so nothing is fetched from NASA at runtime.

Made by [Kanu](https://github.com/KanuSaru). MIT license.
