import {Game2D} from "../lib/game.js";
import {sys_camera2d} from "./systems/sys_camera2d.js";
import {sys_draw} from "./systems/sys_draw.js";
import {sys_resize2d} from "./systems/sys_resize2d.js";
import {sys_transform2d} from "./systems/sys_transform2d.js";
import {sys_ui} from "./systems/sys_ui.js";
import {World} from "./world.js";

export const WORLD_CAPACITY = 1024;

// Tuning constants. All lengths are in world units.

/** The circle the drop cloud rides on. */
export const ORBIT_RADIUS = 10;
/** The mass may touch this circle, but not for longer than BREACH_LIMIT. */
export const DEATH_RADIUS = 8.5;
/** How much of the world the camera shows, measured from the center. */
export const CAMERA_RADIUS = ORBIT_RADIUS + 1.5;

export class Game extends Game2D {
    World = new World(WORLD_CAPACITY);

    override FixedUpdate(step: number) {
        sys_transform2d(this, step);
    }

    override FrameUpdate(delta: number) {
        sys_resize2d(this, delta);
        sys_camera2d(this, delta);
        sys_draw(this, delta);
        sys_ui(this, delta);
    }
}

export const enum Layer {
    None = 0,
    Element = 1,
    Cloud = 2,
}
