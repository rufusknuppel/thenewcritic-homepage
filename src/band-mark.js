// THE NAME IN VECTOR (2026-10-02): the masthead's words are drawn
// (build.js, wordmarkWord), each svg's box its ink across and the flat
// cap to the baseline down; their union is the name's ink, or null where
// an element holds no drawn word.
function ncSvgInk(el) {
  if (!el || !el.querySelectorAll) return null;
  var ss = el.querySelectorAll('svg.tn-svg');
  var l = Infinity, r = -Infinity, t = Infinity, b = -Infinity, ft = -Infinity;
  for (var i = 0; i < ss.length; i++) {
    var q = ss[i].getBoundingClientRect();
    if (!q.width) continue;
    l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom);
    // (the round letters' dip under the baseline, a share of the cap)
    ft = Math.max(ft, q.bottom + q.height * (parseFloat(ss[i].getAttribute('data-dip')) || 0));
  }
  return isFinite(l) ? { left: l, right: r, top: t, bot: b, foot: ft } : null;
}
(function () {
  // THE WORDMARK'S MINIATURE IN THE BAND (2026-09-17).
  //
  // The head band pins at the top of the page and THE NEW CRITIC
  // scrolls up under its rule. Three things happen on that rule, and
  // they run in reverse on the way back down:
  //   1. From the moment the wordmark's cap ink touches the rule the
  //      date in the band's middle fades with the scroll, and is gone
  //      when a quarter of the ink is under.
  //   2. Once the date is gone, a MINIATURE of the wordmark — the
  //      same face, the same case, the same tracking, the same air
  //      over its caps and under its feet in proportion — fades in
  //      where the date stood, centred in the band, over the last
  //      three quarters of the ink's passage: a cross-fade in two
  //      parts, the date out first, the name in after, never both.
  //   3. When the last of the feet goes under, the miniature is full,
  //      and stands there as a link home.
  //
  // Everything is measured, not modelled: the wordmark's ink is the
  // block less the 72 the fitter leaves over the caps and under the
  // feet (fitMastheadFill, duo-panel-fit.js), the cap and foot
  // overshoots are scanned off a canvas at the live size, and the
  // miniature's seat inside its own box is read from a baseline probe.
  // The wordmark's size is re-read on every pass, so a fitter pass
  // that resizes it re-measures the miniature on the next scroll.
  var band = document.querySelector('main.has-mega > .page-rows > .section-band');
  var mark = document.querySelector('.site-nav--top .topbar-name');
  var wm = mark && mark.closest('.topbar-wordmark');
  if (!band || !mark || !wm) return;
  var AIR = 72, SIDE = 36;

  var mini = document.createElement('a');
  mini.className = 'band-mini';
  mini.href = './';
  mini.setAttribute('aria-hidden', 'true');
  mini.tabIndex = -1;
  // THE STAMP STANDS IN FOR THE NAME (2026-09-25, at the user's word):
  // the miniature is the bird's stamp (build.js, renderStampDefs), not
  // the name in small — the band's height less 16 over and under, its
  // width from the stamp's own proportion, centred on the band. (The
  // name's miniature size is still worked out, for the sections' heads
  // — THE HEADS AT THE NAME'S SIZE — from the 72 band it was made for.)
  var sym = document.getElementById('nc-stamp');
  var vbox = (sym && sym.getAttribute('viewBox')) || '0 0 1 1', vb = vbox.split(/\s+/);
  var ASPECT = (parseFloat(vb[2]) || 1) / (parseFloat(vb[3]) || 1);
  var STAMP_AIR = 16, MINI_BAND = 72;
  mini.className = 'band-mini band-mini--stamp';
  mini.innerHTML = '<svg class="nc-stamp" viewBox="' + vbox + '" aria-hidden="true" focusable="false"><use href="#nc-stamp"/></svg>';
  // NEITHER FIRST NOR LAST among the band's children: the sheet seats
  // the name slot by :first-child and the links slot by :last-child
  // (its grid column), and appended at the end the miniature took the
  // links' place — the slot fell into the middle column, 48 short of
  // its edge. Positioned absolutely, it takes no cell wherever it is.
  band.insertBefore(mini, band.children[1] || null);

  // The painted ink's reach above and below the baseline, per pixel of
  // size: the string drawn on a canvas at a scan size, its first and
  // last inked rows read.
  var scanned = null;
  function scan(cs) {
    // (the drawn name: its cap is its boxes' height, its foot the baseline)
    var sv = ncSvgInk(mark), S0 = parseFloat(cs.fontSize) || 0;
    if (sv) return S0 ? { above: (sv.bot - sv.top) / S0, below: 0 } : null;
    var scanPx = 200, W = 3000, H = 320, y0 = 240;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    if (!g) return null;
    var text = (mark.textContent || '').trim().replace(/\s+/g, ' ');
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    g.font = cs.fontWeight + ' ' + scanPx + 'px ' + cs.fontFamily;
    g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(text, 20, y0);
    var data;
    try { data = g.getImageData(0, 0, W, H).data; } catch (e) { return null; }
    var top = -1, bot = -1;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 40) { if (top < 0) top = y; bot = y; break; }
      }
    }
    if (top < 0) return null;
    return { above: (y0 - top) / scanPx, below: (bot + 1 - y0) / scanPx };
  }

  // The miniature's size and seat, from the wordmark's live size and
  // the band's height. Cached on the size that produced them.
  var geo = null;
  // (quiet: called by the fitter inside its pass — THE NAME'S SIZE IS
  // STATED IN THE PASS, duo-panel-fit.js — so the root is written
  // before the heads are seated and no second pass is asked for)
  function measure(quiet) {
    var cs = getComputedStyle(mark);
    var S = parseFloat(cs.fontSize) || 0;
    var B = band.getBoundingClientRect().height;
    if (!S || !B) return null;
    if (geo && geo.S === S && geo.B === B) return geo;
    if (!scanned) scanned = scan(cs);
    if (!scanned) return null;
    var C = S * scanned.above;          // the wordmark's cap height
    var r = AIR / C;                    // its air, as a ratio of its caps
    var c = MINI_BAND / (2 * r + 1);    // the miniature's caps, same ratio in the 72 band
    var s = c / scanned.above;          // and the size that prints them
    // (the sections' heads stand at this size from 1024 up — THE HEADS
    // AT THE NAME'S SIZE, duo-panel-fit.js and style.css — so it is
    // stated on the root, and a change asks the fitter for a pass)
    var was = parseFloat(document.documentElement.style.getPropertyValue('--wm-size')) || 0;
    if (Math.abs(was - s) > 0.01) {
      document.documentElement.style.setProperty('--wm-size', s.toFixed(3) + 'px');
      if (!quiet && window.__ncRequestFit) window.__ncRequestFit();
    }
    mini.style.transform = 'none';
    // The stamp's box: the band less its air, as wide as its proportion.
    var h = Math.max(0, B - 2 * STAMP_AIR), w = h * ASPECT;
    mini.style.height = h.toFixed(2) + 'px';
    mini.style.width = w.toFixed(2) + 'px';
    var br = band.getBoundingClientRect();
    var dx = (br.width - w) / 2;
    // ON A PHONE IT TAKES THE NAME'S SEAT (2026-09-24): where the band's
    // name is not shown (style.css, ONE COLUMN ON A PHONE) the miniature
    // stands at the band's left, the page's 36 in, across from the list
    // of links, which has the middle's room.
    var nameSlot = band.querySelector(':scope > .band-name');
    if (nameSlot && !nameSlot.getClientRects().length) dx = SIDE;
    // THE LIGHT / DARK TOGGLE stands beside the miniature (2026-09-24):
    // the band is told where the stamp's right edge is, seated.
    band.style.setProperty('--mini-r', (dx + w).toFixed(2) + 'px');
    geo = { S: S, B: B, h: h, dx: dx };
    return geo;
  }

  // THE STAMP AND THE NAME LIGHT TOGETHER (2026-09-25, at the user's
  // word): one link home in two marks — the hand on either turns both
  // blue (style.css, THE STAMP). The foot's the same, the reprint's
  // name and the stamp over it.
  function pair(a, b) {
    if (!a || !b) return;
    var on = function () { a.classList.add('is-cued'); b.classList.add('is-cued'); };
    var off = function () { a.classList.remove('is-cued'); b.classList.remove('is-cued'); };
    [a, b].forEach(function (el) {
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      el.addEventListener('focus', on);
      el.addEventListener('blur', off);
    });
  }
  pair(wm, mini);
  pair(document.querySelector('.page-rows > .reprint > .reprint-name'), document.querySelector('.page-rows > .reprint > .reprint-stamp-link'));

  // THE GLIDE IS THE COMPOSITOR'S (2026-09-25): placed from a script on
  // every scroll frame the stamp fell a step behind the band — which is
  // sticky, and moves without the main thread — on every frame the
  // page's style passes made late, and read as a stutter. Where the
  // browser has scroll-driven animations the travel is stated once, as
  // two animations on the root's scroll (style.css, THE STAMP): a
  // linear one holding the stamp to the window until the band pins,
  // and an eased one carrying it up and down in size to the meeting
  // point. The script then only states the numbers, and re-states them
  // when the geometry changes. Elsewhere it keeps placing the stamp
  // itself, per frame.
  var SDA = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  var lastGlide = '';
  var lastP = -1, lastT = -1;
  function run() {
    var g = measure();
    if (!g) return;
    var wb = wm.getBoundingClientRect();
    var br = band.getBoundingClientRect();
    // THE STAMP COMES DOWN INTO THE BAND (2026-09-25, at the user's
    // word). The page opens on the name with the band under it and the
    // stamp big in the middle of the air between; as the band rises
    // over the name (style.css, THE BAND OPENS UNDER THE NAME) the stamp
    // shrinks and travels with it, and lands in the band's middle at
    // its band size the moment the band pins at the window's head —
    // the name wholly under it. t is the band's rise: 0 at rest, 1
    // pinned. (The band's stamp is the only stamp: over the name and
    // the rows, a level with the band, the whole way down.)
    var tick = document.querySelector('.page-rows > .sub-ticker--head');
    var restTop = window.innerHeight - br.height - (tick ? tick.getBoundingClientRect().height : 36);
    var edge = br.top;
    var air = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-air')) || AIR;
    var capTop = wb.top + air;
    var feet = scanned ? capTop + g.S * (scanned.above + scanned.below) : wb.bottom - AIR;
    // IT MEETS THE BAND AT ITS TRUE SIZE WHEN THE BAND'S TOP REACHES THE
    // INK'S FOOT (2026-09-25, at the user's word): the travel runs from
    // the band's rest to the band's top edge on the name's feet, and the
    // stamp is the band's from there — carried up over the name with it.
    var meet = Math.max(0, Math.min(restTop - 1, feet));
    var t = restTop > meet ? Math.max(0, Math.min(1, (restTop - br.top) / (restTop - meet))) : 1;
    // (p, how much of the name is under the band, kept for the link:
    // the stamp is a link home once the name is gone)
    var span = feet - capTop;
    var seen = Math.max(0, Math.min(feet, edge) - Math.max(capTop, 0));
    var p = span > 0 ? 1 - seen / span : 1;
    if (p < 0) p = 0; if (p > 1) p = 1;
    if (p === lastP && t === lastT) return;
    lastP = p; lastT = t;
    // At rest: centred in the air between the name's foot and the band's
    // top, 216 tall or half that air, whichever is less. Landed: the
    // band's stamp, g.h tall, at its seat (g.dx in, 16 down). Between,
    // IN TWO MOVES (2026-09-25, at the user's word): it holds its size
    // and its place until the line on the rising band where its foot
    // will land — (B + h) / 2 under the band's top — reaches its foot;
    // from there its foot rides on that line and it shrinks, eased, to
    // the band's size, done as the band's top meets the ink's foot.
    var wmH = wb.height;
    var big = Math.max(g.h, Math.min(216, (restTop - wmH) / 2));
    var y0 = (wmH + restTop) / 2;
    var k0 = big / g.h;
    var landBottom = (g.B + g.h) / 2;
    var D = restTop - meet;
    var sA = Math.max(0, Math.min(D - 1, restTop - (y0 + big / 2 - landBottom)));
    var dx0 = (br.width - g.h * ASPECT) / 2;
    var s = restTop - br.top;
    var k, cy;
    if (s <= sA) { k = k0; cy = y0; }
    else {
      var u = Math.max(0, Math.min(1, (s - sA) / (D - sA)));
      var e = u * u * (3 - 2 * u);
      k = k0 + (1 - k0) * e;
      cy = (br.top + landBottom) - k * g.h / 2;
    }
    var dx = dx0 + (g.dx - dx0) * (k0 > 1 ? (k0 - k) / (k0 - 1) : 1);
    // (landed, it is the band's: it goes on up with the band, and off
    // the page's end with it)
    var dy = t >= 1 ? (g.B - g.h) / 2 : (cy - br.top) - g.h / 2;
    if (SDA) {
      // The two moves as two animations on the root's scroll (style.css,
      // THE GLIDE IS THE COMPOSITOR'S): a linear translate over the
      // first, the stamp held to the window while the band comes up
      // under it — its offset in the band from t0 to t0 + sA; then the
      // eased transform over the second, from its place and size to its
      // seat, the foot glued to the landing line since the translate
      // and the scale go by the one clock.
      var t0 = y0 - restTop - g.h / 2;
      var glide = [sA, D, t0, t0 + sA, dx0, g.dx, (g.B - g.h) / 2 - (t0 + sA), k0].map(function (v) { return v.toFixed(3); }).join(' ');
      if (glide !== lastGlide) {
        lastGlide = glide;
        var v = glide.split(' ');
        mini.style.setProperty('--st-a', v[0] + 'px');
        mini.style.setProperty('--st-d', v[1] + 'px');
        mini.style.setProperty('--st-t0', v[2] + 'px');
        mini.style.setProperty('--st-t1', v[3] + 'px');
        mini.style.setProperty('--st-x0', v[4] + 'px');
        mini.style.setProperty('--st-x1', v[5] + 'px');
        mini.style.setProperty('--st-e1', v[6] + 'px');
        mini.style.setProperty('--st-k0', v[7]);
        mini.style.transform = '';
        mini.classList.add('is-gliding');
      }
    } else {
      mini.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + k.toFixed(4) + ')';
    }
    mini.style.opacity = '1';
    mini.classList.add('is-shown');
    mini.classList.toggle('is-home', t >= 1 && p >= 1);
  }

  // THE CANVAS PAST EITHER END IS THAT END'S NAME'S GROUND (2026-09-23):
  // pulled past the head the page shows the masthead's ground, past the
  // foot the reprint's (the mark's colour under a marked last movement),
  // and both the mark's while a hand on a big name turns the page —
  // whichever end the reader is nearer. Stated on the root, where the
  // browser reads the overscroll's colour.
  var rep = document.querySelector('.page-rows > .reprint');
  var root = document.documentElement;
  var lastCanvas = '';
  function canvas() {
    var de = root, nearFoot = window.scrollY > (de.scrollHeight - de.clientHeight) / 2;
    var src = nearFoot && rep ? rep : wm;
    var c = getComputedStyle(src).backgroundColor;
    if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent' || c === lastCanvas) return;
    lastCanvas = c;
    root.style.setProperty('background-color', c, 'important');
  }
  if (window.MutationObserver) new MutationObserver(function () { lastCanvas = ''; canvas(); }).observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    var go = function () { pending = false; run(); canvas(); };
    if (window.requestAnimationFrame) requestAnimationFrame(go); else setTimeout(go, 16);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', function () { geo = null; lastP = -1; schedule(); });
  addEventListener('newcritic:fit', function () { lastP = -1; schedule(); });
  addEventListener('load', function () { lastP = -1; schedule(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scanned = null; geo = null; lastP = -1; schedule(); }, function () {});
  window.__ncBandMark = function () { geo = null; lastP = -1; run(); };
  window.__ncWmSize = function () { geo = null; measure(true); };
  run();
  canvas();
})();

