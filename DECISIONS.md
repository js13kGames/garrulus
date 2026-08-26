# Decisions

This document records the decisions that `BUILD.md` does not make, or makes
differently. Read it with `BUILD.md` and `game-design-doc.md`. Each entry gives
the decision and the reason. Change any of them if you do not agree.

---

## 1. Base generation: the new transform split

`BUILD.md` section 2 tells you to copy the structure of `goodluck/potato`, which
keeps one flat `Transform2D` for each entity. The repository was bootstrapped
from `Platformer2D`, which splits the transform into `LocalTransform2D` and
`SpatialNode2D`.

**Decision:** keep `LocalTransform2D` + `SpatialNode2D`.

**Reason:** the project owner asked for it. Parenting is necessary later for
particles, for graphics tests, and for effects attached to an element.

## 2. Renderer: Context2D, not WebGL

`potato` and `Platformer2D` both draw sprites through a WebGL instanced
renderer. `garrulus` is vector art with no image files.

**Decision:** delete all WebGL code, all materials, all textures, and all
meshes. Draw with the Context2D API only. `lib/game.ts` has a new `Game2D`
class, which has one canvas, one 2D context, and one `AudioContext`.

**Reason:** vector circles and gradients are native to Context2D. The GL stack
costs many kilobytes and gives us nothing.

## 3. A bespoke `sys_draw`, not the template `sys_draw2d`

The bootstrapped code had `com_draw.ts` and `sys_draw2d.ts`, which draw generic
primitives (`Rect`, `Arc`, `Text`).

**Decision:** delete both. Write one `sys_draw` that knows the game.

**Reason:** the background, the two rings, the element faces, the cloud, and the
pop rings are all different. A generic primitive component cannot make them.
One system that draws the known scene is smaller than a generic component plus
the code to configure it.

## 4. No fast path in `sys_transform2d`

The template computes the world matrix in the shader for entities that have
`LocalTransform2D` but no `SpatialNode2D`.

**Decision:** remove that path. All drawn entities must have `SpatialNode2D`.

**Reason:** there is no shader any more. The path wrote data that nothing read.

## 5. The fixed step lives in `lib/game.ts`

`BUILD.md` section 6 says the fixed 60 Hz loop comes from `potato`
(`common/game.ts`). The `lib/game.ts` in this repository is the newer
generation. It has no `FixedUpdate` and no accumulator.

**Decision:** add `STEP`, `FixedUpdate`, and `FixedReset` to `GameImpl`.

**Reason:** the physics must be deterministic. A variable step makes the pile
jitter.

**Related change:** the input deltas are now cleared in `FixedReset`, not in
`FrameReset`. If a frame runs no fixed step, a click made in that frame stays in
`InputDelta` until a fixed step reads it. The old code cleared the deltas each
frame, which could lose a drop.

## 6. One velocity, not two

`potato` keeps `VelocityIntegrated` and `VelocityResolved` on each body,
because its resolver applies one contact for each body.

**Decision:** keep one `Velocity`. See decision 7.

**Reason:** an iterative solver reads and writes the same velocity many times in
one step. The split gives nothing and costs bytes.

## 7. A new solver, because `potato` cannot make a pile

This is the largest correction to `BUILD.md`. Sections 7.3 and 7.4 say to keep
the `potato` collision code and its resolver. Read
`goodluck/potato/src/systems/sys_collide2d.ts`: it tests **static against
dynamic** only. It has an `intersect_sphere_sphere` function, but nothing calls
it. Its resolver applies a single `ContactId` for each body.

A Suika pile needs many contacts on one body at the same time.

**Decision:** write `sys_collide_circle`, which finds all dynamic pairs and
fills a contact list on `Game`. Write `sys_physics2d_resolve`, which does
several iterations of impulse and position correction over that list.

**Reason:** with one contact for each body, the pile falls through itself.

## 8. No `Shake` component

`BUILD.md` section 5 lists a `Shake` component. Section 8 keeps the shake value
on `Game`.

**Decision:** keep one number, `Game.ShakeAmount`. Delete `com_shake.ts` and
`sys_shake2d.ts`.

