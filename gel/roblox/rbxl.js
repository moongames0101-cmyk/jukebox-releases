// A small, lossless editor for Roblox binary place files (.rbxl).
//
// Gel only needs three things: find instances, change a couple of values, and add
// new instances. Anything it doesn't touch is copied through byte for byte, so data
// Gel doesn't understand can never be lost. New instances go into their own class
// sections at the end of the file, which also makes them easy to take out again.
//
// Format reference: the community-documented rbxl binary format (chunks of INST, PROP,
// PRNT and friends, LZ4 or zstd compressed, with interleaved big-endian integers).

const { decompress: zstdDecompress } = require('./vendor/fzstd');

const MAGIC = Buffer.from('<roblox!\x89\xff\r\n\x1a\n', 'latin1');
const TYPE = {
  string: 1, bool: 2, int: 3, float: 4, vector2: 13, vector3: 14, cframe: 16, enum: 18, ref: 19,
  numbersequence: 21, colorsequence: 22, numberrange: 23, color3uint8: 26,
};

// ---------- Compression ----------

function lz4Decode(src, outLen) {
  const out = Buffer.alloc(outLen);
  let i = 0;
  let o = 0;
  while (i < src.length) {
    const token = src[i++];
    let lit = token >> 4;
    if (lit === 15) { let b; do { b = src[i++]; lit += b; } while (b === 255); }
    src.copy(out, o, i, i + lit);
    i += lit;
    o += lit;
    if (i >= src.length) break;
    const offset = src[i] | (src[i + 1] << 8);
    i += 2;
    let len = token & 15;
    if (len === 15) { let b; do { b = src[i++]; len += b; } while (b === 255); }
    len += 4;
    let m = o - offset;
    if (m < 0) throw new Error('Damaged LZ4 data.');
    while (len--) out[o++] = out[m++];
  }
  if (o !== outLen) throw new Error('Damaged LZ4 data.');
  return out;
}

function chunkData(chunk) {
  if (!chunk._data) {
    const body = chunk.raw.subarray(16);
    if (!chunk.comp) chunk._data = body;
    else if (body[0] === 0x28 && body[1] === 0xb5 && body[2] === 0x2f && body[3] === 0xfd) chunk._data = Buffer.from(zstdDecompress(body));
    else chunk._data = lz4Decode(body, chunk.unc);
  }
  return chunk._data;
}

function makeChunk(name, data, extra = {}) {
  const head = Buffer.alloc(16);
  head.write(name.padEnd(4, '\0'), 0, 'latin1');
  head.writeUInt32LE(0, 4);
  head.writeUInt32LE(data.length, 8);
  return Object.assign({ name, comp: 0, unc: data.length, raw: Buffer.concat([head, data]), _data: data }, extra);
}

// ---------- Reading and writing values ----------

class Reader {
  constructor(buf) { this.buf = buf; this.o = 0; }
  u8() { return this.buf[this.o++]; }
  u32() { const v = this.buf.readUInt32LE(this.o); this.o += 4; return v; }
  string() { const n = this.u32(); const s = this.buf.toString('utf8', this.o, this.o + n); this.o += n; return s; }
  interleaved(n) {
    const out = new Array(n);
    const b = this.buf;
    const o = this.o;
    for (let i = 0; i < n; i++) out[i] = ((b[o + i] << 24) | (b[o + n + i] << 16) | (b[o + 2 * n + i] << 8) | b[o + 3 * n + i]) >>> 0;
    this.o += 4 * n;
    return out;
  }
  refs(n) {
    let acc = 0;
    return this.interleaved(n).map((v) => (acc += (v >>> 1) ^ -(v & 1)));
  }
}

const u32le = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
const f32le = (v) => { const b = Buffer.alloc(4); b.writeFloatLE(v); return b; };
const strBuf = (s) => { const d = Buffer.from(String(s), 'utf8'); return Buffer.concat([u32le(d.length), d]); };

function interleave(values) {
  const n = values.length;
  const out = Buffer.alloc(4 * n);
  values.forEach((v, i) => {
    out[i] = (v >>> 24) & 255;
    out[n + i] = (v >>> 16) & 255;
    out[2 * n + i] = (v >>> 8) & 255;
    out[3 * n + i] = v & 255;
  });
  return out;
}
const zigzag = (v) => ((v << 1) ^ (v >> 31)) >>> 0;
const robloxFloat = (f) => { const b = Buffer.alloc(4); b.writeFloatBE(f); const bits = b.readUInt32BE(0); return ((bits << 1) | (bits >>> 31)) >>> 0; };
function encodeRefs(refs) {
  let prev = 0;
  return interleave(refs.map((r) => { const d = zigzag(r - prev); prev = r; return d; }));
}
const floats = (vals) => interleave(vals.map(robloxFloat));
const fromRobloxFloat = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(((v >>> 1) | ((v & 1) << 31)) >>> 0); return b.readFloatBE(0); };

