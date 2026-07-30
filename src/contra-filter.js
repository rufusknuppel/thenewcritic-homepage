// ---------- CONTRA CATEGORY FILTER ----------
// The nav bar under the contra lead card (see .contra-filter in
// style.css and renderListPage in build.js): Books / Movies / Music /
// Theater. One category active at a time — its underline prevails via
// .is-active — and clicking the active one again clears the filter.
//
// Filtering REBUILDS the rows rather than hiding cells in place:
// display:none on a flex cell hands its width to the row's survivors
// and the squares stop being squares. Instead the matching cells are
// dealt back into the existing row cards three at a time (dividers
// between them, ghosts padding the last short row — the same shape
// renderDuoCard builds), and wraps left holding no cells are hidden
// along with their full-bleed row dividers. Cells are moved, never
// cloned, so their fitted panels, listeners and seated chips ride
// along untouched.
(function () {
  var nav = document.querySelector('.contra-filter');
  if (!nav) return;
  var pageRows = document.querySelector('.page-rows');
  if (!pageRows) return;
  var wraps = [].slice.call(pageRows.children).filter(function (el) {
    return el.classList.contains('wrap') && el.querySelector('.card--duo');
  });
  if (!wraps.length) return;
  var cards = wraps.map(function (w) { return w.querySelector('.card--duo'); });
  // The full-bleed divider after each row, when the next sibling is one
  // (the last row never has one — renderListPage only puts them BETWEEN
  // rows).
  var dividersAfter = wraps.map(function (w) {
    var n = w.nextElementSibling;
    return n && n.classList.contains('row-divider') ? n : null;
  });
  var cells = [];
  cards.forEach(function (c) {
    [].forEach.call(c.querySelectorAll('.duo-half:not(.duo-half--ghost)'), function (cell) {
      cells.push(cell);
    });
  });
  var perRow = Math.max.apply(null, cards.map(function (c) {
    return c.querySelectorAll('.duo-half').length;
  }));

  function kickerOf(cell) {
    var k = cell.querySelector('.rest-kicker') || cell.querySelector('.hero-kicker');
    return k ? k.textContent.trim().toLowerCase() : '';
  }

  function makeDivider() {
    var d = document.createElement('div');
    d.className = 'duo-half-divider';
    d.setAttribute('role', 'separator');
    return d;
  }
  function makeGhost() {
    var g = document.createElement('div');
    g.className = 'duo-half duo-half--ghost';
    g.setAttribute('aria-hidden', 'true');
    return g;
  }

  function layout(filter) {
    var visible = filter
      ? cells.filter(function (c) { return kickerOf(c) === filter; })
      : cells.slice();
    var used = Math.ceil(visible.length / perRow);
    cards.forEach(function (card, i) {
      while (card.firstChild) card.removeChild(card.firstChild);
      var group = visible.slice(i * perRow, (i + 1) * perRow);
      var show = group.length > 0;
      wraps[i].style.display = show ? '' : 'none';
      // A divider only BETWEEN visible rows, never after the last one.
      if (dividersAfter[i]) dividersAfter[i].style.display = (show && i < used - 1) ? '' : 'none';
      if (!show) return;
      for (var j = 0; j < perRow; j++) {
        if (j) card.appendChild(makeDivider());
        card.appendChild(group[j] || makeGhost());
      }
    });
    // Kick the fitter (debounced resize listener in duo-panel-fit.js):
    // widths are unchanged, but the lead card re-measures the first
    // square for its height and any freshly-revealed panel refits.
    window.dispatchEvent(new Event('resize'));
  }

  var active = null;
  [].forEach.call(nav.querySelectorAll('.contra-filter-link'), function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-kicker');
      active = active === k ? null : k;
      [].forEach.call(nav.querySelectorAll('.contra-filter-link'), function (b) {
        var on = b.getAttribute('data-kicker') === active;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      layout(active);
    });
  });
})();
