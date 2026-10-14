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
  // (the swallow's ink is its shield's since 2026-10-07 — a diamond, then a
  // seal, then "Use this as the shape": the shield is sized, set on its
  // middle and on the 54 gutter where the bird was; build.js, THE BIRD IN A
  // SHIELD)
  // (the shield alone since the bird went under the frame — "Tuck wings and
  // tail under the outline", 2026-10-07: the bird now comes first in the
  // stamp's drawing, and a list of the two found it, not the frame)
  var BIRD_INK = '.band-logo__bird .band-logo__shield';
  // THE NAV STACKED AT THE RIGHT (2026-10-09, at the user's words — "Right align Subscribe, ... nav items in a vertica
  // stack to the right of the bird, reduce height of Wordmark/logo accordingly"): the list's words one over another,
  // their last ink on the band's 20 from the right, the first's capitals level with the name's and the last's
  // baseline with its foot, no commas; the name smaller, so it, a word's gap and the stack fill the band between its
  // two 20s
  var NAV_STACK = true;
  // (the gaps either side of the bird, between NEW and CRITIC, this much short of the words' gap — seatLogo, bandGeo)
  var BIRD_TUCK = 20;
  // (the gaps between the words and the bird a tenth wider since 2026-10-11 — "Add 10% more space between words in
  // wordmark", "words and logo": the name that much smaller, THE and CRITIC still on the 20s, every gap 1.1 of what
  // it was, the bird's tuck with them)
  // (and a tenth again — "Add another 10% to the gaps": 1.1 of the 1.1)
  // (and 15% on that — "increase gaps between words in wordmarks by 15% to lower height", 2026-10-11: 1.15 of the
  // 1.21, the name and the band lower by what the letters give up)
  // (and 15% again with the bird back between NEW and CRITIC — "expand gaps by 15%")
  // (and 15% again — "increase gaps around wordmark logo by 15%", "I meant gaps between words", the same day)
  var GAP_K = 1.21 * 1.15 * 1.15 * 1.15;
  // (the air round the name — over it, under it and off the window's sides, one: 23 for a few minutes on 2026-10-11,
  // the gaps' 15% taken for the air's, then 20 again)
  var WM_SIDE = 20;
  // (whether the band still shows its stack: from 1024 up it stands in the column since 2026-10-09)
  var NAV_STACK_SHOWN = function (st) { return navStackW(st) > 0; };
  var navRightX = null;
  var navWords = function (st) {
    var run = st && st.querySelector(':scope > .sub-ticker-run');
    return run ? [].filter.call(run.children, function (c) { return !c.classList.contains('band-logo') && c.offsetWidth && c.querySelector('b'); }) : [];
  };
  var navCx = null;
  // (a word's ink across, its own bearings read from the face)
  var navInk = function (c) {
    var b = c.querySelector('b'), cs = getComputedStyle(b), r = b.getBoundingClientRect();
    navCx = navCx || document.createElement('canvas').getContext('2d');
    navCx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    // (the letters' spacing too, since the line under THE LAST MAGAZINE wears the bylines' — 2026-10-09)
    try { navCx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing; } catch (e) {}
    var t = cs.textTransform === 'uppercase' ? b.textContent.toUpperCase() : b.textContent;
    var m = navCx.measureText(t);
    return { l: r.left - m.actualBoundingBoxLeft, r: r.left + m.actualBoundingBoxRight };
  };
  // (two lines since — "Have two lines, Subscribe, Store, Archive/The Last Magazine": the words before THE LAST
  // MAGAZINE one line, with their commas, and it the other)
  var navLines = function (st) {
    var w = navWords(st);
    // (THE LAST MAGAZINE the top line — "Put The Last Magazine on top tho")
    if (w.length > 1 && w[w.length - 1].classList.contains('sub-ticker-half--tlm')) return [w.slice(-1), w.slice(0, -1)];
    return w.map(function (c) { return [c]; });
  };
  var navStackW = function (st) {
    var w = 0;
    navLines(st).forEach(function (ln) { w = Math.max(w, navInk(ln[ln.length - 1]).r - navInk(ln[0]).l); });
    return w;
  };
  // THE BAND'S GEOMETRY (2026-10-05): the swallow's ink set on the 54 gutter
  // (--bird-dx, style.css), and read: each word's ink inside its box, the
  // name's first stroke (x0L) and CRITIC's last (x0), the swallow's first
  // ink (x1) and last (x1R). Shared with the column's edge (evenMid).
  // THE NAV OVER THE NAME (2026-10-05, at the user's words — "Move nav band
  // above the wordmark/logo. set bird wings 18px from top and bottm and
  // wordmark 27px from top and bottom"): from 1024 up the 36 strip stands
  // at the band's head (style.css, THE NAV OVER THE NAME) and the name and
  // the swallow under it, in a field the name's ink and 27 over and under
  // it (a whole pixel: --strip-settled, the strip's height); the swallow
  // drawn to the name's ink and 18 more, so its wings stand 18 from the
  // field's top and foot, the two on one middle (--logo-dy, --bird-s,
  // --bird-dy). Read again only when the window's width changes.
  var logoW = -1;
  var wideLogo = window.matchMedia('(min-width: 1024px)');
  // (a tenth smaller again since 2026-10-10 — "Make wordmark 10% smaller": 0.9 of the 0.9)
  // (whole again since 2026-10-11 — "Keep top band always in expanded size": the name at the size it opened at, and
  // THE NAME OPENS BIG, finding nothing to grow, stands down)
  var WM_SCALE = 1;
  var FOOT_BAND = true;
  // (and the band over the name since 2026-10-11 — "Move the bottom band on top of the wordmark": the line's band at
  // the window's top, its rule at its foot, the name's band under it, the two one head — --strip-settled — its
  // height the line's band, the rule, and the name with its air; THE LINE IN THE FOOT BAND, now at the head)
  // (back at the foot the same day — "Revert wordmark on top and nav band on bottom")
  // (true again since 2026-10-13 — "Move bottom band to top of the site": the band at the window's top, its rule
  // under it, the name and the column under that)
  var FOOT_TOP = true;
  // (at the window's foot again since, across the content's column only — "move top band to the bottom in the left
  // column", 2026-10-13: FB_ACROSS off; the line spread as it stood at the top, SPREAD)
  FOOT_TOP = false;
  // (and at the window's top again since, edge to edge, the column's name and bird in it — "Move the nav band into a
  // top band that runs edge to edge. Move the wordmark into the top left, move the bird into the middle", 2026-10-14;
  // THE BAND'S MARKS, seatUnder)
  FOOT_TOP = true;
  // (and the name in a band at the window's foot since 2026-10-11 — "Move wordmark to the bottom": the line's band
  // alone the head, --strip-settled; the name in its band at the foot, its air 20 over and under it, the band's rule
  // over it — its ground .foot-band, its height --foot-band; each of the name's and the bird's rises a calc on the
  // window's height, so a window grown taller needs no seating)
  // (and the name back at the head with the line's band at the foot the same day — "Revert wordmark on top and nav
  // band on bottom")
  var NAME_FOOT = false;
  // (and the name out of the head altogether since 2026-10-13 — "Move THE NEW above CRITIC in the Latest", the band
  // gone: the head no height, the band's name still laid out unseen so the column's edge reads it as before;
  // build.js and style.css, THE NAME IN THE COLUMN)
  var NAME_IN_RAIL = true;
  var SPREAD = NAME_IN_RAIL; // (the band's line spread — THE BAND'S LINE SPREAD, seatUnder)
  var ruleW = function () { return parseFloat(getComputedStyle(main).getPropertyValue('--band-rule')) || 2; };
  window.__ncWmScale = WM_SCALE;
  var seatLogo = function (st) {
    if (window.__ncOpenClear) window.__ncOpenClear();
    var vw = document.documentElement.clientWidth;
    if (!st || !main || vw === logoW) return;
    logoW = vw;
    var props = ['--logo-dy', '--bird-s', '--bird-dy'];
    if (!wideLogo.matches || !main.classList.contains('wm-banded')) {
      props.forEach(function (p) { st.style.removeProperty(p); });
      main.style.removeProperty('--strip-settled');
      // (and the list's line under the name let go: THE NAV UNDER THE NAME is from 1024 up)
      [].forEach.call(st.querySelectorAll(':scope > .sub-ticker-run > *'), function (c) { c.style.removeProperty('top'); c.style.removeProperty('position'); c.style.removeProperty('left'); c.classList.remove('nav-stack'); });
      return;
    }
    var bird = st.querySelector(BIRD_INK);
    var paths = st.querySelectorAll('.band-logo svg:not(.band-logo__bird) path');
    if (!bird || !paths.length) return;
    // (the bird held still while it is set back and read: its translate and scale move on a transition, so set back
    // to nothing it was read where it still stood, part way home, and seated from there — its rise came out 0 and
    // it jumped up as the column shut, "Bird moves up on column collapse", 2026-10-09. The transition is let back
    // once the seat is written and drawn, so nothing runs between the two)
    var birdSvg0 = st.querySelector('.band-logo__bird');
    if (birdSvg0) {
      birdSvg0.style.setProperty('transition', 'none', 'important');
      setTimeout(function () { void birdSvg0.getBoundingClientRect(); birdSvg0.style.removeProperty('transition'); }, 0);
    }
    st.style.setProperty('--logo-dy', '0px'); st.style.setProperty('--bird-s', '1'); st.style.setProperty('--bird-dy', '0px');
    var inkY = function () {
      var t = Infinity, b = -Infinity;
      [].forEach.call(paths, function (q) { var r = q.getBoundingClientRect(); if (r.width) { t = Math.min(t, r.top); b = Math.max(b, r.bottom); } });
      return { t: t, b: b };
    };
    var logoEl = st.querySelector('.band-logo');
    // (measured only once the column and the list are laid out: till then
    // the next seating asks again — bandGeo calls this each time)
    var fitMeasured = false;
    if (logoEl) logoEl.style.removeProperty('font-size');
    var k = inkY();
    if (!isFinite(k.t)) return;
    // THE LIST KEEPS ITS 36s (2026-10-07): the name at the sheet's size
    // stands 18 over and under in the band of 155 ("Reduce space above
    // and below stamp/wordmark to 18px") where the list between CRITIC
    // and the swallow keeps 36 clear either side; where it would not, the
    // name comes down just so far. The name's left is the swallow's right
    // margin and the swallow is centred on the column (bandGeo), so the
    // swallow's width falls out: CRITIC may end at 2 x the column's middle
    // less the window, the list and its two 36s.
    var railEl = document.querySelector('.page-rows .latest-rail--latest');
    void railEl;
    var runEl = st.querySelector(':scope > .sub-ticker-run');
    if (logoEl && runEl) {
      var rr = { width: 1 };
      var lk = [].filter.call(runEl.children, function (c) { return !c.classList.contains('band-logo') && c.offsetWidth && c.querySelector('b'); });
      var nl = Infinity, nr = -Infinity, ll = Infinity, lr = -Infinity;
      [].forEach.call(paths, function (q) { var r = q.getBoundingClientRect(); if (r.width) { nl = Math.min(nl, r.left); nr = Math.max(nr, r.right); } });
      lk.forEach(function (c) { var r = c.getBoundingClientRect(); ll = Math.min(ll, r.left); lr = Math.max(lr, r.right); });
      if (rr.width && isFinite(nl) && isFinite(ll)) {
        fitMeasured = true;
        // (the name and the swallow 18 off the window's sides since later
        // that day — "Move stamp and wordmark to sit 18px from the sides":
        // the name's width and the swallow's, as tall as the name's ink at
        // the swallow's own proportion, share the window less the two 18s,
        // the list and its two 36s)
        var bb0 = bird.getBoundingClientRect();
        var bAr = bb0.height ? bb0.width / bb0.height : 0.9;
        var nW = (nr - nl) + bAr * (k.b - k.t);
        // (the bird in the name since 2026-10-09 — "Move the bird betwen THE NEW and Critic": the name's width read
        // word by word, THE and NEW as they stand, then a word's gap, the bird, a gap and CRITIC, whatever shift
        // CRITIC carries from the last seating)
        var inkX0 = function (sel) {
          var l = Infinity, r = -Infinity;
          [].forEach.call(st.querySelectorAll(sel), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) { l = Math.min(l, qr.left); r = Math.max(r, qr.right); } });
          return isFinite(l) ? { l: l, r: r } : null;
        };
        var tX = inkX0('.band-logo__top svg path'), mX = inkX0('.band-logo__mid svg path'), cX = inkX0('.band-logo__low svg path');
        if (tX && mX && cX) nW = (mX.r - tX.l) + 2 * (mX.l - tX.r) + bAr * (k.b - k.t) + (cX.r - cX.l);
        var maxW = vw - 36 - 72 - (lr - ll);
        // (no longer: the name spaced and sized as the colophon's since 2026-10-09, below)
        void maxW; void nW;
      }
    }
    // THE NAME AS THE COLOPHON'S (2026-10-09, at the user's word — "Space the top wordmark like the colophon, with
    // bigger text"): the name at the colophon's size, the window less two 54s, and its words the colophon's 0.6226
    // of a cap apart, ink to ink
    if (logoEl) {
      var coLogo = document.querySelector('.page-rows > .section-band--colophon.colo .colo-logo');
      var coFs = coLogo && parseFloat(getComputedStyle(coLogo).fontSize);
      // (bigger since, to the band's 20 from either side rather than the colophon's 54 — "Make logo wordmark bigger
      // to reduce spacing": THE and CRITIC stand at the 20s, so the name at the colophon's proportions across the
      // window less two 20s brings the gaps between its words back to the colophon's 0.6226 of a cap)
      var coSpan = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--colo-span'));
      // (and bigger still, its gaps the drawing's own word space, as the band had them before it took the colophon's
      // — "Make bigger still to return to old spacing": the colophon's three 0.6226s in its span the name's three
      // --wm-space)
      var wmSp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wm-space'));
      if (coSpan > 0 && wmSp > 0) coSpan -= 3 * (0.6226 - wmSp);
      if (coSpan > 0) coFs = (vw - 2 * WM_SIDE) / coSpan;
      // (the bird's gaps 20 short of the words' on either side — "Reduce the gap between W and bird and C and bird by
      // 20 px on either side", 2026-10-09: the 40 they give up goes to the name, THE and CRITIC still at the 20s;
      // bandGeo, BIRD_TUCK)
      if (coSpan > 0 && BIRD_TUCK && !NAV_STACK_SHOWN(st)) coFs = (vw - 2 * WM_SIDE + 2 * BIRD_TUCK) / coSpan;
      // (a tenth smaller since 2026-10-10 — "Increase the spacing between the words and bird in the wordmark to
      // decrease size of wordmark by 10%": THE and CRITIC still on the 20s, the room the letters give up gone to the
      // gaps between the words and the bird — bandGeo spreads them)
      if (coFs) coFs *= WM_SCALE;
      // (and smaller again by the stack and a word's gap before it, the nav stacked at the right)
      if (NAV_STACK && coSpan > 0) {
        navLines(st).forEach(function (ln) { ln.forEach(function (c, i) { c.classList.toggle('nav-before-tlm', i === ln.length - 1); }); });
        var sW = navStackW(st);
        if (sW > 0) coFs = (vw - 2 * WM_SIDE - sW) / (coSpan + (wmSp > 0 ? wmSp : 0.6226));
      }
      if (coFs) logoEl.style.setProperty('font-size', coFs.toFixed(2) + 'px', 'important');
      // (no wider than leaves the bird 24 clear of NEW and of CRITIC, as the opening was held where the window is
      // narrow — "Keep top band always in expanded size", 2026-10-11: the words' gaps the bird's and the tuck, the
      // name's and the bird's widths read at this size, the bird as tall as the name's ink)
      if (coFs && WM_SCALE === 1) {
        var kF = inkY(), bbF = bird.getBoundingClientRect();
        var wF = function (sel) { var l = Infinity, r = -Infinity; [].forEach.call(st.querySelectorAll(sel), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) { l = Math.min(l, qr.left); r = Math.max(r, qr.right); } }); return isFinite(l) ? r - l : 0; };
        var W1 = wF('.band-logo__top svg path') + wF('.band-logo__mid svg path') + wF('.band-logo__low svg path') + (bbF.height ? bbF.width / bbF.height : 0.9) * 1.03 * (kF.b - kF.t);
        var room = (vw - 2 * WM_SIDE) - BIRD_TUCK - 3 * 24;
        var fK = W1 > room && W1 > 0 ? room / W1 : 1;
        // (and the gaps GAP_K of what they come to at that size: the room the name gives up theirs)
        var gS = (vw - 2 * WM_SIDE) - W1 * fK;
        if (W1 > 0 && gS > 0) fK *= (W1 * fK - (GAP_K - 1) * gS) / (W1 * fK);
        if (fK !== 1) { coFs *= fK; logoEl.style.setProperty('font-size', coFs.toFixed(2) + 'px', 'important'); }
      }
      // (the grid's gap the drawing's word space since the name took it — 0.6226, the colophon's, before — and the
      // name at its own width, so no word is squeezed when it runs wide)
      logoEl.style.setProperty('column-gap', (wmSp > 0 ? wmSp : 0.6226) + 'em', 'important');
      logoEl.style.setProperty('width', 'max-content', 'important');
      var midEl = logoEl.querySelector('.band-logo__mid');
      if (midEl) midEl.style.setProperty('margin-left', '0px', 'important');
      k = inkY();
    }
    // (the strip under the name again since later that day — "Set band
    // below wordmark": the field the band's box, from the window's top to
    // the strip, the name 27 from either; THE NAV UNDER THE NAME, style.css)
    // (108 with its rule since later still — "bottom band should be 54px.
    // Top should be 108px": the field 106 over its 2, the name centred in
    // it at its own size, the swallow's wings 18 from either edge)
    // (THE NAV OVER THE NAME, 2026-10-06 — "Move bottom band above the
    // wordmark/logo": the strip's 52 and its 2 rule at the window's top,
    // the name's 106 under them, one head of 160 — everything reckoned off
    // --strip-settled follows; style.css, THE NAV OVER THE NAME)
    // (and under it since the same hour — "Make nav band charcoal with
    // white text, move below wordmark/logo": the name's 106 and its rule at
    // the top, the strip's 52 and its rule under them)
    // (the band 27 taller and the strip gone since 2026-10-06 — "Expand
    // top band by 18px" / "I want it to grow 27px actually"; "Remove the
    // nav band": the name's field 133 over its 2, the nav's words a list
    // in it between the name and the swallow — THE NAV IN THE NAME'S BAND)
    // (9 less over and under since 2026-10-06 — "Reduce band margins by
    // 18px on top and bottom", then "Actually only 9px on both sides": the
    // field 115)
    var wmH = k.b - k.t;
    // (THE DIAMOND A THIRD BIGGER, 2026-10-07 — "Make the diamond 30%
    // bigger, and expand the height of the top band to match": the diamond
    // 1.3 times what it was, 1.375 x 1.3 of the name's ink, and the band
    // taller by just what the diamond gained, in whole pixels, so the air
    // over and under the diamond stands as it was)
    var BIRD_K = 1.375 * 1.3;
    // (THE NAME 27 FROM THE BAND'S TOP AND FOOT, 2026-10-07, at the user's
    // word — "Make wordmark in top band bigger so it has 27px margins on
    // top and bottom": the band stays 137 — the 115 and the 22 the diamond's
    // growth added at the cap of 54.21 — where it was reckoned off the
    // name's ink; the name grows to 27 from its top and foot (style.css,
    // the cap 83, then 110 — "match wordmark margin with the bird margin"), and the swallow keeps its size, 1.7875 of that old cap
    // rather than of the name's ink, 20 from the band's edges)
    // (155 for a few minutes — "Expand the top band by 18px" — but the
    // opening's scroll and the rule under the band are reckoned off the
    // band's height elsewhere, and the rule fell away from it: 137 again)
    // (155 again — "Expand the top band by 18px, find the other height
    // assumptions first": everything else reads the band's height off
    // --strip-settled and the strip's own height, which this writes, and
    // the opening's lift and the first row's seat follow it; checked
    // headless at 1440 x 900, the rule at 155, the first picture 18 lower)
    var F = 155;
    // ("give the bird the same 27px margins", then "Have bird stretch to
    // 13.5px margins on top and bottom": the bird's box the band less 13.5
    // over and under, 110 in the 137)
    // (as tall as the name's cap again — "match stamp height with wordmark height": the name's own ink height, so
    // the two stay matched whatever the band's height)
    var birdH = wmH;
    // (a thirtieth bigger since 2026-10-09 — "Make bird 3% bigger, keeping margins the same": 1.03 of the name's
    // ink, on its middle; the band's air still read off the name's ink)
    birdH = wmH * 1.03;
    // (THE BIRD BETWEEN THE NEW AND CRITIC AGAIN, 2026-10-09 — "Move the bird betwen THE NEW and Critic": as tall as
    // the name's ink, on the same middle — a few minutes 1.07 of it, "make the bird 7% bigger than the text", then
    // "actually make bird same height as letters")
    var H = F;
    // THE NAV UNDER THE NAME (2026-10-09, at the user's words — "Center the wordmark and move the nav into a line
    // beneath the wordmark", "Keep padding the same above top and bottom as above wordmark", "Keep wordmark the
    // current size"): the name where it stood, its air over it as before, and the list a line under it, as far under
    // the name's ink as the name is under the band's top; the band then as much again under the list's baseline
    var navEls = runEl ? [].filter.call(runEl.children, function (c) { return !c.classList.contains('band-logo') && c.offsetWidth && c.querySelector('b'); }) : [];
    var navCap = 0;
    navEls.forEach(function (c) { c.style.setProperty('position', 'relative', 'important'); c.style.setProperty('top', '0px', 'important'); });
    if (navEls.length) { var nc0 = capsOf(navEls[0].querySelector('b')); if (nc0) navCap = nc0.base - nc0.cap; }
    // (the air 20 over the name, between it and the list and under the list, whatever the name's size, since it took
    // the colophon's: "Keep padding the same above top and bottom as above wordmark")
    var AIR = WM_SIDE;
    // (a rule between the name and the list for a few minutes that day — "Add a Line above the nav to separate that
    // from the wordmark", then edge to edge, then "Remove rule")
    H = Math.round(navCap > 0 && !NAV_STACK ? 3 * AIR + wmH + navCap : 2 * AIR + wmH);
    // (and the line under the name — THE LINE UNDER THE NAME, 2026-10-10: The Last Magazine's capitals AIR under the
    // name's ink, the band AIR under the line's baseline; seatUnder sets the line)
    // (the line's capitals read off the list's Garamond since The Last Magazine went to the kickers' Work Sans — "Make
    // the last magazine all caps work sans", 2026-10-13: the band's air stays the list's)
    var undT = (SPREAD && st.querySelector('.band-under--new > *')) || st.querySelector('.band-under--the > *');
    if (undT && undT.offsetWidth && !FOOT_BAND) { var cu0 = capsOf(undT); if (cu0) H = Math.round(3 * AIR + wmH + (cu0.base - cu0.cap)); }
    // (the line gone to the band at the window's foot since — THE LINE IN THE FOOT BAND, seatUnder: the name AIR from
    // the band's top and foot)
    if (FOOT_BAND) H = Math.round(2 * AIR + wmH);
    if (NAME_IN_RAIL) H = 0;
    main.classList.toggle('name-in-rail', NAME_IN_RAIL);
    // (the line's band over the name: its own height, 20 over and under the line's capitals, and its rule)
    var topB = 0;
    if (FOOT_BAND && FOOT_TOP && undT && undT.offsetWidth) {
      var cuT = capsOf(undT);
      // (29 over and under its line, as the foot band was, with the name over the content — "Move bottom band to top of
      // the site")
      // (54 since — "Move the top band margins to 54px")
      // (27 since — "have 27px above and below text in the top band"; FB_AIR, seatUnder)
      // (36 taller since 2026-10-14 — "expand the band size by 36px"; FB_AIR, seatUnder)
      if (cuT) { var fbT = Math.round((NAME_IN_RAIL ? 54 + 36 : 40) + (cuT.base - cuT.cap)); main.style.setProperty('--foot-band', fbT + 'px'); topB = fbT + ruleW(); H += topB; }
    }
    var vhN = window.innerHeight, nameB = 0;
    if (NAME_FOOT && topB) {
      nameB = Math.round(2 * AIR + wmH);
      H = topB - ruleW();
      main.style.setProperty('--foot-band', nameB + 'px');
    }
    var vcalc = function (v) { return nameB ? 'calc(100svh + ' + (v - vhN).toFixed(2) + 'px)' : v.toFixed(2) + 'px'; };
    main.style.setProperty('--strip-settled', H + 'px', 'important');
    // (the root too, for the name over the content under the band at the top — "Move bottom band to top of the site")
    document.documentElement.style.setProperty('--strip-settled', H + 'px');
    st.style.setProperty('height', H + 'px', 'important');
    var top = st.getBoundingClientRect().top;
    k = inkY();
    var want = AIR;
    // (THE COLOPHON'S AIR THE BAND'S, 2026-10-06 — "Make sure padding
    // matches top band proprotionally", then "I want padding to match the
    // top band, despite larger sizes": the colophon stands the band's own
    // air over and under its name's ink, in pixels, whatever its name's
    // size; style.css, THE COLOPHON IN THE CHARCOAL)
    var coA = document.querySelector('.page-rows > .section-band--colophon.colo');
    if (coA && wmH > 0) {
      var air = want.toFixed(2) + 'px';
      if (coA.style.getPropertyValue('--band-pad') !== air) coA.style.setProperty('--band-pad', air);
    }
    // (the name under the line's band and its rule)
    // (or at the window's foot, AIR into its band — NAME_FOOT)
    want += topB;
    if (nameB) want = vhN - nameB + AIR;
    st.style.setProperty('--logo-dy', vcalc(want - (k.t - top)));
    if (navCap > 0) {
      var nc1 = capsOf(navEls[0].querySelector('b'));
      if (nc1) {
        if (NAV_STACK) {
          // (stacked: the first word's capitals level with the name's, the last's baseline with its foot, the lines
          // evenly between)
          var lines = navLines(st);
          // (the lines as far apart as the items in THE LATEST's column, the two centred on the name's middle — "have the
          // two be vertically centered on top of each other with the spacing between kickers in the latest column")
          var pitch = 27.5;
          var liA = document.querySelector('.latest-rail__in.is-current .latest-rail__list > li'), liB = liA && liA.nextElementSibling;
          if (liA && liB) { var pA = liB.getBoundingClientRect().top - liA.getBoundingClientRect().top; if (pA > 0) pitch = pA; }
          // (baseline to baseline since the lines are two sizes — "Make it as big as The Latest. make subscribe, store,
          // etc. small as the kickers", 2026-10-09: the stack's ink, the first line's capitals to the last's baseline,
          // centred on the name's middle; each baseline read off the page with a hairline set on it, not reckoned from
          // the font's box, which lands a pixel apart between the sizes)
          var baseOf = function (el) {
            var pr = document.createElement('span');
            pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
            el.appendChild(pr); var y = pr.getBoundingClientRect().top; el.removeChild(pr); return y;
          };
          var c0 = capsOf(lines[0][0].querySelector('b')), cap0 = c0 ? c0.base - c0.cap : navCap;
          var base0 = top + want + wmH / 2 + (cap0 - (lines.length - 1) * pitch) / 2;
          lines.forEach(function (ln, i) {
            var bEl = ln[0].querySelector('b');
            if (!bEl) return;
            var dy = base0 + i * pitch - baseOf(bEl);
            ln.forEach(function (c) { c.style.setProperty('top', ((parseFloat(c.style.getPropertyValue('top')) || 0) + dy).toFixed(2) + 'px', 'important'); });
          });
        } else {
          var dyN = (top + want + wmH + want - nc1.cap).toFixed(2) + 'px';
          navEls.forEach(function (c) { c.style.setProperty('top', dyN, 'important'); });
        }
      }
    }
    var bi = bird.getBoundingClientRect();
    if (!bi.height) return;
    // (a tenth smaller since 2026-10-06 — "Make bird 10% smaller"; then a
    // tenth taller than the name's ink, the same hour — "have the bird be
    // 10% bigger than the wordmark"; then a quarter — "bird should be 25%
    // bigger than wordmark"; and a tenth more — "Make bird another 10%
    // bigger": 1.25 x 1.1)
    st.style.setProperty('--bird-s', (birdH / bi.height).toFixed(4));
    bi = bird.getBoundingClientRect();
    st.style.setProperty('--bird-dy', vcalc((top + want + wmH / 2) - (bi.top + bi.height / 2)));
    seatColo();
    seatUnder(st);
    if (!fitMeasured) logoW = -1;
  };
  // (THE COLOPHON'S AIR THE DEK'S, 2026-10-06 — "Padding in the colophon
  // seems off. Should match the padding above garamond dek in nav bar":
  // the air from the band's top to the dek's capitals stands from the
  // colophon's top to its name's ink, from the name's ink to the row's
  // capitals, and from the row's baseline to the foot. Read from the
  // fonts themselves, so it holds whatever the name's face: each margin
  // moves by what the air it makes is off; style.css, THE COLOPHON IN
  // THE CHARCOAL)
  var capCx = null;
  var capsOf = function (el) {
    var cs = getComputedStyle(el), r = el.getClientRects()[0];
    if (!r) return null;
    capCx = capCx || document.createElement('canvas').getContext('2d');
    capCx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var m = capCx.measureText('H');
    var lead = (r.height - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;
    return { cap: r.top + lead + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent, base: r.top + lead + m.fontBoundingBoxAscent };
  };
  // THE LINE UNDER THE NAME (2026-10-10, at the user's words — "Move The Last Magazine to Under THE, nave items to
  // under NEW and Socials to under CRITIC"): each piece under its word's ink — from its first stroke, the copyright
  // ending on CRITIC's last — all on one baseline — The Last
  // Magazine's capitals 20 under the name's ink (seatLogo makes the band room for it)
  var stemOfT = function (path) {
    if (!path) return null;
    var sp = ((path.getAttribute('d') || '').match(/M[^M]*/) || [])[0];
    var n = sp && sp.match(/-?\d*\.?\d+(?:e-?\d+)?/gi);
    var m = path.getScreenCTM && path.getScreenCTM();
    if (!n || !m) return null;
    var y0 = Infinity, y1 = -Infinity, k;
    for (k = 1; k < n.length; k += 2) { y0 = Math.min(y0, +n[k]); y1 = Math.max(y1, +n[k]); }
    var x = Infinity;
    for (k = 0; k + 1 < n.length; k += 2) if (+n[k + 1] > (y0 + y1) / 2) x = Math.min(x, +n[k]);
    return isFinite(x) ? m.a * x + m.e : null;
  };
  var rr0 = function (el) { return el.getBoundingClientRect().top; };
  var seatUnder = function (st) {
    if (!st) return;
    var items = st.querySelectorAll('.sub-ticker-run > .band-under');
    if (!items.length) return;
    if (!wideLogo.matches || !main.classList.contains('wm-banded')) {
      [].forEach.call(items, function (u) { u.style.removeProperty('left'); u.style.removeProperty('top'); });
      // (and no foot band under 1024 — THE LINE IN THE FOOT BAND)
      main.classList.remove('has-foot-band');
      return;
    }
    var run = st.querySelector(':scope > .sub-ticker-run');
    var inkOf = function (sel) {
      var l = Infinity, r = -Infinity, b = -Infinity;
      [].forEach.call(st.querySelectorAll(sel), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) { l = Math.min(l, qr.left); r = Math.max(r, qr.right); b = Math.max(b, qr.bottom); } });
      return isFinite(l) ? { l: l, r: r, b: b } : null;
    };
    var words = { the: inkOf('.band-logo__top svg path'), new: inkOf('.band-logo__mid svg path'), critic: inkOf('.band-logo__low svg path') };
    var tlm = (SPREAD && st.querySelector('.band-under--new > *')) || st.querySelector('.band-under--the > *');
    var c0 = tlm && capsOf(tlm);
    if (!run || !words.the || !words.new || !words.critic || !c0) return;
    var foot = Math.max(words.the.b, words.new.b, words.critic.b);
    var base = foot + 20 + (c0.base - c0.cap);
    // THE LINE IN THE FOOT BAND (2026-10-11, at the user's words — "Move the nav line to a bottom band that stretches
    // edge to edge with 20px above and below"): the line's capitals 20 under the foot band's top, its baseline 20 over
    // the window's foot, each piece where it stood across the window; the band as tall as that (--foot-band; its
    // ground and rule, .foot-band, style.css THE LINE IN THE FOOT BAND). Held to the window's foot by the strip, which
    // stands at the window's top: each top a calc on the window's height, so a window grown taller needs no seating
    var vh = window.innerHeight, capH = c0.base - c0.cap;
    if (FOOT_BAND) {
      // (36 taller since 2026-10-13 — "expand the height of the nav bar by 36px": 18 more over the line and 18 more
      // under it, 38 each)
      // (9 less over and under since 2026-10-13 — "Reduce bottom band height by 18px")
      var FB_AIR = 20 + 18 - 9;
      // (54 since, the band at the top — "Move the top band margins to 54px", 2026-10-13)
      if (SPREAD) FB_AIR = 54;
      // (27 since — "have 27px above and below text in the top band", 2026-10-13)
      if (SPREAD) FB_AIR = 27;
      // (36 taller since, 18 more over and under — "expand the band size by 36px", 2026-10-14, the band at the top with
      // its name and bird)
      if (SPREAD && FOOT_TOP) FB_AIR = 27 + 18;
      base = FOOT_TOP ? st.getBoundingClientRect().top + FB_AIR + capH : st.getBoundingClientRect().top + vh - FB_AIR;
      if (!(NAME_FOOT && FOOT_TOP)) main.style.setProperty('--foot-band', Math.round(2 * FB_AIR + capH) + 'px');
      main.classList.add('has-foot-band');
      main.classList.toggle('foot-band-top', FOOT_TOP && !NAME_FOOT);
      [].forEach.call(items, function (u) { u.style.setProperty('top', '0px', 'important'); });
    }
    var rr = run.getBoundingClientRect();
    var probe = function (el) {
      var pr = document.createElement('span');
      pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.appendChild(pr); var y = pr.getBoundingClientRect().top; el.removeChild(pr); return y;
    };
    // (across the foot band since — "Align the last magazine with the margin on the copyright, move dot to the center,
    // and space out elements evenly within bottom band", 2026-10-11: The Last Magazine from the window's 20, the
    // copyright to its 20 from the right, the dot on the window's middle, and the list and the socials each evenly
    // between its neighbours, the same air either side)
    var fbX = null;
    if (FOOT_BAND) {
      var vwF = document.documentElement.clientWidth, txw = function (el) { if (!el) return 0; var g = document.createRange(); g.selectNodeContents(el); return g.getBoundingClientRect().width; };
      var dotF = run.querySelector(':scope > .theme-toggle.chip-dot:not(.chip-dot--rail)'), dW = dotF ? dotF.getBoundingClientRect().width : 0;
      var wT = txw(st.querySelector('.sub-ticker-run > .band-under--the')), wN = txw(st.querySelector('.sub-ticker-run > .band-under--new'));
      var wS = txw(st.querySelector('.sub-ticker-run > .band-under--critic')), wC = txw(st.querySelector('.sub-ticker-run > .band-under--copy'));
      // (the dot after the socials since — "Move the theme dot to the other side of socials", 2026-10-11: the five
      // evenly from the 20 to the 20, every gap one)
      // (the content's column alone since 2026-10-13 — "Move the nav band into the content column only": the band and
      // its line from the side column's edge to the window's, the side column running on to the window's foot;
      // --fb-l / --fb-r, style.css)
      var cL = 0, cR = vwF;
      // (across the side column again since, window edge to window edge — "Have the nav bar cut across The latest
      // column", 2026-10-13)
      var FB_ACROSS = !SPREAD || FOOT_TOP;
      // (the name over the content from the side column's edge — THE NAME OVER THE CONTENT, build.js contentName)
      var railN = document.querySelector('.page-rows .latest-rail--latest'), rrN = railN && railN.getBoundingClientRect();
      // (and to the side column's left edge where the column is on the right — "Move the latest column to the right")
      var onL = rrN && rrN.width && railN.classList.contains('latest-rail--l'), onR = rrN && rrN.width && !onL;
      // (the column's own width, not where it stands: slid out as it shuts it stands past the window — "Expansion/
      // collapse breaks wordmark"; the name slides with the rows instead, --rail-shift)
      document.documentElement.style.setProperty('--cn-l', (onL ? railN.offsetWidth : 0) + 'px');
      document.documentElement.style.setProperty('--cn-r', (onR ? railN.offsetWidth : 0) + 'px');
      if (NAME_IN_RAIL && !FB_ACROSS) {
        var railF = document.querySelector('.page-rows .latest-rail--latest');
        var rrF = railF && railF.getBoundingClientRect();
        // (off the column's own width, not where it stands — slid out as it shuts it stands past the window)
        if (rrF && rrF.width) { if (railF.classList.contains('latest-rail--l')) cL = railF.offsetWidth; else cR = vwF - railF.offsetWidth; }
      }
      main.style.setProperty('--fb-l', cL.toFixed(2) + 'px');
      main.style.setProperty('--fb-r', (vwF - cR).toFixed(2) + 'px');
      // (the copyright let go where the five would stand less than 20 apart — the content's column narrow at 1024)
      var cpyF = st.querySelector('.sub-ticker-run > .band-under--copy');
      var fitAll = (cR - cL - 40 - wT - wN - wS - dW - wC) / 4 >= 20;
      if (cpyF) cpyF.style.setProperty('display', fitAll ? '' : 'none', fitAll ? '' : 'important');
      if (!fitAll) wC = 0;
      var gF = (cR - cL - 40 - wT - wN - wS - dW - wC) / (fitAll ? 4 : 3);
      // (between the nav's items and the socials since — "move the dot between nav items and socials", the same day)
      var xN = cL + 20 + wT + gF, xD = xN + wN + gF, xS = xD + dW + gF;
      fbX = { the: cL + 20, new: xN, critic: xS, copy: cR - 20 - wC, mid: xD + dW / 2 };
      if (!fitAll) fbX.critic = cR - 20 - wS;
      // THE BAND'S LINE SPREAD (2026-10-13 — "Move the top band margins to 54px. Move copyright to the bottom THE
      // LATEST column. spaced same distance as top band items are from the rule. Move dot to top right of THE latest
      // column set 27px from side and top. Move THe last Magazine to the center of the top band. socials on right, nav
      // items on left"): the list 54 from the left, The Last Magazine on the window's middle, the socials to 54 from
      // the right; the copyright on the side column's middle, its baseline as far over the window's foot as the line's
      // over the band's rule; the dot 27 in from the column's outer side and 27 under the rule (fbDot)
      var fbDot = null, fbCopyY = null, colY = null;
      if (SPREAD) {
        if (cpyF) cpyF.style.removeProperty('display');
        wC = txw(cpyF);
        var rwF = railN ? railN.offsetWidth : 0, colMid = onL ? rwF / 2 : vwF - rwF / 2;
        // (across the band's own span since it went to the content's column's foot: cL to cR)
        fbX = { the: (cL + cR) / 2 - wT / 2, new: cL + 54, critic: cR - 54 - wS, copy: colMid - wC / 2, mid: 0 };
        // THE BAND'S MARKS (2026-10-14 — "Move the nav band into a top band that runs edge to edge. Move the wordmark
        // into the top left, move the bird into the middle", "Make margins around wordmark 20px", "Add it [The Last
        // Magazine] to the right of the band"): THE NEW CRITIC 20 from the window's left, THE LAST MAGAZINE 20 from its
        // right, as big as lets the two and the bird between them fill the band across ("Make wordmarks bigger to fit
        // the size of the band") — the band's height less two 20s at most — the bird as tall as their capitals ("Make
        // Bird the same height as the letters") and midway between them ("Center bird between the two wordmarks"), a
        // word space either side, all on the band's middle
        var bmW = st.querySelector('.band-mark--words'), bmB = st.querySelector('.band-mark--bird'), bmT = st.querySelector('.band-mark--tlm');
        if (FOOT_TOP && bmW && bmB) {
          var bandH = 2 * FB_AIR + capH, stT = st.getBoundingClientRect().top, runT = rr0(run) - stT;
          var WM_M = 20, AR_B = 0.9676;
          var lwB = parseFloat(bmW.style.getPropertyValue('--bm-lw')) || 14.9;
          var lwT = bmT ? parseFloat(bmT.style.getPropertyValue('--bm-lw')) || 17.9 : 0;
          var twB = bmW.querySelector('.tnc-words'), gB = twB ? parseFloat(twB.style.getPropertyValue('--tw-space')) || 1.3846 : 1.3846;
          var capB = Math.min(bandH - 2 * WM_M, (cR - cL - 2 * WM_M) / (lwB + lwT + AR_B + 2 * gB));
          var yB = (bandH - capB) / 2 - runT;
          var wordsR = cL + WM_M + capB * lwB, tlmL = cR - WM_M - capB * lwT;
          bmW.style.setProperty('font-size', capB.toFixed(3) + 'px');
          bmW.style.setProperty('left', (cL + WM_M).toFixed(2) + 'px');
          bmW.style.setProperty('top', yB.toFixed(2) + 'px');
          if (bmT) {
            bmT.style.setProperty('font-size', capB.toFixed(3) + 'px');
            bmT.style.setProperty('left', tlmL.toFixed(2) + 'px');
            bmT.style.setProperty('top', yB.toFixed(2) + 'px');
          }
          var birdW = capB * AR_B, birdX = ((bmT ? tlmL : cR - WM_M) + wordsR) / 2 - birdW / 2;
          bmB.style.setProperty('height', capB.toFixed(2) + 'px');
          bmB.style.setProperty('width', birdW.toFixed(2) + 'px');
          bmB.style.setProperty('left', birdX.toFixed(2) + 'px');
          bmB.style.setProperty('top', yB.toFixed(2) + 'px');
          // THE LINE IN THE COLUMN (2026-10-14 — "Move nav itmes and socials. Nav to the top of the Latest, set 20px
          // from the top of column and Socials 20px from the bottom of the column"): both on the column's middle, the
          // nav's capitals 20 under the band's rule, the socials' baseline 20 over the window's foot; riding out with
          // the column as it shuts, as the copyright does (style.css, THE LINE IN THE COLUMN)
          var colMidL = onL ? rwF / 2 : vwF - rwF / 2;
          fbX.new = colMidL - wN / 2;
          fbX.critic = colMidL - wS / 2;
          colY = { new: { y: st.getBoundingClientRect().bottom + 20 + capH, foot: false }, critic: { y: stT + vh - 20, foot: true } };
        }
        var dHt = dotF ? dotF.getBoundingClientRect().height : 0;
        // (at the column's foot since, 27 from its outer side and 27 over the window's foot, its foot on the copyright's
        // baseline — "Move dot to the bottom right of the column", 2026-10-13; the copyright kept 20 clear of it)
        // (across, halfway from the copyright's end to the column's outer side since — "set halfway between copright
        // and side", the copyright on the column's middle again)
        fbDot = { x: onL ? fbX.copy / 2 : (fbX.copy + wC + vwF) / 2, y: st.getBoundingClientRect().top + vh - 27 - dHt / 2 };
        // (54 over the window's foot since — "Increase top and bottom to 54px", the Latest column's, 2026-10-13)
        // (and back to 27 — "have the copyright be only 27px bottom margin", The Latest still 54 under the rule)
        fbCopyY = st.getBoundingClientRect().top + vh - 27;
      }
    }
    [].forEach.call(items, function (u) {
      var key = u.classList.contains('band-under--the') ? 'the' : u.classList.contains('band-under--new') ? 'new' : 'critic';
      var w = words[key], ur = u.getBoundingClientRect();
      // (from the word's first stroke since — "Left align under each word"; the copyright to CRITIC's last — "Move
      // copyright to the right of CRITIC". Read off the text's own run, not the box, which a font's side bearing
      // pads)
      var tr = document.createRange(); tr.selectNodeContents(u); var tb = tr.getBoundingClientRect();
      var right = u.classList.contains('band-under--copy');
      // (The Last Magazine from the T's stem since — "Left align with stem of T": THE's first outline, the T, its
      // leftmost point in its lower half, under the bar)
      var x0 = w.l;
      if (key === 'the') { var sx = stemOfT(st.querySelector('.band-logo__top svg path')); if (sx != null) x0 = sx; }
      var left = (parseFloat(u.style.getPropertyValue('left')) || 0) + (right ? w.r - tb.right : x0 - tb.left);
      // (read where it stands unslid: the copyright rides out with the column as it shuts, on a transform — "Move
      // copyright to the bottom THE LATEST column")
      var uTx = 0; try { uTx = new DOMMatrixReadOnly(getComputedStyle(u).transform).m41 || 0; } catch (e) { uTx = 0; }
      // (and the band's words, which ride with the band as the column shuts on their translate — "bottom band should
      // expand and collapse with side column")
      uTx += parseFloat((getComputedStyle(u).translate || '0').split(' ')[0]) || 0;
      if (fbX) left = (parseFloat(u.style.getPropertyValue('left')) || 0) + ((right ? fbX.copy : fbX[key]) - (tb.left - uTx));
      void ur;
      var colB = colY && !right ? colY[key] : null;
      var atFoot = (right && fbCopyY != null) || !!(colB && colB.foot);
      var top = (parseFloat(u.style.getPropertyValue('top')) || 0) + ((colB ? colB.y : atFoot ? fbCopyY : base) - probe(u));
      u.style.setProperty('left', left.toFixed(2) + 'px', 'important');
      u.style.setProperty('top', (FOOT_BAND && !FOOT_TOP) || atFoot ? 'calc(100svh + ' + (top - vh).toFixed(2) + 'px)' : top.toFixed(2) + 'px', 'important');
    });
    void rr;
    // (THE DOT UNDER CRITIC'S LAST C, 2026-10-11 — "Move the theme dot under the final C in the nav bar vertically
    // centered and centered under C": the dot's middle under the middle of the last C's ink, read off CRITIC's
    // outline — its subpath that starts furthest right — and on the middle of the line's capitals, which is the
    // middle of the air from the name's foot to the band's; style.css, THE DOT UNDER CRITIC'S LAST C)
    // (under THE's E since — "move dot to under e of THE", 2026-10-11: the same, off THE's outline)
    // (its right on the E's right since — "have the dot align with the right of E", 2026-10-11)
    var dot = run && run.querySelector(':scope > .theme-toggle.chip-dot:not(.chip-dot--rail)');
    var lowPath = st.querySelector('.band-logo__top svg path');
    var cm = lowPath && lowPath.getScreenCTM && lowPath.getScreenCTM();
    if (dot && cm) {
      var lastC = null;
      ((lowPath.getAttribute('d') || '').match(/M[^M]*/g) || []).forEach(function (sp) {
        var n = sp.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || [], lo = Infinity, hi = -Infinity;
        for (var k = 0; k < n.length; k += 2) { var x = +n[k]; if (x < lo) lo = x; if (x > hi) hi = x; }
        if (!lastC || lo > lastC[0]) lastC = [lo, hi];
      });
      if (lastC) {
        var cx = cm.a * lastC[1] + cm.e;
        var cy = base - (c0.base - c0.cap) / 2;
        var dr = dot.getBoundingClientRect(), ds = getComputedStyle(dot);
        // (read where it stands unslid: shut, the column's width is on its translate)
        var dTx = parseFloat((ds.translate || '0').split(' ')[0]) || 0;
        var dl = (parseFloat(ds.left) || 0) + (fbDot ? fbDot.x - (dr.left - dTx + dr.width / 2) : fbX ? fbX.mid - (dr.left + dr.width / 2) : cx - dr.right);
        var dt = (parseFloat(ds.top) || 0) + ((fbDot ? fbDot.y : cy) - (dr.top + dr.height / 2));
        st.style.setProperty('--dot-l', dl.toFixed(2) + 'px');
        st.style.setProperty('--dot-t', FOOT_BAND && !FOOT_TOP ? 'calc(100svh + ' + (dt - vh).toFixed(2) + 'px)' : dt.toFixed(2) + 'px');
      }
    }
    // (the copyright under CRITIC only where it clears the socials by 20 — "Copyright to colophon" where it does
    // not: back in the colophon's box under Est.; style.css, main.band-copy-colo)
    var soc = st.querySelector('.sub-ticker-run > .band-under--critic'), cpy = st.querySelector('.sub-ticker-run > .band-under--copy');
    if (soc && cpy) {
      var rg = document.createRange(); rg.selectNodeContents(soc); var sR = rg.getBoundingClientRect().right;
      rg.selectNodeContents(cpy); var cL = rg.getBoundingClientRect().left;
      // (no longer: the copyright stands only in the opening since 2026-10-11, and fades as the band shuts — THE NAME
      // OPENS BIG)
      void cL; void sR; main.classList.remove('band-copy-colo');
      // (in the foot band, standing always, only where it clears the socials by 20 — THE LINE IN THE FOOT BAND)
      if (FOOT_BAND && !SPREAD) cpy.style.setProperty('visibility', cL - sR >= 20 ? 'visible' : 'hidden', 'important');
      else cpy.style.removeProperty('visibility');
    }
  };
  var seatColo = function () {
    var st = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
    var co = document.querySelector('.page-rows > .section-band--colophon.colo');
    var dek = st && st.querySelector('.sub-ticker-run b');
    var name = co && co.querySelector('.colo-name');
    var ink = name && name.querySelector('.band-logo__line');
    var run = co && co.querySelector('.colo-run');
    var row = run && run.querySelector('span');
    if (!dek || !ink || !row) return;
    var props = ['--colo-name-mt', '--colo-run-mt', '--colo-run-mb'];
    if (!wideLogo.matches || !main.classList.contains('wm-banded')) {
      props.forEach(function (p) { co.style.removeProperty(p); });
      return;
    }
    var d = capsOf(dek), w = capsOf(row);
    if (!d || !w) return;
    var air = d.cap - st.getBoundingClientRect().top;
    var c = co.getBoundingClientRect(), k = ink.getBoundingClientRect();
    var ns = getComputedStyle(name), rs = getComputedStyle(run);
    var set = function (p, v) { v = v.toFixed(2) + 'px'; if (co.style.getPropertyValue(p) !== v) co.style.setProperty(p, v); };
    set(props[0], parseFloat(ns.marginTop) + air - (k.top - c.top));
    set(props[1], parseFloat(rs.marginTop) + air - (w.cap - k.bottom));
    set(props[2], parseFloat(rs.marginBottom) + air - (c.bottom - w.base));
  };
  seatLogo(document.querySelector('.page-rows > .head-rail > .sub-ticker--top'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { logoW = -1; seatColo(); });
  addEventListener('resize', function () { seatLogo(document.querySelector('.page-rows > .head-rail > .sub-ticker--top')); }, { passive: true });
  var LIST_NAV = true;
  var bandCtx = null;
  var RAIL_NAME_CAPS = 13.1338;
  var bandGeo = function (st) {
    if (window.__ncOpenClear) window.__ncOpenClear();
    if (!st) return null;
    seatLogo(st);
    var run = st.querySelector(':scope > .sub-ticker-run');
    var low = st.querySelector('.band-logo__low svg path');
    var birdInk = st.querySelector(BIRD_INK);
    if (!run || !low || !birdInk) return null;
    var vw = document.documentElement.clientWidth;
    // (the swallow in the band beside THE LATEST, its ink 54 off the
    // column's rule — the cards' edge — and at the window's 54 when the
    // column is shut, sliding between with it: "bird should move over into
    // band and slide", 2026-10-05; the words of the strip end there too)
    // (at the window's 54 whatever the column does since later that day —
    // "have the latest column only sit next to content column, nav band
    // and wordmark band should stretch all the way": both bands run the
    // window's width over the column, the swallow and the strip's last
    // word 54 off its edge, standing still as the column slides)
    // (27 since 2026-10-07 — "Have the wordmark and the bird sit 27px from
    // the sides in the top band": the swallow's box 27 off the window's edge)
    // (18 since 2026-10-07 — "Move stamp and wordmark to sit 18px from the
    // sides": the swallow's box 18 off the window's right edge, no longer
    // centred on the column, and the name 18 off its left)
    var tgtR = vw - 18;   // (27 for a moment, then "move side margins back to 54px")
    // (THE BIRD BETWEEN THE NEW AND CRITIC, 2026-10-07, at the user's word —
    // "Move the bird between THE NEW and CRITIC": the swallow's box 27
    // after NEW's last stroke, and CRITIC 27 after the box — --low-shift
    // on CRITIC, style.css — the list then centred between CRITIC's last
    // stroke and the window's 27, x1R)
    // (the name centred in the window since 2026-10-09 — "Center the wordmark": its ink, THE's first stroke to
    // CRITIC's last with the bird between, halfway across; read before the bird's seat below, which follows it)
    var lgC = st.querySelector('.band-logo');
    // (THE and CRITIC read where the grid sets them: their carry out to the sides, below, let go first)
    [].forEach.call(st.querySelectorAll('.band-logo__top, .band-logo__mid, .band-logo__low'), function (el) { el.style.removeProperty('translate'); });
    if (lgC) {
      var inkC = function (sel) {
        var l = Infinity, r = -Infinity;
        [].forEach.call(st.querySelectorAll(sel), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) { l = Math.min(l, qr.left); r = Math.max(r, qr.right); } });
        return isFinite(l) ? { l: l, r: r } : null;
      };
      var cT = inkC('.band-logo__top svg path'), cM = inkC('.band-logo__mid svg path'), cL = inkC('.band-logo__low svg path');
      var cB = birdInk.getBoundingClientRect();
      if (cT && cM && cL && cB.width) {
        var wAll = (cM.r - cT.l) + 2 * (cM.l - cT.r) + cB.width + (cL.r - cL.l);
        var left0 = parseFloat(getComputedStyle(lgC).left) || 0;
        lgC.style.setProperty('left', (left0 + (vw - wAll) / 2 - cT.l).toFixed(2) + 'px', 'important');
      }
    }
    var mid = st.querySelector('.band-logo__mid svg path'), mr = mid && mid.getBoundingClientRect();
    // (back at the right the same day — "move bird back to the right": no target inside the name)
    // (and between them again since 2026-10-09 — "Move the bird betwen THE NEW and Critic": the bird's box as far
    // after NEW's last stroke as NEW's first stands after THE's last, and CRITIC as far after the box)
    var inkX = function (sel) {
      var l = Infinity, r = -Infinity;
      [].forEach.call(st.querySelectorAll(sel), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) { l = Math.min(l, qr.left); r = Math.max(r, qr.right); } });
      return isFinite(l) ? { l: l, r: r } : null;
    };
    var theX = inkX('.band-logo__top svg path'), newX = inkX('.band-logo__mid svg path');
    var WORD_GAP = theX && newX ? newX.l - theX.r : 27;
    var tgtL = newX ? newX.r + WORD_GAP : null;
    // (THE BIRD AFTER CRITIC, 2026-10-09 — "Move the bird to the right of Critic": CRITIC straight after NEW, a word's
    // gap, and the bird's box as far after CRITIC's last stroke)
    // (and back between THE NEW and CRITIC the same day, once the stack had gone to the column — "Move the bird
    // between THE NEW and CRITIC": THE and CRITIC at the 20s, NEW and the bird evenly between)
    // (and after CRITIC again since 2026-10-10 — "move bird to the right of CRITIC": THE at the left's 20, the bird's
    // box at the right's, NEW and CRITIC evenly between, the three gaps one)
    // (and back between NEW and CRITIC 2026-10-10 — "Move bird back to between NEW and Critic")
    // (and after CRITIC again 2026-10-11 — "move the bird to the right of Critic"; then back between the same day —
    // "Move bird back to between New and Critic and expand gaps by 15%")
    var BIRD_LAST = false;
    if (BIRD_LAST) {
      var lowE0 = st.querySelector('.band-logo__low');
      if (lowE0) { lowE0.style.setProperty('margin-left', '0px', 'important'); lowE0.style.removeProperty('--low-shift'); }
      var lowX0 = inkX('.band-logo__low svg path');
      tgtL = lowX0 ? lowX0.r + WORD_GAP : null;
    }
    void mr;
    var lowEl = st.querySelector('.band-logo__low');
    // (THE STAMP OVER THE COLUMN, 2026-10-07, at the user's word — "center
    // stamp above the The Latest column": the swallow's box centred on the
    // column's middle rather than its ink on the window's 54; the window's
    // 54 still where there is no column)
    var railEl = document.querySelector('.page-rows .latest-rail--latest'), rrc = railEl && railEl.getBoundingClientRect();
    var railMid = rrc && rrc.width ? (rrc.left + rrc.right) / 2 : null;
    var sliding = main.classList.contains('rail-anim');
    var dxNow = parseFloat(st.style.getPropertyValue('--bird-dx')) || 0;
    var dx, x1u, br0;
    if (sliding) {
      // (mid-slide the swallow is carried from where it stands, so its
      // easing runs from there and is not set back first)
      br0 = birdInk.getBoundingClientRect();
      if (!br0.width) return null;
      dx = dxNow + (tgtL != null ? tgtL - br0.left : tgtR - br0.right);
      x1u = bandGeo.x1u != null ? bandGeo.x1u : br0.left - dxNow;
    } else {
      st.style.setProperty('--bird-dx', '0px');
      // (x1 read at the swallow's old size, so the column's width holds:
      // THE NAV OVER THE NAME draws it smaller)
      var bs = st.style.getPropertyValue('--bird-s');
      if (bs) st.style.setProperty('--bird-s', '1');
      x1u = birdInk.getBoundingClientRect().left;
      bandGeo.x1u = x1u;
      if (bs) st.style.setProperty('--bird-s', bs);
      br0 = birdInk.getBoundingClientRect();
      if (!br0.width) return null;
      dx = tgtL != null ? tgtL - br0.left : tgtR - br0.right;
    }
    // (the name's left the swallow's distance from the window's right —
    // "match wordmark margin with the bird margin" / "I meant side margin")
    var lg = st.querySelector('.band-logo');
    // (no longer: the name is centred above — "Center the wordmark")
    void lg;
    void railMid;
    st.style.setProperty('--bird-dx', dx.toFixed(2) + 'px');
    if (lowEl) {
      // (CRITIC's shift read off where it stands unshifted, so the gap after
      // the box is 27 whatever the grid gives)
      // (written on CRITIC itself, over whatever margin the sheet gives it;
      // nothing written while the bird stands at the right)
      if (BIRD_LAST) {
        lowEl.style.setProperty('margin-left', '0px', 'important');
      } else if (tgtL != null) {
        lowEl.style.setProperty('margin-left', '0px', 'important');
        var lr0 = low.getBoundingClientRect();
        var shift = (lr0.width ? Math.max(0, tgtL + br0.width + WORD_GAP - lr0.left) : 0).toFixed(2) + 'px';
        lowEl.style.setProperty('--low-shift', shift);
        lowEl.style.setProperty('margin-left', shift, 'important');
      } else { lowEl.style.removeProperty('margin-left'); lowEl.style.removeProperty('--low-shift'); }
    }
    // (THE and CRITIC carried out to the sides since 2026-10-09 — "Move THE and CRITIC out to sit the same distance
    // from the top as the sides": THE's first ink and CRITIC's last as far from the window's edges as the name's ink
    // is from the band's top, 20 — seatLogo's air; NEW and the bird stay where the centring set them)
    if (wideLogo.matches) {
      var outX = function (sel) {
        var l = Infinity, r = -Infinity;
        [].forEach.call(st.querySelectorAll(sel), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) { l = Math.min(l, qr.left); r = Math.max(r, qr.right); } });
        return isFinite(l) ? { l: l, r: r } : null;
      };
      var topOut = st.querySelector('.band-logo__top'), oT = outX('.band-logo__top svg path'), oC = outX('.band-logo__low svg path');
      if (topOut && oT) topOut.style.setProperty('translate', (WM_SIDE - oT.l).toFixed(2) + 'px 0px', 'important');
      // (the bird last since — THE BIRD AFTER CRITIC: THE at the left's 20 and the bird's box at the right's, NEW and
      // CRITIC evenly between, the three gaps one, ink to ink)
      var oBl = birdInk.getBoundingClientRect(), midL = st.querySelector('.band-logo__mid'), oTl = outX('.band-logo__top svg path'), oNl = outX('.band-logo__mid svg path');
      if (BIRD_LAST && lowEl && oC && oBl.width && midL && oTl && oNl) {
        var bdxL = parseFloat(st.style.getPropertyValue('--bird-dx')) || 0;
        var bL = vw - WM_SIDE - oBl.width;
        // (the stack and a word's gap at the right since — THE NAV STACKED AT THE RIGHT)
        // (and the bird after the stack since — "Move bird to the right of The last magazine stack": the bird's box at
        // the right's 20, the stack before it, NEW, CRITIC and the stack evenly between THE and the bird, all four
        // gaps one; the stack's right edge left for band() to set the lines on, navRightX)
        var sWL = NAV_STACK ? navStackW(st) : 0;
        // (read from where the bird stands unslid: through the column's slide its translate is on its way, so
        // its box is not where --bird-dx says — "Bird is moving with column collapse")
        var birdSvg = st.querySelector('.band-logo__bird');
        var txNow = birdSvg ? parseFloat((getComputedStyle(birdSvg).translate || '0').split(' ')[0]) || 0 : bdxL;
        st.style.setProperty('--bird-dx', (bL - (oBl.left - txNow)).toFixed(2) + 'px');
        var gL = (bL - oTl.r - (oNl.r - oNl.l) - (oC.r - oC.l) - sWL) / (sWL ? 4 : 3);
        navRightX = sWL ? bL - gL : null;
        midL.style.setProperty('translate', (oTl.r + gL - oNl.l).toFixed(2) + 'px 0px', 'important');
        lowEl.style.setProperty('translate', (oTl.r + gL + (oNl.r - oNl.l) + gL - oC.l).toFixed(2) + 'px 0px', 'important');
      } else
      if (lowEl && oC) lowEl.style.setProperty('translate', (vw - WM_SIDE - oC.r).toFixed(2) + 'px 0px', 'important');
      // (and NEW and the bird evenly between them since — "Space NEW and the bird evenly between THE and CRITIC": the
      // three gaps, THE to NEW, NEW to the bird and the bird to CRITIC, one, ink to ink)
      var midOut = st.querySelector('.band-logo__mid'), oT2 = outX('.band-logo__top svg path'), oC2 = outX('.band-logo__low svg path'), oN = outX('.band-logo__mid svg path'), oB = birdInk.getBoundingClientRect();
      if (!BIRD_LAST && midOut && oT2 && oC2 && oN && oB.width) {
        // (THE to NEW the words' gap, NEW to the bird and the bird to CRITIC BIRD_TUCK short of it)
        var tuck = BIRD_TUCK * (WM_SCALE === 1 ? GAP_K : 1);
        var gW = (oC2.l - oT2.r - (oN.r - oN.l) - oB.width + 2 * tuck) / 3, gB = gW - tuck;
        midOut.style.setProperty('translate', (oT2.r + gW - oN.l).toFixed(2) + 'px 0px', 'important');
        // (read from where the bird stands unslid, as with the bird last: through the column's slide its translate
        // is on its way — "Bird is moving with column collapse")
        var birdSv2 = st.querySelector('.band-logo__bird');
        var txNow2 = birdSv2 ? parseFloat((getComputedStyle(birdSv2).translate || '0').split(' ')[0]) || 0 : (parseFloat(st.style.getPropertyValue('--bird-dx')) || 0);
        st.style.setProperty('--bird-dx', ((oT2.r + gW + (oN.r - oN.l) + gB) - (oB.left - txNow2)).toFixed(2) + 'px');
      }
    }
    var words = [].filter.call(run.children, function (c) {
      return !c.classList.contains('band-logo') && c.offsetWidth && c.querySelector('b');
    });
    bandCtx = bandCtx || document.createElement('canvas').getContext('2d');
    var ink = words.map(function (c) {
      // (a word's ink inside its box: the face's own bearings, and the
      // tracking after its last letter, which the box keeps)
      var b = c.querySelector('b'), r = b.getBoundingClientRect(), cs = getComputedStyle(b);
      bandCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var t = cs.textTransform === 'uppercase' ? b.textContent.toUpperCase() : b.textContent;
      var m = bandCtx.measureText(t), n = Array.from(t).length || 1;
      var tr = (r.width - m.width) / n;
      var bx = c.getBoundingClientRect();
      var l = r.left - m.actualBoundingBoxLeft, rr = r.left + m.actualBoundingBoxRight + tr * (n - 1);
      return { l: l, r: rr, inL: l - bx.left, inR: bx.right - rr, w: bx.width, bL: r.left - l, bR: r.right - rr, word: b.textContent.trim() };
    });
    var x0L = Infinity;
    [].forEach.call(st.querySelectorAll('.band-logo svg:not(.band-logo__bird) path'), function (pth) {
      var pr = pth.getBoundingClientRect(); if (pr.width) x0L = Math.min(x0L, pr.left);
    });
    var lr = low.getBoundingClientRect();
    // (THE SWALLOW AT THE FAR RIGHT AGAIN, 2026-10-06 — "Mover bird to far
    // right and nav items to center": its last ink on the window's 54
    // gutter; it stood after the name, then between the name and the list,
    // earlier the same day)
    // (x1 the swallow's first ink where it stood before it was carried to
    // the gutter, so the column's edge stands where it stood)
    // (THE COLUMN'S WIDTH HELD, 2026-10-06 — "Why is the Latest column
    // shrinking?" / "Fix the column's width": the column's edge was read
    // from CRITIC's last stroke, so each widening of the drawing narrowed
    // the column. It is read instead from where CRITIC ended when the
    // column was set — RAIL_NAME_CAPS of the band's cap from the name's
    // first stroke (THE, NEW and CRITIC as they then stood, 11.8886 caps,
    // and the two 0.6226 gaps) — so the column holds whatever the drawing
    // does; the words in the band still spread from CRITIC itself, x0)
    // (and of the cap as it then stood, since 2026-10-06 — "make
    // wordmark/bird larger in top band" / "keep the latest column at its
    // old size": the band's cap grew a quarter, so the column's edge reads
    // the cap the column was set at, min(43.37, (window − 655) × 0.07992),
    // not the band's own)
    var capPx = Math.min(43.37, (document.documentElement.clientWidth - 655) * 0.07992);
    seatUnder(st);
    return { words: words, ink: ink, x0L: x0L, x0: lr.right, x0Rail: x0L + RAIL_NAME_CAPS * capPx, x1: x1u, x1R: tgtR };
  };
  // (where STORE's right and ARCHIVE's left would stand were the words
  // evenly between CRITIC's last stroke and the swallow's first ink, one
  // gap before, between and after them: the column's edge, halfway)
  window.__ncEvenMid = function () {
    var st = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
    // (the words read in their old face — the strip's capitals — so the
    // column's edge stands where it stood when they became a list in the
    // Garamond: THE NAV IN THE NAME'S BAND, 2026-10-06)
    if (st && LIST_NAV) st.classList.add('nav-measure');
    var geo, bdx0 = st ? st.style.getPropertyValue('--bird-dx') : '';
    try { geo = bandGeo(st); } finally {
      if (st && LIST_NAV) {
        st.classList.remove('nav-measure');
        // (and the swallow back where band() seated it)
        if (bdx0) st.style.setProperty('--bird-dx', bdx0);
      }
    }
    if (!geo || geo.ink.length < 2) return null;
    var ink = geo.ink, inkAll = ink.reduce(function (a, k) { return a + (k.r - k.l); }, 0);
    var G = (geo.x1 - geo.x0Rail - inkAll) / (ink.length + 1);
    var x = geo.x0Rail, pos = ink.map(function (k) { x += G; var L = x; x += (k.r - k.l); return { L: L, R: x, k: k }; });
    var s = pos.filter(function (q) { return /^store,?$/i.test(q.k.word); })[0], a = pos.filter(function (q) { return /^archive,?$/i.test(q.k.word); })[0];
    if (!s || !a) return null;
    return ((s.R + s.k.bR) + (a.L + a.k.bL)) / 2;
  };
  if (!rails.length || !main) return;
  var STRIP_SETTLED = 144;
  // ONE COLUMN, ITS WORDS CHANGING (2026-10-04, at the user's words —
  // "Remove right column section dividers altogether"; "Just fade
  // out/replace content"): the sections' columns are one, the first's,
  // charcoal from the band to the colophon, and every section's words
  // stand in its hold in one place, one at a time — the section of the
  // post across the window's middle (light, below) — the last fading out
  // and then the next in (style.css, ONE COLUMN). The other columns stand
  // empty and unseen.
  var hold0 = rails[0].querySelector('.latest-rail__hold');
  // (each section's list and View all open to their own height, --open-h,
  // so the opening runs smooth: THE OPENING SMOOTHER, style.css)
  var openH = function () {
    if (!hold0) return;
    [].forEach.call(hold0.querySelectorAll(':scope > .latest-rail__in > .latest-rail__list, :scope > .latest-rail__in > .latest-rail__all'), function (el) {
      // (the content's own extent, its first box's top to its last's
      // bottom: scrollHeight ran 6-7 past it, so the opening list reached
      // its height before the shutting one reached 0 and the names settled
      // a pixel back at the end — NO WOBBLE, style.css)
      var kids = el.children, h;
      if (kids.length) {
        var top = el.getBoundingClientRect().top + (parseFloat(getComputedStyle(el).paddingTop) || 0);
        // (to the last item's deepest inline box, not its own: the words
        // stand 20 on an 18 line, so the link's box runs under the item's
        // and the list, overflow hidden, shaved the descenders — "g's
        // getting cut off in the latest column", 2026-10-07)
        var lastK = kids[kids.length - 1], bot = lastK.getBoundingClientRect().bottom;
        [].forEach.call(lastK.querySelectorAll('*'), function (d) { var dr = d.getBoundingClientRect(); if (dr.height) bot = Math.max(bot, dr.bottom); });
        h = Math.ceil(bot - top) + 'px';
      } else h = el.scrollHeight + 'px';
      if (el.style.getPropertyValue('--open-h') !== h) el.style.setProperty('--open-h', h);
    });
  };
  ['load', 'resize', 'newcritic:fit', 'newcritic:fitdone', 'newcritic:settled'].forEach(function (ev) {
    addEventListener(ev, openH, { passive: true });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(openH);
  rails.forEach(function (r, i) {
    var inn = r.querySelector('.latest-rail__in');
    if (!inn) return;
    inn.setAttribute('data-sec', r.getAttribute('data-sec'));
    if (i === 0) { inn.classList.add('is-current'); return; }
    if (hold0) hold0.appendChild(inn);
    r.classList.add('is-merged');
    r.setAttribute('aria-hidden', 'true');
  });
  var wordsOf = function (rail) {
    return document.querySelector('.latest-rail__in[data-sec="' + rail.getAttribute('data-sec') + '"]') || rail;
  };
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
    // (from the window's top since 2026-10-05, where it opens on the band
    // from 1024 up — "Have the latest column stretch up into top band too";
    // "Recenter what's in the latest column with new size": its hold the
    // window's height, its words centred in it)
    if (main.classList.contains('wm-banded') && window.matchMedia('(min-width: 1024px)').matches) settled = 0;
    var br = body.getBoundingClientRect();
    var bodyTop = br.top + (window.pageYOffset || 0);
    var tops = rails.map(function (rail, i) {
      if (i === 0) return Math.max(0, rest + settled - bodyTop);
      var cs = cardsOf(rail.getAttribute('data-sec'));
      // (the column from its section's first picture's top, its divider
      // over its head on that line — "Section divider should align with
      // the top of the content, so no double spacing between sections",
      // 2026-10-04: the sections 54 apart, as the rows)
      return cs.length ? picTop(cs[0]) - br.top : null;
    });
    // A DIVIDER BETWEEN THE SECTIONS (2026-10-04, at the user's words —
    // "Have a 72px Charcoal Divider between the sections"; then "section
    // dividers should actually be 54px and blue"; then "section dividers
    // should be charcoal actually"; "I want dividers to be 36px"; "Set
    // section dividers to 9px"; "Want dividers to be blue"; "Section
    // divider should only be in the ... right column"; "Section divider
    // should align with the top of the content"): the mark's blue, 9 tall,
    // across the column only (style.css, THE DIVIDERS IN THE COLUMN), its
    // top on the next section's first picture's top, the sections the
    // rows' 54 apart (duo-panel-fit.js, SECTION_GAP); the column before
    // runs to it, the next starts under it. (Stood down the same day —
    // "Remove right column section dividers altogether": ONE COLUMN.)
    // SECTIONS PIN AT THEIR END (2026-10-04, at the user's word — "When
    // sections end, should pin to bottom, and divider should pull over
    // top"): a section's last row holds where it stands once the section's
    // foot (the next divider's top) reaches the window's foot — sticky, its
    // top a window less the row's depth to that foot — and its column holds
    // with it (the column runs on to the rows' end); the next section comes
    // up over both, its divider first, on a sheet of the page's white that
    // runs from the divider to the rows' end. Each section stands a level
    // over the last (z, four to a section: sheet, column, rows, divider).
    // (The rows' pin stood down the same day — "With this new format, don't
    // pin the left column ever": the stacking stands, the pin does not.)
    rails.forEach(function (rail, i) {
      var top = tops[i];
      if (top == null) return;
      var key = rail.getAttribute('data-sec');
      setImp(rail, 'top', top.toFixed(2) + 'px');
      // (on the colophon's top from 1024 up, the colophon under the whole
      // site — style.css, THE COLOPHON UNDER THE WHOLE SITE: --rail-foot)
      setImp(rail, 'bottom', 'var(--rail-foot, 0px)');
      // (the one column that stands, the first, over every section's rows
      // since 2026-10-05, so the rule over a card's dek runs under it —
      // "passing under the image and under the latest")
      setImp(rail, 'z-index', String(i === 0 ? 4 * rails.length + 2 : 4 * i + 2));
      secWraps(key).forEach(function (w) {
        w.__z = 4 * i + 3;
        w.style.setProperty('position', 'relative');
        w.style.setProperty('z-index', String(w.__z + (w.querySelector('.is-open, .is-opening, .is-shutting') ? 1 : 0)));
        // (the rows no longer pin at their section's end — "With this new
        // format, don't pin the left column ever", 2026-10-04, once every
        // column stood on the right: they run on up the window with the
        // page, the next section's divider and sheet following them up)
        w.style.removeProperty('top');
      });
      // (no divider and no sheet between the sections since "Remove right
      // column section dividers altogether": one column, ONE COLUMN above)
    });
    // (THE COLOPHON PUSHED THE BAND OFF twice on 2026-10-04 — "When the
    // colophon arrives, it should push the top band out of view", then
    // "top band should release" — and then "Band shouldn't release": the
    // band holds to the page's end, and its blue rule comes up over it as
    // the colophon comes — THE RULE COMES UP OVER THE BAND, in band())
    var rail0 = document.querySelector('.page-rows > .head-rail');
    if (rail0) rail0.style.removeProperty('bottom');
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
      [].forEach.call(wordsOf(rail).querySelectorAll('.latest-rail__list a[data-slug]'), function (a) { links[a.getAttribute('data-slug')] = a; });
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
    // (the window less the foot band too — THE LINE IN THE FOOT BAND)
    var fb = main.classList.contains('foot-band-top') ? 0 : parseFloat(getComputedStyle(main).getPropertyValue('--foot-band')) || 0;
    var y = (window.pageYOffset || 0) + band + (window.innerHeight - fb - band) / 2;
    var best = null, bestD = Infinity;
    spans.forEach(function (sp) {
      var d = y < sp.t ? sp.t - y : y > sp.b ? y - sp.b : 0;
      if (d < bestD) { bestD = d; best = sp; }
    });
    var now = best ? spans.filter(function (sp) { return sp.row === best.row; }).map(function (sp) { return sp.a; }) : [];
    // (THE BRACKETS AS FAST AS THE PAGE, 2026-10-04, at the user's word —
    // "Vary the bracket fade depending on scroll speed": each fade, out and
    // then in, takes 300ms of travel's worth at the speed the page is going
    // — 0.4s at a slow read and no slower ("I like .4 as the max"), down to
    // 0.12s at a fling — read as the change happens; 0.4s before the page
    // has moved. style.css, --bk-t)
    var moved = now.length !== lit.length || now.some(function (a) { return lit.indexOf(a) < 0; });
    if (moved) {
      var bt = speed > 0 ? Math.max(0.12, Math.min(0.4, 300 / speed)) : 0.4;
      var bv = bt.toFixed(3) + 's';
      if (rails[0].style.getPropertyValue('--bk-t') !== bv) rails[0].style.setProperty('--bk-t', bv);
    }
    lit.forEach(function (a) { if (now.indexOf(a) < 0) a.classList.remove('is-now'); });
    now.forEach(function (a) { a.classList.add('is-now'); });
    lit = now;
    // (the column's words the lit post's section's: ONE COLUMN)
    var key = best ? best.rail.getAttribute('data-sec') : null;
    if (key && !goKey) openSec(key);
  };
  var curKey = rails[0].getAttribute('data-sec');
  var openSec = function (key) {
    if (key === curKey || !hold0) return;
    curKey = key;
    [].forEach.call(hold0.querySelectorAll(':scope > .latest-rail__in'), function (w) {
      w.classList.toggle('is-current', w.getAttribute('data-sec') === key);
    });
  };
  // (ONE SECTION OPENS ON THE WAY, 2026-10-06 — "When you're in the latest,
  // and you click editor's picks, editor's picks opens and closes twice":
  // the smooth scroll to a pressed section passed every section between,
  // and the column opened and shut each in turn. A press now opens its
  // section at once (newcritic:railgo, THE COLUMN TAKES YOU TO THE CARD)
  // and the column holds it while the page travels, taking up the page
  // again once the scroll has been still a moment.)
  var goKey = null, goT = 0;
  var goEnd = function () { goKey = null; light(); };
  addEventListener('newcritic:railgo', function (ev) {
    var k = ev.detail;
    if (!k) return;
    goKey = k;
    openSec(k);
    clearTimeout(goT);
    goT = setTimeout(goEnd, 600);
  });
  addEventListener('scroll', function () {
    if (!goKey) return;
    clearTimeout(goT);
    goT = setTimeout(goEnd, 180);
  }, { passive: true });
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
      // SPREAD FROM EDGE TO EDGE (2026-10-05, at the user's words — "Should
      // be spread out between edges of wordmark/bird"; "Realign ink of bird
      // with 54px gutter"): the words stand in the band's strip under the
      // name now, from the name's first stroke to the swallow's last, its
      // ink on the 54 gutter — SUBSCRIBE's ink at the one, THE LAST
      // MAGAZINE's at the other, one gap between each word's ink and the
      // next (bandGeo; the column's edge is still read from where STORE and
      // ARCHIVE stood evenly between CRITIC and the swallow: evenMid).
      // (through the column's slide the words are seated at once and
      // carried from where they stood by a transform, on the column's own
      // easing — not eased by their margins, which ran at the page's pace,
      // not the column's: "band sliding at different pace from column")
      var flip = main.classList.contains('rail-anim');
      var runKids = run ? [].filter.call(run.children, function (c) { return !c.classList.contains('band-logo') && c.offsetWidth && c.querySelector('b'); }) : [];
      var was0 = flip ? runKids.map(function (c) { return c.getBoundingClientRect().left; }) : null;
      var geo = bandGeo(st);
      var words = geo ? geo.words : [], ink = geo ? geo.ink : [];
      words.forEach(function (c) { c.style.removeProperty('margin-left'); });
      // THE NAV IN THE NAME'S BAND (2026-10-06, at the user's words — "Move
      // the nav band elements into a comma separated Garamond italic list
      // between the wordmark and logo. Same size as the deks"): the words
      // stand together as one line, its middle halfway between CRITIC's
      // last stroke and the swallow's first ink (style.css, THE NAV IN THE
      // NAME'S BAND, sets them and their commas)
      if (run && geo && words.length && LIST_NAV) {
        // (at the far right for a while that day — "move nav items to the
        // far right" — and centred between the name and the swallow again
        // since: "Mover bird to far right and nav items to center", the
        // list's ink halfway between CRITIC's last stroke and the swallow's
        // first ink)
        var fb0 = words[0].getBoundingClientRect(), lb0 = words[words.length - 1].getBoundingClientRect();
        var inkL0 = fb0.left + (ink[0] ? ink[0].inL : 0), inkR0 = lb0.right - (ink[ink.length - 1] ? ink[ink.length - 1].inR : 0);
        // (between CRITIC's last stroke and the swallow's first ink again,
        // the swallow back at the right: "move bird back to the right")
        var bi0 = st.querySelector(BIRD_INK).getBoundingClientRect();
        // (the bird in the name since 2026-10-09 — "Move the bird betwen THE NEW and Critic": the list then halfway
        // between CRITIC's last stroke and the window's 18)
        var rightB = bi0.left > geo.x0 ? bi0.left : geo.x1R;
        void rightB;
        // (and centred in the window on its own line under the name since 2026-10-09 — "move the nav into a line
        // beneath the wordmark": seatLogo sets it down)
        var lead0 = Math.round(document.documentElement.clientWidth / 2 - (inkL0 + inkR0) / 2);
        // (then its first ink on the left of the T's stem — "Left align the nav items with the ink of the stem of the
        // T": read off THE's drawing, across from its left 0.7 of the way down, past the crossbar, to the first ink)
        var tPath = st.querySelector('.band-logo__top svg path');
        if (tPath && tPath.isPointInFill && tPath.getScreenCTM) {
          var tb = tPath.getBBox(), ty = tb.y + 0.7 * tb.height, tm = tPath.getScreenCTM(), tx = null;
          for (var sx = tb.x; sx <= tb.x + tb.width; sx += tb.width / 2000) {
            if (tPath.isPointInFill(new DOMPoint(sx, ty))) { tx = sx; break; }
          }
          if (tx != null && tm) lead0 = +((tm.a * tx + tm.c * ty + tm.e) - inkL0).toFixed(2);
        }
        words.forEach(function (c) { c.classList.remove('nav-before-tlm'); });
        if (NAV_STACK) {
          // (stacked at the right: each word's last ink on the band's 20 — THE NAV STACKED AT THE RIGHT)
          var vwS = document.documentElement.clientWidth;
          words.forEach(function (c) { c.style.setProperty('left', '0px', 'important'); });
          // (every line's commas settled first: a comma lost on one line moves the words after it on another)
          navLines(st).forEach(function (ln) { ln.forEach(function (c, i) { c.classList.toggle('nav-before-tlm', i === ln.length - 1); }); });
          navLines(st).forEach(function (ln) {
            var dl = ((navRightX != null ? navRightX : vwS - 20) - navInk(ln[ln.length - 1]).r).toFixed(2) + 'px';
            ln.forEach(function (c) { c.style.setProperty('left', dl, 'important'); });
          });
          // (THE LAST MAGAZINE centred over the line under it, which keeps the 20 — "Center The Last Magazine on top of
          // Subscribe line")
          var nls = navLines(st);
          if (nls.length === 2 && nls[0].length === 1 && nls[0][0].classList.contains('sub-ticker-half--tlm')) {
            var tl = nls[0][0], lo = nls[1], tk = navInk(tl), lk0 = navInk(lo[0]), lk1 = navInk(lo[lo.length - 1]);
            // (and the line under it in by half the difference when THE LAST MAGAZINE is the wider, so the wider line
            // keeps the 20 — the line under it in the bylines' small capitals since 2026-10-09)
            var over = (tk.r - tk.l) - (lk1.r - lk0.l);
            if (over > 0) {
              lo.forEach(function (c) { c.style.setProperty('left', ((parseFloat(c.style.getPropertyValue('left')) || 0) - over / 2).toFixed(2) + 'px', 'important'); });
              lk0 = navInk(lo[0]); lk1 = navInk(lo[lo.length - 1]);
            }
            var tlL = parseFloat(tl.style.getPropertyValue('left')) || 0;
            tl.style.setProperty('left', (tlL + (lk0.l + lk1.r) / 2 - (tk.l + tk.r) / 2).toFixed(2) + 'px', 'important');
          }
        } else
        words[0].style.setProperty('margin-left', lead0 + 'px', 'important');
        // (THE LAST MAGAZINE stood apart at the right for a while that day — under CRITIC's last C, then as far from
        // the window's right as SUBSCRIBE from its left — and back in the list after ARCHIVE since: "Move the last
        // magazine back")
        st.style.setProperty('--band-lead', '0px');
        st.style.setProperty('--band-trail', '0px');
      } else if (run && geo && ink.length > 1) {
        var inkAll = ink.reduce(function (a, k) { return a + (k.r - k.l); }, 0);
        // (the strip at the window's foot across the rows' side alone —
        // "have the band stetch only across left column", 2026-10-05: the
        // words to the cards' edge, 54 off THE LATEST's, the strip under the
        // column; the column shut, the words the window's width — THE NAV
        // AT THE FOOT, style.css)
        var g = (geo.x1R - geo.x0L - inkAll) / (ink.length - 1);
        var rb = run.getBoundingClientRect(), rcs = getComputedStyle(run);
        var padL = parseFloat(rcs.paddingLeft), padR = parseFloat(rcs.paddingRight);
        var lead = (geo.x0L - ink[0].inL) - (rb.left + padL);
        var trail = Math.max(0, (rb.right - padR) - (geo.x1R + ink[ink.length - 1].inR));
        if (g > 0) {
          // (the first word's own margin carries the lead, which may be
          // under nothing: SUBSCRIBE's ink can stand a hair left of the row's
          // padding, where the name's first stroke is)
          words[0].style.setProperty('margin-left', lead.toFixed(2) + 'px', 'important');
          for (var wi = 1; wi < words.length; wi++) {
            words[wi].style.setProperty('margin-left', (g - ink[wi - 1].inR - ink[wi].inL).toFixed(2) + 'px', 'important');
          }
          st.style.setProperty('--band-lead', '0px');
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
      if (flip && was0) {
        runKids.forEach(function (c, i) {
          var d = was0[i] - c.getBoundingClientRect().left;
          c.style.setProperty('transition', 'none', 'important');
          c.style.setProperty('translate', d.toFixed(2) + 'px 0', 'important');
        });
        void st.offsetWidth;
        runKids.forEach(function (c) { c.style.removeProperty('transition'); c.style.setProperty('translate', '0px 0px', 'important'); });
      }
      // (the column's edge hangs on STORE and ARCHIVE: read it again)
      if (window.__ncRailEdge) window.__ncRailEdge();
    }
    // (the band's own width, for the bird's seat at its right — the bird
    // stands in the name, which stands out of the row)
    var bw = st.clientWidth.toFixed(2) + 'px';
    if (st.style.getPropertyValue('--band-w') !== bw) st.style.setProperty('--band-w', bw);
    // (the band leaves whole now, pushed off by the colophon — "top band
    // should release": its name and bird no longer fade, its words no
    // longer spread)
    var pr = 0;
    // THE RULE COMES UP OVER THE BAND (2026-10-04, at the user's words —
    // "When top band releases, have blue divider pull up over it, settling
    // at top of the page"; "But divider should pull up over pinned band";
    // "Band shouldn't release"): the band holds; from the colophon's top at
    // the window's foot, the band's blue rule comes up over it a pixel for
    // a pixel, the band cut off under the rule, till the rule stands at the
    // window's top, the band gone under it (--band-foot, --band-cover, on
    // the head rail, the band's own small box: style.css, THE RULE COMES
    // UP). Read off the band's foot and the colophon's top each frame.
    // THE BAND RELEASES AT THE COLOPHON (2026-10-04, later, at the user's
    // word — "Let top band release and scroll away, including divider at
    // the colophon reveal"): the band no longer holds while the rule comes
    // up over it; from the colophon's top at the window's foot the band
    // and its rule go up the window together a pixel for a pixel (the band
    // carried up by --band-cover — style.css, THE BAND RELEASES — the rule
    // seated at its foot less the same), till both are gone over the top.
    // (the band's foot read where it rests: less the cover it is carried
    // up by)
    var hr = st.parentElement;
    if (hr) {
      var was = parseFloat(hr.style.getPropertyValue('--band-cover')) || 0;
      var foot = Math.max(0, st.getBoundingClientRect().bottom + was);
      var rule = parseFloat(getComputedStyle(main).getPropertyValue('--band-rule')) || 0;
      var cover = Math.max(0, Math.min(foot + rule, window.innerHeight - co.getBoundingClientRect().top));
      // (none since 2026-10-09 — "Top band shouldn't scroll away on footer, everything should hold as normal": the
      // band holds at the colophon; style.css, THE BAND HOLDS AT THE FOOTER)
      cover = 0;
      // (where the page has scroll-driven animations the band, its ground
      // and the strip ride the colophon's own timeline on the compositor —
      // style.css, THE BAND SCROLLS AWAY ON THE PAGE'S OWN CLOCK: "Colophon
      // reveal still glitchy. Top band phases out", 2026-10-05 — so nothing
      // is carried from here, and the band's foot is read only while it
      // rests)
      if (RIDES && RIDES_W.matches) { if (cover > 0) foot = parseFloat(hr.style.getPropertyValue('--band-foot')) || foot; cover = 0; }
      var fv = foot.toFixed(2) + 'px', cv = cover.toFixed(2) + 'px';
      if (hr.style.getPropertyValue('--band-foot') !== fv) hr.style.setProperty('--band-foot', fv);
      if (hr.style.getPropertyValue('--band-cover') !== cv) hr.style.setProperty('--band-cover', cv);
      // (and the strip at the window's foot, which stands in the rows'
      // layer under THE LATEST, goes down as far — THE NAV AT THE FOOT)
      if (main.style.getPropertyValue('--foot-cover') !== cv) main.style.setProperty('--foot-cover', cv);
      // (the band's ground and the strip's stand on one sticky sheet in the
      // rows' layer — so they move with the page's overscroll as the band
      // does: "dividers should move on overscroll" — which the rows' end
      // the band's part goes up by the cover, the strip's down)
      // (by the cover alone: the sheet's margin takes back its whole height,
      // so the rows' end never pushes it — read against a push it was set
      // down by the push and stood mid-window as the colophon came:
      // "colophon reveal is broken", 2026-10-05)
      var ftv = (-cover).toFixed(2) + 'px', fbv = cover.toFixed(2) + 'px';
      if (main.style.getPropertyValue('--fill-top') !== ftv) main.style.setProperty('--fill-top', ftv);
      if (main.style.getPropertyValue('--fill-bot') !== fbv) main.style.setProperty('--fill-bot', fbv);
    }
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
  var RIDES = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')), RIDES_W = window.matchMedia('(min-width: 1024px)');
  band.seatLead = true;
  window.__ncBand = band;
  var ticking = false;
  // (the page's speed, px a second, eased over the last frames; a pause
  // of a fifth of a second starts it again — THE BRACKETS AS FAST AS THE
  // PAGE, in light())
  var speed = 0, lastY = null, lastT = 0;
  var gauge = function () {
    var t = performance.now(), y = window.pageYOffset || 0;
    if (lastY !== null && t - lastT > 0 && t - lastT < 200) {
      var v = Math.abs(y - lastY) / (t - lastT) * 1000;
      speed = speed ? speed * 0.6 + v * 0.4 : v;
    } else speed = 0;
    lastY = y; lastT = t;
  };
  addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    // (not the band while the name stands open or is shutting — THE NAME OPENS BIG: its pieces are carried by
    // animations, and nothing moves them under the scroll)
    requestAnimationFrame(function () { ticking = false; gauge(); light(); if (!(window.__ncOpenBusy && window.__ncOpenBusy())) band(); });
  }, { passive: true });
  addEventListener('newcritic:railshut', function () { band.seatLead = true; band(); });
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
  var measuring = false;
  var measure = function () {
    if (!wide.matches || measuring) return;
    // (never through the column's slide, which moves the swallow it reads;
    // and once at a time — the resize it sends brings it back)
    if (main.classList.contains('rail-anim')) return;
    measuring = true;
    try { measure0(); } finally { measuring = false; }
  };
  var measure0 = function () {
    if (window.__ncOpenClear) window.__ncOpenClear();
    // (read with the band's words at rest, not spread for the colophon)
    var p0 = strip.style.getPropertyValue('--colo-p');
    if (p0) { strip.style.setProperty('--colo-p', '0'); void strip.offsetWidth; }
    // (read where STORE and ARCHIVE would stand evenly between CRITIC and
    // the swallow, not where they are spread across the strip: SPREAD FROM
    // EDGE TO EDGE, in band())
    // THE COLUMN AT ITS OLD WIDTH (2026-10-07, at the user's word — "the
    // sidebar should go back to its old width"): the name and the stamp
    // moved to the window's 18s, which moved where the band's words would
    // stand evenly, so the edge is no longer read off them: it is the
    // edge they gave before, measured at 1024 to 2560 (617 at 1024, 949
    // at 1440, 1269 at 1920) — two thirds of the window less 11 from about
    // 1200 up, and the steeper line under that.
    var vwE = document.documentElement.clientWidth;
    var mid = Math.min(vwE * 2 / 3 - 11, 0.9773 * vwE - 383.75);
    // (a word's letters across the window, left to right: each outline's
    // run of x, the runs that overlap — a letter and its counter — as one)
    function letterRuns(path) {
      var d = path.getAttribute('d') || '';
      if (path.__runsD !== d) {
        path.__runsD = d;
        path.__runs = (d.match(/M[^M]*/g) || []).map(function (sp) {
          var n = sp.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || [], lo = Infinity, hi = -Infinity;
          for (var k = 0; k < n.length; k += 2) { var x = +n[k]; if (x < lo) lo = x; if (x > hi) hi = x; }
          return [lo, hi];
        }).sort(function (u, v) { return u[0] - v[0]; }).reduce(function (acc, r) {
          var last = acc[acc.length - 1];
          if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else acc.push([r[0], r[1]]);
          return acc;
        }, []);
      }
      var m = path.getScreenCTM && path.getScreenCTM();
      if (!m || !path.__runs.length) return null;
      return path.__runs.map(function (r) { return [m.a * r[0] + m.e, m.a * r[1] + m.e]; });
    }
    // (THE LATEST ON THE LEFT TO 20 PAST THE, 2026-10-09 — "Have the Latest
    // column stretch to 20px to the right of THE": with the column on the
    // left its right edge, the rule, stands 20 past THE's last ink. The
    // column is 100vw − 252 − the edge wide (--rail-col + 108), so the edge
    // is the window less 252 less that)
    // (OUT TO THE N, the same day — "Expand the latest to line up with the edge of the N": the rule, 2 wide at the
    // column's right, stands on NEW's first ink, its left edge on the N's)
    // (and midway between THE and NEW since — "Move The Latest column edge to between THE and NEW": the rule's
    // middle halfway from THE's last ink to NEW's first)
    // (the same width with the column on the right again — "Move The Latest column back to the right", 2026-10-09)
    if (document.querySelector('.latest-rail--l, .latest-rail--r')) {
      var newL = Infinity, theR = -Infinity;
      [].forEach.call(document.querySelectorAll('.sub-ticker--top .band-logo__mid svg path'), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) newL = Math.min(newL, qr.left); });
      [].forEach.call(document.querySelectorAll('.sub-ticker--top .band-logo__top svg path'), function (q) { var qr = q.getBoundingClientRect(); if (qr.width) theR = Math.max(theR, qr.right); });
      // (54 wider on the left since 2026-10-13 — "expand the side column by 54px", the column just gone left)
      if (isFinite(newL) && isFinite(theR)) mid = vwE - 252 - ((theR + newL) / 2 + 1) - 54;
      // THE GRID SQUARE (2026-10-13 — "Reduce The latest column size, keeping letter heights the same but reducing
      // spacing between letters to form a tighter more square grid"): the name's letters at the size the column gave
      // them at that width (its 20 and 22 in from the column's sides, --rn-span caps across), and the column as narrow
      // as makes the grid as wide as it is tall — four lines and three 20s — the 20 and 22 again round it (--rn-font;
      // style.css, THE GRID SQUARE)
      var rnS = document.querySelector('.page-rows .latest-rail .rail-name');
      if (rnS && isFinite(newL) && isFinite(theR) && main.classList.contains('name-in-rail')) {
        var spanS = parseFloat(rnS.style.getPropertyValue('--rn-span')) || 7.759;
        var fS = ((theR + newL) / 2 + 1 + 54 - 42) / spanS;
        main.style.setProperty('--rn-font', fS.toFixed(3) + 'px');
        // (and no narrower than keeps the columns' letters clear of each other across — "Widen it tho so that letters
        // don't overlap": --rn-min, build.js)
        var minS = (parseFloat(rnS.style.getPropertyValue('--rn-min')) || 0) * fS;
        mid = vwE - 252 - (Math.max(4 * fS + 3 * 20, minS) + 42);
        // (three words since — the column CRITIC's width at that size and the 20 and 22 round it)
        var critS = parseFloat(rnS.style.getPropertyValue('--rn-critic'));
        if (rnS.classList.contains('rail-name--words') && critS > 0) {
          // (the column 54 wider — "Expand the latest column by 54px", 2026-10-13 — the letters growing back into it)
          // (and back by 54 since — "Reduce the latest column size by 54px", the name gone over the content)
          // (and 36 wider since — "Make the latest column 36px wider. Make the bird and wordmark bigger accordingly",
          // 2026-10-14: the stamp's words and bird drawn to the column's width, so they grow with it)
          var RN_WIDER = 36;
          mid = vwE - 252 - (critS * fS + 42 + RN_WIDER);
          // (the bird as tall as the three lines and their two 20s, at the name's right, its beak — the left fifth of
          // its box — free to reach over the words; the letters as much smaller as lets CRITIC stand 20 clear of the
          // rest of it, the column as it was — "I want the bird to be the size of the three lines, the beak can
          // overhang. Reduce the size of the letters if needed", 2026-10-13)
          var birdS = rnS.querySelector('.rail-name__bird'), arS = birdS ? parseFloat(birdS.style.getPropertyValue('--bird-ar')) || 1 : 0;
          if (arS) {
            var wN = critS * fS + RN_WIDER, BEAK = 0.2;
            var fB = (wN - 20 - (1 - BEAK) * arS * 40) / (critS + (1 - BEAK) * arS * 3);
            // (two lines since, THE/NEW and CRI/TIC on each side of the bird, the bird as tall as the two and their 20,
            // its body 20 clear of each side, the beak over THE/NEW — "The new and critic in line on each side of the bird")
            var rnL = parseFloat(rnS.style.getPropertyValue('--rn-l')), rnR = parseFloat(rnS.style.getPropertyValue('--rn-r'));
            if (rnS.classList.contains('rail-name--pair') && rnL > 0 && rnR > 0)
              fB = (wN - 40 - arS * 20) / (rnL + rnR + arS * 2);
            // (the bird's whole ink centred between the sides' since, 20 clear of each — "Bird should be centered
            // between ink")
            if (fB < fS) main.style.setProperty('--rn-font', fB.toFixed(3) + 'px');
          }
        }
      }
      // (and on the right, between CRITIC's R and its first I since —
      // "Have the edge of the latest column stretch to between the R and
      // the I of critic", 2026-10-09: the rule's middle halfway from the R's
      // last ink to the I's first, the letters read off the word's outline,
      // its pieces merged where they overlap across)
      var lowP = document.querySelector('.latest-rail--r') && document.querySelector('.sub-ticker--top .band-logo__low svg path');
      var runs = lowP && letterRuns(lowP);
      // (at that width still since the bird went after CRITIC — "Keep previous width", 2026-10-10: the R/I gap read
      // as if CRITIC ended on the window's 20, CRITIC's own reach from the gap to its last stroke off the window less
      // the 20, so the column holds where it stood whatever CRITIC's place)
      // (and at the width it had with the name at 0.9 since the name went to 0.81 — "Widen the Latest column to
      // previous size", 2026-10-10: CRITIC's reach from the gap read at the 0.9 name's size, so the column holds
      // where it stood whatever the name's size)
      // (18 wider since 2026-10-11 — "expand the latest column by 18px")
      // (and 18 again with the MAILLE name, 2026-10-13 — "Expand the latest column by 18px"; and 36 more, "Expand the
      // latest column by 36px"; and 54 more, "expand side column by 54px again")
      // (not with the name over the content since — "Move the latest column to the right", 2026-10-13: the column the
      // width the name-in-rail sizing above gave it, the same on either side)
      if (runs && runs.length > 2 && !main.classList.contains('name-in-rail')) mid = (vwE - 20) - (runs[runs.length - 1][1] - (runs[1][1] + runs[2][0]) / 2) * (0.9 / (window.__ncWmScale || 0.9)) - 1 - 252 - 18 - 18 - 36 - 54;
    }
    void word;
    if (p0) strip.style.setProperty('--colo-p', p0);
    if (mid == null) return;
    // (on a whole pixel, so the column's rule and the strip's end stand on
    // whole pixels, the same raster on the page and in the slide's own
    // layer — "Seeing a flash on column collapse in vertical rule",
    // 2026-10-05)
    mid = Math.round(mid);
    // (the column's rule handed to the page's root too, for its run on into the overscroll at the page's foot —
    // "Have the vertical rule run into overscroll on the bottom", 2026-10-09; style.css, THE RULE INTO THE
    // OVERSCROLL: its left edge, the column's width less its 2)
    // (on the right the rule is the column's left edge, the window less the column's width)
    var rx = (document.querySelector('.latest-rail--l') ? vwE - mid - 252 - 2 : mid + 252).toFixed(2) + 'px';
    if (document.documentElement.style.getPropertyValue('--nc-rule-x') !== rx) document.documentElement.style.setProperty('--nc-rule-x', rx);
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

