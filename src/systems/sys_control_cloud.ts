/**
 * # sys_control_cloud
 *
 * Move the cloud along the orbit circle to the angle of the pointer, and drop
 * an element when the player clicks or touches.
 */

import {instantiate} from "../../lib/game.js";
import {RAD_TO_DEG, Vec2} from "../../lib/math.js";
import {integer} from "../../lib/random.js";
import {Entity} from "../../lib/world.js";
import {viewport_to_world} from "../components/com_camera2d.js";
import {Game} from "../game.js";
import {Tuning} from "../modes.js";
import {blueprint_element} from "../scenes/blu_element.js";
import {sound_drop} from "../sounds.js";
import {Has} from "../world.js";

const QUERY = Has.LocalTransform2D | Has.DropCloud;

/**
 * How often each tier comes up, as a running total out of 100.
 *
 * Only the first five tiers drop. The player must make the rest.
 */
const TIER_WEIGHTS = [32, 58, 78, 92, 100];

/** Pick the tier of the next element. */
export function roll_tier() {
    let roll = integer(0, 99);
    for (let tier = 0; tier < TIER_WEIGHTS.length; tier++) {
        if (roll < TIER_WEIGHTS[tier]) {
            return tier;
        }
    }
    return 0;
}

const pointer: Vec2 = [0, 0];

/**
 * The fastest sweep the cloud can pass on, in radians each second.
 *
 * A pointer can jump right across the screen in one step, which would otherwise
 * throw an element out at an absurd speed.
 */
const MAX_SWING = 8;

/** How much of the new sweep reading is kept. The rest is the old, smoothed value. */
const SWING_SMOOTHING = 0.25;

/**
 * The largest sideways speed a throw can have, as a share of the inward speed.
 *
 * Taking the whole speed of the cloud is the honest physics, but a pointer can
 * be swept far faster than anyone could really throw: at the full rate the
 * element leaves at about 70 units each second, more than the pull can hold, so
 * every drop flies straight out of the arena and the run ends in seconds. This
 * was measured. The cap keeps the element bound to the middle: at 0.8 of the
 * inward speed the circular speed it would need to escape is still above what
 * it has.
 */
const MAX_FLING_RATIO = 0.8;

export function sys_control_cloud(game: Game, delta: number) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) === QUERY) {
            update(game, ent, delta);
        }
    }
}

/** How much sideways speed the sweep of the cloud gives the element. */
function fling_speed(tuning: Tuning, swing: number) {
    let cap = tuning.DropSpeed * MAX_FLING_RATIO;
    let speed = tuning.Fling * swing * tuning.OrbitRadius;
    return Math.max(-cap, Math.min(cap, speed));
}

/**
 * The velocity an element leaves the cloud with.
 *
 * The inward part aims at the middle. The sideways part is what the player
 * swept into it, and it is the only way an element can carry a turning force
 * about the middle: a throw straight at the middle has none, whatever its mass,
 * because its line of travel passes through the middle.
 */
function drop_velocity(inward: number, sideways: number, angle: number): Vec2 {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    return [-cos * inward - sin * sideways, -sin * inward + cos * sideways];
}

function update(game: Game, entity: Entity, delta: number) {
    let tuning = game.Tuning;
    let cloud = game.World.DropCloud[entity];
    cloud.Cooldown -= delta;

    let camera_entity = game.Cameras[0];
    if (camera_entity === undefined) {
        return;
    }

    let camera = game.World.Camera2D[camera_entity];
    if (camera.ViewportWidth === 0) {
        // The first fixed step runs before the first sys_resize2d. Wait for it,
        // or the pointer maps to NaN.
        return;
    }

    // A touch gives both the aim and the drop in one event, so read the touch
    // position first and test the release after the angle is set. On the frame
    // of the release the touch is already up, but its last position stays in
    // InputState, so keep reading it.
    let touching = game.InputState["Touch0"] === 1 || game.InputDelta["Touch0"] === -1;
    pointer[0] = touching ? game.InputState["Touch0X"] : game.InputState["MouseX"];
    pointer[1] = touching ? game.InputState["Touch0Y"] : game.InputState["MouseY"];
    viewport_to_world(pointer, camera, pointer);

    let angle = Math.atan2(pointer[1], pointer[0]);

    // How fast the player is sweeping the cloud around the ring. atan2 of the
    // sine and cosine of the difference gives the short way round, so the sweep
    // does not spike when the angle passes from +pi to -pi.
    let turned = angle - cloud.Angle;
    turned = Math.atan2(Math.sin(turned), Math.cos(turned));
    let swing = Math.max(-MAX_SWING, Math.min(MAX_SWING, turned / delta));
    cloud.Swing += (swing - cloud.Swing) * SWING_SMOOTHING;
    cloud.Angle = angle;

    let local = game.World.LocalTransform2D[entity];
    local.Translation[0] = Math.cos(cloud.Angle) * tuning.OrbitRadius;
    local.Translation[1] = Math.sin(cloud.Angle) * tuning.OrbitRadius;
    // Point the cloud at the center.
    local.Rotation = cloud.Angle * RAD_TO_DEG + 90;
    game.World.Signature[entity] |= Has.Dirty;

    // The drop fires on release, not on press. A press writes 1 into
    // InputDelta and the matching release writes -1 over it. If both happen
    // between two fixed steps -- a fast click, or any synthetic one -- the
    // press is lost, but the release is always the last write, so it survives.
    let released = game.InputDelta["Mouse0"] === -1 || game.InputDelta["Touch0"] === -1;
    if (released && cloud.Cooldown <= 0) {
        instantiate(
            game,
            blueprint_element(
                game,
                cloud.NextTier,
                [local.Translation[0], local.Translation[1]],
                drop_velocity(
                    tuning.DropSpeed,
                    tuning.Fling * cloud.Swing * tuning.OrbitRadius,
                    cloud.Angle,
                ),
            ),
        );
        cloud.NextTier = roll_tier();
        cloud.Cooldown = tuning.DropCooldown;
        sound_drop(game);
    }
}
