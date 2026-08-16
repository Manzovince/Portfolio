import { el, stepper, toast, confirmDialog } from '../ui.js';
import {
  getSettings, saveSettings, exportJSON, importJSON, listSessions, replaceAll,
  requestPersistence, storageStatus, daysSinceExport, markExported, mergeSessions,
} from '../store.js';
import { sessionsFromFile } from '../dives.js';
import { escapeHtml } from '../format.js';
import { unlockAudio, cue, say } from '../audio.js';
import { installPrompt } from '../main.js';

const TOGGLES = [
  { key: 'sound', label: 'Sound cues', hint: 'Beeps on phase changes and countdowns' },
  { key: 'voice', label: 'Voice cues', hint: 'Spoken "hold", "breathe", countdowns' },
  { key: 'vibrate', label: 'Vibration', hint: 'Haptic feedback where supported' },
  { key: 'keepAwake', label: 'Keep screen awake', hint: 'Holds a wake lock while a timer runs' },
];

export function render(root) {
  let settings = getSettings();

  root.appendChild(el(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Preferences</div>
        <h1>Settings</h1>
      </div>
    </div>`));

  // --- cues ------------------------------------------------------------

  const cues = el('<div class="card stack" style="gap:6px"></div>');
  cues.appendChild(el('<div class="eyebrow" style="margin-bottom:6px">Cues</div>'));
  for (const t of TOGGLES) {
    const row = el(`
      <label class="switch">
        <span>
          <span style="display:block">${t.label}</span>
          <span class="tiny">${t.hint}</span>
        </span>
        <input type="checkbox" ${settings[t.key] ? 'checked' : ''}>
      </label>`);
    row.querySelector('input').addEventListener('change', (e) => {
      settings = saveSettings({ [t.key]: e.target.checked });
      if (e.target.checked && t.key === 'sound') { unlockAudio(); cue.phase(); }
      if (e.target.checked && t.key === 'voice') say('Voice cues on');
    });
    cues.appendChild(row);
  }
  root.appendChild(cues);

  // --- defaults --------------------------------------------------------

  const defaults = el('<div class="card stack"></div>');
  defaults.appendChild(el('<div class="eyebrow">Max hold defaults</div>'));
  defaults.appendChild(stepper({
    label: 'Relaxation before hold', value: settings.prep, min: 0, max: 900, step: 30,
    onChange: (v) => saveSettings({ prep: v }),
  }));
  defaults.appendChild(stepper({
    label: 'Recovery after hold', value: settings.recovery, min: 0, max: 900, step: 30,
    onChange: (v) => saveSettings({ recovery: v }),
  }));
  root.appendChild(defaults);

  // --- dive watch --------------------------------------------------------

  const watch = el(`
    <div class="card stack">
      <div class="eyebrow">Dive watch</div>
      <p class="tiny">
        In Garmin Connect, open a freedive activity and either <b>Export Original</b> (a
        <code>.fit</code> file) or export the dive splits as <b>CSV</b>. Each dive in the file
        becomes a logged hold with its depth. Importing the same activity twice adds nothing,
        so you can re-import freely.
      </p>
      <p class="tiny" data-el="watch-status" hidden></p>
    </div>`);
  const watchStatus = watch.querySelector('[data-el="watch-status"]');

  const watchBtn = el('<button class="btn btn-block">Import dives (.fit or .csv)</button>');
  const watchPicker = el('<input type="file" accept=".fit,.csv,.tsv,text/csv,application/octet-stream" multiple hidden>');
  watchBtn.addEventListener('click', () => watchPicker.click());

  watchPicker.addEventListener('change', async () => {
    const files = Array.from(watchPicker.files || []);
    watchPicker.value = '';
    if (!files.length) return;

    watchBtn.disabled = true;
    let added = 0;
    let duplicates = 0;
    let dives = 0;
    const problems = [];

    for (const file of files) {
      try {
        const { sessions } = await sessionsFromFile(file);
        if (!sessions.length) { problems.push(`${file.name} — no dives in it`); continue; }
        const result = mergeSessions(sessions);
        added += result.added;
        duplicates += result.skipped;
        for (const s of sessions) dives += s.diveCount;
      } catch (err) {
        problems.push(`${file.name} — ${err.message}`);
      }
    }
    watchBtn.disabled = false;

    const lines = [];
    if (added) lines.push(`Imported ${added} session${added === 1 ? '' : 's'}, ${dives} dive${dives === 1 ? '' : 's'}.`);
    if (duplicates) lines.push(`${duplicates} already in your logbook, skipped.`);
    lines.push(...problems);
    watchStatus.innerHTML = lines.map((l) => escapeHtml(l)).join('<br>');
    watchStatus.hidden = !lines.length;
    watchStatus.style.color = added ? '' : 'var(--danger)';

    toast(added ? `${dives} dive${dives === 1 ? '' : 's'} imported` : (problems.length ? 'Nothing imported' : 'Already imported'));
    if (added) render(clear(root));
  });

  watch.append(watchBtn, watchPicker);
  root.appendChild(watch);

  // --- data ------------------------------------------------------------

  const data = el(`
    <div class="card stack">
      <div class="eyebrow">Data</div>
      <p class="tiny">${listSessions().length} sessions stored in this browser only. Nothing leaves your device — export regularly if you care about the history.</p>
    </div>`);

  const exportBtn = el('<button class="btn btn-block">Export sessions (JSON)</button>');
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apnea-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    markExported();
    toast('Exported');
  });

  const importBtn = el('<button class="btn btn-block">Import sessions</button>');
  const picker = el('<input type="file" accept="application/json,.json" hidden>');
  importBtn.addEventListener('click', () => picker.click());
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    try {
      const added = importJSON(await file.text());
      toast(added ? `${added} session${added === 1 ? '' : 's'} imported` : 'Nothing new to import');
      if (added) render(clear(root));
    } catch (err) {
      toast(`Import failed: ${err.message}`);
    }
    picker.value = '';
  });

  const wipe = el('<button class="btn btn-block btn-ghost btn-danger">Delete all sessions</button>');
  wipe.addEventListener('click', async () => {
    const count = listSessions().length;
    const ok = await confirmDialog({
      title: 'Delete all sessions?',
      message: `All ${count} session${count === 1 ? '' : 's'} will be erased permanently. Export first if you want a copy.`,
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    replaceAll([]);
    toast('All sessions deleted');
    render(clear(root));
  });

  const days = daysSinceExport();
  data.appendChild(el(`<p class="tiny">${days === null ? 'Never exported.' : `Last export ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}.`}</p>`));
  data.append(exportBtn, importBtn, picker, wipe);
  root.appendChild(data);

  // --- offline & durability ---------------------------------------------

  const offline = el(`
    <div class="card stack">
      <div class="eyebrow">Offline &amp; durability</div>
      <p class="tiny" data-el="status">Checking storage…</p>
    </div>`);
  const statusLine = offline.querySelector('[data-el="status"]');

  const persistBtn = el('<button class="btn btn-block">Make storage permanent</button>');
  persistBtn.addEventListener('click', async () => {
    const ok = await requestPersistence();
    toast(ok ? 'Storage is now permanent' : 'The browser declined — install the app first');
    paintStorage();
  });
  offline.appendChild(persistBtn);

  if (installPrompt.available()) {
    const installBtn = el('<button class="btn btn-block">Install app</button>');
    installBtn.addEventListener('click', async () => {
      const outcome = await installPrompt.show();
      if (outcome === 'accepted') toast('Installed');
      paintStorage();
    });
    offline.appendChild(installBtn);
  }

  offline.appendChild(el(`
    <p class="tiny">
      Installing the app (browser menu → Install, or Share → Add to Home Screen on iOS) makes the
      browser treat your logbook as permanent and lets it run with no connection. Without that,
      Safari clears script-writable storage after about seven days of not opening the site.
    </p>`));
  root.appendChild(offline);

  async function paintStorage() {
    const st = await storageStatus();
    const mb = st.usage != null ? `${(st.usage / 1048576).toFixed(1)} MB used` : null;
    const bits = [
      st.persisted ? 'Storage is permanent — safe from eviction.' : 'Storage is best-effort — the browser may clear it.',
      navigator.serviceWorker?.controller ? 'Offline ready.' : 'Offline cache not active yet (reload once).',
      mb,
    ].filter(Boolean);
    statusLine.textContent = bits.join(' ');
    persistBtn.hidden = st.persisted || !st.supported;
  }
  paintStorage();

  root.appendChild(el(`
    <div class="card">
      <div class="eyebrow" style="margin-bottom:8px">Safety</div>
      <p class="safety">
        Breath-holding in water without a trained buddy kills experienced freedivers every year — shallow-water
        blackout gives no warning. Use this app for dry training, or wet training with direct supervision.
        Do not hyperventilate before a hold. Never train apnea alone in a pool, and wait at least
        24 hours after any blackout or samba before training again.
      </p>
    </div>`));

  root.appendChild(el('<p class="tiny" style="text-align:center;margin-top:18px">Apnea · local-first breath-hold log</p>'));
}

function clear(root) {
  root.innerHTML = '';
  return root;
}