**Reason:** the shake moves the camera, and there is one camera. A component
array for one value is waste.

## 9. Colors are CSS strings in a table

`BUILD.md` section 8 says to make the colors with `hsva_to_vec4` from
`lib/color.ts`, then convert them to CSS strings.

**Decision:** write the CSS strings directly in the element table. Delete
`lib/color.ts`.

**Reason:** the colors are constant. Computing them at load costs code and gives
the same result.

## 10. `DEATH_RADIUS` is 8.5, not 10

`BUILD.md` section 5 sets `ORBIT_RADIUS = 10` and `DEATH_RADIUS = 10`. Section
7.6 ends the game when `length(position) + radius > DEATH_RADIUS`. An element
starts on the orbit circle, so `10 + 0.45 > 10` is true immediately. The breach
timer would start at every drop.

**Decision:** `DEATH_RADIUS = 8.5`. The camera shows a radius of
`ORBIT_RADIUS + 1.5`, so the cloud stays on the screen.

**Reason:** the two circles must be different, or the game cannot be played.
The project owner agreed to tune this number during play tests.

## 11. `lib/audio.ts` is deleted

`BUILD.md` section 9 says to use `play_note` from `lib/audio.ts`.

**Decision:** delete `lib/audio.ts`. Write a small synthesizer in
`src/sounds.ts`.

**Reason:** `play_note` is one large function with an `Instrument` data model of
many parameters. `garrulus` makes four sounds. A direct oscillator with a gain
envelope is much smaller than the data that `play_note` needs.

## 12. Merge keeps the entity with the lower number

`BUILD.md` section 7.5 says to keep "the older entity". Entity numbers are
recycled through the graveyard, so the number does not give the age.

**Decision:** keep the entity with the lower number. Destroy the other one.

**Reason:** the rule must be the same for both partners of the merge, or both
sides destroy each other. Which one survives does not matter, because the
survivor takes the mass-weighted position of both.

## 13. No `sys_gravity`

`BUILD.md` section 6 gives the center pull its own system, which writes an
`Acceleration` field that `sys_physics2d_integrate` then reads.

**Decision:** apply the pull inside `sys_physics2d_integrate`. Delete the
`Acceleration` field.

**Reason:** there is one force in this game. A second loop over the same bodies,
and a field to carry the result between them, gives nothing.

## 14. The pull is 16, not 40; the drag is 0.9, not 0.4

`BUILD.md` section 5 sets `CENTER_PULL = 40` and `DRAG = 0.4`.

**Decision:** `CENTER_PULL = 16`, `DRAG = 0.9`, `BOUNCE = 0.1`.

**Reason:** with 40 and 0.4, a body reaches about 28 units each second. In one
fixed step that is 0.47 units, which is more than the radius of a Sparkle
(0.45). Small elements pass through each other. 16 with 0.9 settles at about 18
units each second, or 0.3 units in a step.

Measured with 40 elements: the pile packs in about 4 seconds, then creeps at
less than 0.3 units each second. The worst overlap that stays is 0.04 units.

**If you tune these:** keep `CENTER_PULL / DRAG` below `27`, or the smallest
elements start to tunnel. Raise `SOLVER_ITERATIONS` if the pile looks soft.

## 15. The drop fires on release, not on press

**Decision:** `sys_control_cloud` drops when `InputDelta["Mouse0"]` or
`InputDelta["Touch0"]` is `-1`.

**Reason:** a press writes `1` into `InputDelta`, and the release writes `-1`
over it. If both happen between two fixed steps, the press is lost and no
element drops. The release is always the last write, so it always survives to
the next fixed step. This was seen with a fast click; it is not only a problem
for test tools.

The pointer position for a touch is read on the release frame as well, because
`InputState["Touch0X"]` keeps the last position after the touch is up.

## 16. The scene primes the camera

`scene_stage` runs `sys_resize2d`, `sys_transform2d`, and `sys_camera2d` once,
and sets `ViewportResized` first.

