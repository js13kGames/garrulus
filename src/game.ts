import {Game2D} from "../lib/game.js";
import {Entity} from "../lib/world.js";
import {sys_animate_pop} from "./systems/sys_animate_pop.js";
import {sys_camera2d} from "./systems/sys_camera2d.js";
import {sys_collide_circle} from "./systems/sys_collide_circle.js";
import {sys_control_cloud} from "./systems/sys_control_cloud.js";
import {sys_draw} from "./systems/sys_draw.js";
import {sys_game_over} from "./systems/sys_game_over.js";
import {sys_lifespan} from "./systems/sys_lifespan.js";
import {sys_merge} from "./systems/sys_merge.js";
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
/** Seconds between two drops. */
export const DROP_COOLDOWN = 0.35;
/** How fast a dropped element leaves the cloud, in units per second. */
export const DROP_SPEED = 4;
/** Seconds a fresh element waits before it can merge again. */
export const MERGE_COOLDOWN = 0.2;
/** How big a fresh element starts, as a factor of its true size. */
export const POP_SCALE = 1.35;
/** Screen shake added for each tier of a merge. */
export const SHAKE_PER_TIER = 0.012;
/** Fixed steps the world freezes for after a merge. */
export const HITSTOP_SMALL = 2;
export const HITSTOP_BIG = 4;
/** The tier at which a merge earns the long freeze. */
export const HITSTOP_TIER = 5;
/** Seconds the mass may lean on the death ring before the game ends. */
export const BREACH_LIMIT = 3;
/** Seconds the win banner stays up. */
export const WIN_BANNER = 3;
/** Seconds a merge ring stays visible. */
export const POP_RING_LIFE = 0.35;
/** How much of the shake is left after each frame. */
export const SHAKE_DECAY = 0.86;
/** The largest shake, in world units. */
export const SHAKE_MAX = 0.5;

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

    PlayState: "title" | "play" | "over" = "title";
    Score = 0;
    BestScore = load_best();
    /** Set when two Cosmic Unicorns meet. Play goes on. */
    Won = false;
    /** Seconds left on the win banner. */
    WinTime = 0;

    /** Seconds the mass has been over the death ring without a break. */
    BreachTime = 0;

    /** Fixed steps left to freeze the world. Rendering goes on. */
    HitStop = 0;
    /** How far the view is thrown off center, in world units. */
    ShakeAmount = 0;

    override FixedUpdate(step: number) {
        // Aiming stays live during the freeze, but not on the title screen or
        // after the loss. The pile keeps settling behind both overlays, which
        // makes them feel part of the game and not a stop.
        if (this.PlayState === "play") {
            sys_control_cloud(this, step);
        }

        // Hit stop: the world holds still for a few steps after a merge, which
        // is what makes the merge feel like an impact.
        if (this.HitStop > 0) {
            this.HitStop--;
            return;
        }

        sys_physics2d_integrate(this, step);
        sys_transform2d(this, step);
        sys_collide_circle(this, step);
        sys_physics2d_resolve(this, step);
        sys_merge(this, step);
        sys_transform2d(this, step);
        if (this.PlayState === "play") {
            sys_game_over(this, step);
        }
        sys_animate_pop(this, step);
        sys_lifespan(this, step);
    }

    override FrameUpdate(delta: number) {
        sys_resize2d(this, delta);
        sys_camera2d(this, delta);
        sys_draw(this, delta);
        sys_ui(this, delta);
    }
}

/** The key the best score is kept under. */
export const STORE_KEY = "garrulus";

/**
 * Read the best score.
 *
 * A browser can refuse localStorage: private windows and blocked site data both
 * throw on access. The game must still start.
 */
export function load_best() {
    try {
        return Number(localStorage[STORE_KEY]) || 0;
    } catch {
        return 0;
    }
}

export const enum Layer {
    None = 0,
    Element = 1,
    Cloud = 2,
}
