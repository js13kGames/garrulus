/**
 * # AnimatePop
 *
 * A one-shot scale animation. A fresh merge starts big and eases back to its
 * true size, which gives the merge its punch.
 */

import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

export interface AnimatePop {
    /** Seconds elapsed. */
    Time: number;
    /** Seconds the animation lasts. */
    Total: number;
}

/**
 * Add `AnimatePop` to an entity, or restart the animation if it has one.
 *
 * @param total How long the animation lasts, in seconds.
 */
export function animate_pop(total = 0.2) {
    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.AnimatePop;
        game.World.AnimatePop[entity] = {
            Time: 0,
            Total: total,
        };
    };
}
