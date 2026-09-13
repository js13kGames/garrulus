/**
 * # sounds
 *
 * A small synthesizer. There are no audio files.
 *
 * `BUILD.md` section 9 says to use `play_note` from `lib/audio.ts`. That
 * function drives a general instrument model with many parameters, and the data
 * to describe four sounds with it costs more than the sounds do here. See
 * DECISIONS.md, decision 11.
 */

import {Game} from "./game.js";

/** Turn a MIDI note number into a frequency. 69 is A4, at 440 Hz. */
function hz(note: number) {
    return 440 * 2 ** ((note - 69) / 12);
}

/**
 * Play one note.
 *
 * @param audio The context to play on.
 * @param note The MIDI note number.
 * @param length How long the note rings, in seconds.
 * @param gain How loud, from 0 to 1.
 * @param kind The wave shape.
 * @param delay How long to wait before the note starts, in seconds.
 */
function note(
    audio: AudioContext,
    note: number,
    length: number,
    gain: number,
    kind: OscillatorType = "triangle",
    delay = 0,
) {
    let start = audio.currentTime + delay;
    let osc = audio.createOscillator();
    let envelope = audio.createGain();

    osc.type = kind;
    osc.frequency.value = hz(note);

    // A very short attack and an exponential tail: the shape of a pop.
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);

    osc.connect(envelope);
    envelope.connect(audio.destination);
    osc.start(start);
    osc.stop(start + length);
}

/** A quiet tap when an element leaves the cloud. */
export function sound_drop(game: Game) {
    note(game.Audio, 44, 0.06, 0.09, "square");
}

/**
 * The pop of a merge. The note rises with the tier.
 *
 * From tier 5 up, a fifth and an octave come with it, which turns the pop into
 * a chord and makes the big merges sound like an event.
 */
export function sound_merge(game: Game, tier: number) {
    let root = 60 + 2 * tier;
    note(game.Audio, root, 0.15, 0.16);
    if (tier >= 5) {
        note(game.Audio, root + 7, 0.22, 0.1, "triangle", 0.02);
        note(game.Audio, root + 12, 0.3, 0.08, "sine", 0.04);
    }
}

/** Three notes down: the run is over. */
export function sound_over(game: Game) {
    note(game.Audio, 62, 0.3, 0.14, "triangle", 0);
    note(game.Audio, 57, 0.3, 0.14, "triangle", 0.14);
    note(game.Audio, 50, 0.7, 0.16, "triangle", 0.28);
}

/** An arpeggio up: two Cosmic Unicorns met. */
export function sound_win(game: Game) {
    for (let i = 0; i < 5; i++) {
        note(game.Audio, 64 + [0, 4, 7, 12, 16][i], 0.5, 0.12, "triangle", i * 0.07);
    }
}

/** Schedule a short-ahead, 120 BPM funk loop while a run is active. */
export function sound_music(game: Game) {
    if (game.PlayState !== "play") {
        game.MusicNext = 0;
        return;
    }

    let audio = game.Audio;
    if (!game.MusicNext) {
        game.MusicNext = audio.currentTime;
    }

    let bass = [40, 40, 43, 40, 47, 45, 43, 38];
    while (game.MusicNext < audio.currentTime + 0.2) {
        let step = game.MusicStep++ % 16;
        let delay = Math.max(0, game.MusicNext - audio.currentTime);

        note(audio, 82, 0.025, step % 4 === 2 ? 0.018 : 0.03, "square", delay);
        if (step % 2 === 0) {
            note(audio, bass[step / 2], 0.11, 0.035, "sawtooth", delay);
        }
        if (step === 0 || step === 7 || step === 10) {
            note(audio, 28, 0.09, 0.06, "sine", delay);
        }
        if (step === 4 || step === 12) {
            note(audio, 74, 0.045, 0.025, "square", delay);
        }

        game.MusicNext += 0.125;
    }
}
