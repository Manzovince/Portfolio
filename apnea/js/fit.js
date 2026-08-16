// Minimal FIT decoder — enough of the Garmin/ANT FIT spec to read a dive
// activity off a Descent-series watch. No dependencies, no build step.
//
// A FIT file is a 12- or 14-byte header, then a stream of records, then a
// 2-byte CRC. Every record starts with a header byte naming a "local message
// type": *definition* records bind a local type to a global message number and
// a field layout, and the *data* records that follow carry values in exactly
// that layout. Files can be chained end to end, so decoding loops until the
// buffer runs out.
//
// Only the messages this app cares about are given field names; everything else
// is skipped by size and counted, which keeps the stream aligned without
// carrying the whole 200-message FIT profile around.

const FIT_EPOCH_MS = 631065600000; // 1989-12-31T00:00:00Z

// FIT base types, keyed by the low 5 bits of the base-type byte. `invalid` is
// the all-bits-set sentinel the spec uses for "this field was not recorded".
const BASE = {
  0x00: { size: 1, invalid: 0xff, get: (v, o) => v.getUint8(o) },                    // enum
  0x01: { size: 1, invalid: 0x7f, get: (v, o) => v.getInt8(o) },                     // sint8
  0x02: { size: 1, invalid: 0xff, get: (v, o) => v.getUint8(o) },                    // uint8
  0x03: { size: 2, invalid: 0x7fff, get: (v, o, le) => v.getInt16(o, le) },          // sint16
  0x04: { size: 2, invalid: 0xffff, get: (v, o, le) => v.getUint16(o, le) },         // uint16
  0x05: { size: 4, invalid: 0x7fffffff, get: (v, o, le) => v.getInt32(o, le) },      // sint32
  0x06: { size: 4, invalid: 0xffffffff, get: (v, o, le) => v.getUint32(o, le) },     // uint32
  0x07: { size: 1, invalid: 0x00, get: (v, o) => v.getUint8(o), string: true },      // string
  0x08: { size: 4, invalid: null, get: (v, o, le) => v.getFloat32(o, le) },          // float32
  0x09: { size: 8, invalid: null, get: (v, o, le) => v.getFloat64(o, le) },          // float64
  0x0a: { size: 1, invalid: 0x00, get: (v, o) => v.getUint8(o) },                    // uint8z
  0x0b: { size: 2, invalid: 0x00, get: (v, o, le) => v.getUint16(o, le) },           // uint16z
  0x0c: { size: 4, invalid: 0x00, get: (v, o, le) => v.getUint32(o, le) },           // uint32z
  0x0d: { size: 1, invalid: 0xff, get: (v, o) => v.getUint8(o) },                    // byte
  0x0e: { size: 8, invalid: null, get: (v, o, le) => Number(v.getBigInt64(o, le)) }, // sint64
  0x0f: { size: 8, invalid: null, get: (v, o, le) => Number(v.getBigUint64(o, le)) },// uint64
  0x10: { size: 8, invalid: 0, get: (v, o, le) => Number(v.getBigUint64(o, le)) },   // uint64z
};

// Field descriptors are [name, scale, offset, kind]. Scale and offset follow the
// FIT profile (stored = (real + offset) * scale); kind 'date' turns the FIT
// timestamp into a Date.
const MESSAGES = {
  0: {
    name: 'fileId',
    fields: {
      0: ['fileType'], 1: ['manufacturer'], 2: ['product'], 3: ['serialNumber'],
      4: ['timeCreated', 1, 0, 'date'], 5: ['number'], 8: ['productName'],
    },
  },
  18: {
    name: 'session',
    fields: {
      253: ['timestamp', 1, 0, 'date'], 254: ['messageIndex'],
      2: ['startTime', 1, 0, 'date'], 5: ['sport'], 6: ['subSport'],
      7: ['totalElapsedTime', 1000], 8: ['totalTimerTime', 1000],
      9: ['totalDistance', 100], 16: ['avgHeartRate'], 17: ['maxHeartRate'],
      25: ['firstLapIndex'], 26: ['numLaps'],
    },
  },
  19: {
    name: 'lap',
    fields: {
      253: ['timestamp', 1, 0, 'date'], 254: ['messageIndex'],
      2: ['startTime', 1, 0, 'date'],
      7: ['totalElapsedTime', 1000], 8: ['totalTimerTime', 1000],
      9: ['totalDistance', 100], 15: ['avgHeartRate'], 16: ['maxHeartRate'],
    },
  },
  20: {
    name: 'record',
    fields: {
      253: ['timestamp', 1, 0, 'date'], 3: ['heartRate'], 13: ['temperature'],
      91: ['absolutePressure'], 92: ['depth', 1000], 96: ['ndlTime'],
    },
  },
  23: {
    name: 'deviceInfo',
    fields: { 253: ['timestamp', 1, 0, 'date'], 2: ['manufacturer'], 4: ['product'], 27: ['productName'] },
  },
  34: {
    name: 'activity',
    fields: { 253: ['timestamp', 1, 0, 'date'], 0: ['totalTimerTime', 1000], 1: ['numSessions'] },
  },
  259: {
    // presence of gas messages is how a scuba file gives itself away
    name: 'diveGas',
    fields: { 0: ['heliumContent'], 1: ['oxygenContent'], 2: ['status'] },
  },
  268: {
    name: 'diveSummary',
    fields: {
      253: ['timestamp', 1, 0, 'date'],
      0: ['referenceMesg'], 1: ['referenceIndex'],
      2: ['avgDepth', 1000], 3: ['maxDepth', 1000], 4: ['surfaceInterval'],
      10: ['diveNumber'], 11: ['bottomTime', 1000],
      17: ['descentTime', 1000], 18: ['ascentTime', 1000], 25: ['hangTime', 1000],
    },
  },
};

