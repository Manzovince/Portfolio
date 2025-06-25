import { initMIDI } from './midi.js';
import { setupUI, updateUI, drawPianoRoll } from './ui.js';
import { initScore } from './score.js';

initMIDI();
setupUI();
updateUI();
drawPianoRoll();
initScore();