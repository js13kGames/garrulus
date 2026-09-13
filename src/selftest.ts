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
import {BREACH_LIMIT} from "./game.js";
import {
    DISTANCE_SCALE_MULTIPLIER,
    ELEMENT_SCALE_MULTIPLIER,
    TUNING,
    Tuning,
    scale_at,
} from "./modes.js";
import {SCORES, TOP_TIER, blueprint_element} from "./scenes/blu_element.js";
import {blueprint_star} from "./scenes/blu_star.js";
import {sys_collide_circle} from "./systems/sys_collide_circle.js";
import {sys_game_over} from "./systems/sys_game_over.js";
import {sys_merge} from "./systems/sys_merge.js";
import {sys_physics2d_integrate} from "./systems/sys_physics2d_integrate.js";
import {sys_physics2d_resolve} from "./systems/sys_physics2d_resolve.js";
import {sys_scale_by_radius} from "./systems/sys_scale_by_radius.js";
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
 * An AudioContext which makes no sound.
 *
 * `sys_merge` and `sys_game_over` play notes. The notes are not what these
 * checks are about, but the calls must not throw.
 */
function silent_audio() {
    let param = {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
    };
    let node = {connect() {}, start() {}, stop() {}, gain: param, frequency: {value: 0}, type: ""};
    return {
        currentTime: 0,
        destination: {},
        createOscillator: () => node,
        createGain: () => node,
    };
}

/**
 * A Game with only the fields the simulation systems read.
 *
 * The cast goes through `unknown` on purpose: this object is deliberately not a
 * whole `Game`. It has no canvas and no loop.
 */
function make_game(tuning: Tuning = TUNING): Game {
    return {
        World: new World(64),
        Contacts: [],
        ContactCount: 0,
        Score: 0,
        Won: false,
        HitStop: 0,
        ShakeAmount: 0,
        BreachTime: 0,
        WinTime: 0,
        PlayState: "play",
        BestScore: 0,
        RunTime: 0,
        Tuning: tuning,
        Audio: silent_audio(),
    } as unknown as Game;
}

function plain_game() {
    return make_game({...TUNING, Bumps: 0, ScaleCenter: 1, ScaleEdge: 1});
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
    let game = plain_game();
    let a = instantiate(game, blueprint_element(game, 0, [0, 0], [0, 0]));
    let b = instantiate(game, blueprint_element(game, 0, [0.5, 0], [0, 0]));
    let far = instantiate(game, blueprint_element(game, 0, [5, 0], [0, 0]));
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
    let game = plain_game();
    // Two Sparkles almost on top of each other. Radius 0.45 each, so they must
    // end up about 0.9 apart.
    let a = instantiate(game, blueprint_element(game, 0, [0, 0], [0, 0]));
    let b = instantiate(game, blueprint_element(game, 0, [0.05, 0], [0, 0]));
    // Take the merge out of it; this test is about separation only.
    game.World.Merge[a].Cooldown = 999;
    game.World.Merge[b].Cooldown = 999;
    for (let i = 0; i < 60; i++) {
        step(game);
    }
    let gap = distance(game, a, b);
    let sum = game.World.CollideCircle[a].Radius + game.World.CollideCircle[b].Radius;
    check("the solver pushes an overlap apart", gap > sum - 0.02, `gap ${gap.toFixed(4)}`);
    check("the solver does not overshoot", gap < sum + 0.02, `gap ${gap.toFixed(4)}`);
}

console.log("merge");
{
    let game = make_game();
    instantiate(game, blueprint_element(game, 2, [0, 0], [0, 0]));
    instantiate(game, blueprint_element(game, 2, [0.9, 0], [0, 0]));
    step(game);
    check("two of one tier become one", count_elements(game) === 1, `got ${count_elements(game)}`);

    let survivor = -1;
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if (game.World.Signature[ent] & Has.Merge) {
            survivor = ent;
        }
    }
    check("the survivor is one tier up", game.World.Merge[survivor].Tier === 3);
    let collider = game.World.CollideCircle[survivor];
    let merged_radius = 0;
    for (let i = 0; i < collider.BaseParts.length; i += 3) {
        merged_radius = Math.max(
            merged_radius,
            Math.hypot(collider.BaseParts[i], collider.BaseParts[i + 1]) +
                collider.BaseParts[i + 2],
        );
    }
    check("the collider grows to the new shape", collider.Radius === merged_radius);
    check(
        "the mass follows the new radius",
        Math.abs(game.World.RigidBody2D[survivor].InverseMass - 1 / TUNING.Radii[3] ** 2) < 1e-9,
    );
    check(
        "the survivor sits between the two",
        Math.abs(game.World.LocalTransform2D[survivor].Translation[0] - 0.45) < 1e-9,
    );
    check("the score is the score of the new tier", game.Score === SCORES[3]);
    check("the survivor pops", (game.World.Signature[survivor] & Has.AnimatePop) !== 0);
    check("a merge sets a freeze", game.HitStop > 0);
}

