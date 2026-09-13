# garrulus

A physics puzzle in the family of *Suika Game*, with the container turned inside
out.

There is no box. A cloud rides a circle around the edge of the screen, and
everything it drops falls toward the middle. The elements pack into a rotating
ball. Two elements of one kind become one element of the next kind, from a
Sparkle up to a Cosmic Unicorn. If the mass leans on the death ring for three
seconds without a break, the run ends.

Built on [Goodluck](https://github.com/piesku/goodluck), a template for small
and fast browser games. The whole game is one HTML file of about 7.4 KB, with no
image files and no sound files: every shape is a path, and every note comes from
an oscillator.

## Play

Move the pointer to aim around the ring. Release the button to drop. A touch
does the same.

In Maelstrom, the *sweep* of the pointer matters as well as where it points. Flick
it around the ring before you release. The element goes in sideways and turns
the whole pile.

## Maelstrom

The game uses the final tuning from the mode tests. The arena is tight. Elements
are lumpy and grind against each other. Two dead stars block the arena. A fast
sweep spins the pile. Elements shrink near the middle and swell near the rim.

The final tuning is in `src/modes.ts`. `DISTANCE_SCALE_MULTIPLIER` controls the
extra growth away from the center and is set to `4`.

## What is in the source

- `src/modes.ts` — the final game tuning. Start here.
- `src/game.ts` — the `Game` class, the order of the systems, and the constants
  which are the same in every mode.
- `src/world.ts` — the components.
- `src/components/` — data only, one file for each component.
- `src/systems/` — the logic, one file for each system.
- `src/scenes/` — the blueprints and the one scene.
- `src/selftest.ts` — the checks. It needs no browser.

The physics is a relaxation solver over a list of contacts. It handles many
contacts on one body, which a pile needs. Elements can be more than one circle,
which is how the lumpy shapes work. Bodies with an inverse mass of zero never
move, which is how the dead stars work.

## Read this first

- `game-design-doc.md` — what the game is.
- `new-modes.md` — why the modes exist and what each one tests.
- `BUILD.md` — how to build it with Goodluck.
- `DECISIONS.md` — every place the code does not follow those documents, and
  why, with the numbers each choice was measured against. **Read this before you
  change the physics, the death ring, or any mode.** Several of the mechanics as
  first written could not work; the entries say what was wrong and how it was
  found.
- `AGENTS.md` — how to work in this repository.
- `GOODLUCK.md` — how to build a game with Goodluck at all: which generation you
  have, what the template does not do, and the traps. Written for whoever starts
  the next one.

## Run it

    npm install
    npm start

Then open http://localhost:1234/src/index.html.

Press `G` during a run to see the contacts and the pull vectors. The release
build does not have this code.

**If a change appears to do nothing,** the browser is probably running the old
bundle. A module served with no cache headers is cached by a guess at how long
it stays fresh, and a rebuild gives no sign. Serve the page with
`Cache-Control: no-store`, or read a field you have just added and see whether
it is `undefined`. This wasted a whole measurement pass once; see DECISIONS.md,
decision 31.

## Check it

    npm test

This runs the format check, the type check, and `src/selftest.ts`. The self test
drives the contact search, solver, merge rule, breach timer, and final tuning.
It also checks that a body cannot move farther than the smallest radius in one
step, so a tuning change cannot quietly break the physics.

## Build it

    make -C play

This makes one file, `play/index.html`, with everything inside it, and prints
the gzip size. For the shipping artifact:

    make -C play index.zip

Add `RELEASE=1` for the slow, smaller compression:

    make -C play index.zip RELEASE=1

The shipping target is 13 KB. Put the measured size in every commit message, as
`AGENTS.md` asks.
