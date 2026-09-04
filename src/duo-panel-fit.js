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
  if (!document.querySelector('.duo-panel')) return;

  // The one floor constant: text and hard blocks alike fit against the
  // panel floor (see panelFloor) minus this. It is a MINIMUM — a short
  // excerpt ends where it ends and leaves more — but a full box lands
  // its last line exactly here (see featherToFloor below).
  // 18.75, not 24, because this measures the text's BOX and the panel's
  // spacing is specified ink to ink (see PANEL INK RHYTHM in style.css):
  // the Garamond Premier excerpt's baseline rides 6.75px above its line
  // box bottom at 15px/1.5, so a 17.25px box floor is what prints the
  // wanted 24px of air under the last baseline. (This number tracks the
  // body face: 19.75 under Playfair regular, 19.25 under Berlin — re-derive it
  // if the face moves again.)
  // The cover-colour strip at the panel's foot — the ground showing
  // under the body band — stands exactly 24px tall.
  var GAP = 24;
  // The stacked (upright-column) cells' vertical split: the charcoal
  // body band keeps this share of the panel's height, the coloured
  // ground (title, dek, corner credits) the rest — the wide's 50/50
  // column split turned upright, weighted toward the ground. Read by
  // the title fit (reserve) and the body budget (cap) so the two
  // never fight over the same pixels.
  var BAND_SHARE = 0.38;
  // ONE LEADING FOR ALL BODY TEXT. When a block's text filled every
  // line slot its box allows, the sub-line remainder (box height mod
  // line-height) used to be FEATHERED into the leading — each slot
  // opening by up to 15% so the last line sat exactly ON the floor.
  // It bought a clean foot at the price of the page's one measure:
  // every plate and excerpt then read at whatever leading its own box
  // happened to divide into, and the same 16px Garamond ran at 19.2,
  // 19.27, 19.82 and 20.67 in four cells of the same page. Held at 1
  // the slot is always the stylesheet's own — 19.2, the 1.2 both
  // .latest-plate-p and .card-preview are specified at — and the
  // remainder stays where it falls, as air at the foot. The rest of
  // the machinery is untouched: rows are still counted, cuts still
  // made and blocks still seated on this unit; it simply never
  // stretches. (The same objection retired feathering from the
  // stack's gaps once already — see distributeStackSlack: it made the
  // excerpt's rhythm a function of how the box divided.)
  var MAX_SLOT_STRETCH = 1;
  // (RESEAT_SLOT_STRETCH went with it — the re-seat after a cut was
  // the one place allowed to open wider still, and it has had no
  // caller since the multi-column branch was rewritten.)

  // Applies a stretched slot to a preview block's paragraphs: line-height
  // and the between-paragraph gap both become `unit`, so the paragraph
  // gap keeps costing exactly one slot and the whole block scales as one
  // grid. Wraps don't move — line-height is vertical only. Inline styles
  // are cleared by resetClamp on the next fit.
  // THE PLATE'S TITLE LINE (build.js, .plate-title): the post's title
  // in the dek's voice, standing over the first paragraph inside every
  // plate and hero preview block. It is not a body row, so every pass
  // that budgets rows or seats a floor takes its box — height and the
  // gap under it — off the top first.
  function titleBlockOf(scope) {
    var t = scope && scope.querySelector && scope.querySelector('.plate-title');
    if (!t || getComputedStyle(t).display === 'none') return 0;
    var cs = getComputedStyle(t);
    return t.getBoundingClientRect().height
      + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }

  // THE PLATE'S CLOSING LINE (build.js, .plate-more — READ ON…): the
  // same box, taken off the bottom before the rows are counted.
  function moreBlockOf(scope) {
    var t = scope && scope.querySelector && scope.querySelector('.plate-more');
    if (!t || getComputedStyle(t).display === 'none') return 0;
    var cs = getComputedStyle(t);
    return t.getBoundingClientRect().height
      + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }

  function setSlot(block, unit) {
    [].forEach.call(block.querySelectorAll('.card-preview'), function(p, i){
      p.style.lineHeight = unit + 'px';
      if (i) p.style.marginTop = unit + 'px';
    });
  }

  // The line grid's leftover — whatever ground the seated excerpt leaves
  // above the panel's foot — goes into the STACK'S GAPS, split equally
  // over the three interior steps (title→byline, byline→dek, dek→body;
  // over the two that exist when a cell has no dek), never into the
  // body's leading (feathering was tried and walked back — it made the
  // excerpt's rhythm a function of how the box divided). Each joint's
  // share is capped at one line slot so a genuinely short excerpt can't
  // balloon the gaps; past that the remainder stays at the foot.
  // Stacked (band-less) cells only — the caller gates on that.
  function distributeStackSlack(topBox, title, dek, limit) {
    var block = topBox.querySelector('.card-preview-block');
    if (!block || getComputedStyle(block).display === 'none') return;
    // The stack's last element — the dek where one prints (it closes
    // the stack now, under the excerpt), the excerpt itself otherwise.
    // Its box floor is `limit` less its own bottom margin.
    var dekShown = dek && getComputedStyle(dek).display !== 'none';
    var lastEl = dekShown ? dek : block;
    var lastMb = parseFloat(getComputedStyle(lastEl).marginBottom) || 0;
    var r = limit - lastMb - lastEl.getBoundingClientRect().bottom;
    if (r < 1) return;
    var firstP = block.querySelector('.card-preview');
    var plh = parseFloat(getComputedStyle(firstP || block).lineHeight) || 19.5;
    // The excerpt FLOATS: the two joints around it — byline→excerpt
    // (the block's top margin) and excerpt→dek (the dek's top margin)
    // — breathe EQUALLY, so the body keeps the same air above and
    // below. Title→byline stays pinned at 24 (its margin rule in
    // style.css).
    var joints = [[block, 'marginTop']];
    if (dekShown) joints.push([dek, 'marginTop']);
    if (!joints.length) return;
    var add = Math.min(r / joints.length, plh);
    joints.forEach(function(j){
      j[0].style[j[1]] =
        ((parseFloat(getComputedStyle(j[0])[j[1]]) || 0) + add).toFixed(2) + 'px';
    });
  }

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
    // The band block's inner .card-preview-cols wrapper carries the
    // multicol fit styles now — clear those alongside the block's own.
    var rcCols = el.querySelector && el.querySelector('.card-preview-cols');
    el.style.paddingBottom = '';
    if (rcCols) {
      rcCols.style.display = '';
      rcCols.style.overflow = '';
      rcCols.style.maxHeight = '';
      rcCols.style.height = '';
      rcCols.style.columnFill = '';
    }
    el.style.overflow = '';
    el.style.maxHeight = '';
    el.style.height = '';
    el.style.columnFill = '';
    el.style.webkitBoxOrient = '';
    el.style.webkitLineClamp = '';
    el.style.lineClamp = '';
    // The slot stretch's inline leading and paragraph gap (see setSlot) —
    // cleared so every fit measures the natural grid.
    el.style.lineHeight = '';
    el.style.marginTop = '';
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

  // Last non-empty text node under root, or null.
  function lastTextNode(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n, last = null;
    while ((n = w.nextNode())) { if (n.textContent.trim()) last = n; }
    return last;
  }

  // Removes the last word under root (trailing punctuation goes with it;
  // an inline wrapper like <em> that empties out is dropped so the next
  // pass doesn't stall on it). Returns false once nothing is left.
  function popLastWord(root) {
    var n = lastTextNode(root);
    if (!n) return false;
    n.textContent = n.textContent
      .replace(TRAIL_PUNCT, '')
      .replace(/\S+$/, '')
      .replace(/\s+$/, '');
    if (!n.textContent.trim() && n.parentNode !== root) {
      var host = n.parentNode;
      if (host.parentNode && !host.textContent.trim()) {
        host.parentNode.removeChild(host);
      }
    }
    return true;
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
    // The dek rides at the band's foot, after the body; the truncation
    // must stop the body ABOVE the dek's reserved band and keep the dek
    // element itself (removeAfter would otherwise drop it with the tail).
    var dekEl = el.querySelector('.card-dek');
    var dekReserve = 0;
    if (dekEl){ var dkcs = getComputedStyle(dekEl); dekReserve = dekEl.getBoundingClientRect().height + (parseFloat(dkcs.marginTop)||0) + (parseFloat(dkcs.marginBottom)||0); }
    // Word rects come from the FONT-METRIC box, which for EB Garamond
    // (~1.18em) overhangs the 1.1 line box by a few px — a fixed 2px
    // bottom tolerance read every last line as clipped and cut it (titles
    // lost whole lines to it). A quarter line-height absorbs the metric
    // overhang while a genuinely clipped line — a full line-height past
    // the box — still fails by a mile.
    var lineTol = (parseFloat(getComputedStyle(el).lineHeight) || 24) * 0.25;
    function fits(r) {
      return r.bottom <= (blockR.bottom - dekReserve) + lineTol && r.right <= blockR.right + EPS;
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
    // removeAfter took the dek with the tail — put it back at the foot.
    if (dekEl && !el.contains(dekEl)) el.appendChild(dekEl);
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

  // Reads the rendered line boxes of a multi-column block and reports,
  // per column, whether the bottom line slot is occupied (full[]) and
  // whether the line sitting in it is an orphan — a paragraph's opening
  // line stranded at the column's foot while its body carries on past
  // the break. Columns are told apart by banding the block's width into
  // `cols` equal strips (gaps land between bands, so a line's center x
  // always falls in its own column's band). Assumes the block is
  // height-capped at a whole-line multiple with sequential fill, so
  // lines land on the grid with no partials.
  function columnFill(el, plh, cols) {
    var r = el.getBoundingClientRect();
    var bandW = r.width / cols;
    var slotTop = r.bottom - plh;
    // full: the column's bottom line slot is occupied. any: the column
    // holds at least one line at all (the acceptance test for a ragged
    // last column — see the multi-column branch in fit()).
    var st = { full: [], orphan: [], any: [] };
    for (var c = 0; c < cols; c++) { st.full[c] = false; st.orphan[c] = false; st.any[c] = false; }
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
        // Overflow past the last column renders in phantom columns out
        // beyond the block's right edge — not visible, not counted.
        if (rc.left >= r.right - 1) return;
        var col = Math.min(cols - 1, Math.max(0,
          Math.floor(((rc.left + rc.right) / 2 - r.left) / bandW)));
        st.any[col] = true;
        if ((rc.top + rc.bottom) / 2 < slotTop) return;
        var isFirstLine = continues && Math.abs(rc.top - first.top) < plh / 2;
        st.full[col] = true;
        if (isFirstLine) st.orphan[col] = true;
      });
    });
    return st;
  }

  // The rows the INK actually occupies, counted per column and reported
  // as the deepest column. Distinct from columnFill's "is the bottom slot
  // used" question: this is "how far down does the text really reach",
  // which is what tells the caller a seated block came up short.
  function inkRows(el, cols) {
    var r = el.getBoundingClientRect();
    var first = el.querySelector('.card-preview');
    var lh = parseFloat(getComputedStyle(first || el).lineHeight) || 1;
    var gapW = parseFloat(getComputedStyle(el).columnGap) || 0;
    var colW = (r.width - gapW * (cols - 1)) / cols;
    var deepest = 0;
    [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
      if (getComputedStyle(p).display === 'none') return;
      var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = w.nextNode())) {
        var rg = document.createRange();
        rg.selectNodeContents(n);
        var rs = rg.getClientRects();
        for (var i = 0; i < rs.length; i++) {
          if (rs[i].width < 1) continue;
          // Ignore the clipped phantom columns past the last real one.
          var ci = Math.floor((rs[i].left - r.left + 1) / (colW + gapW));
          if (ci < 0 || ci >= cols) continue;
          var row = Math.round((rs[i].top - r.top) / lh) + 1;
          if (row > deepest) deepest = row;
        }
      }
    });
    return deepest;
  }

  // inkRows PER COLUMN: how deep each column's text really reaches,
  // as an array — the mega's bottom-flush walk needs to know the
  // LEFT column's floor, not just the block's deepest.
  function inkRowsPerColumn(el, cols) {
    var r = el.getBoundingClientRect();
    var first = el.querySelector('.card-preview');
    var lh = parseFloat(getComputedStyle(first || el).lineHeight) || 1;
    var gapW = parseFloat(getComputedStyle(el).columnGap) || 0;
    var colW = (r.width - gapW * (cols - 1)) / cols;
    var per = [];
    for (var z = 0; z < cols; z++) per.push(0);
    [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
      if (getComputedStyle(p).display === 'none') return;
      var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = w.nextNode())) {
        var rg = document.createRange();
        rg.selectNodeContents(n);
        var rs = rg.getClientRects();
        for (var i = 0; i < rs.length; i++) {
          if (rs[i].width < 1) continue;
          var ci = Math.floor((rs[i].left - r.left + 1) / (colW + gapW));
          if (ci < 0 || ci >= cols) continue;
          var row = Math.round((rs[i].top - r.top) / lh) + 1;
          if (row > per[ci]) per[ci] = row;
        }
      }
    });
    return per;
  }

  // Decides how many lines tall a multi-column block stands. The rule:
  // every column runs full — top line against the divider, bottom line
  // in the slot against the footer gap, line grids aligned (the CSS sets
  // the paragraph gap to exactly one line) — and no column may end in an
  // orphan. Starts from the tallest height the box allows and gives back
  // one line at a time until the flow satisfies all of it. Returns 0
  // when no height fills every column (content too short to reach the
  // last column's floor at any of them) — callers fall back to the
  // natural balanced flow.
  // The body band carries vertical padding (its 24px inset); every
  // explicit block height/max-height is a border-box, so it must add
  // that padding back or overflow:hidden clips the bottom inset.
  function blockVPad(el){
    var cs=getComputedStyle(el);
    var pad=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
    // The byline now rides inside the band as its first child; reserve its
    // outer height (box + margins) so the excerpt fits BELOW it.
    var by=el.querySelector('.card-meta--line');
    if (by){ var bcs=getComputedStyle(by); pad += by.getBoundingClientRect().height + (parseFloat(bcs.marginTop)||0) + (parseFloat(bcs.marginBottom)||0); }
    var dk=el.querySelector('.card-dek');
    if (dk){ var dcs=getComputedStyle(dk); pad += dk.getBoundingClientRect().height + (parseFloat(dcs.marginTop)||0) + (parseFloat(dcs.marginBottom)||0); }
    return pad;
  }
  function pickColumnHeight(el, plh, maxLines, cols) {
    var firstFull = 0;
    // box-sizing:border-box means a set height swallows the block's own
    // padding (the body band's 24px vertical inset) — add it back so the
    // content area holds exactly k lines and the bottom inset survives.
    var pcVPad = (parseFloat(getComputedStyle(el).paddingTop)||0) + (parseFloat(getComputedStyle(el).paddingBottom)||0);
    for (var k = maxLines; k >= 1; k--) {
      el.style.height = (k * plh + pcVPad) + 'px';
      var st = columnFill(el, plh, cols);
      var allFull = true, anyOrphan = false;
      for (var c = 0; c < cols; c++) {
        if (!st.full[c]) allFull = false;
        if (st.orphan[c]) anyOrphan = true;
      }
      if (!allFull) continue;
      if (!firstFull) firstFull = k;
      if (!anyOrphan) return k;
    }
    return firstFull;
  }

  // Title size follows the CELL, not the viewport. The CSS clamp is sized
  // off vw, so a 318px square was being handed the same 60px as a 685px
  // lead cell: two or three words to the line, no syllable break narrow
  // enough to fit, and therefore no hyphen possible — hyphens:auto had
  // nothing it could do and overflow-wrap broke words mid-letter instead
  // ("The Unsta/geable"). Capping the CSS size at a fixed fraction of the
  // panel's own width leaves the wide cells at the full 60px and gives the
  // squares type their column can actually set — which is what lets the
  // hyphenation, the two-line balancing and the clamp all work at all.
  // Measured against the title's OWN column, not the panel — since the
  // wide cells split into two, the title's measure is half the card and
  // sizing off the panel would put 60px type in a 294px column, the exact
  // mismatch this rule exists to prevent.
  var TITLE_PER_PX = 0.15;
  // Whether this engine will hyphenate a TITLE-CASE English word — which
  // is stricter than having a dictionary: engines deliberately skip
  // capitalized words (so proper nouns never break), and titles are
  // title-case, so a lowercase probe reports a capability the titles
  // never receive. Chrome has the dictionary and still sets
  // "Commodifica / tion" bare. Probe with the capitalized form: it wraps
  // inside a 40px measure only if capitalized words genuinely hyphenate
  // (the span carries no overflow-wrap to fall back on). Decides whether
  // fitTitleSize below may keep a title's full size and trust the
  // hyphen, or must shrink until the longest word sets whole. Words
  // carrying a baked soft hyphen break everywhere and are exempt either
  // way — longestWordWidth measures their fragments, not the whole. */
  var CAN_HYPHENATE = (function(){
    var probe = document.createElement('span');
    probe.lang = 'en';
    probe.textContent = 'Hyphenation';
    probe.style.cssText = 'position:absolute;visibility:hidden;display:block;' +
      'width:40px;font-size:16px;line-height:16px;' +
      '-webkit-hyphens:auto;hyphens:auto;';
    document.body.appendChild(probe);
    var broke = probe.getBoundingClientRect().height > 24;
    document.body.removeChild(probe);
    return broke;
  })();
  // Shared scratch context for measuring words without touching the DOM.
  var measureCtx = document.createElement('canvas').getContext('2d');
  function longestWordWidth(title, fontPx) {
    var cs = getComputedStyle(title);
    measureCtx.font = cs.fontWeight + ' ' + fontPx + 'px ' + cs.fontFamily;
    var hyphenW = measureCtx.measureText('\u2010').width;
    // Measure what the browser SETS, not what the markup says: CSS
    // text-transform never touches textContent, and capitals run wider \u2014
    // measuring the raw case approved sizes whose uppercase rendering
    // overflowed the column and broke mid-word.
    var text = title.textContent.trim();
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
    else if (cs.textTransform === 'capitalize') text = text.replace(/(^|\s)\S/g, function(c){ return c.toUpperCase(); });
    var w = 0;
    (text.split(/\s+/)).forEach(function(word){
      // A soft hyphen is a licensed break: the widest thing such a word
      // ever puts on one line is its longest fragment plus the hyphen
      // the break paints — not the whole word.
      var frags = word.split('\u00AD');
      frags.forEach(function(frag, i){
        var ww = measureCtx.measureText(frag).width
          + (frags.length > 1 && i < frags.length - 1 ? hyphenW : 0);
        if (ww > w) w = ww;
      });
    });
    return w;
  }
  // The width the title has to wrap in: the content box of its containing
  // block. Walks past the display:contents .panel-col wrappers (which have
  // no box of their own) to the first ancestor that actually lays out — the
  // grid for the full-measure stacks (title spans 1 / -1) or the left flex
  // column for the two-up wide cells.
  function titleColWidth(title) {
    // Skip ONLY the display:contents wrappers (which have no box). Stop at
    // the first real element — even if it measures 0 (a closed panel): that
    // is the true containing block, and a 0 there means "not laid out yet",
    // which must bail the fit, not send the walk up into an ancestor whose
    // width has nothing to do with the title's column.
    var el = title.parentElement;
    while (el && getComputedStyle(el).display === 'contents') el = el.parentElement;
    if (!el) return 0;
    var cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  // The stretch core, the masthead's way: the element's text is broken
  // into one or two lines and EACH LINE gets its own font-size, the
  // measured size at which its words span the column exactly — like
  // THE / NEW / CRITIC down the rail. Shared by the titles
  // (fitFillTitle) and the stacked deks (fitFillDek), which "follow the
  // title logic". Called with fontSize/maxWidth already cleared.
  // The one taste rule on the stretch: no single line may swallow the
  // cell. A short word set alone ("MAN" under "MANIFEST") fills the
  // measure at a size that eats half the panel; any setting containing
  // such a line is rejected, and the search falls to the partition with
  // more text per line — usually the whole title on ONE line at its own
  // natural fill size ("MANIFEST MAN", big but proportionate). Size
  // does all the work: the type always fills the measure by scale, no
  // letterspacing. The threshold is a fraction of the line's own
  // column, so small squares police lower than the wide lead cells.
  var LINE_MAX_PER_PX = 0.22;

  // Splits words into k lines minimizing the WIDEST line (spaces
  // included, measured via w100) — the truly balanced setting for the
  // multi-line deks. Exact DP, not greedy: a greedy pass piles its
  // surplus onto the last line, and one over-wide line is exactly what
  // sinks the dek's size floor (the fill size of the widest line IS the
  // setting's smallest type).
  function balancedPartition(words, k, w100) {
    var n = words.length;
    if (k >= n) return words.map(function(){ return 1; });
    // seg[i][j-i]: width of words i..j joined with spaces.
    var seg = [];
    for (var i = 0; i < n; i++) {
      seg.push([]);
      var s = '';
      for (var j = i; j < n; j++) {
        s = s ? s + ' ' + words[j] : words[j];
        seg[i][j - i] = w100(s);
      }
    }
    var INF = Infinity;
    var dp = [], cut = [];
    for (var p = 0; p <= n; p++) {
      dp.push(new Array(k + 1).fill(INF));
      cut.push(new Array(k + 1).fill(0));
    }
    dp[0][0] = 0;
    for (var m = 1; m <= k; m++) {
      for (var e = m; e <= n; e++) {
        for (var b = m - 1; b < e; b++) {
          var w = Math.max(dp[b][m - 1], seg[b][e - 1 - b]);
          if (w < dp[e][m]) { dp[e][m] = w; cut[e][m] = b; }
        }
      }
    }
    var counts = [], at = n;
    for (var mm = k; mm >= 1; mm--) { var bb = cut[at][mm]; counts.unshift(at - bb); at = bb; }
    return counts;
  }

  // opts.minSize: never set a line below this — split onto MORE lines
  //   (up to opts.maxLines) until every line clears it. The deks' floor:
  //   a dek must not print smaller than the body text.
  // opts.maxLines: how many lines the search may use (titles 2, deks 4).
  function stretchFill(el, availW, maxH, opts) {
    opts = opts || {};
    var maxLines = opts.maxLines || 2;
    var cs = getComputedStyle(el);
    var LH = 1.1;
    // Words as the browser sets them (the uppercase transform changes
    // widths — same trap longestWordWidth guards against).
    var raw = el.textContent.trim().replace(/\s+/g, ' ');
    var shown = cs.textTransform === 'uppercase' ? raw.toUpperCase() : raw;
    var rawWords = raw.split(' ');
    var shownWords = shown.split(' ');
    if (!rawWords.length || !raw) return;
    measureCtx.font = cs.fontWeight + ' 100px ' + cs.fontFamily;
    var w100 = function(s){ return measureCtx.measureText(s).width; };

    // Candidate settings: the whole text on one stretched line, any
    // two-line word partition, and (when maxLines allows — the deks) a
    // balanced 3- and 4-line setting. Each line is sized to span availW
    // exactly (half a pixel inside it, so rounding never folds a line).
    var fitW = availW - 0.5;
    // The swallow threshold judges against the CELL (opts.lineMax, from
    // the panel's own width) rather than the line's column — a wide
    // cell's half-width title column deserves the type its whole panel
    // can carry.
    var lineMax = opts.lineMax || availW * LINE_MAX_PER_PX;
    var candidates = [[rawWords.length]];
    for (var i = 1; i < rawWords.length; i++) candidates.push([i, rawWords.length - i]);
    for (var k = 3; k <= maxLines && k <= rawWords.length; k++) {
      candidates.push(balancedPartition(shownWords, k, w100));
    }
    var scored = candidates.map(function(counts){
      var lines = [], shownLines = [], at = 0;
      counts.forEach(function(n){
        lines.push(rawWords.slice(at, at + n).join(' '));
        shownLines.push(shownWords.slice(at, at + n).join(' '));
        at += n;
      });
      var sizes = shownLines.map(function(l){ return fitW * 100 / w100(l); });
      var h = sizes.reduce(function(a, s){ return a + s * LH; }, 0);
      var minSize = Math.min.apply(Math, sizes);
      var maxSize = Math.max.apply(Math, sizes);
      return {
        lines: lines, sizes: sizes, h: h, minSize: minSize, maxSize: maxSize,
        spread: sizes.length > 1 ? maxSize - minSize : 0,
        fitsH: h <= maxH,
        // The taste rule: no line may swallow the cell.
        ok: h <= maxH && maxSize <= lineMax
      };
    });
    var chosen = null;
    if (opts.minSize) {
      // The dek's search: the fewest lines (from 2 up) whose every line
      // clears the floor, fits the height, and stays in proportion —
      // most even setting first.
      for (var kk = 2; kk <= maxLines && !chosen; kk++) {
        var atK = scored.filter(function(c){
          return c.lines.length === kk && c.ok && c.minSize >= opts.minSize - 0.05;
        });
        atK.sort(function(a, b){ return a.spread - b.spread; });
        chosen = atK[0] || null;
      }
      // A short dek that clears the floor on ONE line at a bigger size
      // than any split would give it keeps the line.
      if (!chosen && scored[0].ok && scored[0].minSize >= opts.minSize - 0.05) {
        chosen = scored[0];
      }
      // Nothing clears the floor — take whatever setting comes closest.
      if (!chosen) {
        var fitters = scored.filter(function(c){ return c.fitsH; });
        fitters.sort(function(a, b){ return b.minSize - a.minSize; });
        chosen = fitters[0] || null;
      }
    } else if (opts.preferMostLines) {
      // The wide title's search: the DEEPEST split, UNCONDITIONALLY —
      // every word on its own line ("The / Striver / Class"), whatever
      // the viewport. Height is not a gate but a CAP: the uniform print
      // size starts at the longest line's fill and shrinks to what the
      // budget allows, so a stack too big for its column underfills the
      // measure (it ranges left) instead of giving up lines. (The old
      // height gate made the line COUNT a function of viewport width —
      // wider window, bigger fill size, fewer lines — which flipped the
      // poster stack to two lines on the user's own screen twice.)
      var km = Math.min(maxLines, rawWords.length);
      var atKm = scored.filter(function(c){ return c.lines.length === km; });
      atKm.sort(function(a, b){ return b.minSize - a.minSize; });
      chosen = atKm[0] || scored[0];
      // What a setting will really print at, all caps applied — the
      // uniform (longest line's fill), floored, height-capped by its
      // own line count, ceilinged.
      // (No scaling floor in here: lifting a size past the longest
      // line's fill prints WIDER than the column — the Commodification
      // spill. The floor a poster title really has is depth: more lines
      // mean shorter lines mean bigger fills, and this competition
      // already finds that.)
      var finalSize = function(c){
        var u = c.minSize;
        if (maxH > 0) u = Math.min(u, maxH / (c.lines.length * 1.1));
        if (opts.maxSize) u = Math.min(u, opts.maxSize);
        return u;
      };
      // stackOnlyIfBigger (the postscripts): the stack is a means, not
      // the look — EVERY depth competes on what it will actually print
      // at, mid-way groupings included ("The New / Statesman" beside
      // the full "The / New / Statesman"), and on a tie the FEWEST
      // lines win: when one long word is the width-limiter at any
      // depth, the shallower grouping prints the same size with less
      // stacking. (The wides skip this: their poster stack is the
      // intended look at any size.)
      if (opts.stackOnlyIfBigger) {
        scored.forEach(function(c){
          // No swallow guard here: settings print at the UNIFORM size
          // (the longest line's fill), so a short line can't balloon —
          // and the ceiling polices absolute size. The old per-line
          // `ok` check rejected exactly the wanted mid-ways ("The New /
          // Statesman" for "The New"'s own fill).
          var fs = finalSize(c), bs = finalSize(chosen);
          if (fs > bs + 0.5 || (Math.abs(fs - bs) <= 0.5 && c.lines.length < chosen.lines.length)) {
            chosen = c;
          }
        });
      }
      if (maxH > 0) {
        var uCap = maxH / (chosen.lines.length * 1.1);
        if (uCap > 0) {
          chosen.sizes = chosen.sizes.map(function(s){ return Math.min(s, uCap); });
        }
      }
    } else {
      // The title's search: two balanced lines when every line stays in
      // proportion; a setting whose short line would swallow the cell
      // ("MANIFEST" over a giant "MAN") fails `ok` and the whole title
      // takes ONE line at its own natural fill size instead — smaller
      // type by construction, since the line holds more text.
      var twos = scored.filter(function(c){ return c.lines.length === 2 && c.ok; });
      twos.sort(function(a, b){ return a.spread - b.spread; });
      chosen = twos[0] || (scored[0].ok ? scored[0] : null);
    }
    if (!chosen) {
      // Nothing passes whole — a single word too short to set at a
      // proportionate fill, or no height for any setting. Take the
      // height-fitting candidate with the LEAST oversized line and
      // clamp its lines to the threshold (they underfill and centre —
      // the one case scale alone can't span the measure), else the
      // shortest setting scaled to the height budget.
      var anyFit = scored.filter(function(c){ return c.fitsH; });
      anyFit.sort(function(a, b){ return a.maxSize - b.maxSize; });
      chosen = anyFit[0];
      if (chosen) {
        chosen.sizes = chosen.sizes.map(function(s){ return Math.min(s, lineMax); });
      } else {
        chosen = scored.slice().sort(function(a, b){ return a.h - b.h; })[0];
        var scale = maxH > 0 ? maxH / chosen.h : 1;
        chosen.sizes = chosen.sizes.map(function(s){ return s * scale; });
      }
    }

    // opts.maxSize: a hard ceiling on the print size, whatever the fill
    // or height budget would allow — the wide titles cap at 60px now.
    if (opts.maxSize) {
      chosen.sizes = chosen.sizes.map(function(s){ return Math.min(s, opts.maxSize); });
    }
    if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
    // ONE size for the whole setting: the LONGEST line's fill size caps
    // every line, so a multi-line title reads as one headline at one
    // scale (shorter lines underfill their measure) rather than each
    // line ballooning to span it.
    var uniform = Math.min.apply(Math, chosen.sizes);
    chosen.sizes = chosen.sizes.map(function(){ return uniform; });
    var host = el.querySelector('a') || el;
    host.innerHTML = chosen.lines.map(function(l, k){
      return '<span class="title-line" style="font-size:' + chosen.sizes[k].toFixed(2) + 'px">'
        + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
    }).join('');
    // The em-based margin corrections read the element's own size; the
    // first line's is the closest single stand-in for the stack.
    el.style.fontSize = chosen.sizes[0].toFixed(2) + 'px';
    // The CSS margin-bottom's em term subtracts the LAST baseline's ride
    // (0.21em, Neue Haas at lh 1.1, for both title and dek now) — but em resolves against the element size just set,
    // the FIRST line's. When a two-line setting lands its lines at
    // different sizes the difference prints straight into the ink gap
    // below (a contra pair 30px apart missed by 5), so re-solve the
    // margin against the last line's size. (The margin-TOP term reads
    // the first line, which the element size already is.)
    if (chosen.sizes.length > 1) {
      var sLast = chosen.sizes[chosen.sizes.length - 1];
      if (Math.abs(chosen.sizes[0] - sLast) > 0.1) {
        var mb = parseFloat(getComputedStyle(el).marginBottom);
        if (!isNaN(mb)) {
          var rideF = el.classList.contains('card-dek') ? 0.25 : 0.21;
          el.style.marginBottom = (mb + rideF * (chosen.sizes[0] - sLast)).toFixed(2) + 'px';
        }
      }
    }
    el.__stretched = true;
  }

  // Where a panel's content floors: the footer band's top where a band
  // still stands (the wides, the ticker berths, the hero), the panel's
  // own bottom edge where there is none — the stacked cells print no
  // band at all now, so their excerpt closes the panel itself.
  function panelFloor(panel) {
    var band = panel.querySelector('.panel-band--bottom') || panel.querySelector('.panel-band');
    if (!band) return panel.getBoundingClientRect().bottom;
    var topBoxEl = panel.querySelector('.duo-panel-top');
    if (topBoxEl && topBoxEl.contains(band)) {
      return panel.getBoundingClientRect().bottom;
    }
    return band.getBoundingClientRect().top;
  }

  function fitFillTitle(panel, title) {
    var availW = titleColWidth(title);
    if (!availW) return;
    var floorY = panelFloor(panel);
    var tr = title.getBoundingClientRect();
    // Reserve the room the title must leave below itself: its own bottom
    // margin, plus whatever shares its column beneath it — an excerpt keeps
    // a two-line sliver, a dek keeps its whole (short) self, and in the
    // stacked stack the byline strip and the in-flow band hold their full
    // heights. Content BESIDE the title (the wide cell's excerpt, in the
    // other column) doesn't compete for this vertical space, so the
    // same-column test drops it.
    var reserve = parseFloat(getComputedStyle(title).marginBottom) || 0;
    // Every fill-title cell but contra and the ticker berths runs the
    // POSTER treatment now: words stacked one to the line, ranged left,
    // one uniform size between a floor and a ceiling.
    var wideTitle = !!panel.closest('.duo-half--wide');
    // Every fill-title cell but the ticker berths runs the poster
    // treatment now — contra included, since its ground carries the
    // same corner/title/dek anatomy as the rest.
    var poster = !panel.closest('.ticker-item');
    // And every poster cell may STACK: the wides unconditionally (the
    // poster look), everyone else by the biggest-print competition —
    // deep stack, mid-way grouping, or one/two plain lines, whichever
    // sets largest (see stackOnlyIfBigger in stretchFill).
    var stackTitle = poster;
    // The excerpt CONTAINER once (.card-preview-block), never its individual
    // paragraphs — matching .card-preview here counted every paragraph as a
    // separate 44px reserve, ballooning maxH negative so the search failed
    // and the title fell to its 24px floor.
    [].forEach.call(panel.querySelectorAll('.card-preview-block, .card-dek, .duo-panel-top .card-meta--line, .duo-panel-top .panel-band--bottom'), function(el){
      if (getComputedStyle(el).display === 'none') return;
      var r = el.getBoundingClientRect();
      if (r.height <= 1) return;
      var below = r.top >= tr.top + 4;
      var sameCol = r.left < tr.right - 4 && r.right > tr.left + 4;
      if (!below || !sameCol) return;
      // The stacked poster cells split the panel VERTICALLY with their
      // band — reserve it a real share of the ground (the wide's 50/50
      // column split, turned upright) rather than the old two-line
      // sliver, so the body keeps a readable block under the title.
      reserve += el.classList.contains('card-preview-block')
        ? (poster && !wideTitle ? Math.max(44, panel.clientHeight * BAND_SHARE) : 44)
        : el.classList.contains('card-dek') ? r.height + 12
        : r.height + 8;
    });
    var maxH = floorY - tr.top - GAP - reserve;
    // The POSTER budget mirrors the ground's real anatomy — the title
    // lives between the courier HEADER (the lower of the two corner
    // blocks, plus 16 of air) and the DEK FOOTER (the band's reserved
    // share, the dek's box with its 16 top and 24 seat margins, plus
    // 16 of air above it) — computed from the containing column's own
    // edges, so the centring pass afterwards has exactly the region
    // this budget promised. (The old estimate under-counted the dek's
    // margins and double-counted the corners, which let titles overrun
    // the region and land on the corner blocks.)
    if (poster) {
      var pCol = title.parentElement;
      while (pCol && getComputedStyle(pCol).display === 'contents') pCol = pCol.parentElement;
      if (pCol) {
        var pColTop = pCol.getBoundingClientRect().top;
        // The title ANCHORS the ground's top-left, sharing the top band
        // with the author corner at the right — so the corner reserves
        // WIDTH from the measure, not height from the budget: the lines
        // stop 24 short of the corner's left edge.
        var cornW = 0;
        [].forEach.call(panel.querySelectorAll('.wide-corner'), function(wc){
          if (getComputedStyle(wc).position !== 'absolute') return;
          var ww = wc.getBoundingClientRect().width;
          if (ww > cornW) cornW = ww;
        });
        if (cornW) availW -= cornW + 24;
        // FOOT: the wide closes on the panel's 24 padding (GAP); the
        // stacked cells on their band's reserved share. Then the dek
        // block — box, margins, seat — and 16 of air over it.
        var footRes = wideTitle ? GAP : Math.max(44, panel.clientHeight * BAND_SHARE);
        var dekRes = panel.querySelector('.panel-col--left .card-dek');
        if (dekRes && getComputedStyle(dekRes).display !== 'none') {
          footRes += dekRes.getBoundingClientRect().height + 16 + 24 + 16;
        }
        // The IN-FLOW courier blocks — the mega's kicker above the
        // title, the credit below it — each take their box plus a 16
        // step out of the title's ground. Left column only: the mega's
        // credit rides the body column and costs the title nothing.
        var flowRes = 0;
        var flowMega = !!panel.closest('.duo-half--mega');
        [].forEach.call(panel.querySelectorAll('.panel-col--left :is(.ground-kicker, .ground-credit, .ground-foot, .ground-under)'), function(fl){
          if (getComputedStyle(fl).display === 'none') return;
          // The mega's rows carry their true cost in their MARGINS —
          // the hoisted kicker's negative top margin cancels its
          // whole box (it rides above the cell and takes nothing
          // from the column), so the flat box+16 count starved the
          // title budget and printed the poster visibly small.
          if (flowMega) {
            var fcs = getComputedStyle(fl);
            flowRes += Math.max(0, fl.getBoundingClientRect().height
              + (parseFloat(fcs.marginTop) || 0) + (parseFloat(fcs.marginBottom) || 0));
            return;
          }
          flowRes += fl.getBoundingClientRect().height + 16;
        });
        maxH = floorY - pColTop - footRes - flowRes;
      }
    }
    var posterFit = poster;
    stretchFill(title, availW, maxH, {
      maxLines: stackTitle ? 6 : 2,
      preferMostLines: stackTitle,
      // The non-wides stack to get BIGGER, not for the stack itself —
      // every depth competes on printed size, mid-ways included, and
      // the fewest lines win a tie. The wides stack unconditionally.
      stackOnlyIfBigger: stackTitle && !wideTitle,
      // The 84px CEILING binds the STACKED cells only; the wide's
      // poster stack runs uncapped — its size is already bounded by
      // the column's width (the longest word's fill) and the height
      // budget, and capping it under those printed visibly small in
      // the big ground. No scaling floor anywhere (it printed wider
      // than the column — the real floor is depth, which the
      // competition finds). (The MEGA's one-scale ceiling lives in
      // the painted-ink rescale below — a cap here is washed out by
      // that pass's own fill.)
      // CAPPED AT THE HOUSE 84 on the hero too (it ran to 140 uncapped).
      maxSize: poster ? 84 : 0,
      lineMax: (panel.clientWidth - 48) * LINE_MAX_PER_PX
    });
    // The CAP INK lands on the ground's 24 line, not the line box: the
    // title face's caps sit well below their box top (a fraction of
    // the fitted size — Placard's ~0.27 at lh 1.1), so the box is
    // pulled up by exactly that measured offset.
    if (posterFit) {
      var capSize = parseFloat(title.style.fontSize) || 0;
      if (capSize) {
        var capCs = getComputedStyle(title);
        measureCtx.font = capCs.fontWeight + ' ' + capSize + 'px ' + capCs.fontFamily;
        var capM = measureCtx.measureText('H');
        var capBox = capSize * 1.1;
        var capOff = (capBox - (capM.fontBoundingBoxAscent + capM.fontBoundingBoxDescent)) / 2
          + capM.fontBoundingBoxAscent - capM.actualBoundingBoxAscent;
        if (isFinite(capOff) && capOff > 0) {
          title.style.marginTop = (-capOff).toFixed(2) + 'px';
        }
      }
    }
    // The mega's stack is UNIFORM: the longest line's fill sets every
    // line (the per-line wood-type fill was tried and retired) — but
    // sized by PAINTED ink, not advance width: the fill above leaves
    // the last glyph's right bearing as dead air short of the 24
    // line, so the uniform size rescales by painted-vs-available.
    if (posterFit && title.closest('.duo-half--mega')) {
      var inkCs = getComputedStyle(title);
      var inkCaps = inkCs.textTransform === 'uppercase';
      var inkLns = title.querySelectorAll('.title-line');
      var inkBest = 0;
      [].forEach.call(inkLns, function(ln){
        var s0 = parseFloat(ln.style.fontSize || inkCs.fontSize) || 0;
        if (!s0) return;
        var t = inkCaps ? ln.textContent.toUpperCase() : ln.textContent;
        measureCtx.font = inkCs.fontWeight + ' ' + s0 + 'px ' + inkCs.fontFamily;
        var mm = measureCtx.measureText(t);
        var painted = (mm.actualBoundingBoxLeft || 0) + (mm.actualBoundingBoxRight || 0);
        if (painted > inkBest) inkBest = painted;
      });
      if (inkBest > 0 && inkLns.length) {
        var inkS0 = parseFloat(inkLns[0].style.fontSize || inkCs.fontSize) || 0;
        var inkF = availW / inkBest;
        // The width fill must not overrun the HEIGHT budget: the
        // short panes bind on height, and the dek below prints whole
        // by contract (see the walk's mega exemption) — the title is
        // what yields, so the rescale caps at the budget the
        // stretchFill above already honoured.
        var inkTH = title.getBoundingClientRect().height;
        if (inkTH > 0 && isFinite(maxH) && maxH > 0 && inkTH * inkF > maxH) {
          inkF = maxH / inkTH;
        }
        var inkS = inkS0 * inkF;
        // ONE SCALE for every hero: the print size also ceilings at
        // the THREE-LINE stack's height fill (maxH / 3.3) — The
        // Striver Class's own bound — so a shorter title (Manifest
        // Man's two lines) can't print bigger than the three-line
        // posters around it.
        if (isFinite(maxH) && maxH > 0) inkS = Math.min(inkS, maxH / 3.3);
        // AND NEVER PAST THE HOUSE 84: this fill to the column's ink
        // width ran the poster to 140.
        inkS = Math.min(inkS, 84);
        [].forEach.call(inkLns, function(ln){ ln.style.fontSize = inkS.toFixed(2) + 'px'; });
        // AND THE RENDERED INK IS BROUGHT INSIDE THE MARGIN. The fill
        // above sizes from CANVAS metrics, which are an estimate of
        // the painted box — kerning and the face's own side bearings
        // put the real thing a little wider, and Collegiate Value
        // printed 6.7 past the card's right margin while measuring as
        // a fit. Read what actually landed and take the ratio back if
        // it overhangs; reading the rect here forces the layout the
        // lines above just asked for, so this sees the truth.
        var pb = title.getBoundingClientRect();
        if (pb.width) {
          var prg = document.createRange();
          prg.selectNodeContents(title);
          var pL = Infinity, pR = -Infinity;
          [].forEach.call(prg.getClientRects(), function (r) {
            if (!r.width) return;
            if (r.left < pL) pL = r.left;
            if (r.right > pR) pR = r.right;
          });
          if (pR !== -Infinity) {
            var pOver = Math.max(pR - pb.right, pb.left - pL);
            if (pOver > 0.05) {
              var pRatio = pb.width / (pb.width + pOver);
              if (isFinite(pRatio) && pRatio < 1) {
                [].forEach.call(inkLns, function(ln){
                  var ls = parseFloat(ln.style.fontSize) || inkS;
                  ln.style.fontSize = (ls * pRatio).toFixed(2) + 'px';
                });
              }
            }
          }
        }
      }
    }
  }

  // The stacked dek follows the title's logic (stretch-filled lines —
  // see stretchFill), sized to whatever ground the fitted title left
  // between the byline strip and the in-flow band: its own budget is
  // the floor minus the band's height and a two-line sliver for the
  // excerpt below (contra, band pinned and no excerpt, reserves only
  // its own margin). Runs AFTER fitTitleSize so the dek's measured top
  // already sits under the fitted title.
  function fitFillDek(panel, dek) {
    var availW = titleColWidth(dek);
    if (!availW) return;
    var floorY = panelFloor(panel);
    // The dek sits BELOW the not-yet-clamped excerpt at fit time, so
    // its own rect top says nothing — its ground is measured from the
    // byline strip's closing rule: everything under the strip, minus
    // the excerpt's minimum keep and the fixed steps around the dek.
    // The strip's closing rule where it prints; the strip itself where
    // the rule is hidden (the wides pin the strip over their excerpt
    // column and drop its rule).
    var head = panel.querySelector('.duo-panel-top .card-byline-divider');
    if (head && !head.getClientRects().length) head = null;
    var meta = panel.querySelector('.duo-panel-top .card-meta--line');
    var start = head ? head.getBoundingClientRect().bottom
      : meta ? meta.getBoundingClientRect().bottom
      : dek.getBoundingClientRect().top;
    var dcs = getComputedStyle(dek);
    var reserve = (parseFloat(dcs.marginTop) || 0) + (parseFloat(dcs.marginBottom) || 0);
    var block = panel.querySelector('.card-preview-block');
    var blockShown = block && getComputedStyle(block).display !== 'none';
    // The strip→excerpt step plus a two-line sliver for the excerpt.
    if (blockShown) reserve += 21.57 + 44;
    var maxH = floorY - start - GAP - reserve;
    // The dek's floor is the body text's own size — read live off the
    // excerpt when the cell prints one, the 13px default otherwise. Up
    // to four lines to clear it: a long dek splits further rather than
    // shrinking under the text it introduces.
    var floorSize = 13;
    if (blockShown) {
      var firstP = block.querySelector('.card-preview');
      if (firstP) floorSize = parseFloat(getComputedStyle(firstP).fontSize) || 13;
    }
    // Up to six lines: the wide cells' half-width column needs the
    // extra splits before a long dek clears the body-size floor.
    stretchFill(dek, availW, maxH, {
      minSize: floorSize, maxLines: 6,
      lineMax: (panel.clientWidth - 48) * LINE_MAX_PER_PX
    });
  }

  // The voices whose titles FILL their measure on one or two lines (see
  // fitFillTitle): every section cell, and the ticker berths, whose
  // panels hold nothing but a title and so want exactly this treatment.
  function isFillTitlePanel(panel) {
    return !!(panel.closest('.duo-half--essay') || panel.closest('.duo-half--contra')
      || panel.closest('.duo-half--postscript') || panel.closest('.duo-half--wide')
      || panel.closest('.ticker-item'));
  }

  function fitTitleSize(panel, title) {
    if (!title) return;
    title.style.fontSize = '';
    // maxWidth from a previous pass would understate the measure.
    title.style.maxWidth = '';
    // Every headline voice fills its measure, capped at TWO lines — the
    // essay squares, the wide essay hero, contra, postscript. The old
    // behaviour (a width ratio that only ever SHRANK, one-line titles
    // balanced into two, the wide cells frozen at the CSS size and left to
    // break a long word mid-letter) is gone. Now:
    //   • a title that sets on ONE line at the CSS size stays one line and
    //     grows until it spans the full column (as big as the box allows);
    //   • a title that needs to wrap is set on exactly two lines, sized to
    //     the LARGEST type that still fits in two — a long title shrinks
    //     until two lines hold it (no mid-word break), a short two-liner
    //     grows until one more point would spill a word or a third line.
    // Either way both lines pack out to the column. See fitFillTitle; the
    // excerpt/dek below keeps whatever ground the title leaves.
    if (isFillTitlePanel(panel)) {
      fitFillTitle(panel, title);
      return;
    }
    // Any remaining panel (archive ledger, a non-essay feature) keeps the
    // width-ratio shrink: the title cedes room to the excerpt in its narrow
    // column and never grows past the CSS size.
    var cssPx = parseFloat(getComputedStyle(title).fontSize) || 0;
    var colW = title.getBoundingClientRect().width;
    var colPx = colW * TITLE_PER_PX;
    var size = (colPx && colPx < cssPx) ? Math.round(colPx) : cssPx;
    // Where the engine can hyphenate, an over-long word is the CSS's
    // business: hyphens:auto breaks it at a real syllable and sets the
    // hyphen ("Commodifica-tion"), and the title keeps its full size.
    // Only where no dictionary is installed does the fitter step in —
    // there an overflowing word doesn't even get the hyphen, overflow-
    // wrap just snaps it mid-letter ("Commodifica / tion") — by scaling
    // the size down until the longest word sets whole; the -2 keeps a
    // rounding hair of slack inside the measure. Floored at 20px so a
    // pathological word can't shrink the title into the panel text.
    if (colW && !CAN_HYPHENATE) {
      var wordW = longestWordWidth(title, size);
      if (wordW > colW - 2) {
        size = Math.max(20, Math.floor(size * (colW - 2) / wordW));
      }
    }
    if (size < cssPx) title.style.fontSize = size + 'px';
  }

  // Where the split actually begins, for the rule the wide cells draw
  // between their two facing columns. Only the fitter knows where the
  // footer band starts (its height follows the corner boxes' type), so
  // this geometry is set here rather than guessed at in CSS.
  //
  // The byline strip runs the panel's FULL width — it is a header band
  // above .duo-panel-top, not a member of the left column — so the split
  // below it starts on its closing rule, and the two meet: the strip caps
  // the columns, the rule divides them, the footer band closes them. (It
  // used to start on the panel's own top border, from when the strip sat
  // inside the left column and the rule had to run past it.) Everywhere
  // else the strip and title span the full measure and only the ground
  // BELOW them divides, so the rule starts at the top of whichever column
  // content comes first.
  function splitTop(panel, topBox) {
    if (panel.closest('.duo-half--wide')) {
      var head = panel.querySelector('.card-byline-divider');
      if (head && getComputedStyle(head).display !== 'none') {
        return head.getBoundingClientRect().bottom;
      }
      return topBox.getBoundingClientRect().top;
    }
    var tops = [];
    ['.card-dek', '.card-preview-block'].forEach(function(sel){
      var el = topBox.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') {
        tops.push(el.getBoundingClientRect().top);
      }
    });
    if (!tops.length) return null;
    return Math.min.apply(Math, tops);
  }

  function fitColumnDivider(panel, topBox, band) {
    var rule = topBox.querySelector('.panel-col-divider');
    if (!rule) return;
    rule.style.top = '';
    rule.style.height = '';
    // Cleared every pass — a panel that had nothing to divide last time
    // may have content this time (and vice versa).
    rule.style.display = '';
    if (getComputedStyle(rule).position !== 'absolute') return;
    // A rule has to have something on BOTH sides of it. On the narrow
    // cells the excerpt is the side that can vanish — the fitter drops it
    // when the drop to the band won't hold a single line — and a rule with
    // an empty column beside it divides nothing.
    if (!panel.closest('.duo-half--wide')) {
      var right = topBox.querySelector('.card-preview-block');
      var left = topBox.querySelector('.card-dek');
      var visible = function(el){
        return el && getComputedStyle(el).display !== 'none'
          && el.getBoundingClientRect().height > 1;
      };
      if (!visible(right) || !visible(left)) { rule.style.display = 'none'; return; }
    }
    var start = splitTop(panel, topBox);
    // Nothing in either column: a rule here would divide nothing.
    if (start === null) { rule.style.display = 'none'; return; }
    var topR = topBox.getBoundingClientRect();
    rule.style.top = (start - topR.top) + 'px';
    rule.style.height = Math.max(0, band.getBoundingClientRect().top - start) + 'px';
  }

  // A whole line is worth a couple of points of size: when a title sets
  // in three-plus lines and 1-2px less would save one — typically a
  // short first word stranded alone because the pair after it missed the
  // measure by a hair ("The / Commod-ification…") — take the trade. Runs
  // after fitTitleSize so the word-fit floor is already in; skips the
  // wide cells, whose titles keep their size on principle.
  function fitTitleFewerLines(panel, title) {
    if (!title || panel.closest('.duo-half--wide')) return;
    // Stretch-fitted titles carry per-line sizes in their own spans —
    // the whole-element line count and font-size this works on don't
    // exist for them.
    if (title.__stretched) return;
    if (getComputedStyle(title).display === 'none') return;
    function lineCount() {
      var lh = parseFloat(getComputedStyle(title).lineHeight) || 24;
      return Math.round(title.getBoundingClientRect().height / lh);
    }
    var lines = lineCount();
    if (lines < 3) return;
    var prev = title.style.fontSize;
    var size = parseFloat(getComputedStyle(title).fontSize);
    for (var d = 1; d <= 2; d++) {
      title.style.fontSize = (size - d) + 'px';
      if (lineCount() < lines) return;
    }
    title.style.fontSize = prev;
  }

  // Titles read as two lines wherever the words allow it. A title that
  // sets on one line gets a max-width narrow enough to break it — and
  // since the CSS carries text-wrap:balance, the break lands near the
  // middle instead of dropping a one-word runt. Widths are tried from
  // wide to narrow so the result is the WIDEST two-line setting (the
  // least violence to the natural measure); a title that goes straight
  // from one line to three (one very long word) is left alone, as is a
  // single word and anything already two lines or more.
  function fitTitleTwoLines(title) {
    if (!title) return;
    // Stretch-fitted titles chose their own lines; a max-width here
    // would fold the fitted spans.
    if (title.__stretched) return;
    title.style.maxWidth = '';
    if (getComputedStyle(title).display === 'none') return;
    if (!/\s/.test(title.textContent.trim())) return;
    var lh = parseFloat(getComputedStyle(title).lineHeight) || 24;
    if (Math.round(title.getBoundingClientRect().height / lh) !== 1) return;
    // The RUN's width, not the h3's — the heading fills its column, so
    // its own box says nothing about how wide the words actually set.
    var rng = document.createRange();
    rng.selectNodeContents(title);
    var textW = rng.getBoundingClientRect().width;
    if (!textW) return;
    // Never narrow the box past the longest WORD. Below that the word no
    // longer fits its line and overflow-wrap breaks it mid-letter —
    // "Unstageabl / e" — which is worse than the one line we started with.
    var wordW = 0;
    var tn = document.createTreeWalker(title, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = tn.nextNode())) {
      var re = /\S+/g, m;
      while ((m = re.exec(node.textContent))) {
        var wr = document.createRange();
        wr.setStart(node, m.index);
        wr.setEnd(node, m.index + m[0].length);
        var ww = wr.getBoundingClientRect().width;
        if (ww > wordW) wordW = ww;
      }
    }
    var floorW = Math.ceil(wordW) + 2;
    if (floorW >= textW) return; // one word already fills the measure
    for (var f = 0.72; f >= 0.34; f -= 0.06) {
      var w = Math.max(Math.ceil(textW * f), floorW);
      title.style.maxWidth = w + 'px';
      var n = Math.round(title.getBoundingClientRect().height / lh);
      if (n === 2) return;
      if (n > 2 || w === floorW) break;
    }
    title.style.maxWidth = '';
  }

  // The footer band's boxes never wrap or shrink, they overflow, so
  // scrollWidth is the tell. A narrow card sheds them in reverse
  // keep-priority: first the "Share" label (the chain icon beside it says
  // the same thing, so the word is the one piece that costs width and
  // carries no information of its own), then the cover credit, then the
  // kicker; the section link is the one box that never goes, since it's
  // the card's only navigation. Runs before the static-fallback return in
  // fit() so the stacked mobile layout sheds too.
  function fitBandBoxes(band) {
    var order = [
      band.querySelector('.copylink-label'),
      band.querySelector('.pc-art'),
      band.querySelector('.hero-kicker')
    ];
    order.forEach(function(el){ if (el) el.style.display = ''; });
    for (var i = 0; i < order.length; i++) {
      if (band.scrollWidth <= band.clientWidth + 1) break;
      if (order[i]) order[i].style.display = 'none';
    }
    // display:none doesn't blank the `.pc-right ~ .pc-right` sibling rule,
    // so whichever right-hand box survives first has to take over the
    // margin-left:auto push or the right group slides left against the
    // left group instead of pinning to the right edge.
    var rights = band.querySelectorAll('.pc-right');
    var pushed = false;
    var firstRight = null;
    [].forEach.call(rights, function(el){
      if (getComputedStyle(el).display === 'none') { el.style.marginLeft = ''; return; }
      el.style.marginLeft = pushed ? '' : 'auto';
      if (!pushed) firstRight = el;
      pushed = true;
    });
    // A tight band drops the right group's LEADING rule: when the open
    // ground between the left group and the first right-hand box is
    // narrower than that box, its left rule stands so close to the
    // kicker's that the sliver between them reads as a boxed nothing.
    // Class off first so the measure is of the natural band each pass.
    [].forEach.call(rights, function(el){ el.classList.remove('band-tight'); });
    if (firstRight) {
      var lefts = band.querySelectorAll('.pc-left');
      var leftEdge = band.getBoundingClientRect().left;
      [].forEach.call(lefts, function(el){
        if (getComputedStyle(el).display === 'none') return;
        var r = el.getBoundingClientRect().right;
        if (r > leftEdge) leftEdge = r;
      });
      var fr = firstRight.getBoundingClientRect();
      if (fr.left - leftEdge < fr.width) firstRight.classList.add('band-tight');
    }
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
    // Legacy -webkit-line-clamp ONLY — never the standard line-clamp
    // property alongside it. Chrome versions mid-way through shipping
    // the standardized implementation render the mixed pair as a seated
    // box that never paints (observed live: the walk seats a clamped
    // paragraph, used-slots and rects all correct, zero pixels drawn).
    // The legacy pair alone takes the same battle-tested path in every
    // engine, current Chrome included.
    el.style.webkitLineClamp = String(lines);
    el.classList.add('card-preview--clamped');
    return true;
  }

  // The panel's content sits in two .panel-col groups (see the panel
  // columns block in style.css): left holds art credit, title, byline and
  // dek, right holds the excerpt. On most cards the wrappers are
  // display:contents, so the two read as ONE stack and are fitted as one;
  // on the wide split cells they are real side-by-side columns, and each
  // is fitted against the footer band independently — a dek that runs out
  // of room on the left must not take the excerpt on the right down with
  // it. Returns an array of element groups, in document order.
  function panelGroups(topBox) {
    var cols = [];
    [].forEach.call(topBox.children, function(el){
      if (el.classList.contains('panel-col')) cols.push(el);
    });
    if (!cols.length) return [[].slice.call(topBox.children)];
    var laidOut = cols.filter(function(c){
      return getComputedStyle(c).display !== 'contents';
    });
    if (!laidOut.length) {
      // display:contents everywhere — one flat sequence, exactly the
      // stack this function replaced.
      var flat = [];
      cols.forEach(function(c){
        [].forEach.call(c.children, function(k){ flat.push(k); });
      });
      return [flat];
    }
    return laidOut.map(function(c){ return [].slice.call(c.children); });
  }

  // Every content element of the panel, wrappers flattened — for the
  // blanket resets, which don't care which column anything is in.
  function panelEls(topBox) {
    var out = [];
    panelGroups(topBox).forEach(function(g){
      g.forEach(function(el){ out.push(el); });
    });
    return out;
  }

  // Whatever vertical slack the fitted content leaves above the footer
  // band is given to the TITLE, split evenly above and below it.
  //
  // The body used to absorb it, by feathering its leading until the last
  // line touched the floor — which made the excerpt's rhythm a function
  // of how the box happened to divide, and left the dek and the body
  // running at different leadings on cards that divided differently.
  // Both now hold their 1.5 exactly, and the leftover collects in the one
  // place on the card that is already negative space: the air around the
  // headline.
  //
  // Half above and half below, so the title stays optically centred in
  // its own band. Adding X to each margin moves the content below the
  // title down by 2X — hence the halving; the title itself descends by X,
  // which is what keeps the two gaps equal.
  //
  // Only for stacked panels. On the wide cells the title and the excerpt
  // sit in FACING columns, so growing the title's margins would push the
  // dek around without moving the body an inch.
  function slackToTitle(panel, topBox, band, title) {
    if (!title || getComputedStyle(title).display === 'none') return;
    // Explicitly not the wide cells: their left column centres the
    // title/dek pair with justify-content, so there is no slack to
    // move — and the dek now sits BELOW the title there (it used to
    // face it from the excerpt's column), so the geometric skip below
    // no longer excludes them. Growing the title's margins here would
    // stretch the pair's standardized 36-of-ink gap.
    if (panel.closest('.duo-half--wide')) return;
    // Nor contra: its panel-top centres the title/byline/dek block itself
    // (align-content: safe center — no excerpt, the block floats in the
    // whole ground), so every pixel this would move is already placed.
    // Splitting the ground below the dek onto the title's margins here
    // stretched the block's gaps to whatever the empty panel left over.
    if (panel.closest('.duo-half--contra')) return;
    // Nor the band-less stack: every step is a fixed measure of ink now
    // (see PANEL INK RHYTHM) — a short excerpt simply ends early and
    // leaves its slack at the panel's foot (a full one feathers to it,
    // see featherToFloor); feeding slack to the title's margins would
    // break the whole rhythm.
    if (!band || topBox.contains(band)) return;
    var body = topBox.querySelector('.card-preview-block');
    var dek = topBox.querySelector('.card-dek');
    var last = null;
    [body, dek].forEach(function(el){
      if (!el || getComputedStyle(el).display === 'none') return;
      var r = el.getBoundingClientRect();
      if (r.height <= 1) return;
      // Below the title, and sharing its measure — the facing-column case
      // this must not touch.
      var tr = title.getBoundingClientRect();
      if (r.top < tr.bottom - 4) return;
      if (!last || r.bottom > last) last = r.bottom;
    });
    if (last === null) return;
    // Measure to the last LINE OF INK, not the box edge: a box capped on
    // whole rows can stand a hair taller than the text it holds, and that
    // hair is not slack anyone can see.
    var inkBottom = -Infinity;
    [].forEach.call(topBox.querySelectorAll('.card-preview, .card-dek'), function(el){
      if (getComputedStyle(el).display === 'none') return;
      var tr = title.getBoundingClientRect();
      if (el.getBoundingClientRect().top < tr.bottom - 4) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = w.nextNode())) {
        if (!n.textContent.trim()) continue;
        var rg = document.createRange();
        rg.selectNodeContents(n);
        var rs = rg.getClientRects();
        for (var i = 0; i < rs.length; i++) {
          if (rs[i].width < 1) continue;
          if (rs[i].bottom > inkBottom) inkBottom = rs[i].bottom;
        }
      }
    });
    if (inkBottom === -Infinity) return;
    var slack = band.getBoundingClientRect().top - GAP - inkBottom;
    if (slack < 1) return;
    var cs = getComputedStyle(title);
    var half = slack / 2;
    title.style.marginTop = (parseFloat(cs.marginTop) || 0) + half + 'px';
    title.style.marginBottom = (parseFloat(cs.marginBottom) || 0) + half + 'px';
  }

  // The wide cells' own version. There the excerpt FACES the title rather
  // than sitting under it, so the title's margins can't reach it and its
  // column keeps whatever slack the text leaves. Split that the same way
  // — half above the block, half left under it — so the body sits centred
  // in its column instead of hanging from the top with a hole beneath.
  // (Giving it all to the top would close the hole, but drop the body's
  // first line well below the title's, which is the alignment the two
  // columns are built on.)
  function slackToBodyColumn(panel, topBox, band, title) {
    if (!band || !panel.closest('.duo-half--wide')) return;
    var body = topBox.querySelector('.card-preview-block');
    if (!body || getComputedStyle(body).display === 'none') return;
    // The wide column centres itself now — the dek and the block carry
    // margin:auto (see .panel-col--right in style.css), and flex shares
    // the slack out evenly. Writing a px margin-top here would OVERRIDE
    // the auto (inline beats stylesheet) and pin the head back to the
    // top, so where the autos are in charge this pass stands down. The
    // tell is the COLUMN's display: computed margin-top can't be it —
    // engines resolve a flex auto margin to its used px value there.
    var bodyCol = body.parentNode;
    if (bodyCol && getComputedStyle(bodyCol).display === 'flex') return;
    if (title) {
      var tr = title.getBoundingClientRect();
      // Only the facing-column case: a body BELOW the title is the
      // stacked one, already served by slackToTitle.
      if (body.getBoundingClientRect().top >= tr.bottom - 4) return;
    }
    var inkBottom = -Infinity;
    [].forEach.call(body.querySelectorAll('.card-preview'), function(p){
      if (getComputedStyle(p).display === 'none') return;
      var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = w.nextNode())) {
        if (!n.textContent.trim()) continue;
        var rg = document.createRange();
        rg.selectNodeContents(n);
        var rs = rg.getClientRects();
        for (var i = 0; i < rs.length; i++) {
          if (rs[i].width >= 1 && rs[i].bottom > inkBottom) inkBottom = rs[i].bottom;
        }
      }
    });
    if (inkBottom === -Infinity) return;
    var slack = band.getBoundingClientRect().top - GAP - inkBottom;
    if (slack < 1) return;
    // The column's HEAD takes the half-slack, whatever the head is: the
    // dek when the column opens on one (the wide cells bill the dek over
    // the excerpt now), else the quote rule, else the body — pushing a
    // mid-column element down instead would open a hole between it and
    // whatever sits above it.
    var dekHead = topBox.querySelector('.panel-col--right .card-dek');
    var quote = topBox.querySelector('.duo-quote-divider');
    var head = (dekHead && getComputedStyle(dekHead).display !== 'none') ? dekHead
      : (quote && getComputedStyle(quote).display !== 'none') ? quote : body;
    head.style.marginTop = (parseFloat(getComputedStyle(head).marginTop) || 0) + slack / 2 + 'px';
  }

  // The panel's chrome (kicker, section link) lives in the one fixed
  // footer band — everything else is content, fitted against that band's
  // top edge. When space runs short, content yields in reverse
  // keep-priority: title (clamps, never vanishes) > dek > everything else
  // (credit line, dividers, preview paragraphs).
  function fit(panel) {
    // A panel inside a display:none subtree (the postscript page's
    // prerendered, unselected cards) has no boxes to measure — every
    // rect reads zero and a "fit" would just bake garbage inline
    // styles. Skip it; postscript-index.js fires a resize on reveal
    // and the panel gets its first real fit then.
    if (!panel.getClientRects().length) return;
    var topBox = panel.querySelector('.duo-panel-top');
    // band may be null now — the stacked cells print none; everything
    // that touches it below is guarded, and the floor comes from
    // panelFloor either way.
    var band = panel.querySelector('.panel-band--bottom');
    if (!topBox) return;
    var title = topBox.querySelector('.card-title');
    // Off the PANEL, not the top box: the byline strip is a header band
    // above .duo-panel-top now, so it runs the full width on wide cells.
    var meta = panel.querySelector('.card-meta--line');

    // Restore a previous fit's truncation before anything is measured (or
    // queried — the paragraphs below must be the fresh nodes). All cuts
    // are block-level (truncateToWord on the preview block, in every
    // branch), so one restore covers them.
    var block0 = topBox.querySelector('.card-preview-block');
    if (block0 && block0.__fullHTML) block0.innerHTML = block0.__fullHTML;
    // The multicol cut runs on the inner .card-preview-cols wrapper now —
    // restore its truncation the same way (the block-level restore above
    // replaces the wrapper node wholesale when it fires, which is fine:
    // the fresh node simply has no __fullHTML yet).
    var cols0 = block0 && block0.querySelector('.card-preview-cols');
    if (cols0 && cols0.__fullHTML) cols0.innerHTML = cols0.__fullHTML;
    if (title && title.__fullHTML) { title.innerHTML = title.__fullHTML; title.__stretched = false; }
    // The stacked dek is stretch-fitted like the title (fitFillDek) —
    // same restore, and its fitted inline size goes with it.
    var dek = topBox.querySelector('.card-dek');
    if (dek) {
      if (dek.__fullHTML) { dek.innerHTML = dek.__fullHTML; dek.__stretched = false; }
      dek.style.fontSize = '';
      // stretchFill may have re-solved this against its last line's size.
      dek.style.marginBottom = '';
      // The foot pass distributes the grid's remainder into this margin.
      dek.style.marginTop = '';
    }
    // ...and into the byline's bottom margin — both restored per fit.
    var meta0 = topBox.querySelector('.card-preview-block .card-meta--line');
    if (meta0) meta0.style.marginBottom = '';
    // The credit row's ink-midpoint seat is re-solved every fit.
    var credReset = topBox.querySelector('.ground-credit');
    if (credReset) credReset.style.marginTop = '';
    var paras = topBox.querySelectorAll('.card-preview');

    // Reset any previous fit so a refit measures the natural layout.
    // The title's margins carry the slack distribution (see slackToTitle)
    // and must go back to their CSS values before anything is measured.
    if (title) { title.style.marginTop = ''; title.style.marginBottom = ''; }
    var qdReset = topBox.querySelector('.duo-quote-divider');
    if (qdReset) qdReset.style.marginTop = '';
    var dekReset = topBox.querySelector('.panel-col--right .card-dek');
    if (dekReset) dekReset.style.marginTop = '';
    var bodyReset = topBox.querySelector('.card-preview-block');
    if (bodyReset) bodyReset.style.marginTop = '';
    topBox.style.marginTop = '';
    panelEls(topBox).forEach(function(el){ el.style.display = ''; resetClamp(el); });
    [].forEach.call(paras, function(p){ p.style.display = ''; resetClamp(p); });

    // The hero panel covers the cover image's exact box — the fitted
    // link (see fitHeroLink above — it runs before any panel fits) IS
    // the image's contain-box, so the panel takes its width and left
    // edge outright: hover ring, dim, glow and panel all share one
    // rectangle, exactly like a duo half's. Height stays the card's
    // (top/bottom insets), which is the image's own — the hero image
    // pillarboxes left/right, never top/bottom. aspect-ratio goes to
    // auto or the inline width would recompute the height from it and
    // run the panel past the hero's foot; the CSS 1:2 ratio remains
    // only as the no-JS fallback. Width must land before any other
    // measuring: every line wrap below depends on it, and the art-box
    // guard right after decides against the new width like it does for
    // the essay cards.
    panel.style.width = '';
    panel.style.aspectRatio = '';
    panel.style.left = '';
    var heroCard = panel.closest('.card--feature');
    if (heroCard && getComputedStyle(panel).position === 'absolute') {
      var link = heroCard.querySelector('.card-image-link');
      if (link) {
        var linkR = link.getBoundingClientRect();
        panel.style.width = linkR.width + 'px';
        panel.style.aspectRatio = 'auto';
        var inset = linkR.left - heroCard.getBoundingClientRect().left;
        if (inset > 0) panel.style.left = inset + 'px';
      }
    }

    // Seat the footer band's four boxes (or shed what won't fit) before
    // anything measures against the band — shedding changes its height,
    // and so the floor every column fits to. Ahead of the static-fallback
    // return below so the stacked mobile layout sheds too.
    if (band) fitBandBoxes(band);

    // The byline seats the likes box beside the author only when the line
    // has room for author + likes + date — the boxes never shrink or wrap
    // (see .card-meta--line's flex-shrink:0), so scrollWidth is the tell,
    // same as the band. Ahead of the static-fallback return below so the
    // stacked mobile layout sheds too.
    if (meta) {
      // Same order of sacrifice as the band: the "Share" word goes before
      // anything with meaning does, since its icon stays and still says it.
      var bylineLabel = meta.querySelector('.copylink-label');
      if (bylineLabel) {
        bylineLabel.style.display = '';
        if (meta.scrollWidth > meta.clientWidth + 1) bylineLabel.style.display = 'none';
      }
      var bylineLikes = meta.querySelector('.meta-likes');
      if (bylineLikes) {
        bylineLikes.style.display = '';
        meta.classList.remove('likes-shed');
        if (meta.scrollWidth > meta.clientWidth + 1) {
          bylineLikes.style.display = 'none';
          // The corner box (and its outer 24s) passes to the date — see
          // .card-meta--line.likes-shed in style.css.
          meta.classList.add('likes-shed');
        }
      }
    }

    // In the static fallback layout (touch devices / narrow viewports) the
    // panel flows under the image and the bands sit in flow too — nothing
    // to fit against, and the CSS fallback clamps handle length.
    if (getComputedStyle(panel).position !== 'absolute') {
      return;
    }

    // Lift the CSS fallback clamps so each paragraph's full text is
    // measurable (and kept, when the box turns out to have the room).
    // The stylesheet's standard line-clamp is lifted with 'none' — which
    // DISENGAGES the standardized clamp path — never with a big number,
    // which keeps that path active (see clampToFit for the paint bug the
    // active path has in mid-transition Chrome versions).
    [].forEach.call(paras, function(p){
      p.style.webkitLineClamp = '999';
      p.style.lineClamp = 'none';
    });
    // Break one-line titles in two BEFORE anything is measured against the
    // floor — the second line moves everything under it down, so a budget
    // computed on the one-line title would be wrong by a whole line.
    // Size the title to its cell first — every measurement after this one
    // (the two-line break, the credit's clearance, the floor budget)
    // depends on the type size being settled.
    fitTitleSize(panel, title);
    // The fill-title voices own their line count — fitFillTitle grows a
    // one-line title to the column and holds a wrapping one to exactly two.
    // The fewer-lines trim and the two-line balancer both fight that (one
    // shrinks to save a line, the other forces a split), so neither runs
    // for them; they still serve the width-ratio fall-through titles.
    if (!isFillTitlePanel(panel)) {
      fitTitleFewerLines(panel, title);
      fitTitleTwoLines(title);
    }
    // Every stacked cell's dek follows the title's logic — the wides
    // included, now that they run the same stack — stretch-fitted to
    // fill its lines (see fitFillDek). After the title, so the dek's
    // budget is measured under the fitted title.
    if (dek && getComputedStyle(dek).display !== 'none' && isFillTitlePanel(panel)) {
      // fitFillDek retired — the dek runs plain 14px Courier now (see
      // THE DEK in style.css), wall to wall, not stretch-fitted.
      // fitFillDek(panel, dek);
    }
    // One floor for everything, GAP of air above it: the band's top edge —
    // or the panel's own bottom edge where the band sits in the flow
    // (see panelFloor). (This used to be -14 for hard blocks and -16 for
    // running text — two constants disagreeing by a hair for no reason
    // anyone remembered.)
    var bandTop = panelFloor(panel);
    var limit = bandTop - GAP;
    // The stacked cells' dek closes the stack BELOW the excerpt, so the
    // excerpt's own floor rises by the dek's full outer height (box +
    // both margins). Measured here, after fitFillDek has set the dek's
    // real lines; the wides (band present) keep their dek above the
    // excerpt and reserve nothing.
    // The dek rides INSIDE the band now (its last line, reserved by
    // blockVPad), so nothing is reserved for it below the band.
    var dekBelowReserve = 0;

    // The title outranks the dek wherever the dek sits: if the dek comes
    // first in the column, everything from its bottom edge down through
    // the title's natural bottom is reserved out of the dek's own budget
    // (so the dek yields lines and the title rides up); when the dek sits
    // below the title — the current order — that distance is negative and
    // the reserve clamps to 0, leaving the dek to fit in whatever the
    // title left over. No separate reserve for the credit line any more:
    // it sits ABOVE the dek now, so its height is already inside the dek's
    // own measured top edge (reserving it again cost the dek a line).
    var reserve = 0;
    if (dek && title && getComputedStyle(dek).display !== 'none') {
      reserve = Math.max(0,
        title.getBoundingClientRect().bottom - dek.getBoundingClientRect().bottom);
    }
    // Each column yields on its own. In the single-stack case there is
    // exactly one group and this behaves as the flat loop always did.
    panelGroups(topBox).forEach(function(group){
    var groupLimit = limit;
    var cutting = false;
    group.forEach(function(el){
      if (getComputedStyle(el).display === 'none') return;
      // The in-flow band is chrome, not content: never clamped, never
      // cut — the budgets above already count its height.
      if (el.classList.contains('panel-band')) return;
      // So are the ground's ruled courier rows — the kicker sits flush
      // on the card's top edge and the foot row flush on its bottom
      // (deliberately AT the walk's floor line), and the title budget
      // already reserves all three.
      if (el.classList.contains('ground-kicker')
        || el.classList.contains('ground-credit')
        || el.classList.contains('ground-under')
        || el.classList.contains('ground-foot')) return;
      if (el === dek) {
        // The MEGA prints its dek WHOLE, always: the poster budget
        // reserves the dek's full height before the title is sized,
        // so the TITLE yields room — clamping the quote to protect
        // type that already ceded to it would be backwards.
        if (el.closest('.duo-half--mega')) return;
        // A stretch-fitted dek sized itself to its budget already; the
        // whole-element clamp would fight the per-line spans.
        if (el.__stretched) return;
        // Clamping (or even hiding) the dek to protect the title is not a
        // cut — everything after it shifts up and keeps its shot.
        // The ink-aligned dek's box legitimately crosses the GAP line
        // by its below-baseline hand-back (the negative bottom margin
        // that seats the BASELINE at 24) — its descenders live in the
        // foot padding. Fold that overshoot into the limit, or the
        // guard reads it as overflow and clamps the dek: lines cut to
        // "that is…" and the clamp's overflow:hidden shearing the g's.
        var dekMb0 = parseFloat(getComputedStyle(el).marginBottom) || 0;
        var dekLim = groupLimit - reserve - Math.min(0, dekMb0) + 1;
        // A dek that can't fit even one line just goes — .card-byline-divider
        // stays put regardless: it closes the byline header strip above the
        // TITLE now, nothing to do with the dek.
        if (el.getBoundingClientRect().bottom > dekLim) clampToFit(el, dekLim);
        return;
      }
      if (el === title) {
        // Last resort, after the dek above has already yielded: a title
        // that still crosses the floor clamps to the lines that fit
        // rather than vanishing. Checked here (not via the generic branch
        // below) so a clamped title's padding-bottom sitting a hair past
        // the limit never hides it outright.
        if (el.getBoundingClientRect().bottom > groupLimit) clampToFit(el, groupLimit);
        return;
      }
      if (cutting) {
        // The band block carries the byline and dek now — when the walk
        // runs out of floor, hide only its BODY wrapper and keep the band
        // (the contra grounds hit this every time; they print no body).
        var cutCols = el.classList.contains('card-preview-block')
          && el.querySelector('.card-preview-cols');
        if (cutCols) { cutCols.style.display = 'none'; return; }
        el.style.display = 'none';
        return;
      }
      if (el.classList.contains('card-preview-block')) {
        // The paragraphs live in the .card-preview-cols wrapper (the real
        // multicol container); byline and dek are its plain-flow siblings
        // inside the band block. All column geometry runs on the wrapper;
        // budgets and caps run on the block (whose blockVPad reserves the
        // padding, the byline and the dek).
        var colsEl = el.querySelector('.card-preview-cols') || el;
        // The PRISTINE text, captured before any pass's cut touches
        // it — the mega's bottom-flush walk (and every repeat fit
        // pass) restores from here, so cuts never compound.
        if (!colsEl.__megaFull) colsEl.__megaFull = colsEl.innerHTML;
        else if (el.closest('.duo-half--mega')) colsEl.innerHTML = colsEl.__megaFull;
        var colCount = parseInt(getComputedStyle(colsEl).columnCount, 10) || 1;
        // Every duo half but contra runs its band FLUSH to the panel's
        // bottom edge now (the wide's full-height column; the stacked
        // cells' pinned foot band) — the band's own 24px bottom inset
        // (inside blockVPad) is the closing air, so the GAP strip drops
        // out of the body budget. Contra (and the non-duo-half panels —
        // hero, ledger) keep the strip.
        var bandFlush = !!panel.closest('.duo-half');
        // Every duo half's band is flush now, contra included.
        // The STACKED cells split the panel vertically with their band —
        // and unlike the wide's side column, the band competes with the
        // coloured ground for the same height. Left uncapped it swallows
        // every pixel the title leaves (the flow puts its top right under
        // the dek), the flex centring is left no free space, and the
        // title lands on the corner credits. Cap the band's CONTENT at
        // the same share of the panel the title fit reserves for it
        // (BAND_SHARE), so the ground keeps its centring room.
        var stackedBand = bandFlush && !panel.closest('.duo-half--wide');
        var bandCap = stackedBand
          ? Math.max(44, panel.clientHeight * BAND_SHARE) - blockVPad(el)
          : Infinity;
        if (colCount > 1) {
          // Multi-column essay excerpt (the two-across squares, the hero,
          // the archive-wide cell): line-clamping individual paragraphs
          // can't work across column flow, so the block fits as one unit,
          // sized by pickColumnHeight — every column full from the
          // divider line down to the footer line, grids aligned, no
          // column ending in an orphan. Overflow spills into clipped
          // phantom columns past the last and is cut at its last whole
          // word by truncateToWord, ellipsis joined on inline.
          var firstP = el.querySelector('.card-preview');
          var plh = parseFloat(getComputedStyle(firstP || el).lineHeight) || 22;
          var budget = Math.min(
            bandTop - (bandFlush ? 0 : GAP) - dekBelowReserve - el.getBoundingClientRect().top - blockVPad(el) - titleBlockOf(el) - moreBlockOf(el),
            bandCap);
          // THE MEGA PLATE'S BODY CLOSES 48 ABOVE ITS BOTTOM RULE.
          // The budget used to run to the hero DEK'S BASELINE, which
          // is a seat with no fixed relation to the block's own foot —
          // the columns landed 31 short of the rule on one hero and 70
          // on the next, which is no measure at all. The block's bottom
          // IS the rule's line (the curtain's foot), so the budget is
          // that line less the page's 48 step; the row count follows,
          // and the cut lands the last full row above it.
          if (el.closest('.duo-half--mega')) {
            var mgFoot = el.getBoundingClientRect().bottom;
            var mgHead = el.getBoundingClientRect().top
              + (parseFloat(getComputedStyle(el).paddingTop) || 0);
            var inkBudget = mgFoot - 48 - mgHead - titleBlockOf(el) - moreBlockOf(el);
            if (inkBudget > 0) budget = inkBudget;
          }
          var maxLines = Math.floor(budget / plh);
          if (maxLines < 1) {
            // No room for even one body line — hide the BODY only (the
            // band block still carries the byline and dek; hiding the
            // whole block took them with it on the small contra grounds).
            if (colsEl !== el) colsEl.style.display = 'none';
            else el.style.display = 'none';
            var qd2 = topBox.querySelector('.duo-quote-divider');
            if (qd2) qd2.style.display = 'none';
            return;
          }
          // Sequential fill against an explicit height: the left column
          // fills to the brim before the right starts, which makes "both
          // columns full" a property the height alone controls — and
          // deleting the clipped tail later can't re-balance what shows.
          colsEl.style.overflow = 'hidden';
          colsEl.style.columnFill = 'auto';
          // A block that can fill (or overfill) the full height keeps it
          // outright, in either of two shapes:
          //   - text to spare: spills at full height, truncates on the
          //     bottom row. The no-orphan walk used to give back whole
          //     rows here, and the slot stretch (capped at 15%) can
          //     never bridge a 21px row — cards floated a row or two off
          //     the floor to dodge an orphan that, beside a truncation
          //     ellipsis, is no blemish: the block already ends
          //     mid-sentence.
          //   - text one line shy of flush (the parity case): every
          //     column but the last runs full and the last runs ragged,
          //     like a book's final page. The old flush-bottom rule cut
          //     that spare line AND dropped a row of box for it.
          // Only a block too short to fill the first column at full
          // height still walks down through pickColumnHeight for a
          // balanced, flush, orphan-free ending — there the bottom line
          // is a real ending, and worth keeping clean.
          colsEl.style.height = (maxLines * plh) + 'px';
          var blockLines = 0;
          var stMax = columnFill(colsEl, plh, colCount);
          // EVERY column's bottom slot occupied at full height means the
          // text reaches the floor on its own — the box is full, whatever
          // else is true of it. That is the test that decides whether the
          // block keeps its height; scrollWidth alone is not.
          //
          // It used to be: spills ? maxLines : walk. But a block can fill
          // its box to the last slot and still not register as spilling —
          // multicol overflow doesn't always widen scrollWidth — and such
          // a block fell through to the no-orphan walk, which gave back
          // WHOLE ROWS to avoid ending a column on a paragraph's opening
          // line. Three rows of dead space under a full-looking excerpt,
          // to dodge an orphan the truncation ellipsis makes moot.
          var allFull = true;
          for (var cf = 0; cf < colCount; cf++) {
            if (!stMax.full[cf]) allFull = false;
          }
          // THE HERO FILLS ITS BUDGET. The walk below hands whole rows
          // back to avoid a column ending on a paragraph's opening
          // line — but the budget is now the 48 line above the bottom
          // rule, and giving rows back from it put the body 106 above
          // that rule where another hero sat at 69. The truncation
          // ellipsis makes the orphan moot (the note above says as
          // much), so the mega takes every row its budget allows and
          // the only slack left is the sub-line remainder.
          if (el.closest('.duo-half--mega')) {
            blockLines = maxLines;
          } else if (allFull || colsEl.scrollWidth > colsEl.clientWidth + 1) {
            blockLines = maxLines;
          } else {
            var interiorFull = true;
            for (var ci = 0; ci < colCount - 1; ci++) {
              if (!stMax.full[ci]) interiorFull = false;
            }
            blockLines = interiorFull && stMax.any[colCount - 1]
              ? maxLines
              : pickColumnHeight(colsEl, plh, maxLines, colCount);
          }
          if (blockLines) {
            colsEl.style.height = (blockLines * plh) + 'px';
            var spills = colsEl.scrollWidth > colsEl.clientWidth + 1;
            // No slot stretch. The excerpt keeps its 1.5 leading exactly,
            // whatever the box's sub-line remainder — feathering the
            // leading to reach the floor made the body's rhythm a
            // function of how the box happened to divide. The remainder
            // is handed to the title's margins instead (see slackToTitle
            // at the end of fit), where it reads as air around the
            // headline rather than as looser body copy.
            // The cut can leave the block a row taller than its ink. A
            // paragraph gap costs a slot of its own, so when a column has
            // exactly one row left, nothing can use it: the next
            // paragraph needs the gap AND a line. The box still reaches
            // the floor, but the text stops a row above it — which reads
            // as a card that failed to fill, and is the one shortfall the
            // stretch above can't have anticipated, since it ran before
            // the cut existed.
            // Cut text spills into clipped phantom columns, widening the
            // scrollable area — the tell that an ellipsis is owed.
            if (spills) truncateToWord(colsEl);
            // The cut can leave the box a row taller than its ink (a
            // paragraph gap costs a slot of its own, so a single leftover
            // row can hold nothing). Shrink to the rows the ink really
            // occupies.
            var seated = inkRows(colsEl, colCount);
            if (seated && seated < blockLines) {
              colsEl.style.height = (seated * plh + 1) + 'px';
            }
            // Whatever ground the seated rows leave above the floor —
            // the grid's sub-line remainder, a structurally freed row —
            // is handed to the stack's gaps afterwards (see
            // distributeStackSlack at the end of fit).
            // Except on THE MEGA PLATE, which has no title to hand it
            // to: its body must CLOSE ON THE FOOT (the dek's line —
            // the block's bottom pad already seats the descender), so
            // the sub-line remainder feathers into the leading here,
            // capped at the general slot stretch.
            if (el.closest('.duo-half--mega')) {
              var mgRows = (seated && seated < blockLines) ? seated : blockLines;
              var mgCs = getComputedStyle(el);
              var mgAvail = el.clientHeight
                - (parseFloat(mgCs.paddingTop) || 0)
                - (parseFloat(mgCs.paddingBottom) || 0);
              // The floor is the HERO DEK'S BASELINE (ink bottom,
              // descenders excluded), not the block's bottom pad —
              // same rule as the latest plates: the body's last
              // baseline seats on the dek's own.
              var mgDek = el.closest('.duo-panel') && el.closest('.duo-panel').querySelector('.card-dek');
              var mgCover = el.closest('.duo-half--mega').querySelector('.duo-card-image');
              if (mgDek && mgCover) {
                var mgTop = el.getBoundingClientRect().top + (parseFloat(mgCs.paddingTop) || 0);
                // Derived like the budget above: baseline = the
                // cover's foot less the dek face's descender (the
                // solver's own seat), stable at any point in the pass.
                var mdcs = getComputedStyle(mgDek);
                var mdctx = document.createElement('canvas').getContext('2d');
                mdctx.font = mdcs.fontStyle + ' ' + mdcs.fontWeight + ' ' + mdcs.fontSize + ' ' + mdcs.fontFamily;
                var mgDekBaseline = mgCover.getBoundingClientRect().bottom
                  - (mdctx.measureText('gjpqy').actualBoundingBoxDescent || 0);
                var mpcs = getComputedStyle(colsEl.querySelector('p') || colsEl);
                var mpctx = document.createElement('canvas').getContext('2d');
                mpctx.font = mpcs.fontStyle + ' ' + mpcs.fontWeight + ' ' + mpcs.fontSize + ' ' + mpcs.fontFamily;
                var mpm = mpctx.measureText('Mx');
                var mgBoxBelow = (plh - (mpm.fontBoundingBoxAscent + mpm.fontBoundingBoxDescent)) / 2 + mpm.fontBoundingBoxDescent;
                // THE HERO'S BODY CLOSES 48 ABOVE ITS BOTTOM RULE too
                // — the dek-ink floor ran the columns to within 32 of
                // it on one hero and 70 on the next, which is no
                // measure at all. The page's step, stated.
                var mgInkAvail = el.clientHeight - (parseFloat(mgCs.paddingTop) || 0) - 48 - titleBlockOf(el) - moreBlockOf(el);
                if (mgInkAvail > 0) mgAvail = mgInkAvail;
                // Persist the deeper floor into the block's own pad:
                // the row CUT earlier in fit() reads it, so the next
                // pass (fonts/load always re-run fitAll) seats the
                // full extra rows instead of stretch-capping.
                if (Math.abs(48 - (parseFloat(mgCs.paddingBottom) || 0)) > 0.5) {
                  el.style.paddingBottom = '48px';
                }
              }
              // BOTTOM-FLUSH COLUMNS: both columns' last lines must
              // land on the same bottom row — a paragraph gap falling
              // at the left column's foot otherwise leaves it a row
              // short of the right. Walk the row count down (restoring
              // the full text each try — this also makes repeat passes
              // idempotent) until every inked column ends ON the cut
              // row; the feather below then stretches the survivors to
              // the dek-baseline floor.
              // BOTTOM-FLUSH COLUMNS: both columns' last lines must
              // land on the same bottom row — a paragraph gap falling
              // at the left column's foot otherwise leaves it a row
              // short of the right. Walk the row count down, testing
              // each candidate AT ITS OWN FEATHERED UNIT (the stretch
              // re-flows the columns, so flushness at the natural
              // leading proves nothing), restoring the full text each
              // try — which also makes repeat passes idempotent.
              if (!colsEl.__megaFull) colsEl.__megaFull = colsEl.innerHTML;
              if (mgRows > 0 && mgAvail > 0) {
                var mgBest = 0, mgBestUnit = 0;
                for (var mk = mgRows; mk >= Math.max(1, mgRows - 3); mk--) {
                  var tryUnit = Math.max(plh, Math.min(mgAvail / mk, plh * MAX_SLOT_STRETCH));
                  colsEl.innerHTML = colsEl.__megaFull;
                  setSlot(el, tryUnit);
                  colsEl.style.height = (mk * tryUnit) + 'px';
                  if (colsEl.scrollWidth > colsEl.clientWidth + 1) truncateToWord(colsEl);
                  // FLUSH = every inked column ends on the SAME row
                  // (the absolute index drifts a hair under the
                  // feathered grid's rounding; equality is what the
                  // eye reads).
                  var perCol = inkRowsPerColumn(colsEl, colCount);
                  var flushOK = perCol[0] > 0;
                  for (var pc = 1; pc < perCol.length; pc++) {
                    if (perCol[pc] && perCol[pc] !== perCol[0]) flushOK = false;
                  }
                  if (flushOK) { mgBest = mk; mgBestUnit = tryUnit; break; }
                }
                if (!mgBest) { mgBest = mgRows; mgBestUnit = Math.max(plh, Math.min(mgAvail / mgRows, plh * MAX_SLOT_STRETCH)); }
                colsEl.innerHTML = colsEl.__megaFull;
                setSlot(el, mgBestUnit);
                colsEl.style.height = (mgBest * mgBestUnit) + 'px';
                if (colsEl.scrollWidth > colsEl.clientWidth + 1) truncateToWord(colsEl);
              }
            }
          } else {
            // Content too short to floor every column at any height —
            // let it balance naturally and just cap what there is.
            colsEl.style.height = '';
            colsEl.style.columnFill = '';
            colsEl.style.maxHeight = (maxLines * plh) + 'px';
            if (colsEl.scrollWidth > colsEl.clientWidth + 1) truncateToWord(colsEl);
          }
          return;
        }
        // Single-column preview (trio/quad-open cells, the split rows'
        // postscript thirds, the wide cells' right column): cap the WHOLE
        // block at the slot count and cut the text to the box, exactly as
        // the multi-column branch does — block geometry is the one
        // mechanism every engine paints. (The per-paragraph walk that
        // lived here seated its partial paragraph correctly — used-slots
        // and rects all right — and Chromium drew zero pixels for it in
        // the wide cells, under -webkit-box and max-height clamps alike.)
        // The paragraph gap is exactly one line (see the .card-preview +
        // .card-preview rule in style.css), so the block is a uniform
        // grid of line slots and the cap seats exactly what a paragraph
        // walk would: floor(budget / line) slots, each paragraph costing
        // its lines plus one gap slot.
        var scFirstP = el.querySelector('.card-preview');
        var scLh = parseFloat(getComputedStyle(scFirstP || el).lineHeight) || 21;
        var scWide = !!panel.closest('.duo-half--wide');
        // The title line (titleBlockOf) is spent before the slots are
        // counted, in both branches.
        var scAvail = Math.min(
          bandTop - (bandFlush ? 0 : GAP) - dekBelowReserve - el.getBoundingClientRect().top - blockVPad(el) - titleBlockOf(el) - moreBlockOf(el),
          bandCap);
        var scSlots = Math.floor(scAvail / scLh);
        if (scSlots < 1) {
          if (colsEl !== el) colsEl.style.display = 'none';
          else el.style.display = 'none';
          var qd0 = topBox.querySelector('.duo-quote-divider');
          if (qd0) qd0.style.display = 'none';
          return;
        }
        // NOTHING inside the live block is measured — engines disagree
        // about its interior so thoroughly that even the block's own
        // height comes back as its tallest child's (children report
        // overlapped at its top; observed live in Chrome and the in-app
        // pane both, wide cells worst). Only two live reads are trusted:
        // the block's top and the band's top, both element-level rects
        // from OUTSIDE the block. Everything content-shaped — paragraph
        // line counts, the boundary paragraph, the word the cut lands
        // on — is computed on a clean clone laid out beside the block:
        // same parent, so every class-scoped style still applies;
        // plain-block paragraphs at the base leading; offsetHeight, so
        // no transform can scale the numbers. The finished cut is
        // transplanted back, and the block itself is only ever WRITTEN
        // to. Paint has been correct in every engine throughout — it
        // was measurement that lied — so writing final geometry and
        // trusting the render is the stable contract.
        // Normalize the LIVE paragraphs to plain blocks first — the same
        // state the clone measures in — so the transplanted cut wraps
        // identically in both, and no legacy -webkit-box clamp display
        // is left in the live block for an engine to mislay (the
        // overlapped-children disease rides the clamp boxes).
        [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
          p.style.display = 'block';
          p.style.webkitLineClamp = 'none';
          p.style.lineClamp = 'none';
        });
        var scClone = el.cloneNode(true);
        scClone.style.cssText =
          'position:absolute;left:-9999px;top:0;visibility:hidden;' +
          'width:' + el.clientWidth + 'px;height:auto;max-height:none;' +
          'overflow:visible;column-count:auto;display:block;';
        var scCloneParas = [].slice.call(scClone.querySelectorAll('.card-preview'));
        scCloneParas.forEach(function(p, i){
          p.style.display = 'block';
          p.style.webkitLineClamp = 'none';
          p.style.lineClamp = 'none';
          p.style.maxHeight = 'none';
          p.style.overflow = 'visible';
          p.style.lineHeight = scLh + 'px';
          p.style.marginTop = i ? scLh + 'px' : '0';
        });
        el.parentNode.appendChild(scClone);
        // Each paragraph's true line count, read off the clone — where
        // the box is a plain block at base leading and offsetHeight can
        // be trusted.
        var scParaLines = scCloneParas.map(function(p){
          return Math.round(p.offsetHeight / scLh);
        });
        // The walk, on honest numbers: each paragraph costs its lines
        // plus one gap slot; the first that doesn't fit whole is the
        // boundary.
        var scUsed = 0, scAny = false, scBoundary = -1, scFitLines = 0;
        for (var pi = 0; pi < scParaLines.length; pi++) {
          var scNeed = (scAny ? 1 : 0) + scParaLines[pi];
          if (scNeed <= scSlots - scUsed) { scUsed += scNeed; scAny = true; continue; }
          scBoundary = pi;
          scFitLines = (scSlots - scUsed) - (scAny ? 1 : 0);
          break;
        }
        if (scBoundary === -1) {
          // Everything fits — natural render, floor stays a minimum.
          scClone.parentNode.removeChild(scClone);
        } else {
          if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
          var scRealParas = [].slice.call(el.querySelectorAll('.card-preview'));
          if (scFitLines >= 1) {
            // Cut the boundary paragraph ON THE CLONE, by height alone:
            // shed words off its end until it sits inside its line
            // count, then join the ellipsis (backing off further if the
            // join wraps a fresh line). Then transplant.
            var scCp = scCloneParas[scBoundary];
            var scCapH = scFitLines * scLh + 1;
            var scGuard = 600;
            while (scGuard-- > 0 && scCp.offsetHeight > scCapH) {
              if (!popLastWord(scCp)) break;
            }
            scGuard = 60;
            while (scGuard-- > 0) {
              var scN = lastTextNode(scCp);
              if (!scN) break;
              scN.textContent = scN.textContent.replace(TRAIL_PUNCT, '') + '…';
              if (scCp.offsetHeight <= scCapH) break;
              scN.textContent = scN.textContent.slice(0, -1);
              if (!popLastWord(scCp)) break;
            }
            scRealParas[scBoundary].innerHTML = scCp.innerHTML;
            scUsed += (scAny ? 1 : 0) + scFitLines;
            scAny = true;
          }
          // Paragraphs past the cut go dark (a clean paragraph-boundary
          // cut keeps its complete last paragraph, no ellipsis — same
          // convention the old walk kept).
          var scHideFrom = scFitLines >= 1 ? scBoundary + 1 : scBoundary;
          for (var ph = scHideFrom; ph < scRealParas.length; ph++) {
            scRealParas[ph].style.display = 'none';
          }
          scClone.parentNode.removeChild(scClone);
          if (!scAny) {
            // Not even one line seats — hide the BODY wrapper only (the
            // band still carries the byline and dek) and the quote
            // divider that would otherwise sit orphaned above it.
            if (colsEl !== el) colsEl.style.display = 'none';
            else el.style.display = 'none';
            var qd1 = topBox.querySelector('.duo-quote-divider');
            if (qd1) qd1.style.display = 'none';
          } else {
            // Feather the leading so the last line lands exactly GAP
            // over the band (capped — see MAX_SLOT_STRETCH), and cap
            // the block at its seated slots; +1 is the sub-pixel slack
            // the multi-column branch carries too.
            // Natural leading, and the box capped on what the block
            // ACTUALLY renders rather than on the walk's arithmetic.
            // The walk counts lines on a clone; when the live block
            // disagrees by a line — and it can, the clone being a
            // separately laid-out copy — an arithmetic cap either clips
            // the last line through its glyphs or leaves a row of air.
            // The slot stretch used to hide that mismatch inside the
            // headroom it added; at exact leading there is no headroom
            // to hide it in.
            // So: measure the live ink, take the smaller of that and the
            // slots the budget allows, and let truncateToWord settle any
            // remainder the way every other overflow on the card is
            // settled — cut to the last whole word, ellipsis joined on.
            // Cap on the LIVE seated content — wrapper ink plus the band's
            // padding/byline/dek — rather than the walk's arithmetic,
            // which could sit a line short and clip the bottom inset.
            // NOT on the wide's band: it flex-stretches to fill its
            // column whatever the text's length, and a content-height
            // cap would fold the charcoal ground up around the ink.
            if (!scWide) {
              el.style.maxHeight = Math.ceil(
                colsEl.getBoundingClientRect().height + blockVPad(el) + 1) + 'px';
              el.style.overflow = 'hidden';
              if (el.scrollHeight > el.clientHeight + 1) truncateToWord(el);
            } else {
              el.style.overflow = 'hidden';
            }
            // The slot remainder under the seated rows goes to the
            // stack's gaps (see distributeStackSlack at the end of fit).
          }
        }
        // The WIDE band's height is FIXED (flex-stretched to its
        // column), so the budget's sub-line remainder — the fraction
        // of a line no walk can seat — pooled under the last line as
        // extra air past the 24 inset. Feather it into the leading
        // instead: every slot opens by remainder/slots (a fraction of
        // a pixel per line, capped at MAX_SLOT_STRETCH) and the last
        // line lands on the inset. Only when the text FILLS its slots
        // — a short excerpt ends where it ends, GAP is a minimum.
        if (scWide && scAny && scUsed >= scSlots) {
          var scUnit = Math.min(scLh * MAX_SLOT_STRETCH, scAvail / scUsed);
          if (scUnit > scLh + 0.05) setSlot(el, scUnit);
        }
      } else if (el.getBoundingClientRect().bottom > groupLimit) {
        cutting = true;
        el.style.display = 'none';
      }
    });
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
    // The threshold is half a LINE, not a pixel or two: EB Garamond's
    // font-metric box (~1.18em) overhangs the 1.1 line box, so every
    // fitting multi-line title "overflows" by a few px of glyph metrics —
    // only a real extra line (a full line-height of overflow) should cut.
    if (title && getComputedStyle(title).display !== 'none') {
      var titleLh = parseFloat(getComputedStyle(title).lineHeight) || 24;
      if (title.scrollHeight > title.clientHeight + titleLh / 2) truncateToWord(title);
      // The quad titles' line cap (max-height + overflow:hidden in CSS)
      // clips at the box's edge — and the LAST line's rule is drawn at
      // that line's foot, a hair past it, so the clip sheared the rule
      // (and the line's own descenders) to a sliver. With the overflow
      // text genuinely cut above, the clip has nothing left to hide:
      // release it so ink and rule paint whole. Only for the CSS cap —
      // an inline overflow means clampToFit is mid-clamp and must keep
      // its clipping.
      if (!title.style.overflow && getComputedStyle(title).maxHeight !== 'none') {
        title.style.overflow = 'visible';
      }
    }

    // Once every column's content has settled, hand the leftover height to
    // the title's margins — before the column rule, which is drawn to the
    // geometry this leaves behind.
    // The stacked (band-less) cells hand their leftover ground to the
    // stack's interior gaps, equally; the wides keep their own slack
    // passes below.
    // The stacked cells now pin the body BAND at fixed 24s (see THE BODY
    // BAND in style.css); the equal-slack pass is retired for them.
    // if (!band) distributeStackSlack(topBox, title, dek, limit);

    slackToTitle(panel, topBox, band, title);
    slackToBodyColumn(panel, topBox, band, title);

    // Pin the footer colour strip at exactly GAP — run LAST, after the
    // slack passes have finished moving the column, so nothing shifts
    // under it. The seated grid's sub-line remainder folds into the
    // band's bottom padding (under the dek); a small overshoot gives
    // padding back the same way, floored at half the inset so the dek
    // never sits tight on the band's edge.
    // (Contra excepted: its ground centres the title/byline/dek block —
    // pinning its band to the floor would fight the centring.)
    // The grid's sub-line remainder is split EQUALLY on either side of
    // the body text — half above (the byline's bottom margin), half
    // below (the dek's top margin) — so the dek keeps its exact 24
    // above the footer colour strip and the body floats with even air.
    // (The wides excepted too: their band is the flex-stretched
    // full-height column, pinned by CSS — and it holds no byline or dek
    // to spread the remainder into.)
    if (!band && !panel.closest('.duo-half--contra') && !panel.closest('.duo-half--wide')) {
      var footBlock = topBox.querySelector('.card-preview-block');
      if (footBlock && getComputedStyle(footBlock).display !== 'none') {
        var footRem = (panelFloor(panel) - GAP) - footBlock.getBoundingClientRect().bottom;
        if (Math.abs(footRem) > 0.5) {
          var footBy = footBlock.querySelector('.card-meta--line');
          var footDek = footBlock.querySelector('.card-dek');
          var half1 = footRem / 2;
          if (footBy) {
            footBy.style.marginBottom =
              Math.max(8, (parseFloat(getComputedStyle(footBy).marginBottom) || 0) + half1) + 'px';
          }
          if (footDek) {
            footDek.style.marginTop =
              Math.max(8, (parseFloat(getComputedStyle(footDek).marginTop) || 0) + (footBy ? half1 : footRem)) + 'px';
          }
          // An inline max-height cap (the single-column seat) would keep
          // the spread from extending the block — raise it in step so
          // the band's bottom edge really lands on the line.
          var footMh = parseFloat(footBlock.style.maxHeight);
          if (footRem > 0 && !isNaN(footMh)) {
            footBlock.style.maxHeight = (footMh + footRem) + 'px';
          }
        }
      }
    }

    // (The title-centring pass is retired: the title anchors the
    // ground's top-left now, beside the author corner, and the dek's
    // auto top margin carries the spring below it.)

    // The META corner (likes + Share) closes the coloured ground's
    // bottom-right — 24 above wherever the band's top landed this fit
    // on the stacked cells; the wide keeps its CSS bottom:24 (its
    // ground runs the full column height).
    var metaCorner = panel.querySelector('.wide-corner--meta');
    if (metaCorner) {
      metaCorner.style.bottom = '';
      if (!panel.closest('.duo-half--wide') && getComputedStyle(metaCorner).position === 'absolute') {
        var mcBlock = topBox.querySelector('.card-preview-block');
        var pb = panel.getBoundingClientRect().bottom;
        var mcShown = mcBlock && getComputedStyle(mcBlock).display !== 'none'
          && mcBlock.getBoundingClientRect().height > 1;
        var mcTop = mcShown ? mcBlock.getBoundingClientRect().top : pb;
        // 22, not 24: the courier BASELINE rides 2 above its box bottom
        // — ink-to-band lands at 24 (matching the CSS bottom seat).
        metaCorner.style.bottom = Math.max(22, pb - mcTop + 22) + 'px';
      }
    }

    // THE GROUND INK LAYOUT: between the kicker row (or the card's top
    // edge) and the foot row, three things are solved together — the
    // credit row's seat, the title's ink centred in the band above it,
    // and the dek's ink centred in the band below it. The system has a
    // closed form: with C = the credit row's top,
    //   C = (K + F - rowH + titleInk - dekInk) / 2
    // the air under the title's ink equals the air over the dek's, and
    // centring both bands keeps the credit at the ink midpoint. All
    // positions anchor off K (fixed, top) and F (fixed: the foot row is
    // flush on the card's foot); the dek's auto spring absorbs the
    // shuffling.
    var credRow = topBox.querySelector('.panel-col--left .ground-credit');
    var credDek = topBox.querySelector('.panel-col--left .card-dek');
    var footRow = topBox.querySelector('.panel-col--left .ground-foot');
    if (credRow && getComputedStyle(credRow).display === 'none') credRow = null;
    if (footRow && getComputedStyle(footRow).display === 'none') footRow = null;
    if (title && credDek
        && getComputedStyle(title).display !== 'none'
        && getComputedStyle(credDek).display !== 'none') {
      var kickRow = topBox.querySelector('.ground-kicker');
      var underRow = topBox.querySelector('.panel-col--left .ground-under');
      var K = (underRow && getComputedStyle(underRow).display !== 'none')
        ? underRow.getBoundingClientRect().bottom
        : (kickRow && getComputedStyle(kickRow).display !== 'none')
        ? kickRow.getBoundingClientRect().bottom
        : panel.getBoundingClientRect().top;
      // THE COURIER OVER THE TITLE (the mega's author and date stand
      // first in the column now): the title's air opens under its
      // BASELINE, as it would under a kicker row.
      var metaOver = topBox.querySelector('.panel-col--left .cover-meta');
      if (metaOver && getComputedStyle(metaOver).display !== 'none'
          && (metaOver.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        K = baselineOf(metaOver, false);
      }
      // Without a foot row (the mega sheds likes/Share) the ground's
      // own foot edge bounds the airs instead — its CONTENT edge, not
      // its border box. The hero's column pays a padding at the foot so
      // its words close on the PICTURE'S bottom line rather than the
      // cell's (the billing row took that 31.2 — see .panel-col--left
      // in style.css), and read off the border box that padding is
      // invisible: the dek went on seating below the artwork it stands
      // beside, and this pass obligingly stretched its margin to keep it
      // there. Every column with no foot padding reads exactly as it
      // read before.
      var footCol = credDek.closest('.panel-col--left');
      var footColPad = parseFloat(getComputedStyle(footCol).paddingBottom) || 0;
      var F = footRow
        ? footRow.getBoundingClientRect().top
        : footCol.getBoundingClientRect().bottom - footColPad;
      // Title ink: first line's cap top to last line's baseline.
      var tLines = title.querySelectorAll('.title-line');
      var firstLn = tLines.length ? tLines[0] : title;
      var lastLn = tLines.length ? tLines[tLines.length - 1] : title;
      var sT = parseFloat((firstLn.style && firstLn.style.fontSize) || getComputedStyle(title).fontSize) || 0;
      var csT = getComputedStyle(title);
      measureCtx.font = csT.fontWeight + ' ' + sT + 'px ' + csT.fontFamily;
      var mT = measureCtx.measureText('H');
      var halfT = (sT * 1.1 - (mT.fontBoundingBoxAscent + mT.fontBoundingBoxDescent)) / 2;
      var capT = halfT + mT.fontBoundingBoxAscent - mT.actualBoundingBoxAscent;
      var rideT = halfT + mT.fontBoundingBoxDescent;
      var tInkTop = firstLn.getBoundingClientRect().top + capT;
      var tInkBot = lastLn.getBoundingClientRect().bottom - rideT;
      var tInk = tInkBot - tInkTop;
      // Dek ink: cap top of its first line to the last line's baseline
      // (the bottom of an 'a', not a 'y').
      var csD = getComputedStyle(credDek);
      measureCtx.font = csD.fontStyle + ' ' + csD.fontWeight + ' '
        + parseFloat(csD.fontSize) + 'px ' + csD.fontFamily;
      var mD = measureCtx.measureText('A');
      var lhD = parseFloat(csD.lineHeight) || 24;
      var halfD = (lhD - (mD.fontBoundingBoxAscent + mD.fontBoundingBoxDescent)) / 2;
      var capD = halfD + mD.fontBoundingBoxAscent - mD.actualBoundingBoxAscent;
      var rideD = halfD + mD.fontBoundingBoxDescent;
      var dR = credDek.getBoundingClientRect();
      var dInkTop = dR.top + capD;
      var dInk = (dR.bottom - rideD) - dInkTop;
      var wantTIT, wantDIT;
      if (credRow) {
        var rowH = credRow.getBoundingClientRect().height;
        // The fixpoint.
        var C = (K + F - rowH + tInk - dInk) / 2;
        // Title: centre its ink in [K, C].
        wantTIT = K + ((C - K) - tInk) / 2;
        // Dek: centre its ink in [C + rowH, F].
        wantDIT = (C + rowH) + ((F - (C + rowH)) - dInk) / 2;
      } else {
        // No credit row on this ground (the mega bills it over the body
        // column instead) — the dek PINS to the column's foot: its
        // DESCENDER bottom exactly ON the foot edge (the cover's
        // bottom — nothing dips past the picture's line), and the
        // TITLE's ink CENTRES in the air between the courier's
        // BASELINE above it and the dek's cap (the row's box bottom
        // carries its 6 pad + 4.6 ride — measuring from the box
        // printed the top air fat).
        var descD = measureCtx.measureText('gjpqy').actualBoundingBoxDescent || 0;
        wantDIT = F - dInk - descD;
        var Kink = underRow ? K - 10.6 : K;
        wantTIT = Kink + ((wantDIT - Kink) - tInk) / 2;
      }
      var deltaT = wantTIT - tInkTop;
      var mtT = (parseFloat(getComputedStyle(title).marginTop) || 0) + deltaT;
      if (isFinite(mtT)) title.style.marginTop = mtT.toFixed(2) + 'px';
      if (credRow) {
        // Credit: pinned at C — the margin bridges from the title's box
        // bottom (re-read AFTER its margin moved it; the rect already
        // carries the shift) to the seat.
        var credMt = C - title.getBoundingClientRect().bottom;
        if (isFinite(credMt)) credRow.style.marginTop = credMt.toFixed(2) + 'px';
      }
      // The dek anchors off the foot, so its bottom margin moves it.
      var deltaD = wantDIT - dInkTop;
      var mbD = (parseFloat(getComputedStyle(credDek).marginBottom) || 0) - deltaD;
      if (isFinite(mbD)) credDek.style.marginBottom = mbD.toFixed(2) + 'px';
    }

    // Last: run the column rule from the panel's top border to the band's.
    if (band) fitColumnDivider(panel, topBox, band);

    // THE HOVER SWAP (mega): on hover the COVER replaces the TITLE —
    // the CSS moves the pane into the title's own box, which only the
    // fitter knows. Published as vars on the cell AFTER every seat has
    // settled (the ground-ink solver above is the title's last mover).
    var swapHalf = panel.closest('.duo-half--mega');
    if (swapHalf && title && getComputedStyle(title).display !== 'none') {
      var swapHR = swapHalf.getBoundingClientRect();
      var swapTR = title.getBoundingClientRect();
      if (swapHR.width && swapTR.width) {
        swapHalf.style.setProperty('--mega-title-t', (swapTR.top - swapHR.top).toFixed(2) + 'px');
        swapHalf.style.setProperty('--mega-title-l', (swapTR.left - swapHR.left).toFixed(2) + 'px');
        swapHalf.style.setProperty('--mega-title-w', swapTR.width.toFixed(2) + 'px');
        swapHalf.style.setProperty('--mega-title-h', swapTR.height.toFixed(2) + 'px');
      }
      // And the plate's TRUE ink foot: the cut can leave the column
      // box a structural row taller than its text (a paragraph gap
      // costs a slot no line can use), so centring against the box
      // read low. The deepest paragraph fragment's bottom is the
      // real last line — published as the swap's bottom inset.
      var swapCols = swapHalf.querySelector('.card-preview-cols');
      if (swapCols) {
        var swapCB = swapCols.getBoundingClientRect();
        var swapInk = 0;
        [].forEach.call(swapCols.querySelectorAll('.card-preview'), function(p){
          var pb = p.getBoundingClientRect().bottom;
          if (pb > swapInk) swapInk = pb;
        });
        if (swapInk > swapCB.top && swapHR.height) {
          swapHalf.style.setProperty('--mega-plate-foot',
            (swapHR.bottom - Math.min(swapInk, swapCB.bottom)).toFixed(2) + 'px');
        }
      }
    }

    // A full box lands its last line exactly GAP over the band — the
    // sub-line remainder is feathered into the leading by the slot
    // stretch in the branches above, never left as a random hair of
    // dead space. A box whose text runs out early keeps the natural
    // leading and simply leaves more; GAP is the minimum, not a target
    // the text is stretched to at any cost (the stretch caps at
    // MAX_SLOT_STRETCH).
  }

  // The contra page's lead card holds the height of a contra square —
  // the first cell below is the measure, re-read every fit so resizes
  // track. In the stacked mobile layout (flex-direction column, see the
  // .contra-lead media block) the lead flows at natural height instead:
  // the inline height is cleared, the CSS max-height does the bounding.
  function fitContraLead() {
    var lead = document.querySelector('.contra-lead');
    if (!lead) return;
    var body = lead.querySelector('.contra-lead-body');
    // Refits start from the pristine text (truncateToWord stashes it).
    if (body && body.__fullHTML) body.innerHTML = body.__fullHTML;
    // The stacked-layout tell is the inner cols row (the lead itself is
    // always a column now — byline strip over the name/body row).
    var cols = lead.querySelector('.contra-lead-cols');
    if (cols && getComputedStyle(cols).flexDirection === 'column') {
      lead.style.height = '';
      if (body) body.style.height = '';
      return;
    }
    var cell = document.querySelector('.card--quad .duo-half .duo-card-image');
    if (!cell) return;
    var h = cell.getBoundingClientRect().height;
    if (!h) return;
    lead.style.height = h + 'px';
    if (!body) return;
    // Fill whole lines, the essay excerpts' own cut: the body's slots
    // are all 1.6em of 13px (paragraph gaps are exactly one slot), so
    // quantizing the box to a slot multiple means no half-clipped
    // bottom line in any column. Freeze it there (explicit height +
    // the CSS column-fill:auto) and cut the clipped tail at the last
    // fully-visible word, ellipsis joined inline.
    body.style.height = '';
    var lh = parseFloat(getComputedStyle(body).lineHeight) || 20.8;
    var slots = Math.floor(body.getBoundingClientRect().height / lh);
    if (slots < 1) return;
    body.style.height = (slots * lh) + 'px';
    // The whole manifesto outranks matching the square when the two
    // collide: while text still spills into phantom overflow columns
    // (scrollWidth is the tell), grow card and body a line slot at a
    // time. On a wide window the loop never runs and the card holds
    // the square's own height.
    var guard = 40;
    while (guard-- > 0 && body.scrollWidth > body.clientWidth + 1) {
      slots++;
      h += lh;
      body.style.height = (slots * lh) + 'px';
      lead.style.height = h + 'px';
    }
    // Safety cut ONLY if the guard ran dry with text still spilling —
    // truncateToWord always stamps its ellipsis, so calling it on a
    // fully-seated block would deface the manifesto's last line.
    if (body.scrollWidth > body.clientWidth + 1) truncateToWord(body);
    // Run the name/body divider down to the footer band's rule — the
    // cols row ends at the 52px bottom zone, the band's top is partway
    // into it, and align-items:stretch means a negative bottom margin
    // GROWS the divider by exactly that overshoot.
    var vert = lead.querySelector('.contra-lead-divider');
    var band = lead.querySelector('.panel-band--bottom');
    if (vert && band) {
      vert.style.marginBottom = '';
      var gap = band.getBoundingClientRect().top - vert.getBoundingClientRect().bottom;
      if (gap > 0) vert.style.marginBottom = -gap + 'px';
    }
  }

  // THE LATEST ROW's postscript title fills its matter like the
  // hero's poster: stretch-fitted over up to three lines in the room
  // the bottom-pinned dek leaves (the dek rides margin-top:auto to
  // the matter's foot — the cover's own bottom line).
  // WHAT HANGS LEFT OF THE LINE. A line box opens at the PEN, and a
  // face is free to cut ink outside it: Garamond's capital J swings
  // its tail left of its own origin, 3.2px of it at the postscript's
  // 44. Measured the way every vertical seat on this page is measured
  // — off the rendered text, from the canvas's own metrics — and taken
  // across every line, since the picture must clear the leftmost ink
  // of all of them, not just the first.
  function inkOverhangLeft(el) {
    var lines = el.querySelectorAll('.title-line');
    var ls = lines.length ? lines : [el];
    var over = 0;
    [].forEach.call(ls, function (l) {
      var t = (l.textContent || '').trim();
      if (!t) return;
      var cs = getComputedStyle(l);
      measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' '
        + (parseFloat(cs.fontSize) || 0) + 'px ' + cs.fontFamily;
      var m = measureCtx.measureText(t);
      if (m.actualBoundingBoxLeft > over) over = m.actualBoundingBoxLeft;
    });
    return over;
  }

  function fitLatestTitle() {
    // EVERY postscript cell — the lead row's and the mirrored second
    // row's — fits its own title and squares its own swap.
    [].forEach.call(document.querySelectorAll('.latest-cell--ps'), function(cell){
    var title = cell.querySelector('.latest-title');
    var matter = cell.querySelector('.latest-matter');
    if (!title || !matter) return;
    if (title.__fullHTML) { title.innerHTML = title.__fullHTML; title.__stretched = false; }
    title.style.fontSize = '';
    // Cleared before the measure, or a pass would fit inside the inset
    // the pass before it paid and the title would walk right across
    // the three runs of fitAll.
    title.style.paddingLeft = '';
    var dek = cell.querySelector('.latest-dek');
    var availW = matter.clientWidth;
    var maxH = matter.clientHeight
      - (dek ? dek.getBoundingClientRect().height + 24 : 0);
    var opts = {
      maxLines: 3,
      preferMostLines: true,
      lineMax: availW * LINE_MAX_PER_PX,
      // Ceilinged at the STACKED CELLS' own 84 (the house poster
      // cap): the hero-scale ceiling read too big at row width —
      // a short title (Present at the Creation) fills to it, the
      // long ones (Jasmine's) stay bound by their own words.
      maxSize: 84,
    };
    if (availW > 0 && maxH > 40) {
      stretchFill(title, availW, maxH, opts);
      // THE TITLE IS COVERED ON ITS INK, NOT ITS BOX. The picture that
      // slides over the words is exactly as wide as the column they
      // stand in — both are a third of the row — so it lands on the
      // line's BOX, and anything the face hangs outside that box is
      // left standing on the ground beside it: one white hook of a J
      // at the picture's own edge, which is the whole of this bug.
      //
      // It cannot be answered by travelling further, either. Moving
      // the picture left to catch the tail uncovers the same width at
      // the other end, and the ink is wider than the picture by more
      // than the slack the right end has to give. So the inset is paid
      // in the TYPE: the title is pushed right by exactly what hangs
      // left of it and re-set in the width that leaves, which puts its
      // ink ON the column's line rather than before it — optical
      // margin alignment, arrived at from the far side — and the
      // picture then covers every glyph it is meant to.
      //
      // Nothing moves where nothing hangs: seven of the eight
      // postscripts measure their ink INSIDE the box and take no inset
      // at all.
      var over = inkOverhangLeft(title);
      if (over > 0.5 && availW - over > 0) {
        title.style.paddingLeft = over.toFixed(2) + 'px';
        if (title.__fullHTML) { title.innerHTML = title.__fullHTML; title.__stretched = false; }
        title.style.fontSize = '';
        stretchFill(title, availW - over, maxH, opts);
      }
    }
    });
    cutPlates();
  }

  // THE PLATE CUT, its own pass: fitLatestTitle runs it, and it runs
  // AGAIN after the second slide-slot pass — fitContra restores every
  // review plate's full text to measure its natural height, and a
  // plate the cap trims must be cut again on the height it was given.
  function cutPlates() {
    // The plates cut on a CLEAN LINE and END ON AN ELLIPSIS, hero-
    // fashion: whatever sub-row remainder the cover's height leaves
    // under the last full row folds into the bottom padding (so the
    // open text never shears mid-glyph), and the paragraph straddling
    // the floor is trimmed to its last fitting word with the … the
    // cut owes.
    [].forEach.call(document.querySelectorAll('.card--latest .latest-plate'), function(pl){
      if (!pl.__fullHTML) pl.__fullHTML = pl.innerHTML;
      else pl.innerHTML = pl.__fullHTML;
      pl.style.paddingBottom = '';
      // EVERY LATEST PLATE fills DOWN TO ITS OWN DEK'S INK: the
      // floor is the baseline (ink bottom, descenders excluded) of
      // the post's own dek — hidden during the hover, but its seat
      // stands — and the plate's last line seats ITS baseline there.
      // Both baselines are recovered from canvas metrics of each
      // face at its leading. (The hero's plate does the same in the
      // mega feather branch of fit().)
      var psCell = pl.closest('.latest-cell');
      // THE POSTSCRIPT'S BODY CLOSES 48 ABOVE ITS BOTTOM RULE. It used
      // to fill down to its own dek's INK — a floor that left the last
      // line all but touching the rule (measured at half a pixel, and
      // on one card the text overran it) — and the page's step is 48.
      // Stated as the pad so the cut above reads it and the text is
      // clamped to whatever fits above that line. (Reviews keep the
      // dek floor: their box is far taller than their text and the
      // rule sits on the picture, not under the words.)
      // (The postscript's 48-above-the-rule pad and the review's dek-ink
      // floor are retired: every plate's paddings are the courier's
      // pins now — kicker cap 24 under the plate's top, READ ON's
      // baseline 24 above its foot — stated in style.css.)
      psCell = null;
      // NOT the turned-over review: its plate is the card's own foot
      // and its dek stands ABOVE it, so the dek-ink floor would land
      // deep inside the box — a 215px padding with no room left to
      // clamp into, and the body sheared on the overflow. Its floor
      // is its own box; the stylesheet's 43.67 foot pad stands and
      // the clamp below cuts the text on a clean line inside it.
      if (psCell && psCell.classList.contains('latest-cell--contra-rev')) psCell = null;
      if (psCell) {
        var ownDek = psCell.querySelector('.latest-dek');
        if (ownDek) {
          var dctx = document.createElement('canvas').getContext('2d');
          var dcs = getComputedStyle(ownDek);
          dctx.font = dcs.fontStyle + ' ' + dcs.fontWeight + ' ' + dcs.fontSize + ' ' + dcs.fontFamily;
          var dm = dctx.measureText('Mx');
          var dlh = parseFloat(dcs.lineHeight) || parseFloat(dcs.fontSize) * 1.2;
          var dekBaseline = ownDek.getBoundingClientRect().bottom
            - ((dlh - (dm.fontBoundingBoxAscent + dm.fontBoundingBoxDescent)) / 2 + dm.fontBoundingBoxDescent);
          var pp0 = pl.querySelector('.latest-plate-p');
          if (pp0) {
            var pctx = document.createElement('canvas').getContext('2d');
            var ppcs = getComputedStyle(pp0);
            pctx.font = ppcs.fontStyle + ' ' + ppcs.fontWeight + ' ' + ppcs.fontSize + ' ' + ppcs.fontFamily;
            var pm = pctx.measureText('Mx');
            var pplh = parseFloat(ppcs.lineHeight) || parseFloat(ppcs.fontSize) * 1.2;
            var boxBelowBaseline = (pplh - (pm.fontBoundingBoxAscent + pm.fontBoundingBoxDescent)) / 2 + pm.fontBoundingBoxDescent;
            var floorPad = pl.getBoundingClientRect().bottom - (dekBaseline + boxBelowBaseline);
            if (floorPad >= 0) pl.style.paddingBottom = floorPad.toFixed(2) + 'px';
          }
        }
      }
      var pcs = getComputedStyle(pl);
      var padT = parseFloat(pcs.paddingTop) || 0;
      var padB = parseFloat(pcs.paddingBottom) || 0;
      var p0 = pl.querySelector('.latest-plate-p');
      var plh = p0 ? (parseFloat(getComputedStyle(p0).lineHeight) || 19.2) : 19.2;
      // The title line is spent before the rows are counted.
      var tB = titleBlockOf(pl);
      var avail = pl.clientHeight - padT - padB - tB - moreBlockOf(pl);
      if (avail <= plh) return;
      // FEATHERED to the floor, hero logic: the sub-row remainder
      // stretches into the leading (capped at the general slot
      // stretch) so the last row lands ON the 48 line instead of a
      // part-row of dead air short of it.
      var rows = Math.floor(avail / plh);
      // The RENDERED unit — the rounded value the style carries — is
      // what the floor must be built from: the raw quotient ran a
      // half-pixel short over 23 rows and the cut sacrificed a whole
      // line to the rounding.
      var unit = parseFloat(Math.min(avail / rows, plh * MAX_SLOT_STRETCH).toFixed(3));
      [].forEach.call(pl.querySelectorAll('.latest-plate-p'), function(p, i){
        p.style.lineHeight = unit + 'px';
        if (i) p.style.marginTop = unit + 'px';
        p.style.marginBottom = '0';
      });
      // Where the plate opens FLUSH (contra, padding-top 0) the first
      // line seats its INK on the top edge with nothing shaved: the
      // stylesheet's -4.33 assumed the resting leading, but the
      // feathered unit grows the half-leading and the ascenders were
      // clipping under the cover's overflow — measure the true
      // line-box-to-ink offset at the rendered unit and climb
      // exactly that instead.
      // (The line seated on the edge is whatever stands first — the
      // title where one prints, the first paragraph otherwise.)
      var first0 = pl.querySelector('.plate-title') || p0;
      if (first0 && !padT) {
        var fcs = getComputedStyle(first0);
        var fctx = document.createElement('canvas').getContext('2d');
        fctx.font = fcs.fontStyle + ' ' + fcs.fontWeight + ' ' + fcs.fontSize + ' ' + fcs.fontFamily;
        var fm = fctx.measureText((first0.textContent || 'Mx').slice(0, 24));
        var fhalf = (unit - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent)) / 2;
        first0.style.marginTop = (-(fhalf + fm.fontBoundingBoxAscent - fm.actualBoundingBoxAscent)).toFixed(2) + 'px';
        // Measure the RENDERED seat and hand back any remaining
        // overshoot (fractional layout can still shave a hair).
        var inkTop = first0.getBoundingClientRect().top + fhalf + fm.fontBoundingBoxAscent - fm.actualBoundingBoxAscent;
        var over = pl.getBoundingClientRect().top - inkTop;
        if (over > 0) {
          first0.style.marginTop = (parseFloat(first0.style.marginTop) + over).toFixed(2) + 'px';
        }
      }
      var floorLine = pl.getBoundingClientRect().top + padT + tB + rows * unit + 2;
      var cutDone = false;
      [].forEach.call(pl.querySelectorAll('.latest-plate-p'), function(p){
        if (cutDone) { p.style.display = 'none'; return; }
        var r = p.getBoundingClientRect();
        if (r.bottom <= floorLine) return;
        if (r.top >= floorLine - 1) { p.style.display = 'none'; cutDone = true; return; }
        var words = p.textContent.trim().split(/\s+/);
        // BINARY SEARCH, not a word per reflow. This cut used to pop one
        // word at a time and re-measure after every write — and every
        // measure is a full synchronous relayout of the page. Across the
        // straddling paragraphs that was ~1,200 pops and 1.4s of every
        // load (measured), three passes over. The fit is monotone in the
        // word count, so probe it: ~7 writes land on the same word the
        // pop loop found.
        var lo = 0, hi = words.length - 1;
        while (lo < hi) {
          var mid = (lo + hi + 1) >> 1;
          p.textContent = words.slice(0, mid).join(' ') + '…';
          if (p.getBoundingClientRect().bottom > floorLine) hi = mid - 1;
          else lo = mid;
        }
        p.textContent = words.slice(0, lo).join(' ') + '…';
        cutDone = true;
      });
      // The plate ALWAYS closes on the … it owes — whether the cut
      // trimmed a straddling paragraph, fell clean BETWEEN paragraphs,
      // or the whole preview fit (the preview is itself a cut of the
      // post). The trailing period trades for it, in the last TEXT
      // node so inline markup holds.
      var visP = [].filter.call(pl.querySelectorAll('.latest-plate-p'), function(p){
        return p.style.display !== 'none';
      });
      var lastVis = visP[visP.length - 1];
      if (lastVis && !/…\s*$/.test(lastVis.textContent)) {
        var tw = document.createTreeWalker(lastVis, NodeFilter.SHOW_TEXT, null);
        var lastText = null;
        while (tw.nextNode()) lastText = tw.currentNode;
        if (lastText) lastText.nodeValue = lastText.nodeValue.replace(/[.\s]*$/, '') + '…';
      }
      // (THE CONTRA LIFT is retired — see the note in style.css. It
      // measured the air between the plate's last descender and the
      // plate's foot so the hover could ride the review's courier
      // block up into it; the block moved out of the text column
      // with the head, and the only thing left reading this was the
      // swap image, sliding for no reason.)
    });
  }

  // THE BANDS CENTRE ON INK, measured from the RENDERED face at run
  // time (static constants drifted between the fallback courier and
  // the real one): the first item is the reference — Arts for the
  // head band, the colophon's first entry for the foot — its ink
  // span (ascender/cap top to its true bottom) is seated on the
  // band's middle, and every sibling rides the same shift. Re-runs
  // with every fit pass, so late fonts correct themselves.
  function inkCenterBands() {
    [].forEach.call(document.querySelectorAll('.dek-band'), function(band){
      var items = band.children;
      if (!items.length) return;
      var cs = getComputedStyle(items[0]);
      var ctx = document.createElement('canvas').getContext('2d');
      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var sample = (items[0].textContent || 'Mx').trim();
      if (cs.textTransform === 'uppercase') sample = sample.toUpperCase();
      var m = ctx.measureText(sample);
      var lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      var half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
      var inkTop = half + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent;
      var inkBottom = half + m.fontBoundingBoxAscent + m.actualBoundingBoxDescent;
      var shift = (lh / 2) - ((inkTop + inkBottom) / 2);
      for (var i = 0; i < items.length; i++) {
        items[i].style.top = shift.toFixed(2) + 'px';
      }
    });
  }

  // THE BANDS' GLYPH SEATS: band items align to FEATURES OF THE
  // MASTHEAD GLYPHS above them — the T's stem-left at its bottom
  // (narrower than the crossbar, so only a pixel scan of the
  // rendered glyph knows it), the W's bottom-right vertex, the N's
  // left stem, the C's leftmost ink. Head band: the magazine line on
  // the T, the date closing on the W. Foot band: Est on the T,
  // Substack on the N, Instagram closing on the W, Email on the C —
  // the copyright keeps the flex-end flow, like the head's tagline.
  // Anchored items go absolute at fitter-measured seats; re-run
  // every pass (fonts landing move both the glyphs and the seats).
  function alignBandTo(band, name, spec) {
    // < not <=: a band may be ALL anchored items (the subscribe
    // band's single line) — only bail when the spec names children
    // the band doesn't have.
    if (!band || !name || band.children.length < spec.length) return;
    // THE NAME'S TEXT MAY BE IN PIECES. The masthead's NEW carries a
    // span of its own (the foil plate hovers on it), so a walk to the
    // first text node reads "THE " and every seat past it goes
    // looking for letters that are in the next piece — the band falls
    // back to its flex spread, which is exactly the un-seated line.
    // Read the pieces in order, address the letters against the whole
    // string, and range the one they actually live in.
    var pieces = [];
    (function collect(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.nodeValue.length) pieces.push(n); }
        else if (n.nodeType === 1) collect(n);
      }
    })(name);
    if (!pieces.length) return;
    var text = pieces.map(function (n) { return n.nodeValue; }).join('').toUpperCase();
    // An index into that whole string, back to the piece that holds it.
    function seatOf(idx) {
      for (var i = 0, run = 0; i < pieces.length; i++) {
        var len = pieces[i].nodeValue.length;
        if (idx < run + len) return { node: pieces[i], at: idx - run };
        run += len;
      }
      return null;
    }
    var ncs = getComputedStyle(name);
    var size = parseFloat(ncs.fontSize);
    if (!size) return;
    var scanSize = 200;
    // Pixel-scan a glyph for an ink edge: 'left-bottom'/'right-bottom'
    // read the bottom band (baseline up 5%), 'left-full' the whole
    // cap height. Returns the offset from the glyph origin at the
    // rendered scale.
    function glyphScan(ch, edge) {
      var c = document.createElement('canvas');
      c.width = 340; c.height = 280;
      var g = c.getContext('2d');
      g.font = ncs.fontWeight + ' ' + scanSize + 'px ' + ncs.fontFamily;
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#000';
      var x0 = 60, y0 = 240;
      g.fillText(ch, x0, y0);
      var img;
      try { img = g.getImageData(0, 0, 340, 280).data; } catch (e) { return null; }
      var right = edge === 'right-bottom';
      var yFrom = edge === 'left-full' ? Math.round(y0 - 0.8 * scanSize) : Math.round(y0 - 0.05 * scanSize);
      var found = null;
      for (var y = yFrom; y <= y0 - 1; y++) {
        for (var xi = 0; xi < 340; xi++) {
          var x = right ? 339 - xi : xi;
          if (img[(y * 340 + x) * 4 + 3] > 40) {
            if (found === null || (right ? x > found : x < found)) found = x;
            break;
          }
        }
      }
      return found === null ? null : (found - x0) * (size / scanSize);
    }
    function inkOf(el) {
      var cs = getComputedStyle(el);
      var g = document.createElement('canvas').getContext('2d');
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var t = el.textContent;
      if (cs.textTransform === 'uppercase') t = t.toUpperCase();
      var m = g.measureText(t);
      return { left: (m.actualBoundingBoxLeft || 0), right: (m.actualBoundingBoxRight || m.width) };
    }
    var bandRect = band.getBoundingClientRect();
    var rng = document.createRange();
    var ok = true;
    var seats = spec.map(function(s) {
      if (s.between) return 0;
      var idx = s.nth ? nthIndex(text, s.char, s.nth) : text.indexOf(s.char);
      if (idx < 0) { ok = false; return null; }
      var seat = seatOf(idx);
      if (!seat) { ok = false; return null; }
      rng.setStart(seat.node, seat.at); rng.setEnd(seat.node, seat.at + 1);
      var box = rng.getBoundingClientRect();
      var off = glyphScan(s.char, s.edge);
      if (off === null) { ok = false; return null; }
      return box.left + off;
    });
    if (!ok) return;
    band.style.justifyContent = 'flex-end';
    function seatVertically(el) {
      var lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
      // inkCenterBands just wrote the bare centring shift — restate
      // it against the band's own box for the absolute seat.
      var shift = parseFloat(el.style.top) || 0;
      el.style.position = 'absolute';
      el.style.top = ((bandRect.height - lh) / 2 + shift).toFixed(2) + 'px';
    }
    // Glyph-anchored seats first...
    spec.forEach(function(s, k) {
      if (s.between) return;
      var el = band.children[s.item];
      seatVertically(el);
      var ink = inkOf(el);
      el.style.left = (s.align === 'right'
        ? seats[k] - bandRect.left - ink.right
        : seats[k] - bandRect.left + ink.left).toFixed(2) + 'px';
    });
    // ...then the BETWEEN seats: ink-centred exactly between the two
    // named neighbours' ink edges (read after their own seating).
    spec.forEach(function(s) {
      if (!s.between) return;
      var el = band.children[s.item];
      var a = band.children[s.between[0]], b = band.children[s.between[1]];
      var aInk = inkOf(a), bInk = inkOf(b);
      var aRight = a.getBoundingClientRect().left + aInk.right;
      var bLeft = b.getBoundingClientRect().left - bInk.left;
      var mid = (aRight + bLeft) / 2;
      seatVertically(el);
      var ink = inkOf(el);
      el.style.left = (mid - bandRect.left - (ink.right - ink.left) / 2).toFixed(2) + 'px';
    });
  }
  function nthIndex(text, ch, nth) {
    var i = -1;
    for (var n = 0; n < nth; n++) { i = text.indexOf(ch, i + 1); if (i < 0) return -1; }
    return i;
  }
  // SUBSCRIBE SET TO THE MEASURE: the word is tracked out until its
  // INK spans the same 48-to-48 the masthead's does — the wordmark
  // fills the measure by SIZE (its vw font scale), but this one has
  // to fill it by LETTER-SPACING, since its size is borrowed from
  // the masthead and its string is a different length. Measured off
  // the rendered face each pass, so a late font or a resize re-fits.
  // THE SECTION BANDS' TYPE SITS CENTRED, BY INK: the mark's caps and
  // the list's ink each have their cap-to-baseline centre seated on
  // the band's own middle (a line box centres its leading, not its
  // letters — Trajan's caps ride high in theirs).
  // THE SECTIONS' GROUNDS: main paints one gradient with hard stops
  // (--s1..--s3), each landing on the top edge of the banner that opens
  // a movement — so the colour changes under the banner's own box. The
  // stops are lengths from main's top, read live: on every fit, and on
  // every frame chrome-open folds a banner (it announces the same
  // event), since a fold moves every banner below it.
  var TITLE_DEK_GAP = 24;
  function fitGroundStops() {
    var ground = document.querySelector('main:has(.card--mega)');
    if (!ground) return;
    var top = ground.getBoundingClientRect().top;
    ['.subscribe-band', '.events-band', '.store-band'].forEach(function (sel, i) {
      var b = document.querySelector(sel);
      if (!b) return;
      ground.style.setProperty('--s' + (i + 1), (b.getBoundingClientRect().top - top).toFixed(2) + 'px');
    });
  }
  window.addEventListener('newcritic:fit', fitGroundStops);
  // THE PICKUP. The masthead line stands in a fixed strip under the
  // wordmark; every band carries the same two lines, in the same box,
  // at the same height. The band's copy is hidden until the rising band
  // LANDS ON that strip — at that scroll the two boxes coincide exactly,
  // so the swap cannot be seen, and from there the band carries the
  // lines up to the top and holds them. (Before it, only the strip
  // shows; after it, only the band's, the strip being under it.)
  // (The pickup is retired with the strip's own copy of the line: the
  // band carries it outright now, so there is nothing to hand over.)
  function fitPickup() {}
  // ONE FRAME AT MOST. Bound straight to the scroll event this read a
  // rect per banner on every event the compositor sent — a forced
  // layout each time, and the page stuttered under the wheel.
  var stopsQueued = false;
  window.addEventListener('scroll', function () {
    if (stopsQueued) return;
    stopsQueued = true;
    requestAnimationFrame(function () { stopsQueued = false; fitGroundStops(); fitPickup(); });
  }, { passive: true });
  // THE PAINTED INK OF A LINE, top to bottom — not the cap-to-baseline
  // span every other seat on the page uses. Garamond's ascenders (the
  // h of Archive, the b of About) rise ABOVE its cap line and the line
  // carries no descenders at all but its commas, so a cap-to-baseline
  // centring sets the block low. This reads what the face actually
  // paints, per piece, in the piece's own type.
  function paintedSpan(el) {
    var top = Infinity, bot = -Infinity;
    var g = document.createElement('canvas').getContext('2d');
    inkPieces(el).forEach(function (node) {
      var text = node.nodeValue;
      if (!text.trim()) return;
      var host = node.parentElement || el;
      var cs = getComputedStyle(host);
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = g.measureText(text);
      var rg = document.createRange();
      rg.selectNodeContents(node);
      var r = rg.getBoundingClientRect();
      if (!r.height) return;
      var half = (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
      var base = r.top + half + m.fontBoundingBoxAscent;
      var t = base - (m.actualBoundingBoxAscent || 0);
      var b = base + (m.actualBoundingBoxDescent || 0);
      if (t < top) top = t;
      if (b > bot) bot = b;
    });
    return isFinite(top) ? { top: top, bot: bot } : null;
  }

  function fitBands() {
    // The first screen ends ON the band: the spacer under the wordmark
    // runs a viewport LESS the band's own height, so at rest the band
    // stands flush on the fold's bottom edge (see THE FIRST SCREEN).
    var first = document.querySelector('.section-band');
    if (first) {
      var fh = first.getBoundingClientRect().height;
      if (fh) document.documentElement.style.setProperty('--band-h', fh.toFixed(2) + 'px');
    }
    [].forEach.call(document.querySelectorAll('.section-band'), function (band) {
      var bb = band.getBoundingClientRect();
      if (!bb.height) return;
      var mid = bb.top + bb.height / 2;
      [].forEach.call(band.querySelectorAll('.band-mark, .band-mid, .band-deks'), function (el) {
        el.style.top = '';
        var i = paintedSpan(el) || inkSpan(el);
        if (!i) return;
        el.style.position = 'relative';
        el.style.top = (mid - (i.top + i.bot) / 2).toFixed(2) + 'px';
      });
    });
  }
  function fitSubscribeName() {
    // (fitOneBannerName — the word TRACKED to the measure — is
    //  retired: the banners are the header now, the word SIZED to it.)
    // No taller than the masthead: its fitted size is the ceiling
    // (fitMastheadFill has run by now), so a short word stands the
    // header's height, centred, rather than the measure's width.
    var mast = document.querySelector('.site-nav--top .topbar-name');
    var cap = mast ? (parseFloat(getComputedStyle(mast).fontSize) || 0) : 0;
    var BANNER_AIR = 72;
    [].forEach.call(document.querySelectorAll('.page-banner'), function (band) {
      fillNameBand(band.querySelector('.banner-name'), band, { maxSize: cap, air: BANNER_AIR });
    });
    [].forEach.call(document.querySelectorAll('.reprint'), function (band) {
      fillNameBand(band.querySelector('.reprint-name'), band, { maxSize: cap, air: BANNER_AIR });
    });
  }
  // THE WORDMARK'S INK TOUCHES BOTH EDGES OF THE SITE. Measured, not
  // modelled: the name's ink is read off its glyph bearings at the
  // size the token gives it, the size is rescaled so that ink is
  // exactly the document's width, and the line is then shifted so
  // its left ink sits on the page's left edge — so the right ink
  // sits on the right one. The cap is re-seated on the top edge off
  // the fitted size, since the margin's token no longer knows it.
  // ONE FILL FOR EVERY NAME BAND. The masthead, the three banners
  // (SUBSCRIBE, EVENTS, STORE) and the reprint are the same object:
  // a blue band with one word in charcoal Placard, its ink spanning
  // the page's measure, 48 over the caps and 48 under the feet. The
  // fit below is written once and read off whichever (name, band)
  // pair it is handed; it returns the band's top and the ink's foot
  // for anything the caller wants to hang under them.
  // CAPPED, when asked, at a size — the masthead's own fitted size, for
  // the banners: a short word sized to the measure stood a band twice
  // the header's height. A capped word centres its ink in the band.
  function fillNameBand(name, wm, opts) {
    if (!name || !wm) return null;
    var maxSize = (opts && opts.maxSize) || 0;
    // THE AIR OVER AND UNDER THE INK. The masthead keeps the 48 it was
    // built on; the page's banners keep the page's own 72 (passed in),
    // measured to the PAINTED pixels of the word — the scan below — not
    // to the font's boxes, which on a display face hang well past what
    // prints.
    var AIR = (opts && opts.air) || 48;
    name.style.fontSize = '';
    name.style.transform = 'none';
    name.style.marginTop = '';
    name.style.letterSpacing = '';
    wm.style.height = '';
    // THE INK KEEPS THE PAGE'S OWN 72 at each side — the measure every
    // row and every band on the page opens and closes on (48, grown by
    // half) — rather than bleeding off the edges.
    var SIDE = 72;
    var vw = document.documentElement.clientWidth - SIDE * 2;
    var s0 = parseFloat(getComputedStyle(name).fontSize);
    if (!s0 || !vw) return;
    var i0 = inkSpanOf(name);
    if (!i0) return;
    var w0 = i0.right - i0.left;
    if (!(w0 > 0)) return;
    var fitted = s0 * vw / w0;
    var capped = maxSize > 0 && fitted > maxSize;
    if (capped) fitted = maxSize;
    name.style.fontSize = fitted.toFixed(3) + 'px';
    var i1 = inkSpanOf(name);
    if (!i1) return;
    var wb = wm.getBoundingClientRect();
    // A CAPPED WORD KEEPS THE HEADER'S MEASURE BY TRACKING: the letters
    // are spaced out until the ink runs from 48 to 48, the way the
    // banners always read — the size is the masthead's, the span is
    // the page's. (CSS lays a space after EVERY letter, the last one
    // included, so the ink grows by only n-1 of them.)
    if (capped) {
      // Every character opens a gap, the word space between two words
      // included (ARCHIVE ABOUT), so n counts the trimmed string whole.
      var word = (name.textContent || '').trim().replace(/\s+/g, ' ');
      var n = word.length;
      var ink1 = i1.right - i1.left;
      if (n > 1 && vw > ink1) {
        name.style.letterSpacing = ((vw - ink1) / (n - 1)).toFixed(3) + 'px';
        i1 = inkSpanOf(name) || i1;
      }
    }
    name.style.transform = 'translateX(' + (wb.left + SIDE - i1.left).toFixed(2) + 'px)';
    // THE CAP OFF THE PAINTED GLYPHS, not a cap model: Placard's caps
    // sit lower than the canvas 'H' model says (the model put them 25
    // above where they print). The string is drawn on a canvas at a
    // scan size and its first inked row read; that height above the
    // baseline scales to the fitted size, and the baseline itself is
    // read off the first letter's own line box with the face's bounds.
    var ncs = getComputedStyle(name);
    var size = parseFloat(ncs.fontSize) || 0;
    var text = (name.textContent || '').trim();
    if (ncs.textTransform === 'uppercase') text = text.toUpperCase();
    if (!size || !text) return;
    var scan = 200, cw = 3000, chh = 320, y0 = 240;
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
    var g = cv.getContext('2d');
    g.font = ncs.fontWeight + ' ' + scan + 'px ' + ncs.fontFamily;
    g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(text, 20, y0);
    var data;
    try { data = g.getImageData(0, 0, cw, chh).data; } catch (e) { return; }
    var topRow = -1;
    for (var y = 0; y < chh && topRow < 0; y++) {
      for (var x = 0; x < cw; x++) { if (data[(y * cw + x) * 4 + 3] > 40) { topRow = y; break; } }
    }
    if (topRow < 0) return;
    var inkAbove = (y0 - topRow) / scan * size;
    var m = g.measureText('H');
    g.font = ncs.fontWeight + ' ' + size + 'px ' + ncs.fontFamily;
    var mm = g.measureText('H');
    var pieces = inkPieces(name);
    if (!pieces.length) return;
    var rg = document.createRange(); rg.setStart(pieces[0], 0); rg.setEnd(pieces[0], 1);
    var fr = rg.getBoundingClientRect();
    var half = (fr.height - (mm.fontBoundingBoxAscent + mm.fontBoundingBoxDescent)) / 2;
    var baseline = fr.top + half + mm.fontBoundingBoxAscent;
    var capTop = baseline - inkAbove;
    void m;
    var mt = parseFloat(ncs.marginTop) || 0;
    // TWO PIXELS PROUD of the edge, not on it: the scan and the
    // baseline model are each good to about a pixel, and a hairline
    // of ground above the caps reads as a gap where two pixels of
    // flat-topped cap under the block's crop read as nothing at all.
    // 48 OF AIR ABOVE THE CAPS now, the page's own unit (they stood on
    // the edge, cropped, for a while).
    name.style.marginTop = (mt + (wb.top + AIR - capTop)).toFixed(2) + 'px';
    // AND THE FOOT THE SAME WAY: the band ends where the ink does. The
    // scan's last inked row gives the ink's foot against the baseline
    // (Placard's caps sit flat on it); the block is cut to end 4 above
    // that foot, so the letters' bottoms meet the band's bottom edge
    // and the overrun crops under it.
    var botRow = -1;
    for (var yy = chh - 1; yy >= 0 && botRow < 0; yy--) {
      for (var xx = 0; xx < cw; xx++) { if (data[(yy * cw + xx) * 4 + 3] > 40) { botRow = yy; break; } }
    }
    if (botRow < 0) return;
    var inkBelow = (botRow + 1 - y0) / scan * size;
    // Re-read the baseline: the margin just moved the line.
    var rg2 = document.createRange(); rg2.setStart(pieces[0], 0); rg2.setEnd(pieces[0], 1);
    var fr2 = rg2.getBoundingClientRect();
    var baseline2 = fr2.top + (fr2.height - (mm.fontBoundingBoxAscent + mm.fontBoundingBoxDescent)) / 2 + mm.fontBoundingBoxAscent;
    var inkBottom = baseline2 + inkBelow;
    // THE BAND CLOSES 48 UNDER THE FEET, as it opens 48 over the caps.
    wm.style.height = Math.max(0, inkBottom - wb.top + AIR).toFixed(2) + 'px';
    return { wb: wb, inkBottom: inkBottom };
  }
  function fitMastheadFill() {
    var name = document.querySelector('.site-nav--top .topbar-name');
    if (!name) return;
    var wm = name.closest('.topbar-wordmark') || name.parentElement;
    // THE HEADER'S WORDMARK KEEPS THE PAGE'S 72 like every other banner
    // (the foot's reprint already does) — over the ink and under it,
    // and the masthead line slots into that same 72 under the feet.
    var AIR = 72;
    var f = fillNameBand(name, wm, { air: AIR });
    if (!f) return;
    var wb = f.wb, inkBottom = f.inkBottom;
    // The block ends ON the ink's foot, one pixel of allowance under
    // it, so the letters print whole: the band and the page are the
    // same ground now, so nothing is gained by cutting the feet.
    // AND THE SAME 48 UNDER THE FEET, with the masthead line SLOTTED
    // INTO IT: the charcoal runs 48 past the name's foot and stops, and
    // the line stands centred in that 48 by its ink — the air above
    // the caps and the air the line sits in are the one measure.
    // THE WHITE KEEPS THE SAME 48 UNDER THE FEET as it keeps over the
    // caps; the line stands in the charcoal below it, centred in its
    // own 48.
    var band = document.querySelector('.dek-band--masthead');
    var wmH = Math.max(0, inkBottom - wb.top + AIR);
    if (band) {
      // THE STRIP IS THE BAND'S OWN, ahead of time: the same height and
      // the same middle box, so when the section band rides up over it
      // the two lines are already standing where the band will print
      // them — it picks them up rather than replacing them.
      // THE STRIP IS EMPTY NOW — the band carries the masthead line —
      // so it takes no height at all and the charcoal simply runs on.
      var sect = document.querySelector('.section-band');
      var bandH = band.children.length ? (sect ? sect.getBoundingClientRect().height : 72) : 0;
      band.style.top = (inkBottom - wb.top + AIR).toFixed(2) + 'px';
      band.style.height = bandH.toFixed(2) + 'px';
      band.style.alignItems = 'center';
      var bmid = inkBottom + AIR + bandH / 2;
      // ACROSS: the band's middle group's own box.
      var mid = sect && sect.querySelector('.band-mid');
      if (mid) {
        var mr = mid.getBoundingClientRect();
        band.style.paddingLeft = mr.left.toFixed(2) + 'px';
        band.style.paddingRight = Math.max(0, document.documentElement.clientWidth - mr.right).toFixed(2) + 'px';
      }
      [].forEach.call(band.querySelectorAll('a, span'), function (item) {
        var di = inkSpan(item);
        if (!di) return;
        var cur = parseFloat(item.style.top) || 0;
        item.style.top = (cur + (bmid - (di.top + di.bot) / 2)).toFixed(2) + 'px';
      });
    }
    wm.style.height = wmH.toFixed(2) + 'px';
    document.documentElement.style.setProperty('--masthead-h', wmH.toFixed(2) + 'px');
  }
  // A line's TRUE ink edges, read from layout: the first and last
  // characters' own boxes give the glyph origins, and the face's
  // bearings give the ink inside them. No modelling of how the line
  // is centred, which is where the banners' own seat went wrong.
  // AND THE LINE MAY BE IN PIECES. The masthead's NEW carries a span
  // of its own (the foil plate), so a first-text-node read measures
  // "THE " and calls that the wordmark's whole ink — 240 where the
  // real span is 1344. The banners track themselves TO this number,
  // so the error came out as SUBSCRIBE tracked to minus 56 a letter,
  // the word collapsed into itself and dragged half a page left. The
  // first piece's first letter and the LAST piece's last letter are
  // the line's two ends, whatever lies between them.
  function inkPieces(el) {
    var out = [];
    (function collect(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.nodeValue.length) out.push(n); }
        else if (n.nodeType === 1) collect(n);
      }
    })(el);
    return out;
  }
  function inkSpanOf(el) {
    var pieces = inkPieces(el);
    if (!pieces.length) return null;
    // The ends are the first and last PRINTING characters — a piece
    // may open or close on the word space between the spans.
    var head = null, tail = null;
    for (var i = 0; i < pieces.length && !head; i++) {
      var t = pieces[i].nodeValue;
      for (var j = 0; j < t.length; j++) if (t.charAt(j).trim()) { head = { node: pieces[i], at: j }; break; }
    }
    for (var k = pieces.length - 1; k >= 0 && !tail; k--) {
      var t2 = pieces[k].nodeValue;
      for (var m = t2.length - 1; m >= 0; m--) if (t2.charAt(m).trim()) { tail = { node: pieces[k], at: m }; break; }
    }
    if (!head || !tail) return null;
    // Each end's bearings come from the face IT is set in — the
    // pieces can carry their own type.
    function bearing(end) {
      var host = end.node.parentElement || el;
      var hcs = getComputedStyle(host);
      var ch = end.node.nodeValue.charAt(end.at);
      if (hcs.textTransform === 'uppercase') ch = ch.toUpperCase();
      var g = document.createElement('canvas').getContext('2d');
      g.font = hcs.fontWeight + ' ' + hcs.fontSize + ' ' + hcs.fontFamily;
      var m2 = g.measureText(ch);
      return { ls: parseFloat(hcs.letterSpacing) || 0, left: m2.actualBoundingBoxLeft || 0,
               rightGap: m2.width - m2.actualBoundingBoxRight };
    }
    var rH = document.createRange(); rH.setStart(head.node, head.at); rH.setEnd(head.node, head.at + 1);
    var rT = document.createRange(); rT.setStart(tail.node, tail.at); rT.setEnd(tail.node, tail.at + 1);
    var a = rH.getBoundingClientRect(), b = rT.getBoundingClientRect();
    var bH = bearing(head), bT = bearing(tail);
    return {
      left: a.left - bH.left,
      right: b.right - bT.ls - bT.rightGap
    };
  }

  function fitOneBannerName(el) {
    if (!el) return;
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize);
    if (!size) return;
    var text = el.textContent || '';
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    if (text.length < 2) return;
    var g = document.createElement('canvas').getContext('2d');
    g.font = cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    var m = g.measureText(text);
    var leftBearing = m.actualBoundingBoxLeft || 0;
    var naturalInk = leftBearing + m.actualBoundingBoxRight;
    if (!naturalInk) return;
    var band = el.parentNode.getBoundingClientRect();
    // THE TARGET IS THE MASTHEAD'S OWN INK, not a nominal 48: the two
    // are measured the same way here, so matching the wordmark
    // directly can't drift on a bearing convention the way a bare
    // number does — it read 5.9 wider than the masthead when the
    // margin was assumed rather than measured.
    var mast = document.querySelector('.topbar-name');
    var targetLeft = band.left + 48;
    var target = band.width - 96;
    if (mast) {
      var mi = inkSpanOf(mast);
      // BUT NEVER PAST THE BAND'S OWN 48s. The wordmark bleeds off both
      // edges now (album-cover fashion), and a nine-letter word tracked
      // to that span loses its first and last letters off the page.
      if (mi && (mi.right - mi.left) <= band.width - 96) { targetLeft = mi.left; target = mi.right - mi.left; }
    }
    // CSS lays a space after EVERY letter, the last one included, so
    // the ink grows by only (n-1) of them — track on that count or
    // the word runs a full space wide.
    var ls = (target - naturalInk) / (text.length - 1);
    el.style.letterSpacing = ls.toFixed(3) + 'px';
    // THE POSITION IS READ, NOT MODELLED. Deriving where the tracked
    // line starts means predicting how the browser centres a line whose
    // last letter carries a trailing space — and that prediction was
    // wrong by half the tracking, which pushed every banner right by
    // that much (STORE worst, its tracking being widest). A Range over
    // the FIRST CHARACTER is real layout: its box opens on that
    // glyph's own origin, so the ink opens one bearing further along.
    el.style.transform = 'none';
    var tn = el.firstChild;
    if (!tn || tn.nodeType !== 3) return;
    var rng = document.createRange();
    rng.setStart(tn, 0); rng.setEnd(tn, 1);
    var firstBox = rng.getBoundingClientRect();
    var firstBearing = g.measureText(text.charAt(0)).actualBoundingBoxLeft || 0;
    var inkLeft = firstBox.left - firstBearing;
    var shift = targetLeft - inkLeft;
    el.style.transform = 'translateX(' + shift.toFixed(2) + 'px)';
  }

  // EVERY ROW STANDS THE HERO'S HEIGHT. The rows settle at whatever
  // their own text needs — a wider column takes fewer lines, three
  // cells take more than two — so left alone they step up and down the
  // page. The HERO's cell is the page's fixed measure (its height is a
  // vw calc, not content), so it is the one thing worth matching, and
  // every row takes it as a floor. Re-read each pass, cleared first so
  // a previous pass's floor is never what gets measured.
  // THE REVIEW'S TITLE SITS 24 ABOVE ITS DEK — INK TO INK, the way
  // every other gap on this page is stated. Box to box would not be
  // the same number: a line box carries half-leading above the cap and
  // a descender below the baseline that no reader sees, and between
  // these two faces at these two sizes they add 8.9 of air nobody
  // asked for.
  //
  // The DEK KEEPS ITS SEAT. It closes the column 48 above the foot
  // (stated in style.css, and asked for in those terms), so it is the
  // TITLE that comes down to it: the title's own auto top margin —
  // which used to centre it in the column, leaving anything from 9 to
  // 232 between the two — swallows whatever room is left above
  // instead, and the pair closes the column together.
  //
  // Where a cell has no room to give, the pair simply grows by the
  // difference and the row cap takes it off the picture. That is what
  // the cap is for, and it is why this runs BEFORE fitRowHeights.
  var CONTRA_MATTER_GAP = 24;
  // AND THE BLOCK'S TWO OUTER EDGES ARE INK TOO. The stylesheet states
  // 48 between the picture and the words and 0 between the words and
  // the row's edge; both are box measures, and the boxes carry air —
  // the title's half-leading above its cap, the courier's descender
  // and half-leading under its baseline. Read off the rendered lines
  // and paid back here: the picture-side 48 is trimmed by what the
  // first box carries above its cap, and the row-side edge is hung
  // past the column by what the last box carries under its baseline,
  // so the cap (or the baseline, turned over) lands on the row's own
  // line, where the postscript's picture and the hero's stand.
  var CONTRA_PIC_GAP = 48;
  // THE BASELINE IS PROBED, NOT MODELLED. A zero-height inline-block
  // sits on the line's baseline by definition, so its top IS the
  // baseline — read where the browser put it, whatever the face, the
  // fallback, or the nesting.
  function baselineOf(el, atStart) {
    var host = el;
    if (atStart) { while (host.firstElementChild) host = host.firstElementChild; }
    else { while (host.lastElementChild) host = host.lastElementChild; }
    var s = document.createElement('span');
    s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;';
    if (atStart) host.insertBefore(s, host.firstChild); else host.appendChild(s);
    var y = s.getBoundingClientRect().top;
    s.remove();
    return y;
  }
  function capAscent(el) {
    var cs = getComputedStyle(el);
    measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + (parseFloat(cs.fontSize) || 0) + 'px ' + cs.fontFamily;
    return measureCtx.measureText('H').actualBoundingBoxAscent || 0;
  }

  // ---------- THE REVIEW, IN A FEW NUMBERS ----------
  // AT REST: the picture on the head, the words on the foot (turned
  // over: words on the head, picture on the foot), 48 between them
  // ink to ink. The words are the flow; the picture is ABSOLUTE and
  // seated by a top and a height, and takes whatever the words leave.
  //
  // OPEN: the body text stands at the HEAD of the card, in a plate
  // exactly as tall as its own preview (48 over the first line, 48
  // under the last), and the picture takes everything under it, down
  // to the foot — rising over a short preview, giving way to a long
  // one, never shorter than a third of the card (the preview is cut
  // to the plate by fitLatestTitle). Plate and picture tile the whole
  // cell, so the words are covered whichever way the card is turned,
  // and the same two properties carry the move — one transition, no
  // change in the flow, the row never moves. The plate's height is
  // measured on the FULL preview each pass, so a cut from the last
  // pass never shortens the next.
  var OPEN_PIC_MIN_SHARE = 1 / 3;
  function fitContra() {
    [].forEach.call(document.querySelectorAll('.latest-cell--contra'), function (cell) {
      var col = cell.querySelector('.latest-col');
      var pic = cell.querySelector('.latest-cover-col');
      var title = cell.querySelector('.latest-title');
      var dek = cell.querySelector('.latest-dek');
      var meta = cell.querySelector('.cover-meta');
      var date = cell.querySelector('.cover-meta--peek');
      var plate = cell.querySelector('.latest-plate');
      if (!col || !pic || !title) return;
      var rev = cell.classList.contains('latest-cell--contra-rev');
      ['--slide', '--sq-rest', '--sq-open'].forEach(function (v) { cell.style.removeProperty(v); });
      // From the sheet's own sizes every run: this runs twice a pass,
      // and a shrink left standing would compound (a dek went 20 -> 16
      // -> 12.8 -> 10 that way).
      title.style.fontSize = '';
      if (dek) dek.style.fontSize = '';
      var shown = function (el) { return el && getComputedStyle(el).display !== 'none'; };
      // The words' HEAD and FOOT are whichever of the author, the title,
      // the dek and the date stand highest and lowest, read off their
      // boxes.
      var stack = [meta, title, dek, date].filter(shown);
      var head = stack.reduce(function (a, b) { return b.getBoundingClientRect().top < a.getBoundingClientRect().top ? b : a; });
      var last = stack.reduce(function (a, b) { return b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a; });
      // THE WORDS' OUTER EDGE ON THE ROW'S LINE — baseline on the
      // foot, or cap on the head turned over: the column's margin
      // hangs the box's own air past the cell by exactly what the box
      // carries outside the ink.
      col.style.marginTop = '';
      col.style.marginBottom = '';
      var capIn = (baselineOf(head, true) - capAscent(head)) - head.getBoundingClientRect().top;
      var rideOut = last.getBoundingClientRect().bottom - baselineOf(last, false);
      if (!isFinite(capIn) || !isFinite(rideOut)) return;
      if (rev) col.style.marginTop = (-capIn).toFixed(2) + 'px';
      else col.style.marginBottom = (-rideOut).toFixed(2) + 'px';
      var cb = cell.getBoundingClientRect();
      if (!cb.height) return;
      // THE PICTURE IS SQUARE AT REST — as wide as the card, as tall as
      // it is wide — at the card's head (or its foot, turned over). The
      // words take whatever the square leaves; they used to size the
      // picture, which squared it only by luck of the title's length.
      var side = cb.width;
      var picTop = rev ? (cb.height - side) : 0;
      var picH = side;
      // THE BLOCK'S OWN EDGES ARE THE COURIER'S FRAME: the stack is
      // anchored on the card's edge by its margins above (24 by ink),
      // so what it must fill is the remainder less the two 24s. A
      // title too tall for it shrinks until it fits; whatever room is
      // left is dealt into the stack's two inner gaps, half each, so
      // the far courier lands 24 off the picture and the title and
      // dek centre between the two lines.
      var wordsRoom = cb.height - side - 48;
      var stackInk = function () {
        return baselineOf(last, false) - (baselineOf(head, true) - capAscent(head));
      };
      // In order: the title down to 24 (never smaller), then the dek
      // down to four-fifths of itself, and what still will not fit the
      // square gives up — a review's words are never crushed to make
      // its picture square.
      var CONTRA_TITLE_FLOOR = 24, CONTRA_DEK_FLOOR = 0.8;
      var shrink = function (el, floorPx) {
        var sz = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize) || 0;
        if (!sz) return false;
        var over = stackInk() - wordsRoom;
        var eh = el.getBoundingClientRect().height;
        if (!eh || over <= 0.25) return false;
        var next = Math.max(floorPx, sz * Math.max(0.6, (eh - over) / eh));
        if (next >= sz - 0.05) return false;
        el.style.fontSize = next.toFixed(2) + 'px';
        return true;
      };
      var guard = 12;
      while (stackInk() > wordsRoom + 0.25 && guard-- > 0 && shrink(title, CONTRA_TITLE_FLOOR)) {}
      if (dek && shown(dek)) {
        var dek0 = parseFloat(getComputedStyle(dek).fontSize) || 0;
        guard = 8;
        while (stackInk() > wordsRoom + 0.25 && guard-- > 0 && shrink(dek, dek0 * CONTRA_DEK_FLOOR)) {}
      }
      var ink = stackInk();
      var yielded = Math.max(0, ink - wordsRoom);
      if (yielded > 0) {
        picH = side - yielded;
        if (rev) picTop = cb.height - picH;
        wordsRoom += yielded;
      }
      var slack = wordsRoom - ink;
      if (slack > 0.5) {
        var author = cell.querySelector('.cover-meta--author');
        var inner = [author && shown(author) ? author : null, dek && shown(dek) ? dek : title].filter(Boolean);
        inner.forEach(function (el) {
          var mb = parseFloat(el.style.marginBottom) || parseFloat(getComputedStyle(el).marginBottom) || 0;
          el.style.marginBottom = (mb + slack / inner.length).toFixed(2) + 'px';
        });
      }
      cell.style.setProperty('--pic-top', Math.max(0, picTop).toFixed(2) + 'px');
      cell.style.setProperty('--pic-h', Math.max(0, picH).toFixed(2) + 'px');
      // OPEN: the plate as tall as its whole preview, clamped to leave
      // the picture its third. Measured off the paragraphs themselves
      // (the curtain inside the plate is absolute, so the plate's own
      // auto height would say nothing), on the full text.
      if (!plate) return;
      if (!plate.__fullHTML) plate.__fullHTML = plate.innerHTML;
      else plate.innerHTML = plate.__fullHTML;
      plate.style.paddingBottom = '';
      var pcs = getComputedStyle(plate);
      var padB = parseFloat(pcs.paddingBottom) || 0;
      var ps = plate.querySelectorAll('.latest-plate-p');
      var lastP = ps.length ? ps[ps.length - 1] : null;
      var pb = plate.getBoundingClientRect();
      var lastEl = plate.querySelector('.plate-more') || lastP;
      var natural = lastEl ? (lastEl.getBoundingClientRect().bottom - pb.top + padB) : pb.height;
      var plateH = Math.max(0, Math.min(natural, cb.height * (1 - OPEN_PIC_MIN_SHARE)));
      cell.style.setProperty('--plate-h', plateH.toFixed(2) + 'px');
      cell.style.setProperty('--pic-h-open', (cb.height - plateH).toFixed(2) + 'px');
      // THE PICTURE SLIDES AWAY FROM ITS OWN EDGE. Upright, it stands on
      // the head and comes DOWN: the body takes the head, the picture
      // the rest to the foot. Turned over, it stands on the foot and
      // goes UP: the body takes the foot, the picture rises to the
      // head. Either way the words it covered stay covered — plate and
      // picture still tile the whole cell.
      if (rev) {
        cell.style.setProperty('--pic-top-open', '0px');
        cell.style.setProperty('--plate-top', (cb.height - plateH).toFixed(2) + 'px');
      } else {
        cell.style.setProperty('--pic-top-open', plateH.toFixed(2) + 'px');
        cell.style.setProperty('--plate-top', '0px');
      }
    });
  }
  function fitContraGap() {
    [].forEach.call(document.querySelectorAll('.latest-cell--contra'), function (cell) {
      var title = cell.querySelector('.latest-title');
      var dek = cell.querySelector('.latest-dek');
      // The courier is TWO lines now: the author over the title, the
      // date under the dek (build.js). The date closes the column.
      var meta = cell.querySelector('.cover-meta--peek');
      var author = cell.querySelector('.cover-meta--author');
      if (!title) return;
      // THE AUTHOR OPENS THE COLUMN, 24 over the title's cap — read
      // off the rendered ink like the pairs below and paid out of the
      // author's own bottom margin.
      if (author && getComputedStyle(author).display !== 'none') {
        author.style.marginBottom = '';
        var rgA = document.createRange(); rgA.selectNodeContents(author);
        var la = [].filter.call(rgA.getClientRects(), function (r) { return r.height; });
        var rgT0 = document.createRange(); rgT0.selectNodeContents(title);
        var lt0 = [].filter.call(rgT0.getClientRects(), function (r) { return r.height; });
        if (la.length && lt0.length) {
          var authorBase = la[la.length - 1].bottom - inkOffsets(author).ride;
          var titleCap = lt0[0].top + inkOffsets(title).cap;
          var mbA = parseFloat(getComputedStyle(author).marginBottom) || 0;
          author.style.marginBottom =
            Math.max(0, mbA + (CONTRA_MATTER_GAP - (titleCap - authorBase))).toFixed(2) + 'px';
        }
      }
      if (!dek || getComputedStyle(dek).display === 'none') {
        title.style.marginBottom = '';
        return;
      }
      // MEASURED OFF THE RENDERED PAIR, not computed from the faces'
      // offsets alone. Both these elements are set at line-height 1.1,
      // which is TIGHTER than the faces' own line boxes — so each line
      // box hangs outside its element's box (2.31 below the title's,
      // 2.00 above the dek's) and the two of them eat 4.31 of any
      // margin stated between the boxes. Read where the ink actually
      // landed and correct by the difference instead: the seat is
      // right on the first pass and a no-op on every one after it.
      var rgT = document.createRange(); rgT.selectNodeContents(title);
      var lt = [].filter.call(rgT.getClientRects(), function (r) { return r.height; });
      var rgD = document.createRange(); rgD.selectNodeContents(dek);
      var ld = [].filter.call(rgD.getClientRects(), function (r) { return r.height; });
      if (!lt.length || !ld.length) return;
      var baseline = lt[lt.length - 1].bottom - inkOffsets(title).ride;
      var dekCap = ld[0].top + inkOffsets(dek).cap;
      var now = dekCap - baseline;
      var mb = parseFloat(getComputedStyle(title).marginBottom) || 0;
      title.style.marginBottom =
        Math.max(0, mb + (CONTRA_MATTER_GAP - now)).toFixed(2) + 'px';
      // AND THE COURIER CLOSES THE COLUMN, the same 24 under the dek
      // that the dek keeps under the title — read the same way, off
      // the rendered ink, and paid out of the dek's own bottom margin
      // so the row that now ends the column is the one the stylesheet's
      // foot clear holds up.
      if (!meta) { dek.style.marginBottom = ''; return; }
      dek.style.marginBottom = '';
      var rgD2 = document.createRange(); rgD2.selectNodeContents(dek);
      var ld2 = [].filter.call(rgD2.getClientRects(), function (r) { return r.height; });
      var rgM = document.createRange(); rgM.selectNodeContents(meta);
      var lm = [].filter.call(rgM.getClientRects(), function (r) { return r.height; });
      if (!ld2.length || !lm.length) return;
      var dekBase = ld2[ld2.length - 1].bottom - inkOffsets(dek).ride;
      var metaCap = lm[0].top + inkOffsets(meta).cap;
      var mb2 = parseFloat(getComputedStyle(dek).marginBottom) || 0;
      dek.style.marginBottom =
        Math.max(0, mb2 + (CONTRA_MATTER_GAP - (metaCap - dekBase))).toFixed(2) + 'px';
    });
  }

  function fitRowHeights() {
    var hero = document.querySelector('.card--mega .duo-half--mega');
    var rows = [].slice.call(document.querySelectorAll('.card--latest'));
    var squares = [].slice.call(document.querySelectorAll('.latest-cover-col--square'));
    rows.forEach(function(r){ r.style.minHeight = ''; });
    // Cleared BEFORE the hero is read: a cap from the last pass would
    // otherwise be what this one measures. The height is published as
    // --sq-rest on the CELL and spent in the stylesheet rather than
    // written on the box, because the open card states a second height
    // from it (--sq-open, half) and a rule cannot outrank an inline
    // style without shouting. Cleared, the square falls back to its
    // width-driven 1:1, which is the natural state this measures.
    squares.forEach(function(s){
      s.style.height = '';
      var sc = s.closest('.latest-cell');
      if (sc) sc.style.removeProperty('--sq-rest');
    });
    if (!hero) return;
    var h = hero.getBoundingClientRect().height;
    if (!h) return;
    // THE PORTRAIT COVERS TAKE THE HERO'S HEIGHT OUTRIGHT. Their 3:4
    // ratio set the row's height while the column was narrow enough
    // for that to come out at the hero's own; on the full measure it
    // runs 75 taller, and every card on the page is meant to stand
    // the one height. Stated as the column's height (the cover fills
    // it), the ratio standing down.
    [].forEach.call(document.querySelectorAll('.latest-cover-col--portrait'), function (p) {
      p.style.aspectRatio = 'auto';
      p.style.height = h.toFixed(2) + 'px';
    });
    // (The review's picture is no longer capped here: it is absolute
    //  and seated by fitContra, in both its states.)
    rows.forEach(function(r){
      if (r.getBoundingClientRect().height < h) r.style.minHeight = h.toFixed(2) + 'px';
    });
  }

  // THE COURIER STANDS ON THE PICTURE'S FOUR CORNERS — and the ROW
  // it stands in still spans the whole rule.
  //
  // The row's BOX is load-bearing and always was: its ::before is the
  // paper mask the held head paints the scrolling card out with, its
  // ::after is the flank over the gutter, and the clones' bridge is
  // measured off it. Narrow that box to the picture and the text
  // column's matter scrolls over the held head unmasked. So the box
  // keeps the whole measure — from the text column's own ink, across
  // the 48 gap, to the picture's far edge — exactly as it always has,
  // and only the INK moves: a measured pad on each side that seats
  // kicker and author on the picture's own two corners, with date and
  // section closing the two beneath it. Padding, not a narrower box —
  // an absolutely-positioned pseudo resolves against the PADDING box,
  // so every mask and flank stands precisely where it stood.
  //
  // Open, the pad is spent back (see the hover rules in style.css):
  // the picture has left the cover's seat by then, the plate has the
  // whole card, and the two courier lines read across it end to end
  // the way they always did.
  //
  // Measured, because the two columns are seated by flex bases,
  // aspect ratios and vw calcs that differ row by row.
  function fitCourierSpan() {
    [].forEach.call(document.querySelectorAll('.latest-courier--cover'), function (row) {
      try { fitOneCourierRow(row); } catch (e) {
        fitErrors.push('fitCourierSpan row: ' + (e && e.message ? e.message : e));
      }
    });
  }
  // A ROW'S VERTICAL SEAT, stated where the row's box actually is:
  // a row in flow takes the move as a relative offset (its box stays
  // where every mask and seat measured it); an absolutely seated one
  // takes it against its own containing block.
  function seatRow(el, boxTop) {
    var cs2 = getComputedStyle(el);
    var rb = el.getBoundingClientRect();
    if (cs2.position === 'absolute') {
      var host2 = el.offsetParent || el.parentElement;
      if (!host2) return;
      el.style.top = (boxTop - host2.getBoundingClientRect().top).toFixed(2) + 'px';
    } else {
      // A relative offset needs a POSITIONED box. The rows read
      // `relative` off the sheet in every browser tried here, but a
      // static one would swallow the seat silently, so the fitter
      // states it rather than assumes it.
      if (cs2.position === 'static') el.style.position = 'relative';
      var base = rb.top - (parseFloat(cs2.top) || 0);
      el.style.top = (boxTop - base).toFixed(2) + 'px';
    }
  }
  function fitOneCourierRow(row) {
    // THE ROWS ARE CHIPS NOW — boxes the width of their own words, set
    // into the picture's two corners (fitCoverChips) — so the span
    // machinery below (pads onto the words' measure, the billing's own
    // two ends) has nothing left to seat. Every seat it wrote is
    // cleared and the pass stands down.
    row.style.marginLeft = '';
    row.style.marginRight = '';
    row.style.removeProperty('--ink-l');
    row.style.removeProperty('--ink-r');
    var host0 = row.closest('.duo-half--mega, .latest-cell');
    var cat0 = host0 && host0.querySelector('.cover-under');
    if (cat0) { cat0.style.removeProperty('--span-l'); cat0.style.removeProperty('--span-r'); }
    if (true) return;
    (function () {
      var host = row.closest('.duo-half--mega, .latest-cell');
      if (!host) return;
      // AN OPEN CARD IS NOT MEASURED. Its artwork and its rules are
      // mid-slide, and every seat here is read off them — re-fitting
      // while they travel walks the labels left or right with the
      // picture, which is exactly what they must not do. The resting
      // seat is the seat; the card keeps it until it closes.
      if (host.classList.contains('is-open')) return;
      // The UNDER ROW rides the same measure as the head above it —
      // where it is absolute. The contra's prints in flow under its
      // picture and needs no seating at all.
      var catAny = host.querySelector('.cover-under');
      var cat = catAny;
      if (cat && getComputedStyle(cat).position !== 'absolute') cat = null;
      row.style.marginLeft = '';
      row.style.marginRight = '';
      row.style.top = '';
      row.style.removeProperty('--ink-l');
      row.style.removeProperty('--ink-r');
      if (catAny) { catAny.style.top = ''; }
      if (cat) {
        cat.style.removeProperty('--span-l');
        cat.style.removeProperty('--span-r');
        cat.style.left = '';
        cat.style.right = '';
      }
      // THE RULE'S OWN EXTENT, read off the rule where it is a real
      // element and off the column it runs the length of where it is
      // a pseudo (the hero's divider, which opens on the title
      // column's ink and closes on the cover's edge).
      var L = Infinity, R = -Infinity;
      [].forEach.call(host.querySelectorAll('.latest-rule'), function (el) {
        var b = el.getBoundingClientRect();
        // A rule that isn't drawn has no seat to contribute — and its
        // empty rect sits at the VIEWPORT'S origin, so taken into the
        // union it drags the head's left edge to x 0 and prints the
        // kicker out in the margin, a whole cell wide of its own box.
        // (The turned-over reviews hide their foot rule.)
        if (!b.width) return;
        if (b.left < L) L = b.left;
        if (b.right > R) R = b.right;
      });
      var col = host.querySelector('.panel-col--left') || host.querySelector('.latest-col');
      var wordsL = null, wordsR = null;
      if (col) {
        var cb = col.getBoundingClientRect();
        var cs = getComputedStyle(col);
        var cl = cb.left + (parseFloat(cs.paddingLeft) || 0);
        var cr = cb.right - (parseFloat(cs.paddingRight) || 0);
        // THE WORDS' OWN MEASURE — the title and dek column's ink, which
        // is what the four corners bracket now.
        wordsL = cl; wordsR = cr;
        if (cl < L) L = cl;
        if (cr > R) R = cr;
      }
      if (!isFinite(L) || !isFinite(R)) return;
      var rr = row.getBoundingClientRect();
      if (L < rr.left - 0.5) row.style.marginLeft = (L - rr.left).toFixed(2) + 'px';
      if (R > rr.right + 0.5) row.style.marginRight = (rr.right - R).toFixed(2) + 'px';
      // THE INK'S OWN SEAT: THE WORDS' two edges, as a pad inside the
      // row's whole measure. The four corners used to bracket the
      // PICTURE — they bracket the title and dek instead now, on the
      // same two lines the cover's top and foot set, so the pair reads
      // as a frame around what is written rather than around the
      // artwork. A cell whose column IS its picture (the contras) puts
      // both at the same edges and nothing there moves.
      //
      // EXCEPT WHERE THE WORDS' MEASURE CANNOT HOLD THE PAIR. The
      // postscripts' text column is 208 wide and a kicker with a
      // subject beside it wants up to 306: forced into that column the
      // two would be shrunk under their own ink and ellipsised
      // mid-word. Those keep the row's whole measure — the pair sits
      // over the block rather than over the words — which is a seat
      // the page already knows, not a new one.
      var pairFits = function (a, b) {
        if (wordsL === null) return false;
        var w = 0;
        if (a) w += a.scrollWidth;
        if (b) w += b.scrollWidth;
        var gap = parseFloat(getComputedStyle(a ? a.parentNode : row).columnGap) || 0;
        return w + gap <= (wordsR - wordsL) + 0.5;
      };
      var pic = host.querySelector('.duo-card-image') || host.querySelector('.latest-cover');
      var pb = pic ? pic.getBoundingClientRect() : null;
      if (!pb || !pb.width) return;
      // ACROSS: the words' own measure, the pair bracketing the title
      // and dek — except where that column cannot hold the pair (the
      // postscripts' is 208 wide against a kicker-and-subject wanting
      // up to 306), which keeps the row's whole measure rather than
      // being ellipsised into it.
      var headL = wordsL, headR = wordsR;
      if (!pairFits(host.querySelector('.cover-kicker'), host.querySelector('.cover-date'))) {
        headL = L; headR = R;
      }
      if (headL !== null) {
        row.style.setProperty('--ink-l', Math.max(0, headL - L).toFixed(2) + 'px');
        row.style.setProperty('--ink-r', Math.max(0, R - headR).toFixed(2) + 'px');
      }
      // DOWN: INSIDE THE PICTURE'S HEIGHT. The two rows used to sit
      // outside the artwork — one line above its top edge, one below
      // its foot; they hold to those two edges from the INSIDE now, so
      // the four labels and the picture close on the same two lines
      // however tall the cover is. A row in flow takes the move as a
      // relative offset (its box stays where every mask and seat
      // measured it); an absolutely seated one takes it against its
      // own containing block.
      var IN = 0;
      var PAD = 6;
      // EVERY CELL SEATS ITS PAIRS BETWEEN THE TITLE AND THE DEK now
      // (fitMatterInk) — the review's included, whose rows stand in
      // its matter in flow. Nothing here seats a row any more; the
      // picture's edges are the picture's own.
      void IN; void PAD;
      if (cat) {
        // AND THE UNDER ROW GOES WITH ITS PAIR. Its box is seated on
        // the picture's foot by CSS (left 0, right 0 of a block that
        // spans the cover); the LINE it sits on is not touched here —
        // only the two ends, moved onto the words' measure the same
        // way the head's pads are. The offsets are read against its
        // own containing block, so a mirrored row answers by itself.
        var box = cat.offsetParent || cat.parentElement;
        if (box) {
          var bb = box.getBoundingClientRect();
          cat.style.setProperty('--span-l', (L - bb.left).toFixed(2) + 'px');
          cat.style.setProperty('--span-r', (bb.right - R).toFixed(2) + 'px');
          // Across the WORDS, like the head above it — and the same
          // fallback where the column cannot hold the pair.
          var underL = wordsL, underR = wordsR;
          if (!pairFits(host.querySelector('.cover-author'), host.querySelector('.cover-cat'))) {
            underL = L; underR = R;
          }
          if (underL !== null) {
            cat.style.left = (underL - bb.left).toFixed(2) + 'px';
            cat.style.right = (bb.right - underR).toFixed(2) + 'px';
          }
        }
      }
    })();
  }

  // THE BODY SITS CENTRED BETWEEN ITS TWO SEATS. Text sets in whole
  // rows from a fixed seat under the courier, so whatever the box does
  // not divide by the line height is left over — and it all collected
  // at the FOOT, which is why the 48 above the bottom rule read as 58
  // on a postscript and as much as 106 on a hero whose last column row
  // went unfilled. The rows themselves cannot be subdivided without
  // feathering the leading (retired) and the head's 43.67 is shared by
  // every card, so neither end can simply absorb it. The leftover is
  // SPLIT instead: half handed back to the head, half to the foot, so
  // the body is centred between the two and the air reads even.
  // Applied as a margin on the text's own container, never as padding,
  // because the padding is what the cut measures against — moving it
  // would change the row count on the next pass and oscillate.
  // THE TITLE'S HALO: the block that goes hot pink when a title is
  // under the pointer (style.css, THE TITLE HOVERS ON A PINK BLOCK) —
  // the title column's own margins for its sides, run out to the
  // cover's edge on whichever side the cover stands, and the card's
  // full height (or the cover's edge, where the cover stands above or
  // below the words). Measured here and written as insets on the card
  // for the stylesheet's pseudo-element to draw.
  // (THE PREVIEW CONTROL'S TRIANGLE IS STRUCK — with the X that took
  // its corner. Nothing stands on the picture now: OPEN PREVIEW holds
  // the last line of the words, CLOSE PREVIEW the plate's foot beside
  // READ ON, both printed by the builder and seated by the same passes
  // that seat every other line.)
  function fitTitleHalo() {
    function seat(host, title, cover, words) {
      ['--hl-l', '--hl-t', '--hl-w', '--hl-h', '--hl-dx', '--hl-dy'].forEach(function (v) { host.style.removeProperty(v); });
      // The block is a real element (not a pseudo), so the pointer can
      // find it in the gap beside the words; made once, seated by the
      // vars below.
      if (!host.querySelector(':scope > .title-halo')) {
        var halo = document.createElement('span');
        halo.className = 'title-halo';
        halo.setAttribute('aria-hidden', 'true');
        host.insertBefore(halo, host.firstChild);
      }
      if (!title || !cover) return;
      var h = host.getBoundingClientRect(), t = title.getBoundingClientRect(), p = cover.getBoundingClientRect();
      if (!h.width || !t.width || !p.width) return;
      // The block's sides are the CARD'S — the hero's card box hangs
      // 24 past the page's margin each side, so it is read inset 24 —
      // not the title's, whose measure is padded inside the block.
      var inset = host.classList.contains('duo-half--mega') ? 24 : 0;
      var l = h.left + inset, r = h.right - inset, top = h.top, bot = h.bottom;
      if (p.right <= t.left + 1) l = p.right;            // the cover on the left
      else if (p.left >= t.right - 1) r = p.left;        // on the right
      else if (p.bottom <= t.top + 1) top = p.bottom;    // above the words
      else if (p.top >= t.bottom - 1) bot = p.top;       // below them
      l = Math.max(l, h.left); r = Math.min(r, h.right);
      if (r <= l || bot <= top) return;
      // THE WORDS STEP 24 INTO THE BLOCK: the block runs a 48 gap past
      // the column on the cover's side and none on the others, so the
      // column's content moves 24 toward the cover while the title is
      // under the pointer (style.css) and stands 24 from every edge.
      var dx = 0, dy = 0;
      // (Not the postscript: its picture and column share the card in
      // halves with no gap between them now, so the column is the block
      // and steps nowhere — its 48s are its own padding.)
      var isPs = host.classList.contains('latest-cell--ps');
      if (p.right <= t.left + 1) dx = isPs ? 0 : -24;
      else if (p.left >= t.right - 1) dx = isPs ? 0 : 24;
      else if (p.bottom <= t.top + 1) dy = -24;
      else if (p.top >= t.bottom - 1) dy = 24;
      host.style.setProperty('--hl-dx', dx + 'px');
      host.style.setProperty('--hl-dy', dy + 'px');
      // THE BLOCK IS CLIPPED TO WHAT ITS PICTURE COMES TO COVER. Open,
      // every card sends its artwork across the block — but not one of
      // them covers it whole: the postscript's block is the GAP PLUS
      // the column while its picture is only the column's width, and
      // the turned-over review's picture stops 42 short of its block's
      // foot. What was left over stood as a strip of bare charcoal
      // beside the artwork. The block gives that strip up (the air it
      // becomes is the same air the open card keeps between artwork
      // and words everywhere else), and the four insets are read off
      // the landing box measured below — not predicted from the
      // travel, which is a transform on one card and a pair of margins
      // on another.
      var land = host.__land;
      if (land && land.width) {
        host.style.setProperty('--hl-cut',
          Math.max(0, land.top - top).toFixed(2) + 'px ' +
          Math.max(0, r - land.right).toFixed(2) + 'px ' +
          Math.max(0, bot - land.bottom).toFixed(2) + 'px ' +
          Math.max(0, land.left - l).toFixed(2) + 'px');
      }
      host.style.setProperty('--hl-l', (l - h.left).toFixed(2) + 'px');
      host.style.setProperty('--hl-t', (top - h.top).toFixed(2) + 'px');
      host.style.setProperty('--hl-w', (r - l).toFixed(2) + 'px');
      host.style.setProperty('--hl-h', (bot - top).toFixed(2) + 'px');
    }
    // WHERE EVERY PICTURE LANDS, MEASURED. The cards are opened all at
    // once behind a .fit-still — no transition runs, and nothing is
    // painted between the two layouts, so the reader sees none of it —
    // their pictures' boxes are read, and they are shut again. Opening
    // a card changes no card's height, so the page does not move under
    // the reading.
    var all = [].slice.call(document.querySelectorAll(
      '.latest-cell--ps, .latest-cell--contra, .duo-half--mega'));
    var wasOpen = all.map(function (el) { return el.classList.contains('is-open'); });
    all.forEach(function (el) { el.classList.add('fit-still'); el.classList.add('is-open'); });
    all.forEach(function (el) {
      var pic = el.querySelector('.latest-cover, .duo-card-image');
      el.__land = pic ? pic.getBoundingClientRect() : null;
    });
    all.forEach(function (el, i) { if (!wasOpen[i]) el.classList.remove('is-open'); });
    void document.body.offsetHeight;
    all.forEach(function (el) { el.classList.remove('fit-still'); });

    [].forEach.call(document.querySelectorAll('.latest-cell--ps, .latest-cell--contra'), function (cell) {
      seat(cell, cell.querySelector('.latest-title'), cell.querySelector('.latest-cover-col'),
           [cell.querySelector('.latest-title'), cell.querySelector('.latest-dek'), cell.querySelector('.cover-meta')]);
    });
    [].forEach.call(document.querySelectorAll('.duo-half--mega'), function (half) {
      seat(half, half.querySelector('.card-title'), half.querySelector('.duo-card-image'),
           [].slice.call(half.querySelectorAll('.panel-col--left .card-title, .panel-col--left .card-dek, .panel-col--left .card-meta--line, .panel-col--left .cover-meta')));
    });
  }

  // THE PLATE'S TEXT IS PINNED, NOT CENTRED. The kicker's cap sits 24
  // under the plate's top and READ ON's baseline 24 above its foot
  // (both are the plate's paddings, style.css); the cut fills the
  // rows between, and whatever sub-row the cut could not fill is dealt
  // to the air OVER READ ON — the closing line stands off the body by
  // that much more — so the foot pin holds to the pixel. (This used to
  // centre the text block in the box, which floated both lines.)
  function centreBodyText() {
    [].forEach.call(document.querySelectorAll(
      '.latest-cell--ps .latest-plate, .latest-cell--contra .latest-plate, .duo-half--mega .card-preview-block'),
      function (box) {
        var head = box.querySelector('.plate-title');
        var more = box.querySelector('.plate-more');
        if (head) head.style.marginTop = '';
        if (!more) return;
        more.style.marginTop = '';
        var bb = box.getBoundingClientRect();
        if (!bb.height) return;
        var padB = parseFloat(getComputedStyle(box).paddingBottom) || 0;
        var floor = bb.bottom - padB;
        var mr = more.getBoundingClientRect();
        var rem = floor - mr.bottom;
        if (rem > 0.5) {
          var mt = parseFloat(getComputedStyle(more).marginTop) || 0;
          more.style.marginTop = (mt + rem).toFixed(2) + 'px';
        }
      });
  }

  // ---------- THE PICTURE'S REACH, AND THE SEAT IT CLEARS ----------
  // The essay and the postscript open by SLIDING their picture across
  // the card (see THE PICTURE SLIDES in style.css). Two numbers carry
  // it, both read off the page:
  //
  //   --slide  how far the unit travels — enough to put its leading
  //            edge on the card's own far content edge, which is also
  //            enough to cover the title and the dek whatever the two
  //            columns measure.
  //   --slot-* the seat the body text stands in: the part of the
  //            picture's own box the travel clears, so the artwork
  //            covers it exactly at rest and clears it exactly open.
  //
  // Neither is derived from the ratio of the columns. The postscript's
  // two are equal, the pair rows' are not, and the hero's picture is
  // nearly twice its title's measure.
  //
  // Runs BEFORE the panels and fitLatestTitle: both cut their body text
  // to the box it is standing in, and a cut made against the old box is
  // not the one the reader meets.
  function slideOf(el, axis) {
    var t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    var i = axis === 'y' ? 5 : 4;
    var m = t.match(/matrix\(([^)]+)\)/);
    if (m) return parseFloat(m[1].split(',')[i]) || 0;
    var m3 = t.match(/matrix3d\(([^)]+)\)/);
    if (m3) return parseFloat(m3[1].split(',')[axis === 'y' ? 13 : 12]) || 0;
    return 0;
  }
  // The gutter the open card keeps between the artwork and the words.
  // It was the page's old 48; the margins between content went up by
  // half (the row's own gap is 72 now — .card--latest), so the open
  // postscript's and essay's body column keeps that same 72 to the
  // picture it has just come out from under.
  var SLIDE_GUTTER = 72;
  function fitSlideSlots() {
    function seat(host, mover, pic, contentL, contentR, plate) {
      if (!mover || !pic || !plate) return;
      var pb = pic.getBoundingClientRect();
      if (!pb.width || !pb.height) return;
      // READ AT REST. A refit can land mid-hover (a font arriving, a
      // resize under the pointer) and the rect would then be the seat
      // the travel had reached, not the one it starts from — so the
      // mover's own translate is taken back out.
      var tx = slideOf(mover);
      var L = pb.left - tx, R = pb.right - tx;
      var onLeft = (L + R) / 2 < (contentL + contentR) / 2;
      var d = Math.max(0, onLeft ? contentR - R : L - contentL);
      host.style.setProperty('--slide', (onLeft ? d : -d).toFixed(2) + 'px');
      // The cleared seat, LESS THE PAGE'S 48. The travel clears a strip
      // of the picture's own box; the strip's far end is the card's
      // content edge (where the picture's leading edge started) and its
      // near end stops 48 short of where the picture's trailing edge
      // comes to rest — so the open card keeps the same gutter between
      // artwork and words that it keeps between its columns. The
      // revealed column is therefore the travel less 48, whatever the
      // travel is, and it is clamped to the picture's own box so the
      // artwork still covers it whole at rest.
      var sl = onLeft ? L : Math.max(L, R - d + SLIDE_GUTTER);
      var sr = onLeft ? Math.min(R, L + d - SLIDE_GUTTER) : R;
      var box = plate.offsetParent || plate.parentElement;
      if (!box) return;
      var bb = box.getBoundingClientRect();
      plate.style.setProperty('--slot-l', (sl - bb.left).toFixed(2) + 'px');
      plate.style.setProperty('--slot-t', (pb.top - bb.top).toFixed(2) + 'px');
      plate.style.setProperty('--slot-w', Math.max(0, sr - sl).toFixed(2) + 'px');
      plate.style.setProperty('--slot-h', pb.height.toFixed(2) + 'px');
    }
    [].forEach.call(document.querySelectorAll('.latest-cell--ps'), function (cell) {
      var cb = cell.getBoundingClientRect();
      // The mover is the PICTURE itself now — the column stopped
      // travelling when the head row's box had to be left behind.
      var pic = cell.querySelector('.latest-cover');
      seat(cell, pic, pic, cb.left, cb.right, cell.querySelector('.latest-plate'));
    });
    [].forEach.call(document.querySelectorAll('.duo-half--mega'), function (half) {
      var hb = half.getBoundingClientRect();
      var img = half.querySelector('.duo-card-image');
      // The hero's content edges are the courier rows' own 24 insets —
      // the picture already closes on one of them, and the other is
      // where its leading edge is going.
      seat(half, img, img, hb.left + 24, hb.right - 24,
           half.querySelector('.card-preview-block'));
    });
    // THE REVIEW is its own fit — see fitContra.
    fitContra();
  }

  // ---------- THE MATTER ON THE COURIER'S SPAN ----------
  // Title and dek are ONE BLOCK OF INK — the title's first cap down to
  // the dek's last baseline, with a stated 48 between the title's
  // baseline and the dek's cap — and that block centres between the two
  // courier lines that bracket the picture: the header's cap ink above,
  // the billing's baseline below.
  //
  // INK, not boxes, at every end. A line box carries half-leading, an
  // ascent above the caps and a descent below the baseline that no
  // reader ever sees, and those three differ per face and per fitted
  // size — so airs that measure equal box-to-box read unequal on the
  // page. Every distance here is cap-top to baseline.
  //
  // It runs after fitLatestTitle and the panel fits, which solve the
  // type's SIZE: a seat measured before the final cut is not the one
  // the reader sees. And it OVERRIDES what those left behind — the
  // postscript title's two auto margins, the hero dek's pin to the
  // column's foot — by stating both margins outright.
  var MATTER_GAP = 48;

  // Box-top to cap-top, and baseline to box-bottom, for whatever face
  // and size this element actually renders at (a stretch-fitted title
  // carries its size inline, per line).
  function inkOffsets(el) {
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize) || 0;
    measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    var m = measureCtx.measureText('H');
    var lh = parseFloat(cs.lineHeight) || size * 1.2;
    var half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
    return {
      cap: half + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent,
      ride: half + m.fontBoundingBoxDescent
    };
  }
  // The ink span of an element's rendered text: first line's cap top,
  // last line's baseline, and where both sit inside its own box.
  function inkSpan(el) {
    if (!el || getComputedStyle(el).display === 'none') return null;
    var lines = el.querySelectorAll('.title-line');
    var firstLn = lines.length ? lines[0] : el;
    var lastLn = lines.length ? lines[lines.length - 1] : el;
    var rF = document.createRange(); rF.selectNodeContents(firstLn);
    var rectsF = [].filter.call(rF.getClientRects(), function (r) { return r.height; });
    var rL = document.createRange(); rL.selectNodeContents(lastLn);
    var rectsL = [].filter.call(rL.getClientRects(), function (r) { return r.height; });
    if (!rectsF.length || !rectsL.length) return null;
    var oF = inkOffsets(firstLn);
    var oL = inkOffsets(lastLn);
    var box = el.getBoundingClientRect();
    var top = rectsF[0].top + oF.cap;
    var bot = rectsL[rectsL.length - 1].bottom - oL.ride;
    return { top: top, bot: bot, ink: bot - top, h: box.height, capOff: top - box.top };
  }

  // TWO PASSES, EITHER SIDE OF THE ROW CAP. `which` = 'flow' runs the
  // review's in-flow margins only: they change how tall its words
  // stand, so they must be in place BEFORE fitRowHeights measures the
  // cell and takes the difference off the picture. 'seat' runs the
  // essay's and the postscript's seats only, AFTER the cap, off the
  // pictures at their final height — seated before it, the postscript's
  // billing sat 61.8 up from a foot the row then grew past.
  // THE COURIER IS ONE LINE NOW, AND IT STANDS WITH THE WORDS. The
  // chips are gone from the artwork, so the block a cell has to seat is
  // simply TITLE · 24 · DEK · 24 · META — three rows read ink to ink.
  //
  // Where the words stand BESIDE the picture (the hero, the postscript)
  // the block is centred in the picture's own height, the way it was
  // when the chips were in the corners; where they stand UNDER it (the
  // review's column) there is no span to centre in and the two 24s are
  // simply paid as margins.
  // THE TOP COURIER OVERFLOWS THE COLUMN'S OWN MARGINS. AUTHOR · DATE
  // is meant to be ONE line, and in the narrow columns — the postscript
  // halves at 210 — a long name and its date outrun the words' measure
  // and the dot ends up leading the second line like a bullet. So the
  // line is let out into the column's side padding: it is centred ink,
  // so a short line does not move a hair, and a long one keeps its dot.
  // The padding is READ off whichever ancestor states it (the mega's
  // own left column, the latest card's .latest-col) rather than named
  // here, so the sheet stays the one place the 48 is written.
  // AND IF IT STILL WILL NOT FIT, THE DOT GOES: the line breaks, the
  // second piece takes its own line, and the separator — which now
  // separates nothing — is struck. The same holds for the plate's
  // READ ON · [CLOSE PREVIEW].
  function fitCourierDots() {
    var lines = [].slice.call(document.querySelectorAll('.cover-meta--author'));
    // read every column's padding first, write every margin after:
    // one layout for the lot rather than one per card.
    var pads = lines.map(function (line) {
      if (getComputedStyle(line).textAlign !== 'center') return 0;
      var host = line.parentElement, guard = 4;
      while (host && guard-- > 0) {
        var cs = getComputedStyle(host);
        var l = parseFloat(cs.paddingLeft) || 0, r = parseFloat(cs.paddingRight) || 0;
        if (l || r) return Math.min(l, r);
        if (host.classList.contains('latest-cell') || host.classList.contains('duo-half--mega')) break;
        host = host.parentElement;
      }
      return 0;
    });
    lines.forEach(function (line, i) {
      line.style.marginLeft = pads[i] ? (-pads[i]).toFixed(2) + 'px' : '';
      line.style.marginRight = pads[i] ? (-pads[i]).toFixed(2) + 'px' : '';
    });
    // The dot rides INSIDE the piece it leads on the meta line (so a
    // break carries it along) and stands loose on the plate's line —
    // either way the test is the same: do the two pieces share a top?
    var units = [];
    [].forEach.call(document.querySelectorAll('.cover-sep'), function (sep) {
      var host = sep.parentElement;
      if (!host) return;
      var loose = host.classList.contains('cover-meta') || host.classList.contains('plate-more');
      var line = loose ? host : host.parentElement;
      var prev = loose ? sep.previousElementSibling : host.previousElementSibling;
      var post = loose ? sep.nextElementSibling : host;
      if (!line || !prev || !post) return;
      line.classList.remove('is-split');
      units.push({ line: line, prev: prev, post: post });
    });
    units.forEach(function (u) {
      var a = u.prev.getBoundingClientRect(), b = u.post.getBoundingClientRect();
      if (!a.height || !b.height) return;
      if (Math.abs(a.top - b.top) > 1.5) u.line.classList.add('is-split');
    });
  }
  function fitMatterInk(which) {
    var jobs = [];
    if (which !== 'flow') [].forEach.call(document.querySelectorAll('.latest-cell--ps'), function (cell) {
      jobs.push({ meta: cell.querySelector('.cover-meta'),
                  date: cell.querySelector('.cover-meta--peek'),
                  pic: cell.querySelector('.latest-cover'),
                  title: cell.querySelector('.latest-title'),
                  dek: cell.querySelector('.latest-dek') });
    });
    if (which !== 'flow') [].forEach.call(document.querySelectorAll('.duo-half--mega'), function (half) {
      jobs.push({ meta: half.querySelector('.panel-col--left .cover-meta'),
                  date: half.querySelector('.panel-col--left .cover-meta--peek'),
                  pic: half.querySelector('.duo-card-image'),
                  title: half.querySelector('.card-title'),
                  dek: half.querySelector('.panel-col--left .card-dek') });
    });
    jobs.forEach(function (j) {
      if (!j.title) return;
      if (j.title.closest('.is-open')) return;
      if (!j.pic) return;
      var pb = j.pic.getBoundingClientRect();
      if (!pb.height) return;
      var t = inkSpan(j.title);
      if (!t) return;
      var d = null, m = null, dt = null;
      // The whole block, ink to ink: author, 24, title, 24, dek, 24, date.
      var block = function () {
        t = inkSpan(j.title);
        d = (j.dek && getComputedStyle(j.dek).display !== 'none') ? inkSpan(j.dek) : null;
        m = (j.meta && j.meta !== j.date && getComputedStyle(j.meta).display !== 'none') ? inkSpan(j.meta) : null;
        dt = (j.date && getComputedStyle(j.date).display !== 'none') ? inkSpan(j.date) : null;
        if (!t) return null;
        return t.ink + (d ? TITLE_DEK_GAP + d.ink : 0) + (m ? TITLE_DEK_GAP + m.ink : 0) + (dt ? TITLE_DEK_GAP + dt.ink : 0);
      };
      var span = pb.height;
      var total = block();
      if (total === null) return;
      // AND WHERE THE WORDS OUTRUN THE PICTURE, THE TITLE YIELDS: its
      // lines (the poster's .title-line spans, or the title itself)
      // step down together by the share of their ink the block is
      // over, until it fits. The panel fitter re-fills the title every
      // pass, so the step-down is paid fresh rather than compounding.
      if (total > span) {
        var lns = j.title.querySelectorAll('.title-line');
        var targets = lns.length ? [].slice.call(lns) : [j.title];
        var guard = 12;
        while (total > span + 0.25 && guard-- > 0 && t && t.ink > 0) {
          var ratio = Math.max(0.6, (t.ink - (total - span)) / t.ink);
          targets.forEach(function (el) {
            var sz = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize) || 0;
            if (sz) el.style.fontSize = (sz * ratio).toFixed(2) + 'px';
          });
          total = block();
          if (total === null) return;
        }
      }
      if (!t) return;
      // THE COURIER PINS 24 INSIDE THE PICTURE'S HEIGHT — the author's
      // cap ink 24 under the card's top, OPEN PREVIEW's baseline 24
      // above its foot — and the title and dek centre in the band the
      // two leave between them (each 24 clear of its courier). The
      // stack used to centre as a whole, which put the courier anywhere
      // from 17 to 176 off the edge depending on the title's length.
      // ADDED TO THE SEAT ALREADY HELD, not written over it: the ink is
      // read where it prints, offset included, so each correction is a
      // difference.
      var PIN = 24;
      var bandTop = pb.top + PIN, bandBot = pb.bottom - PIN;
      if (m) {
        j.meta.style.position = 'relative';
        j.meta.style.top = ((parseFloat(j.meta.style.top) || 0) + (bandTop - m.top)).toFixed(2) + 'px';
        bandTop += m.ink + TITLE_DEK_GAP;
      }
      if (dt) bandBot -= dt.ink + TITLE_DEK_GAP;
      // The middle — title and dek — shrunk to the band if it overruns.
      var mid = function () {
        t = inkSpan(j.title);
        d = (j.dek && getComputedStyle(j.dek).display !== 'none') ? inkSpan(j.dek) : null;
        return t ? t.ink + (d ? TITLE_DEK_GAP + d.ink : 0) : null;
      };
      var room = bandBot - bandTop;
      var midH = mid();
      if (midH === null) return;
      if (midH > room) {
        var lns2 = j.title.querySelectorAll('.title-line');
        var targets2 = lns2.length ? [].slice.call(lns2) : [j.title];
        var guard2 = 12;
        while (midH > room + 0.25 && guard2-- > 0 && t && t.ink > 0) {
          var ratio2 = Math.max(0.6, (t.ink - (midH - room)) / t.ink);
          targets2.forEach(function (el) {
            var sz = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize) || 0;
            if (sz) el.style.fontSize = (sz * ratio2).toFixed(2) + 'px';
          });
          midH = mid();
          if (midH === null) return;
        }
      }
      if (!t) return;
      var cap = bandTop + Math.max(0, (room - midH) / 2);
      j.title.style.position = 'relative';
      j.title.style.top = ((parseFloat(j.title.style.top) || 0) + (cap - t.top)).toFixed(2) + 'px';
      cap += t.ink;
      if (d) {
        cap += TITLE_DEK_GAP;
        j.dek.style.position = 'relative';
        j.dek.style.top = ((parseFloat(j.dek.style.top) || 0) + (cap - d.top)).toFixed(2) + 'px';
      }
      // OPEN PREVIEW last, off a FRESH read: it stands in flow under the
      // title, so the title's shrink above moved it, and an ink span
      // carries no bottom of its own (top + ink).
      // Pinned by its BASELINE (the brackets hang 1.7 under it), the
      // same line the plate's READ ON is pinned by.
      if (dt) {
        var base = baselineOf(j.date, false);
        if (isFinite(base)) {
          j.date.style.position = 'relative';
          j.date.style.top = ((parseFloat(j.date.style.top) || 0) + ((pb.bottom - PIN) - base)).toFixed(2) + 'px';
        }
      }
    });
  }

  // The size solvers must see the CSS seats, not the ones the last pass
  // measured onto them — the postscript's are not reset anywhere else.
  function resetMatterInk() {
    [].forEach.call(document.querySelectorAll(
      '.latest-cell--ps .latest-title, .latest-cell--ps .latest-dek,' +
      '.duo-half--mega .card-title, .duo-half--mega .panel-col--left .card-dek,' +
      '.latest-cell--contra .latest-title, .latest-cell--contra .latest-dek,' +
      '.cover-meta'), function (el) {
      el.style.marginTop = '';
      el.style.marginBottom = '';
      el.style.top = '';
    });
  }

  // SHARE OPENS ON THE BODY TEXT. Likes hold the cell's right end, so
  // the other half of the pair takes the text column's own left edge —
  // the seat directly under the courier row that now stands empty
  // there. Where the words run down the left (the plain hero, the
  // mirrored postscript) that is the cell's own margin and nothing
  // moves; where the picture leads, share crosses the cover to open on
  // the words instead of floating over the photograph. Padding, not a
  // left: the right end stays exactly where the likes hold it.
  // Measured, not modelled — the columns are seated by flex bases and
  // vw calcs no constant here could track.
  function fitShareSeat() {
    [].forEach.call(document.querySelectorAll('.hover-meta'), function (meta) {
      meta.style.paddingLeft = '';
      var cell = meta.closest('.duo-half--mega, .latest-cell');
      if (!cell) return;
      var col = cell.querySelector('.panel-col--left') || cell.querySelector('.latest-col');
      if (!col) return;
      // The column's INK, not its box: the hero's title column carries
      // 24 of its own padding, and share belongs on the letters.
      var pad = parseFloat(getComputedStyle(col).paddingLeft) || 0;
      var inset = col.getBoundingClientRect().left + pad - meta.getBoundingClientRect().left;
      if (inset > 1) meta.style.paddingLeft = inset.toFixed(2) + 'px';
    });
  }

  function alignBands() {
    // (The head band's glyph seats are retired: the wordmark's ink
    // runs edge to edge now, so a line seated on its T would open on
    // the page's own edge. The band spreads its three items on the
    // page's 48s instead — see THE OPENING IS CHARCOAL in style.css.)
    alignBandTo(
      document.querySelector('.dek-band--foot'),
      document.querySelector('.reprint-name'),
      [
        { item: 0, char: 'T', edge: 'left-bottom', align: 'left' },
        { item: 1, char: 'N', edge: 'left-bottom', align: 'left' },
        // Email takes the W's bottom-right vertex; Instagram centres
        // its ink EXACTLY BETWEEN Substack's end and Email's start.
        { item: 3, char: 'W', edge: 'right-bottom', align: 'right' },
        { item: 2, between: [1, 3] },
        // AND THE COPYRIGHT READS LEFT, off the C of CRITIC — the head
        // band's third entry exactly, mirrored at the foot. It closed
        // the band's right end before, the one line down here that was
        // set to an edge rather than to a letter.
        { item: 4, char: 'C', edge: 'left-full', align: 'left' }
      ]);
    // The SUBSCRIBE band's line opens on the S of the word above it —
    // the same glyph seat the head band's items take, read off the
    // tracked letter's own box.
    [].forEach.call(document.querySelectorAll('.page-banner'), function(b){
      alignBandTo(b.querySelector('.dek-band--banner'), b.querySelector('.banner-name'),
        [{ item: 0, char: 'S', edge: 'left-full', align: 'left' }]);
    });
  }

  // EVERY STEP ON ITS OWN FOOTING. A pass is a dozen measured fits in
  // sequence, and an exception in any one of them used to end the
  // pass there — everything after it kept whatever an earlier pass
  // had left, which reads as seats that are right on one machine and
  // a line off on another, depending on which pass got furthest. Each
  // step is guarded; what fails is recorded (fitErrors, printed by the
  // ?diag readout) and the pass goes on.
  var fitErrors = [];
  // Named on the window so a step that threw can be read from outside
  // without ?diag (which needs a hero's own rows to render at all).
  try { window.fitErrors = fitErrors; } catch (e) {}
  // Each step's cost is kept beside its errors (window.fitTimes), so
  // a slow pass can be read from outside without a profiler.
  var fitTimes = [];
  try { window.fitTimes = fitTimes; } catch (e) {}
  function step(name, fn) {
    var t0 = performance.now();
    try { fn(); } catch (e) {
      fitErrors.push(name + ': ' + (e && e.message ? e.message : e));
    }
    fitTimes.push([name, Math.round(performance.now() - t0)]);
  }
  // EVERY MEASURE IS TAKEN WITH THE PAGE AT REST. A card that stands
  // OPEN when a pass runs — the faces landing late, a resize, a
  // back/forward restore, a Preview clicked before load — has its
  // picture where its words were and its words where the picture was,
  // and every seat read off those travelled boxes (the preview
  // control's corner above all) came out mid-picture and STAYED there
  // after the card shut. So the open cards are shut for the pass and
  // handed back at the end of it, with every transition inside them
  // stood down (.fit-still) so the page never sees the shut or the
  // re-open.
  function atRest(fn) {
    var cards = [].slice.call(document.querySelectorAll(
      '.latest-cell--ps, .latest-cell--contra, .duo-half--mega'));
    var opened = cards.filter(function (el) { return el.classList.contains('is-open'); });
    // Nothing in a card moves for the length of the pass, and the open
    // ones are shut for it.
    cards.forEach(function (el) { el.classList.add('fit-still'); });
    opened.forEach(function (el) { el.classList.remove('is-open'); });
    // AND EVERY TRAVEL ALREADY IN FLIGHT IS CANCELLED — the shut card's
    // picture on its way home as much as the open one's on its way
    // out. Standing the transitions down stops new ones starting, but
    // one already running keeps handing back its travelled value for
    // as long as it lives, and a tab whose clock is throttled (the
    // reader is in another window) never lets it die: that is a
    // picture measured mid-flight, and a seat written off it stands
    // wrong for good. Cancelled, every box falls back at once to the
    // rest the stylesheet states.
    cards.forEach(function (el) {
      if (!el.getAnimations) return;
      try { el.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); }); } catch (e) {}
    });
    try {
      fn();
    } finally {
      opened.forEach(function (el) { el.classList.add('is-open'); });
      void document.body.offsetHeight;
      cards.forEach(function (el) { el.classList.remove('fit-still'); });
    }
  }
  function fitAll() {
    fitErrors.length = 0;
    fitTimes.length = 0;
    atRest(function () {
    // NOTHING ANIMATES WHILE THE FIT MEASURES. The review's picture
    // column carries a .4s height transition for the open card, and
    // the row cap (fitRowHeights) sets --sq-rest on it every pass — so
    // every seat read after the cap was reading a square still on
    // its way to the height just stated, and the review's words came
    // out a pixel or two off their seats, differently each pass. The
    // transition stands down for the pass and is handed back after a
    // forced layout, so the new height lands whole and instantly.
    var frozen = [].slice.call(document.querySelectorAll('.latest-cover-col--square'));
    frozen.forEach(function (el) { el.style.transition = 'none'; });
    try {
      fitAllSteps();
    } finally {
      frozen.forEach(function (el) { void el.offsetHeight; el.style.transition = ''; });
    }
    });
  }
  function fitAllSteps() {
    // The columns' 24 step into their blocks (fitTitleHalo) is a
    // transform the rest of the pass must not measure: cleared first,
    // written last, so every seat is taken off the untransformed box
    // and the step never compounds from pass to pass.
    step('clearTitleStep', function () {
      [].forEach.call(document.querySelectorAll('.latest-cell--ps, .latest-cell--contra, .duo-half--mega'), function (h) {
        h.style.removeProperty('--hl-dx'); h.style.removeProperty('--hl-dy');
      });
    });
    step('resetMatterInk', resetMatterInk);
    step('inkCenterBands', inkCenterBands);
    step('alignBands', alignBands);
    step('fitMastheadFill', fitMastheadFill);
    step('fitBands', fitBands);
    step('fitGroundStops', fitGroundStops);
    step('fitSubscribeName', fitSubscribeName);
    // Before the cap: the gap changes how tall a review's words stand,
    // and the cap is what pays for it out of the picture.
    step('fitContraGap', fitContraGap);
    step('fitRowHeights', fitRowHeights);
    // (fitContraJoin, fitContraFill, fitRevFlip and fitCurtainVars are
    //  GONE with the curtain — each measured a state the page no longer
    //  has. Git holds them against a change of mind.)
    step('fitCourierSpan', fitCourierSpan);
    step('fitShareSeat', fitShareSeat);
    step('fitHeroLink', fitHeroLink); // before the panels: the hero panel pins to the fitted link
    step('fitContraLead', fitContraLead); // before too: the lead's height moves every row below it
    // Re-queried every pass, not captured once: the ticker clones its whole
    // strip after this script runs (essay-ticker.js), so a NodeList taken at
    // load would leave every cloned berth's panel unfitted — its title stuck
    // at the CSS size while the original's filled its box.
    step('fitSlideSlots', fitSlideSlots);
    step('panels', function () { [].forEach.call(document.querySelectorAll('.duo-panel'), fit); });
    step('fitLatestTitle', fitLatestTitle);
    step('fitCourierDots', fitCourierDots);
    step('fitMatterInk', function () { fitMatterInk('seat'); });
    // The slots are re-seated after the titles are cut: a review's band
    // is the slack its square leaves, and the square is sized by the row
    // cap, which the cut can still move.
    step('fitSlideSlots#2', fitSlideSlots);
    step('cutPlates#2', cutPlates);
    step('fitCourierDots#2', fitCourierDots);
    step('centreBodyText', centreBodyText);
    step('fitTitleHalo', fitTitleHalo);
    // Every fit pass can move document seats (fonts, images, fitted
    // titles) — announce it so rail-fix re-measures its anchors and
    // rebuilds the held clones on the FINAL geometry, not the first
    // paint's (stale anchors made the held couriers jump at the
    // lock-in).
    try { window.dispatchEvent(new Event('newcritic:fit')); } catch (e) {}
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
  // AND ON EVERY FONT THAT LANDS LATER: fonts.ready resolves once the
  // faces in use at that moment are in, and a face first used after it
  // (the wordmark's Placard on a cold cache) arrives with no refit —
  // every seat read off canvas metrics was then read off the fallback.
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { fitAll(); });
  window.addEventListener('load', fitAll);
  // A CARD SHUTTING RE-SEATS ITS OWN CONTROL (card-open.js fires it).
  // Any seat left stale by a layout that moved after the last pass — a
  // picture landing late, a row turning over — is corrected the moment
  // the reader shuts the card, which is the one point where the page
  // is certainly back at rest. The wait is the card's own .4s travel.
  window.addEventListener('newcritic:closed', function () {
    setTimeout(function () { atRest(function () { step('fitTitleHalo#close', fitTitleHalo); }); }, 450);
  });
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 100);
  });
  // A back/forward restore brings the page back exactly as it was left —
  // every panel fitted for the window the reader LEFT at, with no load or
  // resize event to correct it. The archive deep links make homepage →
  // archive → back a routine round trip, and a window that changed size
  // (or zoom) while away restores half-empty boxes with paragraphs stuck
  // hidden. Refit on the restore itself.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) fitAll();
  });

  // ?diag — A READOUT ON THE PAGE, for a browser I cannot see into.
  // Opens with `?diag` in the address and nowhere else: a small box in
  // the corner printing the seats the essays covers actually hold in
  // THIS browser — the frame's height, where the picture's top sits
  // against its head line, the kicker row's position and inline top,
  // the kicker's ink against the picture's top edge — so a screenshot
  // of it says what DevTools would. Temporary; strike it when the
  // question is answered.
  if (/[?&]diag\b/.test(location.search)) {
    var diagBox = null;
    var diag = function () {
      // THE COVER IN FRONT OF THE READER: the hero whose picture is
      // nearest the middle of the screen — so a screenshot measures
      // the very cover that looks wrong, not a cover elsewhere.
      var mid = window.innerHeight / 2, best = null, bestD = Infinity;
      [].forEach.call(document.querySelectorAll('.card--mega .duo-half--mega'), function (h) {
        var pc = h.querySelector('.duo-card-image'); if (!pc) return;
        var r = pc.getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { bestD = d; best = h; }
      });
      var half = best;
      if (!half) return;
      var pic = half.querySelector('.duo-card-image'), head = half.querySelector('.mega-cover-head');
      var row = half.querySelector('.latest-courier--cover'), k = half.querySelector('.cover-kicker');
      var img = pic && pic.querySelector('img.card-image');
      if (!pic || !head || !row || !k) return;
      var p = pic.getBoundingClientRect(), hd = head.getBoundingClientRect(), kr = k.getBoundingClientRect();
      var card = half.closest('.card');
      var pcs = getComputedStyle(pic);
      // The fitter's own reading of the words' three distances, cap to
      // baseline: courier baseline to title cap, title baseline to dek
      // cap, dek baseline to billing cap.
      window.__inkSpan = inkSpan;
      var airsOf = function (host) {
        try {
          var hh = host.querySelector('.latest-courier--cover'), ff = host.querySelector('.cover-under');
          var tt = host.querySelector('.card-title, .latest-title'), dd = host.querySelector('.panel-col--left .card-dek, .latest-dek');
          var H = inkSpan(hh), F = inkSpan(ff), T = inkSpan(tt), D = dd ? inkSpan(dd) : null;
          if (!H || !F || !T) return '-';
          return 'above ' + (T.top - H.bot).toFixed(1) + '  title-dek ' + (D ? (D.top - T.bot).toFixed(1) : '-') + '  below ' + (F.top - (D ? D.bot : T.bot)).toFixed(1);
        } catch (e) { return 'err ' + e.message; }
      };
      var lines = [
        'HERO NEAREST THE MIDDLE OF THE SCREEN',
        'card ' + ([].indexOf.call(document.querySelectorAll('.card'), card) + 1) + (card.classList.contains('card--mega-rev') ? ' (mirrored)' : ' (plain)') + '  title "' + (half.querySelector('.card-title') ? half.querySelector('.card-title').textContent.trim().slice(0, 24) : '') + '"',
        'frame position ' + pcs.position + '  top ' + pcs.top + '  bottom ' + pcs.bottom,
        'viewport ' + window.innerWidth + ' x ' + window.innerHeight,
        'frame height ' + p.height.toFixed(1) + '  (css inset ' + pcs.inset + ')',
        'frame top vs half top ' + (p.top - half.getBoundingClientRect().top).toFixed(1) + '   head box top vs half top ' + (hd.top - half.getBoundingClientRect().top).toFixed(1),
        'img height ' + (img ? img.getBoundingClientRect().height.toFixed(1) : '-'),
        'picture top vs head line ' + (p.top - hd.top).toFixed(1),
        'row position ' + getComputedStyle(row).position + ', inline top "' + (row.style.top || '') + '"',
        'kicker top vs picture top ' + (kr.top - p.top).toFixed(1),
        'under row position ' + (half.querySelector('.cover-under') ? getComputedStyle(half.querySelector('.cover-under')).position : '-'),
        'scrollY ' + Math.round(window.scrollY) + '  fonts ' + (document.fonts && document.fonts.status),
        'airs (ink) ' + airsOf(half),
        'fit errors ' + (fitErrors.length ? fitErrors.join(' | ') : 'none'),
        'ua ' + navigator.userAgent.replace(/^.*\) /, '').slice(0, 60)
      ];
      var ps = document.querySelector('.latest-cell--ps');
      var co = document.querySelector('.latest-cell--contra');
      if (co) lines.push('', 'FIRST REVIEW  airs (ink) ' + airsOf(co));
      if (ps) {
        lines.push('', 'FIRST POSTSCRIPT  airs (ink) ' + airsOf(ps));
        var pp = ps.querySelector('.latest-cover'), pc = ps.querySelector('.latest-cover-col'), pr = ps.querySelector('.latest-courier--cover'), pk = ps.querySelector('.cover-kicker');
        if (pp && pc && pr && pk) {
          var ppr = pp.getBoundingClientRect();
          lines.push('', 'FIRST POSTSCRIPT COVER',
            'frame height ' + ppr.height.toFixed(1) + '  top vs column ' + (ppr.top - pc.getBoundingClientRect().top).toFixed(1),
            'row position ' + getComputedStyle(pr).position + ', inline top "' + (pr.style.top || '') + '"',
            'kicker top vs picture top ' + (pk.getBoundingClientRect().top - ppr.top).toFixed(1));
        }
      }
      if (!diagBox) {
        diagBox = document.createElement('pre');
        diagBox.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;margin:0;padding:10px 12px;' +
          'background:#fff;color:#000;font:12px/1.5 Menlo,Courier,monospace;border:2px solid #000;white-space:pre;';
        document.body.appendChild(diagBox);
      }
      diagBox.textContent = lines.join('\n');
    };
    window.addEventListener('load', function () { setTimeout(diag, 1500); });
    window.addEventListener('resize', function () { setTimeout(diag, 300); });
    setInterval(diag, 2000);
  }
})();
