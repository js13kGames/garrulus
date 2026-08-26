/**
 * # modes
 *
 * The tuning of each play mode, in one table.
 *
 * `new-modes.md` asks for three modes which attack the same problem from three
 * angles: the arena is too big, so the player never feels pressure. Each mode
 * is only a set of numbers here, plus the two shape switches at the end. No
 * mode has code of its own.
 *
 * Mode 0 is the game as it was, kept so that the others have something to be
 * measured against.
 */

/** Radius for each tier. The step is 1.2, so the area grows by about 1.5. */
const RADII_LINEAR = [0.45, 0.55, 0.66, 0.79, 0.95, 1.14, 1.37, 1.64, 1.97, 2.36];

/**
 * Radius for each tier, with the top half growing much faster.
 *
 * The step is 1.2 up to tier 4, then 1.28. A Cosmic Unicorn is 2.85 across the
 * radius in an arena of 5.1, so one takes about a third of the whole area.
 */
const RADII_EXPONENTIAL = [0.4, 0.48, 0.58, 0.69, 0.83, 1.06, 1.36, 1.74, 2.23, 2.85];

export interface Tuning {
    /** Shown on the title screen. */
    Name: string;
    Blurb: string;

    /** The circle the cloud rides on. */
    OrbitRadius: number;
    /** The mass may touch this circle, but not for longer than BREACH_LIMIT. */
    DeathRadius: number;

    /** Pull toward the center, in units per second squared. */
    CenterPull: number;
    /** Velocity lost each second, as a fraction. */
    Drag: number;
    /** How much of the closing speed a contact gives back. */
    Bounce: number;
    /**
     * How much of the sliding between two touching bodies is taken away, from
     * 0 to 1. 0 lets them slide freely, which makes the pile pack into a smooth
     * ball. Above about 0.4 they grind, and the pile turns as one mass.
     */
    Friction: number;
    /** How much of the sliding at a contact becomes spin. For the eye only. */
    Spin: number;

    /** Passes of the contact solver in one sub-step. */
    SolverIterations: number;
    /**
     * Physics sub-steps inside one fixed step.
     *
     * A body must not move further than the smallest radius in one sub-step, or
     * small elements pass through each other. Raise this for a mode with a low
     * drag or a fast drop.
     */
    SubSteps: number;

    /** Seconds between two drops. */
    DropCooldown: number;
    /** How fast a dropped element leaves the cloud, in units per second. */
    DropSpeed: number;
    /**
     * How much of the sweep of the cloud the element takes with it, sideways.
     *
     * At 0 the element is thrown straight at the middle. Such a throw carries
     * no turning force about the middle at all, however heavy it is, because
     * its line of travel goes through the middle. A mode which wants the player
     * to be able to spin the pile must raise this above 0.
     */
    Fling: number;

    /** Radius for each tier. */
    Radii: Array<number>;

    /** Bumps added around each element. 0 makes a plain circle. */
    Bumps: number;
    /** Immovable obstacles placed in the arena. */
    DeadStars: number;
}

export const MODES: Array<Tuning> = [
    {
        Name: "Classic",
        Blurb: "The first build. Room to grow.",
        OrbitRadius: 10,
        DeathRadius: 8.5,
        CenterPull: 16,
        Drag: 0.9,
        Bounce: 0.1,
        Friction: 0,
        Spin: 12,
        SolverIterations: 6,
        SubSteps: 1,
        DropCooldown: 0.35,
        DropSpeed: 4,
        Fling: 0,
        Radii: RADII_LINEAR,
        Bumps: 0,
        DeadStars: 0,
    },
    {
        // Mode 1 of new-modes.md.
        //
        // The document puts "Shrunk Death Ring" over a line which moves the
        // spawn circle. Both circles move: the death ring must stay inside the
        // spawn circle, or an element breaches the moment it is dropped. Both
        // are 40 percent closer to the middle, as asked.
        Name: "Claustrophobia",
        Blurb: "A small arena, and giants which eat it.",
        OrbitRadius: 6,
        DeathRadius: 5.1,
        CenterPull: 16,
        Drag: 0.9,
        Bounce: 0.1,
        Friction: 0,
        Spin: 12,
        SolverIterations: 6,
        SubSteps: 1,
        DropCooldown: 0.35,
        DropSpeed: 4,
        Fling: 0,
        Radii: RADII_EXPONENTIAL,
        Bumps: 0,
        DeadStars: 0,
    },
    {
        // Mode 2 of new-modes.md. The bumps stop the honeycomb packing, the
        // friction stops the sliding, and the dead stars stop the pile from
        // growing as a circle.
        Name: "Jagged Orbit",
        Blurb: "Lumpy elements which grind and lock.",
        OrbitRadius: 10,
        DeathRadius: 8.5,
        CenterPull: 16,
        Drag: 0.9,
        Bounce: 0.05,
        Friction: 0.55,
        Spin: 6,
        // The bumps make many more contacts for one pair, so the solver needs
        // more passes to settle them.
        SolverIterations: 8,
        SubSteps: 1,
        DropCooldown: 0.35,
        DropSpeed: 4,
        Fling: 0,
        Radii: RADII_LINEAR,
        Bumps: 2,
        DeadStars: 3,
    },
    {
        // Mode 3 of new-modes.md.
        //
        // The drag is low, so the mass keeps the turn a sweep gives it, but not
        // so low that elements orbit instead of settling. The friction is what
        // carries the turn from one element to the next.
        //
        // These numbers were measured, not guessed. Every one of them has a
        // narrow window:
        //
        //   CenterPull 10  the pile never packs. Elements orbit near the death
        //                  ring and the run ends in seconds. 16 packs it.
        //   Drag 0.2       same failure. 0.4 settles the pile and still turns.
        //   Fling above    the throws leave the arena; runs of 4 to 8 seconds
        //   0.45           and a score near zero.
        //
        // At the values below a bot which sweeps and drops lasts about 110
        // seconds and scores about 2650, with the mass turning at 0.26 radians
        // each second on average and over 2 at the peak.
        Name: "Momentum",
        Blurb: "A heavy drop spins the whole planet.",
        OrbitRadius: 10,
        DeathRadius: 8.5,
        CenterPull: 16,
        Drag: 0.4,
        Bounce: 0.3,
        Friction: 0.45,
        Spin: 20,
        SolverIterations: 6,
        // 16 / 0.4 is 40 units each second, which is 0.22 units in a sub-step
        // against a smallest radius of 0.45.
        SubSteps: 3,
        DropCooldown: 0.35,
        DropSpeed: 9,
        // The mode lives or dies on this number. See the note above, and the
        // cap in sys_control_cloud.
        Fling: 0.45,
        Radii: RADII_LINEAR,
        Bumps: 0,
        DeadStars: 0,
    },
];

/** The largest arena any mode uses. The star field is drawn to cover it. */
export const MAX_CAMERA_RADIUS = 11.5;

/** How much of the world the camera shows, measured from the center. */
export function camera_radius(tuning: Tuning) {
    return tuning.OrbitRadius + 1.5;
}
