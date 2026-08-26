/**
 * # LocalTransform2D
 *
 * The `LocalTransform2D` component allows the entity to be positioned in 2D
 * space.
 *
 * `LocalTransform2D` only stores the local (parent-space) transform data. If
 * the entity is a top-level entity, the local data is also the world-space
 * data.
 *
 * In order to be a parent of other entities, or to be a child of another entity,
 * the entity must also have the [`SpatialNode2D`](com_spatial_node2d.html) component.
 *
 * OTOH, entities with `LocalTransform2D` but without `SpatialNode2D` have their
 * model matrix computed in the shader, making them very fast to update.
 *
 * For an entity to be processed by [`sys_transform2d`](sys_transform2d.html),
 * it must also be tagged as **dirty** with `Has.Dirty`.
 */

import {Deg, Vec2} from "../../lib/math.js";
import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

export interface LocalTransform2D {
    /** Local translation relative to the parent. */
    Translation: Vec2;
    /** Local rotation relative to the parent. */
    Rotation: Deg;
    /** Local scale relative to the parent. */
    Scale: Vec2;
}

/**
 * Add `LocalTransform2D` to an entity.
 *
 * `LocalTransform2D` component only stores the local (parent-space) transform
 * data. If the entity is a top-level entity, the local data is also the
 * world-space data.
 *
 * In order to be a parent of other entities, or to be a child of another entity,
 * the entity must also have the `SpatialNode2D` component.
 *
 * @param translation Local translation relative to the parent.
 * @param rotation Local rotation relative to the parent.
 * @param scale Local scale relative to the parent.
 */
export function local_transform2d(
    translation: Vec2 = [0, 0],
    rotation: Deg = 0,
    scale: Vec2 = [1, 1],
) {
    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.LocalTransform2D | Has.Dirty;
        game.World.LocalTransform2D[entity] = {
            Translation: translation,
            Rotation: rotation,
            Scale: scale,
        };
    };
}
