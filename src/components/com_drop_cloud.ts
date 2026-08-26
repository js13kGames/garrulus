/**
 * # DropCloud
 *
 * The cloud the player moves along the orbit circle, and drops elements from.
 */

import {Entity} from "../../lib/world.js";
import {Game} from "../game.js";
import {Has} from "../world.js";

export interface DropCloud {
    /** Position on the orbit circle, in radians. */
    Angle: number;
    /** Tier of the element which drops next. */
    NextTier: number;
    /** Seconds until the next drop is allowed. */
    Cooldown: number;
    /**
     * How fast the player is sweeping the cloud around the ring, in radians
     * each second, smoothed.
     *
     * A mode with `Fling` above zero gives this to the element as sideways
     * speed, so a quick sweep before the release throws the element in at an
     * angle instead of straight at the middle.
     */
    Swing: number;
}

/** Add `DropCloud` to an entity. */
export function drop_cloud(next_tier: number) {
    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.DropCloud;
        game.World.DropCloud[entity] = {
            Angle: -Math.PI / 2,
            NextTier: next_tier,
            Cooldown: 0,
            Swing: 0,
        };
    };
}
