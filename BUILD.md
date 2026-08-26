# garrulus — How to Build It

This doc tells you how to build the game `garrulus` with the Goodluck template.
Read it together with `game-design-doc.md`. This doc replaces the "Technical
Implementation" part of the design doc. We do not use Unity or Godot.

Rules for builders:

-   Make the game fully playable first. Compress to 13KB after.
-   Follow the Goodluck patterns. Copy from `goodluck/potato` and
    `goodluck/duszki` before you write new code.
-   Put the bundle size in every commit message. See section 12.

---

## 1. What the game is

A physics puzzle in the family of Suika Game. The player moves a cloud on a
circle around the screen center. The player drops elements. A pull toward the
center moves each element inward. Elements pack into a rotating ball. Two equal
elements merge into the next element. When the packed mass crosses the orbit
line for 3 seconds, the game ends.

Everything is 2D vector art. There are no image files and no sound files.

---

## 2. Why these Goodluck parts

I studied the template and the games. Facts that drive our choices:

-   `goodluck/goodluck` is the template repo. `bootstrap.sh` copies an example to
    `src/`. The newest generation splits 2D transforms into `LocalTransform2D` +
    `SpatialNode2D` and renders sprites through WebGL instancing.
-   `goodluck/potato` is a shipped 2D physics toy. It uses one flat
    `Transform2D` per entity, circle colliders, a fixed 60 Hz physics step, and a
    2D canvas under a WebGL canvas. Its structure is closest to our needs.
-   `goodluck/duszki` shows the UI pattern (`sys_ui` re-renders an HTML string),
    synth music from note data, and save/state patterns.
-   `lib/audio.ts` in the template synthesizes notes with the Web Audio API. No
    audio files. This fits our 13KB limit.
-   The release pipeline is `play/Makefile`: `tsc` → `esbuild` → `sed` →
    `terser` → (Roadroller) → `posthtml`/`htmlnano` produce one `index.html`.
    `make` prints the gzip size. `make index.zip` produces the final artifact
    with 7-Zip and advancecomp.

Decisions:

| Topic           | Decision                                                      | Reason                                                                                                                           |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Base            | Fork the structure of `potato`, not `NewProject3D`            | Flat `Transform2D`, circle physics, fixed step already exist there                                                               |
| Renderer        | 2D canvas (`Context2D`) only. No WebGL                        | Vector circles and gradients are native to canvas. We drop all GL code, shaders, atlases, and the instance buffer. Saves many KB |
| Physics         | Custom, from `potato`: circle vs circle, impulse + separation | Matches round elements. Small                                                                                                    |
| Central gravity | Set `Acceleration` toward the center each step                | `sys_physics2d_integrate` applies `Acceleration` already. No engine change                                                       |
| Audio           | Synth from `lib/audio.ts`                                     | Zero bytes of assets                                                                                                             |
| Text/UI         | `main` element over the canvas, `sys_ui` diff render          | Pattern from `duszki`, tiny                                                                                                      |

Ponytail note (see `AGENTS.md`): we cut a real corner here. The template GL
renderer batches all sprites in one draw call; our canvas renderer draws each
circle with a separate path. With fewer than about 200 circles this holds
60 fps. If the element count grows past that, port `sys_draw` to the GL
instanced renderer from the template.

---

## 3. Repository layout

Work at the root of this repo. `goodluck/` stays as read-only reference
(it is ignored by git). Target layout:

```
garrulus/
  index.html          dev page (pattern: potato/index.html)
  package.json        dev tools: esbuild, typescript, terser, posthtml, htmlnano
  tsconfig.json       strict, es2020
  .prettierrc         4 spaces, width 100 (copy from potato)
  lib/                copied from goodluck lib/: math, vec2, mat2d, color,
                      random, easing, number, audio, html, world, game
  src/
    game.ts           Game class, Layer enum, tuning constants
    world.ts          Component enum, Has enum, World class
    actions.ts        Action enum + dispatch
    components/       com_*.ts
    systems/          sys_*.ts
    scenes/           sce_*.ts and blu_*.ts
    ui.ts             App(game) HTML string
  play/
    Makefile          release pipeline (from potato; Roadroller optional)
    game.html         release page shell
    game.css          full-screen canvas styles (from potato)
    posthtml.cjs      from potato
    sed.txt           from potato
    terser_compress.txt  from potato
```

