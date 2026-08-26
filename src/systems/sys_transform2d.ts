/**
 * # sys_transform2d
 *
 * Apply changes to position, rotation, and scale, and update the instance array
 * to be used by the shader.
 *
 * An entity will be processed only if it's marked as **dirty** by another
 * system:
 *
 *     game.World.Signature[entity] |= Has.Dirty;
 *
 * Entities must have both `LocalTransform2D` and `SpatialNode2D`. Their `World`
 * matrix is computed here, on the CPU, and the `World` matrices of their
 * parents are taken into account. The data is stored in the instance array
 * implicitly, because the `World` property of `SpatialNode2D` is a view into
 * that buffer. (The template also had a shader fast path for entities without
 * `SpatialNode2D`; we draw with Context2D, so it is gone.)
 *
 * `sys_transform2d` doesn't depend on the order of entities in the world, but
 * it works best when parents are added before children. This is the default
 * insertion order of `instantiate()`, but because entities can be later
 * recycled, it's not guaranteed.
 *
 * `sys_transform2d` also updates the node's `Parent` field. When reparenting
 * entities, it's not necessary to assign the new parent manually. OTOH, the
 * `Parent` field should only be referenced after `sys_transform2d` has already
 * run during the frame.
 */

import {
    mat2d_compose,
    mat2d_get_translation,
    mat2d_invert,
    mat2d_multiply,
} from "../../lib/mat2d.js";
import {DEG_TO_RAD, Vec2} from "../../lib/math.js";
import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

const QUERY_DIRTY = Has.LocalTransform2D | Has.SpatialNode2D | Has.Dirty;
const QUERY_NODE = Has.LocalTransform2D | Has.SpatialNode2D;

export function sys_transform2d(game: Game, delta: number) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY_DIRTY) === QUERY_DIRTY) {
            update_spatial_node(game, ent);
        }
    }
}

const world_position: Vec2 = [0, 0];

function update_spatial_node(game: Game, entity: Entity, parent?: Entity) {
    game.World.Signature[entity] &= ~Has.Dirty;

    let local = game.World.LocalTransform2D[entity];
    let node = game.World.SpatialNode2D[entity];

    mat2d_compose(node.World, local.Translation, local.Rotation * DEG_TO_RAD, local.Scale);

    if (parent !== undefined) {
        node.Parent = parent;
    }

    if (node.Parent !== undefined) {
        let parent_transform = game.World.SpatialNode2D[node.Parent];
        mat2d_multiply(node.World, parent_transform.World, node.World);

        if (node.IsGyroscope) {
            mat2d_get_translation(world_position, node.World);
            mat2d_compose(node.World, world_position, local.Rotation * DEG_TO_RAD, local.Scale);
        }
    }

    mat2d_invert(node.Self, node.World);

    if (game.World.Signature[entity] & Has.Children) {
        let children = game.World.Children[entity];
        for (let i = 0; i < children.Children.length; i++) {
            let child = children.Children[i];
            if ((game.World.Signature[child] & QUERY_NODE) === QUERY_NODE) {
                update_spatial_node(game, child, entity);
            }
        }
    }
}
