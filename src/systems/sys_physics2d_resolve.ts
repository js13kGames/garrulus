/**
 * # sys_physics2d_resolve
 *
 * Push the touching pairs apart and exchange their momentum.
 *
 * The template resolver applied one contact for each body, which is enough for
 * a body that rests on the ground, but not for a pile where one element touches
 * five others. This is a relaxation solver: it goes over the contact list
 * several times, and each pass reads the live positions. That makes the pile
 * settle instead of sinking into itself.
 */

import {BOUNCE, Game, SPIN, SOLVER_ITERATIONS} from "../game.js";
import {Has} from "../world.js";

/**
 * Overlap which is allowed to stay, in world units.
 *
 * A small overlap stops the pile from shaking: without it, the solver and the
 * center pull fight each other every step.
 */
const SLOP = 0.005;

/** How much of the remaining overlap one pass removes. */
const CORRECTION = 0.6;

export function sys_physics2d_resolve(game: Game, delta: number) {
    for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
        for (let i = 0; i < game.ContactCount; i++) {
            let contact = game.Contacts[i];
            let local_a = game.World.LocalTransform2D[contact.A];
            let local_b = game.World.LocalTransform2D[contact.B];
            let body_a = game.World.RigidBody2D[contact.A];
            let body_b = game.World.RigidBody2D[contact.B];

            let dx = local_b.Translation[0] - local_a.Translation[0];
            let dy = local_b.Translation[1] - local_a.Translation[1];
            let distance = Math.sqrt(dx * dx + dy * dy);

            let nx, ny;
            if (distance > 0.0001) {
                nx = dx / distance;
                ny = dy / distance;
            } else {
                // Two centers on the same point. Any direction separates them,
                // and the next step finds the real normal.
                nx = 0;
                ny = 1;
            }

            let depth = contact.Sum - distance;
            if (depth <= 0) {
                continue;
            }

            let inverse_sum = body_a.InverseMass + body_b.InverseMass;

            // Momentum. The impulse is shared in proportion to 1 / mass, so a
            // Galaxy shoves a Sparkle aside and hardly slows down.
            let rvx = body_b.Velocity[0] - body_a.Velocity[0];
            let rvy = body_b.Velocity[1] - body_a.Velocity[1];
            let normal_speed = rvx * nx + rvy * ny;
            if (normal_speed < 0) {
                let impulse = (-(1 + BOUNCE) * normal_speed) / inverse_sum;
                body_a.Velocity[0] -= nx * impulse * body_a.InverseMass;
                body_a.Velocity[1] -= ny * impulse * body_a.InverseMass;
                body_b.Velocity[0] += nx * impulse * body_b.InverseMass;
                body_b.Velocity[1] += ny * impulse * body_b.InverseMass;
            }

            // Spin. The elements roll on each other, which makes the pile look
            // alive. This is for the eye only; there is no angular mass.
            let tangent_speed = -rvx * ny + rvy * nx;
            body_a.VelocityAngular -= tangent_speed * SPIN;
            body_b.VelocityAngular -= tangent_speed * SPIN;

            // Separation.
            let correction = ((depth - SLOP) * CORRECTION) / inverse_sum;
            if (correction > 0) {
                local_a.Translation[0] -= nx * correction * body_a.InverseMass;
                local_a.Translation[1] -= ny * correction * body_a.InverseMass;
                local_b.Translation[0] += nx * correction * body_b.InverseMass;
                local_b.Translation[1] += ny * correction * body_b.InverseMass;
                game.World.Signature[contact.A] |= Has.Dirty;
                game.World.Signature[contact.B] |= Has.Dirty;
            }
        }
    }
}
