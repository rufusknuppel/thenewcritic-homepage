// THE STYLESHEET, CHEAP TO MATCH (2026-10-22). build.js hands the slimmed
// style.css through fastCss() on its way into dist/. The cascade is the
// same rule for rule — every selector matches the same elements at the
// same weight — only the matching gets cheaper. style.css itself is not
// touched: write it as before, weights and all.
//
// Why: the fitter forces hundreds of style recalcs a load, and most of
// them restyle the whole page (a custom property on html or main). One
// such recalc cost ~120ms at 1440 (3,277 elements, ~37µs each), most of
// the wait before the page shows. Two things made each element dear,
// both found with Chrome's selector stats:
//
// 1. THE WEIGHTS. Weight is written as :not(template) over and over (up
//    to 511 in a row, 303,000 in the sheet) and as :is(*, .r.r.r…) three
//    and four times a compound; every :not(template) is a separate test
//    each time its selector is tried. Each selector's weights are
//    gathered into two at the head of its subject — :is(*, a a … a) for
//    the types, :is(*, .r.r … .r) for the classes — and each run keeps
//    one :not(template), so <template> is still kept out. :is() weighs
//    as its heaviest argument and its * matches first, so neither chain
//    is ever walked: same match, same weight, one test.
//
// 2. SELECTORS ENDING IN A LIST, like `main .x :is(.card-title,
//    .latest-title)`. Chrome files each selector under its subject's
//    class (or id, attribute, tag) and tries it only on elements that
//    carry it — a subject that is a multi-argument :is() has no one
//    class to file under, so the selector was tried on EVERY element.
//    It is split into one selector per argument, each weighted back to
//    the list's weight (:is() weighs as its heaviest argument, whichever
//    matched): a single compound goes inline (`.card-title` + the missing
//    weight), anything else inside a single-argument :where() — which
//    Chrome files under its own subject — followed by the list's weight.
//
// WEIGHT IS COUNTED AS THE ENGINES COUNT IT. Firefox adds the parts of a
// specificity freely and caps each at 1023 at the end. Chrome (Safari's
// code is the same family) adds one simple selector at a time, subject
// compound first and left to right, caps each part at 255 — and when an
// addend overflows a part while the part above it is full, drops the
// addend whole. So 300 :not(template) after 255 classes end at 255
// types, but one :is() worth 299 types added there ends at 1 (tested in
// Chrome 155, 2026-10-22); added at the head of the subject, before the
// classes, it ends at 255 like the original. Every rewrite here is kept
// only if both counts come out equal — and the original's own Chrome
// count must not depend on the order it is added in — or the selector
// is left exactly as written. So is anything this file does not fully
// read (escapes, namespaces, :host, pseudo-elements inside a list…).
'use strict';

const GROUP = new Set(['media', 'supports', 'layer', 'container', 'scope', 'document']);
const IDENT = /[A-Za-z0-9_\- -￿]/;
const IDSTART = /[A-Za-z_\- -￿]/;
const LEGACY_PE = new Set(['before', 'after', 'first-line', 'first-letter']);
// Chrome keeps a selector's place in its rule in 13 bits; a selector
// starting past 8191 simple selectors would be dropped. Splitting adds
// selectors, so a rule is only split while it stays well inside that.
const INDEX_ROOM = 7000;

function skipString(s, i) {
  const q = s[i];
  i++;
  while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; }
  return i + 1;
}

function closeOf(s, i) { // index of the ) or ] closing the ( or [ at i
  let d = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipString(s, i) - 1; continue; }
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') { d--; if (d === 0) return i; }
  }
  return -1;
}

function splitTop(s) { // split on commas outside (), [] and strings
  const out = [];
  let d = 0, last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipString(s, i) - 1; continue; }
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') d--;
    else if (c === ',' && d === 0) { out.push(s.slice(last, i)); last = i + 1; }
  }
  out.push(s.slice(last));
  return out;
}