// THE BAND GOES UNDER THE NAME, ITS LINE FADING (2026-09-30, at the
// user's word): THE LAST MAGAZINE's band no longer pins — it scrolls up
// with the page and passes under THE NEW CRITIC (style.css, THE BAND
// GOES UNDER THE NAME) — and its line fades as it rises, from whole at
// the page's top to nothing by the time its ink reaches the name's ink.
// And the first row's courier, which reaches up into the band's foot
// (the pictures stand under the line's ink by the air over it), stands
// over the band: from 1024 up the band's paint is cut a pixel over the
// courier's ink (never into the line's) — the band and the page are one
// charcoal, so the cut does not show, and the two travel together.
(function () {
  var main = document.querySelector('main.has-mega');
  if (!main || document.body.classList.contains('word-page')) return;
  var wide = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : { matches: true };
  var band = null, line = null, X = 0, lineTop = 0, wmFoot = 0, last = -1;
  // (THE NAME'S AIR UNDER IT ON THE SCROLL, 2026-09-30, at the user's
  // word: once the line has faded, the name's charcoal reaches on under
  // its ink, pixel for pixel with the scroll, until the air under the ink
  // is the air over it — a shadow of the name's own block, cast straight
  // down, so nothing moves)
  var wm = null, under = 0, ground = '', lastE = -1;
  var cv = null;
  function face(el) {
    var sv = ncSvgInk(el);
    if (sv) return { top: sv.top, foot: sv.foot, base: sv.bot, capFlat: sv.top };
    var rg = document.createRange(); rg.selectNodeContents(el);
    var r = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0];
    if (!r) return null;
    cv = cv || document.createElement('canvas').getContext('2d');
    var cs = getComputedStyle(el);
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var t = (el.textContent || '').trim();
    var m = cv.measureText(cs.textTransform === 'uppercase' ? t.toUpperCase() : t);
    var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return null;
    var base = r.top + (r.height - (fa + fd)) / 2 + fa;
    var mH = cv.measureText('H');
    return { top: base - m.actualBoundingBoxAscent, foot: base + m.actualBoundingBoxDescent, base: base,
      capFlat: base - mH.actualBoundingBoxAscent };
  }
  // (a variable on main is written only when it changes, 2026-10-01: it
  // restyles the whole page at the next read, and this ran on every
  // fit event — THE FIT IS ONE PASS, duo-panel-fit.js)
  function varSet(el, k, v) { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); }
  function measure() {
    band = document.querySelector('.page-rows > .section-band--head');
    line = band && band.querySelector('.band-deks:last-child');
    X = 0; lineTop = 0; wmFoot = 0;
    if (!band || !line) return;
    var y = window.pageYOffset || 0;
    // (the line's ink, where it rests at the page's top, and the name's
    // foot, which holds the window's head)
    var lt = Infinity, lf = -Infinity;
    [].forEach.call(line.querySelectorAll('a, span'), function (w) {
      if (w.children.length || !(w.textContent || '').trim()) return;
      var f = face(w); if (f) { lt = Math.min(lt, f.top); lf = Math.max(lf, f.foot); }
    });
    var nm = document.querySelector('.site-nav--top .topbar-name');
    var nf = nm && face(nm);
    if (isFinite(lt) && nf) { lineTop = lt + y; wmFoot = nf.foot; }
    wm = nm && nm.closest('.topbar-wordmark');
    under = 0;
    if (wm && nf) {
      var wr = wm.getBoundingClientRect();
      // (the air over the ink, less what the block already keeps under it)
      // (FLAT CAP TO BASELINE, 2026-10-01: the air over the H's top, the
      // strip that air under the baseline — the round letters' overshoot
      // dips into both, as it is drawn to)
      var airUnder = nf.capFlat - wr.top;
      // (THE NAME IN THE WINDOW'S MIDDLE, design/stacked-wordmark, at the
      // user's word — "move the wordmark logo on initial load so top
      // padding matches the bottom padding with nav bar": where the page
      // opens on the name the strip stands in the air under it, so that
      // air is the air over it less the strip, never under 36 —
      // fitMastheadFill sets the air over)
      // (then as far from the strip's words as from the top; now the rest
      // of the window, as fitMastheadFill leaves it: window.__ncOpenUnder —
      // "The ink of the words should be the same distance from the top as
      // the ink in the nav bar is from the bottom")
      if (main.classList.contains('wm-opening') && wide.matches && window.__ncOpenUnder != null) {
        airUnder = window.__ncOpenUnder;
      }
      under = Math.max(0, airUnder - (wr.bottom - nf.base));
      ground = getComputedStyle(wm).backgroundColor;
    }
    // (the strip pins that same air under the name's ink: style.css, THE
    // STRIP UNDER THE NAME)
    // (on a whole pixel: a strip on a fraction of one showed a hairline
    // over it)
    if (under > 0) { under = Math.round(under); varSet(main, '--wm-under', under + 'px'); }
    // (THE LAST MAGAZINE ON ITS LINE UNDER THE NAME, 2026-09-30: its
    // capitals' top where its line box opens, and its ink's height on a
    // whole pixel — style.css, THE LAST MAGAZINE UNDER THE NAME AGAIN)
    var tl = document.querySelector('.head-rail .tlm-line > span');
    var tf = tl && tl.offsetHeight ? face(tl) : null;
    if (tf) {
      var tr = tl.getBoundingClientRect();
      varSet(main, '--tlm-cap', (tf.top - tr.top).toFixed(2) + 'px');
      // (CENTRED ON ITS BASELINE, 2026-10-01, at the user's word: the
      // line's ink is read from its highest letter to its baseline, the
      // g's tail left out, so the words — not the tail — stand centred
      // where the strip lands, and the strip 36 under the baseline)
      varSet(main, '--tlm-ink', Math.ceil(tf.base - tf.top) + 'px');
    }
    if (!wide.matches || !isFinite(lf)) return;
    var hi = Infinity;
    [].forEach.call(document.querySelectorAll('.card--row-a[data-row="0"] .cover-kicker, .card--row-b[data-row="0"] .cover-kicker'), function (k) {
      var m = k.closest('.cover-meta') || k;
      if (getComputedStyle(m).visibility === 'hidden' || getComputedStyle(k).visibility === 'hidden') return;
      var f = face(k); if (f) hi = Math.min(hi, f.top);
    });
    if (!isFinite(hi)) return;
    var foot = band.getBoundingClientRect().bottom;
    X = Math.max(0, Math.min(foot - (hi - 1), foot - (lf + 1)));
  }
  function apply(force) {
    if (!band || !line) return;
    var y = window.pageYOffset || 0;
    // (the band unseen from 1024 up, its line in the margin: nothing to
    // fade, and the name's air under it begins with the first scroll)
    var gone = getComputedStyle(band).visibility === 'hidden';
    var span = gone ? 0 : lineTop - wmFoot;
    var o = gone ? 1 : span > 0 ? Math.max(0, Math.min(1, (lineTop - y - wmFoot) / span)) : 1;
    if (force || o !== last) { last = o; if (o < 1) line.style.setProperty('opacity', o.toFixed(3)); else line.style.removeProperty('opacity'); }
    if (wm) {
      // (from 1024 up, the band unseen and the strip pinned under the
      // name's air, that air is the name's ground from the first paint —
      // the unseen band let pictures still finding their seats show
      // through it as the page loaded: 2026-09-30)
      var e = under > 0 ? (gone && wide.matches ? under : Math.max(0, Math.min(under, y - Math.max(0, span)))) : 0;
      if (force || e !== lastE) {
        lastE = e;
        // (a pixel more once it is whole, tucked under the strip, so no
        // seam opens between the two)
        // (its depth alone is written here; its colour is the sheet's, by
        // the theme, so it turns with the page on the very frame —
        // written from the script it lagged a turn of the theme by the
        // refit's delay: 2026-09-30)
        if (e > 0) wm.style.setProperty('--wm-shadow-y', (e >= under ? under + 1 : e).toFixed(2) + 'px');
        else wm.style.removeProperty('--wm-shadow-y');
      }
    }
    if (force) { if (X > 0) band.style.setProperty('clip-path', 'inset(0 0 ' + X.toFixed(2) + 'px 0)'); else band.style.removeProperty('clip-path'); }
  }
  function refit() {
    // (read with the scroll's shrink and the bird's flight cleared, put back
    // after: THE BIRD ONTO THE BAND)
    var held = window.__ncPullClear ? window.__ncPullClear() : false;
    line && line.style.removeProperty('opacity'); wm && wm.style.removeProperty('--wm-shadow-y'); measure(); apply(true);
    if (held && window.__ncPullApply) window.__ncPullApply();
  }
  refit();
  // (the fitter asks for the rail again once the name is final, before
  // it seats the first row off the rail: duo-panel-fit.js, railMeasure)
  window.__ncRailMeasure = refit;
  addEventListener('scroll', function () { apply(false); }, { passive: true });
  addEventListener('resize', refit);
  addEventListener('newcritic:fit', refit);
  addEventListener('newcritic:settled', refit);
  // (a turn of the theme turns the name's ground: its shadow follows)
  if (window.MutationObserver) new MutationObserver(function () { setTimeout(refit, 400); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();

// THE LAST MAGAZINE TAKES YOU TO THE TOP (2026-09-30, at the user's
// word): the margin's line — and, from later that day, the strip's —
// scrolls the front page to its very top — the
// page's own #top stands under the name, so the link is answered here,
// eased unless the reader asks for less motion.
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest && e.target.closest('a.margin-line, a.tlm-line, a.sub-ticker-half--tlm, a.wm-stack');
  // (the bird seated on the band goes to About: THE BIRD ONTO THE BAND)
  if (!a || a.classList.contains('is-on-band')) return;
  e.preventDefault();
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
});

