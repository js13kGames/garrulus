/**
 * # sys_ui
 *
 * Render the UI.
 *
 * The entire `App` UI component is evaluated every frame to a string. If the
 * result is different from the previous frame, the UI is re-rendered.
 *
 * Because `sys_ui` uses `innerHTML`, it's not a great choice for stateful UI
 * elements, like input forms.
 */

import {Game} from "../game.js";
import {sound_music} from "../sounds.js";
import {App} from "../ui.js";

let prev: string;

export function sys_ui(game: Game, delta: number) {
    sound_music(game);
    let next = App(game);
    if (next !== prev) {
        game.Ui.innerHTML = prev = next;
    }
}
