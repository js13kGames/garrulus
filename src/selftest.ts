/**
 * # selftest
 *
 * The one runnable check for the parts which are easy to get wrong: the contact
 * search, the relaxation solver, and the merge rule.
 *
 * Run it with `npm run test:sim`. It needs no browser: the systems it tests
 * touch `game.World` and the contact list only, so a plain object stands in for
 * the `Game`.
 */

import {instantiate} from "../lib/game.js";
import {Game} from "./game.js";
import {ELEMENTS, TOP_TIER, blueprint_element} from "./scenes/blu_element.js";
import {sys_collide_circle} from "./systems/sys_collide_circle.js";
import {sys_merge} from "./systems/sys_merge.js";
import {sys_physics2d_integrate} from "./systems/sys_physics2d_integrate.js";
import {sys_physics2d_resolve} from "./systems/sys_physics2d_resolve.js";
import {sys_transform2d} from "./systems/sys_transform2d.js";
import {Has, World} from "./world.js";

const STEP = 1 / 60;

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
    if (condition) {
        console.log(`  ok   ${name}`);
    } else {
        failures++;
        console.log(`  FAIL ${name}${detail && ` -- ${detail}`}`);
    }
}

/**
 * A Game with only the fields the simulation systems read.
 *
 * The cast goes through `unknown` on purpose: this object is deliberately not a
 * whole `Game`. It has no canvas, no audio, and no loop.
 */
function make_game(): Game {
    return {
        World: new World(64),
        Contacts: [],
        ContactCount: 0,
        Score: 0,
        Won: false,
        HitStop: 0,
        ShakeAmount: 0,
        BreachTime: 0,
    } as unknown as Game;
}

function count_elements(game: Game) {
    let n = 0;
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if (game.World.Signature[ent] & Has.Merge) {
            n++;
        }
    }
    return n;
}

function distance(game: Game, a: number, b: number) {
    let pa = game.World.LocalTransform2D[a].Translation;
    let pb = game.World.LocalTransform2D[b].Translation;
    return Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
}

/**
 * Run the part of FixedUpdate which needs no input and no camera.
 *
 * `pull` turns the center pull on. Leave it off to test the solver and the
 * merge rule on their own; turn it on to test what the pile really does.
 */
function step(game: Game, pull = false) {
    if (pull) {
        sys_physics2d_integrate(game, STEP);
    }
    sys_transform2d(game, STEP);
    sys_collide_circle(game, STEP);
    sys_physics2d_resolve(game, STEP);
    sys_merge(game, STEP);
    sys_transform2d(game, STEP);
}

console.log("contacts");
{
    let game = make_game();
    let a = instantiate(game, blueprint_element(0, [0, 0], [0, 0]));
    let b = instantiate(game, blueprint_element(0, [0.5, 0], [0, 0]));
    let far = instantiate(game, blueprint_element(0, [5, 0], [0, 0]));
    sys_transform2d(game, STEP);
    sys_collide_circle(game, STEP);
    check(
        "overlapping pair makes one contact",
        game.ContactCount === 1,
        `got ${game.ContactCount}`,
    );
    check(
        "the contact names the overlapping pair",
        game.Contacts[0].A === a && game.Contacts[0].B === b,
    );
    check("a distant circle makes no contact", far !== undefined && game.ContactCount === 1);
}

console.log("solver");
{
    let game = make_game();
    // Two Sparkles almost on top of each other. Radius 0.45 each, so they must
    // end up about 0.9 apart.
    let a = instantiate(game, blueprint_element(0, [0, 0], [0, 0]));
    let b = instantiate(game, blueprint_element(0, [0.05, 0], [0, 0]));
    // Take the merge out of it; this test is about separation only.
    game.World.Merge[a].Cooldown = 999;
    game.World.Merge[b].Cooldown = 999;
    for (let i = 0; i < 60; i++) {
        step(game);
    }
    let gap = distance(game, a, b);
    let sum = ELEMENTS[0][0] * 2;
    check("the solver pushes an overlap apart", gap > sum - 0.02, `gap ${gap.toFixed(4)}`);
    check("the solver does not overshoot", gap < sum + 0.02, `gap ${gap.toFixed(4)}`);
}

console.log("merge");
{
    let game = make_game();
    instantiate(game, blueprint_element(2, [0, 0], [0, 0]));
    instantiate(game, blueprint_element(2, [0.9, 0], [0, 0]));
    step(game);
    check("two of one tier become one", count_elements(game) === 1, `got ${count_elements(game)}`);

    let survivor = -1;
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if (game.World.Signature[ent] & Has.Merge) {
            survivor = ent;
        }
    }
    check("the survivor is one tier up", game.World.Merge[survivor].Tier === 3);
    check(
        "the collider grows to the new radius",
        game.World.CollideCircle[survivor].Radius === ELEMENTS[3][0],
    );
    check(
        "the mass follows the new radius",
        Math.abs(game.World.RigidBody2D[survivor].InverseMass - 1 / ELEMENTS[3][0] ** 2) < 1e-9,
    );
    check(
        "the survivor sits between the two",
        Math.abs(game.World.LocalTransform2D[survivor].Translation[0] - 0.45) < 1e-9,
    );
    check("the score is the score of the new tier", game.Score === ELEMENTS[3][1]);
    check("the survivor pops", (game.World.Signature[survivor] & Has.AnimatePop) !== 0);
    check("a merge sets a freeze", game.HitStop > 0);
}

console.log("merge is refused");
{
    let game = make_game();
    instantiate(game, blueprint_element(1, [0, 0], [0, 0]));
    instantiate(game, blueprint_element(2, [1, 0], [0, 0]));
    step(game);
    check("two different tiers do not merge", count_elements(game) === 2);

    let cooled = make_game();
    let a = instantiate(cooled, blueprint_element(1, [0, 0], [0, 0]));
    instantiate(cooled, blueprint_element(1, [0.8, 0], [0, 0]));
    cooled.World.Merge[a].Cooldown = 1;
    step(cooled);
    check("a cooling element does not merge", count_elements(cooled) === 2);
}

console.log("win");
{
    let game = make_game();
    instantiate(game, blueprint_element(TOP_TIER, [0, 0], [0, 0]));
    instantiate(game, blueprint_element(TOP_TIER, [4, 0], [0, 0]));
    step(game);
    check("two top elements cancel out", count_elements(game) === 0, `got ${count_elements(game)}`);
    check("the win is recorded", game.Won);
    check("the win scores twice the tier", game.Score === ELEMENTS[TOP_TIER][1] * 2);
}

console.log("chain");
{
    // Four Sparkles in a row must end as one Heart: 4 -> 2 Stars -> 1 Heart.
    let game = make_game();
    for (let i = 0; i < 4; i++) {
        instantiate(game, blueprint_element(0, [i * 0.85, 0], [0, 0]));
    }
    // The center pull is what brings the two new Stars together, so this test
    // runs the real step.
    for (let i = 0; i < 240; i++) {
        step(game, true);
    }
    check(
        "a chain runs over several steps",
        count_elements(game) === 1,
        `got ${count_elements(game)}`,
    );
}

if (failures > 0) {
    // An uncaught error makes node exit with a non-zero code, so the npm script
    // fails without a dependency on the node type definitions.
    throw new Error(`${failures} check(s) failed`);
}
console.log("\nall checks passed");
