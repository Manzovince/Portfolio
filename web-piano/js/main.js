import { initKeyboard } from "./keyboard.js";
import { initRoll } from "./roll.js";
import { initScore } from "./score.js";
import { initMidi } from "./midi.js";
import { initLeds } from "./leds.js";
import { unlockAudio } from "./audio.js";
import { initUI } from "./ui.js";

initKeyboard(document.getElementById("keyboard"));
initRoll(document.getElementById("roll"), document.getElementById("usage"));
initUI();
initScore(document.getElementById("score"));
initMidi();
initLeds();

// Audio can only start from a user gesture: any tap, click or key press will do
["pointerdown", "keydown", "touchend"].forEach(type =>
    window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
