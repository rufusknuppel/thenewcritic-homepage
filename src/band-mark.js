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
  function measure() {
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
      if (window.__ncRequestFit) window.__ncRequestFit();
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
  run();
  canvas();
})();