**Reason:** `sys_control_cloud` turns the pointer into a world angle with the
camera projection and the camera world matrix. Both are made by systems which
run in `FrameUpdate`, which comes after the first `FixedUpdate`. Without the
priming, the first step reads a matrix of zeros and drops the element at angle 0. On a restart the viewport size does not change, so `sys_resize2d` would skip
the new camera; `ViewportResized` forces the update.

## 17. Two Cosmic Unicorns cancel out

`BUILD.md` section 7.5 says two top-tier elements win the game, and that play
goes on, but it does not say what happens to the two elements.

**Decision:** destroy both. Give twice the tier score, set `Won`, and shake the
screen hard.

**Reason:** there is no tier above the top one, so they cannot merge into
anything. Removing both gives the board room back, which is the reward for the
work, and it is what the games of this family do.

## 18. There is one runnable check: `npm run test:sim`

`src/selftest.ts` tests the contact search, the solver, and the merge rule
without a browser. It builds a plain object in place of the `Game`, because
those systems read `game.World` and the contact list only.

`npm test` runs the format check, the type check, and this check.

The build stubs `document.getElementById` with an esbuild banner, because
`lib/game.ts` reads the debug elements when the module loads. The self test is
never imported by `index.ts`, so it is not in the release bundle.

## 19. An element counts for the breach only after it arms itself

This is the second half of the `DEATH_RADIUS` problem in decision 10.

Elements drop from the orbit circle at radius 10, and the death ring is at 8.5.
An element is therefore outside the death ring for its whole fall. With
`BUILD.md` section 7.6 as written, the timer fills while any element is over the
line, so the timer would fill during every drop and the run would end about
three seconds after the first one, whatever the player did. This was seen: the
first test run ended with only twelve elements on the board.

**Decision:** each element carries an `Armed` flag on its `Merge` component.
The flag is set the first time the element is fully inside the death ring.
`sys_game_over` counts armed elements only.

**Reason:** an element which is not armed yet is one which is still falling.
The rule is exact, needs no speed threshold to tune, and needs no new component.

## 20. One global, not two

`BUILD.md` section 10 asks for two globals, `start` and `restart`.

**Decision:** one, `window.play()`. It resets the scene and sets the play state.

**Reason:** "Play" and "Again" do the same thing. It also resumes the
`AudioContext`, because a browser blocks audio until a gesture, and a click on
either button is that gesture.

## 21. The pop ring has no component of its own

A merge ring is an entity with `SpatialNode2D`, `LocalTransform2D`, and
`Lifespan`, and nothing else. The transform scale carries the radius of the
element which merged, and `sys_draw` finds a ring by looking for a lifespan on
an entity which is not an element.

**Reason:** a new component would be a new bit, a new array, and a new file, to
hold two numbers which two existing components already hold.

## 22. Shake decays in `sys_draw`

`BUILD.md` section 6 gives the shake its own system in FrameUpdate.

**Decision:** `sys_draw` applies the shake and decays it in the same place. The
value is clamped to `SHAKE_MAX` on the way out, so a long chain of merges cannot
build a number which then takes seconds to settle.

**Reason:** `sys_draw` is the only reader. A separate file and a second loop
over one number is not worth it.

## 23. The drop sound is a low square blip, not noise

`BUILD.md` section 9 asks for a noise tap on the drop.

**Decision:** a 60 ms square wave at a low note.

**Reason:** a noise source needs an `AudioBuffer` filled with random samples.
That is more code than the whole rest of `sounds.ts`, for a sound which is
almost under the merge pops.

## 24. The squeeze stopped early

`BUILD.md` section 12 sets a budget of 13 KB and section 13 gives milestone 7 to
name squeezing and dead code sweeps.

**Decision:** the sweep removed `lib/number.ts` (nothing imported it),
`query_up`, `query_down`, and the five unused transform mixins. Roadroller is
on. Nothing was renamed by hand.

**Reason:** the build is 6.0 KB zipped, which is 46 percent of the budget. Hand
squeezing costs readability and buys nothing here. Do it when a feature pushes
the number near 12 KB, not before. esbuild removes unused exports on its own,
so a helper which nothing calls costs no bytes, only reading time.

