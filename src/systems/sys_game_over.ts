/**
 * # sys_game_over
 *
 * End the game when the mass leans on the death ring for too long.
 *
 * The timer gives the player a chance to recover: it fills at one second each
 * second while any element is over the line, and it empties twice as fast when
 * no element is. A merge which pulls the pile back in therefore saves the run.
 *
 * Only an armed element counts. An element arms itself the first time it is
 * fully inside the ring. Elements drop from the orbit circle, which is outside
 * the ring, so an unarmed element is simply one which is still falling.
 */

import {BREACH_LIMIT, Game} from "../game.js";
import {sound_over} from "../sounds.js";
import {Has} from "../world.js";

const QUERY = Has.LocalTransform2D | Has.CollideCircle | Has.Merge;

export function sys_game_over(game: Game, delta: number) {
    game.RunTime += delta;

    if (game.WinTime > 0) {
        game.WinTime -= delta;
    }

    let breached = false;
    for (let ent = 0; ent < game.World.Signature.length; ent++) {
        if ((game.World.Signature[ent] & QUERY) !== QUERY) {
            continue;
        }

        let position = game.World.LocalTransform2D[ent].Translation;
        let reach =
            Math.sqrt(position[0] * position[0] + position[1] * position[1]) +
            game.World.CollideCircle[ent].Radius;
        let element = game.World.Merge[ent];

        if (reach <= game.Tuning.DeathRadius) {
            element.Armed = true;
        } else if (element.Armed) {
            breached = true;
        }
    }

    game.BreachTime = breached ? game.BreachTime + delta : Math.max(0, game.BreachTime - 2 * delta);

    if (game.BreachTime >= BREACH_LIMIT) {
        game.PlayState = "over";
        sound_over(game);
        if (game.Score > game.BestScore) {
            game.BestScore = game.Score;
            try {
                localStorage.garrulus = game.BestScore;
            } catch {
                // A browser which refuses to store must not end the run with an
                // error. The score is still on the screen.
            }
        }
    }
}
