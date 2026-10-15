import { initKeyboard } from "./keyboard.js?v=20261015g";
import { initRoll } from "./roll.js?v=20261015g";
import { initScore } from "./score.js?v=20261015g";
import { initMidi } from "./midi.js?v=20261015g";
import { initLeds } from "./leds.js?v=20261015g";
import { unlockAudio } from "./audio.js?v=20261015g";
import { initUI } from "./ui.js?v=20261015g";
import { initPractice } from "./practice.js?v=20261015g";

initKeyboard(document.getElementById("keyboard"));
initRoll(document.getElementById("roll"), document.getElementById("usage"));
initUI();
initPractice();
initScore(document.getElementById("score"));
initMidi();
initLeds();

// Audio can only start from a user gesture: any tap, click or key press will do
["pointerdown", "keydown", "touchend"].forEach(type =>
    window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
