/**
 * # RigidBody2D
 *
 * A dynamic body in the pile.
 *
 * The template split velocity into `VelocityIntegrated` and
 * `VelocityResolved`, because its resolver applied a single contact per body.
 * `sys_physics2d_resolve` runs an iterative solver over every contact instead,
 * so one velocity is enough.
 */

import {Vec2} from "../../lib/math.js";
import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

export interface RigidBody2D {
    Velocity: Vec2;
    /** Degrees per second. */
    VelocityAngular: number;
    /**
     * 1 / mass. Mass is the square of the radius, so big elements shove small
     * ones. Zero means the body never moves: a dead star.
     */
    InverseMass: number;
}

/**
 * Add `RigidBody2D` to an entity.
 *
 * @param radius The radius of the body, which decides its mass.
 * @param velocity The initial velocity, in units per second.
 * @param velocity_angular The initial spin, in degrees per second.
 * @param immovable Make a body which nothing can push: a dead star.
 */
export function rigid_body2d(
    radius: number,
    velocity: Vec2,
    velocity_angular = 0,
    immovable = false,
) {
    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.RigidBody2D;
        game.World.RigidBody2D[entity] = {
            Velocity: velocity,
            VelocityAngular: velocity_angular,
            InverseMass: immovable ? 0 : 1 / (radius * radius),
        };
    };
}