console.log("merge is refused");
{
    let game = make_game();
    instantiate(game, blueprint_element(game, 1, [0, 0], [0, 0]));
    instantiate(game, blueprint_element(game, 2, [1, 0], [0, 0]));
    step(game);
    check("two different tiers do not merge", count_elements(game) === 2);

    let cooled = make_game();
    let a = instantiate(cooled, blueprint_element(cooled, 1, [0, 0], [0, 0]));
    instantiate(cooled, blueprint_element(cooled, 1, [0.8, 0], [0, 0]));
    cooled.World.Merge[a].Cooldown = 1;
    step(cooled);
    check("a cooling element does not merge", count_elements(cooled) === 2);
}

console.log("win");
{
    let game = make_game();
    instantiate(game, blueprint_element(game, TOP_TIER, [0, 0], [0, 0]));
    instantiate(game, blueprint_element(game, TOP_TIER, [4, 0], [0, 0]));
    step(game);
    check("two top elements cancel out", count_elements(game) === 0, `got ${count_elements(game)}`);
    check("the win is recorded", game.Won);
    check("the win scores twice the tier", game.Score === SCORES[TOP_TIER] * 2);
}

console.log("game over");
{
    let game = make_game();
    // An element still falling in from the orbit circle is outside the death
    // ring, but it must not start the timer.
    let death = TUNING.DeathRadius;
    let falling = instantiate(game, blueprint_element(game, 0, [death + 1.5, 0], [0, 0]));
    sys_transform2d(game, STEP);
    for (let i = 0; i < 60; i++) {
        sys_game_over(game, STEP);
    }
    check("a falling element does not start the timer", game.BreachTime === 0);

    // Bring it inside, so that it arms itself.
    game.World.LocalTransform2D[falling].Translation[0] = 0;
    sys_game_over(game, STEP);
    check("an element inside the ring arms itself", game.World.Merge[falling].Armed);

    // Push it back out. Now it counts.
    game.World.LocalTransform2D[falling].Translation[0] = death + 1;
    for (let i = 0; i < 30; i++) {
        sys_game_over(game, STEP);
    }
    check("an armed element over the line fills the timer", game.BreachTime > 0.4);

    // Pull it back in. The timer empties twice as fast as it fills.
    let peak = game.BreachTime;
    game.World.LocalTransform2D[falling].Translation[0] = 0;
    sys_game_over(game, STEP);
    check(
        "the timer empties at twice the speed",
        Math.abs(game.BreachTime - (peak - 2 * STEP)) < 1e-9,
    );

    // Hold it out until the run ends.
    game.World.LocalTransform2D[falling].Translation[0] = death + 1;
    game.Score = 42;
    for (let i = 0; i < Math.ceil(BREACH_LIMIT / STEP) + 2; i++) {
        sys_game_over(game, STEP);
    }
    check("the run ends after the limit", game.PlayState === "over");
    check("the best score is kept", game.BestScore === 42);
}

console.log("shape: bumps");
{
    let game = make_game();
    let element = instantiate(game, blueprint_element(game, 4, [0, 0], [0, 0]));
    check(
        "an element has its configured bumps",
        game.World.CollideCircle[element].Parts.length === 3 * (1 + TUNING.Bumps),
    );
    check(
        "the bumps stay inside the radius which holds the shape",
        game.World.CollideCircle[element].Radius >= TUNING.Radii[4] * 0.9,
    );
}

console.log("shape: dead stars");
{
    let game = make_game();
    let star = instantiate(game, blueprint_star([0, 0]));
    let element = instantiate(game, blueprint_element(game, 0, [0.5, 0], [-8, 0]));
    // Stop the two from merging; a star has no Merge anyway.
    for (let i = 0; i < 90; i++) {
        step(game, true);
    }
    let at = game.World.LocalTransform2D[star].Translation;
    check("a dead star never moves", at[0] === 0 && at[1] === 0, `at ${at[0]}, ${at[1]}`);
    check(
        "an element cannot pass through a dead star",
        Math.hypot(...game.World.LocalTransform2D[element].Translation) > 0.9,
    );
}

console.log("physics: friction");
{
    function slide(friction: number) {
        let game = make_game({...TUNING, Friction: friction});
        let a = instantiate(game, blueprint_element(game, 4, [0, 0], [0, 4]));
        let b = instantiate(game, blueprint_element(game, 4, [TUNING.Radii[4] * 1.9, 0], [0, -4]));
        game.World.Merge[a].Cooldown = 999;
        game.World.Merge[b].Cooldown = 999;
        sys_transform2d(game, STEP);
        sys_collide_circle(game, STEP);
        sys_physics2d_resolve(game, STEP);
        return Math.abs(
            game.World.RigidBody2D[b].Velocity[1] - game.World.RigidBody2D[a].Velocity[1],
        );
    }

    let free = slide(0);
    let gripped = slide(TUNING.Friction);
    check("without friction the sliding is kept", free > 7.5, `${free.toFixed(2)}`);
    check("with friction the sliding is cut", gripped < free * 0.7, `${gripped.toFixed(2)}`);
}

