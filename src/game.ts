import {Game2D} from "../lib/game.js";
import {Entity} from "../lib/world.js";
import {TUNING, Tuning} from "./modes.js";
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
import {sys_scale_by_radius} from "./systems/sys_scale_by_radius.js";
import {sys_transform2d} from "./systems/sys_transform2d.js";
import {sys_ui} from "./systems/sys_ui.js";
import {World} from "./world.js";

export const WORLD_CAPACITY = 1024;

// Constants which do not belong to the final game's tuning.

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
    /** Which part of A and of B touch. An offset into `CollideCircle.Parts`. */
    PartA: number;
    PartB: number;
    /** The sum of the two part radii. The solver finds the depth from live positions. */
    Sum: number;
}

export class Game extends Game2D {
    World = new World(WORLD_CAPACITY);

    /** The final game's tuning. */
    Tuning: Tuning = TUNING;

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
    /** How long this run has lasted, in seconds. For judging the modes. */
    RunTime = 0;

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

        // Sub-steps. A mode with a low drag lets bodies get fast, and a body
        // must not move further than the smallest radius in one step or it
        // passes through its neighbour. Splitting the step is the fix which
        // costs no tuning of the mode itself.
        let sub = this.Tuning.SubSteps;
        let sub_step = step / sub;
        for (let i = 0; i < sub; i++) {
            sys_physics2d_integrate(this, sub_step);
            sys_transform2d(this, sub_step);
            // The size depends on where the body now is, so it is found again
            // after every move and before anything looks at the shapes.
            sys_scale_by_radius(this, sub_step);
            sys_collide_circle(this, sub_step);
            sys_physics2d_resolve(this, sub_step);
        }

        // The merge reads the contact list the last sub-step left behind.
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

/** Read the best score. */
export function load_best() {
    try {
        return Number(localStorage.garrulus ?? localStorage.garrulus4) || 0;
    } catch {
        return 0;
    }
}

export const enum Layer {
    None = 0,
    Element = 1,
    Star = 2,
    Cloud = 4,
}
