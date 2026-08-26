import {Game2D} from "../lib/game.js";
import {Entity} from "../lib/world.js";
import {sys_camera2d} from "./systems/sys_camera2d.js";
import {sys_collide_circle} from "./systems/sys_collide_circle.js";
import {sys_draw} from "./systems/sys_draw.js";
import {sys_physics2d_integrate} from "./systems/sys_physics2d_integrate.js";
import {sys_physics2d_resolve} from "./systems/sys_physics2d_resolve.js";
import {sys_resize2d} from "./systems/sys_resize2d.js";
import {sys_transform2d} from "./systems/sys_transform2d.js";
import {sys_ui} from "./systems/sys_ui.js";
import {World} from "./world.js";

export const WORLD_CAPACITY = 1024;

// Tuning constants. All lengths are in world units, all times in seconds.

/** The circle the drop cloud rides on. */
export const ORBIT_RADIUS = 10;
/** The mass may touch this circle, but not for longer than BREACH_LIMIT. */
export const DEATH_RADIUS = 8.5;
/** How much of the world the camera shows, measured from the center. */
export const CAMERA_RADIUS = ORBIT_RADIUS + 1.5;

/**
 * The pull toward the center, in units per second squared.
 *
 * `BUILD.md` says 40. That gives about 28 units per second at the center, which
 * is 0.47 units in one fixed step: further than the radius of a Sparkle, so
 * small elements tunnel through each other. 16 with a drag of 0.9 settles at
 * about 18 units per second, which is 0.3 units in a step.
 */
export const CENTER_PULL = 16;
/** Velocity lost each second, as a fraction. */
export const DRAG = 0.9;
/** How much of the closing speed a contact gives back. Keep it low; this is a pile, not a ball pit. */
export const BOUNCE = 0.1;
/** How much of the tangential slip at a contact becomes spin. For the eye only. */
export const SPIN = 12;
/** Passes of the contact solver in one fixed step. */
export const SOLVER_ITERATIONS = 6;

export interface Contact {
    A: Entity;
    B: Entity;
    /** The sum of the two radii. The solver computes the depth from live positions. */
    Sum: number;
}

export class Game extends Game2D {
    World = new World(WORLD_CAPACITY);

    /** Touching pairs found this step. Only the first ContactCount entries are live. */
    Contacts: Array<Contact> = [];
    ContactCount = 0;

    override FixedUpdate(step: number) {
        sys_physics2d_integrate(this, step);
        sys_transform2d(this, step);
        sys_collide_circle(this, step);
        sys_physics2d_resolve(this, step);
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
