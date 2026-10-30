// Time / date formatting helpers. Everything in the app stores seconds.

export const pad = (n) => String(Math.floor(n)).padStart(2, '0');

/** 125 -> "2:05", 3725 -> "1:02:05" */
export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Same as fmtTime but with one decimal on the seconds — used by live timers. */
export function fmtTimeMs(sec) {
  sec = Math.max(0, sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

/** 125 -> "2m 05s", 45 -> "45s" */
export function fmtShort(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${pad(s)}s` : `${s}s`;
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDayHeading(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' });
}

export function fmtTimeOfDay(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);

/** Monday-anchored start of the ISO week containing `date`. */
export function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** "3:20" | "3m20" | "200" -> 200 seconds. Returns null if unparseable. */
export function parseTime(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const parts = raw.split(/[:'\s]|m(?!s)/i).filter((p) => p !== '');
  if (!parts.length || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0];                              // bare seconds
  if (nums.length === 2) return nums[0] * 60 + nums[1];               // m:s
  return nums[0] * 3600 + nums[1] * 60 + nums[2];                     // h:m:s
}

/** "2:30, 3:05 3:40" -> [150, 185, 220], sorted, bad entries dropped. */
export function parseTimeList(text) {
  return String(text ?? '')
    .split(/[,;\n]+/)
    .map((chunk) => parseTime(chunk))
    .filter((v) => v != null && v >= 0)
    .sort((a, b) => a - b);
}

export const fmtDistance = (m) => `${Math.round(m)} m`;

/** Depth keeps one decimal — a metre matters a lot more going down than along. */
export const fmtDepth = (m) => `${(Math.round((m || 0) * 10) / 10).toFixed(1)} m`;

/** For <input type="datetime-local">, which wants local time with no zone. */
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  const d = new Date(value);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
