import {Game, load_best} from "./game.js";
import {scene_stage} from "./scenes/sce_stage.js";

let game = new Game();
scene_stage(game);
game.Start();

// The UI calls this global to start or restart a run.
// @ts-ignore
window.play = () => {
    scene_stage(game);
    game.BestScore = load_best();
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
