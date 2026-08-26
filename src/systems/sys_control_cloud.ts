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
import {DROP_COOLDOWN, DROP_SPEED, Game, ORBIT_RADIUS} from "../game.js";
import {blueprint_element} from "../scenes/blu_element.js";
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

export function sys_control_cloud(game: Game, delta: number) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) === QUERY) {
            update(game, ent, delta);
        }
    }
}

function update(game: Game, entity: Entity, delta: number) {
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

    cloud.Angle = Math.atan2(pointer[1], pointer[0]);

    let local = game.World.LocalTransform2D[entity];
    local.Translation[0] = Math.cos(cloud.Angle) * ORBIT_RADIUS;
    local.Translation[1] = Math.sin(cloud.Angle) * ORBIT_RADIUS;
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
                cloud.NextTier,
                [local.Translation[0], local.Translation[1]],
                [-Math.cos(cloud.Angle) * DROP_SPEED, -Math.sin(cloud.Angle) * DROP_SPEED],
            ),
        );
        cloud.NextTier = roll_tier();
        cloud.Cooldown = DROP_COOLDOWN;
    }
}