// Axis-aligned rotations are stored as a one-byte id: (id - 1) = 6 * (x axis) + (y axis),
// where each axis is a NormalId: Right, Top, Back, Left, Bottom, Front.
const NORMALS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]];
function rotationFromId(id) {
  const x = NORMALS[Math.floor((id - 1) / 6)];
  const y = NORMALS[(id - 1) % 6];
  if (!x || !y) throw new Error(`Unknown rotation id ${id}.`);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]].map((v) => v + 0);
}
function readFloats(r, n) { return r.interleaved(n).map(fromRobloxFloat); }
function readCFrames(r, n) {
  const rots = [];
  for (let i = 0; i < n; i++) {
    const id = r.u8();
    if (id === 0) { const m = []; for (let k = 0; k < 9; k++) { m.push(r.buf.readFloatLE(r.o)); r.o += 4; } rots.push(m); }
    else rots.push(rotationFromId(id));
  }
  const xs = readFloats(r, n), ys = readFloats(r, n), zs = readFloats(r, n);
  return rots.map((rot, i) => ({ pos: [xs[i], ys[i], zs[i]], rot }));
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function encodeValues(type, values) {
  switch (type) {
    case 'string': return Buffer.concat(values.map(strBuf));
    case 'bool': return Buffer.from(values.map((v) => (v ? 1 : 0)));
    case 'int': return interleave(values.map((v) => zigzag(v | 0)));
    case 'float': return floats(values);
    case 'enum': return interleave(values.map((v) => v >>> 0));
    case 'vector2': return Buffer.concat([0, 1].map((k) => floats(values.map((v) => v[k]))));
    case 'vector3': return Buffer.concat([0, 1, 2].map((k) => floats(values.map((v) => v[k]))));
    case 'color3uint8': return Buffer.concat([0, 1, 2].map((k) => Buffer.from(values.map((v) => v[k] & 255))));
    case 'cframe': {
      const rots = values.map((v) => {
        const rot = Array.isArray(v) ? IDENTITY : v.rot;
        if (rot.every((x, i) => x === IDENTITY[i])) return Buffer.from([0x02]);
        return Buffer.concat([Buffer.from([0]), ...rot.map(f32le)]);
      });
      const pos = values.map((v) => (Array.isArray(v) ? v : v.pos));
      return Buffer.concat([...rots, ...[0, 1, 2].map((k) => floats(pos.map((p) => p[k])))]);
    }
    case 'numbersequence': return Buffer.concat(values.map((kps) => Buffer.concat([u32le(kps.length), ...kps.flatMap(([t, v, e = 0]) => [f32le(t), f32le(v), f32le(e)])])));
    case 'colorsequence': return Buffer.concat(values.map((kps) => Buffer.concat([u32le(kps.length), ...kps.flatMap(([t, c]) => [f32le(t), f32le(c[0]), f32le(c[1]), f32le(c[2]), f32le(0)])])));
    case 'numberrange': return Buffer.concat(values.map(([a, b]) => Buffer.concat([f32le(a), f32le(b)])));
    default: throw new Error(`Gel can't write ${type} values.`);
  }
}

// ---------- The document ----------

class Doc {
  constructor(buf) {
    if (buf.length < 32 || !buf.subarray(0, 14).equals(MAGIC)) throw new Error("That file isn't a Roblox binary file.");
    this.header = Buffer.from(buf.subarray(0, 32));
    this.chunks = [];
    let o = 32;
    while (o < buf.length) {
      const name = buf.toString('latin1', o, o + 4).replace(/\0+$/, '');
      const comp = buf.readUInt32LE(o + 4);
      const unc = buf.readUInt32LE(o + 8);
      const end = o + 16 + (comp || unc);
      if (end > buf.length) throw new Error('That Roblox file is cut short.');
      this.chunks.push({ name, comp, unc, raw: buf.subarray(o, end) });
      o = end;
      if (name === 'END') break;
    }
    this.tail = buf.subarray(o);
    this.index();
  }

  index() {
    this.classes = new Map();
    this.refClass = new Map();
    this.names = new Map();
    this.parents = new Map();
    this.links = [];
    for (const c of this.chunks) {
      if (c.name === 'INST') {
        const r = new Reader(chunkData(c));
        const id = r.u32();
        const className = r.string();
        const format = r.u8();
        const n = r.u32();
        const refs = r.refs(n);
        this.classes.set(id, { id, className, format, refs, chunk: c });
        refs.forEach((ref) => this.refClass.set(ref, id));
        c.classId = id;
      }
    }
    for (const c of this.chunks) {
      if (c.name === 'PROP') {
        const r = new Reader(chunkData(c));
        c.classId = r.u32();
        c.prop = r.string();
        c.type = r.u8();
        if (c.prop === 'Name' && c.type === TYPE.string) {
          const cls = this.classes.get(c.classId);
          for (const ref of cls.refs) this.names.set(ref, r.string());
        }
      } else if (c.name === 'PRNT') {
        const r = new Reader(chunkData(c));
        r.u8();
        const n = r.u32();
        const kids = r.refs(n);
        const parents = r.refs(n);
        this.links = kids.map((k, i) => [k, parents[i]]);
        this.links.forEach(([k, p]) => this.parents.set(k, p));
      }
    }
  }

  get classCount() { return this.header.readInt32LE(16); }
  get instanceCount() { return this.header.readInt32LE(20); }

  nameOf(ref) { return this.names.get(ref); }
  parentLinks() { return this.links.map((l) => l.slice()); }

  find({ className, name, parent } = {}) {
    const out = [];
    for (const cls of this.classes.values()) {
      if (className && cls.className !== className) continue;
      for (const ref of cls.refs) {
        if (name !== undefined && this.names.get(ref) !== name) continue;
        if (parent !== undefined && this.parents.get(ref) !== parent) continue;
        out.push(ref);
      }
    }
    return out;
  }

  propChunk(ref, prop) {
    const classId = this.refClass.get(ref);
    const chunk = this.chunks.find((c) => c.name === 'PROP' && c.classId === classId && c.prop === prop);
    if (!chunk) throw new Error(`No ${prop} values for that instance.`);
    return { chunk, cls: this.classes.get(classId), index: this.classes.get(classId).refs.indexOf(ref) };
  }

  replaceChunk(old, data) {
    const fresh = makeChunk('PROP', data, { classId: old.classId, prop: old.prop, type: old.type });
    this.chunks[this.chunks.indexOf(old)] = fresh;
  }

  propHead(chunk) {
    const r = new Reader(chunkData(chunk));
    r.u32(); r.string(); r.u8();
    return r;
  }

  getString(className, prop, ref) {
    const { chunk, index } = this.propChunk(ref, prop);
    if (chunk.type !== TYPE.string) throw new Error(`${prop} isn't text.`);
    const r = this.propHead(chunk);
    let v;
    for (let i = 0; i <= index; i++) v = r.string();
    return v;
  }

  setString(className, prop, ref, value) {
    const { chunk, cls, index } = this.propChunk(ref, prop);
    if (chunk.type !== TYPE.string) throw new Error(`${prop} isn't text.`);
    const r = this.propHead(chunk);
    const head = chunkData(chunk).subarray(0, r.o);
    const values = cls.refs.map(() => r.string());
    values[index] = value;
    this.replaceChunk(chunk, Buffer.concat([head, encodeValues('string', values)]));
    if (prop === 'Name') this.names.set(ref, value);
  }

  getVector3(ref, prop) {
    const { chunk, cls, index } = this.propChunk(ref, prop);
    if (chunk.type !== TYPE.vector3) throw new Error(`${prop} isn't a vector.`);
    const r = this.propHead(chunk);
    const n = cls.refs.length;
    const xs = readFloats(r, n), ys = readFloats(r, n), zs = readFloats(r, n);
    return [xs[index], ys[index], zs[index]];
  }

  getCFrame(ref, prop) {
    const { chunk, cls, index } = this.propChunk(ref, prop);
    if (chunk.type !== TYPE.cframe) throw new Error(`${prop} isn't a position.`);
    return readCFrames(this.propHead(chunk), cls.refs.length)[index];
  }

  // A model's pivot (WorldPivotData): a CFrame array then a "has a value" bool array.
  getPivot(ref) {
    const { chunk, cls, index } = this.propChunk(ref, 'WorldPivotData');
    const r = this.propHead(chunk);
    const n = cls.refs.length;
    if (r.u8() !== TYPE.cframe) throw new Error('Unexpected pivot format.');
    const frames = readCFrames(r, n);
    if (r.u8() !== TYPE.bool) throw new Error('Unexpected pivot format.');
    const has = r.buf[r.o + index];
    return has ? frames[index] : null;
  }

  getColor3uint8(className, prop, ref) {
    const { chunk, cls, index } = this.propChunk(ref, prop);
    const r = this.propHead(chunk);
    const d = chunkData(chunk);
    const n = cls.refs.length;
    return [d[r.o + index], d[r.o + n + index], d[r.o + 2 * n + index]];
  }

  setColor3uint8(className, prop, ref, rgb) {
    const { chunk, cls, index } = this.propChunk(ref, prop);
    if (chunk.type !== TYPE.color3uint8) throw new Error(`${prop} isn't a colour.`);
    const r = this.propHead(chunk);
    const data = Buffer.from(chunkData(chunk));
    const n = cls.refs.length;
    for (let k = 0; k < 3; k++) data[r.o + k * n + index] = rgb[k] & 255;
    this.replaceChunk(chunk, data);
  }

  // items: [{ key, className, parent: existingRef | key, props: { Prop: [type, value] } }]
  add(items) {
    let next = Math.max(-1, ...this.refClass.keys()) + 1;
    const refOf = new Map(items.map((it) => [it.key, next++]));
    const resolve = (p) => (typeof p === 'number' ? p : refOf.has(p) ? refOf.get(p) : (() => { throw new Error(`Unknown parent or link "${p}".`); })());

    const groups = new Map();
    for (const it of items) {
      if (!groups.has(it.className)) groups.set(it.className, []);
      groups.get(it.className).push(it);
    }

    const instChunks = [];
    const propChunks = [];
    let classId = this.classCount;
    for (const [className, list] of groups) {
      const propNames = Object.keys(list[0].props).sort();
      for (const it of list) {
        const mine = Object.keys(it.props).sort();
        if (mine.join() !== propNames.join()) throw new Error(`Every new ${className} needs the same properties.`);
      }
      const refs = list.map((it) => refOf.get(it.key));
      instChunks.push(makeChunk('INST', Buffer.concat([u32le(classId), strBuf(className), Buffer.from([0]), u32le(refs.length), encodeRefs(refs)]), { classId, added: true }));
      for (const prop of propNames) {
        const type = list[0].props[prop][0];
        const values = list.map((it) => {
          const [t, v] = it.props[prop];
          if (t !== type) throw new Error(`${className}.${prop} mixes value types.`);
          return t === 'ref' ? (v == null ? -1 : resolve(v)) : v;
        });
        const body = type === 'ref' ? encodeRefs(values) : encodeValues(type, values);
        propChunks.push(makeChunk('PROP', Buffer.concat([u32le(classId), strBuf(prop), Buffer.from([TYPE[type]]), body]), { classId, prop, type: TYPE[type], added: true }));
      }
      classId++;
    }

    const lastInst = this.chunks.map((c) => c.name).lastIndexOf('INST');
    this.chunks.splice(lastInst + 1, 0, ...instChunks);
    const prnt = this.chunks.findIndex((c) => c.name === 'PRNT');
    this.chunks.splice(prnt, 0, ...propChunks);

    const newLinks = items.map((it) => [refOf.get(it.key), resolve(it.parent)]);
    this.setLinks([...this.links, ...newLinks]);
    this.header.writeInt32LE(classId, 16);
    this.header.writeInt32LE(this.instanceCount + items.length, 20);
    this.index();
    return refOf;
  }

  setLinks(links) {
    const data = Buffer.concat([Buffer.from([0]), u32le(links.length), encodeRefs(links.map((l) => l[0])), encodeRefs(links.map((l) => l[1]))]);
    const at = this.chunks.findIndex((c) => c.name === 'PRNT');
    this.chunks[at] = makeChunk('PRNT', data);
  }

  // Take out classes whose instances all have names starting with prefix. They must be
  // the last classes in the file, which is where add() puts them.
  removeAdded(prefix) {
    const ours = [...this.classes.values()].filter((cls) => cls.refs.length && cls.refs.every((r) => String(this.names.get(r) || '').startsWith(prefix)));
    if (!ours.length) return 0;
    const ids = new Set(ours.map((c) => c.id));
    const first = Math.min(...ids);
    for (let id = first; id < this.classCount; id++) {
      if (!ids.has(id)) throw new Error('Something else changed this file after Gel did.');
    }
    const refs = new Set(ours.flatMap((c) => c.refs));
    this.chunks = this.chunks.filter((c) => !((c.name === 'INST' || c.name === 'PROP') && ids.has(c.classId)));
    this.setLinks(this.links.filter(([k]) => !refs.has(k)));
    this.header.writeInt32LE(first, 16);
    this.header.writeInt32LE(this.instanceCount - refs.size, 20);
    this.index();
    return refs.size;
  }

  write() {
    return Buffer.concat([this.header, ...this.chunks.map((c) => c.raw), this.tail]);
  }
}

module.exports = { read: (buf) => new Doc(buf), TYPE };
