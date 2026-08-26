import {Blueprint} from "../../lib/game.js";
import {drop_cloud} from "../components/com_drop_cloud.js";
import {local_transform2d} from "../components/com_local_transform2d.js";
import {spatial_node2d} from "../components/com_spatial_node2d.js";
import {Game} from "../game.js";
import {roll_tier} from "../systems/sys_control_cloud.js";

/**
 * The cloud rides the orbit circle and drops the elements.
 *
 * It has no collider: it must never touch the pile.
 */
export function blueprint_cloud(): Blueprint<Game> {
    return [spatial_node2d(), local_transform2d(), drop_cloud(roll_tier())];
}
