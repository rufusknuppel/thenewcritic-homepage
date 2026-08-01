// ---------- ESSAY TICKER ----------
// The essays page: three tapes stacked, each one scrolled by the reader
// rather than crawling on its own (see .essay-ticker in style.css and
// renderEssayTicker in build.js). The build deals the berths across the
// three once, in feed order; this script pools every berth from every
// tape, shuffles the whole pool, and deals it back out fresh on each
// visit — so the tapes carry a different cut each reload while no essay
// ever rides two tapes at once.
//
// Nothing here moves on its own any more. The tapes are native
// horizontal scrollers, so a trackpad, a touch drag, shift+wheel and the
// keyboard all work without being taught to; this file adds only the two
// things the browser can't infer: a mouse drag (a plain mouse has no
// horizontal gesture, and the scrollbars are hidden), and the staggered
// resting offset that tells the reader the tapes move at all.
(function () {
  var lanes = [].slice.call(document.querySelectorAll('.essay-ticker'))
    .map(function (ticker) {
      var track = ticker.querySelector('.ticker-track');
      var group = track && track.querySelector('.ticker-group');
      return group ? { ticker: ticker, track: track, group: group } : null;
    })
    .filter(Boolean);
  if (!lanes.length) return;

  // One pool, drawn from every tape. Each berth re-boards trailed by one
  // of the strips' dividers, so the rules stay one-per-boundary after the
  // deal (the divider pool is interchangeable — they're identical).
  var items = [];
  var dividers = [];
  lanes.forEach(function (lane) {
    [].forEach.call(lane.group.querySelectorAll('.ticker-item'), function (n) { items.push(n); });
    [].forEach.call(lane.group.querySelectorAll('.ticker-divider'), function (n) { dividers.push(n); });
  });
  if (!items.length) return;

  // Fisher–Yates over the whole pool, then dealt out in contiguous runs:
  // a random partition, which is what keeps the three tapes disjoint. Any
  // repeat could only come from a berth landing in two runs, and slicing
  // one shuffled array can't do that.
  for (var i = items.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = items[i]; items[i] = items[j]; items[j] = t;
  }

  var cut = 0;
  var left = items.length;
  var d = 0;
  lanes.forEach(function (lane, idx) {
    // Spread the remainder over the first lanes rather than piling it on
    // the last, so the tapes come out within one berth of each other.
    var take = Math.ceil(left / (lanes.length - idx));
    var run = items.slice(cut, cut + take);
    cut += take;
    left -= take;
    while (lane.group.firstChild) lane.group.removeChild(lane.group.firstChild);
    run.forEach(function (item) {
      lane.group.appendChild(item);
      // The LAST berth takes no trailing rule: with the strip finite now
      // (no cloned copy to run into) a trailing divider would hang off
      // the end as a rule dividing nothing from nothing.
      if (dividers[d]) lane.group.appendChild(dividers[d]);
      d++;
    });
    var last = lane.group.lastChild;
    if (last && last.classList && last.classList.contains('ticker-divider')) {
      lane.group.removeChild(last);
    }
    lane.run = run;
  });
  // The berths changed lanes after duo-panel-fit.js had already fitted
  // them; their widths didn't change, so the fits still hold, but a
  // resize costs nothing and keeps the two in step.
  window.dispatchEvent(new Event('resize'));

  // The resting stagger. Every tape opens part-way in, each one further
  // than the last, so the covers deliberately DON'T line up into columns
  // — that misalignment is the whole hint that the three strips are
  // independent and can be pushed. Starting part-way in also means every
  // tape can be scrolled BACK on first touch, not just forward.
  function stagger() {
    lanes.forEach(function (lane, idx) {
      var berth = lane.group.querySelector('.ticker-item');
      var w = berth ? berth.getBoundingClientRect().width : 0;
      if (!w) return;
      lane.ticker.scrollLeft = Math.round(w * (0.35 + idx * 0.55));
    });
  }
  stagger();

  // Drag to scroll, mouse only — touch and trackpad already pan natively,
  // and hijacking their gestures would only fight the browser. A drag
  // has to out-travel DRAG_SLOP before it takes over, so an ordinary
  // click still reaches the link under the pointer; once it does, the
  // click that ends it is swallowed (capture phase, ahead of the link's
  // own handler) so a drag that happens to finish over a cover doesn't
  // navigate.
  var DRAG_SLOP = 5;
  lanes.forEach(function (lane) {
    var el = lane.ticker;
    var down = false, startX = 0, startLeft = 0, travel = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; travel = 0;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > travel) travel = Math.abs(dx);
      if (travel <= DRAG_SLOP) return;
      if (!el.hasPointerCapture(e.pointerId)) {
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
      }
      el.scrollLeft = startLeft - dx;
      e.preventDefault();
    });
    function end(e) {
      if (!down) return;
      down = false;
      el.classList.remove('is-dragging');
      if (e && e.pointerId !== undefined && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', function (e) {
      if (travel > DRAG_SLOP) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    // Dragging a cover would otherwise start the browser's own image
    // drag, which cancels the scroll mid-gesture.
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });
  lanes.forEach(function (lane) { lane.ticker.classList.add('is-scrollable'); });
})();
