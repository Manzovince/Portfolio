import { initKeyboard } from "./keyboard.js?v=20261101b";
import { initRoll } from "./roll.js?v=20261101b";
import { initWave } from "./wave.js?v=20261101b";
import { initScore } from "./score.js?v=20261101b";
import { initMidi } from "./midi.js?v=20261101b";
import { initLeds } from "./leds.js?v=20261101b";
import { initLumi } from "./lumi.js?v=20261101b";
import { unlockAudio } from "./audio.js?v=20261101b";
import { initUI } from "./ui.js?v=20261101b";
import { initPractice } from "./practice.js?v=20261101b";

initKeyboard(document.getElementById("keyboard"));
initRoll(document.getElementById("roll"), document.getElementById("usage"));
initWave(document.getElementById("wave"));
initUI();
initPractice();
initScore(document.getElementById("score"));
initLumi();
initMidi();
initLeds();

// Audio can only start from a user gesture: any tap, click or key press will do
["pointerdown", "keydown", "touchend"].forEach(type =>
    window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