Copy only the `lib/` files listed above. Delete the rest. Every unused file you
copy costs bytes later.

Commands:

```
npm install
npm start          # dev server on :1234
make -C play       # release build, prints gzip size
make -C play index.zip   # final artifact
```

---

## 4. ECS in one page

Memorize these rules. All code must follow them.

-   An **entity** is a number. It indexes arrays in `World`.
-   A **component** is data only. One interface + one factory function per file,
    named `com_<name>.ts`. The factory returns a mixin: `(game, entity) => void`
    and sets a bit in `World.Signature[entity]`.
-   A **system** is a free function, `sys_<name>.ts`, with a `QUERY` mask. It
    loops over all entities, tests `(Signature[i] & QUERY) === QUERY`, and calls
    `update(game, i, delta)`. Systems hold no state between frames except module
    level temp values.
-   A **blueprint** is an array of mixins. `instantiate(game, [...])` creates the
    entity and runs the mixins. Blueprint factories are named `blu_<thing>`.
-   A **scene** is a function `sce_<name>(game)` that resets the world and
    instantiates blueprints.
-   Names: properties are `PascalCase`. Terser mangles property names that start
    with a capital letter. Properties with lowercase first letters survive into
    the bundle. So: game data uses `PascalCase`. Web API names stay quoted, for
    example `InputState["MouseX"]`.
-   Components and layers are `const enum`s. They compile to numbers.
-   Never store game state outside `World` or `Game`. No singletons, no classes
    beyond `Game` and `World`.

---

## 5. World and components

`src/world.ts` declares exactly these components:

| Component       | Data                                                                              | Used by                  |
| --------------- | --------------------------------------------------------------------------------- | ------------------------ |
| `Transform2D`   | `Translation, Rotation, Scale, World`                                             | everything               |
| `RigidBody2D`   | `Kind, Drag, Acceleration, VelocityIntegrated, VelocityResolved, VelocityAngular` | dropped elements         |
| `CollideCircle` | `EntityId, Radius, Center, ContactId, ContactNormal, ContactDepth, Mask`          | dropped elements         |
| `Merge`         | `Tier, Cooldown, Merging`                                                         | dropped elements         |
| `DropCloud`     | `Angle, NextTier, Cooldown`                                                       | the cloud                |
| `Shake`         | `Magnitude`                                                                       | effects (child entities) |
| `Lifespan`      | `Remaining`                                                                       | pop effects              |
| `AnimatePop`    | `Time, Total`                                                                     | merge grow animation     |
| `Camera2D`      | `Radius, Projection, Inverse`                                                     | the camera               |
| `Dirty`         | flag bit only                                                                     | transform update         |

Notes:

-   Keep the `Dirty` bit. `sys_transform2d` recomputes the world matrix only for
    dirty entities.
-   `Layer` enum in `game.ts`: `None, Element, Cloud`. The cloud does not
    physically collide; elements mask against elements only.
-   Tuning constants live in `game.ts`: `ORBIT_RADIUS = 10`,
    `DEATH_RADIUS = 10`, `CENTER_PULL = 40`, `DRAG = 0.4`, `BOUNCE = 0.15`,
    `DROP_COOLDOWN = 0.35`, `MERGE_COOLDOWN = 0.2`, `HITSTOP_FRAMES`.

Element table. Radii grow by about 1.2x per tier so area grows by about 1.5x:

| Tier | Name           | Radius | Score | Color (HSVA hue) |
| ---- | -------------- | ------ | ----- | ---------------- |
| 0    | Sparkle        | 0.45   | 1     | pink             |
| 1    | Star           | 0.55   | 3     | yellow           |
| 2    | Heart          | 0.66   | 6     | rose             |
| 3    | Moon           | 0.79   | 10    | pale blue        |
| 4    | Rainbow        | 0.95   | 15    | mint             |
| 5    | Crystal        | 1.14   | 21    | violet           |
| 6    | Comet          | 1.37   | 28    | orange           |
| 7    | Nebula         | 1.64   | 36    | deep blue        |
| 8    | Galaxy         | 1.97   | 45    | magenta          |
| 9    | Cosmic Unicorn | 2.36   | 55    | white-gold       |