/** Global message numbers, for reporting what a file contained. */
export const MESSAGE_NAMES = Object.fromEntries(
  Object.entries(MESSAGES).map(([num, spec]) => [num, spec.name]),
);

function readString(view, pos, size) {
  let out = '';
  for (let i = 0; i < size; i++) {
    const code = view.getUint8(pos + i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out || null;
}

function readField(view, pos, field, littleEndian) {
  const base = BASE[field.base];
  if (!base) return null;
  if (base.string) return readString(view, pos, field.size);

  // a field wider than its base type is an array
  const count = Math.max(1, Math.floor(field.size / base.size));
  const values = [];
  for (let i = 0; i < count; i++) {
    const raw = base.get(view, pos + i * base.size, littleEndian);
    if (Number.isNaN(raw)) continue;                 // float invalid is NaN
    if (base.invalid != null && raw === base.invalid) continue;
    values.push(raw);
  }
  if (!values.length) return null;
  return values.length === 1 ? values[0] : values;
}

function shapeOne(value, scale, offset, kind) {
  if (typeof value !== 'number') return value;
  if (kind === 'date') {
    // below 0x10000000 a date_time is seconds since device power-on, not a date
    return value < 0x10000000 ? null : new Date(value * 1000 + FIT_EPOCH_MS);
  }
  return value / scale - offset;
}

function shape(value, [, scale = 1, offset = 0, kind] = []) {
  return Array.isArray(value)
    ? value.map((v) => shapeOne(v, scale, offset, kind))
    : shapeOne(value, scale, offset, kind);
}

/**
 * Read one data record. Returns the new position, or -1 when the stream refers
 * to a local type we never saw defined (the file is truncated or corrupt and
 * there is no way to know how many bytes to skip).
 */
function readData(view, start, def, state, timeOffset) {
  if (!def) return -1;
  const spec = MESSAGES[def.global];
  const row = spec ? {} : null;
  let pos = start;

  for (const field of def.fields) {
    if (spec) {
      const desc = spec.fields[field.num];
      const raw = desc ? readField(view, pos, field, def.littleEndian) : null;
      if (desc && raw != null) {
        row[desc[0]] = shape(raw, desc);
        if (field.num === 253 && typeof raw === 'number') state.lastTimestamp = raw;
      }
    }
    pos += field.size;
  }
  pos += def.devSize;

  if (spec) {
    // compressed-timestamp records carry a 5-bit offset instead of a full field
    if (timeOffset != null && state.lastTimestamp != null && row.timestamp == null) {
      const last = state.lastTimestamp;
      let ts = (last & ~0x1f) + timeOffset;
      if (timeOffset < (last & 0x1f)) ts += 0x20;
      state.lastTimestamp = ts;
      row.timestamp = shapeOne(ts, 1, 0, 'date');
    }
    (state.out[spec.name] ||= []).push(row);
  } else {
    state.skipped.set(def.global, (state.skipped.get(def.global) || 0) + 1);
  }
  return pos;
}

function readRecords(view, start, end, state) {
  const defs = new Map();
  let pos = start;

  while (pos < end) {
    const header = view.getUint8(pos++);

    if (header & 0x80) {                                    // compressed timestamp data
      pos = readData(view, pos, defs.get((header >> 5) & 0x03), state, header & 0x1f);
      if (pos < 0) return;
      continue;
    }

    if (header & 0x40) {                                    // definition
      const local = header & 0x0f;
      const hasDev = Boolean(header & 0x20);
      pos += 1;                                             // reserved byte
      const littleEndian = view.getUint8(pos++) === 0;
      const global = view.getUint16(pos, littleEndian);
      pos += 2;

      const count = view.getUint8(pos++);
      const fields = [];
      for (let i = 0; i < count; i++) {
        fields.push({
          num: view.getUint8(pos),
          size: view.getUint8(pos + 1),
          base: view.getUint8(pos + 2) & 0x1f,
        });
        pos += 3;
      }

      // developer fields carry their own schema; we only need their total width
      let devSize = 0;
      if (hasDev) {
        const devCount = view.getUint8(pos++);
        for (let i = 0; i < devCount; i++) {
          devSize += view.getUint8(pos + 1);
          pos += 3;
        }
      }

      defs.set(local, { global, littleEndian, fields, devSize });
      continue;
    }

    pos = readData(view, pos, defs.get(header & 0x0f), state, null);
    if (pos < 0) return;
  }
}

/**
 * Decode a .fit file.
 * Returns { messages, skipped } where messages is keyed by the names above and
 * skipped counts the global message numbers we walked past without decoding.
 */
export function decodeFit(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
  const view = new DataView(bytes);
  const state = { out: {}, skipped: new Map(), lastTimestamp: null };
  let pos = 0;
  let files = 0;

  while (pos + 12 <= view.byteLength) {
    const headerSize = view.getUint8(pos);
    const magic = headerSize >= 12 ? readString(view, pos + 8, 4) : null;
    if ((headerSize !== 12 && headerSize !== 14) || magic !== '.FIT') break;

    const dataSize = view.getUint32(pos + 4, true);
    const start = pos + headerSize;
    const end = Math.min(start + dataSize, view.byteLength);
    readRecords(view, start, end, state);
    files += 1;
    pos = end + 2;                                          // step over the file CRC
  }

  if (!files) throw new Error('That does not look like a .fit file.');
  return { messages: state.out, skipped: state.skipped };
}
