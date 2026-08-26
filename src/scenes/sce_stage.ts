import {instantiate} from "../../lib/game.js";
import {float, integer} from "../../lib/random.js";
import {Game, ORBIT_RADIUS} from "../game.js";
import {World} from "../world.js";
import {blueprint_camera} from "./blu_camera.js";
import {blueprint_element} from "./blu_element.js";

export function scene_stage(game: Game) {
    game.World = new World(game.World.Capacity);

    instantiate(game, blueprint_camera());

    // Milestone 2 only: a burst of elements, to see the pile pack. The drop
    // cloud takes over in milestone 3.
    for (let i = 0; i < 40; i++) {
        let angle = float(0, Math.PI * 2);
        let distance = float(ORBIT_RADIUS * 0.55, ORBIT_RADIUS * 0.95);
        instantiate(
            game,
            blueprint_element(
                integer(0, 4),
                [Math.cos(angle) * distance, Math.sin(angle) * distance],
                [0, 0],
            ),
        );
    }
}