Put the table in `src/scenes/blu_element.ts` as a plain array. One blueprint
factory covers all tiers; the tier picks radius, color, and shape kind.

---

## 6. Systems and their order

The loop comes from `potato` (`common/game.ts`): `requestAnimationFrame` feeds
an accumulator; `FixedUpdate` runs at a fixed 60 Hz step; `FrameUpdate` runs
once per frame for rendering. Input deltas reset after each fixed tick.

### FixedUpdate — simulation

Order matters. Do not reorder without thought.

1. `sys_control_cloud` — mouse angle to cloud position; click drops.
2. `sys_gravity` — writes center-pull into `Acceleration` of each body.
3. `sys_physics2d_integrate` — from potato. Applies gravity, acceleration,
   drag; integrates positions; sets `Dirty`.
4. `sys_transform2d` — commit matrices.
5. `sys_collide_circle` — circle vs circle pairs, fills contact data.
6. `sys_physics2d_resolve` — separation + impulse response (potato pattern).
7. `sys_merge` — same-tier contacts merge.
8. `sys_transform2d` — again, after merges moved things.
9. `sys_game_over` — boundary timer.
10. `sys_lifespan`, `sys_animate_pop` — effect timers.

### FrameUpdate — presentation

1. `sys_shake` — decays screen shake amount on `Game`.
2. `sys_camera2d` — computes projection scale for current viewport.
3. `sys_draw` — clears and draws: background, orbit rings, bodies, cloud.
4. `sys_ui` — diff-render HTML string into `main`.

Hit stop lives on `Game` as a frame counter. When it is greater than zero,
steps 2–7 of FixedUpdate return early and the counter decreases. The world
freezes; rendering continues. This gives the merge punch from the design doc.

---

## 7. Gameplay mechanics in detail

### 7.1 Orbit and dropping

`sys_control_cloud`:

-   Read pointer pixels from `InputState["MouseX"]`, `["MouseY"]`.
-   Convert to world units with the camera inverse (scale and center).
-   Angle: `theta = atan2(my - cy, mx - cx)`.
-   Cloud position: `[R*cos(theta), R*sin(theta)]`, `R = ORBIT_RADIUS`.
-   On `InputDelta["Mouse0"] === 1` and cooldown spent: instantiate
    `blu_element(game, NextTier)` at the cloud position with initial velocity
    pointing to the center (speed about 4 units/s). Roll the next tier.
-   Touch equals mouse: `Touch0` down acts as move + drop on start.

### 7.2 Central gravity

`sys_gravity` writes for each dynamic body:

```
dir = normalize(center - position)
Acceleration = dir * CENTER_PULL
```

Use constant magnitude, not inverse square. Constant pull packs the mass
evenly and never explodes. Add mild tangential damping through `Drag` so the
mass settles and spins slowly instead of orbiting forever.

### 7.3 Collision

Start from `potato/src/systems/sys_collide2d.ts` and drop the capsule code.
Keep only sphere vs sphere: for each dynamic pair closer than the sum of
radii, store the contact normal and depth on both bodies. Pair count stays
under about 150, so the naive double loop is fine. Mark it with a `ponytail:`
comment: ceiling is O(n^2), upgrade path is a spatial hash.

### 7.4 Response

Keep the potato resolver, with two changes:

-   Momentum: mass = radius squared. Exchange velocities weighted by mass so a
    Galaxy shoves Sparks aside. This creates the kinetic spin of the design doc.
-   Spin: on contact, add a share of the tangential relative speed to
    `VelocityAngular` of both bodies. Sprites rotate; the pile looks alive.

### 7.5 Merge

`sys_merge` scans `CollideCircle.ContactId`:

-   Both bodies have `Merge`, same `Tier`, both `Cooldown <= 0`, neither
    `Merging`.
