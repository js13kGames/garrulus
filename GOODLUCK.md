# How to build a game with Goodluck

Notes for the next agent. This is what it cost to build `garrulus`, written so
that you do not pay the same cost again.

Read `AGENTS.md` first: it tells you how the owner wants you to work. This
document tells you what the template does, what it does not do, and which traps
are waiting.

---

## 1. Before you write any code

### Find out which generation you have

There are two generations of Goodluck, and they are not alike. Look at these
three things:

| Test | Old generation | New generation |
|---|---|---|
| Common code is in | `common/` | `lib/` |
| `lib/game.ts` has a `Game2D` class | yes | **no** |
| `lib/game.ts` has `FixedUpdate` | yes | **no** |
| The transform is | one flat `Transform2D` | `LocalTransform2D` + `SpatialNode2D` |
| Sprites are drawn | WebGL instancing | WebGL instancing |

`goodluck/potato` is the old generation. `goodluck/duszki` and the
`goodluck/goodluck` template are the new one.

**This matters more than anything else in this document.** A design document
written against one generation will send you looking for classes and functions
which do not exist in the other. In `garrulus` the plan said "use `Game2D` from
potato" and "the fixed loop comes from potato", but the repository was the new
generation, which has neither. Both had to be written.

Run these three commands before you plan anything:

    grep -c "class Game2D" lib/game.ts common/game.ts 2>/dev/null
    grep -c "FixedUpdate" lib/game.ts common/game.ts 2>/dev/null
    ls */components/com_spatial_node2d.ts 2>/dev/null

### Read the example which is closest to your game, not the newest one

The examples are the real documentation. Pick by what your game needs:

- `potato` — 2D physics, circle colliders, a fixed step. The nearest thing to a
  physics toy.
- `duszki` — the UI pattern, saved state, music from note data.
- `Platformer2D` — the new transform split and a Context2D renderer.

Read the *system* files of that example before you write your own. They are
short.

### Decide what you are deleting

Goodluck is a template you own, not a library you depend on. You are expected to
delete most of it. A 2D vector game needs none of the WebGL stack: no
`materials/`, no `textures/`, no `meshes/`, no `lib/webgl.ts`.

But do not prune for bytes. **esbuild removes exports which nothing imports**,
so a helper you never call costs nothing in the bundle. Prune for reading time
only, and stop when the tree is clear.

---

## 2. The rules of the template

These are not style preferences. Break them and things stop working.

- An **entity** is a number. It indexes arrays in `World`.
- A **component** is data with no methods. One interface and one factory for
  each file, named `com_<name>.ts`. The factory returns a mixin,
  `(game, entity) => void`, which sets a bit in `World.Signature[entity]`.
- A **system** is a free function in `sys_<name>.ts` with a `QUERY` mask. It
  loops over every entity and tests `(Signature[i] & QUERY) === QUERY`.
- A **blueprint** is an array of mixins. `instantiate(game, [...])` makes the
  entity and runs them. Name them `blu_<thing>.ts`.
- A **scene** is `sce_<name>(game)`. It resets the world and instantiates
  blueprints.
- **There are at most 32 components.** The signature is a 32-bit integer.
- Components and layers are `const enum`s, so they compile to plain numbers.
- Keep all state in `World` or `Game`. No singletons.

### The naming rule is a build contract

The release pipeline runs:

    terser --mangle-props keep_quoted,regex=/^[A-Z]/

**A property whose name starts with a capital letter is renamed. A property
whose name starts with a lowercase letter is not.** So:

- Your own game data must be `PascalCase`. `Velocity`, `Tier`, `ContactCount`.
  It gets short names in the release, which is where the size saving comes from.
- Anything the browser owns must stay lowercase or be quoted: `ctx.fillStyle`,
  `osc.frequency`, `audio.currentTime`. These survive because they are lowercase.
- A web name which is capitalised must be quoted, so `InputState["MouseX"]`,
  never `InputState.MouseX`.

Get this wrong and the development build works while the release build breaks in
a way that is hard to read. **Always open the release build in a browser before
you call the work done.** Do not trust that it compiled.

---

## 3. What the template does not do

Do not assume a file does what its name suggests. Read it.

### The physics does not make a pile

This is the biggest one. `potato/src/systems/sys_collide2d.ts` looks like a
general circle collider. It is not:

- It tests **static against dynamic only**. There is no dynamic against dynamic
  pass. It even defines `intersect_sphere_sphere` and never calls it.
- The resolver applies **one contact for each body**, stored as a single
  `ContactId`.

One contact for each body is enough for a body resting on the ground. It is not
enough for a heap, where one body touches five others. Use it for a pile and the
pile falls through itself.

