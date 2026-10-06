// THE WORDMARK FROM ONE FILE (2026-10-06, at the user's word — "Turn this
// text into an svg file that I can edit, make that the wordmark"):
// assets/wordmark.svg is the name as drawn — THE NEW CRITIC on one line,
// letters as outlines — and the one source of it. It may be re-saved by
// any editor (Illustrator, Figma, Inkscape): this reads its shapes
// (path, polygon, polyline, rect) through their transforms, finds the
// letters (shapes whose spans across overlap), the words (letters parted
// by more than WORD_BREAK of the cap), each word's cap line and baseline
// (its lowest letter top and its highest letter bottom: the flat letters
// stand on them, the round and pointed ones overshoot), and gives each word in the files'
// old contract: an svg whose box is its ink across by the flat cap 300
// to the baseline, the overshoot under the baseline stated as data-dip.
// CRI and TIC are CRITIC parted at the letter gap nearest its middle.
// No dependencies.

const fs = require('fs');

// (0.25 since the traced drawing, 2026-10-06: its word spaces are 0.38 and
// 0.43 of the cap, its letter gaps under 0.09)
const WORD_BREAK = 0.25;

// ---- transforms: [a b c d e f] maps (x, y) to (ax + cy + e, bx + dy + f)
const IDENT = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function parseTransform(s) {
  let m = IDENT;
  for (const [, fn, args] of (s || '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = (args.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
    let n;
    if (fn === 'matrix') n = a;
    else if (fn === 'translate') n = [1, 0, 0, 1, a[0], a[1] || 0];
    else if (fn === 'scale') n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (fn === 'rotate') {
      const r = (a[0] * Math.PI) / 180, c = Math.cos(r), s2 = Math.sin(r);
      n = [c, s2, -s2, c, 0, 0];
      if (a.length > 2) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (fn === 'skewX') n = [1, 0, Math.tan((a[0] * Math.PI) / 180), 1, 0, 0];
    else if (fn === 'skewY') n = [1, Math.tan((a[0] * Math.PI) / 180), 0, 1, 0, 0];
    else continue;
    m = mul(m, n);
  }
  return m;
}

// ---- path data to absolute subpaths of M/L/C/Q segments
function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  const subs = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cur = null, last = null;
  const n = () => +toks[i++];
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { if (cur) cur.closed = true; x = sx; y = sy; last = null; continue; }
    if (C === 'M') {
      x = ox + n(); y = oy + n(); sx = x; sy = y;
      cur = { start: [x, y], segs: [] }; subs.push(cur);
      cmd = rel ? 'l' : 'L'; last = null; continue;
    }
    if (!cur) { cur = { start: [x, y], segs: [] }; subs.push(cur); }
    if (C === 'L' || C === 'H' || C === 'V') {
      if (C === 'L') { x = ox + n(); y = oy + n(); }
      else if (C === 'H') x = (rel ? x : 0) + n();
      else y = (rel ? y : 0) + n();
      cur.segs.push(['L', x, y]); last = null;
    } else if (C === 'C' || C === 'S') {
      let x1, y1;
      if (C === 'C') { x1 = ox + n(); y1 = oy + n(); }
      else if (last && last[0] === 'C') { x1 = 2 * x - last[1]; y1 = 2 * y - last[2]; }
      else { x1 = x; y1 = y; }
      const x2 = ox + n(), y2 = oy + n(); x = ox + n(); y = oy + n();
      cur.segs.push(['C', x1, y1, x2, y2, x, y]); last = ['C', x2, y2];
    } else if (C === 'Q' || C === 'T') {
      let x1, y1;
      if (C === 'Q') { x1 = ox + n(); y1 = oy + n(); }
      else if (last && last[0] === 'Q') { x1 = 2 * x - last[1]; y1 = 2 * y - last[2]; }
      else { x1 = x; y1 = y; }
      x = ox + n(); y = oy + n();
      cur.segs.push(['Q', x1, y1, x, y]); last = ['Q', x1, y1];
    } else if (C === 'A') {
      throw new Error('assets/wordmark.svg: arcs (the A command) are not read — convert the letters to outlines / expand the path');
    } else throw new Error(`assets/wordmark.svg: unknown path command ${cmd}`);
  }
  return subs;
}

