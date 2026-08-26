import {Game, load_best} from "./game.js";
import {scene_stage} from "./scenes/sce_stage.js";

let game = new Game();
scene_stage(game, 0);
game.Start();

// The two globals the UI needs. `play` starts a mode; the "Again" button and
// every card on the title screen call it.
// @ts-ignore
window.play = (mode: number) => {
    scene_stage(game, mode);
    game.BestScore = load_best(mode);
    game.PlayState = "play";
    // Browsers block audio until a gesture. This click is that gesture.
    game.Audio.resume();
};

// @ts-ignore
window.title = () => {
    game.PlayState = "title";
};

if (DEBUG) {
    // For poking at the running game from the console. esbuild is given
    // --define:DEBUG=false for the release, so terser drops this.
    // @ts-ignore
    window.game = game;
}