-   Mark both `Merging`. Keep the older entity. Destroy the younger with
    `destroy_entity` (graveyard reuse is free).
-   Upgrade the survivor: `Tier++`, new radius, new color, `Cooldown =
MERGE_COOLDOWN`, position = mass-weighted midpoint, velocity = mean of both.
-   Add `AnimatePop` (scale from 1.3 back to 1 with ease-out).
-   Score += tier score. Screen shake += small amount by tier. Hit stop: 2
    frames below tier 5, 4 frames above. Play the pop note for the tier.
-   A merge can create a new contact of equal tiers. The next fixed step handles
    it. Free chain reactions, no recursion needed.

Two Cosmic Unicorns merging is the win condition. Show the win overlay and
let play continue (endless mode), per design spirit.

### 7.6 Game over

`sys_game_over`: for each body, if `length(position) + radius >
DEATH_RADIUS`, add `delta` to a timer on `Game`, else subtract twice `delta`
(fast recovery). Clamp at 0. Show the remaining seconds as a ring pulse color
on the death circle in `sys_draw`. At 3 seconds: set `PlayState = "over"`,
show the overlay with score and a Restart button. Restart calls
`sce_stage(game)` again.

### 7.7 Next-element preview

`Game.NextTier` plus the cloud draw shows the upcoming element floating under
the cloud. Weighted roll for tiers 0–4 only: weights 32, 26, 20, 14, 8.

---

## 8. Vector rendering

One `<canvas>` with a `2d` context. `Game2D` from potato provides canvas and
`AudioContext`; extend it. Delete every WebGL file.

`sys_draw` draws in this order:

1. Background: dark space fill, few dozen static stars (precomputed positions,
   drawn as 1px rects), soft radial gradient behind the center.
2. Orbit ring: thin dashed circle at `ORBIT_RADIUS` (drop line).
3. Death ring at `DEATH_RADIUS`: faint; pulses red as the breach timer grows.
4. Bodies: sorted by tier ascending so big ones sit on top. Each body:
    - circle fill from the tier color,
    - radial gradient highlight (offset light spot) for volume,
    - darker stroke outline, width scales with radius,
    - simple face or glyph for identity (arc eyes, sparkle cross). Keep glyphs
      to primitive paths only.
      Rotation: apply `ctx.rotate` from `Rotation` degrees.
5. Cloud: rounded blob + the preview element below it.
6. Effects: pop rings (expanding stroked circle, alpha fade, `Lifespan`).

Colors come from `hsva_to_vec4` in `lib/color.ts` converted to CSS strings.
Precompute the CSS string per tier once at load.

Screen shake: in `sys_draw`, before drawing the world, translate the context
by a random offset scaled by `Game.ShakeAmount`; decay it in `sys_shake`.

Resize: `scale = min(width, height) / (2 * DEATH_RADIUS + 2)`. Center the
canvas transform on the viewport middle. Recompute on resize only.

---

## 9. Audio

Copy `lib/audio.ts`. Use `play_note` directly. No `AudioSource` component; a
merge is a one-shot event, so call the synth from `sys_merge` and the drop from
`sys_control_cloud`.

Sounds:

-   Drop: short quiet noise tap (use the built-in noise source).
-   Merge pop: triangle wave, attack 0.001, release 0.15. Note rises with tier:
    `note = 60 + 2 * tier`. Above tier 5 add a fifth and octave for the chord
    progression feel from the design doc.
-   Game over: descending three-note figure.
-   Win: ascending arpeggio.

Autoplay policy: browsers block audio until a user gesture. Create or resume
the `AudioContext` on the first pointer down. Store the context on `Game`.

Music: none. Silence fits the sleepy theme and saves bytes. Revisit after
playtesting.

---

## 10. UI

Pattern from `duszki`: `ui.ts` exports `App(game)` returning an HTML string;
`sys_ui` compares with the previous string and writes `innerHTML` only on
change. Style with inline styles in the string (pattern used by potato and
duszki).

Screens:

-   Title: game name, one line of instructions, "Play". Click starts
    `sce_stage`.