// THE COLUMN TAKES YOU TO THE CARD (2026-10-04, at the user's word — "When
// you click an element in the latest column I want it to take you to that
// post's card"): from 1024 up a post in the column, pressed, brings its
// card up to the first card's seat — its frame (or its picture) the rule's
// 9 and 54 under the band's foot — rather than leaving for the post; a
// press with a modifier, or the middle button, still opens the post itself.
(function () {
  var wide = window.matchMedia('(min-width: 1024px)');
  document.addEventListener('click', function (e) {
    if (!wide.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // (and the next section's name at the column's foot, the last's at its
    // head: THE NEXT SECTION FORETOLD, build.js)
    // (the last section's Colophon cue: to the page's end)
    var toEnd = e.target && e.target.closest && e.target.closest('a.latest-rail__cue[data-to="colophon"]');
    if (toEnd) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      return;
    }
    var a = e.target && e.target.closest && e.target.closest('.latest-rail__list a[data-slug], a.latest-rail__cue[data-slug]');
    // (a section's name, pressed, to its first card: EVERY SECTION IN THE
    // COLUMN, style.css)
    var name = !a && e.target && e.target.closest && e.target.closest('.latest-rail__in > .latest-rail__meta');
    if (name) a = name.parentElement.querySelector('.latest-rail__list a[data-slug]');
    if (!a) return;
    // (a section's cue goes to the archive, filtered, from its word since
    // 2026-10-06 — "Essays should hover, and send you to the archive with
    // a filter"; only its caret still brings the section's first card up)
    if (a.classList.contains('latest-rail__cue') && !e.target.closest('.latest-rail__caret')) return;
    var slug = a.getAttribute('data-slug');
    var card = slug && document.querySelector('.page-rows section.card[data-slug="' + slug + '"]');
    if (!card) return;
    var top = null, bot = null;
    var fr = card.querySelector('.card-frame');
    if (fr && fr.offsetWidth) { top = fr.getBoundingClientRect().top; bot = fr.getBoundingClientRect().bottom; }
    if (top == null) {
      var t = card.querySelector('.card-title.hl-rect.rx');
      if (t) top = t.getBoundingClientRect().top + (parseFloat(getComputedStyle(t, '::before').top) || 0);
    }
    if (top == null) top = card.getBoundingClientRect().top;
    var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
    var foot = strip ? strip.offsetHeight : 0;
    e.preventDefault();
    // (the column opens the pressed section now and holds it on the way:
    // ONE SECTION OPENS ON THE WAY)
    var sec = a.closest('.latest-rail__in');
    try { window.dispatchEvent(new CustomEvent('newcritic:railgo', { detail: sec && sec.getAttribute('data-sec') })); } catch (er) {}
    var rule = parseFloat(getComputedStyle(document.querySelector('main') || document.body).getPropertyValue('--band-rule')) || 0;
    // (the post's picture on the middle of the room between the head and the foot band since 2026-10-11 — "When I press
    // on a post, I want it to be vertically centered in viewport": the same air over and under it, where it stood 54
    // under the head; THE LINE IN THE FOOT BAND)
    var mn = document.querySelector('main');
    var fb = mn && mn.classList.contains('has-foot-band') && !mn.classList.contains('foot-band-top') ? (parseFloat(getComputedStyle(mn).getPropertyValue('--foot-band')) || 0) + rule : 0;
    var room = window.innerHeight - fb - (foot + rule);
    var air = bot != null && bot - top < room ? (room - (bot - top)) / 2 : 54;
    window.scrollTo({ top: Math.max(0, top + window.pageYOffset - foot - rule - air), behavior: 'smooth' });
  });
})();