Measured budget against `BUILD.md` section 12, gzipped: 6.2 KB used of the 13 KB
target, with 3.0 KB of the plan set aside as headroom.

---

# Test modes

The entries below cover the three modes of `new-modes.md`. The size budget is
off while these are tested; the size still goes in every commit message.

## 25. A mode is a row of numbers, not a scene

`new-modes.md` says the modes are "separate scenes or toggles".

**Decision:** one table, `src/modes.ts`. A mode is a `Tuning` record which
`scene_stage` copies onto `Game.Tuning`. No mode has code of its own; the
systems read the tuning. Three switches in the table change shape rather than
numbers: `Bumps`, `DeadStars`, and `Fling`.

**Reason:** three scenes would be three copies of the same scene. A table also
makes the modes comparable, which is what the test is for, and lets a mode be
tuned from the console without a rebuild.

Mode 0 is the game as it was, kept as the thing to measure against.

## 26. Four engine parts the modes needed

None of these existed before, and each is used by more than one mode:

- **Compound colliders.** `CollideCircle` holds `Parts`, a flat list of
  [x, y, radius] triples in the local frame, instead of one radius. A plain
  element is one part; a jagged one is a core and two bumps. The search is a
  cheap test on the radius which holds the whole shape, then part against part.
- **Friction.** The solver takes a share of the sliding at each contact away,
  once for each contact in a step. Without it the pile packs into a smooth ball
  and never turns.
- **Immovable bodies.** An inverse mass of zero. `sys_physics2d_integrate`
  leaves them alone and the solver cannot move them. Dead stars use this.
- **Sub-steps.** The physics runs `SubSteps` times inside one fixed step. A mode
  with a low drag lets bodies get fast, and a body must not move further than
  the smallest radius in one step. The self test checks every mode against this
  rule, so a future tuning cannot break it quietly.

## 27. A throw at the middle cannot spin anything

Mode 3 asks that "dropping a heavy item off-centre transfers massive momentum
to the core cluster". It could not, and measurement showed why: the element left
the cloud with the velocity `[-cos(angle) * speed, -sin(angle) * speed]`, which
points exactly at the middle. Its line of travel passes through the middle, so
it carries no turning force about the middle at all, whatever its mass. The
measured turn rate of the mass was 0.009 radians each second, which is nothing.

**Decision:** the element takes the sideways sweep of the cloud with it. The
`DropCloud` component keeps a smoothed `Swing`, and a mode with `Fling` above
zero turns that into sideways speed. A quick sweep before the release throws the
element in at an angle.

**Reason:** it is the only way to give the player control of the spin, and it
matches the "Strategic Spinning" line of the document. Measured after the
change: 0.33 radians each second on average, over 2 at the peak, against 0.02
for Classic.

**The cap matters.** Giving the element the whole speed of the cloud is the
honest physics, but a pointer sweeps far faster than anyone could throw: at the
full rate every drop left the arena and runs ended in 4 to 11 seconds with a
score of 0. The sideways speed is capped at 0.8 of the inward speed.

## 28. The Momentum numbers are measured, not chosen

The first tuning of mode 3 (`CenterPull` 10, `Drag` 0.2) did not work: with so
little pull and so little drag the elements orbited near the death ring instead
of settling, and runs ended in seconds. A sweep of the parameters gave the
window:

| Pull | Drag | Fling | Seconds | Score | Turn rate |
|---|---|---|---|---|---|
| 10 | 0.2 | 0.5 | 4 to 11 | 0 to 3 | high, but nothing packs |
| 16 | 0.3 | 0.45 | 8 | 58 | 1.74 |
| 16 | 0.4 | 0.3 | 101 | 2271 | 0.23 |
| **16** | **0.4** | **0.45** | **109** | **2650** | **0.26** |
| 16 | 0.4 | 0.6 | 7 | 0 | 1.70 |

Above `Fling` 0.45 the mode falls off a cliff. Keep it below that if you tune.

