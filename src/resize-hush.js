// THE WINDOW DRAGGED IN ONE MOVE (2026-11-18 — "I want adjusting the
// window size to be smoother"). Every resize event the browser sends while
// a window is dragged set off ~800ms of measuring (the rail's measure, the
// logo's seat, the gutters, the band's refit, each ResizeObserver behind
// them) before the next frame could be drawn, so a drag moved in jumps.
// While the window is moving the page now lays itself out by the sheet
// alone: the browser's own resize events are stopped here, before any
// other listener (this runs first in <head>), and ResizeObserver callbacks
// are held. Once the window has kept still for HUSH_MS the held observers
// are called once and one resize event is sent on to everything that
// listens, so every fitter runs once, at the size the window came to rest.
// window.__ncResizeSettle is true while that event is out, so a listener
// that counts only the browser's own resizes (latest-rail.js's echo) can
// count it too. Untrusted resizes — the page's own — pass untouched.
(function () {
  if (/[?&]nohush\b/.test(location.search)) return; // (the old way, for an A/B)
  var HUSH_MS = 160;
  var root = document.documentElement;
  var timer = 0, moving = false, held = [];
  function settle() {
    timer = 0; moving = false;
    root.classList.remove('is-resizing');
    // (the resize first and the held observers after it, a frame's own order)
    window.__ncResizeSettle = true;
    try { window.dispatchEvent(new Event('resize')); } finally { window.__ncResizeSettle = false; }
    var q = held; held = [];
    q.forEach(function (h) { try { h.cb.call(h.ro, h.entries, h.ro); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  window.addEventListener('resize', function (e) {
    // (the page's own resizes pass while the window is still; while it moves they are held too — latest-rail.js sends one
    // whenever the column's edge moves, and each set off a whole fit mid-drag — the one sent at rest answers them all)
    if (!e.isTrusted && !moving) return;
    e.stopImmediatePropagation();
    if (!e.isTrusted) return;
    if (!moving) { moving = true; root.classList.add('is-resizing'); }
    clearTimeout(timer);
    timer = setTimeout(settle, window.__ncHushMs || HUSH_MS);
  }, true);
  window.__ncResizing = function () { return moving; };

  var RO = window.ResizeObserver;
  if (!RO) return;
  function Hushed(cb) {
    var ro = new RO(function (entries, obs) {
      if (moving) {
        for (var i = 0; i < held.length; i++) if (held[i].ro === ro) { held[i].entries = entries; return; }
        held.push({ ro: ro, cb: cb, entries: entries });
        return;
      }
      cb.call(ro, entries, ro);
    });
    return ro;
  }
  Hushed.prototype = RO.prototype;
  window.ResizeObserver = Hushed;
})();
