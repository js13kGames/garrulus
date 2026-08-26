import {html} from "../lib/html.js";
import {Game} from "./game.js";

export function App(game: Game) {
    return html`<div
        style="position:absolute;top:1vmin;left:2vmin;color:#fff;
        font:600 4vmin system-ui,sans-serif;text-shadow:0 0 1vmin #000"
    >
        garrulus
    </div>`;
}
