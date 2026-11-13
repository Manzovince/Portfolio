// Keys lit by the lesson (and the LUMI). Kept apart from coach.js so the guide
// can be read at start-up without loading the course (loaded with Learn).
let guide = null;
const guideListeners = new Set();
export const coachGuide = () => guide;
export const onCoachGuide = fn => { guideListeners.add(fn); return () => guideListeners.delete(fn); };
export function setCoachGuide(g) { guide = g; guideListeners.forEach(fn => fn()); }
