// The notes to play right now, from an exercise (with hints on) or from the
// song being learnt. Drawn on the keys and, if enabled, lit on the LUMI.
import { isPracticing, practiceGuide, onPracticeChange } from './practice.js?v=202611091';
import { songGuide, onSongGuide } from './song.js?v=202611091';
import { S } from './store.js?v=202611091';

const listeners = new Set();
export const onGuideChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());
// called when the screen changes: a song only guides while its screen is shown
export const refreshGuide = changed;

export const currentGuide = () => (isPracticing() ? practiceGuide() : S.mode === 'learn' && S.learnTab === 'songs' ? songGuide() : null);
export const guideActive = () => !!currentGuide();

onPracticeChange(changed);
onSongGuide(changed);
