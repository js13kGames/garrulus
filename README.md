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

In the "Momentum" and "Maelstrom" modes the *sweep* of the pointer matters as
well as where it points. Flick the cloud around the ring before you release, and
the element goes in sideways and turns the whole pile.

## The five modes

The game is a test bench, not a finished game. The first build was not tense
enough: the arena is a full circle, so the mass could always spread outward, and
the area grows with the square of the radius. `new-modes.md` proposes three ways
to take that room away. Each is a mode here, plus one which runs all three at
once.

| Mode | What it changes |
|---|---|
| **Classic** | Nothing. The first build, kept to measure the others against. |
| **Claustrophobia** | The arena is 40 percent tighter, and the top tiers grow much faster. |
| **Jagged Orbit** | Elements are lumpy, they grind instead of sliding, and three dead stars block the arena. |
| **Momentum** | A sweep of the cloud spins the whole pile. Spin too hard and the rim throws itself out. |
| **Maelstrom** | All three at once, plus: an element shrinks near the middle and swells near the rim. |

A bot which drops as fast as the cooldown allows measures them like this. A
person deliberates, so a real run is longer.

| Mode | Drops | Seconds | Score | Top tier | Turn rate |
|---|---|---|---|---|---|
| Classic | 452 | 173 | 4717 | 8.8 | 0.02 |
| Claustrophobia | 125 | 49 | 916 | 7.0 | 0.04 |
| Jagged Orbit | 235 | 90 | 2448 | 8.5 | 0.05 |
| Momentum | 236 | 91 | 2024 | 7.8 | 0.31 |
| Maelstrom | 189 | 72 | 2033 | 8.5 | 0.30 |

Every mode is only a row of numbers in `src/modes.ts`. No mode has code of its
own. To change one, or to add one, edit that table.

## What is in the source

- `src/modes.ts` — the tuning of each mode. Start here.
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
drives the contact search, the solver, the merge rule, the breach timer, and
every mode switch, with no browser. It also holds each mode against the rule
that a body must not move further than the smallest radius in one step, so a new
tuning cannot quietly break the physics.

## Build it

    make -C play

This makes one file, `play/index.html`, with everything inside it, and prints
the gzip size. For the shipping artifact:

    make -C play index.zip

Add `RELEASE=1` for the slow, smaller compression:

    make -C play index.zip RELEASE=1

The size target of 13 KB is not being held while the modes are tested. Put the
measured size in every commit message, as `AGENTS.md` asks.

## What to do next

The numbers above say which modes fit a three to seven minute run. They cannot
say which one is fun. Play "Jagged Orbit" and "Maelstrom" one after the other:
they are the closest pair, and the question between them is whether the spin
adds to the puzzle or distracts from it.
