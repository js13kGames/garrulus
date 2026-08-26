import {html} from "../lib/html.js";
import {Game, load_best} from "./game.js";
import {MODES} from "./modes.js";

const PANEL = `position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:1.5vmin;text-align:center;
    color:#fff;font:600 2.6vmin/1.4 system-ui,sans-serif;
    background:#080614cc;backdrop-filter:blur(0.5vmin)`;

const BUTTON = `padding:1.4vmin 4vmin;border-radius:9vmin;border:0;
    background:#ff9ecd;color:#20123a;cursor:pointer;
    font:700 2.6vmin system-ui,sans-serif`;

const CARD = `display:flex;flex-direction:column;gap:0.4vmin;align-items:center;
    padding:1.4vmin 2vmin;border-radius:1.4vmin;border:0.2vmin solid #2a2350;
    background:#120c2e;color:#fff;cursor:pointer;min-width:26vmin;
    font:600 2vmin/1.3 system-ui,sans-serif`;

/** Minutes and seconds, for judging a run against the 3 to 7 minute target. */
function clock(seconds: number) {
    let whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function mode_cards() {
    return MODES.map(
        (mode, index) => html`
            <button style="${CARD}" onclick="play(${index})">
                <span style="font:700 2.6vmin system-ui,sans-serif;color:#ff9ecd">
                    ${mode.Name}
                </span>
                <span style="color:#cfc8ff">${mode.Blurb}</span>
                <span style="color:#6f679c;font-size:1.7vmin">best ${load_best(index)}</span>
            </button>
        `,
    );
}

export function App(game: Game) {
    if (game.PlayState === "title") {
        return html`
            <div style="${PANEL}">
                <div style="font:800 9vmin/1 system-ui,sans-serif;color:#ff9ecd">garrulus</div>
                <div style="max-width:58vmin;color:#cfc8ff">
                    Move to aim around the ring. Release to drop. Two of a kind become one.
                </div>
                <div
                    style="display:flex;gap:1.5vmin;flex-wrap:wrap;justify-content:center;
                    margin-top:1.5vmin"
                >
                    ${mode_cards()}
                </div>
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
        <div
            style="position:absolute;top:2vmin;right:2.5vmin;text-align:right;color:#6f679c;
            font:600 2.2vmin/1.5 system-ui,sans-serif"
        >
            ${game.Tuning.Name}<br />${clock(game.RunTime)}
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
                  <div style="font:800 7vmin/1 system-ui,sans-serif;color:#ff7a8a">
                      The ring broke
                  </div>
                  <div style="font:700 6vmin/1 system-ui,sans-serif">${game.Score}</div>
                  <div style="color:#9f97d0">
                      best ${game.BestScore} &nbsp;·&nbsp; ${game.Tuning.Name} &nbsp;·&nbsp; lasted
                      ${clock(game.RunTime)}
                  </div>
                  <div style="display:flex;gap:1.5vmin;margin-top:1.5vmin">
                      <button style="${BUTTON}" onclick="play(${game.Mode})">Again</button>
                      <button style="${BUTTON};background:#2a2350;color:#cfc8ff" onclick="title()">
                          Modes
                      </button>
                  </div>
              </div>`
            : ""}
    `;
}