If you need bodies to stack or pack, write a relaxation solver. It is about 80
lines:

1. Build a contact list: every pair whose distance is less than the sum of radii.
2. Loop over that list several times. Six passes is a reasonable start.
3. On each pass, **read the live positions again**, because earlier passes moved
   the bodies. This is what makes it converge.
4. For each contact: apply a normal impulse split by inverse mass, then a
   positional correction of about 60 percent of the overlap, less a small slop
   of about 0.005 so the pile does not shake.

Keep one `Velocity` for each body, not the template's `VelocityIntegrated` and
`VelocityResolved` pair. The split exists only to serve the single-contact
resolver.

### There is no fixed step in the new generation

The physics must run at a fixed step or it will not be repeatable. Add to
`GameImpl`:

    Start() {
        let accumulator = 0;
        // ... in the tick:
        accumulator = Math.min(accumulator + delta, 10 * STEP);
        while (accumulator >= STEP) {
            accumulator -= STEP;
            this.FixedUpdate(STEP);
            this.FixedReset(STEP);
        }
        this.FrameUpdate(delta);
    }

Clamp the accumulator, or a tab which was in the background comes back and tries
to simulate a minute in one frame.

**Move the input-delta clearing out of `FrameReset` and into `FixedReset`.** If
you clear the deltas once each frame, a click made in a frame which ran no fixed
step is thrown away before the simulation ever sees it.

### Sub-steps, when bodies are fast

A body must never move further than the smallest radius in one step, or small
bodies pass through each other. The distance moved in a step is about
`CenterPull / Drag / 60` for a game with a constant pull.

If a mode wants a low drag or a fast throw, run the physics several times inside
one fixed step at `step / n`. This is cheaper to reason about than re-tuning
every force. **Put this rule in your test suite** so a later tuning cannot break
it quietly.

---

## 4. Traps, with the symptom you will see

These all cost real time. The symptom is given first, because that is what you
will have.

### The browser is running the old bundle

**Symptom:** a change appears to do nothing. Worse: several different settings
give *identical* results.

A module served with no cache headers is cached by the browser, using a guess at
how long it stays fresh. A rebuild gives no sign. In `garrulus` this silently
threw away a whole measurement pass.

**Fix:** serve the development page with `Cache-Control: no-store`. The Python
default server does not do this; write six lines that do.

**Check:** read a field you have just added. If it is `undefined`, the browser
does not have your code. Do this before you conclude anything from a measurement.

### The world matrix is zeros on the first step

**Symptom:** everything happens at the origin, or at angle 0, on the first frame
and after every restart.

`SpatialNode2D.World` is a view into a buffer which starts at zero.
`sys_transform2d` fills it, and it runs in `FixedUpdate`. `sys_camera2d`, which
copies the camera matrix, runs in `FrameUpdate` — **after** the first
`FixedUpdate`. So the first fixed step reads a matrix of zeros, and anything
which turns a pointer into a world position gets nonsense.

**Fix:** at the end of your scene function, run `sys_resize2d`,
`sys_transform2d` and `sys_camera2d` once by hand. Set
`game.ViewportResized = true` first, or `sys_resize2d` skips the new camera on a
restart, because the window did not change size.

### A fast click is lost

**Symptom:** a click does nothing, sometimes. Automated clicks never work.

`mousedown` writes `1` into `InputDelta["Mouse0"]`. `mouseup` writes `-1` over
it. If both happen between two fixed steps, the press is gone.

**Fix:** trigger on release, `InputDelta["Mouse0"] === -1`. The release is
always the last write, so it always survives. For touch, read the pointer
position on the release frame too: `InputState["Touch0X"]` keeps the last
position after the touch is up.

### The canvas draws upside down

**Symptom:** the scene is mirrored top to bottom, or you find yourself negating
Y in scattered places.

The camera matrix composed with the viewport gives a space where world +Y points
**down** the screen. The template handles this by conjugating every node matrix,
which is why `sys_draw2d` negates terms.

**Fix:** apply `ctx.scale(1, -1)` once, right after the camera transform. Then
everything below draws in world coordinates with +Y up, and a world matrix can
be handed to `ctx.transform` unchanged.

### `requestAnimationFrame` stops when nothing is looking

**Symptom:** the game seems frozen or extremely slow while you drive it from a
tool, and the numbers make no sense.

A tab which is not being rendered does not get animation frames. Any test which
clicks and then waits is measuring the wrong thing.

**Fix:** do not test the simulation through the browser's clock. Call
`game.FixedUpdate(1/60)` in a loop from the console. It is repeatable, it is
instant, and it is the same code path the real loop uses.

