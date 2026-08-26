import {instantiate} from "../../lib/game.js";
import {Game} from "../game.js";
import {World} from "../world.js";
import {blueprint_camera} from "./blu_camera.js";

export function scene_stage(game: Game) {
    game.World = new World(game.World.Capacity);

    instantiate(game, blueprint_camera());
}