function transformSub(sub, m) {
  const p = (x, y) => apply(m, x, y);
  return {
    start: p(...sub.start),
    closed: sub.closed,
    segs: sub.segs.map((s) => {
      const out = [s[0]];
      for (let k = 1; k < s.length; k += 2) out.push(...p(s[k], s[k + 1]));
      return out;
    }),
  };
}

// ---- exact bounds (the curves' extremes, not their handles)
function subBounds(sub) {
  let [x0, y0] = sub.start;
  const b = [x0, y0, x0, y0];
  const add = (x, y) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); };
  for (const s of sub.segs) {
    if (s[0] === 'L') add(s[1], s[2]);
    else if (s[0] === 'Q') {
      const [, x1, y1, x, y] = s;
      add(x, y);
      for (const [p0, p1, p2] of [[x0, x1, x], [y0, y1, y]]) {
        const den = p0 - 2 * p1 + p2;
        if (Math.abs(den) < 1e-12) continue;
        const t = (p0 - p1) / den;
        if (t > 0 && t < 1) {
          const q = (u, v, w) => (1 - t) ** 2 * u + 2 * (1 - t) * t * v + t * t * w;
          add(q(x0, x1, x), q(y0, y1, y));
        }
      }
    } else {
      const [, x1, y1, x2, y2, x, y] = s;
      add(x, y);
      const cub = (t, u, v, w, z) => (1 - t) ** 3 * u + 3 * (1 - t) ** 2 * t * v + 3 * (1 - t) * t * t * w + t ** 3 * z;
      for (const [p0, p1, p2, p3] of [[x0, x1, x2, x], [y0, y1, y2, y]]) {
        const a = -p0 + 3 * p1 - 3 * p2 + p3, bb = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
        const ts = [];
        if (Math.abs(a) < 1e-12) { if (Math.abs(bb) > 1e-12) ts.push(-c / bb); }
        else {
          const disc = bb * bb - 4 * a * c;
          if (disc >= 0) ts.push((-bb + Math.sqrt(disc)) / (2 * a), (-bb - Math.sqrt(disc)) / (2 * a));
        }
        for (const t of ts) if (t > 0 && t < 1) add(cub(t, x0, x1, x2, x), cub(t, y0, y1, y2, y));
      }
    }
    [x0, y0] = [s[s.length - 2], s[s.length - 1]];
  }
  return b;
}

// ---- the file's shapes, through their groups' transforms
const attr = (s, name) => {
  const m = s.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`));
  return m ? (m[2] ?? m[3]) : null;
};
function readShapes(svgText) {
  const text = svgText.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '');
  const stack = [IDENT];
  const skip = [];
  const subs = [];
  for (const [, close, name, rest, selfClose] of text.matchAll(/<(\/?)([\w:-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const tag = name.replace(/^svg:/, '');
    const hidden = ['defs', 'clipPath', 'mask', 'symbol', 'style', 'title', 'desc', 'metadata', 'pattern', 'linearGradient', 'radialGradient', 'marker'].includes(tag);
    if (close) { stack.pop(); if (hidden) skip.pop(); continue; }
    const m = mul(stack[stack.length - 1], parseTransform(attr(rest, 'transform')));
    const off = skip.length > 0 || attr(rest, 'display') === 'none';
    if (!off) {
      let d = null;
      if (tag === 'path') d = attr(rest, 'd');
      else if (tag === 'polygon' || tag === 'polyline') {
        const pts = (attr(rest, 'points') || '').trim();
        if (pts) d = `M${pts}${tag === 'polygon' ? 'Z' : ''}`;
      } else if (tag === 'rect') {
        const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => +(attr(rest, k) || 0));
        if (w && h) d = `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      }
      if (d) for (const sub of parsePath(d)) if (sub.segs.length) subs.push(transformSub(sub, m));
    }
    if (!selfClose) { stack.push(m); if (hidden) skip.push(1); }
  }
  return subs;
}