-   HUD (during play): score top-left, best score under it. Nothing else.
-   Game over: score, best score, "Again" button. Click restarts.

Buttons call global functions registered on `window` by `index.ts` (potato
pattern: `window.playNow`). Keep the count of globals at 2: `start`, `restart`.

Font: system sans-serif stack. No web fonts.

---

## 11. Dev page and debug

`index.html` (dev only) mirrors potato: stylesheet links to `play/game.css`
and `play/debug.css`, one canvas, `main`, the debug box with update/delta/fps,
and a pause button wired to `game.Stop()/Start()`.

Add a debug keyboard toggle (`KeyG`) that shows contact points and the
gravity vectors. Gate it with `DEBUG`; esbuild `--define:DEBUG=false` removes
it from the release build.

CI: copy the two workflows from potato. Pull requests run `lint` +
`ts:check`. Pushes to `main` build `play/` and deploy to Pages.

---

## 12. Size budget and commit protocol

Target: `play/index.html` smaller than 13KB. Measure both gzip and zip; the
zip is the shipping number.

Budget guide (gzip):

| Part                                    | Budget |
| --------------------------------------- | ------ |
| HTML + CSS + UI strings                 | 1.0KB  |
| lib (math, vec2, mat2d, audio, misc)    | 2.0KB  |
| physics + merge                         | 2.0KB  |
| draw (background, bodies, effects)      | 2.5KB  |
| control + game flow + UI system         | 1.5KB  |
| data tables + rest                      | 1.0KB  |
| headroom for Roadroller gains and slack | 3.0KB  |

Pipeline notes:

-   `sed.txt` and `terser_compress.txt` come from potato. Property mangling
    regex is `/^[A-Z]/`. Keep data in `PascalCase` fields so they mangle.
-   Roadroller (`goodluck/goodluck/play/Makefile`) squeezes the last 5–10%. Turn
    it on in the final compression pass, not earlier; it slows iteration.
-   Shorten hot names late, not early: readability first, squeeze last.

Commit protocol (from the project owner):

-   Commit after every logical piece. One-line message, no co-author lines,
    author is the default repo author.
-   Append the measured size of `play/index.html` to every commit that changes
    code, in this form:

```
Merge mechanic; 9.4KB gz / 8.1KB zip
```

-   Docs-only commits say `docs` and no size.
-   Before each commit: `npx tsc --noEmit` passes, `npm run lint` passes, the
    game runs, `make -C play` prints the size.

---

## 13. Milestones

Each milestone ends in a commit with a size. Each one leaves the game running.

| #   | Milestone     | Contents                                                                                |
| --- | ------------- | --------------------------------------------------------------------------------------- |
| 1   | Skeleton      | repo layout, lib copies, Game2D loop, empty dark scene, pipeline prints a size          |
| 2   | Fall and pack | elements spawn at center-top, central gravity, circle collisions, they pile into a ball |
| 3   | Cloud control | orbit movement, aim, drop, cooldown, next preview                                       |
| 4   | Merge         | tier table, merge rule, pop animation, score, HUD                                       |
| 5   | Lose and win  | breach timer, game over overlay, restart, unicorn win state                             |
| 6   | Feel          | shake, hit stop, pop rings, synth pops, colors and faces pass                           |
| 7   | Squeeze       | dead code sweep, Roadroller, name squeezing, reach under 13KB                           |

Build order note: milestone 2 reuses potato physics almost verbatim; do it
right after the skeleton so the risky part lands early.

---

## 14. Open risks

-   Canvas fill rate with gradients on many bodies. Mitigation: cache each tier
    as an offscreen canvas at load and `drawImage` it rotated. Costs little
    code, keeps gradients, removes most per-frame path cost. Do this when
    profiling says so, not before.
-   Pile jitter under constant pull. Mitigation: stronger positional correction
    slop (allow 0.01 overlap), raise drag, lower bounce. Tune in milestone 2.
-   Chain merges in one frame destroying entities mid-loop. Mitigation: the
    `Merging` flag defers all destruction effects to flags checked after the
    loop; graveyard reuse makes the destroys safe within the same tick.