// [start, end) of each compound of a complex selector.
function compoundSpans(sel) {
  const spans = [];
  let d = 0, start = -1;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") { if (start < 0) start = i; i = skipString(sel, i) - 1; continue; }
    if (d === 0 && (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '>' || c === '+' || c === '~')) {
      if (start >= 0) { spans.push([start, i]); start = -1; }
      continue;
    }
    if (start < 0) start = i;
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') d--;
  }
  if (start >= 0) spans.push([start, sel.length]);
  return spans;
}

// The simple selectors of one compound, or null if it holds anything
// this file does not read.
function simples(comp) {
  const out = [];
  let i = 0;
  while (i < comp.length) {
    const c = comp[i], st = i;
    if (c === '\\' || c === '|' || c === '&') return null;
    if (c === '*') { i++; if (comp[i] === '|') return null; out.push({ kind: 'universal', start: st, end: i }); continue; }
    if (c === '#' || c === '.') {
      i++;
      while (i < comp.length && IDENT.test(comp[i])) i++;
      if (i === st + 1) return null;
      out.push({ kind: c === '#' ? 'id' : 'class', start: st, end: i });
      continue;
    }
    if (c === '[') {
      const e = closeOf(comp, i);
      if (e < 0) return null;
      i = e + 1;
      out.push({ kind: 'attr', start: st, end: i });
      continue;
    }
    if (c === ':') {
      i++;
      let pe = false;
      if (comp[i] === ':') { pe = true; i++; }
      const ns = i;
      while (i < comp.length && IDENT.test(comp[i])) i++;
      const name = comp.slice(ns, i).toLowerCase();
      if (!name) return null;
      let args = null;
      if (comp[i] === '(') {
        const e = closeOf(comp, i);
        if (e < 0) return null;
        args = comp.slice(i + 1, e);
        i = e + 1;
      }
      out.push({ kind: pe ? 'pe' : 'pc', name, args, start: st, end: i });
      continue;
    }
    if (IDSTART.test(c)) {
      while (i < comp.length && IDENT.test(comp[i])) i++;
      if (comp[i] === '|') return null;
      out.push({ kind: 'type', start: st, end: i });
      continue;
    }
    return null;
  }
  return out;
}

// ---------- weight ----------
// An addend is { c: Chrome's [ids, classes, types], o: the same when it
// does not depend on the order of adding (else null), f: Firefox's }.
const gt = (x, y) => x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];
const same = (x, y) => !!x && !!y && x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
const unit = (k) => { const v = [0, 0, 0]; v[k] = 1; return { c: v, o: v, f: v }; };

// The addends of a complex selector in the order Chrome adds them —
// subject compound first, each compound left to right — or null.
function parts(sel, relative) {
  let s = sel.trim();
  if (relative) s = s.replace(/^[>+~]\s*/, '');
  if (!s) return null;
  const out = [];
  const spans = compoundSpans(s);
  for (let j = spans.length - 1; j >= 0; j--) {
    const ss = simples(s.slice(spans[j][0], spans[j][1]));
    if (!ss || !ss.length) return null;
    // Anything written after a pseudo-element (`*::before:is(…)`) Chrome
    // weighs as nothing: not read here, so never rewritten.
    const pe = ss.findIndex((x) => x.kind === 'pe' || (x.kind === 'pc' && x.args == null && LEGACY_PE.has(x.name)));
    if (pe >= 0 && pe < ss.length - 1) return null;
    for (const x of ss) {
      if (x.kind === 'universal') continue;
      if (x.kind === 'id') out.push(unit(0));
      else if (x.kind === 'class' || x.kind === 'attr') out.push(unit(1));
      else if (x.kind === 'type') out.push(unit(2));
      else if (x.kind === 'pe') { if (x.args != null) return null; out.push(unit(2)); }
      else if (x.args == null) out.push(unit(LEGACY_PE.has(x.name) ? 2 : 1));
      else if (x.name === 'where') { if (!listWeight(x.args)) return null; }
      else if (x.name === 'is' || x.name === 'not' || x.name === 'has') {
        const m = listWeight(x.args, x.name === 'has');
        if (!m) return null;
        out.push(m);
      } else if (['nth-of-type', 'nth-last-of-type', 'lang', 'dir'].includes(x.name)) out.push(unit(1));
      else if ((x.name === 'nth-child' || x.name === 'nth-last-child') && !/\sof\s/i.test(x.args)) out.push(unit(1));
      else return null; // nth-child(… of S) and the rest: not read
    }
  }
  return out;
}

