/**
 * # tuning
 *
 * The numbers for the final Maelstrom game.
 */

/** Multiplies how strongly distance from the center changes an element's size. */
export const DISTANCE_SCALE_MULTIPLIER = 3;

/** Radius for each tier, with the top half growing much faster. */
const RADII = [0.4, 0.48, 0.58, 0.69, 0.83, 1.06, 1.36, 1.74, 2.23, 2.85];

export interface Tuning {
    Name: string;
    Blurb: string;
    OrbitRadius: number;
    DeathRadius: number;
    CenterPull: number;
    Drag: number;
    Bounce: number;
    Friction: number;
    Spin: number;
    SolverIterations: number;
    SubSteps: number;
    DropCooldown: number;
    DropSpeed: number;
    Fling: number;
    Radii: Array<number>;
    ScaleCenter: number;
    ScaleEdge: number;
    Bumps: number;
    DeadStars: number;
}

export const TUNING: Tuning = {
    Name: "Maelstrom",
    Blurb: "Tight, lumpy, and turning.",
    OrbitRadius: 9.5,
    DeathRadius: 8,
    CenterPull: 16,
    Drag: 0.4,
    Bounce: 0.2,
    Friction: 0.5,
    Spin: 12,
    SolverIterations: 8,
    SubSteps: 3,
    DropCooldown: 0.35,
    DropSpeed: 8,
    Fling: 0.45,
    Radii: RADII,
    ScaleCenter: 0.7,
    ScaleEdge: 1.3,
    Bumps: 2,
    DeadStars: 2,
};

export function scale_at(tuning: Tuning, reach: number) {
    return (
        tuning.ScaleCenter +
        (tuning.ScaleEdge - tuning.ScaleCenter) * DISTANCE_SCALE_MULTIPLIER * reach
    );
}

/** Radius covered by the static star field. */
export const MAX_CAMERA_RADIUS = TUNING.OrbitRadius + 1.5;

/** How much of the world the camera shows, measured from the center. */
export function camera_radius(tuning: Tuning) {
    return tuning.OrbitRadius + 1.5;
}
