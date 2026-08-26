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
priming, the first step reads a matrix of zeros and drops the element at angle
0. On a restart the viewport size does not change, so `sys_resize2d` would skip
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
