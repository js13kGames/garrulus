import {Blueprint} from "../../lib/game.js";
import {Vec2} from "../../lib/math.js";
import {collide_circle} from "../components/com_collide_circle.js";
import {local_transform2d} from "../components/com_local_transform2d.js";
import {rigid_body2d} from "../components/com_rigid_body2d.js";
import {spatial_node2d} from "../components/com_spatial_node2d.js";
import {Game, Layer} from "../game.js";

/** How big a dead star is, in world units. */
export const STAR_RADIUS = 0.7;

/**
 * A dead star: an obstacle which never moves.
 *
 * It has a rigid body, because that is what the collision search looks for, but
 * its inverse mass is zero, so no impulse and no separation can shift it. It
 * has no `Merge`, so it is not an element: it never merges, it is never drawn
 * as a face, and it never counts toward the breach.
 */
export function blueprint_star(position: Vec2): Blueprint<Game> {
    return [
        spatial_node2d(),
        local_transform2d(position),
        collide_circle([0, 0, STAR_RADIUS], Layer.Star, Layer.Element),
        rigid_body2d(STAR_RADIUS, [0, 0], 0, true),
    ];
}