// THE LAST MAGAZINE BESIDE THE NAME (2026-10-01, at the user's word): a
// stack of three lines at the right of THE NEW CRITIC, in the dek's
// Garamond italic, ranged left, centred top to bottom on the name's ink
// (--stack-shift, read off both faces; style.css, THE LAST MAGAZINE
// BESIDE THE NAME). The fitter keeps the stack's room clear of the name.
(function () {
  var main = document.querySelector('main.has-mega');
  var stack = document.querySelector('.page-rows > .head-rail .wm-stack');
  var nm = document.querySelector('.site-nav--top .topbar-name');
  if (!main || !stack || !nm) return;
  var cv = null;
  var inkOf = function (el, whole) {
    var sv = ncSvgInk(el);
    if (sv) return { top: sv.top, base: sv.bot };
    var rg = document.createRange(); rg.selectNodeContents(el);
    var r = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0];
    if (!r) return null;
    cv = cv || document.createElement('canvas').getContext('2d');
    var cs = getComputedStyle(el);
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var t = (el.textContent || '').trim();
    var m = cv.measureText(cs.textTransform === 'uppercase' ? t.toUpperCase() : t);
    var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return null;
    var base = r.top + (r.height - (fa + fd)) / 2 + fa;
    // (the name's top its flat cap, the H's, as its air is read)
    var asc = el === nm && !whole ? cv.measureText('H').actualBoundingBoxAscent : m.actualBoundingBoxAscent;
    return { top: base - asc, base: base };
  };
  // (CENTRED ON THE NAME, 2026-10-01, at the user's word: the stack's
  // ink — The's top to Magazine's baseline, the g's tail left out —
  // centred on the name's, its caps' top to its baseline)
  var seat = function () {
    // (read with the scroll's shrink and the bird's flight cleared: THE
    // BIRD ONTO THE BAND)
    var held = window.__ncPullClear ? window.__ncPullClear() : false;
    try { seat0(); } finally { if (held && window.__ncPullApply) window.__ncPullApply(); }
  };
  var seat0 = function () {
    if (!stack.offsetWidth) return;
    var host = stack.closest('.head-rail') || main;
    // (THE STAMP IN THE NAME, 2026-10-01: the stack is the bird's block,
    // the height of the name's ink — fitMastheadFill sizes it — its top
    // on the ink's top, the T's and h's, so it stands with the letters'
    // ink from top to foot: "stamp ink should align with wordmark ink")
    var stamp = stack.querySelector('.wm-bird');
    var a0 = stamp && inkOf(nm, true);
    if (a0) {
      var cur0 = parseFloat(host.style.getPropertyValue('--stack-shift')) || 0;
      // (18 over the cap, as the stamp stands 18 proud of the letters
      // top and foot: fitMastheadFill sizes it, 2026-10-02)
      var STAMP_PROUD = 18;
      var want0 = cur0 + (a0.top - STAMP_PROUD - stamp.getBoundingClientRect().top);
      if (Math.abs(want0 - cur0) > 0.25) host.style.setProperty('--stack-shift', want0.toFixed(2) + 'px');
      return;
    }
    var first = stack.firstElementChild, last = stack.lastElementChild;
    var a = inkOf(nm), b = first && inkOf(first), c = last && inkOf(last);
    if (!a || !b || !c) return;
    // (written on the rail, not on main: a custom property set on main
    // has every element on the page restyled before the next read — 56ms
    // after each fit — and the stack alone reads it: 2026-10-01)
    var cur = parseFloat(host.style.getPropertyValue('--stack-shift')) || 0;
    var want = cur + ((a.top + a.base) / 2 - (b.top + c.base) / 2);
    if (Math.abs(want - cur) > 0.25) host.style.setProperty('--stack-shift', want.toFixed(2) + 'px');
  };
  ['load', 'resize', 'scroll', 'newcritic:fit', 'newcritic:fitdone', 'newcritic:settled'].forEach(function (ev) {
    addEventListener(ev, function () { setTimeout(seat, 0); }, { passive: true });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(seat);
  seat();
})();

// THE STAMP AND THE NAME LIGHT TOGETHER (2026-10-02, at the user's word —
// "have stamp and wordmark hover together"): a hand on either the
// masthead's name or the stamp between NEW and CRITIC turns both the
// mark's colour (.is-pair-lit; style.css, THE STAMP AND THE NAME LIGHT
// TOGETHER). The two are separate links — the stamp rides the head rail —
// so the pair is kept here, not by the sheet's :hover.
(function () {
  var wm = document.querySelector('.site-nav--top .topbar-wordmark');
  var st = document.querySelector('.page-rows > .head-rail .wm-stack');
  if (!wm || !st) return;
  // (not once the bird is on the band: it is The Last Magazine's then —
  // THE BIRD ONTO THE BAND)
  var on = function () { if (st.classList.contains('is-on-band')) return; wm.classList.add('is-pair-lit'); st.classList.add('is-pair-lit'); };
  var off = function () { wm.classList.remove('is-pair-lit'); st.classList.remove('is-pair-lit'); };
  [wm, st].forEach(function (el) {
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);
  });
})();

