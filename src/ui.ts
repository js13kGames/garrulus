import {html} from "../lib/html.js";
import {Game} from "./game.js";

const PANEL = `position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:2vmin;text-align:center;
    color:#fff;font:600 3vmin/1.4 system-ui,sans-serif;
    background:#080614cc;backdrop-filter:blur(0.5vmin)`;

const BUTTON = `margin-top:1vmin;padding:1.6vmin 5vmin;border-radius:9vmin;
    border:0;background:#ff9ecd;color:#20123a;cursor:pointer;
    font:700 3vmin system-ui,sans-serif`;

export function App(game: Game) {
    if (game.PlayState === "title") {
        return html`
            <div style="${PANEL}">
                <div style="font:800 11vmin/1 system-ui,sans-serif;color:#ff9ecd">garrulus</div>
                <div style="max-width:60vmin;color:#cfc8ff">
                    Move to aim around the ring. Release to drop. Two of a kind become one.
                </div>
                <button style="${BUTTON}" onclick="play()">Play</button>
            </div>
        `;
    }

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
            best ${game.BestScore}${game.Won ? " ★" : ""}
        </div>
        ${game.WinTime > 0
            ? html`<div
                  style="position:absolute;top:12vmin;left:0;right:0;text-align:center;
                  color:#fff3c4;font:800 6vmin/1 system-ui,sans-serif;
                  text-shadow:0 0 3vmin #fff3c4"
              >
                  COSMIC UNICORN
              </div>`
            : ""}
        ${game.PlayState === "over"
            ? html`<div style="${PANEL}">
                  <div style="font:800 8vmin/1 system-ui,sans-serif;color:#ff7a8a">
                      The ring broke
                  </div>
                  <div style="font:700 6vmin/1 system-ui,sans-serif">${game.Score}</div>
                  <div style="color:#9f97d0">best ${game.BestScore}</div>
                  <button style="${BUTTON}" onclick="play()">Again</button>
              </div>`
            : ""}
    `;
}
