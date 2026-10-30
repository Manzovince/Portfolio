import { initKeyboard } from "./keyboard.js?v=20261018a";
import { initRoll } from "./roll.js?v=20261018a";
import { initWave } from "./wave.js?v=20261018a";
import { initScore } from "./score.js?v=20261018a";
import { initMidi } from "./midi.js?v=20261018a";
import { initLeds } from "./leds.js?v=20261018a";
import { unlockAudio } from "./audio.js?v=20261018a";
import { initUI } from "./ui.js?v=20261018a";
import { initPractice } from "./practice.js?v=20261018a";

initKeyboard(document.getElementById("keyboard"));
initRoll(document.getElementById("roll"), document.getElementById("usage"));
initWave(document.getElementById("wave"));
initUI();
initPractice();
initScore(document.getElementById("score"));
initMidi();
initLeds();

// Audio can only start from a user gesture: any tap, click or key press will do
["pointerdown", "keydown", "touchend"].forEach(type =>
    window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
