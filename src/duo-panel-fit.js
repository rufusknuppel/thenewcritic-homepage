(function(){
  // Each row panel (essay squares, postscript trio, contra quad) shows as
  // much of its post as its own box has room for above the corner buttons:
  // content is cut from the bottom up — hard blocks (divider, tagline)
  // hidden outright once they'd cross into the button zone, running text
  // (the dek and the preview paragraphs) clamped to the exact number of
  // rendered lines that fit, with the ellipsis the line-clamp display
  // draws at that line's end. The static clamp values in style.css are
  // only the no-JS fallback; this neutralizes them (clamp 999) before
  // measuring so a bigger box really does pull more text. Panels are
  // opacity:0 at rest but still laid out, so everything here is
  // measurable without hovering.
  var panels = document.querySelectorAll('.duo-panel');
  if (!panels.length) return;

  function resetClamp(el) {
    el.style.overflow = '';
    el.style.maxHeight = '';
    el.style.webkitBoxOrient = '';
    el.style.webkitLineClamp = '';
    el.style.lineClamp = '';
    el.classList.remove('card-preview--clamped');
    el.classList.remove('card-preview--capped');
    el.classList.remove('card-preview-block--cut');
  }

  // Clamps el to however many of its lines end above `limit`. Returns true
  // if at least one line fit (el stays visible), false if none did (el is
  // hidden). Only called when el's natural bottom crosses the limit.
  function clampToFit(el, limit) {
    var r = el.getBoundingClientRect();
    var lh = parseFloat(getComputedStyle(el).lineHeight) || 22;
    var lines = Math.floor((limit - r.top) / lh);
    if (lines < 1) { el.style.display = 'none'; return false; }
    el.style.display = '-webkit-box';
    el.style.webkitBoxOrient = 'vertical';
    el.style.overflow = 'hidden';
    el.style.webkitLineClamp = String(lines);
    el.style.lineClamp = String(lines);
    el.classList.add('card-preview--clamped');
    return true;
  }

  // The panel's chrome (kicker, date/likes, Read on, section link) lives
  // in the fixed header/footer bands now — only the middle column (title,
  // dek, byline, tagline, preview) needs fitting, against the bottom
  // band's top edge. When space runs short, content yields in reverse
  // keep-priority: title (clamps, never vanishes) > byline > dek >
  // everything else (dividers, tagline, preview paragraphs).
  function fit(panel) {
    var topBox = panel.querySelector('.duo-panel-top');
    var band = panel.querySelector('.panel-band--bottom');
    if (!topBox || !band) return;
    var title = topBox.querySelector('.card-title');
    var meta = topBox.querySelector('.card-meta--byline');
    var paras = topBox.querySelectorAll('.card-preview');

    // Reset any previous fit so a refit measures the natural layout.
    topBox.style.marginTop = '';
    var oldEllipsis = topBox.querySelector('.preview-ellipsis');
    if (oldEllipsis) oldEllipsis.parentNode.removeChild(oldEllipsis);
    [].forEach.call(topBox.children, function(el){ el.style.display = ''; resetClamp(el); });
    [].forEach.call(paras, function(p){ p.style.display = ''; resetClamp(p); });

    // In the static fallback layout (touch devices / narrow viewports) the
    // panel flows under the image and the bands sit in flow too — nothing
    // to fit against, and the CSS fallback clamps handle length.
    if (getComputedStyle(panel).position !== 'absolute') return;

    // Lift the CSS fallback clamps so each paragraph's full text is
    // measurable (and kept, when the box turns out to have the room).
    [].forEach.call(paras, function(p){
      p.style.webkitLineClamp = '999';
      p.style.lineClamp = '999';
    });

    var limit = band.getBoundingClientRect().top - 14;

    // The title outranks the dek wherever the dek sits: if the dek comes
    // first in the column, everything from its bottom edge down through
    // the title's natural bottom is reserved out of the dek's own budget
    // (so the dek yields lines and the title rides up); when the dek sits
    // below the title — the current order — that distance is negative and
    // the reserve clamps to 0, leaving the dek to fit in whatever the
    // title left over. The byline's height is reserved either way.
    var dek = topBox.querySelector('.card-dek');
    var reserve = 0;
    if (dek && title && getComputedStyle(dek).display !== 'none') {
      reserve = Math.max(0,
        title.getBoundingClientRect().bottom - dek.getBoundingClientRect().bottom);
    }
    var metaSpace = 0;
    if (meta && getComputedStyle(meta).display !== 'none') {
      metaSpace = meta.getBoundingClientRect().height
        + (parseFloat(getComputedStyle(meta).marginTop) || 0);
    }
    var cutting = false;
    [].forEach.call(topBox.children, function(el){
      if (getComputedStyle(el).display === 'none') return;
      if (el === dek) {
        // Clamping (or even hiding) the dek to protect the title is not a
        // cut — everything after it shifts up and keeps its shot.
        var dekLim = limit - reserve - metaSpace;
        if (el.getBoundingClientRect().bottom > dekLim && !clampToFit(el, dekLim)) {
          // Dek gone entirely — the rule between it and the title would
          // sit orphaned against the quote divider below.
          var tdiv = topBox.querySelector('.card-title-divider');
          if (tdiv) tdiv.style.display = 'none';
        }
        return;
      }
      if (el === title) {
        // Last resort, after the dek above has already yielded: a title
        // that still crosses the floor clamps to the lines that fit
        // rather than vanishing. Checked here (not via the generic branch
        // below) so a clamped title's padding-bottom sitting a hair past
        // the limit never hides it outright.
        if (el.getBoundingClientRect().bottom > limit) clampToFit(el, limit);
        return;
      }
      if (cutting) {
        if (el === meta) {
          // The byline survives the cut — its space was reserved. Only if
          // it still crosses the real limit (a panel too small for even
          // the title + byline) does it hide like everything else.
          if (el.getBoundingClientRect().bottom > limit) el.style.display = 'none';
          return;
        }
        el.style.display = 'none';
        return;
      }
      if (el.classList.contains('card-preview-block')) {
        if (getComputedStyle(el).columnCount === '2') {
          // Two-column essay excerpt: line-clamping individual paragraphs
          // can't work across column flow, so the block fits as one unit —
          // capped at a whole-line multiple of its own height so both
          // columns cut on a line boundary; overflow text spills into
          // clipped phantom columns past the second.
          //
          // The block's budget stops GAP_BOTTOM above the footer band —
          // 16px of box gap puts the last line's INK the same ~24px from
          // the band rule as the first line's ink sits from the quote
          // divider (whose 20px margin + the line's own leading make up
          // the difference) — and the line-quantization remainder shifts
          // the whole column DOWN instead of pooling here, so the header
          // gap is a floor, never less.
          var firstP = el.querySelector('.card-preview');
          var plh = parseFloat(getComputedStyle(firstP || el).lineHeight) || 22;
          var bandTop = limit + 14;
          var GAP_BOTTOM = 16;
          var budget = bandTop - GAP_BOTTOM - el.getBoundingClientRect().top;
          var blockLines = Math.floor(budget / plh);
          if (blockLines < 1) { el.style.display = 'none'; return; }
          el.style.maxHeight = (blockLines * plh) + 'px';
          el.style.overflow = 'hidden';
          // Cut text spills into clipped phantom columns, widening the
          // scrollable area — that's the tell that an ellipsis is owed.
          var isCut = el.scrollWidth > el.clientWidth + 1;
          el.classList.toggle('card-preview-block--cut', isCut);
          // Anchor the column to the footer: whatever the block doesn't
          // use — the line remainder on cut panels, whole unused lines on
          // short ones like a fully-fitting excerpt — shifts the column
          // down so the block always ends GAP_BOTTOM above the band. The
          // header gap absorbs all of it (its padding is the minimum).
          var anchorShift = (bandTop - GAP_BOTTOM) - el.getBoundingClientRect().bottom;
          if (anchorShift > 0) topBox.style.marginTop = anchorShift + 'px';
          if (isCut) {
            // Attach the ellipsis to the last visible word: find the
            // bottom-most, right-most text fragment still inside the
            // block's visible box and pin a span just past its edge.
            var blockR = el.getBoundingClientRect();
            var bestR = null;
            var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            var tn;
            while ((tn = walker.nextNode())) {
              var rng = document.createRange();
              rng.selectNodeContents(tn);
              var rs = rng.getClientRects();
              for (var ri = 0; ri < rs.length; ri++) {
                var rr = rs[ri];
                if (rr.width < 2 || rr.height < 4) continue;
                if (rr.bottom > blockR.bottom + 2 || rr.right > blockR.right + 2) continue;
                if (!bestR
                    || rr.bottom > bestR.bottom + 1
                    || (Math.abs(rr.bottom - bestR.bottom) <= 1 && rr.right > bestR.right)) {
                  bestR = rr;
                }
              }
            }
            if (bestR) {
              var dots = document.createElement('span');
              dots.className = 'preview-ellipsis';
              dots.textContent = '\u2026';
              el.appendChild(dots);
              // Keep the span inside the block: a full-width last line
              // would otherwise push it past the overflow clip.
              var dotsLeft = Math.min(
                bestR.right - blockR.left + 1,
                el.clientWidth - dots.getBoundingClientRect().width - 1
              );
              dots.style.left = dotsLeft + 'px';
              dots.style.top = (bestR.top - blockR.top) + 'px';
            }
          }
          return;
        }
        var parasCut = false;
        [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
          if (parasCut) { p.style.display = 'none'; return; }
          if (p.getBoundingClientRect().bottom <= limit) return;
          parasCut = true;
          clampToFit(p, limit);
        });
      } else if (el.getBoundingClientRect().bottom > limit) {
        cutting = true;
        el.style.display = 'none';
      }
    });

  }

  function fitAll() {
    [].forEach.call(panels, fit);
  }

  fitAll();
  // Fonts landing after first paint change every line's height — refit.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  window.addEventListener('load', fitAll);
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 100);
  });
})();
