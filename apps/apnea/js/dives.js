// Turning a watch export into `freedive` sessions.
//
// Two routes in, one shape out:
//   .fit  — decoded by fit.js, then read as dive summaries (preferred), lap
//           times, or a depth trace we segment ourselves.
//   .csv  — Garmin Connect's column names differ per export and per locale, so
//           the header row is sniffed rather than assumed. A CSV is either one
//           row per dive (a summary table) or one row per sample (a depth
//           trace), and we work out which by looking at what the columns are.
//
// Stored session:
//   { id, type:'freedive', date, dives:[{n,duration,maxDepth,avgDepth,surfaceInterval}],
//     diveCount, maxDepth, bestDive, totalDiveTime, avgHr, maxHr,
//     source:'fit'|'csv', device, importId, note }

import { decodeFit } from './fit.js';
import { parseTime } from './format.js';

/** Depth at which we call it a dive rather than surface noise. */
const DIVE_THRESHOLD_M = 1;
/** Shorter than this and it is a duck-dive, not a hold worth logging. */
const MIN_DIVE_SEC = 4;
// Plausibility bounds. A spreadsheet full of numbers will always yield *some*
// reading; these are what stop a wrong column — calories, elevation gain, a
// scuba bottom time — from being stored as a breath hold.
const MAX_DIVE_SEC = 1200;   // 20 minutes; no one holds their breath longer
const MAX_DEPTH_M = 200;     // deeper than anyone has gone on a single breath
/** A file has to be mostly plausible, not just partly, before we take it. */
const MIN_PLAUSIBLE_SHARE = 0.6;

const isPlausibleDive = (d) => d.duration > 0 && d.duration <= MAX_DIVE_SEC
  && (d.maxDepth == null || (d.maxDepth > 0 && d.maxDepth <= MAX_DEPTH_M));

const FT_TO_M = 0.3048;

// --- small parsers -----------------------------------------------------------

// Diacritics are stripped so "Profondeur" and "Tiefe" survive the same pass as
// "Oberflächenintervall".
const normHeader = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

/** "12,4 m" | "40.7 ft" | "12.4" -> metres. null when there is no number. */
export function parseDepth(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const match = raw.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Math.abs(Number(match[0]));
  return /ft|feet|'/i.test(raw) ? value * FT_TO_M : value;
}

/** "1:23" | "00:01:23.5" | "83" -> seconds. */
export function parseDuration(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const seconds = parseTime(raw.replace(',', '.').replace(/\s*(s|sec|secs|seconds)$/i, ''));
  return seconds != null && isFinite(seconds) ? seconds : null;
}

function parseDate(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (!isNaN(date)) return date;
  // "2026-08-13 09:41:02" — Safari wants the T
  const retry = new Date(raw.replace(' ', 'T'));
  return isNaN(retry) ? null : retry;
}

/**
 * RFC 4180-ish CSV reader: quoted fields, doubled quotes, CRLF or LF.
 * The delimiter is sniffed from the header line so European semicolon exports
 * work without the user having to know that is what they have.
 */
