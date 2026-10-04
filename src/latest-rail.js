// THE LATEST'S RAIL RIDES UP WITH THE ROWS (design/latest-rail, 2026-10-04,
// at the user's word — "The Latest column should pull up in same way as
// content on top band transition"): the rail's box begins where the
// strip's foot stands once it has settled — the page's rest (the name's
// block and the air under it, as band-mark.js reads it) plus the settled
// strip's 144 — so through the pull the rail comes up the window with the
// rows, a pixel for a pixel, and its hold pins under the strip just as the
// strip settles. Before, the box began at the body's top, behind the
// opening, and the rail held still on the screen while the rows rose.
(function () {
  var rails = [].slice.call(document.querySelectorAll('.latest-rail'));
  var main = document.querySelector('main');
  if (!rails.length || !main) return;
  var STRIP_SETTLED = 144;
  var DIVIDE = 9;
  // FOUR SECTIONS, EACH WITH ITS COLUMN (2026-10-04): a column for each
  // section, held from halfway between its first row and the last
  // section's ink (54 over its first picture: duo-panel-fit.js stands the
  // sections 108 apart) down to halfway to the next — the first from the
  // band's foot, the last to the colophon.
  var picTop = function (card) {
    var t = card.querySelector('.card-title.hl-rect.rx');
    if (!t) return card.getBoundingClientRect().top;
    return t.getBoundingClientRect().top + (parseFloat(getComputedStyle(t, '::before').top) || 0);
  };
  var cardsOf = function (key) {
    return [].slice.call(document.querySelectorAll('.page-rows .movement-body > .wrap > section.card--sec-' + key));
  };
  var setImp = function (el, prop, v) {
    if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v, 'important');
  };
  var secWraps = function (key) {
    return [].slice.call(rails[0].parentElement.querySelectorAll(':scope > .wrap.wrap--sec-' + key));
  };
  var allWraps = function () { return [].slice.call(rails[0].parentElement.querySelectorAll(':scope > .wrap.wrap--sec')); };
  var seat = function () {
    var first = rails[0];
    if (!first.offsetWidth) {
      allWraps().forEach(function (w) { ['position', 'top', 'z-index'].forEach(function (k) { w.style.removeProperty(k); }); });
      return;
    }
    // (read with the sections unpinned — style.css, SECTIONS PIN AT
    // THEIR END — and pinned again once seated)
    main.classList.add('sec-nopin');
    try { seatNow(); } finally { main.classList.remove('sec-nopin'); }
  };
  var seatNow = function () {
    var first = rails[0];
    var body = first.parentElement;
    var rest = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-h')) || 0)
      + (parseFloat(main.style.getPropertyValue('--wm-under') || getComputedStyle(main).getPropertyValue('--wm-under')) || 0);
    // (no rest where there is no opening: the page opens on the band, 2026-10-04)
    if (!main.classList.contains('wm-opening') || main.classList.contains('wm-banded')) rest = 0;
    // (the band's own height where the page opens on it: 108, "make whole band 36px shorter")
    var strip = document.querySelector('.sub-ticker--top');
    var settled = main.classList.contains('wm-banded') && strip ? strip.offsetHeight : STRIP_SETTLED;
    var br = body.getBoundingClientRect();
    var bodyTop = br.top + (window.pageYOffset || 0);
    var tops = rails.map(function (rail, i) {
      if (i === 0) return Math.max(0, rest + settled - bodyTop);
      var cs = cardsOf(rail.getAttribute('data-sec'));
      return cs.length ? picTop(cs[0]) - br.top - 54 : null;
    });
    // A DIVIDER BETWEEN THE SECTIONS (2026-10-04, at the user's words —
    // "Have a 72px Charcoal Divider between the sections"; then "section
    // dividers should actually be 54px and blue"; then "section dividers
    // should be charcoal actually"; "I want dividers to be 36px"; "Set
    // section dividers to 9px"): the band's charcoal, the window's width,
    // 9 tall, 54 under the last
    // section's ink and 54 over the next's first picture (duo-panel-fit.js,
    // SECTION_GAP); the columns stop on it and start under it.
    // SECTIONS PIN AT THEIR END (2026-10-04, at the user's word — "When
    // sections end, should pin to bottom, and divider should pull over
    // top"): a section's last row holds where it stands once the section's
    // foot (the next divider's top) reaches the window's foot — sticky, its
    // top a window less the row's depth to that foot — and its column holds
    // with it (the column runs on to the rows' end); the next section comes
    // up over both, its divider first, on a sheet of the page's white that
    // runs from the divider to the rows' end. Each section stands a level
    // over the last (z, four to a section: sheet, column, rows, divider).
    rails.forEach(function (rail, i) {
      var top = tops[i];
      if (top == null) return;
      var next = null;
      for (var k = i + 1; k < tops.length; k++) if (tops[k] != null) { next = tops[k]; break; }
      var key = rail.getAttribute('data-sec');
      setImp(rail, 'top', top.toFixed(2) + 'px');
      setImp(rail, 'bottom', '0px');
      setImp(rail, 'z-index', String(4 * i + 2));
      // (the last section's foot is the colophon's top, the room drawn up
      // under it standing past the rows: THE COLOPHON PULLS UP)
      var tail = body.querySelector(':scope > .sec-tail');
      var coloEl = document.querySelector('.page-rows > .section-band--colophon.colo');
      var end = next != null ? next - DIVIDE : tail && tail.offsetHeight && coloEl ? coloEl.getBoundingClientRect().top - br.top : null;
      secWraps(key).forEach(function (w) {
        w.__z = 4 * i + 3;
        w.style.setProperty('position', 'relative');
        w.style.setProperty('z-index', String(w.__z + (w.querySelector('.is-open, .is-opening, .is-shutting') ? 1 : 0)));
        if (end != null && w.classList.contains('wrap--sec-end')) {
          var wt = w.getBoundingClientRect().top - br.top;
          w.style.setProperty('position', 'sticky');
          w.style.setProperty('top', (window.innerHeight - (end - wt)).toFixed(2) + 'px');
        } else w.style.removeProperty('top');
      });
      if (i === 0) return;
      var dv = rail.__divide, sh = rail.__sheet;
      if (!dv) {
        sh = rail.__sheet = document.createElement('div');
        sh.className = 'sec-sheet';
        sh.setAttribute('aria-hidden', 'true');
        body.insertBefore(sh, rail);
        dv = rail.__divide = document.createElement('div');
        dv.className = 'sec-divide';
        dv.setAttribute('aria-hidden', 'true');
        body.insertBefore(dv, rail);
      }
      setImp(dv, 'top', (top - DIVIDE).toFixed(2) + 'px');
      setImp(dv, 'z-index', String(4 * i + 3));
      setImp(sh, 'top', (top - DIVIDE).toFixed(2) + 'px');
      setImp(sh, 'z-index', String(4 * i + 1));
    });
    // (THE COLOPHON PUSHED THE BAND OFF for an hour, 2026-10-04 — "When
    // the colophon arrives, it should push the top band out of view" — then
    // "At the bottom, keep the top band, and have the bottom pull up": the
    // band holds to the page's end, and the colophon comes up over the last
    // section as each section's divider comes up over a section)
    var rail0 = document.querySelector('.page-rows > .head-rail');
    if (rail0) rail0.style.removeProperty('bottom');
    // (the room under the colophon runs on by the body's own foot padding
    // too — the fitter's 54 over the colophon — since a pinned row holds
    // only inside the body's content: the colophon drawn up by the same, so
    // it stands where the fitter seats it)
    var tl = body.querySelector(':scope > .sec-tail'), co = document.querySelector('.page-rows > .section-band--colophon.colo');
    if (tl && co && tl.offsetHeight) {
      var room = co.offsetHeight + (parseFloat(getComputedStyle(body).paddingBottom) || 0);
      setImp(tl, 'height', room.toFixed(2) + 'px');
      setImp(co, 'margin-top', (-room).toFixed(2) + 'px');
    }
    measure();
    light();
    band.seatLead = true;
    band();
  };
  // THE POST IN THE WINDOW LIGHTS ITS LINE (2026-10-04, at the user's word
  // — "whichever post is aligned with ... the latest column, the latest
  // should ... show this by highlighting in white that post. And then on
  // hover, it should go back to charcoal"): the row standing across the
  // middle of the window under the band — or, between rows, the nearer —
  // lights its posts' lines in their column (a.is-now; style.css).
  var spans = [];
  var measure = function () {
    var y0 = window.pageYOffset || 0;
    spans = [];
    rails.forEach(function (rail) {
      var links = {};
      [].forEach.call(rail.querySelectorAll('.latest-rail__list a[data-slug]'), function (a) { links[a.getAttribute('data-slug')] = a; });
      cardsOf(rail.getAttribute('data-sec')).forEach(function (card) {
        var r = card.getBoundingClientRect();
        if (!r.height) return;
        var a = links[card.getAttribute('data-slug')];
        if (a) spans.push({ rail: rail, a: a, row: card.getAttribute('data-row'), t: picTop(card) + y0, b: r.bottom + y0 });
      });
    });
  };
  var lit = [];
  var light = function () {
    if (!spans.length) return;
    var strip = document.querySelector('.sub-ticker--top');
    var band = strip ? Math.max(0, strip.getBoundingClientRect().bottom) : 0;
    var y = (window.pageYOffset || 0) + band + (window.innerHeight - band) / 2;
    var best = null, bestD = Infinity;
    spans.forEach(function (sp) {
      var d = y < sp.t ? sp.t - y : y > sp.b ? y - sp.b : 0;
      if (d < bestD) { bestD = d; best = sp; }
    });
    var now = best ? spans.filter(function (sp) { return sp.row === best.row; }).map(function (sp) { return sp.a; }) : [];
    lit.forEach(function (a) { if (now.indexOf(a) < 0) a.classList.remove('is-now'); });
    now.forEach(function (a) { a.classList.add('is-now'); });
    lit = now;
  };
  // (a card out on its slide stands a level over its row's other wrap,
  // so it can go over its mate: each pinned wrap is a stacking context)
  var lift = function () {
    allWraps().forEach(function (w) {
      if (w.__z == null) return;
      var z = String(w.__z + (w.querySelector('.is-open, .is-opening, .is-shutting') ? 1 : 0));
      if (w.style.zIndex !== z) w.style.setProperty('z-index', z);
    });
  };
  addEventListener('newcritic:travel', function () {
    lift(); setTimeout(lift, 50); setTimeout(lift, 1000); setTimeout(lift, 1700);
  });
  // THE BAND GIVES UP ITS NAME TO THE COLOPHON'S (2026-10-04, at the
  // user's word — "As colophon appears, fade out top band wordmark and
  // stamp and spread out nav bar items"): from the colophon's top at the
  // window's foot to the page's end, the band's name and bird fade out and
  // give up their room, and the band's words spread across it (--colo-p,
  // 0 to 1, on the band; --band-logo-w, the name's width; style.css, THE
  // BAND GIVES UP ITS NAME).
  var band = function () {
    var st = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
    var co = document.querySelector('.page-rows > .section-band--colophon.colo');
    if (!st || !co || !main.classList.contains('wm-banded')) return;
    // (the band's words at rest stand evenly between the name's ink and
    // the bird's outline — "the nav bar items should be evenly distributed
    // between ink of wordmark and ink of stamp outline": one gap from
    // CRITIC's last stroke to the first word's ink, between each word's
    // ink and the next's, and from the last word's to the frame's outer
    // edge. Read with the row's paddings at the band's sides and the
    // colophon away; --band-lead and --band-trail are the room the row
    // gives the name and the bird at rest, given up as the colophon comes)
    if (band.seatLead) {
      band.seatLead = false;
      var run = st.querySelector(':scope > .sub-ticker-run');
      var low = st.querySelector('.band-logo__low svg path');
      var frame = st.querySelector('.band-logo__frame');
      var p0 = st.style.getPropertyValue('--colo-p');
      st.style.setProperty('--colo-p', '0');
      st.style.setProperty('--band-lead', '0px');
      st.style.setProperty('--band-trail', '0px');
      var words = run ? [].filter.call(run.children, function (c) {
        return !c.classList.contains('band-logo') && c.offsetWidth && c.querySelector('b');
      }) : [];
      var ctx = band.ctx || (band.ctx = document.createElement('canvas').getContext('2d'));
      var ink = words.map(function (c) {
        // (a word's ink inside its box: the face's own bearings, and the
        // tracking after its last letter, which the box keeps)
        var b = c.querySelector('b'), r = b.getBoundingClientRect(), cs = getComputedStyle(b);
        ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        var t = cs.textTransform === 'uppercase' ? b.textContent.toUpperCase() : b.textContent;
        var m = ctx.measureText(t), n = Array.from(t).length || 1;
        var tr = (r.width - m.width) / n;
        var bx = c.getBoundingClientRect();
        var l = r.left - m.actualBoundingBoxLeft, rr = r.left + m.actualBoundingBoxRight + tr * (n - 1);
        return { l: l, r: rr, inL: l - bx.left, inR: bx.right - rr, w: bx.width };
      });
      if (run && low && frame && ink.length > 1) {
        var lb = low.getBBox(), lm = low.getScreenCTM();
        var fb = frame.getBBox(), fm = frame.getScreenCTM();
        var sw = parseFloat(frame.getAttribute('stroke-width')) || 0;
        var x0 = lm.a * (lb.x + lb.width) + lm.e;
        var x1 = fm.a * (fb.x - sw / 2) + fm.e;
        var inkW = ink.reduce(function (a, k) { return a + (k.r - k.l); }, 0);
        var g = (x1 - x0 - inkW) / (ink.length + 1);
        var rb = run.getBoundingClientRect(), rcs = getComputedStyle(run);
        var padL = parseFloat(rcs.paddingLeft), padR = parseFloat(rcs.paddingRight);
        var lead = (x0 + g - ink[0].inL) - (rb.left + padL);
        var trail = (rb.right - padR) - (x1 - g + ink[ink.length - 1].inR);
        if (g > 0 && lead > 0 && trail > 0) {
          st.style.setProperty('--band-lead', lead.toFixed(2) + 'px');
          st.style.setProperty('--band-trail', trail.toFixed(2) + 'px');
        } else {
          st.style.removeProperty('--band-lead');
          st.style.removeProperty('--band-trail');
        }
      } else {
        st.style.removeProperty('--band-lead');
        st.style.removeProperty('--band-trail');
      }
      if (p0) st.style.setProperty('--colo-p', p0); else st.style.removeProperty('--colo-p');
      // (the column's edge hangs on STORE and ARCHIVE: read it again)
      if (window.__ncRailEdge) window.__ncRailEdge();
    }
    // (the band's own width, for the bird's seat at its right — the bird
    // stands in the name, which stands out of the row)
    var bw = st.clientWidth.toFixed(2) + 'px';
    if (st.style.getPropertyValue('--band-w') !== bw) st.style.setProperty('--band-w', bw);
    var h = co.offsetHeight || 1;
    var pr = Math.max(0, Math.min(1, (window.innerHeight - co.getBoundingClientRect().top) / h));
    // (the fade first, over the colophon's first quarter, and the words
    // spread only once it is done, over the rest — "Fade should occur
    // before words start moving, by the end of the colophon"; "I want the
    // wordmark/stamp, to be gone by 1/4")
    var fade = Math.min(1, pr / FADE_SHARE), spread = Math.max(0, (pr - FADE_SHARE) / (1 - FADE_SHARE));
    var v = spread.toFixed(4), vf = fade.toFixed(4);
    if (st.style.getPropertyValue('--colo-p') !== v) st.style.setProperty('--colo-p', v);
    if (st.style.getPropertyValue('--colo-fade') !== vf) st.style.setProperty('--colo-fade', vf);
    st.classList.toggle('is-giving', fade > 0.5);
  };
  var FADE_SHARE = 0.25;
  band.seatLead = true;
  window.__ncBand = band;
  var ticking = false;
  addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; light(); band(); });
  }, { passive: true });
  ['load', 'resize', 'newcritic:fit', 'newcritic:fitdone', 'newcritic:settled'].forEach(function (ev) {
    addEventListener(ev, function () { setTimeout(seat, 0); }, { passive: true });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(seat);
  // (and whenever the rows move under them — the fitter's later passes
  // stand the cards anew without a word)
  if (window.ResizeObserver) {
    var due = 0;
    var ro = new ResizeObserver(function () {
      if (due) return;
      due = requestAnimationFrame(function () { due = 0; seat(); });
    });
    ro.observe(rails[0].parentElement);
  }
  seat();
})();

