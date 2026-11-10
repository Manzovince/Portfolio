// The notes to show on the keys right now: from an exercise (with hints on) or
// the song being learnt (these also light the LUMI), or, on the Play screen,
// the next suggested chord when asked for (keys only).
import { isPracticing, practiceGuide, onPracticeChange } from './practice.js?v=202611101';
import { songGuide, onSongGuide } from './song.js?v=202611101';
import { suggestGuide } from './suggest.js?v=202611101';
import { S, on } from './store.js?v=202611101';

const listeners = new Set();
export const onGuideChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());
// called when the screen changes: a song only guides while its screen is shown
export const refreshGuide = changed;

export const learnGuide = () => (isPracticing() ? practiceGuide() : S.mode === 'learn' && S.learnTab === 'songs' ? songGuide() : null);
export const currentGuide = () => learnGuide() || suggestGuide();
// The LUMI only follows exercises and songs
export const guideActive = () => !!learnGuide();

onPracticeChange(changed);
onSongGuide(changed);
on('suggest', changed);
