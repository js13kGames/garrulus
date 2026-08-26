import {Blueprint} from "../../lib/game.js";
import {camera2d} from "../components/com_camera2d.js";
import {local_transform2d} from "../components/com_local_transform2d.js";
import {spatial_node2d} from "../components/com_spatial_node2d.js";
import {Game} from "../game.js";
import {camera_radius} from "../modes.js";

export function blueprint_camera(game: Game): Blueprint<Game> {
    let radius = camera_radius(game.Tuning);
    return [spatial_node2d(), local_transform2d(), camera2d([radius, radius])];
}