// (the strip's sides for how far it has come up, 0 at rest to 1 pinned:
// read by the name's columns too, which drift out with them — THE BIRD
// ONTO THE BAND)
// (in from 144 to 180 since the name settles in the band beside them:
// "I want the nav bar items to push in slightly" — they eased out to 72
// before)
// (…to 36 clear of the name settled beside them once the strip settles at
// 144 and the name with it: window.__ncSideEnd, THE NAME SETTLES IN THE
// BAND WITH THE BIRD)
// (…and held at 144 since the words settle evenly between the name and
// the bird, placed by THE NAME SETTLES IN THE BAND WITH THE BIRD: "center
// nav bar items between bird and wordmark inks")
// (72 since 2026-10-04, at the user's word — "Move the band margins to
// 72px on open and settle")
window.__ncStripSide = function () { return 72; };

// THE STRIP'S ITEMS EASE OUT AS IT RISES (design/stacked-wordmark,
// 2026-10-02, at the user's word — "When page opens, nav bar items should
// be 144px from sides, then should relax to 72px as scrolling to top"):
// where the page opens on the name (main.wm-opening), the strip rests on
// the window's foot with its first and last words 144 from the sides, and
// as it rides up to pin at the top they ease out to 72, in proportion to
// how far it has come (--strip-side; style.css, THE OPENING SCREEN).
(function () {
  var main = document.querySelector('main.wm-opening');
  var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
  if (!main || !strip) return;
  var root = document.documentElement, raf = 0, last = '';
  var update = function () {
    raf = 0;
    // (its resting place on the page: the name's block and the air under it)
    var rest = (parseFloat(getComputedStyle(root).getPropertyValue('--masthead-h')) || 0)
      + (parseFloat(main.style.getPropertyValue('--wm-under') || getComputedStyle(main).getPropertyValue('--wm-under')) || 0);
    var p = rest > 0 && !main.classList.contains('wm-banded') ? Math.min(1, Math.max(0, (window.pageYOffset || 0) / rest)) : 1;
    // (72 where the page opens on the band: the bird and THE LAST
    // MAGAZINE 72 from the sides — 36 for a while, "The edge of the last
    // magazine should stretch to 36px from side", then "Move bird to start
    // 72px from side" / "Same with the last magazine", then 36 again,
    // "Move band margins to 36px" — "Actually 54px")
    var v = (main.classList.contains('wm-banded') ? 54 : window.__ncStripSide(p)).toFixed(2) + 'px';
    if (v !== last) { strip.style.setProperty('--strip-side', v); last = v; }
  };
  var ask = function () { if (!raf) raf = requestAnimationFrame(update); };
  ['scroll', 'resize', 'newcritic:fitdone', 'newcritic:settled'].forEach(function (ev) {
    addEventListener(ev, ask, { passive: true });
  });
  update();
})();

