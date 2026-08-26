import {instantiate} from "../../lib/game.js";
import {float, set_seed} from "../../lib/random.js";
import {Game} from "../game.js";
import {MODES} from "../modes.js";
import {sys_camera2d} from "../systems/sys_camera2d.js";
import {sys_resize2d} from "../systems/sys_resize2d.js";
import {sys_transform2d} from "../systems/sys_transform2d.js";
import {World} from "../world.js";
import {blueprint_camera} from "./blu_camera.js";
import {blueprint_cloud} from "./blu_cloud.js";
import {blueprint_star} from "./blu_star.js";

/**
 * Build the arena for one mode.
 *
 * @param game The game.
 * @param mode Index into MODES.
 */
export function scene_stage(game: Game, mode: number) {
    game.Mode = mode;
    game.Tuning = MODES[mode];

    game.World = new World(game.World.Capacity);
    game.Score = 0;
    game.Won = false;
    game.WinTime = 0;
    game.RunTime = 0;
    game.HitStop = 0;
    game.ShakeAmount = 0;
    game.BreachTime = 0;

    instantiate(game, blueprint_camera(game));
    instantiate(game, blueprint_cloud(game));

    // Dead stars. They sit between the middle and the death ring, spread evenly
    // around it, so no side of the arena is easier than another. The seed is
    // fixed, so every run of a mode has the same board to learn.
    set_seed(mode + 1);
    let count = game.Tuning.DeadStars;
    for (let i = 0; i < count; i++) {
        let angle = (i / count) * Math.PI * 2 + float(-0.3, 0.3);
        let distance = game.Tuning.DeathRadius * float(0.42, 0.62);
        instantiate(game, blueprint_star([Math.cos(angle) * distance, Math.sin(angle) * distance]));
    }

    // Make the camera usable before the first fixed step.
    //
    // sys_control_cloud turns the pointer into a world angle with the camera
    // projection and the camera world matrix. Both are filled by systems which
    // run in FrameUpdate, after the first FixedUpdate. Without the priming, the
    // first step aims at a matrix of zeros and every element drops at angle 0.
    // On a restart the viewport has not changed, so sys_resize2d would skip the
    // new camera; ViewportResized forces it.
    game.ViewportResized = true;
    sys_resize2d(game, 0);
    sys_transform2d(game, 0);
    sys_camera2d(game, 0);
}
