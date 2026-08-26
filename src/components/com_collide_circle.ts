/**
 * # CollideCircle
 *
 * The shape of an element, as one or more circles.
 *
 * A plain element is one circle at the middle. A "jagged" element has bumps:
 * extra smaller circles set around the rim, which stop the pile packing into a
 * smooth honeycomb. The parts are held in the local frame of the element and
 * turn with it.
 *
 * The collider has no `Center` field: elements are top-level entities, so their
 * `LocalTransform2D.Translation` already is the world position, and the
 * collision code reads it directly. That keeps the solver free of matrix
 * round-trips while it moves bodies apart.
 */

import {Entity} from "../../lib/world.js";
import {Game, Layer} from "../game.js";
import {Has} from "../world.js";

export interface CollideCircle {
    /**
     * The circles which make the shape, as flat [x, y, radius] triples in the
     * local frame. A plain element has exactly one, at [0, 0, radius].
     */
    Parts: Array<number>;
    /**
     * The radius which holds every part.
     *
     * Used for the broad phase, for the draw order, and for the breach test.
     */
    Radius: number;
    Layer: Layer;
    Mask: Layer;
}

/**
 * Add `CollideCircle` to an entity.
 *
 * @param parts Flat [x, y, radius] triples in the local frame.
 * @param layer The layer this collider is on.
 * @param mask The layers this collider tests against.
 */
export function collide_circle(parts: Array<number>, layer: Layer, mask: Layer) {
    // The bounding radius is the furthest any part reaches from the middle.
    let radius = 0;
    for (let i = 0; i < parts.length; i += 3) {
        radius = Math.max(radius, Math.hypot(parts[i], parts[i + 1]) + parts[i + 2]);
    }

    return (game: Game, entity: Entity) => {
        game.World.Signature[entity] |= Has.CollideCircle;
        game.World.CollideCircle[entity] = {
            Parts: parts,
            Radius: radius,
            Layer: layer,
            Mask: mask,
        };
    };
}

/**
 * Make the parts of an element.
 *
 * With no bumps this is one circle. With bumps, the main circle is made a
 * little smaller and the bumps are set evenly around it, each sticking out, so
 * that the whole shape stays about the size the tier asks for.
 *
 * @param radius The radius the tier asks for.
 * @param bumps How many bumps to add.
 * @param seed Turns the ring of bumps, so that elements are not all alike.
 */
export function element_parts(radius: number, bumps: number, seed: number) {
    if (bumps === 0) {
        return [0, 0, radius];
    }

    let core = radius * 0.82;
    let bump = radius * 0.42;
    // Set the bumps so they stick out by about the same as the core loses.
    let distance = core + bump * 0.45;

    let parts = [0, 0, core];
    for (let i = 0; i < bumps; i++) {
        let angle = seed + (i / bumps) * Math.PI * 2;
        parts.push(Math.cos(angle) * distance, Math.sin(angle) * distance, bump);
    }
    return parts;
}
