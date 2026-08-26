import {Game} from "./game.js";
import {scene_stage} from "./scenes/sce_stage.js";

let game = new Game();
scene_stage(game);
game.Start();

// The only global the UI needs. "Play" and "Again" both start a fresh run, so
// one function covers both buttons.
// @ts-ignore
window.play = () => {
    scene_stage(game);
    game.PlayState = "play";
    // Browsers block audio until a gesture. This click is that gesture.
    game.Audio.resume();
};

if (DEBUG) {
    // For poking at the running game from the console. esbuild is given
    // --define:DEBUG=false for the release, so terser drops this.
    // @ts-ignore
    window.game = game;
}