## 29. Mode 4 "Maelstrom": the three constraints multiply

The fourth mode runs all three tests together: the big top tiers of
Claustrophobia in a tighter arena, the bumps and dead stars of Jagged Orbit, and
the sweep-to-spin of Momentum.

**The lesson:** the constraints multiply, they do not add. Built with the
numbers each mode uses on its own -- the 40 percent tighter arena and three dead
stars -- a run lasted 43 seconds, which made the combined mode the *shortest* of
the five, shorter than Claustrophobia. Adding a third constraint on top of two
does not make a mode a third harder; it cuts what room is left.

**Decision:** the arena is 5 percent tighter than Classic, not 40, and there are
two dead stars, not three. Everything else is taken from the other modes
unchanged. The bumps and the exponential radii carry the "everything is bigger"
part.

Measured, four runs of each setting:

| Arena | Dead stars | Seconds | Score |
|---|---|---|---|
| 8 / 6.8 | 2 | 43 | 989 |
| 9 / 7.65 | 3 | 51 | 1250 |
| 9.5 / 8.08 | 3 | 57 | 1436 |
| **9.5 / 8** | **2** | **71** | **1943** |
| 10 / 8.5 | 3 | 76 | 1919 |

The arena size and the number of dead stars decide the length. The radius table
hardly matters: at the same arena, the linear radii gave 60 seconds against 57
for the exponential ones.

**A note on the readings.** One run of a mode says very little. Two settings one
step apart gave 33 and 95 seconds on a single run each. Every number in the
tables above is the mean of four runs with different starting angles. Do not
tune a mode on one run.

## 30. Size by distance from the middle, in Maelstrom

An element is small near the middle and big near the death ring:
`ScaleCenter` at the middle, `ScaleEdge` at the ring, straight line between.
Both at 1 turns it off, which is what every other mode uses.

The shape is scaled, not the mass. If the mass moved with the size, a body
pushed outward would gain weight for nothing, and the solver would turn that
into energy the pile never spent. The self test holds the two apart.

**It rewards, it does not only punish.** Measured over four runs of each:

| ScaleCenter / ScaleEdge | Seconds | Score | Top tier |
|---|---|---|---|
| 1.0 / 1.0 (off) | 62 | 1592 | 8.0 |
| 0.85 / 1.15 | 58 | 1586 | 8.0 |
| **0.7 / 1.3** | **75** | **2106** | **8.5** |
| 0.55 / 1.45 | 61 | 1673 | 8.0 |
| 0.6 / 1.0 (shrink only) | 102 | 3038 | 9.0 |
| 1.0 / 1.4 (grow only) | 41 | 981 | 7.3 |

The two halves of the rule pull opposite ways, and they are worth reading
separately. Growing at the rim alone is the harshest thing tried on this game:
41 seconds, and the run never gets past tier 7. Shrinking at the middle alone is
the kindest: 102 seconds and a Cosmic Unicorn. Together at 0.7 / 1.3 the run is
*longer* than with the rule off, because most of the pile sits nearer the middle
than the rim, so the room given back is worth more than the room taken.

That is what makes the rule worth keeping: it is not a difficulty knob. It adds
a second reason to push mass inward, and it makes the outside of the pile the
place the player has to watch.

**The preview follows.** The cloud rides outside the death ring, so an element
dropped from it arrives at `ScaleEdge`. The preview under the cloud is drawn at
that size, not at the size of the tier, or it would promise something smaller
than what lands.

## 31. Serve the dev page with no caching

`play/index.html` is one file, but the dev page loads `src/index.js` as a
module. Chrome caches a module served with no cache headers, using a guess at
how long it stays fresh. After a rebuild the browser therefore keeps running the
old bundle, with no sign that anything is wrong.

This wasted a measurement pass: four different settings of the size rule all
returned exactly the same numbers, because none of them were in the bundle the
page was running. The giveaway was that the results were *identical*, not merely
close.

**Use a server which sends `Cache-Control: no-store`.** If a change appears to
do nothing, check that the browser has it before you conclude anything: read a
field you have just added and see whether it is `undefined`.
