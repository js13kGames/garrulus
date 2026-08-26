/**
 * # sys_merge
 *
 * Join two touching elements of the same tier into one element of the next
 * tier.
 *
 * The system reads the contact list that `sys_collide_circle` made, so it costs
 * no search of its own. A merge can put two new equal neighbours in contact;
 * the next fixed step finds them. That gives chain reactions for free, with no
 * recursion.
 */

import {instantiate} from "../../lib/game.js";
import {float} from "../../lib/random.js";
import {destroy_entity} from "../../lib/world.js";
import {animate_pop} from "../components/com_animate_pop.js";
import {element_parts} from "../components/com_collide_circle.js";
import {
    Game,
    HITSTOP_BIG,
    HITSTOP_SMALL,
    HITSTOP_TIER,
    MERGE_COOLDOWN,
    SHAKE_PER_TIER,
    WIN_BANNER,
} from "../game.js";
import {SCORES, TOP_TIER} from "../scenes/blu_element.js";
import {blueprint_pop_ring} from "../scenes/blu_pop_ring.js";
import {sound_merge, sound_win} from "../sounds.js";
import {Has} from "../world.js";

export function sys_merge(game: Game, delta: number) {
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if (game.World.Signature[ent] & Has.Merge) {
            let element = game.World.Merge[ent];
            element.Cooldown -= delta;
            element.Merging = false;
        }
    }

    for (let i = 0; i < game.ContactCount; i++) {
        let contact = game.Contacts[i];
        // The lower number survives. Entity numbers come back from the
        // graveyard, so they do not give the age, but the rule must be the same
        // for both sides of the contact or both would destroy each other.
        let keep = Math.min(contact.A, contact.B);
        let gone = Math.max(contact.A, contact.B);

        let mask = Has.Merge | Has.LocalTransform2D | Has.RigidBody2D | Has.CollideCircle;
        if ((game.World.Signature[keep] & mask) !== mask) {
            continue;
        }
        if ((game.World.Signature[gone] & mask) !== mask) {
            // Already destroyed by an earlier merge in this same step.
            continue;
        }

        let merge_keep = game.World.Merge[keep];
        let merge_gone = game.World.Merge[gone];
        if (
            merge_keep.Tier !== merge_gone.Tier ||
            merge_keep.Cooldown > 0 ||
            merge_gone.Cooldown > 0 ||
            merge_keep.Merging ||
            merge_gone.Merging
        ) {
            continue;
        }

        merge_keep.Merging = merge_gone.Merging = true;
        merge(game, keep, gone);
    }
}

function merge(game: Game, keep: number, gone: number) {
    let tier = game.World.Merge[keep].Tier;
    let local_keep = game.World.LocalTransform2D[keep];
    let local_gone = game.World.LocalTransform2D[gone];
    let body_keep = game.World.RigidBody2D[keep];
    let body_gone = game.World.RigidBody2D[gone];

    // The two partners are the same tier, so they have the same mass. The
    // mass-weighted middle is simply the middle.
    let x = (local_keep.Translation[0] + local_gone.Translation[0]) / 2;
    let y = (local_keep.Translation[1] + local_gone.Translation[1]) / 2;
    let vx = (body_keep.Velocity[0] + body_gone.Velocity[0]) / 2;
    let vy = (body_keep.Velocity[1] + body_gone.Velocity[1]) / 2;

    destroy_entity(game.World, gone);
    instantiate(game, blueprint_pop_ring([x, y], game.Tuning.Radii[tier]));

    if (tier === TOP_TIER) {
        // Two Cosmic Unicorns cancel each other out. The board gets room back,
        // which is the reward, and the game goes on.
        destroy_entity(game.World, keep);
        game.Score += SCORES[tier] * 2;
        game.Won = true;
        game.WinTime = WIN_BANNER;
        game.ShakeAmount += SHAKE_PER_TIER * (tier + 2);
        game.HitStop = HITSTOP_BIG;
        sound_win(game);
        return;
    }

    let next = tier + 1;
    let radius = game.Tuning.Radii[next];

    game.World.Merge[keep].Tier = next;
    game.World.Merge[keep].Cooldown = MERGE_COOLDOWN;
    // Rebuild the shape at the new size. The bumps of the survivor are set at
    // a new angle, so two merged elements do not come out identical.
    let collide = game.World.CollideCircle[keep];
    collide.Parts = element_parts(radius, game.Tuning.Bumps, float(0, Math.PI * 2));
    collide.Radius = radius;
    for (let i = 0; i < collide.Parts.length; i += 3) {
        collide.Radius = Math.max(
            collide.Radius,
            Math.hypot(collide.Parts[i], collide.Parts[i + 1]) + collide.Parts[i + 2],
        );
    }
    body_keep.InverseMass = 1 / (radius * radius);
    body_keep.Velocity[0] = vx;
    body_keep.Velocity[1] = vy;
    local_keep.Translation[0] = x;
    local_keep.Translation[1] = y;
    game.World.Signature[keep] |= Has.Dirty;

    animate_pop()(game, keep);

    game.Score += SCORES[next];
    game.ShakeAmount += SHAKE_PER_TIER * next;
    game.HitStop = next < HITSTOP_TIER ? HITSTOP_SMALL : HITSTOP_BIG;
    sound_merge(game, next);
}
