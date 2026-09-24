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
  // A page with no hero panel but with cells of its own (About's one
  // contra cell) still needs the passes that size and seat them.
  if (!document.querySelector('.duo-panel, .latest-cell')) return;
  // the title column's words, copied before any pass touches the
  // title or the dek (THE PICTURE SITS IN THE BOX, below)
  buildSwapCols();

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
    // a review's chip stands absolute in the band (style.css, THE
    // REVIEW'S PLATE), taking no row
    if (cs.position === 'absolute') return 0;
    return t.getBoundingClientRect().height
      + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }

  // THE PLATE'S CLOSING LINE (build.js, .plate-more — CLOSE PREVIEW): the
  // same box, taken off the bottom before the rows are counted.
  function moreBlockOf(scope) {
    var t = scope && scope.querySelector && scope.querySelector('.plate-more');
    if (!t || getComputedStyle(t).display === 'none') return 0;
    var cs = getComputedStyle(t);
    if (cs.position === 'absolute') return 0;
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
  // EVERY PREVIEW CLOSES ON AN ELLIPSIS, whatever the cut did. The
  // preview is itself a cut of the post, so a block whose paragraphs
  // all fit still owes one (the latest plates' cut says the same —
  // see cutPlates). The last text node's trailing stop trades for the
  // mark; if the mark then wraps out of the box, truncateToWord backs
  // off a word and sets its own.
  function ensureEllipsis(el) {
    var nodes = [];
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = w.nextNode())) {
      if (!n.textContent.trim()) continue;
      if (n.parentElement && n.parentElement.closest('.card-dek')) continue;
      nodes.push(n);
    }
    var last = nodes[nodes.length - 1];
    if (!last || /\u2026\s*$/.test(last.textContent)) return;
    last.textContent = last.textContent.replace(TRAIL_PUNCT, '') + '\u2026';
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) truncateToWord(el);
  }
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
  // THE POSTER TITLES' CEILING (2026-09-17): 72, down from the 84 the
  // stacked cells and the hero capped at — a seventh smaller.
  var TITLE_MAX = 72;
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
  // CSS TRACKING IS NOT IN THE CANVAS'S MEASURE (2026-09-18). measureText
  // answers the advance of the glyphs and nothing else; the layout adds
  // the element's letter-spacing after EVERY character, the last one
  // included. The card titles took 0.045em this morning, and nine letters
  // of Voluntary are 12px the line was set wider than the size it was
  // fitted for — the y's tail hanging over the picture's edge, which is
  // how it was caught. Every width measured here is paid that tracking
  // per character now.
  // Read as a RATIO of the element's own size: the sheet states it in em,
  // so the ratio holds at whatever size the fitter is trying, and a
  // tracking stated in px converts at the size it was read at. 'normal'
  // is 0.
  function trackEm(cs) {
    var ls = parseFloat(cs.letterSpacing);
    if (!ls) return 0;
    var size = parseFloat(cs.fontSize) || 0;
    return size ? ls / size : 0;
  }
  function longestWordWidth(title, fontPx) {
    var cs = getComputedStyle(title);
    measureCtx.font = cs.fontWeight + ' ' + fontPx + 'px ' + cs.fontFamily;
    var track = trackEm(cs) * fontPx;
    var hyphenW = measureCtx.measureText('\u2010').width + track;
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
        var ww = measureCtx.measureText(frag).width + track * frag.length
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
    // LESS THE ELEMENT'S OWN SIDE PADDING (2026-09-17): the deks carry
    // 48 on their far side now (style.css, THE DEK'S FAR MARGIN), and
    // a line fitted to the column's full width would print into it.
    var own = getComputedStyle(title);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      - (parseFloat(own.paddingLeft) || 0) - (parseFloat(own.paddingRight) || 0);
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
    var track100 = trackEm(cs) * 100;
    var w100 = function(s){ return measureCtx.measureText(s).width + track100 * s.length; };

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
    // (a hero's box: the column's width less the 54 either side of the
    // words — THE BOX IS THE INSET SHAPE AND THE WORDS FILL IT)
    var availW = titleColWidth(title) - (title.closest('.duo-half--mega') ? 2 * REST_FAR : 0);
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
      // THE CEILING COMES DOWN TO 72 (2026-09-17): the 84 less a
      // seventh, the page's own unit — on every poster title, the
      // stacked cells' and the hero's alike.
      maxSize: poster ? TITLE_MAX : 0,
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
        // AND NEVER PAST THE CEILING (TITLE_MAX, 72 since 2026-09-17;
        // the house 84 before): this fill to the column's ink width
        // ran the poster to 140.
        inkS = Math.min(inkS, TITLE_MAX);
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
    var availW = titleColWidth(dek) - (dek.closest('.duo-half--mega') ? 2 * REST_FAR : 0);
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
    if (block0 && block0.__fullHTML) restorePlateHTML(block0);
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
          // (The 48 that used to stand in for the foot here is the
          // block's own bottom pad now — CLOSE PREVIEW pins 24 above
          // the foot and its block is already taken off the budget,
          // so the 48 on top of it cost the hero a row and left the
          // difference as dead air over the closing line.)
          if (el.closest('.duo-half--mega')) {
            var mgFoot = el.getBoundingClientRect().bottom
              - (parseFloat(getComputedStyle(el).paddingBottom) || 0);
            var mgHead = el.getBoundingClientRect().top
              + (parseFloat(getComputedStyle(el).paddingTop) || 0);
            var inkBudget = mgFoot - mgHead - titleBlockOf(el) - moreBlockOf(el);
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
                // …or the card's own g where seatPlateMargins has stated
                // one (2026-09-21), the two courier lines seated 2g off
                // the body first so the budget below reads them.
                plateInner(el);
                var mgFoot = el.__g ? Math.max(0, (REST_INSET - (moreBlockOf(el) ? oneLine(el.querySelector('.plate-more')) : 18.2)) / 2) : 48;
                var mgInkAvail = el.clientHeight - (parseFloat(mgCs.paddingTop) || 0) - mgFoot - titleBlockOf(el) - moreBlockOf(el);
                if (mgInkAvail > 0) mgAvail = mgInkAvail;
                // Persist the deeper floor into the block's own pad:
                // the row CUT earlier in fit() reads it, so the next
                // pass (fonts/load always re-run fitAll) seats the
                // full extra rows instead of stretch-capping.
                if (Math.abs(mgFoot - (parseFloat(mgCs.paddingBottom) || 0)) > 0.5) {
                  el.style.paddingBottom = mgFoot + 'px';
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
            // AND IT CLOSES ON THE … IT OWES, whatever the cut did.
            ensureEllipsis(colsEl);
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
        // EVERY PREVIEW CLOSES ON AN ELLIPSIS, whatever the cut did. The
        // preview is itself a cut of the post, so a block whose
        // paragraphs all fit, or whose cut fell clean between two,
        // still owes one. Sealed ON THE CLONE like the boundary cut
        // above — the trailing stop trades for the mark, and if the
        // mark wraps a fresh line a word backs off — then transplanted.
        var scRealParas = [].slice.call(el.querySelectorAll('.card-preview'));
        var scSeal = function (idx) {
          var cp = scCloneParas[idx], rp = scRealParas[idx];
          if (!cp || !rp) return;
          var tn0 = lastTextNode(cp);
          if (!tn0 || /\u2026\s*$/.test(tn0.textContent)) return;
          if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
          var lines0 = Math.round(cp.offsetHeight / scLh);
          var g = 60;
          while (g-- > 0) {
            var tn = lastTextNode(cp);
            if (!tn) break;
            tn.textContent = tn.textContent.replace(TRAIL_PUNCT, '') + '\u2026';
            if (Math.round(cp.offsetHeight / scLh) <= lines0) break;
            tn.textContent = tn.textContent.slice(0, -1);
            if (!popLastWord(cp)) break;
          }
          rp.innerHTML = cp.innerHTML;
        };
        if (scBoundary === -1) {
          // Everything fits — natural render, floor stays a minimum.
          scSeal(scCloneParas.length - 1);
          scClone.parentNode.removeChild(scClone);
        } else {
          if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
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
          // Paragraphs past the cut go dark. (A clean paragraph-boundary
          // cut used to keep its complete last paragraph with no
          // ellipsis; it is sealed with one now, like every other.)
          var scHideFrom = scFitLines >= 1 ? scBoundary + 1 : scBoundary;
          for (var ph = scHideFrom; ph < scRealParas.length; ph++) {
            scRealParas[ph].style.display = 'none';
          }
          if (scHideFrom > 0) scSeal(scHideFrom - 1);
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
      // THE WORDS ARE ASKED, NOT THE BOX'S SCROLL (2026-09-21). This read
      // scrollHeight against clientHeight, and scrollHeight counts every
      // box the title owns — the mark included. Under the hand a title
      // and its dek square off into one rectangle (.hl-rect::before),
      // an absolute pseudo on the TITLE that reaches down over the dek:
      // a hundred pixels of yellow past the title's foot, read here as a
      // hundred pixels of overflowing text. So a pass that ran while the
      // pointer rested on the card — 338 against 238 on the hero —
      // called for a cut; truncateToWord, which judges each word by its
      // own box, rightly found nothing to remove, and joined the
      // ellipsis on regardless: MrBeast, Slop Auteur… with every word
      // still there. It was always possible (a resize under the hand)
      // and became likely the day the page began fitting its second
      // stage half a second after it appears, which is when a hand
      // arrives. A range over the contents is the words and their
      // inline boxes and no pseudo of anyone's, so it answers the
      // question this line was asking.
      var trg = document.createRange();
      trg.selectNodeContents(title);
      var tbox = title.getBoundingClientRect();
      var textFoot = trg.getBoundingClientRect().bottom;
      var boxFoot = tbox.top + title.clientTop + title.clientHeight;
      if (textFoot - boxFoot > titleLh / 2) truncateToWord(title);
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
    // (the box's inner width: the matter's less the 54 either side of
    // the words — THE BOX IS THE INSET SHAPE AND THE WORDS FILL IT)
    var availW = matter.clientWidth - 2 * REST_FAR;
    // THE WORDS LEAVE ROOM FOR THE FRAME (2026-09-22): the longest
    // line stands on the picture's edge, the box ends 54 past it and
    // the charcoal frame 54 past that, and all of it inside the card —
    // so neither the title nor the dek may be wider than the card's
    // room past the picture less the two 54s.
    var cov = cell.querySelector('.latest-cover');
    if (dek) dek.style.maxWidth = '';
    if (cov) {
      var pr0 = restRect(cov), kr0 = cell.getBoundingClientRect();
      var room = (pr0.left + pr0.right) / 2 < (kr0.left + kr0.right) / 2
        ? kr0.right - pr0.right : pr0.left - kr0.left;
      // (the box: REST_OVERLAP over the picture to REST_FAR short of the
      // card's edge; the words REST_FAR inside it either side)
      var roomW = room + REST_OVERLAP - 3 * REST_FAR;
      if (roomW > 0) {
        // (the box is the picture's 72 plus the room less the frame's
        // 72 — the room itself — and the words keep 72 from either side
        // of it: roomW, not the padded column's width less 144)
        availW = roomW;
        if (dek) dek.style.maxWidth = roomW.toFixed(2) + 'px';
      }
    }
    var maxH = matter.clientHeight
      - (dek ? dek.getBoundingClientRect().height + 24 : 0);
    var opts = {
      maxLines: 3,
      preferMostLines: true,
      lineMax: availW * LINE_MAX_PER_PX,
      // Ceilinged at the STACKED CELLS' own 84 (the house poster
      // cap): the hero-scale ceiling read too big at row width —
      // a short title (Present at the Creation) fills to it, the
      // long ones (Jasmine's) stay bound by their own words. (72
      // since 2026-09-17, with every poster title — TITLE_MAX.)
      maxSize: TITLE_MAX,
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
  // THE PLATE'S TEXT BACK, THE CURTAIN'S SEAT KEPT (2026-09-22): the
  // full text is restored from the markup saved on the first pass, and
  // that markup carries the curtain's inline style AS IT STOOD THEN —
  // the sides seatPlateMargins wrote since were thrown away with it, and
  // every lower postscript kept its first pass's pads. The curtain's
  // style now crosses the restore.
  function restorePlateHTML(pl) {
    var cu0 = pl.querySelector('.plate-curtain');
    var st = cu0 ? cu0.getAttribute('style') : null;
    pl.innerHTML = pl.__fullHTML;
    var cu1 = pl.querySelector('.plate-curtain');
    if (cu1) { if (st != null) cu1.setAttribute('style', st); else cu1.removeAttribute('style'); }
  }
  // THE PLATES ARE NOT SHOWN (2026-09-22): the preview reads in the
  // body's column now (.swap-body, seatSwapCols), and the plates stand
  // out of layout (style.css, ONLY THE INK TAKES THE HAND, and THE
  // FRAME SLIDES OVER THE TITLE COLUMN). Their cutting and seating —
  // the most expensive passes on the page — stand down with them.
  var PLATES_SHOWN = false;
  function cutPlates() {
    if (!PLATES_SHOWN) return;
    // The plates cut on a CLEAN LINE and END ON AN ELLIPSIS, hero-
    // fashion: whatever sub-row remainder the cover's height leaves
    // under the last full row folds into the bottom padding (so the
    // open text never shears mid-glyph), and the paragraph straddling
    // the floor is trimmed to its last fitting word with the … the
    // cut owes.
    [].forEach.call(document.querySelectorAll('.card--latest .latest-plate'), function(pl){
      if (!pl.__fullHTML) pl.__fullHTML = pl.innerHTML;
      else restorePlateHTML(pl);
      plateInner(pl);
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
      // THE GAP THE CUT CHOSE (2026-09-17): one slot between paragraphs,
      // unless the straddling paragraph's first line was refused only
      // because its own blank line took the last row — then every gap
      // on the plate is pulled in evenly by the one row it needs, and
      // the line comes in with the … (a bare … on a line of its own,
      // overflowing the plate, is what stood there). seatPlateAir reads
      // it back rather than resetting the gaps to the slot.
      pl.__gap = null;
      var allP = [].slice.call(pl.querySelectorAll('.latest-plate-p'));
      allP.forEach(function(p){
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
        // THE … HANGS (2026-09-17): it is set in a mark of no width
        // at the end of the cut, so it costs the line nothing and the
        // cut keeps every word the line holds on its own — the mark
        // was taking a word's room and the last word wrapped away.
        var setCut = function (n) {
          // The cut's last word gives up its trailing point or comma
          // to the mark ("below." reads "below…", not "below.…").
          p.textContent = words.slice(0, n).join(' ').replace(/[.,;:\s]+$/, '');
          var mark = document.createElement('span');
          mark.className = 'cut-mark';
          mark.textContent = '…';
          p.appendChild(mark);
        };
        // The whole paragraph is tried too: a short one that straddled
        // only by its blank line fits whole once the gaps are pulled in.
        var probe = function () {
          var lo = 0, hi = words.length;
          while (lo < hi) {
            var mid = (lo + hi + 1) >> 1;
            setCut(mid);
            if (p.getBoundingClientRect().bottom > floorLine) hi = mid - 1;
            else lo = mid;
          }
          return lo;
        };
        var lo = probe();
        if (!lo) {
          // No word fits: the gaps before it give up one row between
          // them and the search runs again on the row freed.
          var before = allP.slice(0, allP.indexOf(p)).filter(function (q) { return q.style.display !== 'none'; });
          var G = before.length;
          if (G >= 1) {
            var gap = Math.max(0, unit - unit / G);
            pl.__gap = gap;
            allP.forEach(function (q, i) { if (i) q.style.marginTop = gap.toFixed(3) + 'px'; });
            lo = probe();
          }
          if (!lo) { p.style.display = 'none'; cutDone = true; return; }
        }
        setCut(lo);
        // THE LINE IS CENTRED WITH ITS MARK: where the line has room
        // for the … the mark takes its own width and the line centres
        // on words and mark together; only a line filled to the
        // measure keeps it hanging past the edge.
        var mk = p.querySelector('.cut-mark');
        if (mk) {
          var h0 = p.getBoundingClientRect().height;
          mk.classList.add('is-set');
          if (p.getBoundingClientRect().height > h0 + 1) mk.classList.remove('is-set');
        }
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
  // A BAND ON A SCREEN'S EDGE LOSES THE RULE ON THAT EDGE (style.css):
  // pinned at the top, no top rule; on the fold's foot, no foot rule.
  // Read off each band's own box, on every scroll and every fit.
  function markBandEdges() {
    var vh = window.innerHeight;
    [].forEach.call(document.querySelectorAll('.section-band'), function (b) {
      var r = b.getBoundingClientRect();
      if (!r.height) return;
      b.classList.toggle('is-at-top', r.top <= 0.5 && r.bottom > 0.5);
      b.classList.toggle('is-at-bottom', Math.abs(r.bottom - vh) <= 0.5);
      // THE BAND'S TOP RULE IS THE WORDMARK'S SEAM, TAKEN OVER. A band
      // rising through the blue shows no top rule (a white line between
      // blue and blue); once it has risen onto the wordmark's charcoal
      // strip its top edge IS the seam the strip's own rule drew, and
      // the band draws it from there up to the pin. Read off what is
      // painted one pixel above the band's edge.
      var overWm = false;
      if (r.top > 1.5 && r.top < vh) {
        var above = document.elementFromPoint(Math.round(r.left + r.width / 2), r.top - 1);
        // The section banners (ESSAYS, POSTSCRIPT, CONTRA) are charcoal
        // strips ruled the same way, and the band takes their seam over
        // exactly as it takes the wordmark's.
        overWm = !!(above && above.closest && above.closest(
          '.topbar-wordmark, .movement > .page-banner:is(.subscribe-band, .events-band, .store-band)'));
      }
      b.classList.toggle('is-under-wordmark', overWm);
    });
    // (The masthead's foot rule no longer waits on a class: the seam
    // under the field is a sticky 1px element of its own, .head-seam,
    // that rides up with the field and pins under the band — the
    // scroll handler ran a frame behind the compositor, and the
    // handoff showed two lines for that frame.)
    // THE REPRINT CARRIES THE BAND'S FOOT RULE UP AS IT OVERTAKES IT:
    // rising over the pinned band from the foot up, its top edge is
    // the seam between the band's blue and its own charcoal, and it
    // draws the line there — moving up with it — until it pins on the
    // screen's top and the band is covered whole, where the line goes.
    var rep = document.querySelector('.page-rows > .reprint');
    var repBand = document.querySelector('.page-rows > .section-band');
    if (rep && repBand) {
      var rr = rep.getBoundingClientRect();
      var bb = repBand.getBoundingClientRect();
      rep.classList.toggle('is-at-top', rr.top <= 0.5 && rr.bottom > 0.5);
      rep.classList.toggle('is-under-band', rr.top > 0.5 && rr.top < bb.bottom - 0.5);
    }
    // NO RULE IS PINNED TO THE TOP OF THE SITE. The OPS banners
    // (SUBSCRIBE, EVENTS, STORE, the closing stack) are sticky too
    // and carry a 1px rule along their top edge; pinned on the
    // viewport's edge that rule would stand on the screen's own
    // line, so the banner drops it there, as the bands do.
    // THE SCREEN'S TOP IS THE PINNED BAND'S FOOT NOW: the band holds
    // through the whole site, so a banner is "at the top" when it
    // stands directly under the band — the closing deck pins there —
    // and drops its top rule against the band's foot rule.
    var pinned = document.querySelector('.page-rows > .section-band');
    var topLine = pinned ? pinned.getBoundingClientRect().bottom : 0;
    [].forEach.call(document.querySelectorAll('.movement > .page-banner'), function (b) {
      var r = b.getBoundingClientRect();
      if (!r.height) return;
      b.classList.toggle('is-at-top', r.top <= topLine + 0.5 && r.bottom > topLine + 0.5);
      // THE BANNER'S TOP RULE IS THE BAND'S FOOT RULE, CARRIED UP. A
      // banner rising over the pinned band covers it from the foot up;
      // the band's foot rule goes under first, so the banner's own top
      // edge draws the seam from there to the pin, where it goes.
      var overBand = false;
      if (r.top > 1.5 && r.top < vh) {
        var aboveB = document.elementFromPoint(Math.round(r.left + r.width / 2), r.top - 1);
        // A blue stack banner is a ruled band too: the word climbing over
      // it carries its rule the same way.
      overBand = !!(aboveB && aboveB.closest && aboveB.closest('.section-band, .stack-band--bw'));
      }
      b.classList.toggle('is-under-band', overBand);
    });
  }
  // THE MARGINS TAKE THE MARK (style.css, THE ESSAYS STAND ON THE MARK).
  // The window's side margins are fixed and cannot know where the marked
  // sections are, so the mark is carried through them by a box in the
  // page. A SPAN runs from halfway up a marked movement's word to halfway
  // down the next movement's — or, where no movement follows, to the
  // page's foot, which takes the mark with it: the essays, ESSAYS to
  // POSTSCRIPT, and the reviews, CONTRA to the colophon. The box runs
  // from the first span's top to the last one's foot, cut to the spans
  // by a mask (--mk-mask); every seat is the band's own top and the
  // --ink-mid fillNameBand stated on it. A band out of layout (the
  // first stage of a fresh visit) leaves everything where it was.
  // Written only where it has moved.
  // THE SAME SPANS SHOW THROUGH THE CORNER BOX. It stands still in the
  // window while the page runs under it, so it carries a sheet of its
  // own (style.css, THE MARK SHOWS THROUGH THE CORNER BOX), cut by the
  // same mask, that the SCROLL moves — a scroll timeline, on the
  // compositor, so the sheet's edge and the ground's cannot part on a
  // fling. It is told where the first span stands against the place it
  // is pinned (--mk-at) and how far the spans run (--mk-h); the sheet
  // travels 1:1 with the scroll. (Where there is no scroll timeline the
  // scroll's own tick moves it, rideSheets, below.)
  var MARK_HOSTS = '.sub-box';
  // (The head band turned whole to the mark's colour while a span stood
  // under the date band, for a night; it keeps its white now, 2026-09-23.)
  // AND THE WORDS THAT WEAR THE MARK UNDER THE HAND — the margin's
  // section names and mode words, the colophon's links — take the
  // page's white instead while a span is under them (.over-mark). The
  // head band's links go with the band.
  var MARK_WORDS = '.marginalia .theme-toggle > span:not(.theme-toggle-sep), .latest-stack,'
    + ' .page-rows > .section-band--colophon a';
  var markSpans = [];
  var markSeats = [];
  var sheetsRide = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll(root block)'));
  function setIf(el, prop, v) { if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v); }
  // THE MARK OPENS 72 OVER THE WORD (2026-09-23): a marked movement's
  // ground starts the page's 72 above its word's caps — the band's own
  // top edge, the word standing in its 72 — rather than at the ink's
  // middle; and the page's white comes back the same way, 72 above the
  // next word's caps. (Each movement at a turn stands 72 further down
  // the page for it: style.css, THE ESSAYS STAND ON THE MARK.)
  var MARK_OVER = 72;
  function inkTopLine(band, r) {
    var t = parseFloat(band.style.getPropertyValue('--ink-top'));
    return isNaN(t) ? r.top : r.top + t - MARK_OVER;
  }
  function seatMarkGutters() {
    var g = document.querySelector('main > .mark-gutters');
    var marked = document.querySelectorAll('.page-rows > .movement.on-mark');
    if (!g || !marked.length) return;
    var main = g.parentElement;
    var mr = main.getBoundingClientRect();
    var sy = window.scrollY;
    // THE LINES STAND ON WHOLE PIXELS OF THE PAGE. Four painters draw
    // each one — the word's band, the margins, the head band's sheet and
    // the box's — and a line at a fraction was rounded four ways: at 1280
    // the band's edge fell a row above the margins' and the box blended
    // across a third. On a whole pixel every edge lands on the same row
    // at any scroll, and the ink's middle moves by half a pixel at most.
    // The band is told its own line again (--mk-line), since its box's
    // top is wherever the page put it.
    var spans = [], lines = [];
    for (var i = 0; i < marked.length; i++) {
      var from = marked[i].querySelector(':scope > .page-banner');
      var next = marked[i].nextElementSibling;
      var to = next && next.classList.contains('movement') ? next.querySelector(':scope > .page-banner') : null;
      var a, b;
      if (from) {
        var fr = from.getBoundingClientRect();
        if (!fr.height) return;
        a = Math.round(inkTopLine(from, fr) + sy);
        lines.push({ band: from, at: a - (fr.top + sy) });
      } else {
        // THE FIRST MOVEMENT HAS NO WORD (2026-09-23): marked, it is
        // marked from its own top — the page's, under the head band
        var mv0 = marked[i].getBoundingClientRect();
        if (!mv0.height) return;
        a = Math.round(mv0.top + sy);
      }
      if (to) {
        var tr = to.getBoundingClientRect();
        if (!tr.height) return;
        b = Math.round(inkTopLine(to, tr) + sy);
        lines.push({ band: to, at: b - (tr.top + sy) });
      } else {
        // a marked last movement runs on through the reprint and ends
        // on the copyright's charcoal band: the colophon under it keeps
        // its own white (2026-09-23), so the margins beside it, the
        // corner box over it and its links under the hand are off the
        // mark there. Main's foot where the page has no seam.
        var seamEnd = main.querySelector('.page-rows > .foot-seam, .page-rows > .section-band--colophon');
        // (rounded UP onto the band, which stands over the margins: rounded
        // to the nearest, the span could stop a fraction short of a band
        // at a fractional top and leave the margins' white showing between
        // them — a hairline over the colophon, 2026-09-23)
        b = seamEnd ? Math.ceil(seamEnd.getBoundingClientRect().top + sy) : Math.ceil(mr.bottom + sy);
      }
      spans.push({ a: a, b: b });
    }
    markSpans = spans;
    var top = spans[0].a, foot = spans[spans.length - 1].b;
    // One mask, from the box's own top: shown over each span, clear
    // between them.
    var stops = [];
    spans.forEach(function (sp, k) {
      var a = (sp.a - top).toFixed(2) + 'px', b = (sp.b - top).toFixed(2) + 'px';
      if (k) stops.push('transparent ' + (spans[k - 1].b - top).toFixed(2) + 'px ' + a);
      stops.push('#000 ' + a + ' ' + b);
    });
    var mask = 'linear-gradient(to bottom, ' + stops.join(', ') + ')';
    var span = Math.max(0, foot - top).toFixed(2) + 'px';
    // Every read before any write: where each host is pinned — a sticky
    // band by its top, the docked box by its foot off the window's floor.
    var vh = document.documentElement.clientHeight;
    // AND HOW FAR IT RIDES THE WINDOW (2026-09-23): the docked box is
    // pinned only until its dock line — the sticky line set in the flow
    // over the foot's seam (subscribe-box.js) — comes up to the window's
    // floor; from there it goes up with the page, and a sheet still
    // moving 1:1 with the scroll ran out of it by every pixel scrolled
    // after, the white stopping partway down the box. So the sheet
    // travels with the scroll for that run (--mk-run) and holds after.
    markSeats = [].map.call(document.querySelectorAll(MARK_HOSTS), function (h) {
      var cs = getComputedStyle(h);
      var pin = cs.position === 'sticky' ? parseFloat(cs.top) : vh - parseFloat(cs.bottom) - h.getBoundingClientRect().height;
      var dock = h.parentElement && h.parentElement.classList.contains('sub-dock') ? h.parentElement : null;
      var line = dock && dock.nextElementSibling;
      var run = line ? Math.max(1, line.getBoundingClientRect().top + sy - vh) : 100000;
      return { h: h, at: top - (pin || 0), run: run };
    });
    markWords();
    lines.forEach(function (l) { setIf(l.band, '--mk-line', l.at.toFixed(2) + 'px'); });
    var mainTop = mr.top + sy;
    setIf(g, 'top', (top - mainTop).toFixed(2) + 'px');
    setIf(g, 'height', span);
    setIf(g, '--mk-mask', mask);
    markSeats.forEach(function (st) {
      setIf(st.h, '--mk-at', st.at.toFixed(2) + 'px');
      setIf(st.h, '--mk-run', st.run.toFixed(2) + 'px');
      setIf(st.h, '--mk-h', span);
      setIf(st.h, '--mk-mask', mask);
    });
    var de = document.documentElement;
    if (!de.classList.contains('has-mark-span')) de.classList.add('has-mark-span');
    if (!sheetsRide) rideSheets();
  }
  function rideSheets() {
    var sy = window.scrollY;
    markSeats.forEach(function (st) { setIf(st.h, '--mk-y', (st.at - Math.min(sy, st.run)).toFixed(2) + 'px'); });
  }
  // By each word's middle, in the page's coordinates: in a span or not.
  // Reads first, and a class moved only where it changes.
  function markWords() {
    if (!markSpans.length) return;
    var sy = window.scrollY;
    // THE HEAD BAND TURNS AT ITS MIDDLE (2026-09-23): white, its words
    // charcoal, while a charcoal span stands under the band's own middle
    // — a snap as the section's line passes halfway up the band, and
    // back as the next white section's does (style.css, THE HEAD BAND
    // TURNS AT ITS MIDDLE).
    var hb = document.querySelector('.page-rows > .section-band:not(.section-band--colophon)');
    if (hb) {
      var hr = hb.getBoundingClientRect();
      var hm = (hr.top + hr.bottom) / 2 + sy;
      var over = hr.height > 0 && markSpans.some(function (sp) { return hm >= sp.a && hm < sp.b; });
      // (but not over THE LATEST, charcoal since 2026-09-23: the band
      // keeps its own charcoal there and turns as ESSAYS comes up)
      var lat = over && document.querySelector('.page-rows > .m--latest.on-mark');
      if (lat && hm < lat.getBoundingClientRect().bottom + sy) over = false;
      // (THE HEAD BAND IS ALWAYS THE CHARCOAL, 2026-09-23: it turns for
      // no section now)
      over = false;
      if (hb.classList.contains('is-over-mark') !== over) hb.classList.toggle('is-over-mark', over);
    }
    var words = document.querySelectorAll(MARK_WORDS);
    var on = [].map.call(words, function (w) {
      var r = w.getBoundingClientRect();
      if (!r.height) return false;
      var mid = (r.top + r.bottom) / 2 + sy;
      return markSpans.some(function (sp) { return mid >= sp.a && mid <= sp.b; });
    });
    [].forEach.call(words, function (w, i) {
      if (w.classList.contains('over-mark') !== on[i]) w.classList.toggle('over-mark', on[i]);
    });
  }
  // THE PAGE ENDS ON A WHOLE PIXEL (2026-09-22). The cards stand at
  // fractional heights, so the page ended a fraction short of one —
  // 0.45 at 1440, 0.87 at 1280 — the browser rounds the scroll height
  // up, and at the foot of the scroll the window's last row was the
  // canvas's white under the colophon. The colophon's own ground is
  // hung down over the fraction (its ::after, style.css, THE COLOPHON
  // CLOSES THE WINDOW), so the page ends on the row the window does and
  // nothing in the band moves. Read with the gutters' reads, written
  // after their writes: neither forces the other a style pass.
  function footGap() {
    var col = document.querySelector('.page-rows > .section-band--colophon');
    if (!col) return null;
    var r = col.getBoundingClientRect();
    if (!r.height) return null;
    var bot = r.bottom + window.scrollY;
    // (in 1024ths, and never over: a hair past the whole pixel and the
    //  scroll height rounds up to the next one, opening the rule again)
    var f = Math.floor((Math.ceil(bot - 1 / 1024) - bot) * 1024) / 1024;
    return { col: col, f: Math.max(0, f) };
  }
  function seatFootGap(g) { if (g) setIf(g.col, '--foot-f', g.f.toFixed(10) + 'px'); }
  // And whenever the page's height moves between passes — a late face,
  // the second stage bringing the rest of the page back — or the box's
  // does, its lines re-wrapped or its faces landed. (The foot rides the
  // same watch, on the word pages too, which have no gutters.)
  if (window.ResizeObserver && document.querySelector('main > .mark-gutters, .page-rows > .section-band--colophon')) {
    var markRO = new ResizeObserver(function () { var foot = footGap(); seatMarkGutters(); seatFootGap(foot); });
    markRO.observe(document.body);
    var subBox = document.querySelector('.sub-box');
    if (subBox) markRO.observe(subBox);
  }
  function fitGroundStops() {
    markBandEdges();
    seatMarkGutters();
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
    // ON SCROLL, THE EDGE MARKS ALONE (2026-09-18): the ground stops are
    // the bands' seats in the flow and do not move with the scroll —
    // they are set on every fit and resize — so the per-frame pass
    // toggles the at-top / under-band classes and rewrites nothing
    // else. (Rewriting the three stops on the main element each frame
    // invalidated the whole page's style whenever a value moved.)
    // THE STACKS ARE SEATED ON THE SCROLL'S OWN TICK, not the frame
    // after it: the two thresholds they change state at have to land on
    // the frame the page crosses them, or the change shows.
    pinStacks();
    if (!sheetsRide) rideSheets();
    requestAnimationFrame(function () { stopsQueued = false; markWords(); markBandEdges(); fitPickup(); });
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

  // THE CAP BLOCK of an element's text: from the top of its capitals
  // to its baseline, ascenders, descenders and punctuation left out.
  // Measured per text node like paintedSpan — the baseline off the
  // node's line box and the face's bounds, the cap height off a
  // canvas H in the node's own font.
  function capSpan(el) {
    var top = Infinity, bot = -Infinity;
    var g = measureCtx;
    inkPieces(el).forEach(function (node) {
      var text = node.nodeValue;
      if (!text.trim()) return;
      var host = node.parentElement || el;
      var cs = getComputedStyle(host);
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = g.measureText(text);
      var capH = g.measureText('H').actualBoundingBoxAscent || m.actualBoundingBoxAscent || 0;
      var rg = document.createRange();
      rg.selectNodeContents(node);
      var r = rg.getBoundingClientRect();
      if (!r.height) return;
      var half = (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
      var base = r.top + half + m.fontBoundingBoxAscent;
      var t = base - capH;
      if (t < top) top = t;
      if (base > bot) bot = base;
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
      // ON THE CAP BLOCK (2026-09-18), not the painted ink: centred on
      // its full ink, the tagline's g and the deks' commas lifted their
      // letters off the band's axis while NEW and the miniature (which
      // seats itself by its caps, band-mark.js) stood on it — the
      // Garamond read high of the courier date by two pixels. Every
      // item now stands with its caps and its baseline equidistant
      // from the band's edges, whatever hangs above or below them.
      [].forEach.call(band.querySelectorAll('.band-mark, .band-mid, .band-deks'), function (el) {
        el.style.top = '';
        var i = capSpan(el) || paintedSpan(el) || inkSpan(el);
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
    // THE PAGE'S OWN 72 over the caps and under the feet, on the words
    // and the reprint (2026-09-17: 108 and 144 were tried and taken
    // back the same day).
    var BANNER_AIR = 72;
    // THE WORD PAGES CARRY NO MASTHEAD (2026-09-17): ARCHIVE or ABOUT
    // opens the page where THE NEW CRITIC opens the front page. The
    // cap is the masthead's size — the name's ink across the measure —
    // and the reprint at the foot is that same name at that same fit,
    // so it is fitted first there and its size is the banners' cap.
    if (!cap) {
      var repName = document.querySelector('.reprint .reprint-name');
      if (repName) {
        fillNameBand(repName, repName.closest('.reprint'), { air: BANNER_AIR, airBottom: BANNER_AIR, side: WORDMARK_SIDE, sizeSide: WORDMARK_SIDE });
        cap = parseFloat(getComputedStyle(repName).fontSize) || 0;
      }
    }
    // A MODERATE SIZE FOR THE WORDS (2026-09-18): in Garamond the
    // section words and SUBSCRIBE fitted to the measure all reached
    // the masthead's cap and stood as tall as the name. Their own
    // ceiling is half of it (two thirds for an hour) — the masthead's scale, so
    // it follows the viewport, but a word, not a second wordmark. The
    // reprint at the foot IS the name and keeps the full cap. (Read
    // after the word pages derive their cap from the reprint.)
    // HALFWAY BETWEEN THE NAME AND THE TITLES' CEILING (2026-09-18):
    // the words took the titles' own max, 72, and read as a caption
    // beside a masthead three inches tall; they took half the
    // masthead's size, and the band miniature's, before that. Their
    // ceiling is the mean of the two now — the wordmark's fitted size
    // and TITLE_MAX — so they stand well clear of a card title and
    // still short of the name. It follows the viewport, since the
    // masthead's size does. (cap is the masthead's on the front page
    // and the reprint's on the word pages, fitted just above; with no
    // name to read, the titles' ceiling alone.)
    var TITLE_MAX = 72;
    var wordCap = cap ? (cap + TITLE_MAX) / 2 : TITLE_MAX;
    // THE BANNERS' WORDS REACH HALFWAY INTO THE MARGINS: the page's
    // 72 at each side, less half — the ink opens and closes 36 from
    // the edges, spreading 50% further out than every row it stands
    // between. (fillNameBand's own default is the same 36 now, so the
    // masthead and the reprint read it too; stated here regardless.)
    var BANNER_SIDE = 72; // the words track out to the cards' and the band's own 72
    // EVERY NAME BLOCK STANDS IN THE PAGE'S 72, over the caps and under
    // the feet alike — the words, the masthead and the reprint. (They
    // stood in a doubled 144 on one side or the other for a while.)
    var WORD_AIR = BANNER_AIR;
    [].forEach.call(document.querySelectorAll('.page-banner'), function (band) {
      // THE BAND THAT STANDS APART CARRIES TWO COURIER BLOCKS (2026-09-17):
      // the offer over the word and the terms under it, each 36 off
      // the word's ink and 36 inside the band's colour, which itself
      // starts 36 in from the block's edge. So the block's air grows
      // by each block's ink and its 36, and the blocks are seated by
      // ink afterwards: the top one's cap 72 under the band's top
      // edge, the bottom one's feet 72 over its bottom edge.
      // AND STANDS IN THE PAGE'S OWN 72 (2026-09-17: it wore a colour
      // of its own for an afternoon, with airs inside it; the colour
      // is struck and the airs with it): 72 over the caps, 72 under
      // the feet, the courier line inside that 72.
      var LINE_GAP = 32;
      var airTop = WORD_AIR;
      var airBot = BANNER_AIR;
      var above = band.querySelector('.banner-line--above');
      var below = band.querySelector('.banner-line--below');
      var extraTop = 0, extraBot = 0;
      if (above) { above.style.top = ''; var ia = inkSpan(above); if (ia) extraTop = ia.ink + LINE_GAP; }
      // THE LINE UNDER THE WORD STANDS INSIDE THE 72 (2026-09-17): the
      // band keeps the page's own 72 from the word's feet to what
      // follows, and the courier line stands within that air, its cap
      // ink under the feet by the courier's gap — what the hero's own
      // line stands under its rule (courierGap). Nothing is added to
      // the block for it.
      if (below) {
        below.style.top = '';
        var list = below.querySelector('.banner-list');
        if (list) {
          list.style.marginTop = '';
          var prev = list.previousSibling;
          while (prev && !(prev.nodeType === 3 && prev.textContent.trim())) prev = prev.previousSibling;
          if (prev) {
            // By PAINTED ink, as the word is seated: the line before
            // the list ends in descenders (y, p, g) that the font's
            // metric model puts four pixels above where they print,
            // and the gap read four short. Each line's reach above
            // and below its baseline is scanned off a canvas, and the
            // baselines are read off zero probes at the seam.
            var bcs = getComputedStyle(below);
            var bsize = parseFloat(bcs.fontSize) || 16;
            var reach = function (text) {
              var scanPx = 200, W = 3000, H = 320, y0 = 240;
              var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
              var g = cv.getContext('2d');
              if (!g) return null;
              g.font = bcs.fontStyle + ' ' + bcs.fontWeight + ' ' + scanPx + 'px ' + bcs.fontFamily;
              g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
              g.fillText(text, 20, y0);
              var data;
              try { data = g.getImageData(0, 0, W, H).data; } catch (e) { return null; }
              var top = -1, bot = -1;
              for (var y = 0; y < H; y++) {
                for (var x = 0; x < W; x++) { if (data[(y * W + x) * 4 + 3] > 40) { if (top < 0) top = y; bot = y; break; } }
              }
              if (top < 0) return null;
              return { above: (y0 - top) / scanPx * bsize, below: (bot + 1 - y0) / scanPx * bsize };
            };
            var probe = document.createElement('span');
            probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
            below.insertBefore(probe, prev.nextSibling);
            var prevBase = probe.getBoundingClientRect().bottom;
            probe.remove();
            list.insertBefore(probe, list.firstChild);
            var listBase = probe.getBoundingClientRect().bottom;
            probe.remove();
            var firstLine = list.firstChild && list.firstChild.nodeType === 3 ? list.firstChild.textContent : (list.textContent || '');
            var rPrev = reach(prev.textContent), rList = reach(firstLine);
            if (rPrev && rList) {
              var prevFoot = prevBase + rPrev.below;
              var listCap = listBase - rList.above;
              list.style.marginTop = (LINE_GAP - (listCap - prevFoot)).toFixed(2) + 'px';
            }
          }
        }
      }
      // THE SECTIONS' NAMES MATCH THE LATEST (2026-09-23): ESSAYS,
      // POSTSCRIPT and CONTRA in the body's Garamond at 54, 72 of the
      // section's ground over their caps as THE LATEST has under the
      // ticker; the tag under each a dek (fitSubscribeLines), the first
      // row 36 under that (seatRowGaps). style.css, THE SECTIONS' NAMES.
      var isSection = band.classList.contains('page-banner--section');
      var fitted = fillNameBand(band.querySelector('.banner-name'), band, { maxSize: isSection ? SECTION_HEAD : wordCap, air: airTop + extraTop, airBottom: airBot + extraBot, side: BANNER_SIDE });
      // (its caps to the pixel by the face's own bounds, as THE LATEST's
      // are: the fill seats them by its scan, a hair off)
      if (isSection) {
        var sn = band.querySelector('.banner-name'), snb = sn && baselineOf(sn);
        if (snb) {
          var sd = band.getBoundingClientRect().top + airTop - snb.cap;
          if (Math.abs(sd) > 0.05) sn.style.marginTop = ((parseFloat(sn.style.marginTop) || 0) + sd).toFixed(2) + 'px';
        }
      }
      var bb = band.getBoundingClientRect();
      if (above) { var ia2 = inkSpan(above); if (ia2) above.style.top = (airTop - (ia2.top - bb.top)).toFixed(2) + 'px'; }
      // (The line's own seat is written late — fitSubscribeLines — once
      // the hero's courier line, whose gap it borrows, is seated.)
      void fitted;
    });
    // The reprint stands in the same doubled air as the words (the
    // masthead too, fitMastheadFill), so the foot field — a viewport
    // less the band and the masthead's height — still closes the page
    // on the colophon band exactly.
    // THE REPRINT: the same 72 over and under. Its height is its own
    // token (--reprint-h), read by the foot field so the last screen
    // closes on the colophon band whatever the two blocks measure.
    fitReprint();
  }
  // THE REPRINT, fitted on its own so it can be seated again once the
  // colophon's line stands where it will (fitBandDekInset).
  function fitReprint() {
    var mast = document.querySelector('.site-nav--top .topbar-name');
    var cap = mast ? (parseFloat(getComputedStyle(mast).fontSize) || 0) : 0;
    var col = document.querySelector('.page-rows > .section-band--colophon');
    [].forEach.call(document.querySelectorAll('.reprint'), function (band) {
      var stuck = band.style.getPropertyValue('position');
      band.style.setProperty('position', 'relative', 'important');
      // (the spacer over the name struck while it is fitted: style.css,
      // the page closes the same way)
      band.style.setProperty('padding-top', '0px', 'important');
      var name = band.querySelector('.reprint-name');
      // (THE COLOPHON SITS ON THE NAME'S INK, 2026-09-23: no air over
      // the caps — the colophon's foot is the caps' top)
      var over = 0;
      // (…AND UNDER THE FEET, THE COLOPHON'S OWN AIR, 2026-09-23: the
      // air under the name is the air between the colophon's Garamond
      // and the name's caps — the colophon's inset to its baseline, and
      // whatever stands between its foot and the caps. Read off the
      // face's own bounds, fitted, read again and seated to it.)
      var inset = bandGaramondInset(col, 'bottom');
      var under = inset || 72;
      var opts = function () { return { maxSize: cap, air: over, airBottom: under, side: WORDMARK_SIDE, sizeSide: WORDMARK_SIDE }; };
      fillNameBand(name, band, opts());
      var ink = function () {
        var rg = document.createRange(); rg.selectNodeContents(name);
        var r = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0];
        if (!r) return null;
        bandInkCv = bandInkCv || document.createElement('canvas').getContext('2d');
        var cs = getComputedStyle(name);
        bandInkCv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        var t = (name.textContent || '').trim();
        var m = bandInkCv.measureText(cs.textTransform === 'uppercase' ? t.toUpperCase() : t);
        var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
        if (!(fa > 0)) return null;
        var base = r.top + (r.height - (fa + fd)) / 2 + fa;
        return { cap: base - m.actualBoundingBoxAscent, foot: base + m.actualBoundingBoxDescent };
      };
      var ni = inset && name && ink();
      if (ni) {
        var bb = band.getBoundingClientRect();
        var want = inset + (ni.cap - bb.top), have = bb.bottom - ni.foot;
        if (Math.abs(want - have) > 0.05) { under += want - have; fillNameBand(name, band, opts()); }
      }
      if (stuck) band.style.setProperty('position', stuck); else band.style.removeProperty('position');
      var rh = band.getBoundingClientRect().height;
      if (rh) document.documentElement.style.setProperty('--reprint-h', Math.round(rh) + 'px');
      band.style.removeProperty('padding-top');
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
  // THE WORDMARKS STAND ON THE CONTENT'S LINE (2026-09-22): the page's
  // 72 of charcoal margin and the 72 of air inside it — the masthead's
  // and the reprint's ink from 144 to 144.
  var WORDMARK_SIDE = 36; // (144 for an hour on the 22nd, on the content's line; the page's 72 after; 36 from the 23rd, halfway into the margins)
  // THE BAND'S GARAMOND STANDS 72 OFF THE NAME'S INK (2026-09-23): the
  // head band's line under the masthead's THE NEW CRITIC and the
  // colophon's over the reprint's, ink to ink — the name's air is the 72
  // less what the band keeps between its edge and its Garamond: the
  // tallest letter's top under the head band's edge ('top'), the
  // baseline over the colophon's foot ('bottom'). Read off the face's
  // own bounds on a canvas; the line's place in its band does not
  // depend on where the band stands, so the order of the steps is moot.
  var bandInkCv = null;
  function bandGaramondInset(band, edge) {
    if (!band) return 0;
    var br = band.getBoundingClientRect();
    if (!br.height) return 0;
    bandInkCv = bandInkCv || document.createElement('canvas').getContext('2d');
    var hi = Infinity, lo = -Infinity;
    [].forEach.call(band.querySelectorAll('.band-deks:not(.band-dek) a, .band-deks:not(.band-dek) > span:not(.band-sep)'), function (el) {
      var txt = (el.textContent || '').trim();
      if (!txt) return;
      var rg = document.createRange(); rg.selectNodeContents(el);
      var r = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0];
      if (!r) return;
      var cs = getComputedStyle(el);
      bandInkCv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = bandInkCv.measureText(cs.textTransform === 'uppercase' ? txt.toUpperCase() : txt);
      var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      if (!(fa > 0)) return;
      var base = r.top + (r.height - (fa + fd)) / 2 + fa;
      hi = Math.min(hi, base - m.actualBoundingBoxAscent);
      lo = Math.max(lo, base);
    });
    if (edge === 'bottom') return isFinite(lo) ? br.bottom - lo : 0;
    return isFinite(hi) ? hi - br.top : 0;
  }
  function fillNameBand(name, wm, opts) {
    if (!name || !wm) return null;
    var maxSize = (opts && opts.maxSize) || 0;
    // THE AIR OVER AND UNDER THE INK. The masthead keeps the 48 it was
    // built on; the page's banners keep the page's own 72 (passed in),
    // measured to the PAINTED pixels of the word — the scan below — not
    // to the font's boxes, which on a display face hang well past what
    // prints.
    var AIR = (opts && opts.air != null) ? opts.air : 48;
    // THE AIR UNDER THE FEET may differ from the air over the caps: the
    // words and the masthead close on their ink now (0), the reprint
    // alone keeps the full measure below (the default: the same AIR).
    var AIR_B = (opts && opts.airBottom != null) ? opts.airBottom : AIR;
    name.style.fontSize = '';
    name.style.transform = 'none';
    name.style.marginTop = '';
    name.style.letterSpacing = '';
    wm.style.height = '';
    // TWO MEASURES. The SIZE is fitted to the page's own 72 at each
    // side — the measure every row and every band on the page opens
    // and closes on (48, grown by half) — exactly as it always was.
    // The INK then reaches halfway into that margin, 36 from each
    // edge, by TRACKING: the letters are spaced out over the wider
    // span, the size untouched. (A caller may ask for other insets.)
    var SIDE = (opts && opts.side != null) ? opts.side : 72; // ink tracked to 72 from each edge, on the cards' line
    // THE PAGE'S OWN 72 from each edge (2026-09-17: 108 and 144 were
    // tried and taken back the same day).
    var SIZE_SIDE = (opts && opts.sizeSide != null) ? opts.sizeSide : 72;
    var cw = document.documentElement.clientWidth;
    var vw = cw - SIDE * 2;
    var vwSize = cw - SIZE_SIDE * 2;
    var s0 = parseFloat(getComputedStyle(name).fontSize);
    if (!s0 || !vw || !vwSize) return;
    var i0 = inkSpanOf(name);
    if (!i0) return;
    var w0 = i0.right - i0.left;
    if (!(w0 > 0)) return;
    var fitted = s0 * vwSize / w0;
    var capped = maxSize > 0 && fitted > maxSize;
    if (capped) fitted = maxSize;
    name.style.fontSize = fitted.toFixed(3) + 'px';
    var i1 = inkSpanOf(name);
    if (!i1) return;
    var wb = wm.getBoundingClientRect();
    // NO TRACKING, CENTRED (2026-09-17): the word keeps the face's own
    // spacing and stands in the middle of the band by its ink — a
    // capped banner short of the measure as much as a name fitted to
    // it. (The letters were spread to 36 from each edge before; that
    // block is struck, and SIDE only names the measure now.)
    var ink1 = i1.right - i1.left;
    void vw;
    name.style.transform = 'translateX(' + (wb.left + (wb.width - ink1) / 2 - i1.left).toFixed(2) + 'px)';
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
    g.font = ncs.fontStyle + ' ' + ncs.fontWeight + ' ' + scan + 'px ' + ncs.fontFamily;
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
    // In the face's own STYLE: the italic's bounds differ from the
    // roman's, and a roman model under an italic word seated SUBSCRIBE
    // two and a half pixels high (2026-09-18).
    g.font = ncs.fontStyle + ' ' + ncs.fontWeight + ' ' + size + 'px ' + ncs.fontFamily;
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
    // THE INK'S MIDDLE, from the band's top edge: the line the essays'
    // ground turns on, in ESSAYS and again in POSTSCRIPT (style.css,
    // THE ESSAYS STAND ON THE MARK). Off the same painted rows as the
    // seat, so it is the ink's middle and not the line box's.
    wm.style.setProperty('--ink-mid', ((baseline2 - inkAbove + inkBottom) / 2 - wb.top).toFixed(2) + 'px');
    // AND ITS TOP, the caps' painted edge: a marked movement's ground
    // opens MARK_OVER above it (seatMarkGutters).
    wm.style.setProperty('--ink-top', (baseline2 - inkAbove - wb.top).toFixed(2) + 'px');
    // THE BAND CLOSES 48 UNDER THE FEET, as it opens 48 over the caps.
    wm.style.height = Math.round(Math.max(0, inkBottom - wb.top + AIR_B)) + 'px';
    seatHit(name, wb.top + AIR, inkBottom);
    return { wb: wb, inkBottom: inkBottom };
  }
  // THE WORD TAKES THE POINTER ON ITS INK ALONE (2026-09-17). A word's
  // link is a block the page's width and the band's height, so the
  // margins and the air over the caps lit it. The link takes no
  // pointer now; a box inside it, seated on the ink — cap top to the
  // feet, first letter's edge to the last's, the counters and the
  // gaps between letters included — takes it instead, and the link
  // lights and follows as the box's ancestor.
  function seatHit(name, top, bottom) {
    var link = name.closest ? name.closest('a') : null;
    if (!link) return;
    var hit = null;
    for (var c = link.firstElementChild; c; c = c.nextElementSibling) {
      if (c.classList.contains('ops-hit')) { hit = c; break; }
    }
    if (!hit) {
      hit = document.createElement('span');
      hit.className = 'ops-hit';
      hit.setAttribute('aria-hidden', 'true');
      link.appendChild(hit);
      link.classList.add('has-hit');
      // The word's band goes dead with the link: its ground held
      // under the pointer in the margins as the band's own hover.
      var band = link.closest('.page-banner, .reprint');
      if (band) band.classList.add('has-hit');
    }
    var i = inkSpanOf(name);
    if (!i) return;
    if (getComputedStyle(link).position === 'static') link.style.position = 'relative';
    var lr = link.getBoundingClientRect();
    hit.style.left = (i.left - lr.left).toFixed(2) + 'px';
    hit.style.top = (top - lr.top).toFixed(2) + 'px';
    hit.style.width = (i.right - i.left).toFixed(2) + 'px';
    hit.style.height = (bottom - top).toFixed(2) + 'px';
  }
  function fitMastheadFill() {
    var name = document.querySelector('.site-nav--top .topbar-name');
    if (!name) return;
    var wm = name.closest('.topbar-wordmark') || name.parentElement;
    // THE HEADER'S WORDMARK KEEPS THE PAGE'S 72 like every other banner
    // — over the ink and under it.
    // (…OVER THE CAPS, THE BAND'S OWN AIR, 2026-09-23: the band sits on
    // the name's feet, so the air between the name's ink and the band's
    // Garamond is the band's inset to its line — the caps stand that far
    // under the page's top too. Stated for band-mark.js as --masthead-air.)
    var INSET = bandGaramondInset(document.querySelector('.page-rows > .section-band'), 'top') || 72;
    var AIR = INSET;
    var AIR_B = 72;
    // (the name's cap and foot off the face's own bounds, as the band's
    // Garamond is read)
    var nameInk = function () {
      var rg = document.createRange(); rg.selectNodeContents(name);
      var r = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0];
      if (!r) return null;
      bandInkCv = bandInkCv || document.createElement('canvas').getContext('2d');
      var cs = getComputedStyle(name);
      bandInkCv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var t = (name.textContent || '').trim();
      var m = bandInkCv.measureText(cs.textTransform === 'uppercase' ? t.toUpperCase() : t);
      var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      if (!(fa > 0)) return null;
      var base = r.top + (r.height - (fa + fd)) / 2 + fa;
      return { cap: base - m.actualBoundingBoxAscent, foot: base + m.actualBoundingBoxDescent };
    };
    var f = fillNameBand(name, wm, { air: AIR, airBottom: AIR_B, side: WORDMARK_SIDE, sizeSide: WORDMARK_SIDE });
    if (!f) return;
    // (…to the pixel: the band's top is the feet rounded UP to a whole
    // pixel, which adds that fraction to the air under the name; the air
    // over the caps is given the same fraction. The fill seats the caps
    // by its scan, the face's bounds a hair off it: e. Solved for the
    // air at which the two stand equal, and seated again.)
    var ni = nameInk();
    if (ni) {
      var e = ni.cap - (f.wb.top + AIR), z = (ni.foot - f.wb.top - AIR) + (INSET - e);
      var air2 = INSET - e + (Math.ceil(z) - z) / 2;
      if (Math.abs(air2 - AIR) > 0.05) {
        AIR = air2;
        f = fillNameBand(name, wm, { air: AIR, airBottom: AIR_B, side: WORDMARK_SIDE, sizeSide: WORDMARK_SIDE }) || f;
      }
    }
    document.documentElement.style.setProperty('--masthead-air', AIR.toFixed(2) + 'px');
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
    // (ink to ink with the band's Garamond: the name's foot read off the
    // face's own bounds, as the band's line is — round letters dip past
    // the scanned foot by a pixel or two)
    var foot = inkBottom;
    var ni2 = nameInk();
    if (ni2) foot = ni2.foot;
    // (THE HEAD BAND SITS ON THE NAME'S INK, 2026-09-23: its top edge
    // the letters' foot, no air between — rounded up, never into them)
    var wmH = Math.max(0, Math.ceil(foot - wb.top));
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
    wm.style.height = Math.round(wmH) + 'px';
    // THE TOKEN IS THE BLOCK'S OWN ROUNDED HEIGHT, not the measured
    // fraction: the head field is a viewport less the band and this,
    // and a fraction here put the wordmark's foot a hair past the fold
    // — and the first row's rule a hair inside it.
    document.documentElement.style.setProperty('--masthead-h', Math.round(wmH) + 'px');
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
      // The shared scratch context (it only ever measures, and every
      // hand states its font first), not a canvas per end: this runs
      // twice for every name and line the page seats.
      measureCtx.font = hcs.fontWeight + ' ' + hcs.fontSize + ' ' + hcs.fontFamily;
      var m2 = measureCtx.measureText(ch);
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
  // THE COURIER STANDS 36 OFF THE GARAMOND on the review's column —
  // author baseline to title cap, dek baseline to date cap — as it
  // stands off the body in every preview (PLATE_INNER_GAP).
  var CONTRA_MATTER_GAP = 36;
  // THE TITLE HOLDS ITS DEK CLOSER: the seam between the two is three
  // quarters of the courier's 24 — the author over the title and the
  // date under the dek keep the full measure.
  var CONTRA_TITLE_DEK_GAP = 36;
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
  // ---------- THE SECOND LOOK ASKS BEFORE IT FITS (2026-09-21) ----------
  // The review's fit runs twice a pass — once before the titles are cut
  // and once after, because the cut can move the row cap and a review's
  // words take whatever its square leaves — and it was the most
  // expensive thing in the pass both times: some fifty-five words popped
  // off eight reviews one at a time, a forced layout under every one,
  // and then the same fifty-five popped again by the second look.
  //   WHERE THE SECOND LOOK IS IDLE. At 1600 and at 1920 it changed
  // NOTHING: every margin, size, cut and box on all eight reviews the
  // same to the hundredth after the first run and after the second. A
  // review with room to spare is at a fixed point after one run — the
  // slack is dealt, the stack fills its room exactly, and a second run
  // finds no overrun to give for and no slack to deal.
  //   WHERE IT IS NOT. At 1280 every review OVERRUNS, and there the
  // second run is a second helping and the page as shipped is the two
  // of them: the first gives twelve off each seam and steps the type
  // down to fit; the second puts the type back to the sheet, finds the
  // seams already twelve shorter, gives twelve MORE and steps the type
  // down less. Twenty-four off the seams and a 27px title, against
  // twelve and a title at its 16 floor. That was tried the other way
  // first — the dealing made idempotent, one helping and no more, as
  // the note at the give has always described it — and held against
  // the shipped page it moved 177 values at 1280 and nothing at the
  // wider two, which is how it was caught: a change that reads as a
  // tidy-up at the desk and ships small type to every thirteen-inch
  // screen. The two helpings are the design, whatever the note says.
  //   SO THE LOOK IS KEPT AND MADE TO ASK FIRST. A review is left
  // standing on the second look only when BOTH are true: its run
  // SETTLED — after the give the stack no longer overran, so no type
  // was stepped down and a second run has provably nothing to add — and
  // its box is what it was when that run finished. Anything else is
  // fitted again exactly as before, accumulated margins and all. The
  // key is the pass, the window and the box, read at the END of a fit
  // (its own margins on) so it is the state the next look reads at its
  // head; and never across passes — a new pass has new faces, new
  // gaps, possibly new words.
  var fitPassId = 0;
  function contraKey(cell) {
    var b = cell.getBoundingClientRect();
    return fitPassId + '|' + window.innerWidth + '|' + b.width.toFixed(2) + '|' + b.height.toFixed(2);
  }
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
      // Settled this pass, on this box: nothing to answer.
      if (cell.__contraKey && cell.__contraKey === contraKey(cell)) return;
      cell.__contraKey = null;
      // Settled until the stack is seen to overrun AFTER the give (the
      // first of the three step-down loops asks; see overruns below).
      var settled = true, asked = false;
      var fitted = function () { cell.__contraKey = settled ? contraKey(cell) : null; };
      var rev = cell.classList.contains('latest-cell--contra-rev');
      ['--slide', '--sq-rest', '--sq-open'].forEach(function (v) { cell.style.removeProperty(v); });
      // From the sheet's own sizes every run: this runs twice a pass,
      // and a shrink left standing would compound (a dek went 20 -> 16
      // -> 12.8 -> 10 that way).
      title.style.fontSize = '';
      if (dek) dek.style.fontSize = '';
      // The dek's whole text back before it is measured: a pass may
      // have cut it (see THE DEK IS CUT BEFORE IT IS SHRUNK below).
      if (dek && dek.__fullHTML) dek.innerHTML = dek.__fullHTML;
      if (title.__fullHTML) title.innerHTML = title.__fullHTML;
      var shown = function (el) { return el && getComputedStyle(el).display !== 'none'; };
      // The words' HEAD and FOOT are whichever of the author, the title,
      // the dek and the date stand highest and lowest, read off their
      // boxes.
      // THE TWO ROBOTO LINES ARE NOT IN THE STACK (2026-09-22): they
      // stand in the frame's band (seatMatterMeta), so the room the row
      // leaves is the title's and the dek's — the byline and See
      // Preview keep their flow seats but are not measured.
      var stack = [title, dek].filter(shown);
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
      // THE PICTURE THAT SHOWS IS THE SQUARE (2026-09-23). Since the
      // cards turned inside out the picture a reader sees is the BOX
      // over the words' old seat, painted with the cover (seatMatterMeta),
      // and it stood as wide as the frame's inside but only as tall as
      // that seat left it: landscape at every width. The square is the
      // box's now. The box runs the frame's inside across (the card less
      // REST_INSET each side), stands under the frame's head band
      // (REST_INSET) and reaches REST_OVERLAP down into the seat below;
      // so the seat above the old picture's is that square, plus the
      // band, less the reach, and the old picture's seat (--pic-h, the
      // words' column now) is what the card has left. The cards are
      // grown for it (style.css, .card .duo-half--mega), so the words
      // keep the room they had.
      // …AS WIDE AS THE BOX IS NOW (2026-09-23, later): the box took the
      // frame's two side bands (THE PICTURE TAKES THE FRAME'S SIDES in
      // style.css, a --wrap each side), so the square is that wide too,
      // and stands that much taller into the words' seat: the card keeps
      // its height (a review shares the latest row with a postscript)
      // and the words the room that is left, which they have to spare.
      var wrapW = parseFloat(getComputedStyle(cell).getPropertyValue('--wrap')) || 0;
      var side = cb.width - 2 * REST_INSET + 2 * wrapW;
      var boxSeat = side - REST_OVERLAP + REST_INSET;
      var picH = Math.max(0, cb.height - boxSeat);
      var picTop = rev ? (cb.height - picH) : 0;
      // THE BLOCK'S OWN EDGES ARE THE COURIER'S FRAME: the stack is
      // anchored on the card's edge by its margins above (24 by ink),
      // so what it must fill is the remainder less the two 24s. A
      // title too tall for it shrinks until it fits; whatever room is
      // left is dealt into the stack's two inner gaps, half each, so
      // the far courier lands 24 off the picture and the title and
      // dek centre between the two lines.
      // (THE BOX AND ITS BAND, 2026-09-22: the title's cap stands on
      // the picture's edge, and under the dek's baseline the box's 36
      // and the frame's 54 band — all of it inside the card.)
      // …CENTRED IN THE BOX since the 72s: the box reaches REST_OVERLAP
      // up into the picture and stops REST_INSET short of the card's
      // edge, the words keeping REST_PAD from its top and its foot.
      var wordsRoom = cb.height - picH + REST_OVERLAP - REST_INSET - 2 * REST_PAD - 4; // (4 for the ink's own overhang past the measured cap and baseline: the frame must end inside the card, where the landed picture covers it)
      var stackInk = function () {
        return baselineOf(last, false) - (baselineOf(head, true) - capAscent(head));
      };
      // THE TYPE IS STANDARD AND THE WORDS ARE CUT, NOT SHRUNK. The
      // title holds the sheet's 32 and the dek its 20 on every review;
      // a title that runs past ONE line and a dek that runs past TWO
      // are cut to it — words off the end until they hold, the ellipsis
      // joined on (inline markup kept, so the work's italic survives).
      // Only a stack that still overruns the square's room with the
      // dek on two lines takes the dek down to one; nothing is scaled.
      var linesOf = function (el) {
        var rg = document.createRange(); rg.selectNodeContents(el);
        var tops = [];
        [].forEach.call(rg.getClientRects(), function (r) {
          if (!r.width || !r.height) return;
          var t = Math.round(r.top);
          if (tops.every(function (x) { return Math.abs(x - t) > 3; })) tops.push(t);
        });
        return tops.length;
      };
      var cutTo = function (el, max) {
        if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
        var g = 120;
        while (g-- > 0 && linesOf(el) > max) {
          if (!popLastWord(el)) break;
          var tn = lastTextNode(el);
          if (!tn) break;
          tn.textContent = tn.textContent.replace(TRAIL_PUNCT, '') + '\u2026';
        }
      };
      var hasDek = !!(dek && shown(dek));
      // (three lines for the title since the box came in from the sides —
      // 2026-09-22 — one before)
      cutTo(title, 3);
      if (hasDek) cutTo(dek, 2);
      if (hasDek && stackInk() > wordsRoom + 0.25) cutTo(dek, 1);
      // A CELL THAT STILL OVERRUNS with the dek on one line gives back
      // the courier's seams first — the 36 over the title and under
      // the dek (fitContraGap) come down as far as 24 each — and only
      // then, last of all, steps the type down as it used to: title
      // and dek together to the title's 24, the dek alone to 0.6 of
      // itself, the title on down to 16 and never below the dek.
      var authorEl = cell.querySelector('.cover-meta--author');
      var over0 = stackInk() - wordsRoom;
      if (over0 > 0.25) {
        var give = Math.min(12, over0 / 2);
        [authorEl, hasDek ? dek : null].forEach(function (el) {
          if (!el || !shown(el)) return;
          var mb0 = parseFloat(el.style.marginBottom) || parseFloat(getComputedStyle(el).marginBottom) || 0;
          el.style.marginBottom = Math.max(0, mb0 - give).toFixed(2) + 'px';
        });
      }
      var size = function (el) { return parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize) || 0; };
      var CONTRA_TITLE_FLOOR = 16, CONTRA_DEK_FLOOR = 0.6;
      var dek0 = hasDek ? size(dek) : 0;
      var shrink = function (el, floorPx) {
        var sz = size(el);
        if (!sz) return false;
        var over = stackInk() - wordsRoom;
        var eh = el.getBoundingClientRect().height;
        if (!eh || over <= 0.25) return false;
        var next = Math.max(floorPx, sz * Math.max(0.6, (eh - over) / eh));
        if (next >= sz - 0.05) return false;
        el.style.fontSize = next.toFixed(2) + 'px';
        return true;
      };
      // The loops' own question, asked through one door: its FIRST answer
      // is taken straight after the give, and is the whole of whether
      // this run settled. (No extra measure — the first loop asked this
      // anyway.)
      var overruns = function () {
        var o = stackInk() > wordsRoom + 0.25;
        if (!asked) { asked = true; settled = !o; }
        return o;
      };
      var guard = 12;
      while (overruns() && guard-- > 0) {
        var t0 = size(title);
        if (!t0 || t0 <= 24 + 0.05) break;
        var overNow = stackInk() - wordsRoom;
        var inkNow = stackInk();
        var f = Math.max(0.6, (inkNow - overNow) / inkNow);
        var t1 = Math.max(24, t0 * f);
        f = t1 / t0;
        if (f >= 0.999) break;
        title.style.fontSize = t1.toFixed(2) + 'px';
        if (hasDek) dek.style.fontSize = Math.max(dek0 * CONTRA_DEK_FLOOR, size(dek) * f).toFixed(2) + 'px';
      }
      if (hasDek) {
        guard = 8;
        while (overruns() && guard-- > 0 && shrink(dek, dek0 * CONTRA_DEK_FLOOR)) {}
      }
      guard = 12;
      while (overruns() && guard-- > 0 && shrink(title, Math.max(CONTRA_TITLE_FLOOR, hasDek ? size(dek) : 0))) {}
      var ink = stackInk();
      // (The square used to give up height here when the words still
      // overran; it holds now — see the floors above.)
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
      if (!plate) { fitted(); return; }
      if (!plate.__fullHTML) plate.__fullHTML = plate.innerHTML;
      else restorePlateHTML(plate);
      plate.style.paddingBottom = '';
      var pcs = getComputedStyle(plate);
      var padB = parseFloat(pcs.paddingBottom) || 0;
      var ps = plate.querySelectorAll('.latest-plate-p');
      var lastP = ps.length ? ps[ps.length - 1] : null;
      var pb = plate.getBoundingClientRect();
      var moreEl = plate.querySelector('.plate-more');
      // (Close Preview stands out of the flow in the head's band on a
      // review — THE REVIEW'S PLATE — so the last thing in the flow is
      // the last paragraph)
      var lastEl = (moreEl && getComputedStyle(moreEl).position !== 'absolute') ? moreEl : lastP;
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
      fitted();
    });
  }
  // ---------- EVERY PASS BEGINS FROM THE SHEET (2026-09-21) ----------------
  // fitContra puts a review's type back to the sheet's sizes and its
  // words back to their full text at its own head — but it is not the
  // first thing in a pass to read them. fitContraGap runs long before
  // it, seating the three gaps off the RENDERED ink, and on any pass
  // after the first that ink was the last pass's: a title already
  // stepped down to 25 and a dek already cut, where the first pass of a
  // load measures them at the sheet's 32 and 20. So the gaps came out
  // different, so the room did, so the step-down did — and the answer
  // was carried into the pass after that. Measured at 1280, where the
  // reviews overrun: one title read 27.7, 25.7, 25.5, 25.2, 24.6 over
  // five passes, a little smaller for every resize of the window, with
  // no floor in sight but the type's own. A load that took two passes
  // showed a different page from a load that took one.
  //   The reset is the one fitContra already makes, made FIRST, so that
  // every pass measures what the first pass of a load measures and a
  // pass is a function of the page and nothing else. It is also what
  // lets the page be fitted in two stages: the second stage passes over
  // the first screen again, and must leave it exactly as the reader was
  // shown it.
  function resetContra() {
    [].forEach.call(document.querySelectorAll('.latest-cell--contra'), function (cell) {
      var title = cell.querySelector('.latest-title');
      var dek = cell.querySelector('.latest-dek');
      if (title) { title.style.fontSize = ''; if (title.__fullHTML) title.innerHTML = title.__fullHTML; }
      if (dek) { dek.style.fontSize = ''; if (dek.__fullHTML) dek.innerHTML = dek.__fullHTML; }
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
        Math.max(0, mb + (CONTRA_TITLE_DEK_GAP - now)).toFixed(2) + 'px';
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
      // (NOR THE HERO, 2026-09-22: its step was read off the title's
      // box, which the resting box carries over the picture's edge — so
      // a pass after a preview shut found no gap, wrote no step, and
      // the whole column stood 24 off the box seated for it. The words
      // are seated off absolute measures now; nothing wants the step.)
      var isMega = host.classList.contains('duo-half--mega');
      if (p.right <= t.left + 1) dx = (isPs || isMega) ? 0 : -24;
      else if (p.left >= t.right - 1) dx = (isPs || isMega) ? 0 : 24;
      // (NOR THE REVIEW, 2026-09-22, later: the same fault as the
      // hero's — its title rides a transform up onto the picture, so a
      // pass after a shut found them overlapping, wrote no step, and the
      // column stood 24 off the box seated for it.)
      else if (p.bottom <= t.top + 1) dy = host.classList.contains('latest-cell--contra') ? 0 : -24;
      else if (p.top >= t.bottom - 1) dy = host.classList.contains('latest-cell--contra') ? 0 : 24;
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
      // WHOLE PIXELS, OR THE EDGE IS A HAIRLINE (2026-09-19). These were
      // written to two decimals, so the block's edges fell inside a
      // pixel — 333.33 wide, a third of one. A part-covered pixel is
      // blended, and while everything rasterises together that blend is
      // invisible; the moment a neighbour is promoted to a compositing
      // layer of its own (a hover does it — a transform on the sliding
      // picture, a filter on the dimmed one) the block is rasterised
      // apart from what sits under it and the blended edge shows as a
      // hairline standing beside the words. It is rounded in the
      // VIEWPORT's frame, not the host's: the offsets stay fractional
      // so that left + offset lands on a whole number, which is where
      // the edge is actually painted. */
      var L = Math.round(l), R = Math.round(r), T = Math.round(top), B = Math.round(bot);
      host.style.setProperty('--hl-l', (L - h.left).toFixed(2) + 'px');
      host.style.setProperty('--hl-t', (T - h.top).toFixed(2) + 'px');
      host.style.setProperty('--hl-w', (R - L) + 'px');
      host.style.setProperty('--hl-h', (B - T) + 'px');
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
    // ONLY THE STILLNESS THIS PASS ADDS IS THIS PASS'S TO TAKE AWAY.
    // Run inside atRest (every close runs it there), the cards already
    // stand behind a .fit-still that atRest owns and needs until it
    // has reopened the cards it shut: stripping it here handed those
    // cards back with their transitions live, and every other open
    // preview slid open again each time one was closed.
    var hadStill = all.map(function (el) { return el.classList.contains('fit-still'); });
    all.forEach(function (el) { el.classList.add('fit-still'); el.classList.add('is-open'); });
    all.forEach(function (el) {
      var pic = el.querySelector('.latest-cover, .duo-card-image');
      el.__land = pic ? pic.getBoundingClientRect() : null;
    });
    all.forEach(function (el, i) { if (!wasOpen[i]) el.classList.remove('is-open'); });
    void document.body.offsetHeight;
    all.forEach(function (el, i) { if (!hadStill[i]) el.classList.remove('fit-still'); });

    [].forEach.call(document.querySelectorAll('.latest-cell--ps, .latest-cell--contra'), function (cell) {
      seat(cell, cell.querySelector('.latest-title'), cell.querySelector('.latest-cover-col'),
           [cell.querySelector('.latest-title'), cell.querySelector('.latest-dek'), cell.querySelector('.cover-meta')]);
    });
    [].forEach.call(document.querySelectorAll('.duo-half--mega'), function (half) {
      seat(half, half.querySelector('.card-title'), half.querySelector('.duo-card-image'),
           [].slice.call(half.querySelectorAll('.panel-col--left .card-title, .panel-col--left .card-dek, .panel-col--left .card-meta--line, .panel-col--left .cover-meta')));
    });
  }

  // THE SAME AIR AT ALL FOUR STEPS OF THE PLATE. The kicker's cap
  // stands 24 under the plate's top and CLOSE PREVIEW's baseline 24
  // over its foot (the paddings, style.css). The body keeps that same
  // 24 to each of them — kicker baseline to first cap, last baseline
  // to CLOSE PREVIEW's cap — read off the page with the pin probe and
  // trued out of the two couriers' margins: the outer step measured
  // IS the inner step's target, so the pairs match by construction.
  //
  // And the sub-row the cut could not fill widens neither of those any
  // more (it used to be dealt half to each, which is exactly what put
  // the body's air out of step with the couriers'). On the essay and
  // the postscript it goes INTO THE GAPS BETWEEN PARAGRAPHS, evenly,
  // so the writing spreads to fill the rows it was given; on the
  // review the PLATE gives it up and the PICTURE takes it — the plate
  // is exactly as tall as its whole rows and --plate-h / --pic-h-open
  // move by the same amount. (A plate with one paragraph has no gap to
  // give it to and falls back to half above, half below.)
  // 24 NOW, THE OUTER STEPS' OWN: the courier lines stand the same 24
  // off the body's ink as they stand off the plate's edges (they held
  // 36, a half more, for a while).
  var PLATE_INNER_GAP = 24;
  // ---------- THE PREVIEW STANDS IN A BOX OF THE MARK'S COLOUR ------
  // (2026-09-21) Drawn behind the curtain's content — the kicker, the
  // paragraphs, Close Preview — and out from it by the chip gap
  // (--chip-gap, style.css), the one measure the two chips of a byline
  // stand apart. PAINT ONLY: the curtain's own padding, which
  // seatPlateAir and cutPlates measure against, is not touched; the
  // four insets are read off it and written for a pseudo to paint.
  function seatPlateBox() {
    if (!PLATES_SHOWN) return;
    [].forEach.call(document.querySelectorAll('.plate-curtain'), function (cu) {
      var cs = getComputedStyle(cu);
      cu.style.setProperty('--pb-t', (parseFloat(cs.paddingTop) || 0).toFixed(2) + 'px');
      cu.style.setProperty('--pb-r', (parseFloat(cs.paddingRight) || 0).toFixed(2) + 'px');
      cu.style.setProperty('--pb-b', (parseFloat(cs.paddingBottom) || 0).toFixed(2) + 'px');
      cu.style.setProperty('--pb-l', (parseFloat(cs.paddingLeft) || 0).toFixed(2) + 'px');
      // …and out from the content by the card's own g where there is
      // one (the sheet falls back to the chip gap).
      var box = cu.parentElement;
      if (box && box.__g) cu.style.setProperty('--pb-gap', box.__g.toFixed(2) + 'px');
      else cu.style.removeProperty('--pb-gap');
      // …and the head and foot bands, as the title box has them: g
      // under the kicker's baseline, g over Close Preview's cap.
      var g2 = box && box.__g;
      var head = cu.querySelector('.plate-title'), more = cu.querySelector('.plate-more');
      var pr2 = box ? box.getBoundingClientRect() : null;
      var hs = g2 && head ? inkSpan(head) : null, ms = g2 && more ? inkSpan(more) : null;
      cu.style.setProperty('--pb-kt', (hs && pr2 ? Math.max(0, hs.bot + g2 - pr2.top) : 0).toFixed(2) + 'px');
      cu.style.setProperty('--pb-kb', (ms && pr2 ? Math.max(0, pr2.bottom - (ms.top - g2)) : 0).toFixed(2) + 'px');
      // THE CHIPS STAND IN THE FRAME as the byline does in the title's:
      // centred in the 54 (the paddings did that), and as far in from
      // the frame's near edge — the picture's side, which is the side
      // the picture has GONE to — as they stand from the band's top.
      var card = cu.closest('.duo-half--mega, .latest-cell--ps, .latest-cell--contra');
      var picLeft = card && card.classList.contains('pic-left');
      var picRight = card && card.classList.contains('pic-right');
      // A REVIEW'S TWO LINES SHARE ONE BAND (2026-09-22): the kicker at
      // its left, Close Preview at its right, each m in from the end.
      // The one the sheet takes out of the flow (THE REVIEW'S PLATE)
      // is stood on the other's line: its top is written here.
      var isContra = card && card.matches('.latest-cell--contra');
      var cur = cu.getBoundingClientRect();
      if (isContra && head && more) {
        var flowHead = getComputedStyle(head).position !== 'absolute';
        var lineEl = flowHead ? head : more;
        cu.style.setProperty(flowHead ? '--pb-head-t' : '--pb-more-t', (lineEl.getBoundingClientRect().top - cur.top).toFixed(2) + 'px');
      }
      [head, more].forEach(function (el) {
        if (!el) return;
        el.classList.remove('rb-x'); el.style.removeProperty('--rb-dx');
        if (!pr2 || (!picLeft && !picRight && !isContra)) return;
        var ed = inkEdges(el);
        if (!ed) return;
        var lhE = oneLine(el);
        var m = Math.max(0, (REST_INSET - lhE) / 2);
        var padX = CHIP_PAD_EM * (parseFloat(getComputedStyle(el).fontSize) || 13);
        // picture left of the words at rest → it has gone RIGHT, the near
        // edge is the plate's right
        var dx;
        if (isContra) dx = el === head ? (pr2.left + m) - (ed.l - padX) : (pr2.right - m) - (ed.r + padX);
        else dx = picLeft ? (pr2.right - m) - (ed.r + padX) : (pr2.left + m) - (ed.l - padX);
        el.style.setProperty('--rb-dx', dx.toFixed(2) + 'px');
        el.classList.add('rb-x');
      });
    });
  }
  // ---------- THE PREVIEW KEEPS THE TITLE BOX'S MEASURES (2026-09-21)
  // g is the card's own title-to-dek gap (as seatMatterMeta reads it):
  // the plate's top and foot pads are g, and the kicker stands 2g over
  // the body's first cap, Close Preview 2g under its last baseline —
  // the box the fitter draws round the words (seatPlateBox) then pads
  // by g as the title's does. WRITTEN BEFORE THE CUT: cutPlates reads
  // the plate's paddings and the two courier lines' margins to know
  // how many rows it has, and seatPlateAir seats the same margins
  // exactly afterwards, so all three agree. (cutPlates owns a
  // .latest-plate's padding-bottom — it is the floor's remainder —
  // and only the hero's is stated here.)
  var PLATES = '.latest-cell--ps .latest-plate, .latest-cell--contra .latest-plate, .duo-half--mega .card-preview-block';
  // WHERE THE PICTURE RESTS (2026-09-22, evening): a pass that runs on
  // an open card reads the picture where it has slid to, and seated
  // the title's box against THAT — so the box was wrong until the
  // pass after the close. The picture's rect less its own transform
  // is where it rests.
  function restRect(el) {
    var r = el.getBoundingClientRect();
    var tf = getComputedStyle(el).transform;
    var m = /matrix\(([^)]+)\)/.exec(tf || '');
    if (!m) return r;
    var v = m[1].split(',').map(parseFloat);
    var tx = v[4] || 0, ty = v[5] || 0;
    return { left: r.left - tx, right: r.right - tx, top: r.top - ty, bottom: r.bottom - ty, width: r.width, height: r.height };
  }
  // THE CHIPS' AIR IS DOUBLED (2026-09-22): the block round a Roboto
  // chip in a card stands 0.64 of the type off the ink (the sheet's
  // --hl-pad for these; 0.32 everywhere else), and every seat that
  // reckons from a block's edge reckons with it.
  var CHIP_PAD_EM = 0.64;
  // A courier line's height as ONE line — the sheet's line-height —
  // whatever it happens to be wrapped to when asked.
  function oneLine(el) {
    if (!el) return 18.2;
    var lh = parseFloat(getComputedStyle(el).lineHeight);
    return lh > 0 ? lh : (el.getBoundingClientRect().height || 18.2);
  }
  function matterGap(card) {
    if (!card) return 0;
    // The gap is STATED, not measured: TITLE_DEK_GAP for the heroes and
    // the postscripts (fitMatterInk seats it), CONTRA_TITLE_DEK_GAP for
    // the reviews (fitContra) — so this can run before either has.
    return card.matches('.latest-cell--contra') ? CONTRA_TITLE_DEK_GAP : TITLE_DEK_GAP;
  }
  // The two courier lines' margins, ink to ink, at 2g. Called wherever
  // a plate's HTML has just been put back (the cuts restore the full
  // text, and the fresh lines carry the sheet's margins, not these).
  function plateInner(box) {
    var g = box.__g;
    if (!g) return;
    var head = box.querySelector('.plate-title');
    var more = box.querySelector('.plate-more');
    var paras = [].filter.call(box.querySelectorAll('.latest-plate-p, .card-preview'), function (p) {
      return getComputedStyle(p).display !== 'none' && p.getBoundingClientRect().height > 0;
    });
    if (!paras.length) return;
    var pin = function (el, atStart) {
      var sp = document.createElement('span');
      sp.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;';
      if (atStart) el.insertBefore(sp, el.firstChild); else el.appendChild(sp);
      var y = sp.getBoundingClientRect().top;
      sp.remove();
      return y;
    };
    // THE PREVIEW IS THE RESTING BOX'S TWIN (2026-09-21, last): its
    // blue stands REST_INSET inside the plate's top and foot and holds
    // the body with REST_PAD; the kicker is centred in the 54 above,
    // Close Preview in the 54 below. So the body's first cap stands
    // I + P under the plate's top, and its last baseline I + P over
    // the foot with Close Preview's cap centred in the band beneath.
    var I = REST_INSET, P = REST_PAD;
    // a review's head is its FAR side (the band's): the box's 54 past
    // the ink there, not the 36
    // ALL FOUR MARGINS ARE 54 (2026-09-22, night): the head's and the
    // foot's the same as the sides' — the body is centred in its box.
    var PH = REST_FAR, PF = REST_FAR;
    var bb = box.getBoundingClientRect();
    var headAbs = head && getComputedStyle(head).position === 'absolute';
    var moreAbs = more && getComputedStyle(more).position === 'absolute';
    if (headAbs) {
      // the kicker stands in the foot's band (a turned-over review):
      // the body's first cap on the plate's head, the picture's edge
      paras[0].style.marginTop = '';
      var c0 = pin(paras[0], true) - capAscent(paras[0]);
      var mt0 = parseFloat(getComputedStyle(paras[0]).marginTop) || 0;
      paras[0].style.marginTop = (mt0 + (bb.top - c0)).toFixed(2) + 'px';
    } else if (head) {
      head.style.marginBottom = '';
      var hBase = pin(head, false);
      var b = (pin(paras[0], true) - capAscent(paras[0])) - hBase;
      var wantB = (bb.top + I + PH) - hBase;
      var mb = parseFloat(getComputedStyle(head).marginBottom) || 0;
      head.style.marginBottom = Math.max(0, mb + (wantB - b)).toFixed(2) + 'px';
    }
    if (more && !moreAbs) {
      more.style.marginTop = '';
      var lastP = paras[paras.length - 1];
      var c = (pin(more, true) - capAscent(more)) - pin(lastP, false);
      var wantC = I / 2 + PF - capAscent(more) / 2;
      var mt = parseFloat(getComputedStyle(more).marginTop) || 0;
      more.style.marginTop = Math.max(0, mt + (wantC - c)).toFixed(2) + 'px';
    }
  }
  function seatPlateMargins() {
    if (!PLATES_SHOWN) return;
    [].forEach.call(document.querySelectorAll(PLATES), function (box) {
      var card = box.closest('.duo-half--mega, .latest-cell--ps, .latest-cell--contra');
      var g = matterGap(card);
      box.__g = g || null;
      // (NO GAP, NO VERTICAL SEAT — but the sides are seated all the same:
      // this returned before them, and a plate whose card read no gap
      // kept whatever sides an earlier pass had left it, 2026-09-22)
      if (!g) { box.style.paddingTop = ''; if (!box.classList.contains('latest-plate')) box.style.paddingBottom = ''; }
      var head0 = box.querySelector('.plate-title');
      // ONE LINE'S HEIGHT, not the box's (2026-09-21, night): a kicker
      // that was wrapped to two lines when this ran — the plate not yet
      // at its width — halved the pad and stood the line 8 high in its
      // band once it was one line again.
      var lh = g ? oneLine(head0) : 0;
      var padV = Math.max(0, (REST_INSET - lh) / 2);
      // (a turned-over review's band is at its FOOT: the head is the
      // picture's edge and takes no pad — THE REVIEW'S PLATE)
      var rev = card.matches('.latest-cell--contra-rev');
      if (g) {
        box.style.paddingTop = (rev ? 0 : padV).toFixed(2) + 'px';
        if (!box.classList.contains('latest-plate')) box.style.paddingBottom = padV.toFixed(2) + 'px';
      }
      // …and the words' column stands I + P in from the blue's edge on
      // the picture's side (the side the picture has gone to), as it
      // does from the top: the curtain's own padding there is stated.
      var cu = box.querySelector('.plate-curtain');
      if (cu) {
        // the picture's side by GEOMETRY — fitSlideSlots writes pic-left /
        // pic-right later in the pass than this runs
        var side = null;
        if (!card.matches('.latest-cell--contra')) {
          var cv0 = card.querySelector('.duo-card-image, .latest-cover-col, .latest-cover');
          // (the words' COLUMN, not the title: the title rides a
          // transform over the picture's edge, and on a narrow postscript
          // its middle read on the picture's side — the body's pads went
          // to the wrong sides, 2026-09-22)
          var tt0 = card.querySelector('.duo-panel .panel-col--left, :scope > .latest-col') || card.querySelector('.card-title, .latest-title');
          // (the card's own side class first, where a pass has written
          // it — a section taken out of layout reads every box as zero,
          // and zero against zero put the pads on the wrong sides)
          if (card.classList.contains('pic-left')) side = 'paddingRight';
          else if (card.classList.contains('pic-right')) side = 'paddingLeft';
          else if (cv0 && tt0) {
            var c0 = restRect(cv0), t0 = tt0.getBoundingClientRect();
            if (c0.width && t0.width) side = (c0.left + c0.right) / 2 < (t0.left + t0.right) / 2 ? 'paddingRight' : 'paddingLeft';
          }
        }
        try { (window.__ncSideDbg = window.__ncSideDbg || []).push([card.className.slice(0, 50), side, !!cv0, !!tt0]); } catch (e) {}
        cu.style.removeProperty('padding-left'); cu.style.removeProperty('padding-right');
        // …the ink ON the picture's edge, as the title's is (the blue
        // reaches 54 past it onto the picture): no pad on that side.
        // A review's plate, with no picture beside, keeps I + P.
        // …and on the far side the box's own 54 past the ink (REST_FAR),
        // as the title box keeps; a review's plate keeps I + P each side
        var inPad = (REST_INSET + PLATE_BODY_PAD) + 'px';
        // (the box's far inset is 36 on these plates — style.css, THE FAR
        // INSET IS 36 — so the body keeps the width it had: 36 + 54)
        // THE BODY STANDS 36 INSIDE ITS BOX ON EVERY SIDE (2026-09-22):
        // on the far side the box's inset (REST_FAR) and 36; on the
        // picture's side the box reaches REST_OVERLAP over the edge, so
        // the body reaches past the plate's edge by all but 36 of it
        // (--pb-reach, a negative margin the sheet puts on that side).
        var farPadN = REST_FAR + PLATE_BODY_PAD;
        cu.style.removeProperty('--pb-nl'); cu.style.removeProperty('--pb-nr');
        if (side) cu.style.setProperty(side === 'paddingRight' ? '--pb-nr' : '--pb-nl', (-(REST_OVERLAP - PLATE_BODY_PAD)).toFixed(2) + 'px');
        // THE HERO'S BODY IS AS NARROW AS A POSTSCRIPT'S (2026-09-22,
        // night): its plate is wider than a postscript's column, and its
        // far pad grows by the difference so the measure of its lines is
        // the postscript's (the box's far inset with it, --pb-f-in, so
        // the box still ends 54 past the ink).
        cu.style.removeProperty('--pb-f-in');
        // (STRUCK 2026-09-22, later: the essay's body keeps the box's 72
        // on its far side as on its near — the far margin matches the
        // inset — and so runs as wide as its box allows.)
        if (false && card.matches('.duo-half--mega')) {
          var psCol = document.querySelector('.latest-cell--ps .latest-col');
          var psW = psCol ? psCol.getBoundingClientRect().width : 0;
          // (the title column's width, not the plate's — the plate's slot
          // is dealt later in the pass than this runs)
          var myCol = card.querySelector('.panel-col--left');
          var myW = myCol ? myCol.getBoundingClientRect().width : 0;
          if (psW > 0 && myW > psW) {
            farPadN = farPadN + (myW - psW);
            cu.style.setProperty('--pb-f-in', (farPadN - REST_FAR).toFixed(2) + 'px');
          }
        }
        var farPad = farPadN.toFixed(2) + 'px';
        if (side) { cu.style[side] = '0px'; cu.style[side === 'paddingLeft' ? 'paddingRight' : 'paddingLeft'] = farPad; }
        else { cu.style.paddingLeft = inPad; cu.style.paddingRight = inPad; }
      }
      plateInner(box);
    });
  }

  function seatPlateAir() {
    if (!PLATES_SHOWN) return;
    [].forEach.call(document.querySelectorAll(
      '.latest-cell--ps .latest-plate, .latest-cell--contra .latest-plate, .duo-half--mega .card-preview-block'),
      function (box) {
        var head = box.querySelector('.plate-title');
        var more = box.querySelector('.plate-more');
        if (head) { head.style.marginTop = ''; head.style.marginBottom = ''; }
        if (!more) return;
        more.style.marginTop = '';
        var paras = [].filter.call(box.querySelectorAll('.latest-plate-p, .card-preview'), function (p) {
          return getComputedStyle(p).display !== 'none' && p.getBoundingClientRect().height > 0;
        });
        if (!paras.length) return;
        // The gaps between paragraphs back to one slot (the cut set
        // them there; a pass before this one may have widened them).
        var unit = parseFloat(getComputedStyle(paras[0]).lineHeight) || 19.2;
        // (Or to the gap the cut chose, where it pulled them in to
        // seat a straddling paragraph's first line — cutPlates.)
        var gap0 = (box.__gap != null) ? box.__gap : unit;
        paras.forEach(function (p, i) { if (i) p.style.marginTop = gap0.toFixed(3) + 'px'; });
        // The essay's paragraphs stand in a column box cut to its rows
        // (overflow hidden): it must grow by whatever the gaps take.
        var cols = box.querySelector('.card-preview-cols');
        var cols0 = cols && cols.style.height ? parseFloat(cols.style.height) : null;
        var bb = box.getBoundingClientRect();
        if (!bb.height) return;
        var padB = parseFloat(getComputedStyle(box).paddingBottom) || 0;
        var floor = bb.bottom - padB;
        // The pin at the element's OWN first or last node — not
        // baselineOf's, which walks down into the first element child
        // and, on a paragraph that opens with plain text and carries an
        // <em> further on, reads the em's line rather than the first.
        var pinAt = function (el, atStart) {
          var s = document.createElement('span');
          s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;';
          if (atStart) el.insertBefore(s, el.firstChild); else el.appendChild(s);
          var y = s.getBoundingClientRect().top;
          s.remove();
          return y;
        };
        // The outer two steps AS THE PADDINGS PRINT THEM: the kicker's
        // cap under the plate's top; and the foot pad plus CLOSE
        // PREVIEW's own hand below its baseline — NOT the distance from
        // its baseline to the plate's foot, which still carries the
        // unfilled remainder at this point and would put it into C.
        var A = head ? (pinAt(head, true) - capAscent(head)) - bb.top : null;
        var D = padB + (more.getBoundingClientRect().bottom - pinAt(more, false));
        // THE TWO INNER STEPS STAND 24 OF INK — kicker baseline to the
        // first line's cap, last baseline to CLOSE PREVIEW's cap — the
        // same as the outer 24s the paddings print (A and D). The
        // stylesheet's margins on the two courier lines carry the same
        // 24 as a budget for the cut; this seats it exactly.
        // THE SAME SEAT AS THE CUT'S (2026-09-21, last): plateInner puts
        // the body's first cap I + P under the plate's top and Close
        // Preview's cap centred in the foot's 54, for the plates
        // seatPlateMargins measured; the 24s stand for any other.
        if (box.__g) {
          plateInner(box);
          // AND CLOSE PREVIEW IS CENTRED IN THE FOOT'S 54 EXACTLY: the
          // plate's own foot pad is not the fitter's to state on every
          // plate (cutPlates owns a .latest-plate's), so the line is
          // measured where it landed and its margin takes the
          // difference — a pixel or so, downward, inside the plate.
          var mBase = pinAt(more, false), mCap = capAscent(more);
          var mMid = mBase - mCap / 2;
          var wantMid = bb.bottom - REST_INSET / 2;
          var dMid = wantMid - mMid;
          if (Math.abs(dMid) > 0.1 && more.getBoundingClientRect().bottom + dMid <= bb.bottom) {
            more.style.marginTop = ((parseFloat(more.style.marginTop) || 0) + dMid).toFixed(2) + 'px';
          }
        } else {
          var INNER = PLATE_INNER_GAP;
          if (head && A !== null && isFinite(A)) {
            var b = (pinAt(paras[0], true) - capAscent(paras[0])) - pinAt(head, false);
            var mb = parseFloat(getComputedStyle(head).marginBottom) || 0;
            head.style.marginBottom = Math.max(0, mb + (INNER - b)).toFixed(2) + 'px';
          }
          var lastP = paras[paras.length - 1];
          var c = (pinAt(more, true) - capAscent(more)) - pinAt(lastP, false);
          var mt = parseFloat(getComputedStyle(more).marginTop) || 0;
          more.style.marginTop = Math.max(0, mt + (INNER - c)).toFixed(2) + 'px';
        }
        var moreOut = getComputedStyle(more).position === 'absolute';
        // (where Close Preview stands in the head's band the foot is
        // the picture's edge, and the body's last line sits ON it: the
        // plate ends at that line, no pad under it)
        var rem = moreOut ? (bb.bottom - paras[paras.length - 1].getBoundingClientRect().bottom) : (floor - more.getBoundingClientRect().bottom);
        if (moreOut) box.style.paddingBottom = '0px';
        if (rem < 0.5) return;
        var cell = box.closest('.latest-cell--contra');
        if (cell) {
          // THE REVIEW: the plate shortens by the remainder and the
          // picture lengthens by it — the two still tile the cell.
          var plateH = parseFloat(cell.style.getPropertyValue('--plate-h'));
          var picH = parseFloat(cell.style.getPropertyValue('--pic-h-open'));
          if (!isFinite(plateH) || !isFinite(picH)) return;
          cell.style.setProperty('--plate-h', (plateH - rem).toFixed(2) + 'px');
          cell.style.setProperty('--pic-h-open', (picH + rem).toFixed(2) + 'px');
          if (cell.classList.contains('latest-cell--contra-rev')) {
            var pt = parseFloat(cell.style.getPropertyValue('--plate-top')) || 0;
            cell.style.setProperty('--plate-top', (pt + rem).toFixed(2) + 'px');
          } else {
            cell.style.setProperty('--pic-top-open', (plateH - rem).toFixed(2) + 'px');
          }
          return;
        }
        if (paras.length > 1) {
          var add = rem / (paras.length - 1);
          paras.forEach(function (p, i) { if (i) p.style.marginTop = (gap0 + add).toFixed(2) + 'px'; });
          if (cols && cols0 !== null) cols.style.height = (cols0 + rem).toFixed(2) + 'px';
        } else {
          var half = rem / 2;
          if (head) head.style.marginBottom = ((parseFloat(head.style.marginBottom) || 0) + half).toFixed(2) + 'px';
          more.style.marginTop = ((parseFloat(more.style.marginTop) || 0) + (rem - half)).toFixed(2) + 'px';
        }
      });
  }
  // THE BANDS' DEKS CENTRE BY INK. The grid centres each dek's LINE
  // BOX in the band; the ink sits differently inside that box for the
  // italic list (Garamond, 20) and the courier (13, capitals), so each
  // dek is nudged by the difference between its line box's centre and
  // its ink's (cap top to baseline for capitals, x-height for the rest,
  // from canvas metrics of its own face) — the same correction the
  // masthead's dek band takes.
  function inkCenterDeks() {
    var deks = [].slice.call(document.querySelectorAll('.section-band > p'));
    deks.forEach(function (dek) { dek.style.top = ''; });
    // MEASURED WHERE IT PRINTS: the baseline is read off the page with a
    // zero-size inline-block probe (it sits on the baseline by default),
    // NOT estimated from the line-height — an inline's rect is the
    // font's content area, not the line box, and the estimate that
    // confused the two pushed the Garamond up nearly 4px. The ink's
    // centre is then the cap band's middle for capitals, and for mixed
    // case the mean of the cap band's middle and the x band's — the
    // list's mass is lowercase, its words all open with a capital.
    var seats = deks.map(function (dek) {
      var band = dek.parentElement;
      var probe = dek.querySelector('a, span') || dek;
      var cs = getComputedStyle(probe);
      var ctx = measureCtx;
      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var caps = cs.textTransform === 'uppercase';
      var H = ctx.measureText('H').actualBoundingBoxAscent;
      var x = ctx.measureText('x').actualBoundingBoxAscent;
      var pin = document.createElement('span');
      pin.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
      probe.appendChild(pin);
      var base = pin.getBoundingClientRect().top;
      probe.removeChild(pin);
      // ON THE CAP BLOCK FOR EVERY CASE (2026-09-18): the mixed-case
      // Garamond was seated between its cap band's middle and its x
      // band's, which put its baseline 1.8 under the courier date's and
      // read uneven against the date, NEW and the miniature, all three
      // on their caps. The mean of cap and x is struck; caps and
      // baseline stand equidistant from the band's edges, as they do.
      var above = H / 2;
      void x;
      var inkMid = base - above;
      var bb = band.getBoundingClientRect();
      return (bb.top + bb.height / 2) - inkMid;
    });
    deks.forEach(function (dek, i) {
      var shift = seats[i];
      if (shift === null || Math.abs(shift) < 0.05) return;
      if (getComputedStyle(dek).position === 'static') dek.style.position = 'relative';
      dek.style.top = shift.toFixed(2) + 'px';
    });
  }

  // ---------- THE MIDDLE SLOT BETWEEN THE DEKS ----------
  // The band's middle line — the courier: the date, the section's own
  // line, the copyright — stands at the midpoint of the two outer
  // deks' INK: the right edge of the left dek's last line and the left
  // edge of the right dek's first, not the band's own centre. The name
  // in Garamond on the left and the list on the right seldom measure
  // alike, so the centre of the band is not the centre of the space
  // between them. The grid has already centred the middle in the
  // column between the two; this is the difference, carried as a
  // relative nudge. (It replaces the seat the bird used to take.)
  var inkEdge = function (el, side) {
    var rg = document.createRange(); rg.selectNodeContents(el);
    var rs = [].slice.call(rg.getClientRects()).filter(function (r) { return r.width; });
    if (!rs.length) return null;
    return side === 'right'
      ? Math.max.apply(null, rs.map(function (r) { return r.right; }))
      : Math.min.apply(null, rs.map(function (r) { return r.left; }));
  };
  function seatBandMid() {
    [].forEach.call(document.querySelectorAll('.section-band'), function (band) {
      var deks = [].slice.call(band.querySelectorAll(':scope > p'));
      if (deks.length < 3) return;
      var mid = deks[1];
      mid.style.left = '';
      var l = inkEdge(deks[0], 'right'), r = inkEdge(deks[deks.length - 1], 'left');
      var a = inkEdge(mid, 'left'), z = inkEdge(mid, 'right');
      if (l === null || r === null || a === null || z === null || r <= l) return;
      var shift = ((l + r) / 2) - ((a + z) / 2);
      if (Math.abs(shift) < 0.05) return;
      if (getComputedStyle(mid).position === 'static') mid.style.position = 'relative';
      mid.style.left = shift.toFixed(2) + 'px';
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
  // THE PLATE MEETS THE PICTURE. The slot used to stop 72 short of the
  // artwork's landed edge, so the open card kept a strip of ground
  // between the two; the plate is a white panel now and it runs to the
  // picture's edge — the 48 the body keeps from the artwork is the
  // plate's own side padding (style.css), the same air the words'
  // block keeps inside its edges.
  var SLIDE_GUTTER = 0;
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
      // WHICH SIDE THE ARTWORK IS ON, for the controls' marks: READ
      // PREVIEW's arrow and CLOSE PREVIEW's x point at the picture
      // (style.css prints them as pseudo-elements off these classes).
      host.classList.toggle('pic-left', onLeft);
      host.classList.toggle('pic-right', !onLeft);
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

  // A RULE BETWEEN THE TITLE AND THE DEK (2026-09-18), drawn as the
  // card's own top and foot rules are: one pixel in the ink, running
  // PAST THE INK IT DIVIDES BY THE 24 those rules run past the courier
  // and the kicker, and standing the same 24 clear of the type on each
  // side — the distance the courier itself keeps from the rule above
  // it and the rule below. So the title's baseline, 24, the rule, 24,
  // the dek's cap: the one joint in the matter that opens to 49 where
  // every other stays at the plain 24. The fitter writes three
  // measures on the title and the sheet paints them (style.css, A RULE
  // BETWEEN THE TITLE AND THE DEK); until it has, the rule has no
  // width.
  var TITLE_RULE_PAD = 24;
  var TITLE_RULE_W = 1;
  // THE RULE IS STRUCK (2026-09-19, style.css: THE CARDS GIVE UP THEIR
  // RULES) along with the card's own two, and the joint it opened
  // closes behind it: 24, a rule, 24 was room made FOR the rule, and
  // with nothing standing in it the title and the dek would have been
  // held 49 apart for no reason the reader could see. The measures
  // below are still taken and still written — the sheet simply paints
  // none of them — so the rule can be asked for again without being
  // measured again.
  var TITLE_DEK_RULE = TITLE_DEK_GAP;
  // The far ends of an element's painted ink across ALL its lines — a
  // ragged block's widest reach, which is what the rule is cut to.
  function inkEdges(el) {
    if (!el || getComputedStyle(el).display === 'none') return null;
    var r = document.createRange();
    r.selectNodeContents(el);
    var rs = [].filter.call(r.getClientRects(), function (x) { return x.width > 0 && x.height > 0; });
    if (!rs.length) return null;
    var l = Infinity, rr = -Infinity;
    for (var i = 0; i < rs.length; i++) { l = Math.min(l, rs[i].left); rr = Math.max(rr, rs[i].right); }
    // A letter-spaced line carries its spacing after the last glyph too.
    var ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
    return { l: l, r: rr - ls };
  }

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
    // (the lines that print: a title squeezed into a narrow column can
    // leave a line with nothing in it — 2026-09-23)
    var lines = [].filter.call(el.querySelectorAll('.title-line'), function (ln) {
      var rg = document.createRange(); rg.selectNodeContents(ln);
      return [].some.call(rg.getClientRects(), function (r) { return r.height; });
    });
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
                  dek: half.querySelector('.panel-col--left .card-dek'),
                  // ONE COLUMN ON A PHONE (2026-09-24): this title and dek
                  // are kept for their measures and never printed. On a
                  // phone an essay's pull quote runs a dozen lines in the
                  // narrow old column, the title yielded to half a pixel,
                  // and seatMatterMeta found no title to hang the picture
                  // on; there the title keeps its size and the words run
                  // on past the frame, where nobody sees them.
                  keep: ONE_COL.matches });
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
        return t.ink + (d ? TITLE_DEK_RULE + d.ink : 0) + (m ? TITLE_DEK_GAP + m.ink : 0) + (dt ? TITLE_DEK_GAP + dt.ink : 0);
      };
      var span = pb.height;
      var total = block();
      if (total === null) return;
      // AND WHERE THE WORDS OUTRUN THE PICTURE, THE TITLE YIELDS: its
      // lines (the poster's .title-line spans, or the title itself)
      // step down together by the share of their ink the block is
      // over, until it fits. The panel fitter re-fills the title every
      // pass, so the step-down is paid fresh rather than compounding.
      if (total > span && !j.keep) {
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
        return t ? t.ink + (d ? TITLE_DEK_RULE + d.ink : 0) : null;
      };
      var room = bandBot - bandTop;
      var midH = mid();
      if (midH === null) return;
      if (midH > room && !j.keep) {
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
        cap += TITLE_DEK_RULE;
        j.dek.style.position = 'relative';
        j.dek.style.top = ((parseFloat(j.dek.style.top) || 0) + (cap - d.top)).toFixed(2) + 'px';
      }
      // THE RULE IN THE JOINT, read where both blocks finally landed.
      // ITS LINE is 24 under the title's baseline (the dek's cap the
      // same 24 under it).
      // ITS LENGTH is the card's own two rules, measured NOT whole —
      // they cross the picture, and the whole of either is longer than
      // the column the title stands in — but by the TAIL each one
      // leaves over its courier: from the picture's edge, where the
      // rule comes off the artwork, out to the end of its cut, which
      // is the 24 past the byline's ink on the top and past READ
      // PREVIEW's on the foot. The shorter of those two tails, less
      // one more 24. (The arithmetic lands it at the shorter courier's
      // own ink plus a single reach — about 114 at this width.)
      // ITS SEAT is the picture's edge, the end the two tails start
      // from, so the three lines range flush on that side and step in:
      // the longer courier's tail, the shorter's, and this.
      // Written against the title's own box, which the seat above
      // positions, so the rule travels with it.
      (function () {
        j.title.style.removeProperty('--tdr-top');
        j.title.style.removeProperty('--tdr-left');
        j.title.style.removeProperty('--tdr-w');
        if (!d) return;
        var ti = inkSpan(j.title);
        if (!ti) return;
        var au = inkEdges(j.meta && j.meta !== j.date ? j.meta : null);
        var pkEl = j.date ? (j.date.querySelector('.peek-open') || j.date) : null;
        var pk = inkEdges(pkEl);
        if (!au || !pk) return;
        var cell = j.title.closest('.duo-half--mega, .latest-cell--ps');
        if (!cell) return;
        // WHICH SIDE THE PICTURE STANDS ON, by the class that decides it
        // — the hero's card carries the turn, the postscript's cell does
        // — and NOT by reading the picture's box: this pass runs before
        // the one that gives the hero's frame its last 24, so a box read
        // here is 24 out on those cards and was throwing both the length
        // and the seat.
        var picLeft = cell.classList.contains('duo-half--mega')
          ? !!(cell.closest('.card') && cell.closest('.card').classList.contains('card--mega-rev'))
          : cell.classList.contains('pic-left');
        // THE PICTURE'S EDGE WITHOUT THE PICTURE: the column stands 24
        // off it (THE COLUMN STANDS 24 FROM THE PICTURE, style.css), so
        // the couriers' own aligned ink, less that 24, IS the edge —
        // read in the same tick as the ink the tails are cut from.
        var edge = picLeft
          ? Math.min(au.l, pk.l) - TITLE_RULE_PAD
          : Math.max(au.r, pk.r) + TITLE_RULE_PAD;
        var tailTop = picLeft ? (au.r + RULE_REACH) - edge : edge - (au.l - RULE_REACH);
        var tailFoot = picLeft ? (pk.r + RULE_REACH) - edge : edge - (pk.l - RULE_REACH);
        var len = Math.min(tailTop, tailFoot) - TITLE_RULE_PAD;
        if (!(len > 0)) return;
        var tb = j.title.getBoundingClientRect();
        var L = picLeft ? edge : edge - len;
        j.title.style.setProperty('--tdr-top', (ti.top + ti.ink + TITLE_RULE_PAD - tb.top).toFixed(2) + 'px');
        j.title.style.setProperty('--tdr-left', (L - tb.left).toFixed(2) + 'px');
        j.title.style.setProperty('--tdr-w', len.toFixed(2) + 'px');
      })();
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
  // NO PASS LANDS ON A CARD IN FLIGHT. atRest shuts every open card,
  // cancels every animation under it, measures, and reopens it behind
  // a forced layout — right for a page at rest, and a pop in place of
  // the slide if it lands during the .4s the picture is travelling.
  // The passes have many triggers (fonts landing, the hero image, the
  // window, a resize, the card's own close), and any of them can fall
  // inside an open. So every pass waits until the last open or close
  // (card-open.js stamps window.__ncTravel) is TRAVEL behind it, and a
  // fresh toggle in the meantime re-arms the wait. Same function, same
  // timer: a pass asked for three times while a card travels runs once.
  // .4 release + .6 travel + .4 arrival (style.css, THE RELEASE AND THE
  // ARRIVAL), and a little
  var TRAVEL = 1050; // (one fluid second since 2026-09-22; 1.4 in three moves before)
  function whenStill(fn) {
    // No stamp yet — nothing has ever opened — is the page at rest, not
    // a card that opened at t=0: the first pass must not wait on it.
    if (!window.__ncTravel) { fn(); return; }
    var left = TRAVEL - (performance.now() - window.__ncTravel);
    if (left <= 0) { fn(); return; }
    if (fn.__still) clearTimeout(fn.__still);
    fn.__still = setTimeout(function () { fn.__still = null; whenStill(fn); }, left + 16);
  }
  // THE SPACER UNDER EACH SECTION WORD FILLS THE SCREEN: the word
  // pinned at the top plus the spacer under it make one viewport of
  // charcoal, so the band arrives at the fold's foot the way the
  // masthead's does. Its height is the viewport less the word's own,
  // read off the word once it is fitted; it is rounded DOWN to a whole
  // pixel and starts a pixel up under the word, so no fractional seam
  // between the two lets the ground through.
  function fitWordSpacers() {
    [].forEach.call(document.querySelectorAll('.word-spacer'), function (sp) {
      var word = sp.previousElementSibling;
      if (!word || !word.classList.contains('page-banner')) return;
      var band = sp.nextElementSibling;
      var bandH = (band && band.classList.contains('section-band')) ? band.getBoundingClientRect().height : 72;
      // less the band too: the band stands ON the fold's foot, in view,
      // the moment the word pins — as the masthead's does.
      var h = window.innerHeight - word.getBoundingClientRect().height - bandH;
      sp.style.height = Math.max(0, Math.floor(h) + 1).toFixed(0) + 'px';
      sp.style.marginTop = '-1px';
    });
  }
  // THE CARD RULES RUN FROM THE COURIER'S INK TO THE PICTURE'S FAR EDGE
  // (2026-09-17). On the essay heroes and the postscript cells each rule
  // is two pieces whose union is the line: a FIXED piece from the far
  // edge of the courier line's ink ("WILL DIANA · SEP 16") to the far
  // edge of the body preview's kicker (the ink of whichever stands on
  // the plate — the kicker line, or the first paragraph where a post
  // has none), and a piece drawn on the picture's own top edge that
  // travels with it (style.css). Shut, the picture stands on the far
  // side and the union runs courier-to-picture-edge; open, it has
  // slid across and the union runs picture-edge-to-kicker; between,
  // the picture's edge picks the line up and carries it, never ahead
  // of it. The foot rule is the same between READ PREVIEW and CLOSE
  // PREVIEW. This writes the fixed piece as clip insets of the rule
  // pseudo-elements' own boxes, which run from the picture's far edge
  // on one side to the box's on the other (the hero's box 24 past).
  // THE MARGIN STACK IS SEATED BY INK (2026-09-17): LIGHT, a dash,
  // DARK, a dash, HEX — five lines of 13, and in a 13 line the caps'
  // ink and the dash's do not centre alike (the dash rides at the
  // x-height's middle, the caps stand on the baseline), so the gaps
  // read uneven. Each word's and each dash's painted ink is scanned
  // off a canvas and the line shifted until that ink's middle is its
  // line's middle.
  function fitToggle() {
    var spans = document.querySelectorAll('.theme-toggle > span, .social-stack > span');
    if (!spans.length) return;
    var W = 600, H = 200, scan = 100, y0 = 120;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    if (!g) return;
    [].forEach.call(spans, function (el) {
      el.style.top = '';
      var cs = getComputedStyle(el);
      var size = parseFloat(cs.fontSize) || 0;
      var text = (el.textContent || '').trim();
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      if (!size || !text) return;
      g.clearRect(0, 0, W, H);
      g.font = cs.fontWeight + ' ' + scan + 'px ' + cs.fontFamily;
      g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
      g.fillText(text, 10, y0);
      var data;
      try { data = g.getImageData(0, 0, W, H).data; } catch (e) { return; }
      var topRow = -1, botRow = -1;
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
          if (data[(y * W + x) * 4 + 3] > 40) { if (topRow < 0) topRow = y; botRow = y; break; }
        }
      }
      if (topRow < 0) return;
      var midAboveBase = (y0 - (topRow + botRow + 1) / 2) / scan * size;
      var probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.appendChild(probe);
      var base = probe.getBoundingClientRect().bottom;
      el.removeChild(probe);
      var box = el.getBoundingClientRect();
      var inkMid = base - midAboveBase;
      el.style.position = 'relative';
      el.style.top = (box.top + box.height / 2 - inkMid).toFixed(2) + 'px';
    });
  }
  // THE RULES RUN 24 PAST THE COURIER (2026-09-18): the courier stands
  // 24 off the picture, and each fixed rule now carries the same 24
  // past the far end of the line it is cut to — past the byline and
  // READ PREVIEW on the words' side, past the kicker and CLOSE PREVIEW
  // on the plate's, and past both ends of the one line on a review
  // cell. Never past the rule's own box: the cut stops at 0.
  var RULE_REACH = 24;
  function fitCardRules() {
    var cards = document.querySelectorAll('main.has-mega .duo-half--mega, main.has-mega .latest-cell--ps, main.has-mega .latest-cell--contra');
    function inkEdge(node, side) {
      if (!node) return null;
      var r = document.createRange();
      r.selectNodeContents(node);
      var b = r.getBoundingClientRect();
      if (!b.width) return null;
      if (side === 'left') return b.left;
      // A letter-spaced line carries its spacing after the last glyph too.
      var ls = parseFloat(getComputedStyle(node).letterSpacing) || 0;
      return b.right - ls;
    }
    [].forEach.call(cards, function (el) {
      var box = el.getBoundingClientRect();
      if (!box.width) return;
      var isHero = el.classList.contains('duo-half--mega');
      // THE REVIEW CELL'S FOOT RULE IS READ PREVIEW'S WIDTH (2026-09-17):
      // the picture stands above the words, so there is no courier-to-
      // picture line to draw; the foot rule alone is cut to the ink of
      // the one line on that row. (The top rule stays whole: it is the
      // picture's own top line.)
      if (el.classList.contains('latest-cell--contra')) {
        var cPeek = el.querySelector('.cover-meta--peek .peek-open') || el.querySelector('.cover-meta--peek');
        var cL = inkEdge(cPeek, 'left'), cR = inkEdge(cPeek, 'right');
        if (cL == null || cR == null) return;
        el.style.setProperty('--rule-foot-l', Math.max(0, Math.round(cL - box.left - RULE_REACH)) + 'px');
        el.style.setProperty('--rule-foot-r', Math.max(0, Math.round(box.right - cR - RULE_REACH)) + 'px');
        // And the top rule, OPEN, is the plate's kicker's width — the
        // line that stands on the cell's first row once the picture
        // has gone down to the foot (style.css applies the cut on
        // .is-open alone; shut, the rule is the picture's own top
        // line, whole). The kicker is laid out shut, only unseen.
        var cKicker = el.querySelector('.plate-title') || el.querySelector('.latest-plate-p');
        var kL = inkEdge(cKicker, 'left'), kR = inkEdge(cKicker, 'right');
        if (kL != null && kR != null) {
          el.style.setProperty('--rule-top-l', Math.max(0, Math.round(kL - box.left - RULE_REACH)) + 'px');
          el.style.setProperty('--rule-top-r', Math.max(0, Math.round(box.right - kR - RULE_REACH)) + 'px');
        }
        return;
      }
      var picLeft = isHero
        ? !!(el.closest('.card') && el.closest('.card').classList.contains('card--mega-rev'))
        : el.classList.contains('pic-left');
      var pad = isHero ? 24 : 0;
      var ruleL = box.left + pad, ruleR = box.right - pad;
      var courier = el.querySelector('.cover-meta--author');
      var peek = el.querySelector('.cover-meta--peek .peek-open') || el.querySelector('.cover-meta--peek');
      var kicker = el.querySelector('.plate-title') || el.querySelector('.latest-plate-p, .card-preview');
      var close = el.querySelector('.plate-close') || el.querySelector('.plate-more');
      // The words' side is away from the picture; the plate's is where
      // the picture stands. Each fixed piece runs between the two far
      // edges: on a picture-right card from the courier's LEFT ink to
      // the kicker's RIGHT, and mirrored on a picture-left one.
      var tL = picLeft ? inkEdge(kicker, 'left') : inkEdge(courier, 'left');
      var tR = picLeft ? inkEdge(courier, 'right') : inkEdge(kicker, 'right');
      var fL = picLeft ? inkEdge(close, 'left') : inkEdge(peek, 'left');
      var fR = picLeft ? inkEdge(peek, 'right') : inkEdge(close, 'right');
      if (tL == null || tR == null || fL == null || fR == null) return;
      var clamp = function (v) { return Math.max(0, Math.round(v)); };
      el.style.setProperty('--rule-top-l', clamp(tL - ruleL - RULE_REACH) + 'px');
      el.style.setProperty('--rule-top-r', clamp(ruleR - tR - RULE_REACH) + 'px');
      el.style.setProperty('--rule-foot-l', clamp(fL - ruleL - RULE_REACH) + 'px');
      el.style.setProperty('--rule-foot-r', clamp(ruleR - fR - RULE_REACH) + 'px');
    });
  }
  function fitAll() { whenStill(fitAllNow); }
  function fitAllNow() {
    fitErrors.length = 0;
    fitTimes.length = 0;
    // A new pass: what the reviews remember of their last fit is void
    // (fitContra keys its second look on this).
    fitPassId++;
    var veiled = stageBegin();
    var world0 = worldSig();
    freshMemos();
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
    lastWorld = { start: world0, end: worldSig() };
    stageEnd(veiled);
    announceFirstFit();
    if (stage === 2) announceSettled();
  }
  // THE WHOLE PAGE IS FITTED (2026-09-24): said once, when a pass has
  // run over every row — the second stage's, or the first where there
  // was no second — for what must not start on a page still to be
  // seated (card-reveal.js). A flag as well as an event, as above.
  var settledAnnounced = false;
  function announceSettled() {
    if (settledAnnounced) return;
    settledAnnounced = true;
    try { window.__ncSettled = true; } catch (e) {}
    try { window.dispatchEvent(new Event('newcritic:settled')); } catch (e) {}
  }
  // ---------- WHAT A PASS MEASURED, AND WHETHER IT HAS MOVED (2026-09-21) --
  // A pass reads three things it does not itself write: the faces that
  // have landed, and the window's two dimensions. (NOT the covers: their
  // boxes are CSS-sized, and the page fitted with every cover blocked
  // came out the same as the page with all of them in.) Their signature
  // is taken at a pass's head and again at its foot. An ASK — the faces'
  // own loadingdone, fonts.ready, the window's load, the hero arriving —
  // is answered with a pass only if the world is not the one the last
  // pass both began and ended in: a face that landed MID-pass leaves the
  // two ends unequal and is owed its second look, and one that lands
  // later changes the count. A resize does not ask; it fits.
  //   What this is for: on a COLD load the window's load event and the
  // kit's last loadingdone arrive while the first pass holds the thread,
  // queue behind it, and asked for a second the moment it ended — 3.3s
  // of pass, then 3.3s more re-measuring a page nothing had touched,
  // with the reader held at opacity 0 for both. (A warm load never
  // showed it: there every ask lands before the quiet timer fires.)
  var lastWorld = null;
  function worldSig() {
    var n = 0;
    try { document.fonts.forEach(function (face) { if (face.status === 'loaded') n++; }); } catch (e) {}
    return n + '|' + window.innerWidth + '|' + window.innerHeight;
  }
  // ---------- THE PAGE IS FITTED IN TWO STAGES (2026-09-21) ---------------
  // A pass over the whole front page costs about 2.9s and a pass over
  // what the reader opens on about 0.65 — measured, with the rest of
  // the page out of the layout — and until now the reader waited out
  // the first to be shown the second. So a fresh visit is fitted in two
  // stages. STAGE ONE takes everything past the first screen out of the
  // layout (display: none, inline), fits what is left, and lets the gate
  // lift on that. STAGE TWO runs once the fade is over (the gate says
  // newcritic:shown): the rest comes back into the layout VEILED —
  // visibility: hidden, so it is measured exactly as it will stand but
  // no frame can show it half-fitted — the whole page is passed over as
  // it always was, and the veil comes off.
  //   WHAT IS KEPT for stage one: the first movement's rows down to the
  // first one that ends a screen and a half below the head, and never
  // fewer than two — the hero and the pair under it, which carry the
  // three covers the gate holds for. Read off the unfitted layout, which
  // is near enough: the rows' heights are the sheet's, not the fitter's.
  //   WHAT STAGE TWO COSTS: the thread, for the length of a whole pass,
  // a breath after the page appears — a hover in those seconds answers
  // late. Scrolling is the compositor's and is not held. It is the same
  // 2.9s the reader used to spend looking at nothing.
  //   ONLY ON A FRESH VISIT AT THE HEAD OF THE PAGE. A reload or a
  // back/forward is put back where the reader was, and a page with most
  // of its length missing cannot be scrolled to where that is; a hash
  // other than #top means the same. Those, the word pages, and any page
  // already on show are fitted whole in one pass, as before.
  //   Inline rather than in the sheet: `display: none !important` on the
  // element outranks every chain in style.css without joining them, and
  // it leaves with removeProperty, so a settled page carries no trace.
  var stage = 0; // 0 nothing fitted · 1 the first screen, the rest out · 2 the whole page
  var laterEls = [];
  function canStage() {
    if (window.__ncShown) return false;
    if (document.body.classList.contains('word-page')) return false;
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav || nav.type !== 'navigate') return false;
    if (location.hash && location.hash !== '#top') return false;
    if ((window.scrollY || window.pageYOffset || 0) > 0) return false;
    return true;
  }
  function pickLater() {
    var rows = document.querySelector('main.has-mega > .page-rows');
    if (!rows) return [];
    var movs = [].filter.call(rows.children, function (el) { return el.classList.contains('movement'); });
    if (movs.length < 2) return [];
    var out = movs.slice(1);
    // the later movements go first, so the one measure below is taken
    // on a short page
    out.forEach(function (el) { el.style.setProperty('display', 'none', 'important'); });
    var body = movs[0].querySelector('.movement-body');
    if (!body) return out;
    var floor = window.innerHeight * 1.5, wraps = 0, cut = false;
    [].forEach.call(body.children, function (el) {
      if (cut) { out.push(el); return; }
      if (!el.classList.contains('wrap')) return;
      wraps++;
      if (wraps >= 2 && el.getBoundingClientRect().bottom > floor) cut = true;
    });
    return out;
  }
  function stageBegin() {
    if (stage === 0) {
      if (!canStage()) { stage = 2; return false; }
      laterEls = pickLater();
      if (!laterEls.length) { stage = 2; return false; }
      laterEls.forEach(function (el) { el.style.setProperty('display', 'none', 'important'); });
      stage = 1;
      return false;
    }
    if (stage === 1 && window.__ncShown) {
      stage = 2;
      laterEls.forEach(function (el) {
        el.style.removeProperty('display');
        el.style.setProperty('visibility', 'hidden', 'important');
      });
      return true;
    }
    return false;
  }
  function stageEnd(veiled) {
    if (!veiled) return;
    laterEls.forEach(function (el) { el.style.removeProperty('visibility'); });
    laterEls = [];
  }
  function afterShown() {
    if (stage !== 1) return;
    var go = function () { if (stage === 1) fitAll(); };
    if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 400 });
    else setTimeout(go, 60);
  }
  window.addEventListener('newcritic:shown', afterShown);
  // Never left half-fitted: if the gate's word is lost, the rest of the
  // page is fitted anyway.
  setTimeout(function () { if (stage === 1) { try { window.__ncShown = true; } catch (e) {} fitAll(); } }, 15000);
  // THE GATE WAITS ON THE FIT, AND IS TOLD SO (2026-09-19). The first
  // pass used to run SYNCHRONOUSLY during parse, and the guarantee
  // that the page was never seen unfitted rested on that: the gate's
  // own promises could not resolve until the parser got past this
  // script, so a fit had always happened by the time it lifted. That
  // pass is gone (see the call site below) and the guarantee cannot
  // rest on parse order any more, so it is STATED instead — the first
  // completed pass says so, and the gate holds the page until it
  // hears it (build.js, renderFontGateScript). A flag as well as an
  // event, since the gate is in the HEAD and runs long before this
  // script: it cannot listen for something already announced, so it
  // checks the flag first and only then listens.
  var firstFitAnnounced = false;
  function announceFirstFit() {
    if (firstFitAnnounced) return;
    firstFitAnnounced = true;
    try { window.__ncFitDone = true; } catch (e) {}
    try { window.dispatchEvent(new Event('newcritic:fitdone')); } catch (e) {}
  }
  function fitAllSteps() {
    // THE BLOCKS ARE SEATED ON EVERY PAGE, and last. It hung off
    // fitSubscribeLines, which is a step about the offer's own lines
    // and does not run where there is no offer — so the archive's band
    // name was never measured and kept the older box-painted block,
    // which is what put a bar round it wider and taller than its
    // letters with the band's rule crossing it. Last, because it reads
    // boxes that every step above it moves.
    var seatLast = true;
    // The columns' 24 step into their blocks (fitTitleHalo) is a
    // transform the rest of the pass must not measure: cleared first,
    // written last, so every seat is taken off the untransformed box
    // and the step never compounds from pass to pass.
    step('resetPlateBody', resetPlateBody);
    step('fitStdWidth', fitStdWidth);
    step('clearTitleStep', function () {
      [].forEach.call(document.querySelectorAll('.latest-cell--ps, .latest-cell--contra, .duo-half--mega'), function (h) {
        h.style.removeProperty('--hl-dx'); h.style.removeProperty('--hl-dy');
      });
    });
    step('resetMatterInk', resetMatterInk);
    step('resetContra', resetContra);
    step('resetMatterMeta', resetMatterMeta);
    step('seatPlateMargins', seatPlateMargins);
    step('inkCenterBands', inkCenterBands);
    step('alignBands', alignBands);
    step('fitMastheadFill', fitMastheadFill);
    step('fitBands', fitBands);
    step('inkCenterDeks', inkCenterDeks);
    step('seatBandMid', seatBandMid);
    step('fitGroundStops', fitGroundStops);
    step('fitSubscribeName', fitSubscribeName);
    step('fitWordSpacers', fitWordSpacers);
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
    // AND IT TAKES THE REVIEW'S WHOLE FIT WITH IT, which is the most
    // expensive thing in the pass and was tried at exactly one look
    // (2026-09-19). It cannot be: fitContra ACCUMULATES. It puts the
    // title and dek back to their full text and the sheet's sizes at
    // the head, but the margins it deals — the seams given back when a
    // stack overruns, the slack shared out when it underruns — are read
    // off whatever the last run left and written back changed, so the
    // second run is not the first run's answer again but a second helping
    // of it. Held against the shipped page: every review's author and dek
    // margin came out 12 adrift with one run, and one cell's dek size,
    // plate height and open picture with them. So the pair stands. If the
    // cost is ever wanted back, the thing to make idempotent is the
    // margin dealing — clear to the sheet first, as the sizes and the
    // text already are — and NOT to drop the second look.
    // (2026-09-21: most of the cost is back and the look stands. The
    // dealing was NOT made idempotent — tried, and it moved 177 values
    // at 1280, where the second helping is what keeps the type large —
    // so the pair stands too, and the second look asks each review
    // whether it settled and whether its box has moved before it fits
    // it again. See THE SECOND LOOK ASKS BEFORE IT FITS.)
    step('fitSlideSlots#2', fitSlideSlots);
    step('cutPlates#2', cutPlates);
    step('fitCourierDots#2', fitCourierDots);
    step('seatPlateAir', seatPlateAir);
    step('seatPlateBox', seatPlateBox);
    step('fitTitleHalo', fitTitleHalo);
    step('fitCardRules', fitCardRules);
    step('fitToggle', fitToggle);
    step('fitSubscribeLines', fitSubscribeLines);
    // Every fit pass can move document seats (fonts, images, fitted
    // titles) — announce it so rail-fix re-measures its anchors and
    // rebuilds the held clones on the FINAL geometry, not the first
    // paint's (stale anchors made the held couriers jump at the
    // lock-in).
    try { window.dispatchEvent(new Event('newcritic:fit')); } catch (e) {}
    step('seatInkBlocks', seatInkBlocks);
    step('seatDekBlocks', seatDekBlocks);
    step('seatMatterMeta', seatMatterMeta);
    step('fitBandDekInset', fitBandDekInset);
    // (again: the name's air over its caps is the band's inset to its
    // Garamond, which the step above has only now seated — 2026-09-23)
    step('fitMastheadFill#2', fitMastheadFill);
    step('fitReprint#2', fitReprint);
    step('centreMatter', centreMatter);
    step('seatPlateBody', seatPlateBody);
    step('seatWordClips', seatWordClips);
    step('seatSwapCols', seatSwapCols);
    step('seatRowGaps', seatRowGaps);
    // (again: the first can read the rows before an essay's words have
    // settled under its picture, and a second pass finds them)
    step('seatRowGaps#2', seatRowGaps);
    // the margin's names were seated (fitSubscribeLines) before the
    // rows were drawn together, so their rests are read again here
    step('fitLatestStack#2', fitLatestStack);
    // (last of all, once nothing moves the cards again: every picture on
    // whole pixels — 2026-09-23)
    step('snapPictures', snapPictures);
  }
  // 72 BETWEEN THE CARDS (2026-09-23): picture to picture now, the
  // courier lines standing in the gap (rowInk) — ink to ink before.
  // With the frames struck
  // a card is what it prints — its courier lines, its picture, its
  // title and dek — and the rows stood 72 apart by the frames' edges,
  // which left 75 to 90 between one card's last line and the next's
  // first. Each row after the first in a movement is stood off the row
  // over it by its own margin, so the gap between the two rows' ink is
  // the page's 72. The gap is measured as it stands and the margin
  // moved by the difference, so a second pass finds 72 and writes
  // nothing. A row of reviews alone, or following one, keeps its seat:
  // a review's words stand centred in the column under its picture,
  // and that picture slides down the column to the cell's foot when the
  // preview opens — a row drawn up into that column would be slid over.
  // (the grid's gutter, and the first row's air under the head band: 36
  // since 2026-09-23 — the side margins with them, style.css, THE
  // GUTTERS ARE 36)
  var ROW_GAP = 36;
  // ONE COLUMN ON A PHONE (2026-09-24): under 1024 every card stands
  // under the one before it (style.css, ONE COLUMN ON A PHONE), a pair's
  // second card with them, so nothing is drawn up beside anything.
  var ONE_COL = window.matchMedia ? window.matchMedia('(max-width: 1023.98px)') : { matches: false };
  // ONE STANDARD WIDTH (2026-09-23): a review's square — a third of a
  // row less its two 72 gutters. The essay's picture is two of it and a
  // postscript's one (style.css, ESSAYS TWICE A REVIEW'S WIDTH), the
  // seats beside them taking the rest. Published on <main> as --std-w.
  function fitStdWidth() {
    var main = document.querySelector('main');
    if (!main) return;
    var row = document.querySelector('.page-rows .movement-body .card--latest');
    var w = row ? row.getBoundingClientRect().width : 0;
    if (!w) {
      var mega = document.querySelector('.card--mega .duo-half--mega');
      w = mega ? mega.getBoundingClientRect().width - 48 : 0;
    }
    if (!w) { main.style.removeProperty('--std-w'); return; }
    main.style.setProperty('--std-w', ((w - 2 * ROW_GAP) / 3).toFixed(2) + 'px');
  }
  function rowInk(row) {
    var t = Infinity, b = -Infinity;
    var add = function (el) {
      var rg = document.createRange(); rg.selectNodeContents(el);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) if (rs[i].width > 0) { if (rs[i].top < t) t = rs[i].top; if (rs[i].bottom > b) b = rs[i].bottom; }
    };
    // THE COURIER SITS IN THE GAP (2026-09-23): the row is its pictures
    // and its words — not its courier lines, which stand in the 72
    // between one row's pictures and the next's, the foot's under the
    // one and the head's over the other. Each picture is its title's
    // box (::before, wider by its side margins), where the title's words
    // are the column's (.swap-line, .swap-dek-ink).
    [].forEach.call(row.querySelectorAll('.swap-line, .swap-dek-ink'), add);
    [].forEach.call(row.querySelectorAll('.card-title.hl-rect.rx, .latest-title.hl-rect.rx'), function (ttl) {
      var r = ttl.getBoundingClientRect(), c = getComputedStyle(ttl, '::before');
      if (c.content === 'none') return;
      var pt = r.top + (parseFloat(c.top) || 0), pb = r.bottom - (parseFloat(c.bottom) || 0);
      if (pb > pt) { if (pt < t) t = pt; if (pb > b) b = pb; }
    });
    return isFinite(t) ? { t: t, b: b } : null;
  }
  var COURIER_GAP = 54;
  function rowCourier(row) {
    var t = Infinity, b = -Infinity;
    [].forEach.call(row.querySelectorAll('.cover-meta'), function (m) {
      if (getComputedStyle(m).visibility === 'hidden') return;
      var rg = document.createRange(); rg.selectNodeContents(m);
      [].forEach.call(rg.getClientRects(), function (r) {
        if (!r.width || !r.height) return;
        if (r.top < t) t = r.top; if (r.bottom > b) b = r.bottom;
      });
    });
    return isFinite(t) ? { t: t, b: b } : null;
  }
  // EVERY PICTURE ON WHOLE PIXELS (2026-09-23). A picture is its title's
  // ::before (the frame's --wrap widening it each side), and by the end
  // of a pass its four edges stand wherever the cards' fractional widths
  // and heights and the rows' seats have left them — .797 here, .447
  // there. An edge on a fraction paints a pixel part image and part
  // ground, which reads as a hairline round the picture; and the scrims
  // laid over it (READ NOW | PREVIEW, essay-acts.js, and the opened
  // preview, .swap-body) round their own edges their own way, so a sliver
  // of the picture showed past them. Each edge is carried to the nearest
  // whole pixel of the page on its inset, and the preview's box is laid
  // on the result; READ NOW reads the picture's box when it is shown.
  // (the blue ring round every picture is one pixel wide: style.css)
  var PIC_RING = 1;
  function snapPictures() {
    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    var snap = function (v, s0) { return Math.round(v + s0) - s0; };
    [].forEach.call(document.querySelectorAll('.duo-half--mega'), function (card) {
      if (card.matches('.is-open, .is-opening')) return;
      var t = card.querySelector('.card-title.hl-rect.rx');
      if (!t) return;
      var c = getComputedStyle(t, '::before');
      if (c.content === 'none') return;
      var box = function () {
        var r = t.getBoundingClientRect(), cc = getComputedStyle(t, '::before');
        var w = parseFloat(getComputedStyle(t).getPropertyValue('--wrap')) || 0;
        return { l: r.left + (parseFloat(cc.left) || 0) - w, r: r.right - (parseFloat(cc.right) || 0) + w, t: r.top + (parseFloat(cc.top) || 0), b: r.bottom - (parseFloat(cc.bottom) || 0) };
      };
      var nudge = function (prop, d) {
        if (Math.abs(d) < 0.005) return;
        t.style.setProperty(prop, ((parseFloat(t.style.getPropertyValue(prop)) || 0) + d).toFixed(3) + 'px');
      };
      // THE CARRY ON A WHOLE PIXEL TOO (2026-09-24). The box is the
      // title's pseudo, and the title is carried across on a transform
      // (--rb-dx, seatMatterMeta) by a fraction — 56.37 at 1440. The
      // browser snaps the box to the pixel BEFORE the carry, so a box
      // this step had put on whole pixels by its measured rect was
      // painted a third of a pixel off them: the picture's edge column
      // and row half-covered the pixel past the box, and the scrim a
      // hand raises, seated on the whole pixels, left that sliver of
      // picture showing along the right and the foot — the hairline
      // under the hand. So the carry is rounded, and the box's insets
      // take back what it moved — the picture stands where it stood, and
      // its box, under a whole carry, is snapped where it is painted.
      var tm = getComputedStyle(t).transform;
      if (tm && tm !== 'none' && window.DOMMatrixReadOnly) {
        var mm = new DOMMatrixReadOnly(tm);
        var fx = Math.round(mm.e) - mm.e, fy = Math.round(mm.f) - mm.f;
        if (Math.abs(fx) >= 0.005) { nudge('--rb-dx', fx); nudge('--rx-l', -fx); nudge('--rx-r', fx); }
        if (Math.abs(fy) >= 0.005) { nudge('--rb-dy', fy); nudge('--rx-t', -fy); nudge('--rx-b', fy); }
      }
      var b0 = box();
      if (!(b0.r > b0.l && b0.b > b0.t)) return;
      // (the top-left corner to the nearest pixel and the size to the
      // nearest whole one, so a square stays square and every picture of
      // a kind is the one size)
      var nl = snap(b0.l, sx), nt = snap(b0.t, sy);
      var nr = nl + Math.round(b0.r - b0.l), nb = nt + Math.round(b0.b - b0.t);
      var dl = nl - b0.l, dr = nr - b0.r, dt = nt - b0.t, db = nb - b0.b;
      nudge('--rx-l', dl); nudge('--rx-r', -dr); nudge('--rx-t', dt); nudge('--rx-b', -db);
      // (and the title's clip, which is the box's — seated earlier in the
      // pass, before the box was snapped, so its two sides stood a
      // fraction in from the picture's: seated again on the snapped box,
      // and a pixel past it for the blue ring round it, style.css, A
      // PIXEL OF THE BLUE ROUND EVERY PICTURE)
      // (its top and foot too, 2026-09-24: they stood the frame's 36 off,
      // and the frame's shadow — the section's ground since the frames
      // went — reached from a section's first picture up over the foot
      // of the tag under the section's name; the frame is not shown, so
      // nothing past the ring is the title's to paint)
      // (the sheet widens this clip by the frame's --wrap, and a half
      // pixel over and under, for the frame that stood round the box —
      // style.css, "the title is clipped to its box through the slide" —
      // so what is written here is that much narrower, and the clip
      // lands on the ring)
      var p = box(), tr = t.getBoundingClientRect();
      var W = parseFloat(getComputedStyle(t).getPropertyValue('--wrap')) || 0;
      t.style.setProperty('--ck-l', ((p.l - PIC_RING) - tr.left + W).toFixed(3) + 'px');
      t.style.setProperty('--ck-r', (tr.right - (p.r + PIC_RING) + W).toFixed(3) + 'px');
      t.style.setProperty('--ck-t', ((p.t - PIC_RING) - tr.top + W + 0.5).toFixed(3) + 'px');
      t.style.setProperty('--ck-b', (tr.bottom - (p.b + PIC_RING) + W + 0.5).toFixed(3) + 'px');
      // (and the opened preview on the very same box, where it stands
      // on the picture — within a pixel of it before the snap)
      var body = card.querySelector(':scope > .swap-body.is-set');
      if (!body) return;
      var br = body.getBoundingClientRect();
      if (Math.abs(br.left - b0.l) > 2 || Math.abs(br.top - b0.t) > 2 || Math.abs(br.right - b0.r) > 2 || Math.abs(br.bottom - b0.b) > 2) return;
      var bs = body.style;
      bs.left = ((parseFloat(bs.left) || 0) + (p.l - br.left)).toFixed(3) + 'px';
      bs.top = ((parseFloat(bs.top) || 0) + (p.t - br.top)).toFixed(3) + 'px';
      bs.width = (p.r - p.l).toFixed(3) + 'px';
      bs.height = (p.b - p.t).toFixed(3) + 'px';
    });
  }
  // A card's picture: its box less the two 36 bands (the essay's card,
  // every post's since ONE LINE OF POSTS).
  function picBoxOf(row) {
    var h = row.querySelector('.duo-half--mega');
    if (!h) return null;
    var r = h.getBoundingClientRect();
    return r.height > 72 ? { t: r.top + 36, b: r.bottom - 36 } : null;
  }
  function seatRowGaps() {
    var jobs = [];
    [].forEach.call(document.querySelectorAll('.page-rows > .movement > .movement-body'), function (body) {
      var rows = [].filter.call(body.querySelectorAll('.card'), function (c) { return !c.parentElement.closest('.card'); });
      var prev = null, prevInk = null, prevCur = null;
      // (TWO ACROSS, 2026-09-23, later: each row's own move is kept, and
      // the moves of the rows over it — acc, the flow's — so a pair's
      // second card can be drawn up beside the first and the row under
      // the pair spaced from the lower of the two, all in one pass)
      var acc = 0, prevFoot = null, prevPic = null;
      rows.forEach(function (row, ri) {
        var ink = rowInk(row);
        var rowDelta = 0, hasJob = false;
        // (the card's own margin, over the margins it already has: a
        // wrap's collapses into the card's negative one and moves nothing)
        var el = row;
        // THE FIRST ROW STANDS 72 UNDER THE HEAD BAND (2026-09-23), as
        // every row stands 72 under the one over it, its courier in the
        // gap: the first movement's body opens at the band's own top
        // (drawn up under it), so the band's foot is the body's top and
        // the band's height.
        if (!prev && ink && body.parentElement.classList.contains('m--latest')) {
          var hb = document.querySelector('.page-rows > .section-band');
          if (hb) {
            var bandFoot = body.getBoundingClientRect().top + hb.offsetHeight;
            // (the subscribe ticker stands under the band's foot: the gap is
            // taken from ITS foot — 2026-09-23)
            // (under the band in the rows since 2026-09-24, riding with it;
            // the word pages' rows keep the seats they had before it came)
            var tk = document.body.classList.contains('word-page') ? null
              : document.querySelector('.page-rows > .sub-ticker--head') || body.querySelector(':scope > .sub-ticker');
            if (tk && tk.offsetHeight) bandFoot += tk.offsetHeight;
            var firstAt = bandFoot + ROW_GAP;
            // (THE LATEST stands over it: its ink's top 72 under the band,
            // the row 36 under its baseline — 2026-09-23)
            var lh = body.querySelector(':scope > .latest-head');
            if (lh) {
              var lr = document.createRange(); lr.selectNodeContents(lh);
              var lrr = [].filter.call(lr.getClientRects(), function (x) { return x.width > 0; })[0];
              if (lrr) {
                var lcs = getComputedStyle(lh);
                measureCtx.font = lcs.fontStyle + ' ' + lcs.fontWeight + ' ' + lcs.fontSize + ' ' + lcs.fontFamily;
                var lm = measureCtx.measureText((lh.textContent || '').trim());
                var lb = lrr.top + (lrr.height - (lm.fontBoundingBoxAscent + lm.fontBoundingBoxDescent)) / 2 + lm.fontBoundingBoxAscent;
                var lShift = (bandFoot + 72) - (lb - lm.actualBoundingBoxAscent);
                lh.style.top = ((parseFloat(lh.style.top) || 0) + lShift).toFixed(2) + 'px';
                firstAt = lb + lShift + ROW_GAP;
              }
            }
            rowDelta = firstAt - ink.t; hasJob = true;
          }
        }
        // (a section's first row 36 under its dek's baseline — or its
        // name's, with no dek — as THE LATEST's first row stands 36 under
        // its own: 2026-09-23)
        if (!prev && ink && !body.parentElement.classList.contains('m--latest')) {
          var sb = body.parentElement.querySelector(':scope > .page-banner--section');
          var sAnchor = sb && (sb.querySelector('.banner-line--below') || sb.querySelector('.banner-name'));
          var sBase = sAnchor && baselineOf(sAnchor);
          // (under its LAST line: on a phone the tag runs to two, and the
          // row stood over the second — ONE COLUMN ON A PHONE, 2026-09-24)
          if (sBase) { rowDelta = Math.max(sBase.base, lastBaseline(sAnchor)) + SECTION_ROW_GAP - ink.t; hasJob = true; }
        }
        // 54 BETWEEN THE COURIER LINES (2026-09-23): the rows stand off
        // one another by their courier labels' ink — the foot line of the
        // row over, the head line of the row under — 54 apart.
        var cur = rowCourier(row);
        // (the second of a pair beside the first, its picture centred on
        // the first's top to bottom: style.css, ONE LINE OF POSTS)
        var isB = !ONE_COL.matches && !!prev && row.classList.contains('card--pair-b') && prev.classList.contains('card--pair-a');
        var pic = picBoxOf(row);
        if (isB && pic && prevPic) {
          rowDelta = (prevPic.t + ((prevPic.b - prevPic.t) - (pic.b - pic.t)) / 2) - (pic.t + acc);
          hasJob = true;
        } else if (prev && cur && prevFoot != null
            && !row.classList.contains('card--contra-trio') && !prev.classList.contains('card--contra-trio')) {
          // (from the row over's lowest ink: an essay's title and dek hang
          // under its courier line now, a review's words under its own —
          // and a pair's, the lower of its two)
          // (to the row under's highest ink: its courier line, or an
          // essay's picture, whose courier stands under it)
          var curT = Math.min(cur.t, ink ? ink.t : Infinity) + acc;
          // (a pair's first card standing for its second where the second
          // is the taller: centred on the first, the second rides up by
          // half the difference, and its ink, not the first's, is the
          // row's highest — a review leading a postscript, 2026-09-24)
          var nb = rows[ri + 1];
          if (!ONE_COL.matches && pic && nb && row.classList.contains('card--pair-a') && nb.classList.contains('card--pair-b')) {
            var nbPic = picBoxOf(nb), nbCur = rowCourier(nb), nbInk = rowInk(nb);
            if (nbPic) {
              var nbTop = Math.min(nbCur ? nbCur.t : Infinity, nbInk ? nbInk.t : Infinity, nbPic.t);
              curT = Math.min(curT, pic.t + ((pic.b - pic.t) - (nbPic.b - nbPic.t)) / 2 + (nbTop - nbPic.t) + acc);
            }
          }
          rowDelta = COURIER_GAP - (curT - prevFoot); hasJob = true;
        }
        if (hasJob) jobs.push({ el: el, delta: rowDelta, m: parseFloat(getComputedStyle(el).marginTop) || 0 });
        var foot = Math.max(cur ? cur.b : -Infinity, ink ? ink.b : -Infinity) + acc + rowDelta;
        prevFoot = isB && prevFoot != null ? Math.max(prevFoot, foot) : (isFinite(foot) ? foot : null);
        prevPic = pic ? { t: pic.t + acc + rowDelta, b: pic.b + acc + rowDelta } : null;
        acc += rowDelta;
        prev = row; prevInk = ink; prevCur = cur;
      });
    });
    jobs.forEach(function (j) {
      if (Math.abs(j.delta) < 0.25) return;
      j.el.style.setProperty('margin-top', (j.m + j.delta).toFixed(2) + 'px', 'important');
    });
    // 54 FROM THE LAST ROW TO THE SECTION'S EDGE (2026-09-23): where the
    // ground turns — the charcoal's line 72 over the next word's caps
    // (--mk-line), or the colophon's top after the last — it stands 54
    // under the last row's lowest ink, its courier line or a review's
    // words under it. The next movement (or the colophon) is moved by
    // the difference.
    var edges = [];
    [].forEach.call(document.querySelectorAll('.page-rows > .movement > .movement-body'), function (body) {
      var rows = [].filter.call(body.querySelectorAll('.card'), function (c) { return !c.parentElement.closest('.card'); });
      var last = rows[rows.length - 1];
      if (!last) return;
      var a = rowCourier(last), b = rowInk(last);
      var foot = Math.max(a ? a.b : -Infinity, b ? b.b : -Infinity);
      // (a closing pair's lower card: 2026-09-23)
      var lastA = last.classList.contains('card--pair-b') && rows[rows.length - 2];
      if (lastA) { var a2 = rowCourier(lastA), b2 = rowInk(lastA); foot = Math.max(foot, a2 ? a2.b : -Infinity, b2 ? b2.b : -Infinity); }
      if (!isFinite(foot)) return;
      var mv = body.parentElement, next = mv.nextElementSibling, target = null, line = null;
      // (the foot's subscribe ticker, over the colophon, is the edge
      // where it stands: 2026-09-23)
      while (next && !next.classList.contains('movement') && !next.classList.contains('section-band--colophon') && !next.classList.contains('sub-ticker--foot')) next = next.nextElementSibling;
      if (!next) return;
      if (next.classList.contains('movement')) {
        var ban = next.querySelector(':scope > .page-banner');
        if (!ban) return;
        var ml = parseFloat(ban.style.getPropertyValue('--mk-line'));
        if (isNaN(ml)) return;
        line = ban.getBoundingClientRect().top + ml;
      } else line = next.getBoundingClientRect().top;
      // (the colophon is not moved but the last movement's foot grown
      // or taken in: a margin on the colophon opened a gap between the
      // two grounds, and the reprint under the page showed through it)
      // (…and between two movements the same way, since 2026-09-23: the
      // movement over the edge grows its own foot and the next stands
      // flush under it — a margin on the next was the page's white, and
      // with THE LATEST charcoal too it showed as a white strip between
      // two charcoal sections)
      var nm = 0;
      if (next.classList.contains('movement')) {
        nm = parseFloat(getComputedStyle(next).marginTop) || 0;
        next.style.setProperty('margin-top', '0px', 'important');
      }
      edges.push({ el: body, prop: 'padding-bottom', delta: COURIER_GAP - (line - nm - foot), m: parseFloat(getComputedStyle(body).paddingBottom) || 0 });
    });
    edges.forEach(function (j) {
      if (Math.abs(j.delta) < 0.25) return;
      j.el.style.setProperty(j.prop, Math.max(0, j.m + j.delta).toFixed(2) + 'px', 'important');
    });
  }
  // THE WORDS KEEP TO THEIR BOXES THROUGH THE SLIDE (2026-09-22): while
  // the picture travels, the title and the dek move half its distance
  // and the preview's body half the distance still to go (style.css,
  // THE WORDS STAY IN THE MIDDLE OF WHAT IS SHOWN), so each stands
  // centred in the part of its box the picture has not covered. Each is
  // clipped to its box so that nothing carried past the box's edge
  // shows beyond the card; the clips are measured here, at rest, as
  // insets of each element's own box (--ck-*), the sheet paying back
  // whatever the element has been carried.
  // THE BODY'S TOP AND FOOT (2026-09-22): the body keeps the leading
  // and the gaps the cut gave it — its spacing is not this step's — and
  // stands centred in its box between the top and the foot, the slack
  // the rows leave split equally above and below (never less than
  // PLATE_BODY_PAD either side while the rows allow): the first line's
  // cap and the last line's baseline, measured, carried as a block.
  // Undone at the head of every pass (resetPlateBody).
  var plateBodySet = [];
  function resetPlateBody() {
    plateBodySet.forEach(function (el) {
      el.style.removeProperty('top');
      el.style.removeProperty('position');
    });
    plateBodySet = [];
  }
  function seatPlateBody() {
    if (!PLATES_SHOWN) return;
    // (a pin at the paragraph's OWN first or last node — the shared
    // baseline helper walks into the first or last element child, which
    // in a paragraph with an <em> part-way through is the em's line)
    var pinAt = function (el, atStart) {
      var sp = document.createElement('span');
      sp.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;';
      if (atStart) el.insertBefore(sp, el.firstChild); else el.appendChild(sp);
      var y = sp.getBoundingClientRect().top;
      sp.remove();
      return y;
    };
    [].forEach.call(document.querySelectorAll('.duo-half--mega, .latest-cell--ps, .latest-cell--contra'), function (card) {
      var cu = card.querySelector('.plate-curtain');
      if (!cu) return;
      var cr = cu.getBoundingClientRect();
      if (!cr.width || !cr.height) return;
      var pf = getComputedStyle(cu, '::before');
      var pbi = parseFloat(pf.getPropertyValue('--pb-i')) || REST_INSET;
      var bT = cr.top + (parseFloat(pf.top) || 0), bB = cr.bottom - (parseFloat(pf.bottom) || 0);
      var contra = card.matches('.latest-cell--contra'), rev = card.matches('.latest-cell--contra-rev');
      var boxT = (contra && rev) ? bT : bT + pbi;
      var boxB = (contra && !rev) ? bB : bB - pbi;
      var paras = [].filter.call(cu.querySelectorAll('.card-preview, .latest-plate-p'), function (p) {
        return getComputedStyle(p).display !== 'none' && p.getBoundingClientRect().height > 0;
      });
      if (!paras.length) return;
      var cols = cu.querySelector('.card-preview-cols');
      var movers = cols ? [cols] : paras;
      var p0 = paras[0], pN = paras[paras.length - 1];
      var capT = pinAt(p0, true) - capAscent(p0), bN = pinAt(pN, false);
      var ink = bN - capT;
      var room = boxB - boxT;
      // …AND NEVER NEARER ITS BOX THAN THE PAD: where the rows the cut
      // left stand taller than the box allows with PLATE_BODY_PAD above
      // and below, the text ends sooner — words off its end, the
      // ellipsis joined on, as every cut here ends — rather than the
      // leading being touched.
      var guard = 400;
      while (ink > room - 2 * PLATE_BODY_PAD + 0.5 && guard-- > 0) {
        if (!popLastWord(pN)) {
          if (paras.length < 2) break;
          pN.parentNode.removeChild(pN);
          paras.pop();
          pN = paras[paras.length - 1];
        } else {
          var tn = lastTextNode(pN);
          if (tn) tn.textContent = tn.textContent.replace(TRAIL_PUNCT, '') + '\u2026';
        }
        bN = pinAt(pN, false);
        ink = bN - capT;
      }
      var top = boxT + Math.max(Math.min(PLATE_BODY_PAD, (room - ink) / 2), (room - ink) / 2);
      var shift = top - capT;
      if (Math.abs(shift) < 0.25) return;
      movers.forEach(function (m) {
        plateBodySet.push(m);
        m.style.position = 'relative';
        m.style.top = shift.toFixed(2) + 'px';
      });
    });
  }
  // THE PICTURE SITS IN THE BOX (2026-09-22; style.css, THE PICTURE
  // SITS IN THE BOX). The picture's seat is the title column now and
  // the box holds the picture. The column's words are a copy taken
  // once, here, off the title and the dek before any pass has cut or
  // split them (.swap-col, aria-hidden: the real title and dek stay
  // where they stood, for their links and for every seat the passes
  // above take off them, and are printed in no colour).
  // THE WORDS FILL THE COLUMN (2026-09-22): no pad on the column's
  // open sides — its edges are the page's own white — and SWAP_PAD
  // against the frame alone, the one edge that shows.
  // (the title's size capped at a moderate SWAP_MAX, 2026-09-22)
  var SWAP_PAD = 36, SWAP_OPEN = 0, SWAP_GAP = 36, SWAP_MAX = 40, SWAP_LINES = 6;
  var ESSAY_TITLE_GAP = 18, ESSAY_TITLE_H = 400, ESSAY_PREVIEW_PAD = 54, ESSAY_COURIER_GAP = 18, ESSAY_DEK_APART = 72;
  // (a card's words take their side only where the pairs stand two
  // across; under 1024 every card is set left — style.css, THE WORDS
  // UNDER THE PICTURE TAKE A SIDE)
  var SIDE_ALIGN_MQ = window.matchMedia('(min-width: 1024px)');
  var SWAP_CARDS = '.duo-half--mega, .latest-cell--ps, .latest-cell--contra';
  // ONLY A PICTURE THAT HAS ARRIVED IS PAINTED IN THE BOX (2026-09-24).
  // This fell back to the <img>'s bare src when it had not loaded, and a
  // lazy cover has not: every pass handed each of the twenty covers
  // below the first screen to the sheet as a background — the 800 the
  // src names, not the width the srcset picks — so the browser fetched
  // all twenty the moment the second stage brought them back, two to
  // three megabytes nobody had scrolled to, and fetched each AGAIN at
  // its real width when the <img> itself came near. And the write sat
  // in seatSwapCols' reading loop, so each one forced a restyle of the
  // whole sheet for the next card's read (~20ms apiece). A cover that
  // has not arrived leaves the box on its mat; the <img>'s own load
  // (buildSwapCols) paints it the moment it lands, with the very source
  // it loaded — which is all the box ever showed once a cover was in.
  function swapImg(card, img) {
    var src = img && img.complete && img.naturalWidth ? (img.currentSrc || img.src) : '';
    if (src) card.style.setProperty('--swap-img', 'url("' + src.replace(/"/g, '%22') + '")');
  }
  function buildSwapCols() {
    [].forEach.call(document.querySelectorAll('.duo-half--mega, .latest-cell--ps, .latest-cell--contra'), function (card) {
      var link = card.querySelector('.card-image-link, .latest-cell--ps .latest-cover, .latest-cover--square');
      var title = card.querySelector('.card-title, .latest-title');
      if (!link || !title || link.querySelector('.swap-col')) return;
      var dek = card.querySelector('.card-dek, .latest-dek');
      var col = document.createElement('span');
      col.className = 'swap-col';
      col.setAttribute('aria-hidden', 'true');
      var st = document.createElement('span');
      st.className = 'swap-title';
      st.setAttribute('data-text', title.textContent.replace(/\s+/g, ' ').trim());
      col.appendChild(st);
      if (dek && dek.textContent.trim()) {
        var sd = document.createElement('span');
        sd.className = 'swap-dek';
        sd.innerHTML = '<span class="swap-dek-ink">' + dek.innerHTML + '</span>';
        col.appendChild(sd);
      }
      link.appendChild(col);
      // THE BODY COLUMN (2026-09-22): the preview's paragraphs, copied
      // as they came, in a column of their own under the frame's far
      // end — the frame slides over the title column when the card
      // opens and leaves it standing where it was
      var paras = [].map.call(card.querySelectorAll('.card-preview-block .card-preview, .latest-plate .latest-plate-p'), function (pp) { return pp.innerHTML.trim(); }).filter(Boolean);
      if (paras.length && !card.querySelector(':scope > .swap-body')) {
        // (inert, 2026-09-22: words to read, not a link — no Read Now)
        var body = document.createElement('span');
        body.className = 'swap-body';
        var bt = document.createElement('span');
        bt.className = 'swap-body-text';
        // (each paragraph a block, a line's air after it, 2026-09-24: the
        // air is dropped where a column breaks, so no column opens on an
        // empty line, and a paragraph never leaves one line alone at a
        // column's foot or head — style.css, THE PREVIEW'S COLUMNS)
        bt.innerHTML = '<div class="swap-body-ink">' + paras.map(function (pp) { return '<p class="swap-p">' + pp + '</p>'; }).join('') + '</div>';
        body.appendChild(bt);
        card.appendChild(body);
      }
      var img = link.querySelector('img.card-image');
      if (img) {
        if (img.complete && (img.currentSrc || img.src)) swapImg(card, img);
        img.addEventListener('load', function () { swapImg(card, img); });
      }
    });
  }
  // Set in the column's inner rectangle — the picture's old seat less
  // the box's 72 over it, less SWAP_PAD all round: the title at the
  // largest size whose widest line spans the measure and whose lines,
  // with the dek under them, stand in the height, over one to
  // SWAP_LINES balanced lines (broken only between words, or after a
  // word's own hyphen), measured on the canvas so the search lays
  // nothing out. The dek keeps the face and the size the box gave it.
  // THE PREVIEW ENDS ON ITS ELLIPSIS (2026-09-24). Its text ran on past
  // the columns and was cut by the box, on whatever line fell last, with
  // no … unless the excerpt happened to close on one. The last word the
  // reader can see is found (its last line box inside the columns — the
  // overflow runs on in columns off to the right, or under a single
  // column's foot, so what shows is a prefix of the text), everything
  // after it is struck, and the … is joined on; backed off a word at a
  // time if the … itself would fall out of sight. A preview that fits
  // whole ends on one too: it is an excerpt. (…and, since the columns
  // came level, the same afternoon, it may end on a paragraph's first
  // line: the … says the paragraph runs on.)
  // BOTH COLUMNS OPEN AND CLOSE ON A LINE (2026-09-24, later; it was
  // NO LONE LINE AT THE COLUMNS' BREAK, which carried a short paragraph
  // over whole and left the first column's foot three lines short). The
  // columns are one height, a whole number of lines, and each opens
  // and closes on a line of text: never on the line's air after a
  // paragraph, never on nothing. The text is read as rows — each
  // paragraph's lines at the column's measure (both columns share it),
  // a row of air between paragraphs, the air dropped where it would
  // open a column — and the columns are made the tallest height the box
  // holds at which the first column's last row, and the last column's,
  // are both lines; the text runs on from the one column's foot to the
  // next one's head, a paragraph split wherever the break falls, and is
  // cut after the last column's last line (sealPreview). Orphans and
  // widows are one (style.css, THE COLUMNS END LEVEL): a paragraph may
  // leave a single line at a column's foot or head, which is taken only
  // where a line shorter would not avoid it.
  function paraLines(bt, ncol, gap, lh) {
    var box = bt.getBoundingClientRect();
    var cw = (box.width - gap * (ncol - 1)) / ncol;
    var g = document.createRange();
    return [].map.call(bt.querySelectorAll('.swap-p'), function (p) {
      g.selectNodeContents(p);
      var by = {};
      [].forEach.call(g.getClientRects(), function (r) {
        if (!r.width || !r.height) return;
        var c = Math.floor((r.left - box.left + 1) / (cw + gap));
        (by[c] || (by[c] = [])).push(r.top);
      });
      var count = 0;
      Object.keys(by).forEach(function (c) {
        var last = -Infinity;
        by[c].sort(function (a, b) { return a - b; }).forEach(function (t) { if (t - last > lh * 0.5) { count++; last = t; } });
      });
      return count;
    });
  }
  function levelRows(counts, ncol, most) {
    var seq = [];
    counts.forEach(function (n) {
      if (!n) return;
      if (seq.length) seq.push(null);
      for (var i = 0; i < n; i++) seq.push({ i: i, n: n });
    });
    // (null where a column would open or close on air, or run short;
    // else how many single lines the breaks leave)
    var fit = function (H) {
      var at = 0, lone = 0;
      for (var c = 0; c < ncol; c++) {
        if (c && seq[at] === null) at++;
        var a = seq[at], z = seq[at + H - 1];
        if (!a || !z) return null;
        if (c && a.n > 1 && a.i === a.n - 1) lone++;
        if (z.n > 1 && z.i === 0) lone++;
        at += H;
      }
      return lone;
    };
    for (var H = most; H >= 1; H--) {
      var l = fit(H);
      if (l == null) continue;
      if (l && H > 1 && fit(H - 1) === 0) return H - 1;
      return H;
    }
    return 0;
  }
  // WHERE THE INK STANDS ON A LINE (2026-09-24): a text box runs from
  // its face's ascent over the baseline to its descent under it, as the
  // engine rounds them; read once a face off a zero probe beside the
  // text itself, and kept while the landed faces stay what they were.
  var faceBoxMemo = {}, faceBoxFaces = -1;
  function faceBox(node) {
    var el = node.parentNode, cs = getComputedStyle(el);
    if (faceBoxFaces !== memoFaces) { faceBoxFaces = memoFaces; faceBoxMemo = {}; }
    var key = cs.fontStyle + '|' + cs.fontWeight + '|' + cs.fontSize + '|' + cs.fontFamily + '|' + cs.lineHeight;
    if (!faceBoxMemo[key]) {
      // (on a line of its own, out of the flow, so nothing reflows)
      var w = document.createElement('span');
      w.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;visibility:hidden';
      w.innerHTML = '<span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span>H';
      el.appendChild(w);
      var base = w.firstChild.getBoundingClientRect().bottom;
      var rg = document.createRange(); rg.selectNodeContents(w.lastChild);
      var r0 = rg.getClientRects()[0];
      w.remove();
      faceBoxMemo[key] = r0 ? { a: base - r0.top, d: r0.bottom - base } : { a: 0, d: 0 };
    }
    return { a: faceBoxMemo[key].a, d: faceBoxMemo[key].d, cs: cs };
  }
  // The first line's painted top (its own letters' ascent: the tallest
  // of capital, ascender and quote mark), and the baseline of the last
  // line that stands inside `clip`.
  function firstInkTop(el) {
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange();
    var top = null, node = null, line = '';
    for (var n = tw.nextNode(); n; n = tw.nextNode()) {
      var re = /\S+/g, m;
      while ((m = re.exec(n.nodeValue))) {
        rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        var r = rg.getClientRects()[0];
        if (!r || !r.height) continue;
        if (top == null) { top = r.top; node = n; }
        else if (Math.abs(r.top - top) > 2) { n = null; break; }
        line += (line ? ' ' : '') + m[0];
      }
      if (!n) break;
    }
    if (top == null) return null;
    var fb = faceBox(node), cs = fb.cs;
    if (cs.textTransform === 'uppercase') line = line.toUpperCase();
    measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    return top + fb.a - (measureCtx.measureText(line).actualBoundingBoxAscent || 0);
  }
  function lastBaselineIn(el, clip, lh) {
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange();
    var best = null, node = null;
    // (half a line's grace under the clip: an italic's text box stands a
    // pixel past its line's foot, and the next line is a whole line on)
    var foot = clip.bottom + (lh ? lh / 2 : 0.5);
    for (var n = tw.nextNode(); n; n = tw.nextNode()) {
      var e = n.nodeValue.replace(/\s+$/, '').length;
      if (!e) continue;
      rg.setStart(n, e - 1); rg.setEnd(n, e);
      var rs = rg.getClientRects(), r = rs[rs.length - 1];
      if (!r || !r.height || r.bottom > foot || r.right > clip.right + 0.5) continue;
      if (!best || r.bottom > best.bottom + 0.5) { best = r; node = n; }
    }
    return best ? best.bottom - faceBox(node).d : null;
  }
  function sealPreview(bt, cap, lh) {
    var box = bt.getBoundingClientRect();
    // (a line shows if its box ends inside the cap, give or take half a
    // line: a face's text box can stand a hair past its line's)
    var maxB = cap != null ? box.top + cap + (lh ? lh / 2 : 0.5) : Infinity, maxR = box.right + 0.5;
    var words = [];
    var tw = document.createTreeWalker(bt, NodeFilter.SHOW_TEXT);
    for (var n = tw.nextNode(); n; n = tw.nextNode()) {
      var re = /\S+/g, m;
      while ((m = re.exec(n.nodeValue))) words.push({ n: n, s: m.index, e: m.index + m[0].length });
    }
    if (!words.length) return;
    var rg = document.createRange();
    var shows = function (w, s, e) {
      rg.setStart(w.n, s); rg.setEnd(w.n, e);
      var rs = rg.getClientRects(), r = rs[rs.length - 1];
      return !!r && r.bottom <= maxB && r.right <= maxR;
    };
    var k = words.length - 1;
    if (!shows(words[k], words[k].s, words[k].e)) {
      var lo = -1, hi = k;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (shows(words[mid], words[mid].s, words[mid].e)) lo = mid; else hi = mid; }
      k = lo;
    }
    if (k < 0) return;
    for (; k >= 0; k--) {
      var w = words[k];
      rg.setStart(w.n, w.e); rg.setEnd(bt, bt.childNodes.length);
      rg.deleteContents();
      var head = w.n.nodeValue.slice(0, w.e);
      if (/\u2026\s*$/.test(head) && k === words.length - 1) { w.n.nodeValue = head; break; }
      w.n.nodeValue = head.replace(TRAIL_PUNCT, '') + '\u2026';
      var end = w.n.nodeValue.length;
      if (end > 0 && shows(w, end - 1, end)) break;
      w.n.nodeValue = head.slice(0, w.s);
    }
  }
  function swapTokens(text) {
    var out = [];
    text.split(/\s+/).forEach(function (w) {
      if (!w) return;
      var parts = w.split(/(?<=-)(?=.)/);
      parts.forEach(function (p, i) { out.push({ t: p, sp: i === 0 && out.length > 0 }); });
    });
    return out;
  }
  function swapPartition(tok, k, w100) {
    var n = tok.length, INF = Infinity;
    var seg = function (a, b) {
      var s = '';
      for (var i = a; i < b; i++) s += (i > a && tok[i].sp ? ' ' : '') + tok[i].t;
      return w100(s);
    };
    var dp = [], cut = [];
    for (var p = 0; p <= n; p++) { dp.push(new Array(k + 1).fill(INF)); cut.push(new Array(k + 1).fill(0)); }
    dp[0][0] = 0;
    for (var m = 1; m <= k; m++) {
      for (var e = m; e <= n; e++) {
        for (var b = m - 1; b < e; b++) {
          var w = Math.max(dp[b][m - 1], seg(b, e));
          if (w < dp[e][m]) { dp[e][m] = w; cut[e][m] = b; }
        }
      }
    }
    var lines = [], at = n;
    for (var mm = k; mm >= 1; mm--) {
      var bb = cut[at][mm], s = '';
      for (var i = bb; i < at; i++) s += (i > bb && tok[i].sp ? ' ' : '') + tok[i].t;
      lines.unshift(s); at = bb;
    }
    return { w: dp[n][k], lines: lines };
  }
  function seatSwapCols() {
    var px = function (v) { return parseFloat(v) || 0; };
    var jobs = [];
    [].forEach.call(document.querySelectorAll(SWAP_CARDS), function (card) {
      var col = card.querySelector('.swap-col');
      if (!col) return;
      var title = card.querySelector('.card-title, .latest-title');
      var picEl = card.querySelector('.duo-card-image, .latest-cell--ps .latest-cover, .latest-cover-col--square');
      if (!title || !picEl || !title.classList.contains('rx')) { col.classList.remove('is-set'); card.classList.remove('has-swap'); return; }
      // the box is read where it rests: a card caught open keeps the
      // column it was given
      if (col.classList.contains('is-set') && card.matches('.is-open, .is-opening, .is-shutting')) return;
      jobs.push({ card: card, col: col, title: title, picEl: picEl, link: col.parentElement,
        st: col.querySelector('.swap-title'), sd: col.querySelector('.swap-dek'),
        dek: card.querySelector('.card-dek, .latest-dek') });
    });
    if (!jobs.length) return;
    // READ: every card's frame first — the box and its --wrap — so a
    // column can find the frame across from it
    jobs.forEach(function (j) {
      var tr = j.title.getBoundingClientRect(), bf = getComputedStyle(j.title, '::before');
      j.B = { l: tr.left + px(bf.left), r: tr.right - px(bf.right), t: tr.top + px(bf.top), b: tr.bottom - px(bf.bottom) };
      j.W = px(getComputedStyle(j.card).getPropertyValue('--wrap'));
      j.F = { l: j.B.l - j.W, r: j.B.r + j.W, t: j.B.t - j.W, b: j.B.b + j.W };
    });
    // READ: the picture's seat, the box, the faces
    jobs.forEach(function (j) {
      var pr = restRect(j.picEl), lr = restRect(j.link);
      var B = j.B;
      var V = { l: pr.left, r: pr.right, t: pr.top, b: pr.bottom };
      // (the frame's --wrap round the box stands over the column too)
      var W = px(getComputedStyle(j.card).getPropertyValue('--wrap'));
      var side = '';
      if (j.card.matches('.latest-cell--contra')) {
        if (B.t > pr.top && B.t < pr.bottom) { V.b = B.t - W; side = 'b'; }
        else if (B.b > pr.top && B.b < pr.bottom) { V.t = B.b + W; side = 't'; }
      } else if (B.l > pr.left && B.l < pr.right) { V.r = B.l - W; side = 'r'; }
      else if (B.r > pr.left && B.r < pr.right) { V.l = B.r + W; side = 'l'; }
      // THE INK STANDS AS FAR FROM THE FRAME AS FROM THE FAR EDGE
      // (2026-09-22): the side across from the frame keeps SWAP_PAD too
      // — the card's edge, on the page's content line — so the centred
      // words have the same air on either side of their ink. (It was
      // open: a hero's title stood 63 off its frame and 27 off the
      // edge, a paired postscript's ran to the edge itself, and a
      // review's words sat 32 nearer the cell's foot than its frame.)
      var FAR = { l: 'r', r: 'l', t: 'b', b: 't' };
      var pd = function (k) { return (k === side || k === FAR[side]) ? SWAP_PAD : SWAP_OPEN; };
      // THE COLUMN STANDS CENTRED BETWEEN TWO FRAMES (2026-09-22): where
      // another card's frame stands across the column's open side, in
      // the same band of the page (a postscript beside a review), the
      // column reaches to that frame and keeps SWAP_PAD off it as it does
      // off its own — the words centred between the two pictures, not
      // floating toward the gutter between the cells
      var across = null;
      if (side === 'r' || side === 'l') {
        jobs.forEach(function (k) {
          if (k === j || !k.F) return;
          if (k.F.b <= V.t + 1 || k.F.t >= V.b - 1) return;
          if (side === 'r' && k.F.r <= V.l + 1 && k.F.r > V.l - 200) { if (!across || k.F.r > across) across = k.F.r; }
          if (side === 'l' && k.F.l >= V.r - 1 && k.F.l < V.r + 200) { if (across == null || k.F.l < across) across = k.F.l; }
        });
      }
      if (across != null) {
        if (side === 'r') V.l = across; else V.r = across;
        pd = function () { return SWAP_PAD; };
        pd.both = true;
      }
      if (pd.both) { var oT = V.t, oB = V.b; pd = (function (sd) { return function (k) { return (k === 't' || k === 'b') ? SWAP_OPEN : SWAP_PAD; }; })(side); V.t = oT; V.b = oB; }
      // (the body keeps SWAP_PAD above and below at the least, and on
      // the frame's side; its far side is open like the title's)
      // THE FRAME'S TRAVEL AND WHAT IT LEAVES (2026-09-22): opened, the
      // frame and its picture slide over the title column until the
      // frame's near edge is on the card's; the column that uncovers at
      // its far end is the body's, as wide (or tall) as the travel
      var cr0 = restRect(j.card);
      if (side === 'r') { j.T = (B.l - W) - pr.left; j.sx = -j.T; j.sy = 0; j.Bd = { l: B.r + W - j.T, r: B.r + W, t: pr.top, b: pr.bottom }; j.bp = { l: SWAP_PAD, r: SWAP_OPEN, t: SWAP_PAD, b: SWAP_PAD }; }
      else if (side === 'l') { j.T = pr.right - (B.r + W); j.sx = j.T; j.sy = 0; j.Bd = { l: B.l - W, r: B.l - W + j.T, t: pr.top, b: pr.bottom }; j.bp = { l: SWAP_OPEN, r: SWAP_PAD, t: SWAP_PAD, b: SWAP_PAD }; }
      else if (side === 'b') { j.T = (B.t - W) - pr.top; j.sx = 0; j.sy = -j.T; j.Bd = { l: pr.left, r: pr.right, t: B.b + W - j.T, b: B.b + W }; j.bp = { l: SWAP_OPEN, r: SWAP_OPEN, t: SWAP_PAD, b: SWAP_PAD }; }
      else if (side === 't') { j.T = pr.bottom - (B.b + W); j.sx = 0; j.sy = j.T; j.Bd = { l: pr.left, r: pr.right, t: B.t - W, b: B.t - W + j.T }; j.bp = { l: SWAP_OPEN, r: SWAP_OPEN, t: SWAP_PAD, b: SWAP_PAD }; }
      // THE COLUMNS OF THE GRID (2026-09-23): three columns of the
      // standard width, 72 between them. The title column is the grid
      // column next to the picture, across the 72; opened, the frame
      // slides the column and the gutter over it, and the body is the one
      // column the frame leaves at its far end. An essay's picture is two
      // columns and the gutter between (style.css); a postscript's is one,
      // in the latest row (the postscripts' own pairs are not on the grid).
      // THE POSTSCRIPTS' OWN ROWS ARE FOUR COLUMNS (2026-09-23): two
      // pictures and two title columns, 72 between each — a cell is its
      // picture, the gutter and its title, so a column is half the cell
      // less half the gutter.
      var stdW = px(getComputedStyle(j.card).getPropertyValue('--std-w'));
      if (j.card.closest('.card--ps-pair')) stdW = (cr0.width - ROW_GAP) / 2;
      var onGrid = stdW > 0 && (side === 'l' || side === 'r')
        && j.card.matches('.duo-half--mega, .latest-cell--ps');
      if (onGrid) {
        var G = ROW_GAP, Fl = B.l - W, Fr = B.r + W;
        if (side === 'r') { V.r = Fl - G; V.l = V.r - stdW; }
        else { V.l = Fr + G; V.r = V.l + stdW; }
        pd = function (k) { return (k === 'l' || k === 'r') ? SWAP_PAD : SWAP_OPEN; };
        // THE ESSAY'S TITLE STANDS UNDER ITS PICTURE (2026-09-23): the
        // title and the dek run the picture's width under it, left, the
        // title's ink 18 under the picture's foot (seated below, once
        // set); the grid column across the gutter stands empty until the
        // picture slides over it and the body opens in its own
        if (j.card.matches('.duo-half--mega')) {
          j.under = true;
          // (the title in the picture's first grid column, the dek in its
          // second across the 72 — 2026-09-23, later still)
          // (…the picture's whole width since the dek went into the
          // preview: a title keeps to one line wherever one line holds it
          // at its full size)
          V.l = Fl; V.r = Fr; V.t = B.b + ESSAY_TITLE_GAP; V.b = V.t + ESSAY_TITLE_H;
          j.picW = Fr - Fl;
          pd = function () { return 0; };
        }
        j.T = stdW + G;
        j.sx = side === 'r' ? -j.T : j.T; j.sy = 0;
        j.Bd = side === 'r' ? { l: Fr - stdW, r: Fr, t: pr.top, b: pr.bottom } : { l: Fl, r: Fl + stdW, t: pr.top, b: pr.bottom };
        j.bp = { l: 0, r: 0, t: SWAP_PAD, b: SWAP_PAD };
        // THE ESSAY'S PREVIEW OPENS IN ITS PICTURE (2026-09-23): the
        // picture holds still and darkens, and the body stands in it in
        // two columns, 54 round and 36 between (style.css, THE ESSAY'S
        // PREVIEW OPENS IN ITS PICTURE)
        if (j.under) {
          j.sx = 0;
          j.Bd = { l: Fl, r: Fr, t: B.t, b: B.b };
          j.cols2 = true;
          // (ONE COLUMN IN A NARROW PICTURE, 2026-09-23: a postscript's
          // portrait or a review's square is one grid column, and two
          // columns in it stood a handful of words wide)
          j.ncol = (Fr - Fl) >= 480 ? 2 : 1;
        }
      }
      // (36 round the body's text on every side, 2026-09-23)
      if (j.bp) j.bp = { l: SWAP_PAD, r: SWAP_PAD, t: SWAP_PAD, b: SWAP_PAD };
      // (54 round an essay's, in its picture: 2026-09-23)
      if (j.bp && j.cols2) j.bp = { l: ESSAY_PREVIEW_PAD, r: ESSAY_PREVIEW_PAD, t: ESSAY_PREVIEW_PAD, b: ESSAY_PREVIEW_PAD };
      j.cr0 = cr0;
      j.body = j.card.querySelector(':scope > .swap-body');
      if (j.body) {
        var pp0 = j.card.querySelector('.card-preview-block .card-preview, .latest-plate .latest-plate-p');
        if (pp0) {
          var pcs = getComputedStyle(pp0);
          j.bfont = { fontFamily: pcs.fontFamily, fontSize: pcs.fontSize, fontStyle: pcs.fontStyle, fontWeight: pcs.fontWeight, lineHeight: pcs.lineHeight, letterSpacing: pcs.letterSpacing, hyphens: pcs.hyphens, webkitHyphens: pcs.webkitHyphens, textAlign: j.card.matches('.latest-cell--contra') ? 'center' : 'left' };
          j.blh = parseFloat(pcs.lineHeight) || (parseFloat(pcs.fontSize) || 16) * 1.2;
        }
      }
      j.I = { l: V.l + pd('l') - lr.left, t: V.t + pd('t') - lr.top, w: V.r - V.l - pd('l') - pd('r'), h: V.b - V.t - pd('t') - pd('b') };
      // A COLUMN THAT REACHES PAST ITS OWN SEAT (centred between two
      // frames, above) is not wholly covered when its frame slides over
      // the seat: the words step aside by what overhangs, in the same
      // second as the frame (--sw-cx; style.css)
      j.cx = 0;
      if (side === 'l') j.cx = -Math.max(0, (V.r - pd('r')) - pr.right);
      else if (side === 'r') j.cx = Math.max(0, pr.left - (V.l + pd('l')));
      if (onGrid) j.cx = 0;
      var tcs = getComputedStyle(j.title);
      j.family = tcs.fontFamily; j.track = trackEm(tcs);
      // THE TITLES IN SENTENCE CASE (2026-09-24): the line under the
      // picture may be set in its own face (style.css) — the Garamond, as
      // written, where the title's own is the Helvetica in capitals. Its
      // face is read off the column; a title in the Helvetica's capitals
      // keeps the old measure exactly.
      var scs = getComputedStyle(j.st);
      j.caps = scs.textTransform === 'uppercase';
      j.sface = j.caps ? '700 100px ' + j.family : scs.fontStyle + ' ' + scs.fontWeight + ' 100px ' + scs.fontFamily;
      if (j.sd && j.dek) {
        var dcs = getComputedStyle(j.dek);
        j.dfont = { fontFamily: dcs.fontFamily, fontSize: dcs.fontSize, fontStyle: dcs.fontStyle, fontWeight: dcs.fontWeight, lineHeight: dcs.lineHeight, letterSpacing: dcs.letterSpacing };
      }
      var img = j.link.querySelector('img.card-image');
      if (img) { j.pos = getComputedStyle(img).objectPosition; if (!j.card.style.getPropertyValue('--swap-img')) swapImg(j.card, img); }
    });
    // WRITE: the column's seat, the dek's face and measure
    jobs.forEach(function (j) {
      var s = j.col.style;
      s.left = j.I.l.toFixed(2) + 'px'; s.top = j.I.t.toFixed(2) + 'px';
      s.width = Math.max(0, j.I.w).toFixed(2) + 'px'; s.height = Math.max(0, j.I.h).toFixed(2) + 'px';
      if (j.pos) j.card.style.setProperty('--swap-pos', j.pos);
      j.card.style.setProperty('--sw-cx', (j.cx || 0).toFixed(2) + 'px');
      if (j.T != null && j.T > 0) {
        j.card.style.setProperty('--sw-x', j.sx.toFixed(2) + 'px');
        j.card.style.setProperty('--sw-y', j.sy.toFixed(2) + 'px');
        if (j.body && j.Bd) {
          var bs = j.body.style;
          bs.left = (j.Bd.l - j.cr0.left).toFixed(2) + 'px';
          bs.top = (j.Bd.t - j.cr0.top).toFixed(2) + 'px';
          bs.width = (j.Bd.r - j.Bd.l).toFixed(2) + 'px';
          bs.height = (j.Bd.b - j.Bd.t).toFixed(2) + 'px';
          bs.padding = j.bp.t + 'px ' + j.bp.r + 'px ' + j.bp.b + 'px ' + j.bp.l + 'px';
          var bt = j.body.querySelector(':scope > .swap-body-text') || j.body.firstElementChild;
          if (bt && j.bfont) {
            for (var kf in j.bfont) if (j.bfont[kf]) bt.style[kf] = j.bfont[kf];
            // (an essay's dek stands in its preview, centred over the two
            // columns, 36 above them: 2026-09-23)
            var pdk = null, pdkH = 0;
            if (j.cols2 && !j.body.querySelector(':scope > .swap-body-close')) {
              var cx = document.createElement('button');
              cx.type = 'button';
              cx.className = 'swap-body-close';
              cx.setAttribute('aria-label', 'Close preview');
              cx.addEventListener('click', function (ev) {
                ev.preventDefault(); ev.stopPropagation();
                var b = this.closest('.card');
                var po = b && b.querySelector('.peek-open');
                if (po) po.click();
              });
              j.body.appendChild(cx);
            }
            if (j.cols2) {
              pdk = j.body.querySelector(':scope > .swap-body-dek');
              if (!pdk) { pdk = document.createElement('span'); pdk.className = 'swap-body-dek'; j.body.insertBefore(pdk, bt); }
              var srcDek = j.dek;
              pdk.innerHTML = srcDek ? srcDek.innerHTML : '';
              if (j.dfont) for (var kd in j.dfont) if (j.dfont[kd]) pdk.style[kd] = j.dfont[kd];
              pdk.style.transform = 'none';
              pdk.style.marginBottom = SWAP_PAD + 'px';
              pdkH = pdk.textContent.trim() ? pdk.getBoundingClientRect().height + SWAP_PAD : 0;
              if (!pdkH) pdk.style.display = 'none'; else pdk.style.removeProperty('display');
            }
            var rows = Math.max(1, Math.floor((j.Bd.b - j.Bd.t - j.bp.t - j.bp.b - pdkH + 0.5) / j.blh));
            if (j.cols2) {
              // (two columns, filled in turn and cut on a whole line — or,
              // where the whole preview fits, balanced between the two at
              // its own height: either way the block stands centred in
              // the picture, top to bottom, the body's flex centring it)
              bt.style.removeProperty('-webkit-line-clamp');
              // (the text as it was built, whatever the last pass cut)
              if (bt.__src == null) bt.__src = bt.innerHTML;
              else if (bt.innerHTML !== bt.__src) bt.innerHTML = bt.__src;
              var one = j.ncol === 1;
              // (one column is no multicol at all: a multicol of one cut
              // to a height runs its overflow on in columns to the side)
              if (one) bt.style.removeProperty('column-count'); else bt.style.columnCount = '2';
              bt.style.columnGap = SWAP_PAD + 'px';
              bt.style.columnFill = 'balance';
              bt.style.height = 'auto';
              bt.style.maxHeight = 'none';
              bt.style.overflow = one ? 'hidden' : '';
              var natural = bt.getBoundingClientRect().height;
              var cap = rows * j.blh;
              // (the columns level, each opening and closing on a line:
              // BOTH COLUMNS OPEN AND CLOSE ON A LINE, above; the height
              // is given a pixel over its lines so the last one is not
              // pushed on by the engine's rounding of the leading, and
              // the body's flex may not take that pixel back; and the
              // measure is fixed here, where the lines are counted and
              // cut: snapPictures later lays the box on whole pixels, a
              // hair narrower, and a line cut full to the hair ran its
              // last word, …, out into a third column)
              bt.style.flexShrink = '0';
              bt.style.width = Math.max(0, (j.Bd.r - j.Bd.l) - j.bp.l - j.bp.r).toFixed(2) + 'px';
              var ncol = one ? 1 : 2;
              var H = levelRows(paraLines(bt, ncol, SWAP_PAD, j.blh), ncol, rows);
              var shut = H ? H * j.blh : (natural > cap + 0.5 ? cap : null);
              if (shut != null) {
                bt.style.columnFill = 'auto';
                bt.style.height = (shut + 1).toFixed(2) + 'px';
                bt.style.maxHeight = (shut + 1).toFixed(2) + 'px';
              }
              sealPreview(bt, shut, j.blh);
              // (and centred by what it SHOWS, by its ink: as much air
              // from the box's top to the painted top of the dek's first
              // line as from the columns' last baseline to the box's
              // foot — PADDING EVEN OVER AND UNDER, 2026-09-24; it was
              // the dek's box and the last line's box)
              bt.style.transform = 'none';
              var bb = j.body.getBoundingClientRect(), tb = bt.getBoundingClientRect();
              var inT = (pdk && pdkH) ? firstInkTop(pdk) : null;
              if (inT == null) inT = firstInkTop(bt);
              var inB = lastBaselineIn(bt, tb, j.blh);
              if (inT == null || inB == null) inT = Infinity;
              if (isFinite(inT)) {
                var shY = 'translateY(' + (((bb.bottom - inB) - (inT - bb.top)) / 2).toFixed(2) + 'px)';
                bt.style.transform = shY;
                if (pdk) pdk.style.transform = shY;
              }
            } else {
              bt.style.setProperty('-webkit-line-clamp', String(rows));
              bt.style.maxHeight = (rows * j.blh).toFixed(2) + 'px';
            }
          }
          j.body.classList.add('is-set');
        }
      } else if (j.body) j.body.classList.remove('is-set');
      if (j.sd && j.dfont) {
        for (var k in j.dfont) j.sd.style[k] = j.dfont[k];
        // (an essay's dek from 72 past the title's column to the picture's
        // edge; else the column's width)
        j.sd.style.width = Math.max(0, j.under && j.picW ? j.picW - j.I.w - ESSAY_DEK_APART : j.I.w).toFixed(2) + 'px';
        j.sd.style.marginTop = j.under ? '0px' : SWAP_GAP + 'px';
        if (j.under) j.sd.style.top = '0px'; else j.sd.style.removeProperty('top');
      }
    });
    // READ: the deks' heights, all at once
    jobs.forEach(function (j) { j.dh = j.sd ? j.sd.getBoundingClientRect().height + SWAP_GAP : 0; });
    // WRITE: the title, sized on the canvas
    jobs.forEach(function (j) {
      var text = j.st.getAttribute('data-text') || '';
      if (j.caps) text = text.toUpperCase();
      var tok = swapTokens(text);
      if (!tok.length || j.I.w <= 0) return;
      // (as tall as the capitals were: the Garamond's cap height brought
      // to the Helvetica's at the size the capitals were capped at, so a
      // title stands at the height it stood, only in the other face)
      var maxFs = SWAP_MAX;
      if (!j.caps) {
        measureCtx.font = '700 100px ' + j.family;
        var capWas = measureCtx.measureText('H').actualBoundingBoxAscent;
        measureCtx.font = j.sface;
        var capIs = measureCtx.measureText('H').actualBoundingBoxAscent;
        if (capWas > 0 && capIs > 0) maxFs = SWAP_MAX * capWas / capIs;
        j.track = 0;
      }
      measureCtx.font = j.sface;
      var tr100 = j.track * 100;
      var w100 = function (str) { return measureCtx.measureText(str).width + tr100 * str.length; };
      var best = null, tries = [];
      for (var k = 1; k <= Math.min(SWAP_LINES, tok.length); k++) {
        var p = swapPartition(tok, k, w100);
        var fs = Math.min(j.I.w * 100 / p.w, (j.I.h - j.dh) / k, maxFs) * 0.99;
        tries.push({ fs: fs, lines: p.lines });
        if (!best || fs > best.fs + 0.5) best = { fs: fs, lines: p.lines };
      }
      // AN ESSAY'S TITLE STANDS AS TALL AS IT CAN (2026-09-23): WHAT /
      // WAS / COLLEGE / FOR — the most lines, a word a line at the
      // most, that still set at the best size the title can take; where
      // stacking would cost the type any size (the column too short or
      // too narrow for it), it keeps the fewer lines.
      if (best && j.card.matches('.duo-half--mega') && !j.under) {
        var top = best.fs;
        tries.forEach(function (t) { if (t.fs >= top - 0.5 && t.lines.length > best.lines.length) best = t; });
      }
      if (!best || best.fs <= 0) return;
      j.st.textContent = '';
      best.lines.forEach(function (ln) {
        var sp = document.createElement('span');
        sp.className = 'swap-line';
        sp.textContent = ln;
        j.st.appendChild(sp);
      });
      j.st.style.fontSize = Math.floor(best.fs * 4) / 4 + 'px';
      j.st.style.letterSpacing = j.track ? j.track + 'em' : '';
      j.col.classList.add('is-set');
      j.card.classList.add('has-swap');
    });
    // (the essay's title under its picture: its first line's painted top
    // brought to 18 under the picture's foot — read all, then write)
    var unders = jobs.filter(function (j) { return j.under && j.col.classList.contains('is-set'); });
    unders.forEach(function (j) {
      var ln = j.st.querySelector('.swap-line');
      var rg = document.createRange(); if (ln) rg.selectNodeContents(ln);
      var r = ln ? [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; })[0] : null;
      if (!r) return;
      var cs = getComputedStyle(ln);
      measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = measureCtx.measureText(ln.textContent || '');
      var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      var inkTop = r.top + (r.height - (fa + fd)) / 2 + fa - m.actualBoundingBoxAscent;
      // (18 under the courier's ink where the courier stands under the
      // picture, as it does since 2026-09-23 — else 18 under the picture)
      var cFoot = -Infinity, cHead = Infinity;
      [].forEach.call(j.card.querySelectorAll('.cover-meta'), function (cm) {
        var t0 = (cm.textContent || '').trim();
        if (!t0) return;
        var rc = document.createRange(); rc.selectNodeContents(cm);
        var rr = [].filter.call(rc.getClientRects(), function (x) { return x.width > 0; })[0];
        if (!rr || rr.top < j.B.b - 1) return;
        var ccs = getComputedStyle(cm);
        measureCtx.font = ccs.fontStyle + ' ' + ccs.fontWeight + ' ' + ccs.fontSize + ' ' + ccs.fontFamily;
        var cmm = measureCtx.measureText(ccs.textTransform === 'uppercase' ? t0.toUpperCase() : t0);
        var cfa = cmm.fontBoundingBoxAscent, cfd = cmm.fontBoundingBoxDescent;
        var cb0 = rr.top + (rr.height - (cfa + cfd)) / 2 + cfa;
        cFoot = Math.max(cFoot, cb0 + cmm.actualBoundingBoxDescent);
        cHead = Math.min(cHead, cb0 - cmm.actualBoundingBoxAscent);
      });

      // (the words' ink 18 under the courier's — the rule that stood
      // between them for an afternoon is struck, 2026-09-23)
      var above = isFinite(cFoot) ? cFoot : j.B.b;
      var tTop = above + ESSAY_TITLE_GAP;
      j.inkShift = tTop - inkTop;
      // and the dek beside the title, its ink's top on the title's
      var lns = j.st.querySelectorAll('.swap-line'), last = lns[lns.length - 1];
      var rl = document.createRange(); rl.selectNodeContents(last);
      var r2 = [].filter.call(rl.getClientRects(), function (x) { return x.width > 0; })[0];
      var dk = j.sd && j.sd.querySelector('.swap-dek-ink');
      if (r2 && dk) {
        var base = r2.top + (r2.height - (fa + fd)) / 2 + fa;
        var dcs = getComputedStyle(dk);
        measureCtx.font = dcs.fontStyle + ' ' + dcs.fontWeight + ' ' + dcs.fontSize + ' ' + dcs.fontFamily;
        var dm = measureCtx.measureText((dk.textContent || '').trim());
        var rd = document.createRange(); rd.selectNodeContents(dk);
        var r3 = [].filter.call(rd.getClientRects(), function (x) { return x.width > 0; })[0];
        if (r3) {
          var dfa = dm.fontBoundingBoxAscent, dfd = dm.fontBoundingBoxDescent;
          var dTop = r3.top + (r3.height - (dfa + dfd)) / 2 + dfa - dm.actualBoundingBoxAscent;
          // (beside the title now, its ink's top on the title's: the
          // column is carried by inkShift, and the dek, set in it, with it)
          j.dekShift = tTop - (dTop + j.inkShift);
        }
      }
    });
    unders.forEach(function (j) {
      if (j.inkShift == null) return;
      j.col.style.top = ((parseFloat(j.col.style.top) || 0) + j.inkShift).toFixed(2) + 'px';

      if (j.dekShift != null && j.sd) j.sd.style.top = ((parseFloat(j.sd.style.top) || 0) + j.dekShift).toFixed(2) + 'px';
    });
  }
  function seatWordClips() {
    var px = function (v) { return parseFloat(v) || 0; };
    var carried = function (el) {
      var t = getComputedStyle(el).translate;
      if (!t || t === 'none') return [0, 0];
      var a = t.split(/\s+/);
      return [px(a[0]), px(a[1])];
    };
    var CK = ['--ck-t', '--ck-r', '--ck-b', '--ck-l'];
    var clear = function (el) { if (el) CK.forEach(function (v) { el.style.removeProperty(v); }); };
    var write = function (el, box) {
      var r = el.getBoundingClientRect(), c = carried(el);
      if (!r.width && !r.height) { clear(el); return; }
      el.style.setProperty('--ck-t', (box.t - (r.top - c[1])).toFixed(2) + 'px');
      el.style.setProperty('--ck-r', ((r.right - c[0]) - box.r).toFixed(2) + 'px');
      el.style.setProperty('--ck-b', ((r.bottom - c[1]) - box.b).toFixed(2) + 'px');
      el.style.setProperty('--ck-l', (box.l - (r.left - c[0])).toFixed(2) + 'px');
    };
    [].forEach.call(document.querySelectorAll('.duo-half--mega, .latest-cell--ps, .latest-cell--contra'), function (card) {
      var title = card.querySelector('.card-title, .latest-title');
      var dek = card.querySelector('.card-dek, .latest-dek');
      if (!title || !title.classList.contains('rx')) { clear(title); clear(dek); }
      else {
        var bf = getComputedStyle(title, '::before');
        var bT = px(bf.top), bR = px(bf.right), bB = px(bf.bottom), bL = px(bf.left);
        title.style.setProperty('--ck-t', bT.toFixed(2) + 'px');
        title.style.setProperty('--ck-r', bR.toFixed(2) + 'px');
        title.style.setProperty('--ck-b', bB.toFixed(2) + 'px');
        title.style.setProperty('--ck-l', bL.toFixed(2) + 'px');
        var tr0 = title.getBoundingClientRect();
        if (dek) write(dek, { l: tr0.left + bL, r: tr0.right - bR, t: tr0.top + bT, b: tr0.bottom - bB });
      }
      // ONE FLUID MOTION (2026-09-22, later): the box's release, the
      // picture's travel and the preview's arrival run together, and the
      // title's side and the preview both stand OVER the picture the
      // whole way, each clipped to what the picture has not yet reached
      // (style.css, ONE FLUID MOTION). Written here: the travel of the
      // picture's edge on the words' side (--tw) and on the preview's
      // (--tb), signed, with their sizes; where the title's side begins
      // to be clipped (--cc0, the box's own edge on the picture) and
      // where the preview's clip stands at the close (--pc0, the
      // picture's landed edge).
      var contra = card.matches('.latest-cell--contra');
      var rev = card.matches('.latest-cell--contra-rev');
      var ccs = getComputedStyle(card);
      var picEl = card.querySelector('.duo-card-image, .latest-cell--ps .latest-cover, .latest-cover-col--square');
      var colEl = card.querySelector('.duo-panel .panel-col--left, :scope > .latest-col');
      var plateEl = card.querySelector('.card-preview-block, .latest-plate');
      if (picEl && colEl && plateEl) {
        var pr = restRect(picEl), co = colEl.getBoundingClientRect(), pb = plateEl.getBoundingClientRect();
        var O = REST_OVERLAP, tw, tb, cc0, pc0;
        if (!contra) {
          var sl = px(ccs.getPropertyValue('--slide'));
          tw = sl; tb = sl;
          if (sl >= 0) { cc0 = (pr.right - O) - co.left; pc0 = pb.right - (pr.left + sl); }
          else { cc0 = co.right - (pr.left + O); pc0 = (pr.right + sl) - pb.left; }
        } else {
          var t0 = px(ccs.getPropertyValue('--pic-top')), t1 = px(ccs.getPropertyValue('--pic-top-open'));
          var h0 = px(ccs.getPropertyValue('--pic-h')), h1 = px(ccs.getPropertyValue('--pic-h-open')) || h0;
          var dT = t1 - t0, dB = (t1 + h1) - (t0 + h0);
          if (!rev) { tw = dB; tb = dT; cc0 = (pr.bottom - O) - co.top; pc0 = pb.bottom - (pr.top + dT); }
          else { tw = dT; tb = dB; cc0 = co.bottom - (pr.top + O); pc0 = (pr.bottom + dB) - pb.top; }
        }
        card.style.setProperty('--tw', tw.toFixed(2) + 'px');
        card.style.setProperty('--tb', tb.toFixed(2) + 'px');
        card.style.setProperty('--twa', Math.abs(tw).toFixed(2) + 'px');
        card.style.setProperty('--tba', Math.abs(tb).toFixed(2) + 'px');
        colEl.style.setProperty('--cc0', cc0.toFixed(2) + 'px');
        plateEl.style.setProperty('--pc0', pc0.toFixed(2) + 'px');
      }
      var cu = card.querySelector('.plate-curtain');
      if (!cu) return;
      var bodies = cu.querySelectorAll('.card-preview-cols, .latest-plate-p');
      var pf = getComputedStyle(cu, '::before');
      var cr = cu.getBoundingClientRect();
      if (!cr.width) { [].forEach.call(bodies, clear); return; }
      var pbi = px(pf.getPropertyValue('--pb-i')), pbf = px(pf.getPropertyValue('--pb-f'));
      var P = { l: cr.left + px(pf.left), r: cr.right - px(pf.right), t: cr.top + px(pf.top), b: cr.bottom - px(pf.bottom) };
      if (card.matches('.latest-cell--contra')) {
        P.l += pbi; P.r -= pbi;
        if (card.matches('.latest-cell--contra-rev')) P.b -= pbi; else P.t += pbi;
      } else if (card.classList.contains('pic-left')) { P.l += pbf; P.t += pbi; P.b -= pbi; }
      else { P.r -= pbf; P.t += pbi; P.b -= pbi; }
      [].forEach.call(bodies, function (b) { write(b, P); });
    });
  }
  // THE LAST WORD ON THE AXIS (2026-09-22, night): once every step has
  // had its hand on the words, the title and the dek are read where
  // they stand and carried the last pixel onto the box's own centre —
  // whatever moved them since seatMatterMeta measured them (a dek came
  // to rest 19 and 41 off on two cards; which hand did it was not
  // found, and this does not need to know).
  function centreMatter() {
    [].forEach.call(document.querySelectorAll('.duo-half--mega, .latest-cell--ps'), function (card) {
      var title = card.querySelector('.card-title, .latest-title');
      if (!title || !title.classList.contains('rx')) return;
      var dek = title.nextElementSibling;
      var bf = getComputedStyle(title, '::before');
      var hb = title.getBoundingClientRect();
      // the axis of the box's part OFF the picture: its 54 over the
      // edge is not the words' to centre on
      var o = parseFloat(bf.getPropertyValue('--rx-o')) || 0;
      var bL = hb.left + (parseFloat(bf.left) || 0), bR = hb.right - (parseFloat(bf.right) || 0);
      // the words' span is the box's part off the picture less the 54
      // past the ink on the far side: [edge, far - 54]
      // the longest line's near edge on the picture's edge: the axis is
      // that edge plus half the widest ink
      var lines0 = title.querySelectorAll('.title-line');
      if (!lines0.length) lines0 = title.querySelectorAll('.hl-ink');
      var wT = 0;
      [].forEach.call(lines0, function (ln) {
        var rr = ln.getBoundingClientRect();
        wT = Math.max(wT, (rr.right - (parseFloat(ln.style.getPropertyValue('--hl-rgt')) || 0)) - (rr.left + (parseFloat(ln.style.getPropertyValue('--hl-lft')) || 0)));
      });
      var edD = dek ? inkEdges(dek) : null;
      var wide = Math.max(wT, edD ? edD.r - edD.l : 0);
      // (the box's own middle since the 72s: the words centred in it)
      var axis = (bL + bR) / 2;
      // the title off its lines' own bearings (a Range over block-level
      // lines answers with the block's width); its pseudo rides its
      // transform, so the box's insets pay the correction back
      if (title.classList.contains('rb-x')) {
        var lines = title.querySelectorAll('.title-line');
        if (!lines.length) lines = title.querySelectorAll('.hl-ink');
        var tL = Infinity, tR = -Infinity;
        [].forEach.call(lines, function (ln) {
          var rr = ln.getBoundingClientRect();
          tL = Math.min(tL, rr.left + (parseFloat(ln.style.getPropertyValue('--hl-lft')) || 0));
          tR = Math.max(tR, rr.right - (parseFloat(ln.style.getPropertyValue('--hl-rgt')) || 0));
        });
        if (isFinite(tL) && tR > tL) {
          var offT = axis - (tL + tR) / 2;
          if (Math.abs(offT) >= 0.3) {
            var dxT = parseFloat(title.style.getPropertyValue('--rb-dx')) || 0;
            title.style.setProperty('--rb-dx', (dxT + offT).toFixed(2) + 'px');
            var l0 = parseFloat(title.style.getPropertyValue('--rx-l')) || 0, r0 = parseFloat(title.style.getPropertyValue('--rx-r')) || 0;
            title.style.setProperty('--rx-l', (l0 - offT).toFixed(2) + 'px');
            title.style.setProperty('--rx-r', (r0 + offT).toFixed(2) + 'px');
          }
        }
      }
      if (!dek || !dek.classList.contains('rb-x')) return;
      var ed = inkEdges(dek);
      if (!ed) return;
      var off = axis - (ed.l + ed.r) / 2;
      if (Math.abs(off) < 0.3) return;
      var dx = parseFloat(dek.style.getPropertyValue('--rb-dx')) || 0;
      dek.style.setProperty('--rb-dx', (dx + off).toFixed(2) + 'px');
    });
  }

  // ONE PASS FOR THE WHOLE ARRIVAL (2026-09-19). Four separate hands
  // asked for a fit on a cold load — this script's own first call, then
  // fonts.ready, then every loadingdone, then window load — and each ran
  // the full thirty-three steps end to end. Measured on the front page:
  // four passes closing at 2.8, 5.4, 8.7 and 13.9 seconds, the gate
  // lifting at 15.2, and the reader holding a blank screen for all of
  // it, since the page stands at opacity 0 until the lift. Nothing
  // between the late three changed what the next would measure: the
  // faces land once and the covers with them, so passes two, three and
  // four re-measured a page that had stopped moving. They are coalesced
  // now — each hand ASKS, an ask restarts a short quiet timer, and one
  // pass runs when the asks stop, which is the same debounce the resize
  // has carried all along. The first pass keeps its synchronous place
  // during parse: the gate cannot lift before it, so the page is fitted
  // whole before it is ever seen, exactly as before.
  var FIT_QUIET = 64;
  var fitQuietTimer = null;
  // THE FIRST PASS WAITS FOR THE FACES (2026-09-21). It began 64ms after
  // the parser reached this script, faces or no faces, and on a cold
  // load that is before they are in: measured on the live page, the
  // first pass ended with seven of ten landed and 337 of its values
  // were written again by the pass the rest then asked for. The gate in
  // the head loads the faces by name and says when they are all in
  // (newcritic:fontsin; a flag for this script, which parses later than
  // it may be said). Until then an ask is held — but not for ever: past
  // FONT_WAIT a dead kit degrades to what it always did, a pass on the
  // fallback and another when a face does land.
  var FONT_WAIT = 4000;
  var fontsIn = !!window.__ncFontsIn;
  var fontWaitTimer = null;
  window.addEventListener('newcritic:fontsin', function () { fontsIn = true; requestFit(); });
  function answerAsk() {
    if (!fontsIn && performance.now() < FONT_WAIT) {
      if (!fontWaitTimer) {
        fontWaitTimer = setTimeout(function () { fontWaitTimer = null; requestFit(); },
          Math.max(0, FONT_WAIT - performance.now()) + 5);
      }
      return;
    }
    var w = worldSig();
    if (lastWorld && lastWorld.start === w && lastWorld.end === w) return;
    fitAll();
  }
  function requestFit() {
    if (fitQuietTimer) clearTimeout(fitQuietTimer);
    fitQuietTimer = setTimeout(function () { fitQuietTimer = null; answerAsk(); }, FIT_QUIET);
  }
  (function(){
    if (!heroLink) return;
    var img = heroLink.querySelector('img.card-image');
    // A hero image landing after first run changes the link box (and the
    // panel pinned to it) — refit everything once it arrives.
    if (img && !img.complete) img.addEventListener('load', requestFit, { once: true });
  })();
  // ONE PASS, NOT TWO (2026-09-19). The arrival was coalesced from four
  // passes to two a day ago; it is one now. The pass that stood here
  // ran SYNCHRONOUSLY during parse, before a face had landed — and
  // measured against fallback metrics it was not merely early but
  // WRONG, and known to be: seatInkBlocks, the most expensive step in
  // the pass, does nothing at all before the fonts are in, so the
  // parse-time pass laid out a page it could not finish and every
  // number it did write was measured again by the pass that followed.
  // Measured on the front page: 2546ms of blocking parse for a result
  // thrown away entire, and the reader saw none of it — the gate holds
  // the page at opacity 0 throughout, so there was never a frame in
  // which the first pass's answer was on screen.
  //   What it did buy was the guarantee that a fit had happened before
  // the gate could lift. That is bought outright now (announceFirstFit
  // above), so the ask can take its place here with the other three,
  // and the faces, the covers and the parser all ask for the same
  // single pass. Measured after: domInteractive 2256ms -> 145ms, and
  // the page seen at 6.8s where it was seen at 8.8s.
  requestFit();
  // Fonts landing after first paint change every line's height — refit.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestFit);
  // AND ON EVERY FONT THAT LANDS LATER: fonts.ready resolves once the
  // faces in use at that moment are in, and a face first used after it
  // arrives with no refit — every seat read off canvas metrics was then
  // read off the fallback. (The wordmark's Placard was the case that
  // taught this; the face is struck now, but a kit face on a cold cache
  // lands the same way.)
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', requestFit);
  window.addEventListener('load', requestFit);
  // A CARD SHUTTING RE-SEATS ITS OWN CONTROL (card-open.js fires it).
  // Any seat left stale by a layout that moved after the last pass — a
  // picture landing late, a row turning over — is corrected the moment
  // the reader shuts the card, which is the one point where the page
  // is certainly back at rest. The wait is the card's own .4s travel.
  // THE LATEST, seated (2026-09-17): the tag stands over the hero's
  // top rule by exactly what the hero's own courier line stands under
  // it — the line's cap ink to the rule, mirrored — and its left edge
  // is that line's ink, ranged as the line is, whichever side the
  // picture put it on. Set against the tag's offset parent, so it
  // needs no positioned wrap. (It stood centred in the air under the
  // wordmark for a moment.)
  // A LINE'S PAINTED INK (2026-09-17): its reach above and below the
  // baseline scanned off a canvas at its own size and case, the
  // baseline read off a zero probe at its head. Where the font's
  // metric model (inkOffsets) says where ink should be, this says
  // where it is — the courier's seats against rules read exact by it.
  // ONE RASTER FOR EVERY SCAN (2026-09-19). inkReach and inkWidth each
  // built a FRESH 3000×320 canvas per call and threw it away — eighty-
  // five of them on a front-page pass, three and a half megabytes of
  // pixels apiece, allocated to be drawn on once. The two scan at the
  // same size and always have, so the raster is made once and wiped
  // between scans. Wiped rather than resized: assigning width clears
  // the pixels but resets the whole context with them, and the font,
  // baseline and fill would all have to be restated — clearRect says
  // what is meant and keeps the state that both functions set anyway.
  // (This is NOT the inkCv above, which only ever measures text and is
  // never drawn to; a raster wants its own.)
  var SCAN_W = 3000, SCAN_H = 320, SCAN_PX = 200, SCAN_Y0 = 240;
  var scanG = null;
  function scanCtx() {
    if (!scanG) {
      var cv = document.createElement('canvas');
      cv.width = SCAN_W; cv.height = SCAN_H;
      scanG = cv.getContext('2d');
    }
    if (scanG) scanG.clearRect(0, 0, SCAN_W, SCAN_H);
    return scanG;
  }
  // A LINE'S BASELINE AND CAP (2026-09-23): the first line's baseline
  // off a zero probe, its caps' painted top off the face's own bounds.
  var SECTION_HEAD = 54, SECTION_DEK_GAP = 18, SECTION_ROW_GAP = 36;
  function baselineOf(el) {
    var t = (el.textContent || '').trim();
    if (!t) return null;
    var cs = getComputedStyle(el);
    if (cs.textTransform === 'uppercase') t = t.toUpperCase();
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(probe, el.firstChild);
    var base = probe.getBoundingClientRect().bottom;
    probe.remove();
    measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var m = measureCtx.measureText(t);
    return { base: base, cap: base - m.actualBoundingBoxAscent };
  }
  // (and its last line's baseline, off a probe at its end)
  function lastBaseline(el) {
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(probe);
    var base = probe.getBoundingClientRect().bottom;
    probe.remove();
    return base;
  }
  // EACH LINE IS RASTERISED ONCE (2026-09-24). The scan is a pure
  // function of the face and the words — drawn at SCAN_PX, whatever
  // size the line is set at, and scaled after — yet it was drawn and
  // read back afresh on every call: a 3000×320 readback for every
  // letter of every margin stack, in both stages of a cold load, the
  // same letters over and over (the costliest thing in the pass after
  // the restyles, ~0.75s of a 1440 load). Its four edges are kept here
  // under the face and the words, and the memo is emptied whenever the
  // set of landed faces changes (freshMemos, and the check below), so
  // a scan taken on a fallback is never read back once the face is in.
  // The edges are the ones the two scans always found: the first and
  // last rows with ink (inkReach), the first and last columns (inkWidth).
  var scanMemo = {}, scanFaces = -1;
  function scanEdges(cs, text) {
    var n = 0;
    try { document.fonts.forEach(function (face) { if (face.status === 'loaded') n++; }); } catch (e) {}
    if (n !== scanFaces) { scanFaces = n; scanMemo = {}; }
    var face = cs.fontStyle + ' ' + cs.fontWeight + ' ' + SCAN_PX + 'px ' + cs.fontFamily;
    var key = face + '|' + text;
    if (Object.prototype.hasOwnProperty.call(scanMemo, key)) return scanMemo[key];
    var W = SCAN_W, H = SCAN_H;
    var g = scanCtx();
    if (!g) return undefined;
    g.font = face;
    g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(text, 20, SCAN_Y0);
    var data;
    try { data = g.getImageData(0, 0, W, H).data; } catch (e) { return undefined; }
    var top = -1, bot = -1, lo = -1, hi = -1;
    for (var y = 0; y < H; y++) {
      var row = y * W;
      for (var x = 0; x < W; x++) {
        if (data[(row + x) * 4 + 3] > 40) {
          if (top < 0) top = y;
          bot = y;
          if (lo < 0 || x < lo) lo = x;
          // the row's last ink, found from its far end
          for (var x2 = W - 1; x2 >= x; x2--) {
            if (data[(row + x2) * 4 + 3] > 40) { if (x2 > hi) hi = x2; break; }
          }
          break;
        }
      }
    }
    var out = top < 0 ? null : { top: top, bot: bot, lo: lo, hi: hi };
    scanMemo[key] = out;
    return out;
  }
  function inkReach(el) {
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize) || 13;
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    if (!text) return null;
    var scanPx = SCAN_PX, y0 = SCAN_Y0;
    var e = scanEdges(cs, text);
    if (!e) return null;
    var top = e.top, bot = e.bot;
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(probe, el.firstChild);
    var base = probe.getBoundingClientRect().bottom;
    probe.remove();
    return { capTop: base - (y0 - top) / scanPx * size, foot: base + (bot + 1 - y0) / scanPx * size };
  }
  // THE SAME SCAN, ACROSS (2026-09-19). inkReach finds a line's ink top
  // and foot by rasterising it; this finds how WIDE the ink actually
  // runs, which is what a highlight has to form to. Advance widths are
  // no use for it: they carry the side bearings and the trailing
  // letter-space, which is air, not ink.
  function inkWidth(el) {
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize) || 13;
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    if (!text) return 0;
    var scanPx = SCAN_PX;
    var e = scanEdges(cs, text);
    if (!e) return 0;
    return (e.hi + 1 - e.lo) / scanPx * size;
  }
  // THE MARGIN LABEL'S BLOCK FORMS TO ITS INK (2026-09-19). The stack's
  // box is the margin's whole 72 with the letters centred in it, so a
  // block on that box stood a third empty either side of a letter while
  // it hugged the caps top and bottom — the air read as three different
  // paddings on four sides. Measured here instead: the widest letter's
  // INK for the width, the first cap's ink top and the last foot for
  // the ends, all off the rasteriser. The block is drawn from those in
  // style.css, so every side clears the ink by --hl-pad and no side by
  // anything else.
  function seatStackBlock(stack) {
    var letters = stack.querySelectorAll(':scope > span:not(.latest-stack-gap)');
    if (!letters.length) return;
    var w = 0;
    [].forEach.call(letters, function (L) { var v = inkWidth(L); if (v > w) w = v; });
    var first = inkReach(letters[0]), last = inkReach(letters[letters.length - 1]);
    var box = stack.getBoundingClientRect();
    if (!w || !first || !last || !box.height) return;
    stack.style.setProperty('--stk-w', w.toFixed(2) + 'px');
    stack.style.setProperty('--stk-t', (first.capTop - box.top).toFixed(2) + 'px');
    stack.style.setProperty('--stk-b', (box.bottom - last.foot).toFixed(2) + 'px');
  }
  // THE COURIER'S GAP UNDER A RULE, read off the first hero: its
  // courier line's cap ink to the rule it stands under. The line
  // under SUBSCRIBE keeps it. 24 where there is no hero to read (the
  // word pages).
  function courierGap() {
    var hero = document.querySelector('.card--mega');
    var line = hero && hero.querySelector('.duo-half--mega .panel-col--left .cover-meta:not(.cover-meta--peek), .duo-half--mega .panel-col--left .card-meta--line');
    var edge = hero && (hero.querySelector('.duo-half') || hero);
    if (!line || !edge) return 24;
    var r = inkReach(line);
    return r ? r.capTop - edge.getBoundingClientRect().top : 24;
  }
  // THE LINE UNDER SUBSCRIBE stands under the word's feet by the
  // courier's gap (2026-09-17): cap ink to feet, by painted ink on
  // both. Written late, after the hero's own line — whose gap under
  // its rule this borrows (courierGap) — has been seated: read in
  // fitSubscribeName it was still 32. (THE LATEST is its own island
  // in the flow now, style.css, and takes no seat.)
  // THE LATEST'S ISLAND, seated (2026-09-17): its rule runs end to end
  // with the hero's (the hero's box overruns the wrap by 24 at the
  // right; the island takes the same margin), and the words stand 24
  // under the rule and 24 over the hero's — the band's own 24 — by
  // painted ink, the paddings closing the difference the line box
  // leaves.
  // THE STACK'S SEAT: its first letter's cap ink on the card's top
  // edge (the hero half's top, where the rule stands), its right edge
  // on the seam's right end.
  // A LABEL IN THE MARGIN FOR EVERY SECTION (2026-09-18). THE LATEST and
  // EDITORS' PICKS are written by the builder, on the block they name;
  // ESSAYS, POSTSCRIPT and CONTRA are made here, one to a movement, off
  // the word already standing in that movement's band. Written in the
  // fitter rather than the markup because there is nothing to say in
  // the HTML: the label IS the band's word, and a second copy in the
  // source would be a second thing to keep in step. aria-hidden
  // throughout — the band's own word is the one a reader hears.
  function makeSectionStacks() {
    var main = document.querySelector('main');
    if (!main) return;
    [].forEach.call(document.querySelectorAll('main.has-mega .movement'), function (mv) {
      if (mv.__stacked) return;
      mv.__stacked = true;
      // The block that opens the page brings its own.
      if (mv.querySelector('.latest-stack')) return;
      var band = mv.querySelector('.page-banner');
      var name = band && band.querySelector('.banner-name');
      if (!name) return;
      // The offer is not a section.
      if (/\/subscribe/.test(name.getAttribute('href') || '')) return;
      var card = mv.querySelector('.card--mega') || mv.querySelector('.card');
      var word = (name.textContent || '').trim();
      if (!card || !word) return;
      // A LINK, TO THE LEDGER UNDER ITS OWN SECTION (2026-09-19). The
      // label names a section and now goes where the band's word goes
      // — archive.html#section=<word> — so the margin is a way in and
      // not just a marker. It takes the band's own href rather than
      // building one, so the two can never drift apart. Still hidden
      // from the reader who is listening and kept out of the tab order:
      // the band's word stands a few lines away and says the same
      // thing, and a second stop on it would only repeat itself.
      var stack = document.createElement('a');
      stack.className = 'latest-stack latest-stack--left';
      stack.setAttribute('aria-hidden', 'true');
      stack.setAttribute('tabindex', '-1');
      var secHref = name.getAttribute('href');
      if (secHref) stack.setAttribute('href', secHref);
      word.split('').forEach(function (ch) {
        var sp = document.createElement('span');
        if (ch === ' ') sp.className = 'latest-stack-gap';
        else sp.textContent = ch;
        stack.appendChild(sp);
      });
      stack.__card = card;
      main.appendChild(stack);
    });
  }
  function fitLatestStack() {
    makeSectionStacks();
    var all = [].slice.call(document.querySelectorAll('.latest-stack'));
    all.forEach(function (st) { fitOneStack(st); });
    // ONE SIZE FOR EVERY LABEL (2026-09-18). Each is fitted to its own
    // block — the span from its first card's byline line to that card's
    // middle — and a six-letter word takes a far larger size than a
    // ten-letter one for the same span: ESSAYS came out at 26 against
    // POSTSCRIPT's 15, which reads as two different marks rather than
    // one set of labels. They all take the SMALLEST of those fits, so
    // every label matches and none outgrows the block it names.
    var one = Infinity;
    all.forEach(function (st) { var v = parseFloat(st.style.fontSize) || 0; if (v && v < one) one = v; });
    if (isFinite(one)) all.forEach(function (st) { fitOneStack(st, one); });
    all.forEach(seatStackBlock);
  }
  // THE STACKS STAND IN THE PAGE'S LEFT MARGIN (2026-09-18), where the
  // social marks stood until this morning — not on their card's own
  // margin, which is where THE LATEST and EDITORS' PICKS began. They
  // are lifted out of the card into <main> for it: a fixed seat inside
  // a card is a seat inside whatever transform the card is carrying,
  // and the cards carry one every time a preview opens.
  function homeStack(stack) {
    if (stack.__card) return stack.__card;
    var card = stack.closest('.card--mega') || stack.parentElement;
    stack.__card = card;
    var main = document.querySelector('main');
    if (main && stack.parentElement !== main) main.appendChild(stack);
    return card;
  }
  function fitOneStack(stack, forced) {
    var card = homeStack(stack);
    if (!card) return;
    // A NAME WITH NO CARD TO STAND BESIDE STANDS NOWHERE. The margin's
    // stacked names hang off <main>, not off their sections, so taking a
    // section out of the layout (stage one of the two-stage fit) leaves
    // its name behind with nothing to be sized to: fitted to a card of
    // no height it came out at 1.7px, fixed at the margin's middle — a
    // speck on the first screen until the rest of the page was fitted.
    // It goes out with its card and comes back with it.
    if (!card.getClientRects().length) { stack.style.setProperty('display', 'none', 'important'); return; }
    stack.style.removeProperty('display');
    var half = card.querySelector('.duo-half') || card;
    var first = stack.querySelector(':scope > span:not(.latest-stack-gap)');
    if (!first) return;
    stack.style.top = '0px'; stack.style.fontSize = '';
    var cr = card.getBoundingClientRect();
    // SIZED TO THE CARD (2026-09-18): at the sheet's 60 the ten lines
    // ran 580 where the card stands 344, the tail over the next row's
    // cover; it fills the card's top half now. The span from the first
    // cap's ink to the last foot scales
    // with the size (line pitch and cap alike), so one reading at the
    // sheet's size gives the size that ends the stack on the card's
    // foot.
    var letters = stack.querySelectorAll(':scope > span:not(.latest-stack-gap)');
    var last = letters[letters.length - 1];
    var r0 = inkReach(first), rl = inkReach(last);
    var hr = half.getBoundingClientRect();
    // FROM THE COURIER'S LINE TO THE CARD'S MIDDLE (2026-09-18): the
    // first cap opens where the byline's cap ink opens, 24 under the
    // card's top, and the last foot lands on the card's middle.
    var line = half.querySelector('.panel-col--left .cover-meta:not(.cover-meta--peek), .panel-col--left .card-meta--line');
    var lr = line ? inkReach(line) : null;
    var startY = lr ? lr.capTop : hr.top + 24;
    var endY = hr.top + hr.height * 0.5;
    if (forced) stack.style.fontSize = forced.toFixed(2) + 'px';
    else if (r0 && rl && rl.foot > r0.capTop && endY > startY) {
      var s0 = parseFloat(getComputedStyle(stack).fontSize) || 60;
      stack.style.fontSize = (s0 * (endY - startY) / (rl.foot - r0.capTop)).toFixed(2) + 'px';
    }
    // WHERE IT STARTS, held in the document rather than the viewport:
    // the size is still the one that spans the byline's cap line to the
    // card's middle, and the ink — first cap to last foot — still opens
    // centred on the card's height. The pin reads these two on every
    // scroll and decides where the stack actually sits.
    var r = inkReach(first), rEnd = inkReach(last);
    if (!r) return;
    var inkH = rEnd ? rEnd.foot - r.capTop : 0;
    // ON THE PICTURE'S MIDDLE, NOT THE CARD'S (2026-09-18). A hero's
    // card and its cover are the same box, so the two readings agreed
    // and it made no difference — until CONTRA, whose block opens on a
    // trio whose card is a row of three and stands taller and lower
    // than any one of its pictures. The label opens on the middle of
    // the FIRST COVER in its block now, which is the same seat as
    // before wherever the card is its picture.
    var openCover = (card.querySelector && card.querySelector('img.card-image')) || null;
    var ob = openCover ? openCover.getBoundingClientRect() : null;
    if (!ob || !ob.height) ob = hr;
    var topY = inkH > 0 ? ob.top + (ob.height - inkH) / 2 : startY;
    var box = stack.getBoundingClientRect();
    // The box the stack is seated against while it is NOT pinned, in
    // the document: <main>'s own padding box, which is what an absolute
    // top and left are measured from.
    stack.style.position = 'absolute';
    var op = stack.offsetParent || document.documentElement;
    var opr = op.getBoundingClientRect();
    stack.__originY = opr.top + window.pageYOffset;
    stack.__originX = opr.left;
    stack.__fixed = null;
    stack.__inkH = inkH;
    stack.__capOff = r.capTop - box.top;   // the ink's cap inside its own box
    stack.__homeY = topY + window.pageYOffset;
    // WHERE IT COMES TO REST: the middle of the last cover in the
    // stack's OWN movement — the block the card opens, which on the
    // front page ends at the last review before SUBSCRIBE and ESSAYS,
    // and on the archive at the last card of the feature block. Not
    // the last cover on the page, which is four sections further down.
    // The stack's whole travel is one clamp between two points in the
    // DOCUMENT: it opens on its card's middle, holds the margin's
    // middle for as long as that lies between the two, and parks on
    // that cover's middle, scrolling away with the page from there.
    // THE LAST REVIEW'S PICTURE, specifically — the closing contra of
    // the block, not simply its last cover. The postscripts' cells are
    // taller than the reviews' and one of them ends the row, so "the
    // last picture" and "the last review's picture" are two different
    // covers here; the stack rests on the review's. Where a block
    // carries no review — the archive's feature block — its last cover
    // serves.
    var mv = card.closest('.movement') || card;
    // THE STACK PARKS ON THE LAST CARD'S MIDDLE (2026-09-22): the last
    // review's whole card — its frame and its words — where it parked on
    // the picture's old seat, which is the title column since the swap
    var covers = mv.querySelectorAll('.latest-cell--contra');
    if (!covers.length) covers = mv.querySelectorAll('.duo-half--mega, .latest-cell--ps');
    if (!covers.length) covers = mv.querySelectorAll('img.card-image');
    var lastCover = covers.length ? covers[covers.length - 1] : null;
    stack.__endY = null;
    if (lastCover) {
      var lr = lastCover.getBoundingClientRect();
      if (lr.height) stack.__endY = lr.top + window.pageYOffset + (lr.height - inkH) / 2;
    }
    pinOneStack(stack);
  }

  // THE PIN, read on every scroll. Three states and one line of
  // arithmetic: the stack rises with the page from where it started,
  // stops at the MIDDLE OF THE MARGIN and holds there, and is pushed
  // out again by the section word coming up under it. The push is not
  // a switch — the word's own top drives the stack up ahead of it, so
  // it leaves at the page's speed rather than snapping away.
  // RIGID, BY LETTING THE BROWSER DO THE SCROLLING (2026-09-18). A
  // fixed stack whose top is rewritten from pageYOffset on every frame
  // is a frame behind the page it is fixed against, and the letters
  // swim — the wobble. So the stack is FIXED only while it is pinned,
  // where its top is a constant and nothing is written at all; before
  // and after, it is ABSOLUTE in the document at the two points it
  // rests on, and the page carries it with everything else. Three
  // states, two thresholds, and no per-frame arithmetic in any of
  // them. The seats agree at each threshold — fixed at the margin's
  // middle IS the document point the clamp holds — so the change of
  // state is invisible.
  function pinOneStack(stack) {
    if (!stack.__inkH && stack.__inkH !== 0) return;
    var mid = (window.innerHeight - stack.__inkH) / 2;
    var want = window.pageYOffset + mid;
    var docY, fixed;
    if (want <= stack.__homeY) { docY = stack.__homeY; fixed = false; }
    else if (stack.__endY !== null && want >= stack.__endY) { docY = stack.__endY; fixed = false; }
    else { docY = want; fixed = true; }
    if (fixed !== stack.__fixed) {
      stack.__fixed = fixed;
      stack.style.position = fixed ? 'fixed' : 'absolute';
      stack.style.left = fixed ? '0px' : (-stack.__originX).toFixed(2) + 'px';
    }
    stack.style.top = (fixed ? mid - stack.__capOff
                             : docY - stack.__originY - stack.__capOff).toFixed(2) + 'px';
  }
  function pinStacks() {
    [].forEach.call(document.querySelectorAll('.latest-stack'), pinOneStack);
  }
  // THE NAME IN THE BAND'S MIDDLE on the word pages: sized off the
  // reprint's fit the way band-mark.js sizes the front page's
  // miniature off the wordmark — the cap C at the reprint's size, the
  // air ratio r = 72 / C, and the band's cap c = B / (2r + 1) — then
  // the band's items are re-seated on their caps, since the deks pass
  // ran before the reprint was fitted.
  function fitBandNameMid() {
    var mid = document.querySelector('.section-band .band-name-mid');
    if (!mid) return;
    var rep = document.querySelector('.reprint .reprint-name');
    var band = mid.closest('.section-band');
    if (!rep || !band) return;
    var rcs = getComputedStyle(rep);
    var S = parseFloat(rcs.fontSize) || 0;
    var B = band.getBoundingClientRect().height;
    if (!S || !B) return;
    var g = document.createElement('canvas').getContext('2d');
    if (!g) return;
    g.font = rcs.fontStyle + ' ' + rcs.fontWeight + ' 200px ' + rcs.fontFamily;
    var above = (g.measureText('H').actualBoundingBoxAscent || 140) / 200;
    var C = S * above, r = 72 / C, c = B / (2 * r + 1);
    mid.style.fontSize = (c / above).toFixed(3) + 'px';
    inkCenterDeks();
  }
  // ---------- EVERY BLOCK FORMS TO ITS INK (2026-09-19) ----------
  // The highlight was painted on the element's own BOX, and a box is
  // not the ink: a block name at line-height 1 carries its caps 0.139em
  // down from the top and its baseline 0.115em up from the bottom, and
  // an inline link's box is the font's whole ascent-and-descent, half
  // again taller than the letters standing in it. So the air read at
  // roughly three times above and below what it read at the sides.
  // MEASURED HERE, ONCE PER DRESS. The two numbers a block needs are
  // the gap from its box's top to the CAP ink and the gap from the
  // BASELINE to its box's foot; both fall out of the font's own
  // metrics, so this costs a measureText and no raster at all, and the
  // answer is cached on the font/size/leading/display it was read for.
  // Cap to baseline is the whole of it: a descender BREAKS the edge
  // rather than pushing the block down, which is the reading asked for.
  // WRAPPED INLINE TEXT IS LEFT ALONE. The block is drawn as a pseudo,
  // and one absolute box cannot follow a link that breaks over two
  // lines — that wants a box per line box, which is what the element's
  // own background already gives it. Those keep it, and say so with a
  // class, so the sheet can tell the two apart.
  var inkCv = null;
  // THE ASCENT OF THIS WORD, not of a capital H. Measured on the
  // element's own text: an H is the cap line, but Archive inks higher
  // than that on its h, and a block formed to the cap would clear the
  // ascender by less than it clears everything else. Cheap — a
  // measureText, no raster — and the answer is cached on the dress and
  // the word together.
  var ascMemo = {}, descMemo = {};
  // THE ANSWER IS CACHED ON THE DRESS — AND THE DRESS IS NOT THE FACE
  // (2026-09-21). The key is the font's NAME, and a name measures
  // differently before its face has landed: asked for garamond-premier-
  // pro's descender while the kit was still in flight, the canvas
  // answered with the fallback's, 5.58 where Garamond's is 4.34, and
  // that was kept under Garamond's name for the life of the page. Every
  // later pass, the faces long since in, read the wrong number back —
  // so the band's italic stood on a pad a pixel and a quarter out on
  // any load whose first pass beat the kit, and right on any that did
  // not, which is what made two identical loads come out fifty-three
  // values apart. The memo is good for as long as the set of landed
  // faces is what it was filled under, and is emptied when it is not.
  var memoFaces = -1;
  function freshMemos() {
    var n = 0;
    try { document.fonts.forEach(function (face) { if (face.status === 'loaded') n++; }); } catch (e) {}
    if (n !== memoFaces) { memoFaces = n; ascMemo = {}; descMemo = {}; }
  }
  // THE FACE'S DESCENDER, not this word's. The pad is capped in pixels
  // now, so above a certain size it is shallower than a descender and
  // the bottom has to be given the descender's own depth instead. Read
  // off the face rather than the word so that every line of a title
  // takes the same depth and the stack does not come out ragged: a
  // line with a y would otherwise hang lower than the line above it.
  function descOf(cs, fs) {
    var key = cs.fontStyle + '|' + cs.fontWeight + '|' + cs.fontFamily + '|' + fs;
    if (descMemo[key] != null) return descMemo[key];
    var g = (inkCv || (inkCv = document.createElement('canvas'))).getContext('2d');
    if (!g) return 0;
    g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
    var d = g.measureText('gjpqy').actualBoundingBoxDescent || 0;
    descMemo[key] = d;
    return d;
  }
  function inkAscent(cs, fs, text) {
    var key = cs.fontStyle + '|' + cs.fontWeight + '|' + cs.fontFamily + '|' + fs + '|' + text;
    if (ascMemo[key] != null) return ascMemo[key];
    var g = (inkCv || (inkCv = document.createElement('canvas'))).getContext('2d');
    if (!g) return 0;
    g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
    var a = g.measureText(text).actualBoundingBoxAscent || 0;
    ascMemo[key] = a;
    return a;
  }
  var INK_SEL = 'a:not(.latest-cover):not(.latest-plate):not(.card-image-link):not(.swap-body)'
    + ':not(.ticker-cover-link):not(.latest-stack):not(.topbar-wordmark):not(.nav-wordmark-link)'
    // .has-hit is NOT excluded: it sits on the oversized wordmark LINK
    // (named out above) but also on .banner-name and .reprint-name,
    // which are the names themselves and want the block like any
    // other word.
    + ':not(.reprint-link):not(.skip-link), button:not(.theme-toggle), [role="button"],'
    // NOT .card-title / .latest-title THEMSELVES (2026-09-19): where a
    // title is cut into lines the LINES carry the block, and where it
    // is not, the link inside it does. Seated as a carrier as well,
    // the container drew a second block behind the whole title and its
    // edge stood past the lines' as a hairline.
    // .plate-title BY NAME (2026-09-21): the kicker at the head of a
    // preview is an <a> on the heroes and a SPAN on the postscripts and
    // the reviews, whose whole plate is already a link and cannot hold
    // another. Only the <a> was a carrier, so two kickers in three had
    // no block and fell back to painting their whole line box.
    + ' .peek-open, .plate-close, .plate-read, .plate-title, .title-line,'
    + ' .banner-name, .topbar-name, .reprint-name, .ledger-word, .band-name-mid, .band-mini,'
    + ' .banner-line--below,'
    + ' .theme-toggle > span:not(.theme-toggle-sep)';
  // THE BASELINE IS PROBED, NOT PREDICTED. Canvas reports the font's
  // own ascent and descent, and a browser does not always lay a line
  // box out on those — read against the rasteriser the prediction ran
  // half a pixel out, which is a third of the pad at courier size. So
  // the baseline is taken the way inkReach takes it: a zero-sized
  // inline-block seated on it, read off the layout itself. Every probe
  // goes in, every rect comes out, then every probe comes out — three
  // passes and three reflows for the whole page rather than one each.
  // THE RUN IS THE ELEMENT'S OWN TEXT, AND NOTHING ELSE (2026-09-19).
  // A range over the whole contents hands back a rect for EVERY box in
  // it, the out-of-flow ones included — and the section words carry an
  // invisible hit patch, absolutely positioned, that takes the pointer
  // for them. Its rect sits on a line of its own, so the run read as
  // wrapped, gave up, and left the word with no left and right at all:
  // the block formed to the BOX instead, which on a section word is
  // the whole 1600 of the band. A yellow bar from glass to glass under
  // ESSAYS, and the line under it correct, which is what said where to
  // look.
  // So the text is walked instead of ranged: every text node the
  // element actually sets, skipping any child taken out of flow and
  // anything display:none. Still one line or nothing — a true wrap has
  // no single rectangle to give — but the patch no longer counts as a
  // second line.
  function inFlowRun(el) {
    var lo = Infinity, hi = -Infinity, top = null, ok = true;
    var walk = function (node) {
      for (var n = node.firstChild; ok && n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          if (!n.data || !n.data.trim()) continue;
          var rg = document.createRange();
          rg.selectNodeContents(n);
          var rs = rg.getClientRects();
          for (var i = 0; i < rs.length; i++) {
            if (!rs[i].width || !rs[i].height) continue;
            if (top === null) top = rs[i].top;
            else if (Math.abs(rs[i].top - top) > 1) { ok = false; return; }
            if (rs[i].left < lo) lo = rs[i].left;
            if (rs[i].right > hi) hi = rs[i].right;
          }
        } else if (n.nodeType === 1) {
          var cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
          walk(n);
        }
      }
    };
    walk(el);
    return (ok && isFinite(lo) && isFinite(hi) && hi > lo) ? { left: lo, right: hi } : null;
  }
  // THE PASS HONOURS ITS OWN NOTE (2026-09-19). The note above says what
  // this was always meant to be — every probe in, every rect out, every
  // probe out, "three passes and three reflows for the whole page rather
  // than one each" — and the writing had leaked back in among the reads
  // in two places, so the page paid one reflow each after all.
  //   THE FIRST LEAK was this opening loop: it read an element's
  // computed style and its rects, then TOGGLED ITS CLASSES and dropped a
  // probe into it, and then went round to the next element and read
  // again. A read after a write is a forced style recalculation, and on
  // this page — 2053 rules over a thousand nodes — one of those costs
  // about 21ms. A hundred and sixty carriers, a hundred and sixty
  // recalculations, and the step stood at 1244ms on the front page.
  //   THE SECOND was subtler and cost more per call: getComputedStyle
  // hands back a LIVE declaration, so every `j.cs.fontSize` read down in
  // the writing phase was not a lookup but another forced recalculation,
  // taken after that phase had already written. The style is SNAPSHOT
  // here instead — the nine properties the later phases actually ask
  // for, read once while the page is still clean and carried as plain
  // strings. (descOf and inkAscent take a duck-typed object: they read
  // fontStyle, fontWeight and fontFamily and nothing else.)
  //   Nothing about the geometry changes, and it cannot: the writes this
  // separates out do not move anything in flow. .hl-wrapped has no rule
  // in the sheet at all — it is a marker this code reads back — .hl-ink
  // adds `isolation: isolate` and an ABSOLUTE pseudo, and the position
  // it states is `relative` with no offsets. The only mutation that
  // touches layout is the probe, and that is zero-sized by design and
  // already went in for every element before any rect was read.
  function csSnap(cs) {
    return {
      display: cs.display,
      position: cs.position,
      lineHeight: cs.lineHeight,
      textAlign: cs.textAlign,
      textTransform: cs.textTransform,
      fontSize: cs.fontSize,
      fontStyle: cs.fontStyle,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      letterSpacing: cs.letterSpacing
    };
  }
  function seatInkBlocks() {
    var list;
    try { list = document.querySelectorAll(INK_SEL); } catch (e) { return; }
    var jobs = [];
    // ---- READ. Nothing is written in this loop. ----
    var seen = [];
    [].forEach.call(list, function (el) {
      // (an essay's two offers and the subscribe ticker change their
      // colour and nothing else: src/essay-acts.js, THE SUBSCRIBE TICKER)
      if (el.closest('.essay-acts, .sub-ticker')) return;
      var cs = csSnap(getComputedStyle(el));
      if (cs.display === 'none') return;
      var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text) { seen.push({ el: el, bare: true }); return; }
      // ONE LINE OR TWO, not one rect or three. getClientRects gives a
      // rect per BOX: an inline that holds a span of its own — The NEW
      // Critic in the band's middle — comes back as three on a single
      // line, and counting them read it as wrapped, so it was refused
      // the block and kept the older box-painted one. They are one run
      // if they share a top.
      var rects = el.getClientRects();
      var oneLine = true, uL = Infinity, uR = -Infinity, uT = Infinity, uB = -Infinity;
      for (var q = 0; q < rects.length; q++) {
        if (Math.abs(rects[q].top - rects[0].top) > 1) { oneLine = false; break; }
        if (rects[q].left < uL) uL = rects[q].left;
        if (rects[q].right > uR) uR = rects[q].right;
        if (rects[q].top < uT) uT = rects[q].top;
        if (rects[q].bottom > uB) uB = rects[q].bottom;
      }
      // A BLOCK CAN WRAP TOO. The inline test asks whether its rects
      // share a top; a block's rect is one box however many lines are
      // in it, so it is asked against its own leading instead. Either
      // way, more than one line wants a box to a line and the pseudo
      // cannot give it.
      var lh0 = cs.lineHeight === 'normal' ? 0 : parseFloat(cs.lineHeight) || 0;
      var tall = lh0 && rects.length && (rects[0].height > lh0 * 1.5);
      var wrapped = tall || (cs.display === 'inline' && !oneLine);
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
      // the run's union, so an inline split over several boxes is
      // measured as the one line it is
      var span = (rects.length && oneLine)
        ? { left: uL, right: uR, top: uT, bottom: uB } : null;
      seen.push({
        el: el, cs: cs, text: text, span: span,
        wrapped: wrapped, none: !rects.length
      });
    });
    // ---- WRITE. Nothing is read in this loop. ----
    seen.forEach(function (s) {
      if (s.bare) { s.el.classList.remove('hl-ink', 'hl-wrapped'); return; }
      s.el.classList.toggle('hl-wrapped', s.wrapped);
      if (s.wrapped || s.none) {
        s.el.classList.remove('hl-ink');
        s.el.style.removeProperty('--hl-up'); s.el.style.removeProperty('--hl-dn');
        return;
      }
      // AFTER the probe: a range over the whole contents takes the
      // zero-sized probe in with the text and comes back as two rects,
      // which reads as wrapped and gives up the measurement.
      var probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      s.el.insertBefore(probe, s.el.firstChild);
      jobs.push({ el: s.el, cs: s.cs, text: s.text, probe: probe, span: s.span });
    });
    jobs.forEach(function (j) {
      j.rect = j.span || j.el.getClientRects()[0] || j.el.getBoundingClientRect();
      j.base = j.probe.getBoundingClientRect().bottom;
      // the TEXT's own advance box, wherever the alignment put it —
      // read here so left and right can be taken off the ink too
      // A rect per BOX, not per line: The NEW Critic carries a span of
      // its own and comes back as three. They are one run if they sit
      // on one line, and the run is their union.
      j.run = inFlowRun(j.el);
    });
    jobs.forEach(function (j) {
      j.probe.remove();
      var fs = parseFloat(j.cs.fontSize) || 0;
      if (!fs || !j.rect) { j.el.classList.remove('hl-ink'); return; }
      // THE COURIER'S BLOCKS ARE ONE HEIGHT (2026-09-21): a Roboto line's
      // top is taken off the cap height and not off its own letters —
      // an S overshoots the cap, a name of x-height letters stands
      // short of it — so Will Diana, Sep 16 and See Preview carry the
      // same block and read as a set beside each other. (The foot is
      // already the face's descender, the same for every line.)
      var asc = inkAscent(j.cs, fs, /roboto mono/i.test(j.cs.fontFamily) ? 'H' : j.text);
      if (!asc) { j.el.classList.remove('hl-ink'); return; }
      var up = (j.base - asc) - j.rect.top;
      var dn = j.rect.bottom - j.base;
      j.el.style.setProperty('--hl-up', up.toFixed(2) + 'px');
      j.el.style.setProperty('--hl-dn', dn.toFixed(2) + 'px');
      j.el.style.setProperty('--hl-desc', descOf(j.cs, fs).toFixed(2) + 'px');
      // the pseudo needs a frame; give one only where there is none,
      // so nothing that seats itself is unseated (see style.css)
      if (j.cs.position === 'static') j.el.style.position = 'relative';
      // LEFT AND RIGHT OFF THE INK AS WELL (2026-09-19). The block ran
      // to the element's BOX either side, and a box is not the ink
      // there either: CSS letter-spacing is laid after EVERY character
      // including the last, so a tracked word carries a dead column of
      // tracking inside its own right edge, and the first and last
      // glyphs bring whatever side bearings they happen to have. The
      // wordmark came out some 3px wider on the right than the left for
      // exactly that. The bearings are read off the same measureText —
      // actualBoundingBoxLeft/Right are the ink's reach either side of
      // where the text starts — against the range's advance box, which
      // already sits where the alignment put it.
      var lft = 0, rgt = 0;
      if (j.run) {
        var gg = (inkCv || (inkCv = document.createElement('canvas'))).getContext('2d');
        if (gg) {
          try { gg.letterSpacing = j.cs.letterSpacing === 'normal' ? '0px' : j.cs.letterSpacing; } catch (e) {}
          gg.font = j.cs.fontStyle + ' ' + j.cs.fontWeight + ' ' + fs + 'px ' + j.cs.fontFamily;
          gg.textAlign = 'left'; gg.textBaseline = 'alphabetic';
          var mm = gg.measureText(j.text);
          var inkL = j.run.left - (mm.actualBoundingBoxLeft || 0);
          var inkR = j.run.left + (mm.actualBoundingBoxRight || 0);
          if (isFinite(inkL) && isFinite(inkR) && inkR > inkL) {
            lft = inkL - j.rect.left;
            rgt = j.rect.right - inkR;
            if (lft < 0) lft = 0;
            if (rgt < 0) rgt = 0;
          }
        }
      }
      j.el.style.setProperty('--hl-lft', lft.toFixed(2) + 'px');
      j.el.style.setProperty('--hl-rgt', rgt.toFixed(2) + 'px');
      j.el.classList.add('hl-ink');
    });
    // A COLUMN OF LINES KEEPS ITS EDGE (2026-09-19). Hugging the ink is
    // right for a word standing on its own and wrong for a stack of
    // them: the lines of a title are RANGED, and the ink of M, S and A
    // does not begin in the same place. MrBeast, / Slop / Auteur came
    // back 4.75, 2.74 and 0.22 off the box they share, so three blocks
    // stood in a ragged column under type that is flush — the eye reads
    // the blocks' edge, not the letters', and the letters had lost it.
    // So the lines of one title take ONE edge on the ranged side: the
    // outermost of them, the leftmost left or the rightmost right, so
    // no line is cropped to reach it and only the ones that ink short
    // of the column carry a little more air. Centred type has no such
    // edge and is left alone. The other side stays each line's own —
    // that is the rag, and it belongs to the type.
    // The pad is not guessed at again here: the pseudo's own left (or
    // right) is read back, which is the sheet's calc already resolved,
    // so lines set at different sizes — each with a pad of its own em —
    // still land on one edge.
    var owners = [], lines = [];
    jobs.forEach(function (j) {
      if (!j.el.classList.contains('title-line')) return;
      if (!j.el.classList.contains('hl-ink')) return;
      var p = j.el.parentNode, i = owners.indexOf(p);
      if (i < 0) { owners.push(p); lines.push([j]); } else lines[i].push(j);
    });
    // Read EVERY group's edges before any of them is moved: read, write,
    // read, write down the list cost one forced recalculation per title.
    var ranged = [];
    lines.forEach(function (g) {
      if (g.length < 2) return;
      var al = g[0].cs.textAlign, side, prop;
      if (al === 'left' || al === 'start') { side = 'left'; prop = '--hl-lft'; }
      else if (al === 'right' || al === 'end') { side = 'right'; prop = '--hl-rgt'; }
      else return;
      // both are insets from the box's own edge, so the SMALLEST of
      // them is the one that reaches furthest out
      var edges = g.map(function (j) {
        return parseFloat(getComputedStyle(j.el, '::after')[side]) || 0;
      });
      // the pseudo's inset is read back, but the pad already written to
      // the element is the fitter's own and needs no layout to recall
      var wases = g.map(function (j) {
        return parseFloat(j.el.style.getPropertyValue(prop)) || 0;
      });
      ranged.push({ g: g, prop: prop, edges: edges, wases: wases });
    });
    ranged.forEach(function (r) {
      var out = Math.min.apply(Math, r.edges);
      r.g.forEach(function (j, k) {
        if (Math.abs(r.edges[k] - out) < 0.01) return;
        j.el.style.setProperty(r.prop, (r.wases[k] + (out - r.edges[k])).toFixed(2) + 'px');
      });
    });
  }
  // ---------- THE DEK TAKES ONE BLOCK, NOT ONE A LINE (2026-09-19) ----
  // The Garamond under a title belongs to the title's mark: a hand on
  // the words, or on the picture they name, lights both. But a dek is
  // PROSE — three or four lines of it — and the line-by-line block the
  // titles use would draw three ragged bars stepping down the column,
  // which is a mark on each line rather than a mark on the dek. One
  // rectangle over the whole paragraph instead: a short last line
  // simply leaves air inside the block, which is what a block around a
  // paragraph is.
  // AND IT JOINS THE TITLE'S. The two are one mark, so they are one
  // shape: the dek's block opens exactly where the title's last line
  // closes — no white seam between them — and stands on the title's
  // own flush edge, the edge the title's lines already share. The rag
  // side and the foot stay the dek's own ink. Centred matter has no
  // flush side and keeps its ink either side; it still joins at the
  // top. Both corrections are made by reading the pseudo's OWN
  // resolved inset back and moving it, so the pad in the sheet is
  // never restated here.
  // THE LAST BASELINE WITHOUT A LAST PROBE. A zero-width probe appended
  // to the end is a break opportunity, and on a paragraph whose last
  // line is full it would take a line of its own and hand back the
  // baseline of a line that is not there. The lines are all one leading
  // apart, so the last baseline is the first plus the distance between
  // the first line box and the last.
  // EVERY LINE'S OWN INK, NOT ITS ADVANCE BOX. The box a line occupies
  // is not where its ink is: the opening quote inks nearly 3 of its own
  // 4 pixels in from the left of its box, and an italic j on the line
  // below reaches nearly 4 past it the other way — on a 6px pad, that
  // is the difference between a block that fits the paragraph and one
  // that clips a descender. So the first and last GLYPH of each line
  // are found (a binary search down the run for where the line turns,
  // over non-space characters only, whose rects are never degenerate)
  // and their bearings taken off the same canvas the carriers use.
  var DEK_SEL = '.card-dek, .latest-dek';
  function dekRuns(el) {
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var ps = [], n;
    while ((n = walk.nextNode())) {
      for (var i = 0; i < n.data.length; i++) if (!/\s/.test(n.data[i])) ps.push([n, i]);
    }
    if (!ps.length) return null;
    var rectAt = function (k) {
      var r = document.createRange();
      r.setStart(ps[k][0], ps[k][1]);
      r.setEnd(ps[k][0], ps[k][1] + 1);
      return r.getBoundingClientRect();
    };
    var charAt = function (k) { return ps[k][0].data[ps[k][1]]; };
    var lines = [], i = 0, guard = 0;
    while (i < ps.length && guard++ < 64) {
      var top = rectAt(i).top;
      var lo = i, hi = ps.length - 1;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (rectAt(mid).top < top + 1) lo = mid; else hi = mid - 1;
      }
      lines.push({ a: i, b: lo });
      i = lo + 1;
    }
    return { lines: lines, rectAt: rectAt, charAt: charAt };
  }
  function seatDekBlocks() {
    var list;
    try { list = document.querySelectorAll(DEK_SEL); } catch (e) { return; }
    var jobs = [];
    // READ EVERY STYLE, THEN WRITE (2026-09-24): the probe went in
    // between one dek's style read and the next, and the style is a live
    // declaration read again in the writing phase below, so every dek
    // cost two restyles of the whole sheet. Read once, clean, and
    // carried as strings (csSnap, as seatInkBlocks does); the probes and
    // the class go in after. Nothing read here is moved by those writes.
    var reads = [].map.call(list, function (el) {
      return { el: el, cs: csSnap(getComputedStyle(el)), text: (el.textContent || '').trim() };
    });
    reads.forEach(function (r) {
      var el = r.el;
      if (r.cs.display === 'none' || !r.text) { el.classList.remove('hl-blk'); return; }
      var head = document.createElement('span');
      head.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.insertBefore(head, el.firstChild);
      jobs.push({ el: el, cs: r.cs, head: head });
    });
    jobs.forEach(function (j) {
      j.box = j.el.getBoundingClientRect();
      j.base = j.head.getBoundingClientRect().bottom;
      j.run = dekRuns(j.el);
    });
    jobs.forEach(function (j) {
      j.head.remove();
      var fs = parseFloat(j.cs.fontSize) || 0;
      if (!fs || !j.run || !j.run.lines.length) { j.el.classList.remove('hl-blk'); return; }
      var g = (inkCv || (inkCv = document.createElement('canvas'))).getContext('2d');
      if (!g) { j.el.classList.remove('hl-blk'); return; }
      g.font = j.cs.fontStyle + ' ' + j.cs.fontWeight + ' ' + fs + 'px ' + j.cs.fontFamily;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      var ls = j.cs.letterSpacing === 'normal' ? 0 : (parseFloat(j.cs.letterSpacing) || 0);
      var lines = j.run.lines, lo = Infinity, hi = -Infinity, first = '', drop = 0;
      for (var k = 0; k < lines.length; k++) {
        var ra = j.run.rectAt(lines[k].a), rb = j.run.rectAt(lines[k].b);
        var ma = g.measureText(j.run.charAt(lines[k].a));
        var mb = g.measureText(j.run.charAt(lines[k].b));
        var L = ra.left - (ma.actualBoundingBoxLeft || 0);
        // the advance the last glyph leaves unpainted, and the letter-
        // space laid after it, are both air
        var R = rb.right - ls - (mb.width - (mb.actualBoundingBoxRight || 0));
        if (L < lo) lo = L;
        if (R > hi) hi = R;
        if (k === lines.length - 1) drop = rb.top - ra.top;
      }
      drop = j.run.rectAt(lines[lines.length - 1].a).top - j.run.rectAt(lines[0].a).top;
      // the FIRST line's own cap, not the whole paragraph's tallest
      for (var q = lines[0].a; q <= lines[0].b; q++) first += j.run.charAt(q);
      var asc = inkAscent(j.cs, fs, first);
      if (!asc || !isFinite(lo) || !isFinite(hi) || hi <= lo) { j.el.classList.remove('hl-blk'); return; }
      j.el.style.setProperty('--dk-t', ((j.base - asc) - j.box.top).toFixed(2) + 'px');
      j.el.style.setProperty('--dk-b', (j.box.bottom - (j.base + drop)).toFixed(2) + 'px');
      j.el.style.setProperty('--dk-l', (lo - j.box.left).toFixed(2) + 'px');
      j.el.style.setProperty('--dk-r', (j.box.right - hi).toFixed(2) + 'px');
      j.el.style.setProperty('--dk-desc', descOf(j.cs, fs).toFixed(2) + 'px');
      // a frame only where there is none, as the carriers take one
      if (j.cs.position === 'static') j.el.style.position = 'relative';
      j.el.classList.add('hl-blk');
    });
    // THE JOIN. Made last, and read back off the pseudo itself: the
    // sheet has already resolved every pad and every em by the time
    // these are asked for, so the two edges that answer to the title
    // are MOVED to it rather than solved again from measures this
    // function would have to keep in step with the sheet.
    // (In four sweeps rather than one per dek, 2026-09-24: the titles'
    // marks read, every pad written, every dek's own block read, every
    // join written. A dek's pad and its join touch its own pseudo and
    // nothing else's, so each dek is solved exactly as before — against
    // its own pad — without a restyle of the sheet between one dek and
    // the next.)
    var joins = [];
    jobs.forEach(function (j) {
      if (!j.el.classList.contains('hl-blk')) return;
      var title = j.el.previousElementSibling;
      if (!title || !/(^|\s)(card|latest)-title(\s|$)/.test(title.className || '')) return;
      var marks = title.querySelectorAll('.hl-ink');
      if (!marks.length) return;
      var foot = -Infinity, lft = Infinity, rgt = -Infinity;
      for (var i = 0; i < marks.length; i++) {
        var mr = marks[i].getBoundingClientRect();
        var ms = getComputedStyle(marks[i], '::after');
        var f = mr.bottom - (parseFloat(ms.bottom) || 0);
        var l = mr.left + (parseFloat(ms.left) || 0);
        var r = mr.right - (parseFloat(ms.right) || 0);
        if (f > foot) foot = f;
        if (l < lft) lft = l;
        if (r > rgt) rgt = r;
      }
      // THE TITLE'S OWN PAD, read back the way everything else here is:
      // the sheet sets the block's top to (ink - pad), so the pad is
      // what is left when the resolved top is taken off the ink. Given
      // to the dek before its own insets are asked for, so the join and
      // the flush edge below are solved against the air they will
      // actually be drawn with.
      var lead = marks[0];
      var up = parseFloat(lead.style.getPropertyValue('--hl-up'));
      var pad = isFinite(up) ? up - (parseFloat(getComputedStyle(lead, '::after').top) || 0) : NaN;
      joins.push({ el: j.el, title: title, foot: foot, lft: lft, rgt: rgt, pad: pad, al: getComputedStyle(title).textAlign });
    });
    joins.forEach(function (o) {
      if (isFinite(o.pad) && o.pad > 0) o.el.style.setProperty('--dk-pad', o.pad.toFixed(2) + 'px');
    });
    joins.forEach(function (o) {
      var box = o.el.getBoundingClientRect();
      var own = getComputedStyle(o.el, '::after');
      o.myTop = box.top + (parseFloat(own.top) || 0);
      o.myLeft = box.left + (parseFloat(own.left) || 0);
      o.myRight = box.right - (parseFloat(own.right) || 0);
    });
    joins.forEach(function (o) {
      var bump = function (name, by) {
        var was = parseFloat(o.el.style.getPropertyValue(name)) || 0;
        o.el.style.setProperty(name, (was + by).toFixed(2) + 'px');
      };
      if (isFinite(o.foot)) bump('--dk-t', o.foot - o.myTop);
      var al = o.al;
      if (al === 'left' || al === 'start') { if (isFinite(o.lft)) bump('--dk-l', o.lft - o.myLeft); }
      else if (al === 'right' || al === 'end') { if (isFinite(o.rgt)) bump('--dk-r', o.myRight - o.rgt); }
    });
    // ---------- AND THE WHOLE MARK IS ONE RECTANGLE ----------
    // The pieces are measured first and squared off last. Every line
    // of the title carries a block cut to its own ink, and the dek
    // carries one cut to its paragraph; drawn as they are, the mark
    // steps in and out down the column. One rectangle over all of
    // them instead — their union, which is the shape a reader would
    // draw round the words with a marker.
    // THE PIECES ARE NOT STRUCK. Each one is inscribed in the union by
    // definition, in the same yellow, so nothing of them shows; and
    // where the union cannot be measured the mark is still the pieces
    // rather than nothing at all. The rectangle is the TITLE's own
    // ::before, inside the stacking context the title already keeps,
    // so it lies behind the title's letters, and the dek — a sibling
    // painted after the whole of the title — stands on it too.
    [].forEach.call(document.querySelectorAll('.card-title, .latest-title'), function (title) {
      var parts = [].slice.call(title.querySelectorAll('.hl-ink'));
      var dek = title.nextElementSibling;
      if (dek && dek.classList && dek.classList.contains('hl-blk')) parts.push(dek);
      squareUp(title, parts);
    });
    // AND A SECTION WORD IS ONE MARK WITH ITS COURIER. The word and the
    // Roboto line under it are two elements and were two blocks, lit on
    // the same frame but drawn as two — a wide one over the word, a
    // narrow one under it. They square up the same way the title and
    // its dek do: one rectangle over the pair, on the banner that holds
    // them both.
    [].forEach.call(document.querySelectorAll('.page-banner, .subscribe-band, .events-band, .store-band'), function (band) {
      squareUp(band, [band.querySelector('.banner-name'), band.querySelector('.banner-line--below')]);
    });
  }

  // ---------- ONE RECTANGLE OVER A SET OF BLOCKS (2026-09-19) --------
  // The pieces are measured first and squared off last. Each block is
  // cut to its own ink, which is how the shape is got right; drawn as
  // they are, a mark of several pieces steps in and out. The union of
  // them is the shape a reader would draw round the words with a
  // marker, and that is what is painted.
  // THE PIECES ARE NOT STRUCK. Each is inscribed in the union by
  // definition and in the same yellow, so none shows through it, and a
  // set the union cannot be measured for still lights piece by piece
  // rather than not at all.
  function blockBox(el) {
    if (!el) return null;
    var c = getComputedStyle(el, '::after');
    if (c.content === 'none') return null;
    var r = el.getBoundingClientRect();
    return {
      top: r.top + (parseFloat(c.top) || 0),
      bottom: r.bottom - (parseFloat(c.bottom) || 0),
      left: r.left + (parseFloat(c.left) || 0),
      right: r.right - (parseFloat(c.right) || 0)
    };
  }
  function squareUp(host, parts) {
    var t = Infinity, b = -Infinity, l = Infinity, rr = -Infinity, any = false;
    for (var i = 0; i < parts.length; i++) {
      var k = blockBox(parts[i]);
      if (!k) continue;
      any = true;
      if (k.top < t) t = k.top;
      if (k.bottom > b) b = k.bottom;
      if (k.left < l) l = k.left;
      if (k.right > rr) rr = k.right;
    }
    if (!any || !(b > t) || !(rr > l)) { host.classList.remove('hl-rect'); return; }
    var hb = host.getBoundingClientRect();
    host.style.setProperty('--tx-t', (t - hb.top).toFixed(2) + 'px');
    host.style.setProperty('--tx-b', (hb.bottom - b).toFixed(2) + 'px');
    host.style.setProperty('--tx-l', (l - hb.left).toFixed(2) + 'px');
    host.style.setProperty('--tx-r', (hb.right - rr).toFixed(2) + 'px');
    host.classList.add('hl-rect');
  }

  // ---------- THE TWO ROBOTO LINES COME INTO THE BOX (2026-09-21) -----
  // The byline over a title and See Preview under its dek stand in the
  // column at rest no longer: they are hidden (style.css, THE ROBOTO
  // LINES ARE THE BOX'S) and come up WITH the mark, inside it — the
  // byline's baseline TWICE the distance over the title's cap that the
  // dek's cap stands under the title's baseline, and See Preview's cap
  // twice it under the dek's baseline. So the box reads byline · 2g ·
  // TITLE · g · dek · 2g · See Preview, g being whatever the fitter
  // left between the title and the dek, and the box's own pad g.
  // THEY DO NOT MOVE IN THE FLOW. Each keeps the seat it has (the
  // hero's fitMatterInk puts its byline at the column's head and its
  // control at the foot; the review's are in flow) and travels to the
  // box on a TRANSFORM, so nothing the rest of the pass measured is
  // moved by this: hidden, a line still holds its room. The shift is
  // taken off the line's UNTRANSFORMED seat — its rects carry the last
  // pass's transform, which is subtracted back out — so every pass
  // writes the same number.
  // AND THE UNION GROWS TO HOLD THEM, by the title's own pad on every
  // side, which is what the rectangle keeps round the title and the
  // dek already.
  // STRIPPED FIRST, EVERY PASS. The transform is a real displacement to
  // every rect the pass reads after it — fitMatterInk seats the hero's
  // byline off the byline's own box, and read it 78 lower each pass,
  // and wrote it 78 higher, and the shift grew by 78 to follow — so
  // no line carries one while the page is being measured. Between the
  // strip and the seat the pass is synchronous: nothing paints.
  function resetMatterMeta() {
    [].forEach.call(document.querySelectorAll('.rb-in, .rb-x'), function (el) {
      el.classList.remove('rb-in', 'rb-x');
      el.style.removeProperty('--rb-dy');
      el.style.removeProperty('--rb-dx');
    });
  }
  var PLATE_BODY_PAD = 36; // the preview's body stands this far inside its box on every side (2026-09-22)
  var REST_OVERLAP = 72; // the box's reach over the picture's edge (style.css --over); the frame and the insets are 36 (REST_INSET, REST_FAR; --rest); the release is the lesser of the two less one (REST_RELEASE), so the released box never passes the frame
  // THE RELEASE (2026-09-22): how far the resting box slides off the picture as
  // the card opens — the lesser of the overhang and the frame, less one, so the
  // box's far side never passes the frame's edge (style.css --pl-o is the same).
  var REST_RELEASE = function () { return Math.min(REST_OVERLAP, REST_FAR) - 1; };
  // the blue's own air round the words
  var REST_PAD = 36;
  // the charcoal's reach past the blue on the far side
  var REST_EDGE = 36;
  // …and how far inside the picture's top and foot the box's own top
  // and foot stand.
  var REST_INSET = 36;
  // …and the box's air past the ink on the far side
  var REST_FAR = 36;
  // A stack of capitals in each of the frame's side columns — the
  // author at xL, the date at xR, each REST_INSET wide — centred between
  // regT and regB by the first cap's top and the last baseline, at the
  // chips' own size unless the column is too short for the letters.
  // QUEUED AND SEATED TOGETHER (2026-09-22): each stack is written where
  // it is asked for, and all of them are read once, together, at the end
  // of seatMatterMeta (flushSideStacks) — the cap top and the last
  // baseline worked from the face's own metrics on the canvas and the
  // stack's box, where a probe put in and taken out of every stack's
  // first and last letter cost the page four layouts a card.
  var sideStackJobs = [];
  function seatSideStacks(col, regT, regB, xL, xR, pk) {
    var cb = col.getBoundingClientRect();
    var chipFs = pk ? parseFloat(getComputedStyle(pk).fontSize) || 13 : 13;
    [['author', xL], ['date', xR]].forEach(function (sd) {
      var st = col.querySelector(':scope > .side-stack--' + sd[0]);
      if (!st) return;
      var slots = st.children.length || 1;
      var fs = Math.min(chipFs, (regB - regT - REST_INSET / 2) / slots);
      sideStackJobs.push({ st: st, fs: fs, left: sd[1] - cb.left, mid: (regT + regB) / 2 });
    });
  }
  function flushSideStacks() {
    var jobs = sideStackJobs; sideStackJobs = [];
    if (!jobs.length) return;
    jobs.forEach(function (j) {
      j.st.style.fontSize = j.fs.toFixed(2) + 'px';
      j.st.style.width = REST_INSET + 'px';
      j.st.style.left = j.left.toFixed(2) + 'px';
      j.st.style.top = '0px';
    });
    jobs.forEach(function (j) {
      var ls = j.st.querySelectorAll(':scope > span:not(.side-stack-gap)');
      if (!ls.length) return;
      var cs = getComputedStyle(ls[0]);
      var fs = parseFloat(cs.fontSize) || j.fs;
      var L = parseFloat(cs.lineHeight) || fs * 1.15;
      measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
      var mm = measureCtx.measureText('H');
      var A = mm.fontBoundingBoxAscent || fs * 0.8, D = mm.fontBoundingBoxDescent || fs * 0.2;
      var capH = mm.actualBoundingBoxAscent || fs * 0.7;
      var r = j.st.getBoundingClientRect();
      var inBase = (L - A - D) / 2 + A;
      var capT = r.top + inBase - capH, baseN = r.bottom - L + inBase;
      j.top = j.mid - (capT + baseN) / 2;
    });
    jobs.forEach(function (j) { if (j.top != null) j.st.style.top = j.top.toFixed(2) + 'px'; });
  }
  function seatMatterMeta() {
    [].forEach.call(document.querySelectorAll('.duo-half--mega, .latest-cell--ps, .latest-cell--contra'), function (card) {
      var title = card.querySelector('.card-title, .latest-title');
      var dek = title && title.nextElementSibling;
      var by = card.querySelector('.cover-meta--author');
      // THE FRAME GOES ALL THE WAY ROUND THE PICTURE (style.css): where
      // it does, its near edge is not the picture's old edge but --wrap
      // past the box's own, over the title column
      var WRAP = parseFloat(getComputedStyle(card).getPropertyValue('--wrap')) || 0;
      var pk = card.querySelector('.cover-meta--peek');
      var col0 = title && title.parentElement;
      var out = function () {
        title.classList.remove('hl-col-r', 'hl-col-l', 'hl-col-d', 'hl-col-u', 'rx');
        title.style.removeProperty('--tx-k');
        if (col0) {
          col0.classList.remove('fr', 'fr-l', 'fr-r', 'fr-d', 'fr-u');
          ['--fr-t', '--fr-b', '--fr-l', '--fr-r', '--fr-kt', '--fr-kb', '--fr-o', '--fr-e', '--rl-o'].forEach(function (v) { col0.style.removeProperty(v); });
        }
        [by, pk, dek].concat([].slice.call(card.querySelectorAll('.cover-meta--corner'))).forEach(function (el) {
          if (!el) return;
          el.classList.remove('rb-in', 'rb-x');
          el.style.removeProperty('--rb-dy');
          el.style.removeProperty('--rb-dx');
        });
      };
      if (!title || !title.classList.contains('hl-rect') || !dek || !dek.classList.contains('hl-blk')) { out(); return; }
      var tS = inkSpan(title), dS = inkSpan(dek);
      if (!tS || !dS) { out(); return; }
      var g = dS.top - tS.bot;
      // (an essay's card — every post's in the one line — keeps its old
      // title and dek hidden in the frame, and a narrow card's squeezes
      // them into one another; its picture's box does not hang on them,
      // so it is seated regardless: 2026-09-23)
      if (!(g > 0) && card.matches('.duo-half--mega')) g = 1;
      if (!(g > 0)) { out(); return; }
      // AND THE BOX IS PADDED BY THE SAME g ON EVERY SIDE (2026-09-21,
      // later): its air over the topmost ink, under the lowest, and
      // off the widest reach either side is the one gap the box
      // carries between its lines — not the title's own --hl-pad,
      // which the union took from the pieces. Squared off again here
      // from the four inks, the pieces' own boxes standing down under
      // it as they did.
      // THE TITLE'S INK, ACROSS: off its lines' own measured bearings
      // (--hl-lft / --hl-rgt, seatInkBlocks), not a Range — a Range
      // over block-level lines answers with the column's width.
      var lines = title.querySelectorAll('.title-line');
      if (!lines.length) lines = title.querySelectorAll('.hl-ink');
      if (!lines.length) lines = [title];
      var tL = Infinity, tR = -Infinity;
      [].forEach.call(lines, function (ln) {
        var rr = ln.getBoundingClientRect();
        var a = rr.left + (parseFloat(ln.style.getPropertyValue('--hl-lft')) || 0);
        var z = rr.right - (parseFloat(ln.style.getPropertyValue('--hl-rgt')) || 0);
        if (a < tL) tL = a;
        if (z > tR) tR = z;
      });
      var dr = dek.getBoundingClientRect();
      // THE DEK'S INK ACROSS, BY RANGE (2026-09-22, night): its widest
      // line's two edges, not --dk-l / --dk-r, which are the block's own
      // trailing air and say nothing about centred lines.
      var dEdges = inkEdges(dek);
      var dL = dEdges ? dEdges.l : dr.left + (parseFloat(dek.style.getPropertyValue('--dk-l')) || 0);
      var dR = dEdges ? dEdges.r : dr.right - (parseFloat(dek.style.getPropertyValue('--dk-r')) || 0);
      if (!isFinite(tL) || !(tR > tL) || !(dR > dL)) { out(); return; }
      // AND EVERY LINE IS RANGED ON THE TITLE'S INK (2026-09-21, later
      // still): flush with its left edge, its right, or its centre —
      // whichever way the title is set — the byline, the dek and See
      // Preview each carried across by a transform of their own. The
      // dek is not hidden and so is moved at rest as well, by its
      // quote's hang or its first letter's bearing; the fitter's own
      // seat for it is not touched, only painted across.
      var al = getComputedStyle(title).textAlign;
      var side = (al === 'right' || al === 'end') ? 'r' : (al === 'center') ? 'c' : 'l';
      // THE INK SITS ON THE PICTURE'S EDGE (2026-09-21, last): on an
      // essay and a postscript the line every word ranges on is the
      // picture's own edge — its right where the picture stands left of
      // the words, its left where it stands right — and the title is
      // carried there like the rest, on a transform of its own.
      var isContra = card.matches('.latest-cell--contra');
      var cover = card.querySelector('.duo-card-image, .latest-cover-col, .latest-cover');
      var cr = cover ? restRect(cover) : null;
      var picLeft = cr ? (cr.left + cr.right) / 2 < (tL + tR) / 2 : true;
      // (a postscript's or a review's card in the one line is only its
      // picture's width and the 36s, 2026-09-23: the old frame and the
      // hidden title are squeezed past telling the sides apart, and the
      // picture always runs from the card's own left)
      if (card.closest('.card--kind-postscript, .card--kind-contra')) picLeft = false;
      var aimL = tL, aimR = tR;
      // CENTRED (2026-09-22, night): the title's lines and the dek's are
      // centred on one axis — the sheet centres the lines in blocks that
      // hug their widest line — and the wider of the two blocks stands
      // REST_FAR in from the picture's edge, the narrower centred on it.
      // …ON THE BOX'S OWN AXIS (the ask, put plainly): the box is the
      // inset shape it was — 54 into the picture, 54 short of the
      // column's far edge — and the words are centred across it.
      // THE INSETS, PUT RIGHT (2026-09-22, night, later): the box keeps
      // its 54 over the picture's edge; from that edge the words stand
      // 54 in, and the box ends 54 past the widest of them — [picture]
      // 54 [ink] 54 [box's far edge] — the words centred in that.
      // …THE WIDEST LINE ON THE PICTURE'S EDGE (2026-09-22, the last
      // ask): the longest of the title's lines and the dek's stands
      // with its near edge on the seam where the box enters the
      // picture; the box ends 54 past it on the far side.
      // THE BOX IS THE INSET SHAPE AND THE WORDS FILL IT (2026-09-22,
      // the last of the asks): 54 over the picture, 54 short of the
      // column's far edge; the words span from the picture's edge to
      // 54 short of the box's far edge — the type sized to that width
      // (stretchFill's availW is the column's less 108) — centred on
      // that span.
      // …AND THE LONGEST LINE STANDS ON THE PICTURE'S EDGE: its near
      // edge on the seam where the box enters the picture (54 in from
      // the box's own near edge), the shorter lines centred on it.
      var centred = !isContra && !!cr;
      var wide = Math.max(tR - tL, dR - dL);
      if (centred) {
        side = 'c';
        // CENTRED IN THE GROWN BOX (2026-09-22, the 72s): the box runs
        // from 72 over the picture to 72 short of the card's far edge
        // (never nearer the ink than 72), and the words stand on its
        // middle.
        var cellA = card.getBoundingClientRect();
        var farA = picLeft ? cellA.right - (cr.left - cellA.left) : cellA.left + (cellA.right - cr.right);
        var nearB = picLeft ? cr.right - REST_OVERLAP : cr.left + REST_OVERLAP;
        var farB = picLeft ? Math.max(farA - REST_FAR, nearB + wide + 2 * REST_FAR) : Math.min(farA + REST_FAR, nearB - wide - 2 * REST_FAR);
        var axis = (nearB + farB) / 2;
      }
      var across = function (lft, rgt) {
        if (side === 'r') return aimR - rgt;
        if (side === 'c') return (centred ? axis : (tL + tR) / 2) - (lft + rgt) / 2;
        return aimL - lft;
      };
      var hb = title.getBoundingClientRect();
      var wasT = parseFloat(title.style.getPropertyValue('--rb-dx')) || 0;
      var tdx = across(tL - wasT, tR - wasT);
      title.style.setProperty('--rb-dx', tdx.toFixed(2) + 'px');
      title.classList.add('rb-x');
      // the title's own ink, once carried
      tL = tL - wasT + tdx; tR = tR - wasT + tdx;
      // THE BOX IS THE COLUMN'S WHOLE LENGTH, AND IT MEETS THE PICTURE
      // (2026-09-21, evening). Its top and foot are the preview
      // plate's — which on a hero or a postscript is the picture's own
      // height, the slot the plate opens in — so the box the hand
      // raises over the words is the box the preview will stand in;
      // its near side is the picture's edge, closing the gutter, and
      // its far side the ink plus g. The two Roboto lines take the
      // line boxes the plate's kicker and Close Preview stand on, so
      // the chips are in one place whether the card is shut or open.
      // A review's picture is above its words: the box hangs under it
      // at the picture's width, the byline g under the picture, See
      // Preview 2g under the dek, the foot g under that.
      var plate = card.querySelector('.card-preview-block, .latest-plate');
      var pr = plate ? plate.getBoundingClientRect() : null;
      var head = plate ? plate.querySelector('.plate-title') : null;
      var more = plate ? plate.querySelector('.plate-more') : null;
      var t = tS.top, b = dS.bot;
      var l = tL, r = tR;
      var wasX = parseFloat(dek.style.getPropertyValue('--rb-dx')) || 0;
      var ddx = across(dL - wasX, dR - wasX);
      dek.style.setProperty('--rb-dx', ddx.toFixed(2) + 'px');
      dek.classList.add('rb-x');
      if (dL - wasX + ddx < l) l = dL - wasX + ddx;
      if (dR - wasX + ddx > r) r = dR - wasX + ddx;
      // where a line's LINE BOX must stand (the plate's kicker and
      // Close Preview are the same face at the same size, so the same
      // line box), or where its ink must — `edge` says which
      var seat = function (el, want, edge, xTo) {
        if (!el) return;
        var was = parseFloat(el.style.getPropertyValue('--rb-dy')) || 0;
        var wx = parseFloat(el.style.getPropertyValue('--rb-dx')) || 0;
        var sp = inkSpan(el);
        var ed = inkEdges(el);
        var rr = el.getBoundingClientRect();
        if (!sp || !ed) { el.classList.remove('rb-in'); el.style.removeProperty('--rb-dy'); el.style.removeProperty('--rb-dx'); return; }
        var have = edge === 'boxtop' ? rr.top - was : edge === 'mid' ? (sp.top + sp.bot) / 2 - was : edge === 'bot' ? sp.bot - was : sp.top - was;
        var dy = want - have;
        var dx = across(ed.l - wx, ed.r - wx);
        // …or the BLOCK's own edge to a stated x: the chip's pad past its
        // ink is the sheet's --hl-pad, 0.32 of the type
        if (xTo) {
          var padX = CHIP_PAD_EM * (parseFloat(getComputedStyle(el).fontSize) || 13);
          dx = xTo.inkL != null ? xTo.inkL - (ed.l - wx) : xTo.inkR != null ? xTo.inkR - (ed.r - wx) : xTo.mid != null ? xTo.mid - (ed.l + ed.r) / 2 + wx : xTo.left != null ? xTo.left - (ed.l - padX - wx) : xTo.right - (ed.r + padX - wx);
        }
        el.style.setProperty('--rb-dy', dy.toFixed(2) + 'px');
        el.style.setProperty('--rb-dx', dx.toFixed(2) + 'px');
        el.classList.add('rb-in');
        var top = sp.top - was + dy, bot = sp.bot - was + dy;
        var lf = ed.l - wx + dx, rg = ed.r - wx + dx;
        if (top < t) t = top;
        if (bot > b) b = bot;
        if (lf < l) l = lf;
        if (rg > r) r = rg;
      };
      // THE WORDS IN THE FRAME'S CORNERS (2026-09-23): the author at the
      // head's left and the date at its right, Preview at the foot's left
      // and the kicker at its right, each ranged by its ink on the
      // picture's own side — the four lines the frame carries, where the
      // author alone stood centred in the head and the kicker and the
      // date stood up the sides.
      var corners = function (headY, footY, picL, picR, author) {
        seat(author, headY, 'mid', { inkL: picL });
        seat(card.querySelector('.cover-meta--cdate'), headY, 'mid', { inkR: picR });
        seat(pk, footY, 'mid', { inkL: picL });
        seat(card.querySelector('.cover-meta--ckick'), footY, 'mid', { inkR: picR });
      };
      var hr = head && head.getBoundingClientRect(), mr = more && more.getBoundingClientRect();
      // THE FRAME IS A RING ON THE COLUMN (2026-09-22): the same
      // rectangle, written on the title's column as insets of its own
      // box (the ring is the column's ::after, ranked over the title),
      // its bands and its seam the box's; and the release — how far
      // the box slides off the picture when the card opens, its near
      // border landing on the seam's column — signed for the side.
      var ring = function (rT, rB, rL, rR, kt0, kb0, o, e, rl, sideCls, sIn) {
        var col = title.parentElement, cb = col.getBoundingClientRect();
        col.style.setProperty('--fr-s', (sIn || 0) + 'px');
        col.style.setProperty('--fr-t', (rT - cb.top).toFixed(2) + 'px');
        col.style.setProperty('--fr-b', (cb.bottom - rB).toFixed(2) + 'px');
        col.style.setProperty('--fr-l', (rL - cb.left).toFixed(2) + 'px');
        col.style.setProperty('--fr-r', (cb.right - rR).toFixed(2) + 'px');
        col.style.setProperty('--fr-kt', kt0.toFixed(2) + 'px');
        col.style.setProperty('--fr-kb', kb0.toFixed(2) + 'px');
        col.style.setProperty('--fr-o', o + 'px');
        col.style.setProperty('--fr-e', e.toFixed(2) + 'px');
        col.style.setProperty('--rl-o', rl + 'px');
        ['fr-r', 'fr-l', 'fr-d', 'fr-u'].forEach(function (c) { col.classList.toggle(c, c === sideCls); });
        col.classList.add('fr');
      };
      // (with the plates out of layout the card's own height is the
      // picture's seat, which spans it: PLATES_SHOWN)
      if (!isContra && cr && (!PLATES_SHOWN || (pr && pr.height > 0 && hr && mr && hr.height > 0 && mr.height > 0))) {
        // THE ROBOTO STANDS IN THE FRAME (2026-09-21, last of all): the
        // byline centred in the charcoal's 54 at the head, See Preview
        // in its 54 at the foot, each as far in from the frame's near
        // edge (the picture's) as it stands from the band's top and
        // foot — the same air on every side of the chip.
        var chipH = CHIP_PAD_EM * 13 * 2 + 9.3; // pad, cap, pad at the courier's 13
        var m = (REST_INSET - chipH) / 2;
        var nearX = picLeft ? (WRAP ? cr.right - REST_OVERLAP - WRAP : cr.right) : (WRAP ? cr.left + REST_OVERLAP + WRAP : cr.left);
        // (the frame all the way round: the byline stands centred on
        // the frame's head, by its ink, between its near edge and the
        // card's far one)
        var cellM = card.getBoundingClientRect();
        var farX = picLeft ? cellM.right - (cr.left - cellM.left) : cellM.left + (cellM.right - cr.right);
        if (WRAP) {
          // THE ESSAY'S FRAME IS THE REVIEW'S (2026-09-22): the kicker
          // centred in the head band, PREVIEW centred in the foot by
          // its ink (the arrow's included), and the author and the date
          // stacked up the frame's two sides, as the review's are
          // (the words in the corners since 2026-09-23, on the picture's
          // edges: the frame less its --wrap each side)
          var frL = Math.min(nearX, farX), frR = Math.max(nearX, farX);
          var kc = card.querySelector('.cover-meta--kick:not(.cover-meta--corner)');
          // (and on the frame's own edges since the picture took the
          // frame's two sides, 2026-09-23: style.css, THE PICTURE TAKES
          // THE FRAME'S SIDES)
          // THE ESSAY'S COURIER IS ONE LINE OVER ITS PICTURE (2026-09-23):
          // the title and the dek stand under the picture (seatSwapCols),
          // so the one line carries the rest — KICKER | AUTHOR at its
          // left, PREVIEW at its right (style.css, THE ESSAY'S TITLE
          // STANDS UNDER ITS PICTURE)
          var hy = cr.top + REST_INSET / 2, fy = cr.bottom - REST_INSET / 2;
          if (!card.matches('.duo-half--mega')) corners(hy, fy, frL, frR, kc);
          else {
          // (…UNDER IT since 2026-09-23, later: the courier on the foot's
          // line, the title and the dek under that)
          // (its caps' tops 18 under the picture's foot — the picture's foot
          // is the frame's less its REST_INSET: 2026-09-23)
          hy = cr.bottom - REST_INSET + ESSAY_COURIER_GAP;
          var hEdge = 'top';
          // (KICKER · DATE · AUTHOR from the picture's left edge, 2026-09-23)
          var kk3 = card.querySelector('.cover-meta--ckick');
          if (kk3) seat(kk3, hy, hEdge, { inkL: frL });
          // (PREVIEW at the head's right, its arrow's ink on the picture's
          // edge — the arrow stands past the word, a mask on the button's
          // ::before: 2026-09-23)
          var pkArrow = 0;
          var pkb = pk && (pk.querySelector('.peek-open') || pk);
          if (pkb) {
            var pb4 = getComputedStyle(pkb, '::before');
            // (the arrow's box starts at the word's right edge: its reach
            // is the mask's offset in it and the mask's own width)
            // (read whatever state the pass finds the card in: the arrow's
            // mask is stated either way)
            var mp = pb4.webkitMaskPosition || pb4.maskPosition || '';
            var ms = pb4.webkitMaskSize || pb4.maskSize || '';
            pkArrow = Math.max(0, (parseFloat(mp.split(' ')[0]) || 0) + (parseFloat(ms.split(' ')[0]) || 0));
          }
          // (PREVIEW is a tab in the picture's bottom-right corner now, a
          // glyph and no word — seated by its box, flush on the corner:
          // 2026-09-23; style.css, THE ESSAY'S PREVIEW IS A CORNER TAB)
          void pkArrow;
          if (pkb && pk) {
            var pwx = parseFloat(pk.style.getPropertyValue('--rb-dx')) || 0, pwy = parseFloat(pk.style.getPropertyValue('--rb-dy')) || 0;
            var pbr = pkb.getBoundingClientRect();
            // (a pixel past the corner each way: the ear is the ground, and
            // the picture's own edge and outline, on a fraction of a pixel,
            // showed a hairline under it)
            pk.style.setProperty('--rb-dx', (frR + 1 - (pbr.right - pwx)).toFixed(2) + 'px');
            pk.style.setProperty('--rb-dy', ((cr.bottom - REST_INSET) + 1 - (pbr.bottom - pwy)).toFixed(2) + 'px');
            pk.classList.add('rb-in');
          }

          // (each after the last as it now stands, seated: three of the
          // courier's characters on, the dot in the middle one)
          // (the date is struck from the essay's line, 2026-09-23: KICKER |
          // AUTHOR)
          var ke = kk3 && inkEdges(kk3);
          if (kc && ke) seat(kc, hy, hEdge, { inkL: ke.r + 1.8 * (parseFloat(getComputedStyle(kc).fontSize) || 13) });
          // (the lead post's line carries its date, KICKER | DATE |
          // AUTHOR: 2026-09-23)
          // (and every post's since, 2026-09-23: the postscripts', the
          // reviews' and the essays')
          if (kk3 && ke) {
            // (and its date back, between the kicker and the author)
            var cd3 = card.querySelector('.cover-meta--cdate');
            var gap3 = 1.8 * (parseFloat(getComputedStyle(kk3).fontSize) || 13);
            if (kc) kc.classList.remove('is-wrapped');
            if (cd3 && (cd3.textContent || '').trim()) {
              seat(cd3, hy, hEdge, { inkL: ke.r + gap3 });
              var de3 = inkEdges(cd3);
              if (kc && de3) seat(kc, hy, hEdge, { inkL: de3.r + gap3 });
            } else cd3 = null;
            // (THE AUTHOR TAKES A LINE OF ITS OWN where the one line would
            // run past the picture — a postscript's portrait is one column
            // wide — under the first, from the picture's left edge and
            // without its bar: 2026-09-23. The title follows the lower
            // line, seatSwapCols reading the courier's lowest ink.)
            var ae3 = kc && inkEdges(kc);
            if (ae3 && ae3.r > frR + 0.5) {
              kc.classList.add('is-wrapped');
              seat(kc, hy + 1.6 * (parseFloat(getComputedStyle(kc).fontSize) || 13), hEdge, { inkL: frL });
            }
            // THE WORDS UNDER THE PICTURE TAKE A SIDE (2026-09-24): on a
            // card set right (.card--align-r, build.js — every other essay,
            // the right-hand card of a pair) each line of the courier ends
            // on the picture's right edge instead of opening on its left.
            // Seated from the left as above, then carried across whole —
            // written on the transforms alone, so no read follows: the
            // inks' widths do not change with the carry.
            if (card.closest('.card--align-r') && SIDE_ALIGN_MQ.matches) {
              var carry = function (el, d) {
                if (!el) return;
                el.style.setProperty('--rb-dx', ((parseFloat(el.style.getPropertyValue('--rb-dx')) || 0) + d).toFixed(2) + 'px');
              };
              var wrapped3 = !!(kc && ae3 && kc.classList.contains('is-wrapped'));
              var end3 = kc && ae3 && !wrapped3 ? ae3.r : cd3 && de3 ? de3.r : ke.r;
              var d3 = frR - end3;
              carry(kk3, d3);
              if (cd3) carry(cd3, d3);
              if (kc && ae3 && !wrapped3) carry(kc, d3);
              // (the author on its own line: from the left edge, its ink as
              // wide as it was)
              if (wrapped3) carry(kc, frR - (frL + (ae3.r - ae3.l)));
              if (frR > r) r = frR;
            }
          }
          }
        } else {
          seat(by, cr.top + REST_INSET / 2, 'mid', picLeft ? { left: nearX + m } : { right: nearX - m });
          seat(pk, cr.bottom - REST_INSET / 2, 'mid', picLeft ? { left: nearX + m } : { right: nearX - m });
        }
        t = (pr && pr.height > 0 ? pr : cr).top; b = (pr && pr.height > 0 ? pr : cr).bottom;
        // …AND TO THE EDGES (2026-09-21, later): the picture's edge on
        // the near side, the column's own edge on the far one — the
        // box is the whole of the words' column, which is the plate's
        // whole slot.
        var colr = title.parentElement.getBoundingClientRect();
        var inkL = l, inkR = r;
        if (picLeft) { l = Math.min(l, cr.right); r = Math.max(r, colr.right); }
        else { r = Math.max(r, cr.left); l = Math.min(l, colr.left); }
        // AND THE EXCESS IS A BLACK COLUMN (2026-09-21, later): past the
        // longest line's ink and its g, out to the far edge, the box is
        // the charcoal — a column standing beside the words. The split
        // is written as a distance from the box's left edge and the
        // side as a class; the sheet paints the two colours as one
        // gradient with a hard stop (style.css, THE EXCESS IS A BLACK
        // COLUMN).
        title.classList.toggle('hl-col-r', picLeft);
        title.classList.toggle('hl-col-l', !picLeft);
        title.__picLeft = picLeft; title.__inkL = inkL; title.__inkR = inkR;
        // THE RESTING BOX (2026-09-21, night): at rest the title and the
        // dek stand in a box of their own — 36 over the title's cap, 36
        // under the dek's baseline, 36 past the ink on the far side,
        // and on the picture's side 36 INTO the picture, over its edge.
        // Its four insets are written beside the hover box's; the sheet
        // shows this one at rest and the other under the hand (THE
        // RESTING BOX in style.css). Essays and postscripts only.
        // THE CHARCOAL IS A RECTANGLE BESIDE THE PICTURE, BEHIND THE BOX
        // (the last word of the night): the picture's whole height,
        // from the picture's edge out to 54 past the blue; the blue in
        // front of it, 54 into the picture over its edge, 54 inside the
        // picture's top and foot, 36 past the ink on the far side. The
        // pseudo spans both; the sheet paints them as two placed layers
        // (THE RESTING BOX, style.css).
        var O = REST_OVERLAP, I = REST_INSET, P = REST_PAD, E = REST_EDGE;
        var rxT = cr.top, rxB = cr.bottom;
        // (the picture's box keeps to the seat whatever the old words
        // measure: they stand in their own column now — 2026-09-23)
        var blueT = cr.top + I, blueB = cr.bottom - I;
        // THE BOX KEEPS ITS HEIGHT AND THE WORDS SPREAD WITHIN IT
        // (2026-09-22, night): the air over the title's cap, between its
        // last baseline and the dek's cap, and under the dek's baseline
        // is one measure — a third of what the box has past the two
        // inks — and the title and the dek are carried to it on their
        // own transforms (--rb-dy), the box's insets paying the title's
        // back. (Where the words are taller than the box, the box grows
        // and the pads are P.)
        // …TOGETHER AGAIN, 36 APART, CENTRED IN THE BOX (2026-09-22, the
        // last word): the dek's cap 36 under the title's last baseline,
        // the pair centred between the box's top and foot.
        var tInk = tS.bot - tS.top, dInk = dS.bot - dS.top;
        var groupH = tInk + P + dInk;
        var top0 = blueT + Math.max(P, (blueB - blueT - groupH) / 2);
        var tdy = top0 - tS.top;
        var ddy = (top0 + tInk + P) - dS.top;
        title.style.setProperty('--rb-dy', tdy.toFixed(2) + 'px');
        dek.style.setProperty('--rb-dy', ddy.toFixed(2) + 'px');
        var rxL = Math.min(inkL, tL) - P, rxR = Math.max(inkR, tR) + P;
        // …to the CARD'S full dimensions (the last ask): the charcoal runs
        // from the picture's edge to the column's far edge, the blue
        // stopping E short of that edge.
        var colr2 = title.parentElement.getBoundingClientRect();
        // (and never past the CELL: a postscript's title fills its column
        // and its 36 and the 54 would run into the next card)
        var cellr = card.getBoundingClientRect();
        // THE FAR EDGE IS 54 PAST THE INK (2026-09-22): the box ends
        // REST_FAR past the longest line, and the frame's column is
        // whatever stands between that and the column's edge (never
        // less than E, the reach growing past the column if it must).
        // (EXACTLY 54, 2026-09-22, night: the far column is whatever the
        // column's edge leaves past ink + 54, and nothing else — it stood
        // at 54 at least, which on a postscript pushed the box's far
        // edge 24 short of the ink's 54 while the near side kept it.)
        // THE BOX HUGS THE LONGEST INK BY 54 EITHER SIDE (2026-09-22,
        // night, the last word after the last): the words centred on the
        // old inset shape's axis (above), and the box drawn 54 past the
        // widest of the title's lines and the dek's, both sides.
        // …AND THE FAR EDGE HUGS THE INK (2026-09-22, evening, the
        // answer): 54 over the picture on the near side, the longest
        // line on the picture's edge, and the box's far edge 54 past
        // the longest line — the far column of the frame is what the
        // column's edge leaves.
        // THE BOX GROWS TO THE CARD AND THE FRAME IS 54 ALL ROUND
        // (2026-09-22, later still): the box's far edge stands 54 short
        // of the card's far edge — the cell's, less what the cell keeps
        // past the picture on the near side (the hero's 24) — and never
        // nearer the ink than 54; the frame's far band is the 54 past it.
        var cardFar = picLeft ? cellr.right - (cr.left - cellr.left) : cellr.left + (cellr.right - cr.right);
        var boxFar;
        // THE BOX IS THE CARD'S, NOT THE INK'S (2026-09-23): the title and
        // the dek stand in their own column (seatSwapCols) and the box is
        // the picture, so it keeps to the card whatever the words' width —
        // it grew past the card for a long word and stood off the grid.
        if (picLeft) { boxFar = cardFar - REST_FAR; rxL = cr.right - O; rxR = boxFar + REST_FAR; E = REST_FAR; }
        else { boxFar = cardFar + REST_FAR; rxR = cr.left + O; rxL = boxFar - REST_FAR; E = REST_FAR; }
        title.style.setProperty('--rx-kt', (blueT - rxT).toFixed(2) + 'px');
        title.style.setProperty('--rx-kb', (rxB - blueB).toFixed(2) + 'px');
        title.style.setProperty('--rx-o', O + 'px');
        title.style.setProperty('--rx-e', E.toFixed(2) + 'px');
        title.style.setProperty('--rx-t', (rxT - hb.top - tdy).toFixed(2) + 'px');
        title.style.setProperty('--rx-b', (hb.bottom - rxB + tdy).toFixed(2) + 'px');
        title.style.setProperty('--rx-l', (rxL - hb.left - tdx).toFixed(2) + 'px');
        title.style.setProperty('--rx-r', (hb.right - rxR + tdx).toFixed(2) + 'px');
        title.classList.add('rx');
        // THE FRAME IS A RING ON THE COLUMN (2026-09-22): the same
        // rectangle, written on the title's column as insets of its own
        // box (the ring is the column's ::after, ranked over the title),
        // its bands and its seam the box's; and the release — how far
        // the box slides off the picture when the card opens, its near
        // border landing on the seam's column — signed for the side.
        ring(rxT, rxB, rxL, rxR, blueT - rxT, rxB - blueB, O, E, picLeft ? REST_RELEASE() : -REST_RELEASE(), picLeft ? 'fr-r' : 'fr-l');
      } else if (isContra && cr) {
        // THE REVIEW IS SET UP THE SAME WAY (2026-09-22): its picture
        // stands OVER its words (under them on a turned-over row), so
        // the box hangs from the picture's foot at the picture's width
        // — 54 up into it, the title's cap on its edge, 36 under the
        // dek — and the frame is one band, under the box, holding the
        // byline at its left and See Preview at its right. The words
        // are carried up onto the edge on a transform of their own
        // (--rb-dy), as they are carried across on the essays.
        var picAbove = (cr.top + cr.bottom) / 2 < (tS.top + dS.bot) / 2;
        var Oc = REST_OVERLAP, Ic = REST_INSET, Pc = REST_PAD;
        // CENTRED IN THE BOX (2026-09-22, the 72s): the box runs from
        // 72 up into the picture to 72 short of the card's edge, and the
        // title and the dek stand centred between its top and foot, as
        // they do on the essays — the cap on the picture's edge left no
        // room for the standard type once the frame was 72.
        var cellC = card.getBoundingClientRect();
        var bT0 = picAbove ? cr.bottom - Oc : cellC.top + Ic;
        var bB0 = picAbove ? cellC.bottom - Ic : cr.top + Oc;
        var grp = dS.bot - tS.top;
        var dy = (bT0 + Math.max(Pc, (bB0 - bT0 - grp) / 2)) - tS.top;
        title.style.setProperty('--rb-dy', dy.toFixed(2) + 'px');
        dek.style.setProperty('--rb-dy', dy.toFixed(2) + 'px');
        var tTop = tS.top + dy, dBot = dS.bot + dy;
        // …INSET (2026-09-22, later): the box stands I in from each side
        // of the picture; the ring spans the picture's width.
        var cxL = cr.left + Ic, cxR = cr.right - Ic, cxT, cxB, cBlueT, cBlueB, ckt, ckb;
        // (the box runs on to 72 short of the card's own edge, the band
        // the 72 past it: the frame fills the card at 72)
        if (picAbove) { cxT = cr.bottom - Oc; cBlueT = cxT; cBlueB = Math.max(dBot + Pc, cellC.bottom - Ic); cxB = cBlueB + Ic; ckt = 0; ckb = Ic; }
        else { cxB = cr.top + Oc; cBlueB = cxB; cBlueT = Math.min(tTop - Pc, cellC.top + Ic); cxT = cBlueT - Ic; ckt = Ic; ckb = 0; }
        var chipHc = CHIP_PAD_EM * 13 * 2 + 9.3;
        var mc = (Ic - chipHc) / 2;
        var bandMid = picAbove ? (cBlueB + cxB) / 2 : (cxT + cBlueT) / 2;
        // THE THREE CHIPS STAND EQUIDISTANT, CENTRED UNDER THE PICTURE
        // (2026-09-22): the byline's two blocks and See Preview's, the
        // byline's own gap between (--chip-gap, block edge to block
        // edge), the row as a whole centred on the picture.
        var chipGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chip-gap')) || 16;
        var padC = CHIP_PAD_EM * 13;
        var eBy = by && inkEdges(by), ePk = pk && inkEdges(pk);
        // (See Preview's block holds its symbol too — the button's own
        // box, ink to the symbol's far edge — and the row is centred
        // with it: the ask of the 22nd)
        var pkBtn = pk && (pk.querySelector('.peek-open') || pk);
        var pkR = pkBtn ? pkBtn.getBoundingClientRect().right : 0;
        // SEE PREVIEW ALONE, CENTRED IN THE BAND BY ITS INK (2026-09-22):
        // the author and the date stand up the frame's sides now (the
        // side stacks, below); the line is centred from the S's ink to
        // the arrow's — the arrow a 12 mask 8 into its pseudo, its path
        // 4 to 16 of 20, so its ink ends 17.6 (and half the stroke) past
        // the pseudo's left, which stands at the button's right less
        // --hl-rgt.
        if (ePk && pkBtn) {
          var hRgt = parseFloat(getComputedStyle(pkBtn).getPropertyValue('--hl-rgt')) || 0;
          var symR = pkBtn.getBoundingClientRect().right - hRgt + 8 + 12 * 16 / 20 + 0.5;
          var inkW = symR - ePk.l;
          var inkL = (cr.left + cr.right) / 2 - inkW / 2;
          seat(pk, bandMid, 'mid', { left: inkL - padC });
        } else if (eBy && ePk) {
          var wBy = (eBy.r - eBy.l) + 2 * padC, wPk = (Math.max(ePk.r, pkR) - ePk.l) + 2 * padC;
          var left0 = (cr.left + cr.right) / 2 - (wBy + chipGap + wPk) / 2;
          seat(by, bandMid, 'mid', { left: left0 });
          seat(pk, bandMid, 'mid', { left: left0 + wBy + chipGap });
        } else {
          seat(by, bandMid, 'mid', { left: cr.left + mc });
          seat(pk, bandMid, 'mid', { right: cr.right - mc });
        }
        t = cxT; b = cxB; l = cr.left; r = cr.right;
        title.classList.remove('hl-col-r', 'hl-col-l');
        title.classList.toggle('hl-col-d', picAbove);
        title.classList.toggle('hl-col-u', !picAbove);
        title.style.removeProperty('--tx-k');
        title.style.setProperty('--rx-kt', ckt + 'px');
        title.style.setProperty('--rx-kb', ckb + 'px');
        title.style.setProperty('--rx-o', Oc + 'px');
        title.style.setProperty('--rx-e', '0px');
        // the pseudo rides the title's own transform: its insets pay
        // that back, across (tdx) and down (dy)
        title.style.setProperty('--rx-t', (cxT - hb.top - dy).toFixed(2) + 'px');
        title.style.setProperty('--rx-b', (hb.bottom - cxB + dy).toFixed(2) + 'px');
        title.style.setProperty('--rx-l', (cxL - hb.left - tdx).toFixed(2) + 'px');
        title.style.setProperty('--rx-r', (hb.right - cxR + tdx).toFixed(2) + 'px');
        title.classList.add('rx');
        ring(cxT, cxB, cr.left, cr.right, ckt, ckb, Oc, 0, picAbove ? REST_RELEASE() : -REST_RELEASE(), picAbove ? 'fr-d' : 'fr-u', Ic);
        // THE AUTHOR AND THE DATE UP THE FRAME'S SIDES (2026-09-22): each a
        // stack of its capitals in one of the frame's two side columns —
        // the author left, the date right — between the picture's edge
        // and the frame's foot (its head, turned over), centred there by
        // the caps' top and the last baseline, at the chips' own size
        // unless the column is too short for the letters.
        // THE WORDS IN THE FRAME'S CORNERS (2026-09-23): the frame's head
        // band is the --wrap over the box and its foot the band the box
        // closes on (turned over, the other way about); the picture's
        // edges are the box's, Ic inside the cover's
        var colS = title.parentElement;
        var kk = colS.querySelector(':scope > .cover-meta--kick:not(.cover-meta--corner)');
        if (WRAP) {
          // (the picture wider by a --wrap each side, as above)
          if (picAbove) corners(cxT - WRAP / 2, bandMid, cxL - WRAP, cxR + WRAP, kk);
          else corners(bandMid, cxB + WRAP / 2, cxL - WRAP, cxR + WRAP, kk);
        }
      } else {
        title.classList.remove('hl-col-r', 'hl-col-l', 'hl-col-d', 'hl-col-u', 'rx');
        title.style.removeProperty('--tx-k');
        col0.classList.remove('fr', 'fr-l', 'fr-r', 'fr-d', 'fr-u');
        seat(by, tS.top - 2 * g, 'bot');
        seat(pk, dS.bot + 2 * g, 'top');
        t -= g; b += g; l -= g; r += g;
      }
      // AND BLACK BANDS AT THE HEAD AND THE FOOT (2026-09-21, later),
      // the columns' own rule turned over: from the box's top down to
      // g under the byline's baseline, and from g over See Preview's
      // cap down to the box's foot, so the two Roboto lines stand in
      // the charcoal as the side column stands beside the words. Each
      // is a height from its own edge; the sheet paints them as one
      // more gradient over the box.
      var kt = 0, kb = 0;
      var bySp = by && by.classList.contains('rb-in') ? inkSpan(by) : null;
      var pkSp = pk && pk.classList.contains('rb-in') ? inkSpan(pk) : null;
      if (bySp) kt = Math.max(0, (bySp.bot + g) - t);
      if (pkSp) kb = Math.max(0, b - (pkSp.top - g));
      title.style.setProperty('--tx-kt', kt.toFixed(2) + 'px');
      title.style.setProperty('--tx-kb', kb.toFixed(2) + 'px');
      // THE COLUMN IS AS WIDE AS THE BANDS ARE TALL (2026-09-21, later
      // still): the head band's height, stood on end at the far edge.
      if (title.classList.contains('hl-col-r') || title.classList.contains('hl-col-l')) {
        // …and never wider than the excess: it stops g short of the ink
        // where the words reach the edge (a postscript's title fills
        // its column).
        var kw = Math.min(kt, title.__picLeft ? r - (title.__inkR + g) : (title.__inkL - g) - l);
        if (kw < 0) kw = 0;
        title.style.setProperty('--tx-k', (title.__picLeft ? (r - l) - kw : kw).toFixed(2) + 'px');
      } else {
        title.style.removeProperty('--tx-k');
      }
      title.style.setProperty('--tx-t', (t - hb.top).toFixed(2) + 'px');
      title.style.setProperty('--tx-b', (hb.bottom - b).toFixed(2) + 'px');
      // the pseudo rides the title's transform: its insets are taken off
      // the title's UNSHIFTED box, so the shift is given back here
      title.style.setProperty('--tx-l', (l - hb.left - tdx).toFixed(2) + 'px');
      title.style.setProperty('--tx-r', (hb.right - r + tdx).toFixed(2) + 'px');
    });
    flushSideStacks();
  }

  // ---------- THE BAND'S DEKS KEEP THEIR OWN AIR (2026-09-19) ----------
  // The band takes the window edge to edge now, and its Garamond stood
  // ON the glass — the name's T on the left edge, Subscribe's e on the
  // right — while the same words sat 28 or so under the band's top.
  // They stand off the sides by what they stand off the top: each dek's
  // own air, measured to its own INK and not to its box, since a box
  // here is a line box with half-leading above it and a link with side
  // bearings and a trailing letter-space inside it, and none of that is
  // anything the reader sees.
  // THE INK IS THE SEATING'S OWN. Every word in the band carries a
  // highlight block, and the block is already formed to the ink — the
  // cap it opens on, the first letter's bearing, the last letter's.
  // Those three measures are read back here rather than taken again, so
  // the air around the band is the air the reader sees around a block.
  // (Which is why this runs after seatInkBlocks and not before it.)
  // The middle dek is the date and keeps the window's centre: the
  // margins go on the deks, inside the band's two 1fr tracks, so the
  // tracks do not resize and the centre column does not move.
  function inkOf(el) {
    var up = parseFloat(el.style.getPropertyValue('--hl-up'));
    if (!isFinite(up)) return null;
    var lf = parseFloat(el.style.getPropertyValue('--hl-lft'));
    var rg = parseFloat(el.style.getPropertyValue('--hl-rgt'));
    var r = el.getBoundingClientRect();
    return {
      top: r.top + up,
      left: r.left + (isFinite(lf) ? lf : 0),
      right: r.right - (isFinite(rg) ? rg : 0)
    };
  }
  // A dek's ink is the reach of every seated word in it: the highest
  // cap of the run, its leftmost bearing and its rightmost.
  function dekInk(dek) {
    var words = dek.querySelectorAll('.hl-ink');
    var t = Infinity, l = Infinity, r = -Infinity;
    for (var i = 0; i < words.length; i++) {
      var k = inkOf(words[i]);
      if (!k) continue;
      if (k.top < t) t = k.top;
      if (k.left < l) l = k.left;
      if (k.right > r) r = k.right;
    }
    if (isFinite(t) && isFinite(l) && isFinite(r)) return { top: t, left: l, right: r };
    // NOT EVERY NAME IS A LINK (2026-09-19). The head band's name is
    // one and carries a block; the colophon's — EST. MAY 2025 — is a
    // plain span that goes nowhere, so there is no seated block to read
    // the ink back from and it sat flush on the glass while the links
    // opposite kept their air. Measured directly instead: the run's own
    // reach across, and its cap off the rasteriser, which is where the
    // carriers' own measures come from in the first place.
    var run = inFlowRun(dek), reach = inkReach(dek);
    return (run && reach) ? { top: reach.capTop, left: run.left, right: run.right } : null;
  }
  function fitBandDekInset() {
    [].forEach.call(document.querySelectorAll('.page-rows > .section-band'), function (band) {
      // THE COLOPHON ANSWERS TO THE HEAD BAND (2026-09-19): it kept the
      // page's measure while the head band took the window, and the two
      // are the same piece of furniture at either end of the page. Both
      // now.
      var deks = [].filter.call(band.children, function (el) {
        return el.classList.contains('band-deks');
      });
      if (deks.length < 2) return;
      var pair = [
        { el: deks[0], side: 'marginLeft' },
        { el: deks[deks.length - 1], side: 'marginRight' }
      ];
      // cleared first, so the seat is solved from the band's own edge
      // every pass and no run can drift on the last one's answer
      pair.forEach(function (p) { p.el.style[p.side] = ''; });
      var box = band.getBoundingClientRect();
      // 36 IN FROM EACH SIDE (2026-09-23): the Garamond's ink stands 36
      // from the band's edges — it stood the air over it (~27) before.
      var SIDE_IN = 36;
      pair.forEach(function (p) {
        var ink = dekInk(p.el);
        if (!ink) return;
        var now = p.side === 'marginLeft' ? ink.left - box.left : box.right - ink.right;
        p.el.style[p.side] = (SIDE_IN - now).toFixed(2) + 'px';
      });
    });
  }
  function fitSubscribeLines() {
    fitLatestStack();
    fitBandNameMid();
    var gap = courierGap();
    void gap;
    [].forEach.call(document.querySelectorAll('.page-banner--apart'), function (band) {
      var name = band.querySelector('.banner-name');
      var below = band.querySelector('.banner-line--below');
      if (!name || !below) return;
      below.style.top = '';
      // (a section's tag is a dek now: its cap SECTION_DEK_GAP under the
      // name's descender line — the face's, so the three stand alike
      // whether the word has one or not — 2026-09-23)
      if (band.classList.contains('page-banner--section')) {
        var nb = baselineOf(name), db = baselineOf(below);
        if (!nb || !db) return;
        var ncs2 = getComputedStyle(name);
        measureCtx.font = ncs2.fontStyle + ' ' + ncs2.fontWeight + ' ' + ncs2.fontSize + ' ' + ncs2.fontFamily;
        var nDesc = measureCtx.measureText('p').actualBoundingBoxDescent || 0;
        var t0 = parseFloat(getComputedStyle(below).top) || 0;
        below.style.top = (t0 + (nb.base + nDesc + SECTION_DEK_GAP) - db.cap).toFixed(2) + 'px';
        return;
      }
      var nr = inkReach(name), lr = inkReach(below);
      if (!nr || !lr) return;
      // THE TAG IS TUCKED INTO THE MARK (2026-09-19). It stood the
      // courier's own gap under the word's ink — a measure borrowed
      // from the hero's line, which answers to a RULE and not to a
      // block — so inside the rectangle the two of them square off
      // into, the tag sat high and the mark carried a band of empty
      // yellow under it. It is centred in that space now: between the
      // bottom of the word's ink and the end of the highlight.
      //
      // WHICH LOOKS CIRCULAR AND IS NOT. The rectangle's foot is the
      // TAG's own block (the tag is the lowest thing in the mark), and
      // that block ends one pad below the tag's baseline — so moving
      // the tag moves the very edge it is being centred against. Write
      // it out and it solves: with W the word's ink foot, c the tag's
      // cap height and p its block's reach below the baseline, the
      // centre condition asks for the tag's baseline at W + c + p,
      // which puts its CAP at W + p. One pad under the word's ink, and
      // the arithmetic falls out of the line entirely.
      //
      // p IS THE BLOCK'S OWN REACH, read the way the sheet computes it
      // (--hl-pad against --hl-desc, the deeper winning) rather than
      // off --hl-desc itself: that property is written by
      // seatInkBlocks, which runs AFTER this step, so on a first pass
      // it is not there to read.
      // CAP TO BASELINE, as everything else on this site is seated:
      // the descenders of "writing" and "generation" hang below the
      // tag's block exactly as a g hangs below its own mark, and the
      // seat does not move because a tag happens to have one.
      // THE AIR IS THE WORD'S, NOT THE TAG'S (2026-09-19). Seating the
      // tag by its OWN block's pad centred it cap-to-baseline and left
      // it sitting low and cramped: the rectangle kept 27.8 of air
      // above the word's caps and 1.4 under the tag's feet, because
      // the pad is 0.32 of a type size and the two of them are 87 and
      // 13. One mark cannot clear its contents by 28 at one end and by
      // one at the other.
      // SO THE TAG TAKES THE WORD'S PAD. Its cap stands P under the
      // word's ink, P being the air the word's own block already keeps
      // over its caps — which is what gives the tag room. The foot of
      // the rectangle then closes on half of that; see below.
      // TO THE FACE'S DESCENDER, not the line's own. "New Critics take
      // on the world" has nothing below its baseline and the other two
      // tags do; measured to the ink that happens to be there, the
      // three banners would close at three different distances. The
      // block is drawn to the face's deepest descender (--hl-desc does
      // the same), so the air is measured to it too and the three
      // marks match.
      var wcs = getComputedStyle(name);
      var wfs = parseFloat(wcs.fontSize) || 16;
      var P = Math.min(0.32 * wfs, 32);
      var bcs = getComputedStyle(below);
      var bfs = parseFloat(bcs.fontSize) || 13;
      var d = descOf(bcs, bfs);
      // How far the tag's block reaches under its baseline: its
      // descender, and then the word's pad clear of that. The sheet
      // reads this off --tag-reach for the BOTTOM edge alone —
      // --hl-pad could not be moved instead, since that token drives
      // all four sides and would have blown the rectangle out sideways
      // by thirty a side.
      // HALF THE PAD AT THE FOOT (2026-09-19). Equal airs made the
      // rectangle symmetrical on paper and bottom-heavy to look at:
      // the air above answers a word at 87 and the air below a tag at
      // 13, and the eye weighs them against the ink beside them rather
      // than against each other. The foot takes half of what the head
      // does. The tag itself has not moved — it still stands the full
      // P under the word's ink — so it is no longer at the arithmetic
      // centre of the space, and is not meant to be.
      below.style.setProperty('--tag-reach', (d + P / 2).toFixed(2) + 'px');
      below.style.top = (nr.foot + P - lr.capTop).toFixed(2) + 'px';
    });
  }
  function refitAfterClose() { atRest(function () { step('fitTitleHalo#close', fitTitleHalo); }); }
  window.addEventListener('newcritic:closed', function () { whenStill(refitAfterClose); });
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
    // The band fitter and its two measures, for a console to call.
    window.__fitBands = fitBands; window.__capSpan = capSpan; window.__paintedSpan = paintedSpan; window.__inkSpan = inkSpan;
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
