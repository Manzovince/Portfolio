import { initKeyboard } from "./keyboard.js?v=20261014";
import { initRoll } from "./roll.js?v=20261014";
import { initScore } from "./score.js?v=20261014";
import { initMidi } from "./midi.js?v=20261014";
import { initLeds } from "./leds.js?v=20261014";
import { unlockAudio } from "./audio.js?v=20261014";
import { initUI } from "./ui.js?v=20261014";

initKeyboard(document.getElementById("keyboard"));
initRoll(document.getElementById("roll"), document.getElementById("usage"));
initUI();
initScore(document.getElementById("score"));
initMidi();
initLeds();

// Audio can only start from a user gesture: any tap, click or key press will do
["pointerdown", "keydown", "touchend"].forEach(type =>
    window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