// Chrome's running sum, exactly: 8 bits a part, packed, and an overflow
// clamps the highest part that wrapped and drops the addend.
function chromeSim(ps) {
  let t = 0;
  for (const p of ps) {
    const x = p.c[0] * 65536 + p.c[1] * 256 + p.c[2];
    const temp = t + x;
    if ((temp & 0xff0000) < (t & 0xff0000)) t |= 0xff0000;
    else if ((temp & 0xff00) < (t & 0xff00)) t |= 0xff00;
    else if ((temp & 0xff) < (t & 0xff)) t |= 0xff;
    else t = temp;
  }
  return [(t >> 16) & 255, (t >> 8) & 255, t & 255];
}
// The same sum when it comes out the same in every order, else null.
function chromeOrderFree(ps) {
  const raw = [0, 0, 0];
  let multi = false;
  const big = [false, false, false]; // an addend of more than 1 in that part
  for (const p of ps) {
    if (!p.o) return null;
    const v = p.o;
    raw[0] += v[0]; raw[1] += v[1]; raw[2] += v[2];
    if ((v[0] > 0) + (v[1] > 0) + (v[2] > 0) > 1) multi = true;
    for (let k = 0; k < 3; k++) if (v[k] > 1) big[k] = true;
  }
  if (raw[0] <= 255 && raw[1] <= 255 && raw[2] <= 255) return raw; // nothing overflows
  if (multi) return null;
  // Single-part addends saturate their part — unless the part above is
  // already full and the addend is more than 1: then it is dropped.
  if (raw[1] > 255 && raw[0] >= 255 && big[1]) return null;
  if (raw[2] > 255 && raw[1] >= 255 && big[2]) return null;
  return raw.map((x) => Math.min(x, 255));
}
function firefoxSum(ps) {
  const raw = [0, 0, 0];
  for (const p of ps) { raw[0] += p.f[0]; raw[1] += p.f[1]; raw[2] += p.f[2]; }
  return raw.map((x) => Math.min(x, 1023));
}
function weigh(sel, relative) {
  const ps = parts(sel, relative);
  if (!ps) return null;
  return { c: chromeSim(ps), o: chromeOrderFree(ps), f: firefoxSum(ps) };
}
// :is() / :not() / :has() weigh as their heaviest argument.
function listWeight(list, relative) {
  let m = null;
  for (const arg of splitTop(list)) {
    if (!arg.trim()) continue;
    const w = weigh(arg, relative);
    if (!w) return null;
    if (!m) { m = { c: w.c, o: w.o, f: w.f }; continue; }
    if (gt(w.c, m.c)) m.c = w.c;
    m.o = m.o && w.o ? (gt(w.o, m.o) ? w.o : m.o) : null;
    if (gt(w.f, m.f)) m.f = w.f;
  }
  return m || { c: [0, 0, 0], o: [0, 0, 0], f: [0, 0, 0] };
}

// The rewrite keeps the weight in both engines — and the original's
// Chrome weight is the same in every order, so it does not rest on the
// order model — or it is not taken.
function sameWeight(a, b) {
  const wa = weigh(a), wb = weigh(b);
  return !!wa && !!wb && same(wa.f, wb.f) && same(wa.c, wb.c) && same(wa.o, wa.c);
}

// A selector of exactly the weight [ids, classes, types] (each < 255)
// that matches everything.
function pad(w) {
  if (!w[0] && !w[1] && !w[2]) return '';
  const head = '#q'.repeat(w[0]) + '.r'.repeat(w[1]);
  const tail = Array(w[2]).fill('a').join(' ');
  return ':is(*, ' + (head && tail ? head + ' ' + tail : head || tail) + ')';
}

