import {Blueprint} from "../../lib/game.js";
import {Vec2} from "../../lib/math.js";
import {lifespan} from "../components/com_lifespan.js";
import {local_transform2d} from "../components/com_local_transform2d.js";
import {spatial_node2d} from "../components/com_spatial_node2d.js";
import {Game, POP_RING_LIFE} from "../game.js";

/**
 * The ring which opens out of a merge.
 *
 * It needs no component of its own. The transform scale carries the radius, and
 * `Lifespan` carries the age, so `sys_draw` can find a ring by looking for an
 * entity which has a lifespan but is not an element.
 */
export function blueprint_pop_ring(position: Vec2, radius: number): Blueprint<Game> {
    return [
        spatial_node2d(),
        local_transform2d([position[0], position[1]], 0, [radius, radius]),
        lifespan(POP_RING_LIFE),
    ];
}