// THE STRIP'S WORDS' INK (design/stacked-wordmark, 2026-10-02): where the
// head strip's words' capitals stand in it — their flat cap and their
// baseline, under the strip's top, read off the first word's face — so the
// opening name can be seated by them (fitMastheadFill).
window.__ncStripInk = function () {
  var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
  var b = strip && strip.querySelector('.sub-ticker-half > b');
  if (!b || !strip.offsetHeight) return null;
  var rg = document.createRange(); rg.selectNodeContents(b);
  var r = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0];
  if (!r) return null;
  var cs = getComputedStyle(b);
  var cv = window.__ncCapCv || (window.__ncCapCv = document.createElement('canvas').getContext('2d'));
  cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  var m = cv.measureText('H');
  var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
  if (!(fa > 0)) return null;
  var top = strip.getBoundingClientRect().top;
  var base = r.top + (r.height - (fa + fd)) / 2 + fa;
  return { cap: base - m.actualBoundingBoxAscent - top, base: base - top };
};

// THE BIRD ONTO THE BAND (design/stacked-wordmark, 2026-10-02, at the
// user's words — "As it pulls up I want the three elements (THE/NEW, the
// bird, and CRI/TIC) to shrink, when band reaches Bird, I want the bird to
// transfer onto band ... while the band hides the letters of THE NEW
// CRITIC"; "Actually I want THE LAST to separate from MAGAZINE, as bird
// slides between"; then "Want everything to move upwards and paced
// continuously / So all at same rate"): from 1024 up, where the page opens
// on the name (main.wm-opening), everything runs on one measure, how far
// the strip has come up the window (p, 0 at rest to 1 pinned), and runs
// evenly with the scroll: the letters rise and shrink about their middle
// to stand, as tall as the bird, behind the pinned strip, which comes over them on
// the way; the bird rises and shrinks straight to its seat in the strip,
// three quarters its height; THE LAST and MAGAZINE part to let it
// in, 18 clear of it each side. Scrolling back undoes it. The fitter and
// the readers above measure with it cleared (__ncPullClear /
// __ncPullApply).
// (THE NAME SETTLES IN THE BAND WITH THE BIRD, at the user's word —
// "Remove the last magazine. I want the nav bar items to push in slightly
// and THENEW and CRITIC to drift all the way out to 36px from the edges,
// settling in the band like the bird": The Last Magazine leaves the
// strip, a gap the bird's width and 18 each side keeping its place in the
// middle (.sub-ticker-half--slot); the strip's words ease in from 144 to
// 180 (window.__ncStripSide); THE/NEW and CRI/TIC shrink with the bird, at
// its scale, and drift out until their outer edges stand 36 from the
// window's, settling over the strip's middle as it pins; once there they
// are the charcoal, as the bird is, and the bird goes to About.)
(function () {
  var main = document.querySelector('main.wm-opening');
  var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
  var wm = document.querySelector('.site-nav--top .topbar-wordmark');
  var stack = document.querySelector('.page-rows > .head-rail .wm-stack');
  var rail = stack && stack.parentNode;
  var slot = strip && strip.querySelector('.sub-ticker-half--slot');
  // (THE/NEW and CRI/TIC shrink each on its own side, the first pinned
  // to the left, the second to the right: "Have THE/NEW shrink pinned to
  // left, while CRI/TIC pins to the right", 2026-10-02 — the name as a
  // whole shrank about its middle before)
  var colL = wm && wm.querySelector('.tn-col--l'), colR = wm && wm.querySelector('.tn-col--r');
  if (!main || !strip || !wm || !stack || !rail || !slot || !colL || !colR) return;
  // (THE NAME IN THE BAND, 2026-10-04: where the page opens on the band the
  // band carries its own name and the bird — build.js, bandLogoHtml — and
  // the strip's words stand in the strip's own row; nothing settles)
  if (main.classList.contains('wm-banded')) {
    // (the strip at the band's height from the first pixel, from 1024 up:
    // 108, "make whole band 36px shorter"; read off --strip-settled since
    // 2026-10-04 — 126, "Increase top band size by 18px" — so the sheet
    // alone says how tall the band stands)
    var wideB = window.matchMedia('(min-width: 1024px)');
    var setH = function () {
      if (!wideB.matches) { strip.style.removeProperty('height'); return; }
      var h = parseFloat(getComputedStyle(main).getPropertyValue('--strip-settled')) || 108;
      strip.style.setProperty('height', h + 'px', 'important');
    };
    setH(); addEventListener('resize', setH);
    return;
  }
  var wide = window.matchMedia('(min-width: 1024px)');
  // (the bird three quarters of the strip's height, an eighth of it over
  // and under: 108 in 144 — "I want bird to be bigger in band", 2026-10-02,
  // where it was 72 — and 81 in 108 once the strip is a quarter less: "I
  // want the band to be 25% smaller")
  // (THE/NEW and CRI/TIC end with their outer edges 36 from the window's)
  // (the strip grows from its resting height to 144 as it rises, and
  // everything settles in that: "Have band settle at 144px")
  // (THE/NEW and CRI/TIC settle in the middle of the 144 gutters either
  // side, the strip's words evenly between the name's ink and the bird's,
  // the bird in the window's middle, the light-or-dark circle between
  // CRITIC and the edge: "Fit THE/NEW and CRITIC in 144px gutters,
  // disregard 36px requirement"; "center nav bar items between bird and
  // wordmark inks"; "center dot between edge and CRITIC" — they settled
  // 36 from the edges, the words easing in, for a few minutes)
  var BIRD_SHARE = 0.75, STRIP_SETTLED = 144;
  var banded = main.classList.contains('wm-banded');
  var halves = [].slice.call(strip.querySelectorAll('.sub-ticker-run > .sub-ticker-half')).filter(function (h) { return h.querySelector(':scope > b'); });
  var dot = strip.querySelector('.sub-ticker-run > .sub-ticker-half--flip');
  var geo = null, raf = 0, applied = false;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function clear() {
    var was = applied;
    [colL, colR].forEach(function (c) { c.style.removeProperty('scale'); c.style.removeProperty('translate'); c.style.removeProperty('transform-origin'); });
    stack.style.removeProperty('transform'); stack.style.removeProperty('transform-origin');
    rail.style.removeProperty('z-index');
    strip.style.removeProperty('height');
    halves.concat(dot ? [dot] : []).forEach(function (h) { h.style.removeProperty('translate'); });
    applied = false; geo = null;
    if (landed) land(false);
    return was;
  }
  function measure() {
    if (!wide.matches) return null;
    var b = stack.getBoundingClientRect();
    var nm = wm.querySelector('.topbar-name');
    var ink = nm && ncSvgInk(nm);
    var sh = strip.getBoundingClientRect().height;
    if (!b.height || !ink || !sh) return null;
    // (the strip's resting place on the page: the name's block and the air
    // under it — the same sum that seats it)
    var rest = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-h')) || 0)
      + (parseFloat(main.style.getPropertyValue('--wm-under') || getComputedStyle(main).getPropertyValue('--wm-under')) || 0);
    if (!(rest > 0)) return null;
    var lr = colL.getBoundingClientRect(), rr = colR.getBoundingClientRect();
    var words = halves.map(function (h) { var r = h.querySelector(':scope > b').getBoundingClientRect(); return { l: r.left, w: r.width }; });
    var dr = dot && dot.getBoundingClientRect();
    return { b: { l: b.left, t: b.top, w: b.width, h: b.height }, sh: sh, vw: document.documentElement.clientWidth,
      words: words, dot: dr ? (dr.left + dr.right) / 2 : null,
      lc: { l: lr.left, r: lr.right, t: lr.top }, rc: { l: rr.left, r: rr.right, t: rr.top },
      iy: (ink.top + ink.bot) / 2, rest: rest };
  }
  // (THE WORDS MOVE EVENLY: everything here runs straight from where it
  // stands to where it settles, in step with the scroll — "Want everything
  // to move upwards and paced continuously / So all at same rate")
  function apply() {
    raf = 0;
    if (!wide.matches) { if (applied) clear(); return; }
    if (!geo) { var was = applied; if (was) clear(); geo = measure(); }
    if (!geo) return;
    var y = window.pageYOffset || 0, B = geo.b;
    // (THE PAGE OPENS ON THE BAND, 2026-10-04: no opening — the settle is
    // drawn at its end from the first pixel, main.wm-banded)
    var p = banded ? 1 : clamp(y / geo.rest, 0, 1);
    if (p <= 0 && !applied) return;
    // THE WHOLE NAME SHRINKS TOGETHER INTO THE BAND'S MIDDLE (2026-10-04,
    // at the user's word — "Have the whole wordmark/logo shrink together
    // into center of the band"): THE/NEW, the bird and CRI/TIC go as one
    // body — at every step the opening's own arrangement, scaled about its
    // middle (the ink's, across from THE's left to CRITIC's right and top
    // to bottom) and carried to the settled strip's middle — down to the
    // scale that makes the bird three quarters of the strip. Before, the
    // bird flew to the middle on its own and the two columns to the sides.
    var shEnd = Math.max(geo.sh, STRIP_SETTLED);
    strip.style.setProperty('height', (geo.sh + (shEnd - geo.sh) * p).toFixed(2) + 'px', 'important');
    var sEnd = (shEnd * BIRD_SHARE) / B.h, s = 1 + (sEnd - 1) * p;
    var SIDE = 72;
    // (…and to the strip's left, THE's ink on the 72 margin, where the page
    // opens on the band: "move wordmark/logo to the left", 2026-10-04)
    var C = { x: (geo.lc.l + geo.rc.r) / 2, y: geo.iy };
    var C1 = { x: banded ? SIDE + sEnd * (C.x - geo.lc.l) : geo.vw / 2, y: shEnd / 2 };
    var Cp = { x: C.x + (C1.x - C.x) * p, y: C.y + (C1.y - C.y) * p };
    // (an element whose box stands at x0, y0, scaled about that corner: the
    // move that puts every point of it where the body's scale puts it)
    var move = function (x0, y0) { return { x: Cp.x - x0 - s * (C.x - x0), y: Cp.y - y0 - s * (C.y - y0) }; };
    var mb = move(B.l, B.t);
    stack.style.setProperty('transform-origin', '0 0');
    stack.style.setProperty('transform', 'translate(' + mb.x.toFixed(2) + 'px, ' + mb.y.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')');
    rail.style.setProperty('z-index', '73', 'important');
    [[colL, geo.lc], [colR, geo.rc]].forEach(function (q) {
      var m = move(q[1].l, q[1].t);
      q[0].style.setProperty('transform-origin', '0 0');
      q[0].style.setProperty('scale', s.toFixed(4));
      q[0].style.setProperty('translate', m.x.toFixed(2) + 'px ' + m.y.toFixed(2) + 'px');
    });
    // (the strip's words either side of the settled name: SUBSCRIBE from
    // the 72 margin and ABOUT to it, the gaps even from word to word and
    // on to the name's ink — "Move the band margins to 72px on open and
    // settle")
    var gL = C1.x + sEnd * (geo.lc.l - C.x), gR = C1.x + sEnd * (geo.rc.r - C.x);
    var half = banded ? 0 : Math.ceil(geo.words.length / 2);
    var fromLeft = function (ws, from, to) {
      var tot = ws.reduce(function (a, w) { return a + w.w; }, 0), g = (to - from - tot) / ws.length, x = from, out = [];
      ws.forEach(function (w) { out.push(x); x += w.w + g; });
      return out;
    };
    var toRight = function (ws, from, to) {
      var tot = ws.reduce(function (a, w) { return a + w.w; }, 0), g = (to - from - tot) / ws.length, x = from, out = [];
      ws.forEach(function (w) { x += g; out.push(x); x += w.w; });
      return out;
    };
    var to = fromLeft(geo.words.slice(0, half), SIDE, gL).concat(toRight(geo.words.slice(half), gR, geo.vw - SIDE));
    halves.forEach(function (h, i) { h.style.setProperty('translate', ((to[i] - geo.words[i].l) * p).toFixed(2) + 'px 0'); });
    // (the circle between the margin and the window's edge; it keeps the
    // sheet's -50% that centres it top to bottom)
    if (dot && geo.dot != null) dot.style.setProperty('translate', ((geo.vw - SIDE / 2 - geo.dot) * p).toFixed(2) + 'px -50%', 'important');
    applied = true;
    land(p >= 1);
  }
  // (LANDED: once seated the bird and the name are the band's — the
  // charcoal, white under a hand (style.css, THE BIRD ON THE BAND) — and
  // the bird goes to About, where The Last Magazine went)
  var homeLabel = stack.getAttribute('aria-label'), homeHref = stack.getAttribute('href');
  var aboutHref = slot.getAttribute('data-href');
  var landed = false;
  function land(on) {
    if (on === landed) return;
    landed = on;
    stack.classList.toggle('is-on-band', on);
    wm.classList.toggle('is-on-band', on);
    // (where the page opens on the band the name and the bird stay the
    // front page's — About is the strip's last word, The Last Magazine)
    if (on && aboutHref && !banded) {
      stack.setAttribute('href', aboutHref);
      stack.setAttribute('aria-label', 'About The New Critic');
      stack.classList.remove('is-pair-lit');
    } else {
      stack.setAttribute('href', homeHref);
      stack.setAttribute('aria-label', homeLabel);
    }
  }
  var ask = function () { if (!raf) raf = requestAnimationFrame(apply); };
  window.__ncPullClear = function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } return clear(); };
  window.__ncPullApply = function () { geo = null; apply(); };
  // (one frame of it, on the measure in hand: the collapse below draws it
  // in the same frame it moves the page, so nothing trails the strip)
  window.__ncPullTick = function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } apply(); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', function () { geo = null; ask(); });
  apply();
})();

