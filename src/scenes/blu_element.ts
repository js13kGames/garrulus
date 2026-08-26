import {Blueprint} from "../../lib/game.js";
import {Vec2} from "../../lib/math.js";
import {float} from "../../lib/random.js";
import {collide_circle} from "../components/com_collide_circle.js";
import {local_transform2d} from "../components/com_local_transform2d.js";
import {merge} from "../components/com_merge.js";
import {rigid_body2d} from "../components/com_rigid_body2d.js";
import {spatial_node2d} from "../components/com_spatial_node2d.js";
import {Game, Layer} from "../game.js";

/**
 * The evolution chain.
 *
 * Each row is `[radius, score, color]`. The radius grows by a factor of about
 * 1.2 for each tier, so the area grows by about 1.5. Two elements of one tier
 * make one element of the next tier.
 */
export const ELEMENTS: Array<[radius: number, score: number, color: string]> = [
    [0.45, 1, "#ff9ecd"], // 0 Sparkle
    [0.55, 3, "#ffe066"], // 1 Star
    [0.66, 6, "#ff7a8a"], // 2 Heart
    [0.79, 10, "#9fd8ff"], // 3 Moon
    [0.95, 15, "#7ef0c0"], // 4 Rainbow
    [1.14, 21, "#c39bff"], // 5 Crystal
    [1.37, 28, "#ffab5e"], // 6 Comet
    [1.64, 36, "#6f8cff"], // 7 Nebula
    [1.97, 45, "#ff6bdb"], // 8 Galaxy
    [2.36, 55, "#fff3c4"], // 9 Cosmic Unicorn
];

/** The highest tier. Two of these win the game. */
export const TOP_TIER = ELEMENTS.length - 1;

/**
 * Make an element of the given tier.
 *
 * @param tier Index into ELEMENTS.
 * @param position Where the element starts, in world units.
 * @param velocity How fast it starts, in units per second.
 */
export function blueprint_element(tier: number, position: Vec2, velocity: Vec2): Blueprint<Game> {
    let radius = ELEMENTS[tier][0];
    return [
        spatial_node2d(),
        local_transform2d(position, float(0, 360)),
        collide_circle(radius, Layer.Element, Layer.Element),
        rigid_body2d(radius, velocity, float(-120, 120)),
        merge(tier),
    ];
}
