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
 *
 * Friction is applied on the first pass only. It takes a share of the sliding
 * between the two bodies away. Without it the pile packs into a smooth ball and
 * never turns; with it the elements grind, and a heavy drop can spin the whole
 * mass. It is the switch behind both the "Jagged Orbit" and the "Momentum"
 * mode.
 */

import {Game} from "../game.js";
import {part_world} from "./sys_collide_circle.js";
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

const part_a: Array<number> = [0, 0, 0];
const part_b: Array<number> = [0, 0, 0];

export function sys_physics2d_resolve(game: Game, delta: number) {
    let tuning = game.Tuning;

    for (let iteration = 0; iteration < tuning.SolverIterations; iteration++) {
        for (let i = 0; i < game.ContactCount; i++) {
            let contact = game.Contacts[i];
            let body_a = game.World.RigidBody2D[contact.A];
            let body_b = game.World.RigidBody2D[contact.B];

            let inverse_sum = body_a.InverseMass + body_b.InverseMass;
            if (inverse_sum === 0) {
                // Two dead stars. Nothing can move, so there is nothing to do.
                continue;
            }

            // The parts turn with their bodies, and the bodies move on every
            // pass, so the world position of a part is found again each time.
            part_world(part_a, game, contact.A, contact.PartA);
            part_world(part_b, game, contact.B, contact.PartB);

            let dx = part_b[0] - part_a[0];
            let dy = part_b[1] - part_a[1];
            let distance = Math.sqrt(dx * dx + dy * dy);

            let nx, ny;
            if (distance > 0.0001) {
                nx = dx / distance;
                ny = dy / distance;
            } else {
                // Two centers on the same point. Any direction separates them,
                // and the next pass finds the real normal.
                nx = 0;
                ny = 1;
            }

            let depth = contact.Sum - distance;
            if (depth <= 0) {
                continue;
            }

            let rvx = body_b.Velocity[0] - body_a.Velocity[0];
            let rvy = body_b.Velocity[1] - body_a.Velocity[1];

            // Momentum. The impulse is shared in proportion to 1 / mass, so a
            // Galaxy shoves a Sparkle aside and hardly slows down.
            let normal_speed = rvx * nx + rvy * ny;
            if (normal_speed < 0) {
                let impulse = (-(1 + tuning.Bounce) * normal_speed) / inverse_sum;
                body_a.Velocity[0] -= nx * impulse * body_a.InverseMass;
                body_a.Velocity[1] -= ny * impulse * body_a.InverseMass;
                body_b.Velocity[0] += nx * impulse * body_b.InverseMass;
                body_b.Velocity[1] += ny * impulse * body_b.InverseMass;
            }

            // Sliding, along the tangent of the contact.
            let tangent_speed = -rvx * ny + rvy * nx;

            if (tuning.Friction > 0 && iteration === 0) {
                // Take a share of the sliding away. This is applied once for
                // each contact in a step, not once for each pass, so that the
                // number in the mode table means what it says: 0.45 removes 45
                // percent of the sliding, not 45 percent six times over.
                let impulse = (-tangent_speed * tuning.Friction) / inverse_sum;
                body_a.Velocity[0] += ny * impulse * body_a.InverseMass;
                body_a.Velocity[1] -= nx * impulse * body_a.InverseMass;
                body_b.Velocity[0] -= ny * impulse * body_b.InverseMass;
                body_b.Velocity[1] += nx * impulse * body_b.InverseMass;
            }

            // Spin. The elements roll on each other, which makes the pile look
            // alive. This is for the eye only; there is no angular mass.
            body_a.VelocityAngular -= tangent_speed * tuning.Spin;
            body_b.VelocityAngular -= tangent_speed * tuning.Spin;

            // Separation.
            let correction = ((depth - SLOP) * CORRECTION) / inverse_sum;
            if (correction > 0) {
                let local_a = game.World.LocalTransform2D[contact.A];
                let local_b = game.World.LocalTransform2D[contact.B];
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