console.log("physics: fling");
{
    function angular_momentum(swing: number) {
        let game = make_game();
        let tuning = TUNING;
        let angle = 0.7;
        let sideways = tuning.Fling * swing * tuning.OrbitRadius;
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let element = instantiate(
            game,
            blueprint_element(
                game,
                4,
                [cos * tuning.OrbitRadius, sin * tuning.OrbitRadius],
                [
                    -cos * tuning.DropSpeed - sin * sideways,
                    -sin * tuning.DropSpeed + cos * sideways,
                ],
            ),
        );
        let p = game.World.LocalTransform2D[element].Translation;
        let v = game.World.RigidBody2D[element].Velocity;
        return p[0] * v[1] - p[1] * v[0];
    }

    check("a throw at the middle carries no turning force", Math.abs(angular_momentum(0)) < 1e-9);
    check(
        "a swept throw carries turning force",
        Math.abs(angular_momentum(3)) > 100,
        `${angular_momentum(3).toFixed(1)}`,
    );
    check(
        "sweeping the other way turns it the other way",
        angular_momentum(3) * angular_momentum(-3) < 0,
    );
}

console.log("size by distance");
{
    let game = make_game();
    let tuning = TUNING;

    /** The radius of a fresh tier 5 element placed this far from the middle. */
    function measure(distance: number) {
        let ent = instantiate(game, blueprint_element(game, 5, [distance, 0], [0, 0]));
        sys_scale_by_radius(game, STEP);
        let collide = game.World.CollideCircle[ent];

        // Compare against this element's own untouched shape, not against
        // another mode: mode 4 has its own radius table and its own bumps.
        let base = 0;
        for (let i = 0; i < collide.BaseParts.length; i += 3) {
            base = Math.max(
                base,
                Math.hypot(collide.BaseParts[i], collide.BaseParts[i + 1]) +
                    collide.BaseParts[i + 2],
            );
        }
        let ratio = collide.Radius / base;
        game.World.Signature[ent] = 0;
        return ratio;
    }

    let middle = measure(0);
    let half = measure(tuning.DeathRadius / 2);
    let rim = measure(tuning.DeathRadius);
    let beyond = measure(tuning.DeathRadius * 3);

    check(
        "an element is smallest at the middle",
        middle < half && half < rim,
        `${middle.toFixed(2)} ${half.toFixed(2)} ${rim.toFixed(2)}`,
    );
    check(
        "the size at the middle includes the general multiplier",
        Math.abs(middle - scale_at(tuning, 0)) < 0.01,
        `${middle.toFixed(3)} against ${scale_at(tuning, 0)}`,
    );
    check(
        "the size at the ring triples the configured distance effect",
        Math.abs(rim - scale_at(tuning, 1)) < 0.01,
        `${rim.toFixed(3)} against ${scale_at(tuning, 1)}`,
    );
    check(
        "every element is three times larger",
        ELEMENT_SCALE_MULTIPLIER === 3 &&
            Math.abs(middle - tuning.ScaleCenter * ELEMENT_SCALE_MULTIPLIER) < 0.01,
    );
    check(
        "the distance multiplier is three",
        DISTANCE_SCALE_MULTIPLIER === 3 &&
            Math.abs(
                rim -
                    middle -
                    (tuning.ScaleEdge - tuning.ScaleCenter) *
                        DISTANCE_SCALE_MULTIPLIER *
                        ELEMENT_SCALE_MULTIPLIER,
            ) < 0.01,
    );
    check("halfway is halfway between the two", Math.abs(half - (middle + rim) / 2) < 0.01);
    check("the size stops growing past the ring", Math.abs(beyond - rim) < 1e-9);

    // The mass must not follow the size, or a body pushed outward would gain
    // weight for free and the solver would turn that into energy.
    let a = instantiate(game, blueprint_element(game, 5, [0, 0], [0, 0]));
    let b = instantiate(game, blueprint_element(game, 5, [tuning.DeathRadius, 0], [0, 0]));
    sys_scale_by_radius(game, STEP);
    check(
        "the mass does not change with the size",
        game.World.RigidBody2D[a].InverseMass === game.World.RigidBody2D[b].InverseMass,
    );
}

console.log("physics: sub-steps");
{
    let top_speed = TUNING.CenterPull / TUNING.Drag;
    let reach = top_speed / (60 * TUNING.SubSteps);
    check(
        "the final tuning cannot tunnel",
        reach < TUNING.Radii[0],
        `moves ${reach.toFixed(2)} against a radius of ${TUNING.Radii[0]}`,
    );
}

console.log("chain");
{
    // Four Sparkles in a row must end as one Heart: 4 -> 2 Stars -> 1 Heart.
    let game = make_game();
    for (let i = 0; i < 4; i++) {
        instantiate(game, blueprint_element(game, 0, [i * 0.85, 0], [0, 0]));
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
