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

  // The hero's hover zone is the picture itself: the link is sized to
  // the image's exact contain-box — height is the frame's, width follows
  // the image's own ratio, centered by the frame's flex row (see
  // .card--feature .card-image-frame in style.css) — so the hover ring,
  // the dim, and the panel trigger all begin and end at the image's real
  // edges instead of the pillarbox columns. object-fit:contain painted
  // the picture in this exact spot already; only the LINK BOX changes.
  // No-JS keeps the full-width link (hover zone falls back to the whole
  // frame), and the static/mobile layout resets to it.
  var heroLink = document.querySelector('.card--feature .card-image-link');
  function fitHeroLink() {
    if (!heroLink) return;
    var img = heroLink.querySelector('img.card-image');
    var frame = heroLink.parentNode;
    if (!img || getComputedStyle(frame).position !== 'absolute') {
      heroLink.style.aspectRatio = '';
      heroLink.style.width = '';
      return;
    }
    if (!img.naturalWidth) return; // the load listener below refits
    heroLink.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
    heroLink.style.width = 'auto';
  }

  function resetClamp(el) {
    el.style.overflow = '';
    el.style.maxHeight = '';
    el.style.height = '';
    el.style.columnFill = '';
    el.style.webkitBoxOrient = '';
    el.style.webkitLineClamp = '';
    el.style.lineClamp = '';
    el.classList.remove('card-preview--clamped');
    el.classList.remove('card-preview--capped');
  }

  var TRAIL_PUNCT = /[\s.,;:!?'"‘’“”()\[\]…—–-]+$/;

  function removeAfter(root, node) {
    var n = node;
    while (n && n !== root) {
      while (n.nextSibling) n.parentNode.removeChild(n.nextSibling);
      n = n.parentNode;
    }
  }

  // Truncates a capped two-column block to its last fully-visible word and
  // joins the ellipsis straight onto that word's final letter (trailing
  // punctuation stripped) — inline, part of the text flow, never overlaid.
  // The caller freezes the block first (explicit height + column-fill:auto)
  // so deleting the clipped tail can't re-balance the visible columns; the
  // pristine markup is stashed on the element for the next refit.
  function truncateToWord(el) {
    if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
    var blockR = el.getBoundingClientRect();
    var EPS = 2;
    function fits(r) {
      return r.bottom <= blockR.bottom + EPS && r.right <= blockR.right + EPS;
    }
    // Walk the text nodes back to front for the last one holding a word
    // whose every fragment sits inside the visible box (clipped text lives
    // below the height cap or out in the phantom overflow columns).
    var nodes = [];
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = w.nextNode())) nodes.push(n);
    var cutNode = null, cutEnd = -1;
    for (var i = nodes.length - 1; i >= 0 && !cutNode; i--) {
      var text = nodes[i].textContent;
      var re = /\S+/g, m, best = -1;
      while ((m = re.exec(text))) {
        var rng = document.createRange();
        rng.setStart(nodes[i], m.index);
        rng.setEnd(nodes[i], m.index + m[0].length);
        var rs = rng.getClientRects();
        var ok = !!rs.length;
        for (var j = 0; j < rs.length; j++) {
          if (rs[j].width < 1) continue;
          if (!fits(rs[j])) { ok = false; break; }
        }
        if (ok) best = m.index + m[0].length;
      }
      if (best > -1) { cutNode = nodes[i]; cutEnd = best; }
    }
    if (!cutNode) return;
    removeAfter(el, cutNode);
    cutNode.textContent = cutNode.textContent.slice(0, cutEnd);
    // Append the ellipsis and confirm it landed in view — on a full last
    // line it wraps out of the visible box, so back off a word and retry.
    var guard = 30;
    while (guard-- > 0 && cutNode) {
      cutNode.textContent = cutNode.textContent.replace(TRAIL_PUNCT, '') + '…';
      var er = document.createRange();
      er.setStart(cutNode, cutNode.textContent.length - 1);
      er.setEnd(cutNode, cutNode.textContent.length);
      if (fits(er.getBoundingClientRect())) return;
      var t = cutNode.textContent.slice(0, -1).replace(TRAIL_PUNCT, '').replace(/\S+$/, '');
      if (t.trim()) {
        cutNode.textContent = t;
      } else {
        // This node emptied out — retreat to the previous text node.
        var w2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        var n2, prev = null;
        while ((n2 = w2.nextNode())) {
          if (n2 === cutNode) break;
          if (n2.textContent.trim()) prev = n2;
        }
        cutNode.parentNode.removeChild(cutNode);
        cutNode = prev;
        if (cutNode) removeAfter(el, cutNode);
      }
    }
  }

  // Reads the rendered line boxes of a two-column block and reports, per
  // column, whether the bottom line slot is occupied (…Full) and whether
  // the line sitting in it is an orphan — a paragraph's opening line
  // stranded at the column's foot while its body carries on past the
  // break. Assumes the block is height-capped at a whole-line multiple
  // with sequential fill, so lines land on the grid with no partials.
  function columnFill(el, plh) {
    var r = el.getBoundingClientRect();
    var midX = (r.left + r.right) / 2;
    var slotTop = r.bottom - plh;
    var st = { leftFull: false, rightFull: false, leftOrphan: false, rightOrphan: false };
    [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
      var rng = document.createRange();
      rng.selectNodeContents(p);
      var rs = rng.getClientRects();
      var rects = [];
      for (var i = 0; i < rs.length; i++) if (rs[i].width >= 1) rects.push(rs[i]);
      if (!rects.length) return;
      var first = rects[0];
      var continues = false;
      for (var j = 0; j < rects.length; j++) {
        if (Math.abs(rects[j].top - first.top) > plh / 2) { continues = true; break; }
      }
      rects.forEach(function(rc){
        // Overflow past the second column renders in phantom columns out
        // beyond the block's right edge — not visible, not counted.
        if (rc.left >= r.right - 1) return;
        if ((rc.top + rc.bottom) / 2 < slotTop) return;
        var isFirstLine = continues && Math.abs(rc.top - first.top) < plh / 2;
        if ((rc.left + rc.right) / 2 >= midX) {
          st.rightFull = true;
          if (isFirstLine) st.rightOrphan = true;
        } else {
          st.leftFull = true;
          if (isFirstLine) st.leftOrphan = true;
        }
      });
    });
    return st;
  }

  // Decides how many lines tall a two-column block stands. The rule: both
  // columns run full — top line against the divider, bottom line in the
  // slot against the footer gap, line grids aligned (the CSS sets the
  // paragraph gap to exactly one line) — and neither column may end in an
  // orphan. Starts from the tallest height the box allows and gives back
  // one line at a time until the flow satisfies all of it; every line
  // given back becomes space above the title via the caller's anchor
  // shift. Returns 0 when no height fills both columns (content too short
  // to reach the second column's floor at any of them) — callers fall
  // back to the natural balanced flow.
  function pickColumnHeight(el, plh, maxLines) {
    var firstFull = 0;
    for (var k = maxLines; k >= 1; k--) {
      el.style.height = (k * plh) + 'px';
      var st = columnFill(el, plh);
      if (!st.leftFull || !st.rightFull) continue;
      if (!firstFull) firstFull = k;
      if (!st.leftOrphan && !st.rightOrphan) return k;
    }
    return firstFull;
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

    // Restore a previous fit's truncation before anything is measured (or
    // queried — the paragraphs below must be the fresh nodes).
    var block0 = topBox.querySelector('.card-preview-block');
    if (block0 && block0.__fullHTML) block0.innerHTML = block0.__fullHTML;
    if (title && title.__fullHTML) title.innerHTML = title.__fullHTML;
    var paras = topBox.querySelectorAll('.card-preview');

    // Reset any previous fit so a refit measures the natural layout.
    topBox.style.marginTop = '';
    [].forEach.call(topBox.children, function(el){ el.style.display = ''; resetClamp(el); });
    [].forEach.call(paras, function(p){ p.style.display = ''; resetClamp(p); });

    // The hero panel takes the same width as the square essay cards
    // below — a duo half's measured width (same wrap, same gutters), so
    // the hero column lines up with the grid instead of following its
    // own ratio. Height stays the cover image's (the top/bottom insets);
    // aspect-ratio goes to auto or the inline width would recompute the
    // height from it and run the panel past the hero's foot. The CSS 1:2
    // ratio remains only as the no-JS fallback. Width must land before
    // any other measuring: every line wrap below depends on it, and the
    // art-box guard right after decides against the new width like it
    // does for the essay cards.
    panel.style.width = '';
    panel.style.aspectRatio = '';
    panel.style.left = '';
    var heroCard = panel.closest('.card--feature');
    if (heroCard && getComputedStyle(panel).position === 'absolute') {
      var half = document.querySelector('.duo-half');
      if (half) {
        panel.style.width = half.getBoundingClientRect().width + 'px';
        panel.style.aspectRatio = 'auto';
      }
      // Pin to the image's left edge, not the card's: the fitted link
      // (see fitHeroLink above — it runs before any panel fits) IS the
      // image box, so its offset from the card is the pillarbox width.
      var link = heroCard.querySelector('.card-image-link');
      if (link) {
        var inset = link.getBoundingClientRect().left
          - heroCard.getBoundingClientRect().left;
        if (inset > 0) panel.style.left = inset + 'px';
      }
    }

    // The footer band's Art box (the cover credit's hover counterpart)
    // yields when the band's boxes outgrow a narrow panel — they never
    // wrap or shrink, they overflow, and scrollWidth is the tell. Checked
    // before the static-fallback return below so narrow stacked layouts
    // shed it too.
    var artBox = band.querySelector('.pc-art');
    if (artBox) {
      var afterArt = artBox.nextElementSibling;
      artBox.style.display = '';
      if (afterArt) afterArt.style.marginLeft = '';
      if (band.scrollWidth > band.clientWidth + 1) {
        artBox.style.display = 'none';
        // display:none doesn't blank the `.pc-right ~ .pc-right` sibling
        // rule — the box after the art box (Read on) must take over the
        // margin-left:auto push or the right group slides left against
        // the section button instead of pinning to the right edge.
        if (afterArt) afterArt.style.marginLeft = 'auto';
      }
    }

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
          // can't work across column flow, so the block fits as one unit,
          // sized by pickColumnHeight — both columns full from the divider
          // line down to the footer line, grids aligned, neither column
          // ending in an orphan. Overflow spills into clipped phantom
          // columns past the second and is cut at its last whole word by
          // truncateToWord, ellipsis joined on inline.
          //
          // The block's budget stops GAP_BOTTOM above the footer band —
          // 16px of box gap puts the last line's INK the same ~24px from
          // the band rule as the first line's ink sits from the quote
          // divider (whose 20px margin + the line's own leading make up
          // the difference) — and every line the fitter gives back (plus
          // the line-quantization remainder) shifts the whole column DOWN
          // instead of pooling here, so the header gap is a floor, never
          // less.
          var firstP = el.querySelector('.card-preview');
          var plh = parseFloat(getComputedStyle(firstP || el).lineHeight) || 22;
          var bandTop = limit + 14;
          var GAP_BOTTOM = 16;
          var budget = bandTop - GAP_BOTTOM - el.getBoundingClientRect().top;
          var maxLines = Math.floor(budget / plh);
          if (maxLines < 1) {
            // No room for even one line — the quote divider above would
            // sit orphaned over nothing.
            el.style.display = 'none';
            var qd2 = topBox.querySelector('.duo-quote-divider');
            if (qd2) qd2.style.display = 'none';
            return;
          }
          // Sequential fill against an explicit height: the left column
          // fills to the brim before the right starts, which makes "both
          // columns full" a property the height alone controls — and
          // deleting the clipped tail later can't re-balance what shows.
          el.style.overflow = 'hidden';
          el.style.columnFill = 'auto';
          var blockLines = pickColumnHeight(el, plh, maxLines);
          if (blockLines) {
            el.style.height = (blockLines * plh) + 'px';
          } else {
            // Content too short to floor both columns at any height —
            // let it balance naturally and just anchor what there is.
            el.style.height = '';
            el.style.columnFill = '';
            el.style.maxHeight = (maxLines * plh) + 'px';
          }
          // Anchor to the footer: whatever the block doesn't use ends up
          // above it, shifting the column down so the block always ends
          // GAP_BOTTOM above the band. The header gap absorbs all of it
          // (its padding is the minimum).
          var anchorShift = (bandTop - GAP_BOTTOM) - el.getBoundingClientRect().bottom;
          if (anchorShift > 0) topBox.style.marginTop = anchorShift + 'px';
          // Cut text spills into clipped phantom columns, widening the
          // scrollable area — that's the tell that an ellipsis is owed.
          if (el.scrollWidth > el.clientWidth + 1) truncateToWord(el);
          return;
        }
        // Single-column preview (trio/quad/mosaic squares): paragraphs
        // clamp at the rendered line, then the block anchors to the
        // footer band the same way the essays' two-column blocks do —
        // its last line ends GAP_BOTTOM above the band, and the line
        // remainder (or whole unused lines) shifts the column down, the
        // header gap being the minimum.
        var scGap = 16;
        var scLimit = (limit + 14) - scGap;
        var parasCut = false;
        var lastVisible = null;
        [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
          if (parasCut) { p.style.display = 'none'; return; }
          if (p.getBoundingClientRect().bottom <= scLimit) { lastVisible = p; return; }
          parasCut = true;
          if (clampToFit(p, scLimit)) lastVisible = p;
        });
        if (lastVisible) {
          var scShift = scLimit - lastVisible.getBoundingClientRect().bottom;
          if (scShift > 0) topBox.style.marginTop = scShift + 'px';
        } else {
          // Every paragraph died — hide the empty block and the quote
          // divider that would otherwise sit orphaned above it.
          el.style.display = 'none';
          var qd = topBox.querySelector('.duo-quote-divider');
          if (qd) qd.style.display = 'none';
        }
      } else if (el.getBoundingClientRect().bottom > limit) {
        cutting = true;
        el.style.display = 'none';
      }
    });

    // A line-clamped title never discards its overflow lines — the clamp
    // only draws the ellipsis and leaves the clipping to overflow:hidden,
    // which cuts at the PADDING edge. The quad titles carry a
    // padding-bottom for their descender ink (see style.css), and a third
    // line's cap tops paint up into that same strip (negative half-leading
    // at line-height 1.1 puts them above the second line box's bottom).
    // So remove the overflow text for real: cut the title to its last
    // visible word with the ellipsis joined on inline — truncateToWord
    // stashes the pristine markup, restored at the top of every refit.
    if (title && getComputedStyle(title).display !== 'none'
        && title.scrollHeight > title.clientHeight + 1) {
      truncateToWord(title);
    }

    // Homepage contra quads (no excerpt — .card--quad-open, the contra
    // page's wider cells, keeps its footer-anchored preview): the title/
    // dek group floats between the bands, so balance it — the gap from
    // the header band down to the title equals the gap from the dek up
    // to the footer band. The padding-top stays the floor: content too
    // tall for equal gaps never rides up under the header band.
    var quad = panel.closest('.card--quad');
    if (quad && !quad.classList.contains('card--quad-open')) {
      var firstEl = null, lastEl = null;
      [].forEach.call(topBox.children, function(el){
        if (getComputedStyle(el).display === 'none') return;
        if (!firstEl) firstEl = el;
        lastEl = el;
      });
      var headBand = panel.querySelector('.panel-band--top');
      if (firstEl && lastEl && headBand) {
        var gapAbove = firstEl.getBoundingClientRect().top
          - headBand.getBoundingClientRect().bottom;
        var gapBelow = band.getBoundingClientRect().top
          - lastEl.getBoundingClientRect().bottom;
        var centerShift = (gapBelow - gapAbove) / 2;
        if (centerShift > 0) topBox.style.marginTop = centerShift + 'px';
      }
    }
  }

  function fitAll() {
    fitHeroLink(); // before the panels: the hero panel pins to the fitted link
    [].forEach.call(panels, fit);
  }

  (function(){
    if (!heroLink) return;
    var img = heroLink.querySelector('img.card-image');
    // A hero image landing after first run changes the link box (and the
    // panel pinned to it) — refit everything once it arrives.
    if (img && !img.complete) img.addEventListener('load', fitAll, { once: true });
  })();
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