// ---------- 1. the weights gathered ----------
const CLASS_PAD = /^:is\(\*,\s*((?:\.r)+)\)$/;
function gather(sel) {
  const t = sel.trim();
  if (t.indexOf(':not(template):not(template)') < 0 && t.indexOf(':is(*, .r') < 0) return sel;
  const spans = compoundSpans(t);
  if (!spans.length) return sel;
  let types = 0, classes = 0, touched = 0;
  const comps = [];
  for (const [a, b] of spans) {
    const comp = t.slice(a, b);
    const ss = simples(comp);
    if (!ss) return sel;
    let out = '', last = 0, run = 0;
    for (let i = 0; i < ss.length; i++) {
      const x = ss[i], text = comp.slice(x.start, x.end);
      const nt = x.kind === 'pc' && x.name === 'not' && x.args === 'template';
      if (nt) {
        if (run > 0) { out += comp.slice(last, x.start); last = x.end; types++; touched++; }
        run++;
        continue;
      }
      run = 0;
      const m = x.kind === 'pc' && x.name === 'is' ? CLASS_PAD.exec(text) : null;
      if (m) { out += comp.slice(last, x.start); last = x.end; classes += m[1].length / 2; touched++; }
    }
    // A compound that was nothing but weight (`.x :is(*, .r) .y`) still
    // stands for one element between its neighbours.
    comps.push(out + comp.slice(last) || '*');
  }
  if (!touched) return sel;
  // The gathered weight at the head of the subject: after its type (or *),
  // before everything else, so Chrome adds it while no part is full.
  const sub = comps.length - 1;
  const ss = simples(comps[sub]);
  if (!ss) return sel;
  const at = ss.length && (ss[0].kind === 'type' || ss[0].kind === 'universal') ? ss[0].end : 0;
  const weight = (types ? ':is(*, ' + Array(types).fill('a').join(' ') + ')' : '')
    + (classes ? ':is(*, ' + '.r'.repeat(Math.min(classes, 1023)) + ')' : '');
  comps[sub] = comps[sub].slice(0, at) + weight + comps[sub].slice(at);
  let rebuilt = '';
  let last = 0;
  spans.forEach(([a, b], j) => { rebuilt += t.slice(last, a) + comps[j]; last = b; });
  rebuilt += t.slice(last);
  return sameWeight(t, rebuilt) ? rebuilt : sel;
}

// ---------- 2. a subject that is a list ----------
// A compound Chrome can file under an id, class, attribute or tag.
function filed(ss) {
  return ss.some((x) => x.kind === 'id' || x.kind === 'class' || x.kind === 'attr' || x.kind === 'type');
}
function subjectFiled(sel) {
  const t = sel.trim();
  const spans = compoundSpans(t);
  if (!spans.length) return false;
  const [a, b] = spans[spans.length - 1];
  const ss = simples(t.slice(a, b));
  return !!ss && filed(ss);
}
const isList = (x) => x.kind === 'pc' && (x.name === 'is' || x.name === 'where') && splitTop(x.args).length > 1;
const listArgs = (x) => splitTop(x.args).map((a) => a.trim());
const splittable = (x) => isList(x) && listArgs(x).every((a) => a && !/::/.test(a) && subjectFiled(a));

