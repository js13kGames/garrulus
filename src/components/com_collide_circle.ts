/**
 * # CollideCircle
 *
 * A circle collider. Every element in the pile has one.
 *
 * The collider has no `Center` field: the elements are top-level entities, so
 * their `LocalTransform2D.Translation` already is the world position, and
 * `sys_collide_circle` reads it directly. That keeps the solver free of matrix
 * round-trips while it moves bodies apart.
 */

import {Entity} from "../../lib/world.js";
import {Game, Layer} from "../game.js";
import {Has} from "../world.js";

export interface CollideCircle {
    Radius: number;
    Layer: Layer;
    Mask: Layer;
}

/**
 * Add `CollideCircle` to an entity.
 *
 * @param radius The radius of the collider, in world units.
 * @param layer The layer this collider is on.
 * @param mask The layers this collider tests against.
 */
export function collide_circle(radius: number, layer: Layer, mask: Layer) {
    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.CollideCircle;
        game.World.CollideCircle[entity] = {
            Radius: radius,
            Layer: layer,
            Mask: mask,
        };
    };
}
