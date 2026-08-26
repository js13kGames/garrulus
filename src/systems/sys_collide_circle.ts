/**
 * # sys_collide_circle
 *
 * Find every pair of circles which touch, and write them into the contact list
 * on `Game`.
 *
 * `sys_physics2d_resolve` pushes the pairs apart. `sys_merge` reads the same
 * list to find two elements of one tier. The list is built once for both.
 *
 * An element can be more than one circle. A plain element is a single circle at
 * its middle; a jagged one carries bumps around the rim. The search is
 * therefore in two levels: a cheap test on the radius which holds the whole
 * shape, then a test of every pair of parts.
 *
 * The colliders are read from `LocalTransform2D`, not from the world matrix.
 * Elements are top-level entities, so the two are the same, and the solver can
 * move a body without a matrix update between its iterations.
 */

import {DEG_TO_RAD} from "../../lib/math.js";
import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

const QUERY = Has.LocalTransform2D | Has.CollideCircle | Has.RigidBody2D;

// ponytail: the broad phase is a naive O(n^2) sweep over all pairs. It holds to
// about 200 bodies, which is more than the death ring allows. If the count ever
// grows past that, put the bodies in a spatial hash keyed on the cell of the
// center, and test only the neighbouring cells.
let bodies: Array<Entity> = [];

/**
 * Where a part of a collider is in the world, and how big it is.
 *
 * The part offsets are in the local frame of the element, so they turn with it.
 * The solver calls this again on every pass, because it moves the bodies.
 *
 * @param out Written as [x, y, radius].
 */
export function part_world(out: Array<number>, game: Game, entity: Entity, part: number) {
    let local = game.World.LocalTransform2D[entity];
    let parts = game.World.CollideCircle[entity].Parts;
    let ox = parts[part];
    let oy = parts[part + 1];

    if (ox === 0 && oy === 0) {
        out[0] = local.Translation[0];
        out[1] = local.Translation[1];
    } else {
        let angle = local.Rotation * DEG_TO_RAD;
        let sin = Math.sin(angle);
        let cos = Math.cos(angle);
        out[0] = local.Translation[0] + ox * cos - oy * sin;
        out[1] = local.Translation[1] + ox * sin + oy * cos;
    }
    out[2] = parts[part + 2];
}

const part_a: Array<number> = [0, 0, 0];
const part_b: Array<number> = [0, 0, 0];

export function sys_collide_circle(game: Game, delta: number) {
    bodies.length = 0;
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) === QUERY) {
            bodies.push(ent);
        }
    }

    game.ContactCount = 0;

    for (let i = 0; i < bodies.length; i++) {
        let a = bodies[i];
        let collide_a = game.World.CollideCircle[a];
        let position_a = game.World.LocalTransform2D[a].Translation;

        for (let j = i + 1; j < bodies.length; j++) {
            let b = bodies[j];
            let collide_b = game.World.CollideCircle[b];
            if (!(collide_a.Layer & collide_b.Mask)) {
                continue;
            }

            // Broad phase: can the two shapes reach each other at all?
            let position_b = game.World.LocalTransform2D[b].Translation;
            let dx = position_b[0] - position_a[0];
            let dy = position_b[1] - position_a[1];
            let reach = collide_a.Radius + collide_b.Radius;
            if (dx * dx + dy * dy >= reach * reach) {
                continue;
            }

            // Narrow phase: every part against every part.
            for (let pa = 0; pa < collide_a.Parts.length; pa += 3) {
                part_world(part_a, game, a, pa);

                for (let pb = 0; pb < collide_b.Parts.length; pb += 3) {
                    part_world(part_b, game, b, pb);

                    let px = part_b[0] - part_a[0];
                    let py = part_b[1] - part_a[1];
                    let sum = part_a[2] + part_b[2];
                    if (px * px + py * py >= sum * sum) {
                        continue;
                    }

                    // Grow the pool instead of allocating an object each step.
                    let contact = game.Contacts[game.ContactCount];
                    if (contact === undefined) {
                        contact = game.Contacts[game.ContactCount] = {
                            A: 0,
                            B: 0,
                            PartA: 0,
                            PartB: 0,
                            Sum: 0,
                        };
                    }
                    contact.A = a;
                    contact.B = b;
                    contact.PartA = pa;
                    contact.PartB = pb;
                    contact.Sum = sum;
                    game.ContactCount++;
                }
            }
        }
    }
}
