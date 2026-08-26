/**
 * # sys_draw
 *
 * Draw the whole scene with the Context2D API: the cosmic background, the two
 * rings, the elements in the pile, the cloud, and the merge effects.
 *
 * The scene is vector art, so there is no spritesheet and no WebGL. Everything
 * here is a path.
 */

import {float, set_seed} from "../../lib/random.js";
import {CAMERA_RADIUS, DEATH_RADIUS, Game, ORBIT_RADIUS} from "../game.js";

const TAU = Math.PI * 2;

/**
 * Static background stars, as [x, y, size] triples.
 *
 * The seed is fixed, so the sky is the same on every run and costs no bytes as
 * a data table.
 */
const STARS: Array<number> = [];
set_seed(7);
for (let i = 0; i < 70; i++) {
    let angle = float(0, TAU);
    // sqrt keeps the stars spread evenly over the disc instead of clumping in
    // the middle.
    let dist = Math.sqrt(float(0, 1)) * CAMERA_RADIUS * 1.6;
    STARS.push(Math.cos(angle) * dist, Math.sin(angle) * dist, float(0.04, 0.09));
}

export function sys_draw(game: Game, delta: number) {
    let camera_entity = game.Cameras[0];
    if (camera_entity === undefined) {
        return;
    }

    let camera = game.World.Camera2D[camera_entity];
    let ctx = game.Context;

    ctx.resetTransform();
    ctx.fillStyle = "#080614";
    ctx.fillRect(0, 0, game.ViewportWidth, game.ViewportHeight);

    // World space to pixels. Context2D has +Y down, the world has +Y up, so the
    // second and fourth terms of the matrix are negated.
    ctx.transform(
        (camera.Pv[0] * game.ViewportWidth) / 2,
        (-camera.Pv[1] * game.ViewportHeight) / 2,
        (-camera.Pv[2] * game.ViewportWidth) / 2,
        (camera.Pv[3] * game.ViewportHeight) / 2,
        ((1 + camera.Pv[4]) * game.ViewportWidth) / 2,
        ((1 - camera.Pv[5]) * game.ViewportHeight) / 2,
    );

    draw_background(ctx);
    draw_rings(ctx);
}

function draw_background(ctx: CanvasRenderingContext2D) {
    // A soft glow behind the middle, where the pile grows.
    let glow = ctx.createRadialGradient(0, 0, 0, 0, 0, DEATH_RADIUS);
    glow.addColorStop(0, "#1e1746");
    glow.addColorStop(1, "#08061400");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, DEATH_RADIUS, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#cfc8ff";
    for (let i = 0; i < STARS.length; i += 3) {
        ctx.fillRect(STARS[i], STARS[i + 1], STARS[i + 2], STARS[i + 2]);
    }
}

function draw_rings(ctx: CanvasRenderingContext2D) {
    // The death ring. It turns red as the mass leans on it; see sys_game_over.
    ctx.strokeStyle = "#3a2f6b";
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(0, 0, DEATH_RADIUS, 0, TAU);
    ctx.stroke();

    // The orbit ring the cloud rides on.
    ctx.strokeStyle = "#2a2350";
    ctx.lineWidth = 0.03;
    ctx.setLineDash([0.2, 0.25]);
    ctx.beginPath();
    ctx.arc(0, 0, ORBIT_RADIUS, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
}