export function parseCsv(text) {
  const body = text.replace(/^﻿/, '');
  const firstLine = body.slice(0, body.search(/\r?\n/) + 1 || undefined);
  const delimiter = [';', '\t', ','].find((d) => firstLine.split(d).length > 1) || ',';

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted) {
      if (char === '"') {
        if (body[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === delimiter) { row.push(field); field = ''; continue; }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && body[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);

  return rows;
}

// --- shared shaping ----------------------------------------------------------

/**
 * Cut a depth trace into dives: contiguous runs below the surface threshold.
 * `samples` is [{ t: epoch ms, depth: m, hr }], in time order.
 */
export function segmentDives(samples) {
  const points = samples.filter((s) => s.t != null && s.depth != null).sort((a, b) => a.t - b.t);
  const dives = [];
  let current = null;
  let previousEnd = null;

  const close = () => {
    if (!current) return;
    const duration = (current.end - current.start) / 1000;
    if (duration >= MIN_DIVE_SEC) {
      dives.push({
        n: dives.length + 1,
        start: new Date(current.start).toISOString(),
        duration: Math.round(duration),
        maxDepth: current.max,
        avgDepth: current.sum / current.count,
        surfaceInterval: previousEnd == null ? null : Math.round((current.start - previousEnd) / 1000),
      });
      previousEnd = current.end;
    }
    current = null;
  };

  for (const point of points) {
    if (point.depth >= DIVE_THRESHOLD_M) {
      if (!current) current = { start: point.t, end: point.t, max: 0, sum: 0, count: 0 };
      current.end = point.t;
      current.max = Math.max(current.max, point.depth);
      current.sum += point.depth;
      current.count += 1;
    } else {
      close();
    }
  }
  close();
  return dives;
}

/**
 * Roll a list of dives into the stored session, or null if there are none.
 * Throws when the numbers are mostly out of human range — that means we read
 * the wrong columns, and a wrong answer here is worse than no answer.
 */
function buildSession({ dives, date, source, device, importId, hr = {} }) {
  const usable = dives.filter((d) => d.duration > 0);
  const good = usable.filter(isPlausibleDive);
  if (usable.length && good.length < Math.ceil(usable.length * MIN_PLAUSIBLE_SHARE)) {
    throw new Error('The times and depths in that file are not breath-hold dives — check you exported a dive activity.');
  }

  const clean = good
    .map((d, i) => ({
      n: d.n ?? i + 1,
      duration: Math.round(d.duration),
      maxDepth: d.maxDepth != null ? Number(d.maxDepth.toFixed(1)) : null,
      avgDepth: d.avgDepth != null ? Number(d.avgDepth.toFixed(1)) : null,
      // a gap of hours means the rows were never one session
      surfaceInterval: d.surfaceInterval > 0 && d.surfaceInterval <= 14400 ? Math.round(d.surfaceInterval) : null,
    }));
  if (!clean.length) return null;

  // a mis-read "dive number" column is worse than none: fall back to row order
  const numbered = clean.every((d) => d.n > 0 && d.n <= 500)
    && clean.every((d, i) => i === 0 || d.n > clean[i - 1].n);
  if (!numbered) clean.forEach((d, i) => { d.n = i + 1; });

  const depths = clean.map((d) => d.maxDepth).filter((d) => d != null);
  return {
    type: 'freedive',
    date: (date ? new Date(date) : new Date()).toISOString(),
    dives: clean,
    diveCount: clean.length,
    bestDive: Math.max(...clean.map((d) => d.duration)),
    totalDiveTime: clean.reduce((sum, d) => sum + d.duration, 0),
    maxDepth: depths.length ? Math.max(...depths) : null,
    avgHr: hr.avg ?? null,
    maxHr: hr.max ?? null,
    source,
    device: device || null,
    importId,
    note: '',
  };
}

// --- FIT ---------------------------------------------------------------------

const GARMIN_PRODUCTS = { 3258: 'Descent Mk1', 3542: 'Descent Mk2', 3600: 'Descent Mk2S', 4222: 'Descent G1', 4374: 'Descent Mk3', 4531: 'Descent G2' };

function deviceName(messages) {
  const named = (messages.deviceInfo || []).find((d) => d.productName);
  if (named) return named.productName;
  const id = messages.fileId?.[0];
  if (id?.manufacturer === 1) return GARMIN_PRODUCTS[id.product] || 'Garmin';
  return null;
}

/**
 * Read dives out of a decoded FIT file. Preference order:
 *   1. dive_summary messages — the watch's own per-dive numbers.
 *   2. laps — a dive per lap, which is how apnea sessions are lapped.
 *   3. the depth trace in record messages, segmented here.
 */
function divesFromFit(messages, windowStart, windowEnd) {
  const inWindow = (time) => {
    if (!time) return false;
    const ms = new Date(time).getTime();
    return ms >= windowStart - 1000 && ms <= windowEnd + 1000;
  };

  const laps = (messages.lap || []).filter((l) => inWindow(l.startTime || l.timestamp));
  const lapByIndex = new Map(laps.map((l) => [l.messageIndex, l]));

  // reference_mesg 19 is `lap`; a summary pointing at the session as a whole is
  // the roll-up, not an individual dive, so it is left out here.
  const summaries = (messages.diveSummary || []).filter((s) => {
    if (s.referenceMesg != null && s.referenceMesg !== 19) return false;
    const lap = lapByIndex.get(s.referenceIndex);
    return lap ? true : inWindow(s.timestamp);
  });

  if (summaries.length) {
    return summaries.map((s, i) => {
      const lap = lapByIndex.get(s.referenceIndex);
      const duration = s.bottomTime ?? lap?.totalElapsedTime ?? lap?.totalTimerTime ?? 0;
      return {
        n: s.diveNumber ?? i + 1,
        duration,
        maxDepth: s.maxDepth ?? null,
        avgDepth: s.avgDepth ?? null,
        surfaceInterval: s.surfaceInterval ?? null,
      };
    });
  }

  const records = (messages.record || []).filter((r) => inWindow(r.timestamp));
  if (records.some((r) => r.depth != null)) {
    return segmentDives(records.map((r) => ({ t: new Date(r.timestamp).getTime(), depth: r.depth })));
  }

  if (laps.length) {
    let previousEnd = null;
    return laps.map((lap, i) => {
      const start = new Date(lap.startTime || lap.timestamp).getTime();
      const duration = lap.totalElapsedTime ?? lap.totalTimerTime ?? 0;
      const dive = {
        n: i + 1,
        duration,
        maxDepth: null,
        avgDepth: null,
        surfaceInterval: previousEnd == null ? null : Math.round((start - previousEnd) / 1000),
      };
      previousEnd = start + duration * 1000;
      return dive;
    });
  }

  return [];
}

/** Decode a .fit ArrayBuffer into sessions. Returns { sessions, report }. */
export function sessionsFromFit(buffer, fileName = 'export.fit') {
  const { messages, skipped } = decodeFit(buffer);
  const device = deviceName(messages);
  const scuba = (messages.diveGas || []).some((g) => g.status);
  const sessions = [];

  const fitSessions = messages.session || [];
  const windows = fitSessions.length
    ? fitSessions.map((s) => {
      const end = new Date(s.timestamp || s.startTime).getTime();
      const start = s.startTime
        ? new Date(s.startTime).getTime()
        : end - (s.totalElapsedTime || 0) * 1000;
      return { start, end, meta: s };
    })
    : [{ start: -Infinity, end: Infinity, meta: {} }];

  for (const window of windows) {
    const dives = divesFromFit(messages, window.start, window.end);
    const built = buildSession({
      dives,
      date: isFinite(window.start) ? new Date(window.start) : messages.fileId?.[0]?.timeCreated,
      source: 'fit',
      device,
      importId: `fit:${device || 'device'}:${isFinite(window.start) ? window.start : fileName}`,
      hr: { avg: window.meta.avgHeartRate ?? null, max: window.meta.maxHeartRate ?? null },
    });
    if (built) {
      built.sport = window.meta.sport ?? null;
      built.subSport = window.meta.subSport ?? null;
      sessions.push(built);
    }
  }

  return {
    sessions,
    report: {
      device,
      scuba,
      messages: Object.fromEntries(Object.entries(messages).map(([k, v]) => [k, v.length])),
      skipped: [...skipped.entries()].map(([num, count]) => `${num}×${count}`),
    },
  };
}

// --- CSV ---------------------------------------------------------------------

// Candidate header names, most specific first, matched on the normalised header
// exact-before-substring so "Max Depth" wins over "Depth" when both are present.
// Garmin Connect exports in the account's language, so the common European
// spellings are listed alongside the English ones. `exclude` keeps a greedy
// generic word off a neighbouring column — without it "Time" swallows
// "Start Time" and "Depth" swallows "Avg Depth".
// Order matters: whichever column a key claims is off the table for the rest,
// so the two required ones resolve before the loose identifiers. Otherwise
// diveNumber's generic "dive" swallows a "Dive Time" column.
const COLUMNS = {
  duration: {
    names: ['divetime', 'bottomtime', 'holdtime', 'tauchzeit', 'dureeplongee', 'duration', 'duree', 'durata', 'duracion', 'elapsedtime', 'totaltime', 'movingtime', 'time', 'zeit', 'temps', 'tempo', 'tiempo'],
    exclude: /surface|oberfl|rest|interval|start|end|stop|cumul|date|stamp/,
  },
  maxDepth: {
    names: ['maxdepth', 'maximumdepth', 'depthmax', 'maxtiefe', 'tiefemax', 'profondeurmax', 'profundidadmaxima', 'profonditamax', 'depth', 'tiefe', 'profondeur', 'profundidad', 'profondita'],
    exclude: /avg|average|mean|moy|durchschn|media|min/,
  },
  avgDepth: {
    names: ['avgdepth', 'averagedepth', 'meandepth', 'profondeurmoyenne', 'durchschnittstiefe', 'profundidadmedia'],
  },
  surfaceInterval: {
    names: ['surfaceinterval', 'surfacetime', 'intervalledesurface', 'oberflachenintervall', 'intervalle', 'intervall', 'interval', 'restinterval', 'surface'],
  },
  timestamp: {
    names: ['timestamp', 'starttime', 'startzeit', 'datetime', 'date', 'datum', 'fecha', 'heure', 'time'],
  },
  diveNumber: {
    names: ['divenumber', 'diveno', 'lapnumber', 'dive', 'plongee', 'tauchgang', 'inmersion', 'immersione', 'laps', 'lap', 'number', 'numero'],
    exclude: /time|zeit|temps|depth|tiefe|profond|profund|duree|durata|duracion/,
  },
  heartRate: {
    names: ['avghr', 'avgheartrate', 'averageheartrate', 'heartrate', 'frequencecardiaque', 'herzfrequenz', 'frecuenciacardiaca', 'hr'],
    exclude: /max/,
  },
  maxHeartRate: {
    names: ['maxhr', 'maxheartrate', 'maximumheartrate', 'fcmax', 'maxherzfrequenz'],
  },
};

function pickColumns(header) {
  const normalised = header.map(normHeader);
  const taken = new Set();
  const found = {};

  for (const [key, { names, exclude }] of Object.entries(COLUMNS)) {
    const usable = (i) => !taken.has(i) && normalised[i] && !(exclude && exclude.test(normalised[i]));
    let index = -1;
    for (const name of names) {
      index = normalised.findIndex((h, i) => usable(i) && h === name);
      if (index === -1) index = normalised.findIndex((h, i) => usable(i) && h.includes(name));
      if (index !== -1) break;
    }
    if (index !== -1) { found[key] = index; taken.add(index); }
  }
  return found;
}

const looksLikeClock = (text) => /^\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$/.test(String(text ?? '').trim());

/**
 * Fallback for an export whose headers we do not recognise at all: work out
 * what the columns are from what they contain. A duration column is mostly
 * clock-formatted cells; a depth column is the remaining plain-numeric one with
 * the widest range.
 */
function sniffColumns(body, columns) {
  const sample = body.slice(0, 40);
  const width = Math.max(0, ...body.map((row) => row.length));
  const taken = new Set(Object.values(columns));
  const share = (index, test) => {
    const cells = sample.map((row) => String(row[index] ?? '').trim()).filter(Boolean);
    return cells.length ? cells.filter(test).length / cells.length : 0;
  };

  if (columns.duration == null) {
    let best = -1;
    let bestShare = 0.6;                                  // must be mostly clocks
    for (let i = 0; i < width; i++) {
      if (taken.has(i)) continue;
      const values = sample.map((row) => row[i]).filter(looksLikeClock).map(parseDuration);
      // an hours-long column is a moving time or a total, not a breath hold
      if (values.some((v) => v > MAX_DIVE_SEC)) continue;
      const score = share(i, looksLikeClock);
      if (score > bestShare) { best = i; bestShare = score; }
    }
    if (best !== -1) { columns.duration = best; taken.add(best); }
  }

  if (columns.maxDepth == null) {
    let best = -1;
    let bestSpread = 0;
    for (let i = 0; i < width; i++) {
      if (taken.has(i)) continue;
      if (share(i, (c) => parseDepth(c) != null && !looksLikeClock(c)) < 0.8) continue;
      const values = sample.map((row) => parseDepth(row[i])).filter((v) => v != null);
      // calories, elevation gain and step counts all read as plain numbers;
      // only a column that stays inside human depth range can be a depth
      if (Math.max(...values) > MAX_DEPTH_M) continue;
      const spread = Math.max(...values) - Math.min(...values);
      if (spread > bestSpread) { best = i; bestSpread = spread; }
    }
    if (best !== -1) columns.maxDepth = best;
  }

  return columns;
}

// Garmin's split tables end with a totals line. It has real-looking numbers in
// it, so it has to go before the rows are read as dives.
const TOTALS_LABEL = /^(total|totals|summary|gesamt|somme|total|resumen|riepilogo|all)/;

// Garmin Connect's "Export CSV" from the activity *list* gives one row per
// activity across every sport — no dive data in it at all, but plenty of
// numbers a sniffer will happily mistake for depths. Name it and say so.
const ACTIVITY_LIST = /activitytype|typedactivit|aktivitatstyp|tipodeactividad/;

function isActivityList(header) {
  return header.map(normHeader).some((h) => ACTIVITY_LIST.test(h));
}

function isTotalsRow(row, columns) {
  const labelled = columns.diveNumber != null;
  const label = normHeader(row[labelled ? columns.diveNumber : 0]);
  if (!label) return false;
  return TOTALS_LABEL.test(label) || (labelled && !/\d/.test(label));
}

/**
 * Read a Garmin Connect CSV. Handles both shapes:
 *   summary  — one row per dive, with a duration and/or a max depth column
 *   trace    — one row per sample, with a timestamp and a depth column
 */
export function sessionsFromCsv(text, fileName = 'export.csv', fallbackDate = new Date()) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('That CSV has no data rows.');

  if (rows.slice(0, 2).some(isActivityList)) {
    throw new Error('That is the Garmin Connect activity list, not a dive log. Open one freedive activity and export that instead.');
  }

  // Garmin sometimes writes a title line above the real header; the header is
  // the first row whose columns we recognise.
  let headerRow = 0;
  let columns = pickColumns(rows[0]);
  if (columns.duration == null && columns.maxDepth == null && rows.length > 2) {
    const alternative = pickColumns(rows[1]);
    if (alternative.duration != null || alternative.maxDepth != null) { headerRow = 1; columns = alternative; }
  }

  const body = rows.slice(headerRow + 1);
  if (columns.duration == null || columns.maxDepth == null) sniffColumns(body, columns);
  if (columns.duration == null && columns.maxDepth == null) {
    throw new Error('No dive time or depth column found in that CSV.');
  }

  const cell = (row, key) => (columns[key] != null ? row[columns[key]] : undefined);

  // A trace has a timestamp and a depth on every row, but no per-row duration.
  const isTrace = columns.timestamp != null && columns.maxDepth != null
    && !columns.duration && body.length > 40;

  let dives;
  let date = null;

  if (isTrace) {
    const samples = body
      .map((row) => ({ t: parseDate(cell(row, 'timestamp'))?.getTime() ?? null, depth: parseDepth(cell(row, 'maxDepth')) }))
      .filter((s) => s.t != null);
    if (!samples.length) throw new Error('Could not read timestamps from that CSV.');
    date = new Date(Math.min(...samples.map((s) => s.t)));
    dives = segmentDives(samples);
  } else {
    let previousEnd = null;
    dives = [];
    for (const row of body) {
      if (isTotalsRow(row, columns)) continue;
      const duration = parseDuration(cell(row, 'duration'));
      const maxDepth = parseDepth(cell(row, 'maxDepth'));
      if (!duration && !maxDepth) continue;              // blank or separator row
      const when = parseDate(cell(row, 'timestamp'));
      if (when && (!date || when < date)) date = when;

      const number = Number(String(cell(row, 'diveNumber') ?? '').replace(/[^0-9]/g, ''));
      let surfaceInterval = parseDuration(cell(row, 'surfaceInterval'));
      if (surfaceInterval == null && when && previousEnd) {
        surfaceInterval = Math.round((when.getTime() - previousEnd) / 1000);
      }
      if (when) previousEnd = when.getTime() + (duration || 0) * 1000;

      dives.push({
        n: isFinite(number) && number > 0 ? number : dives.length + 1,
        duration: duration || 0,
        maxDepth,
        avgDepth: parseDepth(cell(row, 'avgDepth')),
        surfaceInterval: surfaceInterval != null && surfaceInterval >= 0 ? surfaceInterval : null,
      });
    }
  }

  const hrValues = body.map((row) => Number(cell(row, 'heartRate'))).filter((n) => isFinite(n) && n > 0);
  const maxHrValues = body.map((row) => Number(cell(row, 'maxHeartRate'))).filter((n) => isFinite(n) && n > 0);

  const session = buildSession({
    dives,
    date: date || fallbackDate,
    source: 'csv',
    device: null,
    importId: `csv:${fileName}:${(date || fallbackDate).getTime()}`,
    hr: {
      avg: hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null,
      max: maxHrValues.length ? Math.max(...maxHrValues) : (hrValues.length ? Math.max(...hrValues) : null),
    },
  });

  if (!session) throw new Error('No dives found in that CSV.');
  return {
    sessions: [session],
    report: { shape: isTrace ? 'depth trace' : 'dive table', rows: body.length, columns: Object.keys(columns) },
  };
}

/** Route a picked file to the right reader. Returns { sessions, report }. */
export async function sessionsFromFile(file) {
  const name = file.name || '';
  if (/\.fit$/i.test(name)) return sessionsFromFit(await file.arrayBuffer(), name);
  if (/\.(csv|tsv|txt)$/i.test(name)) return sessionsFromCsv(await file.text(), name, new Date(file.lastModified || Date.now()));
  throw new Error('Pick a .fit or .csv file exported from your watch.');
}
