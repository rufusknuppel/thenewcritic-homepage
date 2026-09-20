// THE SUBSCRIBE BOX (2026-09-19). A yellow panel in the bottom right
// corner of every page, 36 off the side and 36 off the foot, carrying
// the About page's subscribe pitch. It is dealt on a HARD REFRESH and
// on a hard refresh alone; an X in its corner shuts it, and so does
// walking off the page.
//
// WHAT "REAPPEAR ON A HARD REFRESH, DISAPPEAR ON NAVIGATION" MEANS
// HERE. Three states have to be told apart, and the browser tells them
// apart for us — PerformanceNavigationTiming names the load 'reload',
// 'navigate' or 'back_forward':
//   - the box is shut by a flag in sessionStorage, which survives a
//     navigation within the tab and dies with the tab;
//   - a RELOAD clears that flag before it is read, so a refresh always
//     deals the box again, on whatever page the reader is standing;
//   - leaving the page SETS the flag (pagehide), so a reader who
//     clicks through the site is not handed the box again on the next
//     page whether or not they ever X'ed it.
// A click on a link shuts it on the spot as well, so the panel does
// not sit in the corner through the load of the page being opened.
//
// IT SHIPS HIDDEN. The markup carries `hidden` and this script takes
// it off, so a reader with no JavaScript is never shown a panel they
// would have no way to shut. The paint gate (build.js) holds the whole
// body at opacity 0 until the fonts and the covers settle, and this
// runs long before the gate lifts, so nothing flashes either way.
(function () {
  var KEY = 'nc-sub-box-shut';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  // ---- THE AIR IS EVEN ON FOUR SIDES, AND IT IS THE INK'S ----
  // A padding is measured to a text's BOX, and a box is not the ink:
  // Helvetica at line-height 1 holds its caps about 0.133em below the
  // top of its own box, and a 13/1.55 courier line carries its half-
  // leading below the last baseline as well as its descent. Measured on
  // the page, the panel's declared 32 came out as 34.92 of air over the
  // caps and 34.51 under the feet against 32.53 at the side — the
  // sides right and the two ends carrying an extra two and a half.
  // So the ends are seated off the INK, probed rather than predicted
  // (the fitter's own rule, duo-panel-fit.js): the cap of SUBSCRIBE and
  // the descender of the last line are each brought to exactly the
  // padding the sides stand at, by pulling the head up and the body
  // down by whatever the measurement says is over.
  // CAP TO BASELINE, AND A DESCENDER BREAKS THE EDGE. The foot is
  // seated on the last line's BASELINE, not on the tip of whatever
  // descender happens to hang off it — the site's own rule for the
  // highlight block, stated in style.css over .hl-ink and right for
  // the same reason: the eye reads the row of feet the letters stand
  // on, and a p or a y is a hanger below it, not the edge of the text.
  // Seated on the descender instead, the panel carried 34.64 of air
  // under the baseline against 32 over the caps, which is what read as
  // a heavy foot. It is now 32 to the baseline at the bottom and 32 to
  // the cap at the top, and the p of "parties" hangs the 2.64 it draws
  // into the padding, exactly as a descender hangs through its block.
  // (It follows that the foot does NOT move when the copy changes to a
  // line without a descender in it — which seating on the real ink
  // would have done, and which would have been a fault.)
  function probeBaseline(el) {
    var p = document.createElement('span');
    p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(p, el.firstChild);
    var b = p.getBoundingClientRect().bottom;
    p.remove();
    return b;
  }
  var measureCv = null;
  function inkOf(cs, text) {
    if (!measureCv) measureCv = document.createElement('canvas');
    var g = measureCv.getContext('2d');
    if (!g) return null;
    var fs = parseFloat(cs.fontSize) || 0;
    if (!fs) return null;
    try { g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing; } catch (e) {}
    g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    return g.measureText(text);
  }
  function seatAir(box) {
    var cs = getComputedStyle(box);
    // The measure every side is held to: the panel's own side padding.
    var pad = parseFloat(cs.paddingLeft);
    if (!isFinite(pad)) return;
    // Cleared first, so a second pass measures the sheet and not the
    // seat the last one wrote (the margins are dealt, not recomputed,
    // if they are read back in).
    box.style.removeProperty('--sub-lift');
    box.style.removeProperty('--sub-drop');
    var word = box.querySelector('.sub-box-word');
    var tail = box.querySelector('.sub-box-list li:last-child') || box.querySelector('.sub-box-body p');
    if (!word || !tail) return;

    var pr = box.getBoundingClientRect();
    var wcs = getComputedStyle(word);
    var wm = inkOf(wcs, (word.textContent || '').trim().toUpperCase());
    var wbase = probeBaseline(word);
    var tbase = probeBaseline(tail);
    if (!wm) return;

    var over = (wbase - wm.actualBoundingBoxAscent) - pr.top - pad;
    var under = pr.bottom - tbase - pad;
    if (isFinite(over)) box.style.setProperty('--sub-lift', (-over).toFixed(2) + 'px');
    if (isFinite(under)) box.style.setProperty('--sub-drop', (-under).toFixed(2) + 'px');
  }

  ready(function () {
    var box = document.querySelector('.sub-box');
    if (!box) return;

    // Storage throws outright in a private window on some browsers, so
    // every touch of it is guarded. With no store the box is dealt on
    // every load and shut only for the life of the page, which is the
    // right way to fail.
    var store = null;
    try { store = window.sessionStorage; } catch (e) {}
    function flag(on) {
      try { if (on) store.setItem(KEY, '1'); else store.removeItem(KEY); } catch (e) {}
    }

    // HOW THIS PAGE WAS ARRIVED AT. The modern entry first; the
    // deprecated performance.navigation behind it for anything that
    // has not caught up (1 is TYPE_RELOAD).
    var how = '';
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type) how = nav.type;
      else if (performance.navigation) how = performance.navigation.type === 1 ? 'reload' : 'navigate';
    } catch (e) {}
    if (how === 'reload') flag(false);

    var shut = false;
    try { shut = !!(store && store.getItem(KEY)); } catch (e) {}
    if (shut) return;

    box.hidden = false;
    // SEATED BEFORE IT IS SHOWN, and seated again when the fonts land:
    // the first measurement is taken off whatever face is rendering at
    // DOMContentLoaded, and the kit's Helvetica may not be it yet. The
    // paint gate holds the body invisible until the fonts settle
    // (build.js), so the correction is never watched happening.
    seatAir(box);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { seatAir(box); });
    }
    // The panel gives up its fixed measure on a narrow window, so the
    // lines re-wrap and the foot moves.
    var reseat = null;
    window.addEventListener('resize', function () {
      if (reseat) clearTimeout(reseat);
      reseat = setTimeout(function () { reseat = null; if (!box.hidden) seatAir(box); }, 120);
    });
    // Faded in where it stands rather
    // than travelled to — the cover cue's manner (style.css). The
    // frame between taking `hidden` off and adding the class is what
    // gives the transition a state to start from; without it the
    // browser coalesces the two and the panel simply appears.
    // AND A TIMER BEHIND THE FRAMES. requestAnimationFrame does not
    // run in a tab that has never been shown, so a box revealed by
    // frames alone stays at opacity 0 — not merely unanimated but
    // INVISIBLE — until the tab is looked at. That is right for the
    // fade and wrong as the only way in. The timer lands the same
    // class wherever the frames are starved; whichever arrives first,
    // the second is a no-op.
    var lift = function () { box.classList.add('is-in'); };
    if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(lift); });
    setTimeout(lift, 80);

    // THE FADE OUT IS READ OFF THE SHEET, not repeated here. --sub-out
    // is where the duration is set (style.css); this only has to know
    // when the panel has finished leaving so it can take it out of the
    // flow, and a number copied into two files is a number that will
    // one day disagree with itself.
    function outMs() {
      var v = getComputedStyle(box).getPropertyValue('--sub-out').trim();
      var n = parseFloat(v);
      if (!isFinite(n)) return 400;
      return /ms$/.test(v) ? n : n * 1000;
    }

    function close(mark) {
      if (box.hidden) return;
      if (mark !== false) flag(true);
      box.classList.remove('is-in');
      box.classList.add('is-out');
      // Off the pointer at once — the panel is dismissed the moment it
      // is asked to go, whatever it is still doing on the screen.
      box.style.pointerEvents = 'none';
      var still = false;
      try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      if (still) box.hidden = true;
      else setTimeout(function () { box.hidden = true; }, outMs() + 40);
    }

    // ---- THE BOX STOPS 36 ABOVE THE COLOPHON ----
    // It is fixed to the foot of the WINDOW, which is right for every
    // screen of the page but the last: scroll to the end and the
    // colophon band rises under it, and a panel pinned to the window
    // sits over the band rather than on the page. It rides up instead,
    // keeping the same 36 off the band that it keeps off the floor —
    // so the last thing it does before the page ends is stand on the
    // colophon's shoulder.
    // THE RESTING OFFSET IS READ, NOT NAMED: the sheet moves it to 24
    // under 480, and a number repeated here would be a number to keep
    // in step. It is measured off the stylesheet with the inline value
    // cleared, and re-measured on a resize, which is the only thing
    // that can change it.
    var foot = document.querySelector('.section-band--colophon');
    var restBottom = 36;
    function readRest() {
      var had = box.style.bottom;
      box.style.bottom = '';
      var v = parseFloat(getComputedStyle(box).bottom);
      restBottom = isFinite(v) ? v : 36;
      box.style.bottom = had;
    }
    // AND IT RIDES THE RUBBER BAND. A fixed panel is pinned to the
    // WINDOW, so pulling past either end of the page slides the whole
    // site under it and leaves the box hanging still against moving
    // paper — which reads as the box being stuck to the glass rather
    // than laid on the page. It travels with the overscroll instead.
    // HOW THE OVERSHOOT IS FOUND. The root's own box gives it away:
    // at rest its top sits at exactly -scrollY, so the two of them
    // sum to nothing; while the page is pulled past an end the
    // compositor shifts the document without the scroll offset
    // following, and that sum IS the shift — positive at the head
    // where the page has come down, negative at the foot where it has
    // gone up. The panel takes the same shift and moves with it.
    // (scrollY is clamped to the page's own range in some browsers
    // and not in others; this reads the same either way, because it
    // asks the DOCUMENT where it is rather than asking the scroller.)
    // ONLY ONCE IT HAS ARRIVED: during the fade the sheet is driving
    // the transform itself, and an inline one here would snatch it.
    function overshoot() {
      var r = document.documentElement.getBoundingClientRect();
      return r.top + (window.scrollY || window.pageYOffset || 0);
    }
    function ride() {
      if (!foot || box.hidden) return;
      var top = foot.getBoundingClientRect().top;
      // Where the box's foot would have to sit to clear the band by
      // the same measure it clears the floor by.
      var lifted = window.innerHeight - top + restBottom;
      box.style.bottom = (lifted > restBottom ? lifted : restBottom).toFixed(2) + 'px';
      if (!box.classList.contains('is-in')) return;
      var shift = overshoot();
      box.style.transform = Math.abs(shift) > 0.5 ? 'translateY(' + shift.toFixed(2) + 'px)' : '';
    }
    // A FRAME IF THERE IS ONE, AND A TIMER IF THERE IS NOT. The seat is
    // taken on the next frame so a run of scroll events costs one
    // measurement rather than forty — but requestAnimationFrame does
    // not tick in a tab that is not being shown, and a throttle that
    // waits on it alone simply never runs there. Whichever arrives
    // first does the work and the other finds it done.
    var riding = false;
    function queueRide() {
      if (riding) return;
      riding = true;
      var done = false;
      var go = function () { if (done) return; done = true; riding = false; ride(); };
      if (window.requestAnimationFrame) requestAnimationFrame(go);
      setTimeout(go, 32);
    }
    // AND A TAIL, FOR THE SPRING BACK. A rubber band is run by the
    // compositor: the document is moving while the scroller's offset
    // has already stopped changing, so the scroll events stop coming
    // before the movement does. Sampling on for a moment after the
    // last of them carries the panel through the return, and costs
    // nothing at rest — the tail is only ever armed by an input.
    var tailUntil = 0, tailTimer = null;
    function tail() {
      if (tailTimer) return;
      tailTimer = setInterval(function () {
        ride();
        if (Date.now() > tailUntil) { clearInterval(tailTimer); tailTimer = null; }
      }, 32);
    }
    function stir() { tailUntil = Date.now() + 600; queueRide(); tail(); }
    readRest();
    ride();
    window.addEventListener('scroll', stir, { passive: true });
    window.addEventListener('wheel', stir, { passive: true });
    window.addEventListener('touchmove', stir, { passive: true });
    window.addEventListener('resize', function () { readRest(); ride(); }, { passive: true });

    var x = box.querySelector('.sub-box-x');
    if (x) x.addEventListener('click', function () { close(); });

    // ESCAPE SHUTS IT TOO — the X's own affordance for a reader on the
    // keyboard, who would otherwise have to tab to it.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close();
    });

    // WALKING OFF THE PAGE SHUTS IT. The click is for the eye — the
    // panel goes as the link is taken rather than sitting through the
    // load — and pagehide is the catch-all: the back button, a typed
    // address, a reload (whose flag the next load clears again).
    // A link inside the box is a link like any other: SUBSCRIBE leaves
    // for Substack, and the box has no business surviving that.
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      // A hash on the page is not a navigation and neither is a link
      // that opens a tab of its own — the reader is still standing here.
      if (!href || href.charAt(0) === '#') return;
      if (a.target && a.target !== '_self') return;
      close();
    }, true);

    window.addEventListener('pagehide', function () { flag(true); });
  });
})();
