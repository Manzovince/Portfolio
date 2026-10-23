// Reconnaissance vocale continue (Web Speech API, fr-FR).
// Safari iOS coupe la session au moindre silence : on relance tant que l'écoute est demandée.
// Chaque résultat devient un segment ; l'app assemble les segments non annulés.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const speechSupported = !!SR;

export function createDictation({ onChange, onListening, onError }) {
  let rec = null;
  let wanted = false;
  let session = 0;
  let restarts = 0;
  const segments = []; // { key, text, final }
  const removed = new Set();

  const sessionResults = (results, sid) => {
    const out = [];
    for (let k = 0; k < results.length; k++) {
      const text = results[k][0].transcript.trim();
      if (!text) continue;
      const prev = out[out.length - 1];
      // Certains moteurs renvoient des résultats cumulatifs : on remplace au lieu d'empiler.
      if (prev && text.toLowerCase().startsWith(prev.text.toLowerCase())) {
        prev.text = text; prev.final = results[k].isFinal;
      } else out.push({ key: `${sid}:${k}`, text, final: results[k].isFinal });
    }
    return out;
  };

  const start = () => {
    if (!SR) return;
    const sid = ++session;
    rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => onListening(true);
    rec.onresult = (ev) => {
      restarts = 0;
      const fresh = sessionResults(ev.results, sid);
      for (let k = segments.length - 1; k >= 0; k--) if (segments[k].key.startsWith(sid + ':')) segments.splice(k, 1);
      segments.push(...fresh);
      onChange();
    };
    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { wanted = false; onError('micro'); }
      else if (ev.error === 'network') { wanted = false; onError('reseau'); }
      else onError(ev.error);
    };
    rec.onend = () => {
      // Les résultats encore intermédiaires d'une session close sont acquis.
      for (const s of segments) if (s.key.startsWith(sid + ':')) s.final = true;
      onChange();
      if (wanted && restarts < 20) {
        restarts++;
        setTimeout(() => { if (wanted) { try { start(); } catch { wanted = false; onListening(false); } } }, 150);
      } else {
        wanted = false;
        onListening(false);
      }
    };
    try { rec.start(); } catch { /* déjà démarrée */ }
  };

  const live = () => segments.filter((s) => !removed.has(s.key));

  return {
    listen() { if (!SR || wanted) return; wanted = true; restarts = 0; start(); },
    stop() { wanted = false; try { rec?.stop(); } catch { /* */ } },
    abort() { wanted = false; try { rec?.abort(); } catch { /* */ } },
    get listening() { return wanted; },
    addText(text) { segments.push({ key: `t:${segments.length}:${Date.now()}`, text, final: true }); onChange(); },
    undo() {
      const l = live();
      if (!l.length) return false;
      removed.add(l[l.length - 1].key);
      onChange();
      return true;
    },
    clear() { segments.length = 0; removed.clear(); onChange(); },
    // Texte complet + position où commence la partie encore intermédiaire.
    snapshot() {
      let text = '', interimAt = -1;
      for (const s of live()) {
        if (text) text += ' ';
        if (!s.final && interimAt < 0) interimAt = text.length;
        text += s.text;
      }
      return { text, interimAt: interimAt < 0 ? text.length : interimAt };
    },
  };
}