// THE COLUMN SHUTS (2026-10-05, at the user's words — "I want to add a
// caret that closes the column, sliding it out of view and pulling the
// content into the center. A caret of a different position should then
// fade in that allows the viewer to expand the latest column again"): from
// 1024 up the caret in the column's corner slides the column out past the
// window's left and carries the rows half its width left, so they stand
// centred in the window (main.rail-is-shut; --rail-shift, a whole pixel so
// the frames keep their pixels); the caret at the window's edge brings it
// back. Only transforms move: the fitter's seats stand, and its column edge
// reads the same shift (duo-panel-fit.js, columnEdge).
(function () {
  var main = document.querySelector('main.wm-banded');
  var rail = document.querySelector('.latest-rail:not(.is-merged)') || document.querySelector('.latest-rail');
  if (!main || !rail) return;
  var shutBtn = rail.querySelector('.rail-shut'), openBtn = rail.querySelector('.rail-open');
  if (!shutBtn || !openBtn) return;
  var shift = function () {
    var op = rail.offsetParent;
    var left = (op ? op.getBoundingClientRect().left + op.clientLeft : 0) + rail.offsetLeft;
    // (the column on the right again since later on 2026-10-05: the rows
    // go half its width right — THE LATEST ON THE RIGHT AGAIN, style.css)
    var w = rail.classList.contains('latest-rail--r') ? document.documentElement.clientWidth - left : left + rail.offsetWidth;
    var v = Math.round(w / 2) + 'px';
    if (main.style.getPropertyValue('--rail-shift') !== v) main.style.setProperty('--rail-shift', v);
    // (and to the root, for the name over the content outside main, which slides with the rows — "Expansion/collapse
    // breaks wordmark. Should move with content to center too", 2026-10-13)
    document.documentElement.style.setProperty('--rail-shift', v);
  };
  // (the foot's strip and its words follow the column out and back —
  // THE NAV AT THE FOOT: their easing on before they move, only while the
  // column does)
  var animT = 0;
  var set = function (shut) {
    shift();
    main.classList.add('rail-anim');
    void main.offsetWidth;
    clearTimeout(animT);
    animT = setTimeout(function () { main.classList.remove('rail-anim'); }, 700);
    main.classList.toggle('rail-is-shut', shut);
    // (and on the root, whose overscroll carries the column's rule — none with the column shut)
    document.documentElement.classList.toggle('nc-rail-shut', shut);
    shutBtn.setAttribute('aria-expanded', String(!shut));
    openBtn.setAttribute('aria-expanded', String(!shut));
    shutBtn.tabIndex = shut ? -1 : 0;
    openBtn.tabIndex = shut ? 0 : -1;
    (shut ? openBtn : shutBtn).focus({ preventScroll: true });
    try { window.dispatchEvent(new Event('newcritic:railshut')); } catch (e) {}
  };
  shutBtn.addEventListener('click', function (e) { e.preventDefault(); set(true); });
  openBtn.addEventListener('click', function (e) { e.preventDefault(); set(false); });
  shift();
  addEventListener('resize', shift, { passive: true });
})();
// THE DOT AT THE LATEST'S TOP LEFT (2026-10-09, at the user's words — "move
// the dot to the top left of The Latest"): the box over The Latest's depth
// handed to the column's hold as --rail-nav-h, so the dot stands 18 under
// that box's rule (style.css, THE DOT AT THE LATEST'S TOP LEFT)
(function () {
  var nav = document.querySelector('.latest-rail__hold > .rail-nav');
  if (!nav) return;
  var hold = nav.parentElement;
  var put = function () {
    var v = nav.getBoundingClientRect().height.toFixed(2) + 'px';
    if (hold.style.getPropertyValue('--rail-nav-h') !== v) hold.style.setProperty('--rail-nav-h', v);
  };
  put();
  if (window.ResizeObserver) new ResizeObserver(put).observe(nav);
  else addEventListener('resize', put, { passive: true });
})();
// THE COLOPHON A BOX AT THE COLUMN'S FOOT (2026-10-09): the box's depth
// handed to its column as --rail-colo-h, the column's foot kept clear of
// its hold by it, so the hold rides up over the box as the page ends
// (style.css, THE COLOPHON A BOX AT THE COLUMN'S FOOT)
(function () {
  var box = document.querySelector('.latest-rail > .rail-colo');
  if (!box) return;
  // (on the page's main, so the colophon's band under the rows takes the
  // box's depth too — the rows end, then the column brings the box up:
  // "Wait for left column to end before right column reveals colophon")
  var host = box.closest('main') || box.parentElement;
  var put = function () {
    var v = box.getBoundingClientRect().height.toFixed(2) + 'px';
    if (host.style.getPropertyValue('--rail-colo-h') !== v) host.style.setProperty('--rail-colo-h', v);
  };
  put();
  if (window.ResizeObserver) new ResizeObserver(put).observe(box);
  else addEventListener('resize', put, { passive: true });
})();