const median = (a) => {
  const s = [...a].sort((p, q) => p - q), k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

// letters: subpaths whose spans across overlap (a counter sits in its bowl)
function letters(subs) {
  const items = subs.map((s) => ({ subs: [s], b: subBounds(s) })).sort((p, q) => p.b[0] - q.b[0]);
  const out = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (prev && it.b[0] < prev.b[2]) {
      prev.subs.push(...it.subs);
      prev.b = [Math.min(prev.b[0], it.b[0]), Math.min(prev.b[1], it.b[1]), Math.max(prev.b[2], it.b[2]), Math.max(prev.b[3], it.b[3])];
    } else out.push({ subs: [...it.subs], b: [...it.b] });
  }
  return out;
}

const r2 = (v) => {
  const s = (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};
function wordSvg(ls) {
  const top = Math.max(...ls.map((l) => l.b[1])), base = Math.min(...ls.map((l) => l.b[3]));
  const x0 = Math.min(...ls.map((l) => l.b[0])), x1 = Math.max(...ls.map((l) => l.b[2]));
  const yMax = Math.max(...ls.map((l) => l.b[3]));
  const k = 300 / (base - top);
  const m = [k, 0, 0, k, -x0 * k, -top * k];
  let d = '';
  for (const l of ls) for (const sub0 of l.subs) {
    const sub = transformSub(sub0, m);
    d += `M${r2(sub.start[0])} ${r2(sub.start[1])}`;
    for (const s of sub.segs) d += s[0] + s.slice(1).map(r2).join(' ');
    if (sub.closed) d += 'Z';
  }
  const dip = Math.max(0, (yMax - base) / (base - top));
  return `<svg xmlns="http://www.w3.org/2000/svg" data-dip="${dip.toFixed(4)}" viewBox="0 0 ${((x1 - x0) * k).toFixed(2)} 300" overflow="visible"><path fill="currentColor" d="${d}"/></svg>`;
}

let cache = null;
function wordmarkWords(file) {
  if (cache && cache.file === file) return cache.words;
  const ls = letters(readShapes(fs.readFileSync(file, 'utf8')));
  if (!ls.length) throw new Error(`${file}: no letters found (keep the letters as outlines)`);
  const cap = median(ls.map((l) => l.b[3] - l.b[1]));
  const words = [[ls[0]]];
  for (let i = 1; i < ls.length; i++) {
    if (ls[i].b[0] - ls[i - 1].b[2] > WORD_BREAK * cap) words.push([]);
    words[words.length - 1].push(ls[i]);
  }
  if (words.length !== 3) {
    throw new Error(`${file}: found ${words.length} words where THE NEW CRITIC has 3 — keep a clear space between the words and none inside them`);
  }
  const critic = words[2];
  const mid = (critic[0].b[0] + critic[critic.length - 1].b[2]) / 2;
  let cut = 1;
  for (let i = 1; i < critic.length; i++) {
    const at = (critic[i - 1].b[2] + critic[i].b[0]) / 2;
    const best = (critic[cut - 1].b[2] + critic[cut].b[0]) / 2;
    if (Math.abs(at - mid) < Math.abs(best - mid)) cut = i;
  }
  const out = {
    the: wordSvg(words[0]),
    new: wordSvg(words[1]),
    critic: wordSvg(critic),
    cri: wordSvg(critic.slice(0, cut)),
    tic: wordSvg(critic.slice(cut)),
  };
  cache = { file, words: out };
  return out;
}

module.exports = { wordmarkWords };
