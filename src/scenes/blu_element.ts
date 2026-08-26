import {Blueprint} from "../../lib/game.js";
import {Vec2} from "../../lib/math.js";
import {float} from "../../lib/random.js";
import {collide_circle, element_parts} from "../components/com_collide_circle.js";
import {local_transform2d} from "../components/com_local_transform2d.js";
import {merge} from "../components/com_merge.js";
import {rigid_body2d} from "../components/com_rigid_body2d.js";
import {spatial_node2d} from "../components/com_spatial_node2d.js";
import {Game, Layer} from "../game.js";

/**
 * The evolution chain.
 *
 * The radius of each tier is not here: it belongs to the mode, because
 * "Claustrophobia" makes the top tiers grow much faster. See `modes.ts`.
 */
export const SCORES = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

/** Sparkle, Star, Heart, Moon, Rainbow, Crystal, Comet, Nebula, Galaxy, Cosmic Unicorn. */
export const COLORS = [
    "#ff9ecd",
    "#ffe066",
    "#ff7a8a",
    "#9fd8ff",
    "#7ef0c0",
    "#c39bff",
    "#ffab5e",
    "#6f8cff",
    "#ff6bdb",
    "#fff3c4",
];

/** The highest tier. Two of these win the game. */
export const TOP_TIER = SCORES.length - 1;

/**
 * Make an element of the given tier.
 *
 * @param game The game, for the tuning of the mode being played.
 * @param tier Index into SCORES.
 * @param position Where the element starts, in world units.
 * @param velocity How fast it starts, in units per second.
 */
export function blueprint_element(
    game: Game,
    tier: number,
    position: Vec2,
    velocity: Vec2,
): Blueprint<Game> {
    let radius = game.Tuning.Radii[tier];
    let parts = element_parts(radius, game.Tuning.Bumps, float(0, Math.PI * 2));
    return [
        spatial_node2d(),
        local_transform2d(position, float(0, 360)),
        collide_circle(parts, Layer.Element, Layer.Element | Layer.Star),
        rigid_body2d(radius, velocity, float(-120, 120)),
        merge(tier),
    ];
}
