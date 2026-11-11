// The notes to show on the keys right now: from an exercise (with hints on) or
// the song being learnt (these also light the LUMI), or, on the Play screen,
// the next suggested chord when asked for (keys only).
import { isPracticing, practiceGuide, onPracticeChange } from './practice.js?v=202611134';
import { songGuide, onSongGuide } from './song.js?v=202611134';
import { suggestGuide } from './suggest.js?v=202611134';
import { coachGuide, onCoachGuide } from './coach.js?v=202611134';
import { currentSong } from './song.js?v=202611134';
import { S, on } from './store.js?v=202611134';

const listeners = new Set();
export const onGuideChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());
// called when the screen changes: a song only guides while its screen is shown
export const refreshGuide = changed;

export const learnGuide = () => {
  if (isPracticing()) return practiceGuide();
  if (S.mode !== 'learn') return null;
  if (S.learnTab === 'coach') return coachGuide() || (currentSong()?.lesson ? songGuide() : null);
  return S.learnTab === 'songs' ? songGuide() : null;
};
export const currentGuide = () => learnGuide() || suggestGuide();
// The LUMI only follows exercises and songs
export const guideActive = () => !!learnGuide();

onPracticeChange(changed);
onSongGuide(changed);
onCoachGuide(changed);
on('suggest', changed);
