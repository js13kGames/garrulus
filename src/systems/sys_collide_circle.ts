/**
 * # sys_collide_circle
 *
 * Find every pair of circles which touch, and write them into the contact list
 * on `Game`.
 *
 * `sys_physics2d_resolve` pushes the pairs apart. `sys_merge` reads the same
 * list to find two elements of one tier. The list is built once for both.
 *
 * The colliders are read from `LocalTransform2D.Translation`, not from the
 * world matrix. Elements are top-level entities, so the two are the same, and
 * the solver can move a body without a matrix update between its iterations.
 */

import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

const QUERY = Has.LocalTransform2D | Has.CollideCircle | Has.RigidBody2D;

// ponytail: the broad phase is a naive O(n^2) sweep over all pairs. It holds to
// about 200 bodies, which is more than the death ring allows. If the count ever
// grows past that, put the bodies in a spatial hash keyed on the cell of the
// center, and test only the neighbouring cells.
let bodies: Array<Entity> = [];

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

            let position_b = game.World.LocalTransform2D[b].Translation;
            let dx = position_b[0] - position_a[0];
            let dy = position_b[1] - position_a[1];
            let sum = collide_a.Radius + collide_b.Radius;
            if (dx * dx + dy * dy >= sum * sum) {
                continue;
            }

            // Grow the pool instead of allocating a new object each step.
            let contact = game.Contacts[game.ContactCount];
            if (contact === undefined) {
                contact = game.Contacts[game.ContactCount] = {A: 0, B: 0, Sum: 0};
            }
            contact.A = a;
            contact.B = b;
            contact.Sum = sum;
            game.ContactCount++;
        }
    }
}
