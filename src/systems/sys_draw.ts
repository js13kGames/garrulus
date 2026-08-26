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
import {Entity} from "../../lib/world.js";
import {
    BREACH_LIMIT,
    CAMERA_RADIUS,
    DEATH_RADIUS,
    Game,
    ORBIT_RADIUS,
    POP_RING_LIFE,
    SHAKE_DECAY,
    SHAKE_MAX,
} from "../game.js";
import {ELEMENTS} from "../scenes/blu_element.js";
import {Has} from "../world.js";

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

const QUERY_ELEMENT = Has.SpatialNode2D | Has.CollideCircle | Has.Merge;
const QUERY_CLOUD = Has.SpatialNode2D | Has.DropCloud;
// A pop ring is the only entity which has a lifespan but is not an element.
const QUERY_RING = Has.SpatialNode2D | Has.Lifespan;

/** Reused between frames so that the draw order costs no allocation. */
let ordered: Array<Entity> = [];

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

    // World space to pixels.
    ctx.transform(
        (camera.Pv[0] * game.ViewportWidth) / 2,
        (-camera.Pv[1] * game.ViewportHeight) / 2,
        (-camera.Pv[2] * game.ViewportWidth) / 2,
        (camera.Pv[3] * game.ViewportHeight) / 2,
        ((1 + camera.Pv[4]) * game.ViewportWidth) / 2,
        ((1 - camera.Pv[5]) * game.ViewportHeight) / 2,
    );
    // The matrix above puts +Y down, as pixels go. Flip it, so that everything
    // below draws in world coordinates with +Y up and world matrices apply
    // without a change.
    ctx.scale(1, -1);

    // Screen shake. The offset is in world units, so it is applied inside the
    // camera transform. It decays here because sys_draw is the only reader.
    if (game.ShakeAmount > 0.001) {
        // Clamp on the way out, so that a long chain of merges cannot build a
        // value which then takes seconds to decay away.
        let shake = (game.ShakeAmount = Math.min(game.ShakeAmount, SHAKE_MAX));
        ctx.translate(float(-shake, shake), float(-shake, shake));
        game.ShakeAmount *= SHAKE_DECAY;
    } else {
        game.ShakeAmount = 0;
    }

    draw_background(ctx);
    draw_rings(ctx, game.BreachTime / BREACH_LIMIT);
    draw_elements(game, ctx);
    draw_rings_of_merges(game, ctx);
    draw_clouds(game, ctx);
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

function draw_rings(ctx: CanvasRenderingContext2D, breach: number) {
    // The death ring. It goes from calm violet to alarm red as the mass leans
    // on it, so the player can see the timer without a number.
    let heat = Math.min(breach, 1);
    ctx.strokeStyle = `rgb(${58 + 197 * heat} ${47 - 25 * heat} ${107 - 30 * heat})`;
    ctx.lineWidth = 0.05 + 0.09 * heat;
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

function draw_elements(game: Game, ctx: CanvasRenderingContext2D) {
    ordered.length = 0;
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY_ELEMENT) === QUERY_ELEMENT) {
            ordered.push(ent);
        }
    }
    // Small elements first, so the big ones sit on top of the pile.
    ordered.sort((a, b) => game.World.Merge[a].Tier - game.World.Merge[b].Tier);

    for (let i = 0; i < ordered.length; i++) {
        let ent = ordered[i];
        let node = game.World.SpatialNode2D[ent];
        let radius = game.World.CollideCircle[ent].Radius;
        let color = ELEMENTS[game.World.Merge[ent].Tier][2];

        ctx.save();
        ctx.transform(
            node.World[0],
            node.World[1],
            node.World[2],
            node.World[3],
            node.World[4],
            node.World[5],
        );
        draw_body(ctx, radius, color);
        ctx.restore();
    }
}

function draw_body(ctx: CanvasRenderingContext2D, radius: number, color: string) {
    // A light spot up and to the left gives the flat circle its volume.
    let shade = ctx.createRadialGradient(
        -radius * 0.35,
        radius * 0.35,
        radius * 0.1,
        0,
        0,
        radius * 1.15,
    );
    shade.addColorStop(0, "#ffffff");
    shade.addColorStop(0.35, color);
    shade.addColorStop(1, color);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fillStyle = shade;
    ctx.fill();

    ctx.lineWidth = radius * 0.08;
    ctx.strokeStyle = "#00000040";
    ctx.stroke();

    draw_face(ctx, radius);
}

/**
 * Two sleepy eyes and a small smile.
 *
 * The theme is a sleepy unicorn, so the eyes are closed: two short arcs. Both
 * are primitive paths, which keeps the cost of a face near nothing.
 */
function draw_face(ctx: CanvasRenderingContext2D, radius: number) {
    ctx.strokeStyle = "#20123a";
    ctx.lineWidth = radius * 0.09;
    ctx.lineCap = "round";

    let eye = radius * 0.3;
    ctx.beginPath();
    ctx.arc(-eye, radius * 0.12, radius * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.moveTo(eye + radius * 0.2, radius * 0.12);
    ctx.arc(eye, radius * 0.12, radius * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -radius * 0.1, radius * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
}

function draw_clouds(game: Game, ctx: CanvasRenderingContext2D) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY_CLOUD) !== QUERY_CLOUD) {
            continue;
        }

        let node = game.World.SpatialNode2D[ent];
        let cloud = game.World.DropCloud[ent];

        ctx.save();
        ctx.transform(
            node.World[0],
            node.World[1],
            node.World[2],
            node.World[3],
            node.World[4],
            node.World[5],
        );

        // The cloud points at the center, so local +Y is the way the element
        // falls. The preview element hangs there, under the cloud.
        let [radius, , color] = ELEMENTS[cloud.NextTier];
        ctx.globalAlpha = cloud.Cooldown > 0 ? 0.25 : 0.75;
        draw_body(ctx, radius, color);
        ctx.globalAlpha = 1;

        // A blob of three overlapping circles.
        ctx.translate(0, -0.75);
        ctx.fillStyle = "#e8e4ff";
        ctx.beginPath();
        ctx.arc(-0.42, 0, 0.34, 0, TAU);
        ctx.arc(0.42, 0, 0.34, 0, TAU);
        ctx.arc(0, 0.16, 0.46, 0, TAU);
        ctx.fill();

        ctx.restore();
    }
}

function draw_rings_of_merges(game: Game, ctx: CanvasRenderingContext2D) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY_RING) !== QUERY_RING) {
            continue;
        }

        let node = game.World.SpatialNode2D[ent];
        let left = game.World.Lifespan[ent].Remaining / POP_RING_LIFE;

        ctx.save();
        ctx.transform(
            node.World[0],
            node.World[1],
            node.World[2],
            node.World[3],
            node.World[4],
            node.World[5],
        );
        // The transform carries the radius of the element which merged, so the
        // ring is drawn in units of that radius: it starts at the rim and opens
        // out while it fades.
        ctx.globalAlpha = left * 0.7;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 0.1 * left;
        ctx.beginPath();
        ctx.arc(0, 0, 1 + 1.1 * (1 - left), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
