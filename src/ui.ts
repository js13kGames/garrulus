import {html} from "../lib/html.js";
import {Game} from "./game.js";

export function App(game: Game) {
    return html`
        <div
            style="position:absolute;top:2vmin;left:2.5vmin;color:#fff;
            font:700 5vmin/1 system-ui,sans-serif;text-shadow:0 0 1.5vmin #000"
        >
            ${game.Score}
        </div>
        <div
            style="position:absolute;top:8vmin;left:2.5vmin;color:#9f97d0;
            font:600 2.6vmin/1 system-ui,sans-serif"
        >
            best ${game.BestScore}
        </div>
    `;
}
