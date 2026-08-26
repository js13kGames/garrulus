/**
 * # Merge
 *
 * Marks an element which can merge with another element of the same tier.
 */

import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

export interface Merge {
    /** Index into the ELEMENTS table. */
    Tier: number;
    /** Seconds until this element can merge again. */
    Cooldown: number;
    /** Set for the two partners of a merge, to keep them out of other merges. */
    Merging: boolean;
}

/**
 * Add `Merge` to an entity.
 *
 * @param tier Index into the ELEMENTS table.
 * @param cooldown Seconds until the element can merge.
 */
export function merge(tier: number, cooldown = 0) {
    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.Merge;
        game.World.Merge[entity] = {
            Tier: tier,
            Cooldown: cooldown,
            Merging: false,
        };
    };
}
