/**
 * # sys_physics2d_integrate
 *
 * Pull every body toward the center of the world, damp it, and move it.
 *
 * `BUILD.md` gives the center pull its own system, which writes into an
 * `Acceleration` field. There is only one force in this game, so it is applied
 * here and the field is gone.
 */

import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

const QUERY = Has.LocalTransform2D | Has.RigidBody2D;

export function sys_physics2d_integrate(game: Game, delta: number) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) === QUERY) {
            update(game, ent, delta);
        }
    }
}

function update(game: Game, entity: Entity, delta: number) {
    let local = game.World.LocalTransform2D[entity];
    let body = game.World.RigidBody2D[entity];
    if (body.InverseMass === 0) {
        // A dead star. Nothing moves it and nothing slows it down.
        return;
    }

    let tuning = game.Tuning;
    let position = local.Translation;
    let velocity = body.Velocity;

    // The pull has a constant magnitude, not an inverse square one. A constant
    // pull packs the mass evenly and never runs away.
    let distance = Math.sqrt(position[0] * position[0] + position[1] * position[1]);
    if (distance > 0) {
        let pull = (tuning.CenterPull * delta) / distance;
        velocity[0] -= position[0] * pull;
        velocity[1] -= position[1] * pull;
    }

    // Drag settles the pile and turns the orbits into a slow spin.
    let damping = Math.max(0, 1 - tuning.Drag * delta);
    velocity[0] *= damping;
    velocity[1] *= damping;
    body.VelocityAngular *= damping;

    position[0] += velocity[0] * delta;
    position[1] += velocity[1] * delta;
    local.Rotation += body.VelocityAngular * delta;

    game.World.Signature[entity] |= Has.Dirty;
}
