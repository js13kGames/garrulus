/**
 * # sys_animate_pop
 *
 * Grow a new element and let it ease back to its true size. This is what gives
 * a merge its punch.
 *
 * The scale is on the transform only. The collider keeps the true radius, so
 * the animation never pushes the pile around.
 */

import {ease_out_quad} from "../../lib/easing.js";
import {Entity} from "../../lib/world.js";
import {Game, POP_SCALE} from "../game.js";
import {Has} from "../world.js";

const QUERY = Has.AnimatePop | Has.LocalTransform2D;

export function sys_animate_pop(game: Game, delta: number) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) === QUERY) {
            update(game, ent, delta);
        }
    }
}

function update(game: Game, entity: Entity, delta: number) {
    let pop = game.World.AnimatePop[entity];
    let local = game.World.LocalTransform2D[entity];

    pop.Time += delta;
    let progress = Math.min(pop.Time / pop.Total, 1);
    let scale = 1 + (POP_SCALE - 1) * (1 - ease_out_quad(progress));

    local.Scale[0] = local.Scale[1] = scale;
    game.World.Signature[entity] |= Has.Dirty;

    if (progress === 1) {
        game.World.Signature[entity] &= ~Has.AnimatePop;
    }
}