// THE LATEST'S EDGE UNDER THE NAV (design/latest-rail, 2026-10-04, at the
// user's word — "set the size for the latest column so its far edge sits
// halfway between Store and archive"): where the page opens on the band,
// the blue panel's left edge stands halfway across the gap between STORE
// and ARCHIVE in the band over it. Read here (--rail-edge, on main) and
// spent in style.css as the rail's column (54 ROUND THE POSTS); the band's
// words do not hang on the column, so one reading holds until the window
// or the fonts change — and a change after the first seats the rows again
// (the fitter answers a resize).
(function () {
  var main = document.querySelector('main.wm-banded');
  var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
  if (!main || !strip) return;
  var wide = window.matchMedia('(min-width: 1024px)');
  var seated = false;
  var word = function (re) {
    var bs = strip.querySelectorAll('.sub-ticker-run > .sub-ticker-half > b');
    for (var i = 0; i < bs.length; i++) if (re.test(bs[i].textContent.trim())) return bs[i].getBoundingClientRect();
    return null;
  };
  var measure = function () {
    if (!wide.matches) return;
    // (read with the band's words at rest, not spread for the colophon)
    var p0 = strip.style.getPropertyValue('--colo-p');
    if (p0) { strip.style.setProperty('--colo-p', '0'); void strip.offsetWidth; }
    var s = word(/^store$/i), a = word(/^archive$/i);
    if (p0) strip.style.setProperty('--colo-p', p0);
    if (!s || !a || !s.width || !a.width) return;
    var mid = (s.right + a.left) / 2;
    var cur = parseFloat(main.style.getPropertyValue('--rail-edge'));
    if (isNaN(cur) || Math.abs(cur - mid) > 0.5) {
      main.style.setProperty('--rail-edge', mid.toFixed(2) + 'px');
      if (seated) { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
    }
    seated = true;
  };
  measure();
  window.__ncRailEdge = measure;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('resize', measure, { passive: true });
  addEventListener('load', measure);
})();
