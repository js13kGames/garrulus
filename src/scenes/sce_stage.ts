import {instantiate} from "../../lib/game.js";
import {Game} from "../game.js";
import {sys_camera2d} from "../systems/sys_camera2d.js";
import {sys_resize2d} from "../systems/sys_resize2d.js";
import {sys_transform2d} from "../systems/sys_transform2d.js";
import {World} from "../world.js";
import {blueprint_camera} from "./blu_camera.js";
import {blueprint_cloud} from "./blu_cloud.js";

export function scene_stage(game: Game) {
    game.World = new World(game.World.Capacity);
    game.Score = 0;
    game.Won = false;
    game.HitStop = 0;
    game.ShakeAmount = 0;
    game.BreachTime = 0;

    instantiate(game, blueprint_camera());
    instantiate(game, blueprint_cloud());

    // Make the camera usable before the first fixed step.
    //
    // sys_control_cloud turns the pointer into a world angle with the camera
    // projection and the camera world matrix. Both are filled by systems which
    // run in FrameUpdate, after the first FixedUpdate. Without this, the first
    // step aims at a matrix of zeros and every element drops at angle 0. On a
    // restart the viewport has not changed, so sys_resize2d would skip the new
    // camera; ViewportResized forces it.
    game.ViewportResized = true;
    sys_resize2d(game, 0);
    sys_transform2d(game, 0);
    sys_camera2d(game, 0);
}