---

## 5. How to test

### Write one headless check, early

Most systems touch only `game.World` and plain fields. They do not need a canvas
or an audio context. So a plain object can stand in for the `Game`:

    function make_game(): Game {
        return {World: new World(64), Contacts: [], ContactCount: 0, Score: 0}
            as unknown as Game;
    }

Then a check is: build a world, step it, assert. No framework. `console.log` and
a counter are enough.

Two details make it work:

- `lib/game.ts` reads debug elements when the module loads, so the bundle needs
  a DOM stub. Do it with an esbuild banner and change no source:

      --banner:js="globalThis.document={getElementById:()=>null};"

- Do not use `process.exit` unless you want the node type definitions. Throw
  instead; node exits non-zero on an uncaught error.

Test the things which are easy to get wrong and silent when wrong: the contact
search, the solver, the merge or scoring rule, and every rule you tuned by hand.

### Drive the real game from the console, not the mouse

Expose the game on `window` behind `DEBUG`. Then a scripted player is a loop
which sets `InputState["MouseX"]`, sets `InputDelta["Mouse0"] = -1` and calls
`game.FixedUpdate(1/60)`.

This gives you real numbers about the real game: how long a run lasts, what it
scores, how far it gets. Use it.

### Never tune on one run

Two settings one step apart gave 33 and 95 seconds on a single run each in
`garrulus`. That is noise, and a decision made on it is a coin toss. Run each
setting **four times** with different starting conditions and take the mean.
Report the spread as well as the mean.

---

## 6. Check the design before you build it

A design document describes an intention. The geometry may not support it. Check
the arithmetic of every mechanic *before* you implement it. Three real examples
from this project:

- **Two circles given the same radius.** The spawn ring and the death ring were
  both 10. An element spawns on the spawn ring, so it was over the death line
  the moment it existed, and the losing timer ran from the first drop.
- **A boundary test which counts objects in flight.** After the rings were made
  different, elements still spawned *outside* the death ring and were outside
  for the whole fall. Every drop looked like a breach. The fix was to arm an
  element the first time it is fully inside, and count only armed elements.
- **A throw which cannot apply torque.** The design asked that a heavy item
  dropped off-centre should spin the pile. The throw aimed at the centre, so its
  line of travel passed through the centre, so it carried no angular momentum at
  all, whatever its mass. The measured spin was 0.009 radians each second. The
  mechanic was impossible as written and needed a sideways component.

None of these were coding mistakes. All three were geometry which nobody had
checked. **When the design gives you numbers, put them into the formula and see
what comes out.** Say so early, propose the fix, and keep building.

A related lesson: **constraints multiply, they do not add.** Three difficulty
mechanics which each shorten a run, combined at full strength, produced a mode
shorter than any one of them alone. Combine at reduced strength and measure.

---

## 7. The build

    npm start                    # development server
    make -C play                 # one HTML file, prints the gzip size
    make -C play index.zip       # the artifact to ship
    make -C play index.zip RELEASE=1   # slow, smaller

The pipeline is `tsc` → `esbuild` → `sed` → `terser` → Roadroller → `posthtml`.
It inlines everything into one file.

Two things to check in the `Makefile`:

- Some copies print the gzip size on the `all` target and some do not. If the
  owner wants sizes in commit messages, add the line:

      @printf "Size gzipped: %s bytes\n" $(shell gzip index.html --stdout | wc -c)

- `--define:DEBUG=false` in the release means anything inside `if (DEBUG)` is
  removed by terser. Put debug overlays and console globals behind it and they
  cost nothing.

Exclude the reference copies of other games from `tsconfig.json` and from
Prettier, or the type check and the format check both fail on code you do not
own.

**Do not run `prettier --write .` in a repository with hand-written Markdown.**
It reformats list markers and produces a large, meaningless diff on documents
which are not yours. Add `*.md` to `.prettierignore`.

---

## 8. How to work

- Commit after each logical piece. Follow the owner's message format. If they
  ask for the bundle size, measure it first and put the real number in — do not
  write the message before you build.
- Take a screenshot of anything visual and look at it. Several bugs in this
  project were obvious in a picture and invisible in the state dump. Several
  others were the opposite: the picture looked fine and the numbers were wrong.
  Use both.
- Write down every place you departed from the design document, with the reason
  and the measurement. `garrulus` keeps this in `DECISIONS.md`. It is the file
  the owner reads first when they come back, and it is what makes your tuning
  possible to argue with.
- When you tune by feel, say that you tuned by feel. When you tune by
  measurement, give the table.
