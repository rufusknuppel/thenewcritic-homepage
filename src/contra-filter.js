// ---------- CONTRA HEAD FILTER ----------
// The header section on the contra page (see .contra-head in style.css
// and renderListPage in build.js): five category columns — Art / Books /
// Movies / Music / Theater — each heading a filter button, each review
// under it an entry button carrying data-idx, its cell's position in the
// grid below. ONE selection at a time, of either kind: a heading deals
// the grid to its category, an entry deals it to that single review, and
// clicking the active one again clears the filter.
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
  var head = document.querySelector('.contra-head');
  if (!head) return;
  var pageRows = document.querySelector('.page-rows');
  if (!pageRows) return;
  // Only the grid rows: the head's own wrap holds no .card--duo.
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
  // Document order here IS posts order — the same order the head's
  // entries were numbered in at build time, which is what lets an
  // entry's data-idx address cells[idx] directly.
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

  // match is a predicate over cells, or null for "everything". A filter
  // that matches nothing (Art, before it has entries) hides every row —
  // an empty shelf, honestly empty.
  function layout(match) {
    var visible = match ? cells.filter(match) : cells.slice();
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
    // widths are unchanged, but any freshly-revealed panel refits.
    window.dispatchEvent(new Event('resize'));
  }

  var activeKicker = null;
  var activeIdx = null;
  var kickerBtns = [].slice.call(head.querySelectorAll('.contra-filter-link'));
  var entryBtns = [].slice.call(head.querySelectorAll('.contra-entry-link'));
  function apply() {
    kickerBtns.forEach(function (b) {
      var on = b.getAttribute('data-kicker') === activeKicker;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    entryBtns.forEach(function (b) {
      var on = +b.getAttribute('data-idx') === activeIdx;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (activeIdx !== null) {
      var chosen = cells[activeIdx];
      layout(function (c) { return c === chosen; });
    } else if (activeKicker) {
      layout(function (c) { return kickerOf(c) === activeKicker; });
    } else {
      layout(null);
    }
  }
  // The section's own name, at the head of the first column: the way
  // back to the whole shelf from any filter. It takes no selected state
  // of its own — the shelf entire is the page's resting state, not a
  // filter among the others — so it only ever blues on hover.
  var clearBtn = head.querySelector('.contra-clear-link');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      activeKicker = null;
      activeIdx = null;
      apply();
    });
  }
  kickerBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-kicker');
      activeIdx = null;
      activeKicker = activeKicker === k ? null : k;
      apply();
    });
  });
  entryBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = +btn.getAttribute('data-idx');
      activeKicker = null;
      activeIdx = activeIdx === i ? null : i;
      apply();
    });
  });
  // Deep link: a homepage contra card's category chip links here as
  // contra.html#books (see the rest-kicker link in build.js), so the
  // matching filter opens on arrival. hashchange too, for same-page jumps.
  function applyHash() {
    var want = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (!want) return;
    var match = head.querySelector('.contra-filter-link[data-kicker="' + want + '"]');
    if (match && activeKicker !== want) {
      activeIdx = null;
      activeKicker = want;
      apply();
    }
  }
  applyHash();
  window.addEventListener('hashchange', applyHash);
})();