// One selector per argument of the subject's list (just [sel] when the
// selector is left as it is).
function splitSubject(sel) {
  const t = sel.trim();
  const spans = compoundSpans(t);
  if (!spans.length || !weigh(t)) return [sel];
  const [ca, cb] = spans[spans.length - 1];
  const comp = t.slice(ca, cb);
  const ss = simples(comp);
  if (!ss || filed(ss)) return [sel];
  // Already filed under a single-argument :is()/:where()'s own subject.
  if (ss.some((x) => x.kind === 'pc' && (x.name === 'is' || x.name === 'where') && splitTop(x.args).length === 1 && subjectFiled(x.args))) return [sel];
  const x = ss.find(splittable);
  if (!x) return [sel];
  const args = listArgs(x);
  const ws = args.map((a) => weigh(a));
  // Small arguments only, so neither engine caps inside the list and
  // the list's weight is the same plain max in both.
  if (ws.some((w) => !w || w.f.some((v) => v > 99) || !same(w.c, w.f) || !same(w.o, w.c))) return [sel];
  const max = x.name === 'where' ? [0, 0, 0] : ws.reduce((m, w) => (gt(w.c, m) ? w.c : m), [0, 0, 0]);
  const before = comp.slice(0, x.start), after = comp.slice(x.end);
  const head = t.slice(0, ca);
  const whole = weigh(t);
  return args.map((a, i) => {
    // Inline where nothing in the whole selector overflows, so its sum
    // is the same in any order — and only a compound of classes, ids,
    // attributes and a type: :is() forgives an argument an engine cannot
    // read, a selector list drops the whole rule for it, so anything
    // with a pseudo-class stays inside the (as forgiving) :where().
    const as = compoundSpans(a).length === 1 ? simples(a) : null;
    const plain = as && as.every((y) => y.kind !== 'pc' && y.kind !== 'pe');
    if (plain && x.name === 'is' && whole && whole.f.every((v) => v < 255) && same(whole.c, whole.f)) {
      const diff = [max[0] - ws[i].c[0], max[1] - ws[i].c[1], max[2] - ws[i].c[2]];
      const typeFirst = as[0].kind === 'type' || as[0].kind === 'universal';
      if (diff.every((d) => d >= 0) && (!typeFirst || !before)) {
        const piece = head + before + a + pad(diff) + after;
        const pw = weigh(piece);
        if (pw && same(pw.c, whole.c) && same(pw.f, whole.f) && same(pw.o, pw.c) && subjectFiled(piece)) return piece;
      }
    }
    // :where(arg) adds nothing and the pad adds the list's own weight at
    // the list's own place: Chrome's running sum is step for step the
    // same as before, and Firefox's total the same.
    return head + before + ':where(' + a + ')' + pad(max) + after;
  });
}

// Top-level simple selectors of a selector — what Chrome counts for the
// index it keeps (see INDEX_ROOM).
function simpleCount(sel) {
  let n = 0;
  const t = sel.trim();
  for (const [a, b] of compoundSpans(t)) {
    const ss = simples(t.slice(a, b));
    n += ss ? ss.length : b - a; // unreadable: count generously
  }
  return n;
}

const stats = { selectors: 0, gathered: 0, padsLeft: 0, split: 0, pieces: 0, roomKept: 0 };

function fastSelectorList(prelude) {
  const lead = /^\s*/.exec(prelude)[0], trail = /\s*$/.exec(prelude)[0];
  const sels = splitTop(prelude.trim());
  stats.selectors += sels.length;
  const gathered = sels.map((s) => {
    let g = s;
    try { g = gather(s); } catch (e) { g = s; }
    if (g !== s) stats.gathered++;
    else if (s.indexOf(':not(template):not(template)') >= 0 || s.indexOf(':is(*, .r') >= 0) stats.padsLeft++;
    return g;
  });
  let split = gathered.map((s) => { try { return splitSubject(s); } catch (e) { return [s]; } });
  let idx = 0;
  for (const pieces of split) for (const p of pieces) idx += simpleCount(p);
  if (idx > INDEX_ROOM) { split = gathered.map((s) => [s]); stats.roomKept++; }
  for (const p of split) if (p.length > 1) { stats.split++; stats.pieces += p.length; }
  return lead + split.flat().join(',') + trail;
}

// Walk the sheet; every style rule's selector list through fastSelectorList.
function fastCss(css) {
  let out = '', last = 0, pre = 0;
  const stack = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") { i = skipString(css, i) - 1; continue; }
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = (e < 0 ? css.length : e + 2) - 1; continue; }
    if (c === '{') {
      const p = css.slice(pre, i), t = p.trim();
      const parent = stack[stack.length - 1];
      const kind = t[0] === '@' ? t.slice(1).split(/[\s({]/)[0].toLowerCase()
        : (parent === undefined || GROUP.has(parent)) ? 'style' : 'other';
      if (kind === 'style' && t) { out += css.slice(last, pre) + fastSelectorList(p); last = i; }
      stack.push(kind);
      pre = i + 1;
    } else if (c === '}') { stack.pop(); pre = i + 1; }
    else if (c === ';') pre = i + 1;
  }
  return out + css.slice(last);
}

module.exports = { fastCss, weigh, gather, splitSubject, stats };