// THE NAME OPENS BIG (2026-10-11, at the user's words — "I like the current size of the wordmark but on initial load I
// want the wordmark logo to load bigger, like it used to full width across then each element shrinks with scroll,
// pulling up the content and the latest column and settling as is now"): from 1024 up the page opens with the name at
// its old full size (1 / WM_SCALE of the settled), THE, NEW, the bird and CRITIC spread evenly across the band's span
// (THE's first stroke to CRITIC's last, the settled 20s), the line under the name and the dot on the big name's foot.
// The page's lift is that much less (--open-d, the name's growth in height; style.css, THE NAME OPENS BIG), so the
// band, the rows and the column all stand lower by it, and the first --open-d of scroll carries them up a pixel for a
// pixel while each piece shrinks and slides, straight, to where it settles. Drawn by a transform over the settled
// layout, so everything that reads the band (seatLogo, bandGeo, the column's edge) clears it first (__ncOpenClear).
// (A TRIGGER, NOT A SCRUB, since — "I want to try something else, a trigger in the scroll that collapses the top
// band", 2026-10-11, after the shrink drawn with the scroll read wobbly: the page opens with the name big; the first
// scroll down collapses the band on its own clock, 0.6 on the column's ease, the rows and the column coming up with
// it; back at the very top it opens again. The page's lift is the settled one throughout: at the opening the band, the
// rows and the column are carried down by the name's growth, by a transform, and the collapse takes it away — every
// move an animation the browser runs, none drawn by the script.)
(function () {
  var main = document.querySelector('main.has-mega.wm-banded');
  var st = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
  if (!main || !st || !document.body.animate) return;
  var wide = window.matchMedia('(min-width: 1024px)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MIN_GAP = 24, DUR = 600, EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
  // (geo: the pieces and the opening, read with the band as it settles; anims: the animations while the name stands
  // open or is on its way — none once it has shut; stale: the band moved since it was read)
  var geo = null, anims = [], stale = true, dir = 0;
  var dur = function () { return still.matches ? 1 : DUR; };
  var els = function () {
    var q = function (sel) { return [].slice.call(st.querySelectorAll(sel)).filter(function (e) { return e.getBoundingClientRect().width > 0; }); };
    return { row: q('.band-logo__top, .band-logo__mid, .band-logo__low, .band-logo__bird'),
      under: q('.sub-ticker-run > .band-under'), dot: q('.sub-ticker-run > .theme-toggle.chip-dot:not(.chip-dot--rail)') };
  };
  var drop = function () { anims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = []; };
  // (a piece's move at p of the way from the opening to where it settles)
  var tfAt = function (t, p) {
    var k = t.k0 + (1 - t.k0) * p;
    var X = t.X + (t.l - t.X) * p, Y = t.Y + (t.t - t.Y) * p;
    var ax = (X - (t.ox + k * (t.l - t.ox))) / t.sx, ay = (Y - (t.oy + k * (t.t - t.oy))) / t.sy;
    // (the dot's own transform is the sheet's, held !important: it moves by its translate, unscaled)
    if (t.tr) return ax.toFixed(2) + 'px ' + ay.toFixed(2) + 'px';
    return 'translate(' + ax.toFixed(2) + 'px, ' + ay.toFixed(2) + 'px) scale(' + k.toFixed(4) + ')' + t.base;
  };
  // (read with nothing carried: every animation gone first)
  var measure = function () {
    drop();
    stale = false;
    geo = null;
    main.style.removeProperty('--open-d');
    if (!wide.matches) { main.classList.remove('nc-opening'); return; }
    var E = els();
    if (E.row.length < 2) { main.classList.remove('nc-opening'); return; }
    var bt = st.getBoundingClientRect().top;
    // (each piece read where it settles, and how a transform of its own moves it: the point a scale holds still and
    // what a pixel of translate comes to on the page. The bird's own transform is the sheet's, held !important, which
    // no animation overrides: its drawing moves instead — the frame and the two paths, in the one space of its
    // viewBox — read off the frame)
    var read = function (el) {
      var bird = el.classList.contains('band-logo__bird');
      var mv = bird ? [].slice.call(el.children) : [el], pr = mv[0] || el;
      var R = el.getBoundingClientRect(), P = pr.getBoundingClientRect(), m0 = getComputedStyle(pr).transform;
      var base = m0 && m0 !== 'none' ? ' ' + m0 : '';
      pr.style.setProperty('transform', 'scale(2)' + base, 'important');
      var P2 = pr.getBoundingClientRect();
      pr.style.setProperty('transform', 'translate(100px, 100px)' + base, 'important');
      var P3 = pr.getBoundingClientRect();
      pr.style.removeProperty('transform');
      return { el: el, mv: mv, base: base, l: R.left, t: R.top - bt, w: R.width, h: R.height,
        ox: 2 * P.left - P2.left, oy: 2 * (P.top - bt) - (P2.top - bt), sx: (P3.left - P.left) / 100 || 1, sy: (P3.top - P.top) / 100 || 1 };
    };
    var row = E.row.map(read).sort(function (a, b) { return a.l - b.l; });
    var under = E.under.map(read), dot = E.dot.map(read);
    var words = row.filter(function (t) { return !t.el.classList.contains('band-logo__bird'); });
    var y0 = Math.min.apply(null, words.map(function (t) { return t.t; }));
    var wmH = Math.max.apply(null, words.map(function (t) { return t.t + t.h; })) - y0;
    var span = row[row.length - 1].l + row[row.length - 1].w - row[0].l;
    var W = row.reduce(function (a, t) { return a + t.w; }, 0), n = row.length;
    var K = 1 / (window.__ncWmScale || 0.9);
    if ((span - K * W) / (n - 1) < MIN_GAP) K = (span - MIN_GAP * (n - 1)) / W;
    if (!(K > 1.001) || !(wmH > 0)) { main.classList.remove('nc-opening'); return; }
    var G = (span - K * W) / (n - 1);
    var D = Math.round((K - 1) * wmH);
    // (the opening in the band's own frame, the band carried D down the window: the name from the window's 20)
    var x = row[0].l;
    row.forEach(function (t) { t.X = x; t.Y = (y0 - D) + K * (t.t - y0); t.k0 = K; x += K * t.w + G; });
    var wordOf = function (cls) { return row.filter(function (t) { return t.el.classList.contains(cls); })[0]; };
    var pin = function (t, w) { t.k0 = 1; t.Y = t.t; t.X = w ? w.X + K * (t.l - w.l) : t.l; };
    under.forEach(function (t) {
      var c = t.el.classList;
      pin(t, wordOf(c.contains('band-under--the') ? 'band-logo__top' : c.contains('band-under--new') ? 'band-logo__mid' : 'band-logo__low'));
    });
    // (the dot's middle, under the C's)
    // (its right on the E's right since — "have the dot align with the right of E", 2026-10-11)
    dot.forEach(function (t) { var w = wordOf('band-logo__top'); t.k0 = 1; t.tr = true; t.sx = t.sy = 1; t.Y = t.t; t.X = w ? w.X + K * (t.l + t.w - w.l) - t.w : t.l; });
    // (the copyright's end on CRITIC's last stroke, the opening's too; and it is the opening's alone — "Have copyright
    // fade out on band collapse", 2026-10-11 — shown there where it clears the socials by 20, fading as the band
    // shuts)
    var cpy = null, soc = null;
    under.forEach(function (t) {
      var w = wordOf('band-logo__low');
      if (t.el.classList.contains('band-under--critic')) soc = t;
      if (w && t.el.classList.contains('band-under--copy')) { t.X = w.X + K * w.w - ((w.l + w.w) - t.l); cpy = t; }
    });
    // (what is carried down by the growth: the band's container, the rows that can be in the window near the top, and
    // the column's words — each on its own, by its translate, which nothing else here uses: the rows' own transform
    // is their slide and the rules' their drawing. Not the page's container, with the copyright carried back inside
    // it: two moves against each other, each set on whole pixels apart, and the copyright shook — "only thing that
    // wobbles on expansion is the copyright", 2026-10-11. It moves with the column's words now, like them — "Copyright
    // should move exactly like other elements in the latest column")
    var hold = document.querySelector('.page-rows .latest-rail .latest-rail__hold');
    var mb = document.querySelector('.page-rows > .movement > .movement-body');
    var sy0 = window.pageYOffset || 0, reach = window.innerHeight + 400;
    var shown = function (c) { var r = c.getBoundingClientRect(); return r.height > 0 && getComputedStyle(c).display !== 'none' && r.top + sy0 < reach; };
    // (gone before the socials reach it — "Have the copyright fade out before the socials get to it", 2026-10-11: the
    // gap between them closes evenly with the pieces' progress, and the copyright is out where it comes to 20)
    var g0 = cpy && soc ? cpy.X - (soc.X + soc.w) : 0, g1 = cpy && soc ? cpy.l - (soc.l + soc.w) : 0;
    var fadeAt = g0 > g1 ? Math.max(0.05, Math.min(1, (g0 - 20) / (g0 - g1))) : 1;
    geo = { D: D, all: row.concat(under, dot), fade: cpy && soc && g0 >= 20 ? cpy.el : null, fadeAt: fadeAt,
      page: [].slice.call(document.querySelectorAll('.page-rows > .head-rail'))
        .concat(mb ? [].filter.call(mb.children, function (c) { return !c.classList.contains('latest-rail') && shown(c); }) : [])
        .concat(hold ? [].filter.call(hold.children, function (c) { return getComputedStyle(c).display !== 'none'; }) : []) };
    // (the band's own ground and its rule at its foot: the band's ground and rule are painted by the first movement's
    // sticky cover, its ::before, held at the window's top by the sheet's !important — the band's ground hides that
    // rule and draws its own where the band ends, the same where it settles; and its container over the rows, which
    // are a layer of their own while they are carried; style.css, THE NAME OPENS BIG)
    main.classList.add('nc-opening');
  };
  // (every move one animation from the opening to the settled band, on the one clock and ease — the name's pieces, the
  // band, the rows and the column carried down by the growth, the copyright carried back to the window's foot — set
  // at time t and running r: 1 shutting, -1 opening, 0 held)
  var start = function (t, r) {
    drop();
    if (!geo) return;
    // (opening runs forward too, on keyframes from the settled band to the opening: run backward from a set start,
    // the browser's own drawing of it went its own way — the band open at once, then back — "Expansion still broken.
    // Everything moves together on collapse, not so on expansion. Sometimes glitches too", 2026-10-11)
    var rev = r < 0, c = rev ? dur() - t : t;
    var opt = { duration: dur(), easing: EASE, fill: 'both' };
    var add = function (el, a0, a1) { var a = el.animate(rev ? [a1, a0] : [a0, a1], opt); a.pause(); a.currentTime = c; anims.push(a); };
    geo.all.forEach(function (g) {
      var prop = g.tr ? 'translate' : 'transform', k0 = {}, k1 = {};
      k0[prop] = tfAt(g, 0); k1[prop] = tfAt(g, 1);
      g.mv.forEach(function (m) { add(m, k0, k1); });
    });
    geo.page.forEach(function (el) { add(el, { translate: '0px ' + geo.D + 'px' }, { translate: '0px 0px' }); });
    if (geo.fade) {
      // (keyframe offsets ride the eased progress, the pieces' own: out at fadeAt of the way to the settled band)
      var fz = geo.fadeAt, fk = rev ? [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 1 - fz }, { opacity: 1, offset: 1 }]
        : [{ opacity: 1, offset: 0 }, { opacity: 0, offset: fz }, { opacity: 0, offset: 1 }];
      var fa = geo.fade.animate(fk, opt); fa.pause(); fa.currentTime = c; anims.push(fa);
    }
    anims.rev = rev;
    dir = r;
    if (!r || !anims.length) return;
    // (running from c at once, all on one start: a fresh play() waits a frame to begin, and restarted every time the
    // band is read it would stand still)
    var t0 = document.timeline.currentTime;
    anims.forEach(function (a) { a.startTime = t0 - c; });
    var mine = anims;
    anims[0].onfinish = function () {
      if (anims !== mine) return;
      // (shut: nothing left carried; open: held at the opening)
      if (dir > 0) drop();
      dir = 0;
    };
  };
  // (where the name stands now — the time from the opening toward the settled band — and which way it runs)
  var now = function () {
    if (!anims.length) return null;
    var c = anims[0].currentTime || 0;
    return { t: anims.rev ? dur() - c : c, r: dir };
  };
  window.__ncOpenBusy = function () { return anims.length > 0; };
  // (anything that reads the band — seatLogo, bandGeo, the column's edge — reads it with nothing carried: the opening
  // stands down for the reading and comes back where it stood, at the same time, before the page is drawn again;
  // where the name is shut, the band is read again when it next opens)
  var back = null;
  window.__ncOpenClear = function () {
    if (!anims.length || back) return;
    back = now();
    drop();
    queueMicrotask(function () { var b = back; back = null; if (b && geo) start(b.t, b.r); });
  };
  // (shutting from where the name stands; opening from where it stands, or from the settled band, read again if it
  // has moved)
  var go = function (r) {
    if (r === dir) return;
    var b = now();
    if (r > 0) { if (b) start(b.t, 1); return; }
    if (b) { start(b.t, -1); return; }
    if (stale || !geo) measure();
    start(dur(), -1);
  };
  // (shut on the way down from the first pixel; open on the way up once within OPEN_AT of the top, so it is open by
  // the time the page gets there rather than starting once a trackpad's glide has died at the top — "expansion looks
  // worse than collapse", 2026-10-11 — and at the top whichever way it came)
  var OPEN_AT = 120, lastY = window.pageYOffset || 0;
  var onScroll = function () {
    var y = window.pageYOffset || 0, dy = y - lastY;
    lastY = y;
    if (!geo) return;
    var isOpen = anims.length && dir <= 0, isShut = !anims.length || dir > 0;
    if (dy > 0 && y > 0 && isOpen) go(1);
    else if ((y <= 0 || (dy < 0 && y <= OPEN_AT)) && isShut) go(-1);
  };
  // (read again when the page is laid anew, and the name set where it stood — open at the top of the page, shut below)
  var redo = function () {
    var b = now();
    measure();
    if (b) start(b.t, b.r);
    else if ((window.pageYOffset || 0) <= 0) start(0, 0);
  };
  var due = false;
  var ask = function () { if (due) return; due = true; requestAnimationFrame(function () { if (due) { due = false; redo(); } }); setTimeout(function () { if (due) { due = false; redo(); } }, 150); };
  addEventListener('scroll', onScroll, { passive: true });
  ['load', 'resize', 'newcritic:fitdone', 'newcritic:settled'].forEach(function (ev) { addEventListener(ev, ask, { passive: true }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ask);
  ask();
})();

// THE LATEST 27 UNDER THE RULE, THE BIRD AT THE COLUMN'S FOOT (2026-10-13 — "Have THE latest sit 27px under top
// rule"; "Then when the wordmark is fully covered, have the bird appear in the latest column 27px above the
// copyright", "Fade it in as the last 20% of the bird is scrolled over"): The Latest's capitals 27 under the band's
// rule (--rl-top); the name's bird at the column's foot at the name's bird's size, its wing tip 27 over the
// copyright's capitals (--rm-bottom), shown as the name's own goes under the band, from none while a fifth of it
// shows to all once none does (--rm-o); style.css
(function () {
  var main = document.querySelector('main.has-mega');
  if (!main) return;
  var capTop = function (el) {
    // (the capitals' top off the text's line: its baseline less the font's cap height, read by canvas)
    if (!el) return null;
    var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 0;
    var p = document.createElement('span'); p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(p); var base = p.getBoundingClientRect().top; el.removeChild(p);
    var cx = capTop.ctx || (capTop.ctx = document.createElement('canvas').getContext('2d'));
    cx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
    var m = cx.measureText('H');
    return base - (m.actualBoundingBoxAscent || fs * 0.66);
  };
  var seat = function () {
    // (the name over the content into main, under the band at the top as it scrolls — "wordmark should pass under top
    // band": main a stacking context of its own over everything outside it; the name's top off main's, which stands
    // above the document's top)
    var cnM = document.querySelector('a.content-name');
    if (cnM && cnM.parentElement !== main) main.appendChild(cnM);
    if (cnM) document.documentElement.style.setProperty('--cn-top-off', (-(main.getBoundingClientRect().top + (window.pageYOffset || 0))).toFixed(2) + 'px');
    if (!main.classList.contains('name-in-rail') || window.innerWidth < 1024) return;
    var hold = document.querySelector('.page-rows .latest-rail--latest > .latest-rail__hold');
    var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
    if (!hold || !strip) return;
    var ruleB = strip.getBoundingClientRect().top + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--strip-settled')) || 0);
    // (The Latest: its heading's capitals 27 under the rule)
    var first = hold.querySelector(':scope > .latest-rail__in');
    var head = first && (first.querySelector('.latest-rail__label, .latest-rail__head, h2, h3, a') || first);
    if (first && head) {
      var cur = parseFloat(getComputedStyle(first).marginTop) || 0, ct = capTop(head);
      if (ct != null) {
        // (54 since — "Increase top and bottom to 54px", the Latest column's, 2026-10-13)
        var want = cur + (ruleB + 54 - ct);
        // (no longer: the stack on the column's middle again since — "Vertically center the latest", 2026-10-13)
        void want;
      }
    }
    // (the bird: the name's bird's size and drawing's proportion; its foot 27 over the copyright's capitals)
    var mark = hold.querySelector(':scope > .rail-mark');
    var nb = document.querySelector('a.content-name .content-name__bird'), line = document.querySelector('a.content-name .content-name__line');
    var cn = document.querySelector('a.content-name');
    var cpy = strip.querySelector('.sub-ticker-run > .band-under--copy');
    if (!mark || !nb || !line || !cn) return;
    // (the stamp's capital: THE/NEW, the bird and CRI/TIC with their two half-capital gaps across the column less two
    // 27s — THE STAMP'S WORDS)
    var arB = parseFloat(cn.style.getPropertyValue('--bird-ar')) || 0.9676;
    var wl = parseFloat(mark.style.getPropertyValue('--rm-wl')) || 0, wr = parseFloat(mark.style.getPropertyValue('--rm-wr')) || 0;
    var railW = hold.parentElement ? hold.parentElement.offsetWidth : hold.offsetWidth;
    var availW = railW - 54;
    var rmH = availW / (wl + wr + 2 * 0.5 + 2.6022 * arB);
    // (the stamp the content's since, the hand-drawn letters on one line under the bird, the whole drawn to the line's
    // width across the column less two 27s — "Make that side wordmark/logo the center wordmark logo too", "Use the hand
    // drawn font": --rm-lw the line's width in capitals)
    // (the bird apart from the words since, over the copyright, as tall as it stood in the stamp before the words
    // went under it — "separate the bird to sit above The Copyright": --rm-hb)
    hold.style.setProperty('--rm-hb', rmH.toFixed(3) + 'px');
    var lw = parseFloat(mark.style.getPropertyValue('--rm-lw')) || 0;
    if (lw > 0) rmH = availW / lw;
    hold.style.setProperty('--rm-h', rmH.toFixed(3) + 'px');
    hold.style.setProperty('--rm-ar', arB.toFixed(4));
    var cT = cpy && capTop(cpy.firstElementChild || cpy);
    if (cT != null) hold.style.setProperty('--rm-bottom', (hold.getBoundingClientRect().bottom - (cT - 27)).toFixed(2) + 'px');
    fade();
  };
  var fade = function () {
    var hold = document.querySelector('.page-rows .latest-rail--latest > .latest-rail__hold');
    var strip = document.querySelector('.page-rows > .head-rail > .sub-ticker--top');
    var nb = document.querySelector('a.content-name .content-name__bird');
    if (!hold || !strip || !nb) return;
    var ruleB = strip.getBoundingClientRect().top + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--strip-settled')) || 0);
    var r = nb.getBoundingClientRect();
    // (no name over the content since — "Remove the big wordmark and bird at the top of the page", 2026-10-14: its
    // bird unseen, the column's words and bird shown outright)
    var shown = r.height ? Math.max(0, Math.min(1, (r.bottom - ruleB) / r.height)) : 0;
    var o = Math.max(0, Math.min(1, (0.2 - shown) / 0.2));
    hold.style.setProperty('--rm-o', o.toFixed(3));
  };
  window.addEventListener('scroll', fade, { passive: true });
  window.addEventListener('resize', function () { setTimeout(seat, 60); });
  document.addEventListener('newcritic:fit', function () { setTimeout(seat, 0); });
  window.addEventListener('load', function () { setTimeout(seat, 300); setTimeout(seat, 1500); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(seat, 200); });
  setTimeout(seat, 800);
  seat();
})();
