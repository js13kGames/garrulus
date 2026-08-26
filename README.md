# garrulus

A physics puzzle for the "Rainbows and Unicorns" theme. Drop magical elements
from a cloud which rides a circle around the screen. Everything falls toward
the middle. Two elements of one kind become one element of the next kind. Keep
the pile inside the ring.

Built on [Goodluck](https://github.com/piesku/goodluck), a template for small
and fast browser games. The whole game is one HTML file of about 6 KB.

## Play

Move the pointer to aim around the ring. Release the button to drop. A touch
does the same.

## Read this first

-   `game-design-doc.md` -- what the game is.
-   `BUILD.md` -- how to build it with Goodluck.
-   `DECISIONS.md` -- where the code does not follow `BUILD.md`, and why. Read
    this before you change the physics or the death ring.
-   `AGENTS.md` -- how to work in this repository.

## Run it

    npm install
    npm start

Then open http://localhost:1234/src/index.html.

Press `G` during a run to see the contacts and the pull vectors. The release
build does not have this code.

## Check it

    npm test

This runs the format check, the type check, and `src/selftest.ts`. The self test
drives the contact search, the solver, the merge rule, and the breach timer with
no browser.

## Build it

    make -C play

This makes one file, `play/index.html`, with everything inside it, and prints
the gzip size. For the shipping artifact:

    make -C play index.zip

Add `RELEASE=1` for the slow, smaller compression:

    make -C play index.zip RELEASE=1
