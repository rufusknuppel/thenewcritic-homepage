// THE WHOLE MARK IS THE LINK (2026-09-19). A title and its dek square
// off into ONE rectangle under the hand (duo-panel-fit.js, squareUp,
// which writes --tx-t/b/l/r on the title). The title carried the post's
// link and the dek carried nothing, so half of what the reader sees
// lit up was not a way in — a hand on the dek raised the mark and a
// click on it did nothing at all. Anywhere inside that rectangle now
// opens the post.
//
// NO PATCH, AND NOTHING RESEATED. The obvious build is the site's own
// .ops-hit idiom — an absolutely-positioned link over the shape. It
// cannot be had here: the title and the dek are EACH given
// `isolation: isolate` (style.css, so a line's block paints behind its
// own letters and no further), so a patch inside the title paints
// inside the title's stacking context, which the dek — later in the
// DOM and isolated in its own right — then paints straight over. The
// patch would take the title's half of the rectangle and lose the
// dek's. Lifting the title over the dek to fix it would reorder the
// blocks the two of them paint, which is the one thing the squaring
// up was for.
//
// SO THE GEOMETRY ANSWERS INSTEAD. The rectangle is already measured
// and already written to the title as four offsets; this reads them
// back and asks whether the click fell inside. Nothing is added to the
// page, no element changes hands, and the lighting of the mark is
// exactly as it was — the hover rules still see the title and the dek
// themselves, because nothing is laid over them.
(function () {
  // Read the union back off the title in viewport coordinates. The
  // offsets are INSETS from the title's own box: t and l count in from
  // its top and left, b and r in from its bottom and right, and any of
  // them can be negative where the shape reaches past the title —
  // which is the usual case at the foot, the rectangle running down
  // over the dek.
  function unionOf(title) {
    if (!title.classList.contains('hl-rect')) return null;
    var box = title.getBoundingClientRect();
    function off(k) {
      var v = parseFloat(title.style.getPropertyValue(k));
      return isFinite(v) ? v : 0;
    }
    var r = {
      top: box.top + off('--tx-t'),
      bottom: box.bottom - off('--tx-b'),
      left: box.left + off('--tx-l'),
      right: box.right - off('--tx-r')
    };
    return (r.bottom > r.top && r.right > r.left) ? r : null;
  }

  function inside(r, x, y) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    // A held modifier is the reader asking the BROWSER for something —
    // a new tab, a download, a selection. Left alone.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t || !t.closest) return;
    // Anything that answers a click on its own account answers it: the
    // title's own link, the cover's, Close Preview and the rest.
    if (t.closest('a[href], button, [role="button"], input, textarea, select, label')) return;
    // A drag that ended in a selection is not a click on the card. (The
    // deks are prose, and a reader who has just swept a sentence out of
    // one should not be thrown to the post for letting go.)
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel)) return;

    // WHOSE RECTANGLE? Only a title this click could honestly belong
    // to: one inside the thing clicked (the column, where the click
    // landed on the rectangle's own air between or beside the words),
    // or one whose title or dek was itself clicked. A paragraph in an
    // OPEN PREVIEW is neither — it does not contain the title and the
    // title does not contain it — so a preview lying over a card does
    // not become a way into that card by accident.
    var scope = t.closest('.panel-col, .duo-panel, .card, .latest-stack, .ticker-item') || document.body;
    var titles = scope.querySelectorAll('.card-title.hl-rect, .latest-title.hl-rect');
    for (var i = 0; i < titles.length; i++) {
      var title = titles[i];
      var dek = title.nextElementSibling;
      var mine = title.contains(t) || (dek && dek.contains(t)) || (t.contains && t.contains(title));
      if (!mine) continue;
      var r = unionOf(title);
      if (!r || !inside(r, e.clientX, e.clientY)) continue;
      var a = title.querySelector('a[href]');
      if (!a) continue;
      // The title's own link is clicked rather than its href followed,
      // so whatever the markup says about rel and target is honoured
      // and there is ONE way a post is opened on this page.
      a.click();
      return;
    }
  });
})();