// THE COLLAPSE ON A TOUCH OF THE SCROLL (2026-10-02, at the user's words —
// "On scroll, trigger collapse"; "I want it to look super smooth"): from
// 1024 up, where the page opens on the name, the reader no longer scrolls
// the strip up by hand. The first turn of the wheel, swipe or key
// downward while the page stands in the opening carries it the whole way
// — the strip pinned at the top, the name and the bird settled in it —
// over COLLAPSE_MS on a sine's ease in and out; a turn upward from there
// carries it back. Everything the scroll drives still moves together on
// the one timeline, and is drawn in the frame the page moves
// (window.__ncPullTick), so nothing trails the strip. The input that set
// it going is taken, and so is what follows it — a trackpad's glide, the
// rest of a swipe — until the hand has let go, so nothing pulls against
// it or carries the page on past the strip once it lands. A reader who
// asks for less motion is taken there at once. (The strip's resting place
// on the page, the opening's foot, is the same sum that seats it: the
// name's block and the air under it.)
(function () {
  var main = document.querySelector('main.wm-opening');
  // (no opening to collapse where the page opens on the band)
  if (!main || main.classList.contains('wm-banded')) return;
  var wide = window.matchMedia('(min-width: 1024px)');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var COLLAPSE_MS = 900, WHEEL_QUIET = 220;
  var running = false, held = false, lastWheel = 0, touchY = null, touchHeld = false;
  var rest = function () {
    return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-h')) || 0)
      + (parseFloat(main.style.getPropertyValue('--wm-under') || getComputedStyle(main).getPropertyValue('--wm-under')) || 0);
  };
  var ease = function (k) { return 0.5 - 0.5 * Math.cos(Math.PI * k); };
  var go = function (to) {
    var from = window.pageYOffset || 0;
    if (Math.abs(to - from) < 1) return;
    if (still && still.matches) { window.scrollTo({ top: to, behavior: 'instant' }); return; }
    running = true;
    var t0 = null;
    var step = function (now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / COLLAPSE_MS);
      window.scrollTo({ top: from + (to - from) * ease(k), behavior: 'instant' });
      if (window.__ncPullTick) window.__ncPullTick();
      if (k < 1) requestAnimationFrame(step); else running = false;
    };
    requestAnimationFrame(step);
  };
  // (down: within the opening, to its foot; up: from its foot or within
  // it, to the top — true when the turn was taken)
  var turn = function (down) {
    if (!wide.matches) return false;
    var y = window.pageYOffset || 0, r = rest();
    if (!(r > 0)) return false;
    if (down && y < r - 0.5) { go(r); return true; }
    if (!down && y > 0.5 && y <= r + 0.5) { go(0); return true; }
    return false;
  };
  addEventListener('wheel', function (e) {
    var now = e.timeStamp || Date.now();
    // (a glide still running on from the turn that was taken: held until
    // the wheel goes quiet)
    if (held && (running || now - lastWheel < WHEEL_QUIET)) { lastWheel = now; e.preventDefault(); return; }
    held = false;
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || !e.deltaY) return;
    if (turn(e.deltaY > 0)) { held = true; lastWheel = now; e.preventDefault(); }
  }, { passive: false });
  addEventListener('touchstart', function (e) { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; touchHeld = running; }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (touchHeld || running) { e.preventDefault(); return; }
    if (touchY === null || e.touches.length !== 1) return;
    var dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 6) return;
    if (turn(dy > 0)) { touchHeld = true; e.preventDefault(); }
    touchY = null;
  }, { passive: false });
  addEventListener('touchend', function () { touchHeld = false; }, { passive: true });
  addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var k = e.key;
    var down = k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey);
    var up = k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey);
    if (!down && !up) return;
    if (running) { e.preventDefault(); return; }
    if (turn(down)) e.preventDefault();
  });
})();
