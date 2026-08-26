/**
 * # sys_scale_by_radius
 *
 * Make an element small near the middle and big near the death ring.
 *
 * This turns the geometry of the arena into a pressure of its own. An element
 * near the rim takes more room than the same element near the middle, so the
 * outside of the pile is where the danger is. Pushing mass inward is rewarded
 * twice: the merge itself, and the room every element in the pile gives back as
 * it moves in.
 *
 * The size scales the shape only, not the mass. Mass stays what the tier says.
 * If mass moved with the size, a body pushed outward would gain weight for
 * free, and the solver would turn that into energy the pile never spent: the
 * pile would shake itself apart.
 */

import {Entity} from "../../lib/world.js";
import {scale_parts} from "../components/com_collide_circle.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

const QUERY = Has.LocalTransform2D | Has.CollideCircle | Has.Merge;

export function sys_scale_by_radius(game: Game, delta: number) {
    let tuning = game.Tuning;
    if (tuning.ScaleCenter === 1 && tuning.ScaleEdge === 1) {
        // The mode does not use this. Every shape is already at its true size.
        return;
    }

    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) === QUERY) {
            update(game, ent);
        }
    }
}

function update(game: Game, entity: Entity) {
    let tuning = game.Tuning;
    let position = game.World.LocalTransform2D[entity].Translation;
    let distance = Math.sqrt(position[0] * position[0] + position[1] * position[1]);

    // Past the death ring the size stops growing. Beyond that line the run is
    // ending anyway, and a shape which kept growing would push its neighbours
    // out with it and take the whole pile over the edge at once.
    let reach = Math.min(distance / tuning.DeathRadius, 1);
    let factor = tuning.ScaleCenter + (tuning.ScaleEdge - tuning.ScaleCenter) * reach;

    scale_parts(game.World.CollideCircle[entity], factor);
}
