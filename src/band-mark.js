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
  var date = band.querySelector('.band-date');
  var AIR = 72;

  var mini = document.createElement('a');
  mini.className = 'band-mini';
  mini.href = './';
  mini.setAttribute('aria-hidden', 'true');
  mini.tabIndex = -1;
  mini.innerHTML = mark.innerHTML;
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
    var c = B / (2 * r + 1);            // the miniature's caps, same ratio in the band
    var s = c / scanned.above;          // and the size that prints them
    mini.style.fontSize = s.toFixed(3) + 'px';
    mini.style.transform = 'none';
    // The cap top's seat inside the miniature's own box: the baseline
    // off a zero probe, the caps' reach above it from the scan.
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    mini.appendChild(probe);
    var base = probe.getBoundingClientRect().bottom;
    mini.removeChild(probe);
    var mr = mini.getBoundingClientRect();
    var capInBox = base - c - mr.top;
    // Centred on the band by INK, not by box: the tracking lays a space
    // after the last letter, so the box runs wider than the letters.
    var rg = document.createRange(); rg.selectNodeContents(mini);
    var rects = rg.getClientRects();
    var il = Infinity, ir = -Infinity;
    for (var i = 0; i < rects.length; i++) { if (rects[i].width > 0) { il = Math.min(il, rects[i].left); ir = Math.max(ir, rects[i].right); } }
    var br = band.getBoundingClientRect();
    var dx = isFinite(il) ? (br.left + br.width / 2) - (il + ir) / 2 : 0;
    geo = { S: S, B: B, c: c, capInBox: capInBox, dx: dx };
    return geo;
  }

  var lastP = -1;
  function run() {
    var g = measure();
    if (!g) return;
    var wb = wm.getBoundingClientRect();
    var br = band.getBoundingClientRect();
    // THE BAND COMES UP OVER THE NAME (2026-09-23): it opens UNDER the
    // wordmark and rises over it as the page goes up, the name held at
    // the window's head (style.css, THE BAND OPENS UNDER THE NAME) — so
    // the name goes under the band's TOP edge, feet first, where it once
    // went under its foot caps first. p is how much of it is covered.
    // What is still seen of it stands between the window's head and
    // the band's top edge (the page follows the band over it); gone
    // off the top with its movement, it counts covered.
    var edge = br.top;
    // (the air over the caps is the band's own now, stated by the
    // fitter: 2026-09-23; the miniature keeps the 72's proportion)
    var air = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-air')) || AIR;
    var capTop = wb.top + air;
    // (the feet off the letters, not the block: the air under them is the
    // 72 less the band's own inset to its Garamond since the two were set
    // 72 apart ink to ink, 2026-09-23 — fitMastheadFill)
    var feet = scanned ? capTop + g.S * (scanned.above + scanned.below) : wb.bottom - AIR;
    var span = feet - capTop;
    var seen = Math.max(0, Math.min(feet, edge) - Math.max(capTop, 0));
    var p = span > 0 ? 1 - seen / span : 1;
    if (p < 0) p = 0; if (p > 1) p = 1;
    if (p === lastP) return;
    lastP = p;
    // A QUARTER OUT, A QUARTER IN, AND THE REST STANDING (2026-09-18;
    // the miniature took the whole remaining three quarters to arrive
    // before this). The date fades out over the first quarter of the
    // wordmark's passage: full at the first touch, gone at a quarter.
    // The miniature comes in over the NEXT quarter and is at full
    // strength by the time HALF the name has gone under — it stands
    // whole for the second half of the passage rather than still
    // arriving as the feet disappear. The same way back.
    // IN THE TOP HALF OF THE NAME (2026-09-23): the swap waits for the
    // band's edge to reach the letters' top half —
    // the date out over the third quarter of the passage, the
    // miniature in over the last, whole as the band clears the caps.
    var DATE_FROM = 0.5, DATE_OUT = 0.75, MINI_FULL = 1;
    if (date) date.style.opacity = Math.max(0, Math.min(1, 1 - (p - DATE_FROM) / (DATE_OUT - DATE_FROM))).toFixed(3);
    var q = Math.max(0, Math.min(1, (p - DATE_OUT) / (MINI_FULL - DATE_OUT)));
    mini.style.opacity = q.toFixed(3);
    // Seated centred in the band by its ink, whatever its opacity.
    var top = (g.B - g.c) / 2;
    mini.style.transform = 'translate(' + g.dx.toFixed(2) + 'px,' + (top - g.capInBox).toFixed(2) + 'px)';
    mini.classList.toggle('is-shown', q > 0);
    mini.classList.toggle('is-home', p >= 1);
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
