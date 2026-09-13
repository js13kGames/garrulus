import {html} from "../lib/html.js";
import {Game} from "./game.js";

const PANEL = `position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:1.5vmin;text-align:center;
    color:#fff;font:600 clamp(16px,2.6vmin,28px)/1.4 system-ui,sans-serif;
    background:#080614cc;backdrop-filter:blur(0.5vmin);padding:5vmin;box-sizing:border-box`;

const BUTTON = `padding:clamp(14px,1.4vmin,22px) clamp(28px,4vmin,56px);border-radius:9vmin;border:0;
    background:#ff9ecd;color:#20123a;cursor:pointer;
    font:700 clamp(18px,2.6vmin,30px) system-ui,sans-serif;min-height:48px`;

/** Minutes and seconds. */
function clock(seconds: number) {
    let whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function App(game: Game) {
    if (game.PlayState === "title") {
        return html`
            <div style="${PANEL}">
                <div style="font:800 clamp(56px,9vmin,104px)/1 system-ui,sans-serif;color:#ff9ecd">
                    garrulus
                </div>
                <div style="max-width:620px;color:#cfc8ff">
                    Move to aim around the ring. Release to drop. Two of a kind become one.
                </div>
                <button style="${BUTTON};margin-top:1.5vmin" onclick="play()">Play</button>
            </div>
        `;
    }

    return html`
        <div
            style="position:absolute;top:max(2vmin,env(safe-area-inset-top));left:max(2.5vmin,env(safe-area-inset-left));color:#fff;
            font:700 clamp(28px,5vmin,58px)/1 system-ui,sans-serif;text-shadow:0 0 1.5vmin #000"
        >
            ${game.Score}
        </div>
        <div
            style="position:absolute;top:calc(max(2vmin,env(safe-area-inset-top)) + clamp(38px,6vmin,70px));left:max(2.5vmin,env(safe-area-inset-left));color:#9f97d0;
            font:600 clamp(14px,2.6vmin,26px)/1 system-ui,sans-serif"
        >
            best ${game.BestScore}${game.Won ? " ★" : ""}
        </div>
        <div
            style="position:absolute;top:max(2vmin,env(safe-area-inset-top));right:max(2.5vmin,env(safe-area-inset-right));text-align:right;color:#9f97d0;
            font:600 clamp(14px,2.2vmin,23px)/1.5 system-ui,sans-serif"
        >
            ${clock(game.RunTime)}
        </div>
        ${game.WinTime > 0
            ? html`<div
                  style="position:absolute;top:12vmin;left:0;right:0;text-align:center;
                  color:#fff3c4;font:800 clamp(32px,6vmin,68px)/1 system-ui,sans-serif;
                  text-shadow:0 0 3vmin #fff3c4"
              >
                  COSMIC UNICORN
              </div>`
            : ""}
        ${game.PlayState === "over"
            ? html`<div style="${PANEL}">
                  <div style="font:800 clamp(42px,7vmin,80px)/1 system-ui,sans-serif;color:#ff7a8a">
                      The ring broke
                  </div>
                  <div style="font:700 clamp(36px,6vmin,68px)/1 system-ui,sans-serif">
                      ${game.Score}
                  </div>
                  <div style="color:#9f97d0">
                      best ${game.BestScore} &nbsp;·&nbsp; lasted ${clock(game.RunTime)}
                  </div>
                  <button style="${BUTTON};margin-top:1.5vmin" onclick="play()">Again</button>
              </div>`
            : ""}
    `;
}
