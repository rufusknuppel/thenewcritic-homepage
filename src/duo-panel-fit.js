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
  // 19.25, not 24, because this measures the text's BOX and the panel's
  // spacing is specified ink to ink (see PANEL INK RHYTHM in style.css):
  // the Berlin excerpt's baseline rides 4.75px above its line box bottom
  // at 13px/1.5, so a 19.25px box floor is what prints the wanted 24px
  // of air under the last baseline. (This number tracks the body face:
  // 19.7 under Helvetica, 21.2 under Newsreader — re-derive it if the
  // face moves again.)
  var GAP = 19.25;
  // When a block's text fills every line slot its box allows, the sub-line
  // remainder (box height mod line-height) is distributed into the leading
  // instead of piling up as dead space over the band: each slot may open
  // by up to this factor so the last line sits ON the floor. 15% of a
  // 20.8px line is ~3px a slot — feathering, not double-spacing.
  var MAX_SLOT_STRETCH = 1.15;
  // The re-seat after a cut (see the multi-column branch) is allowed a
  // little more than the general feather. It is closing a STRUCTURAL
  // shortfall — a leftover row no paragraph can start in, because the
  // gap costs a slot of its own — rather than distributing a sub-line
  // remainder, and at 1.15 it lands half a line short of the floor and
  // leaves exactly the hole it was meant to close. 1.25 of a 1.5 leading
  // is 1.88, a hair looser than the 1.73 its neighbours already run at.
  var RESEAT_SLOT_STRETCH = 1.25;

  // Applies a stretched slot to a preview block's paragraphs: line-height
  // and the between-paragraph gap both become `unit`, so the paragraph
  // gap keeps costing exactly one slot and the whole block scales as one
  // grid. Wraps don't move — line-height is vertical only. Inline styles
  // are cleared by resetClamp on the next fit.
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
    // Word rects come from the FONT-METRIC box, which for EB Garamond
    // (~1.18em) overhangs the 1.1 line box by a few px — a fixed 2px
    // bottom tolerance read every last line as clipped and cut it (titles
    // lost whole lines to it). A quarter line-height absorbs the metric
    // overhang while a genuinely clipped line — a full line-height past
    // the box — still fails by a mile.
    var lineTol = (parseFloat(getComputedStyle(el).lineHeight) || 24) * 0.25;
    function fits(r) {
      return r.bottom <= blockR.bottom + lineTol && r.right <= blockR.right + EPS;
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

  // Decides how many lines tall a multi-column block stands. The rule:
  // every column runs full — top line against the divider, bottom line
  // in the slot against the footer gap, line grids aligned (the CSS sets
  // the paragraph gap to exactly one line) — and no column may end in an
  // orphan. Starts from the tallest height the box allows and gives back
  // one line at a time until the flow satisfies all of it. Returns 0
  // when no height fills every column (content too short to reach the
  // last column's floor at any of them) — callers fall back to the
  // natural balanced flow.
  function pickColumnHeight(el, plh, maxLines, cols) {
    var firstFull = 0;
    for (var k = maxLines; k >= 1; k--) {
      el.style.height = (k * plh) + 'px';
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

    if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
    var host = el.querySelector('a') || el;
    host.innerHTML = chosen.lines.map(function(l, k){
      return '<span class="title-line" style="font-size:' + chosen.sizes[k].toFixed(2) + 'px">'
        + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
    }).join('');
    // The em-based margin corrections read the element's own size; the
    // first line's is the closest single stand-in for the stack.
    el.style.fontSize = chosen.sizes[0].toFixed(2) + 'px';
    // The CSS margin-bottom's em term subtracts the LAST baseline's ride
    // (0.167em) — but em resolves against the element size just set,
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
          el.style.marginBottom = (mb + 0.167 * (chosen.sizes[0] - sLast)).toFixed(2) + 'px';
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
      reserve += el.classList.contains('card-preview-block') ? 44
        : el.classList.contains('card-dek') ? r.height + 12
        : r.height + 8;
    });
    var maxH = floorY - tr.top - GAP - reserve;
    stretchFill(title, availW, maxH, {
      lineMax: (panel.clientWidth - 48) * LINE_MAX_PER_PX
    });
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
    if (title && title.__fullHTML) { title.innerHTML = title.__fullHTML; title.__stretched = false; }
    // The stacked dek is stretch-fitted like the title (fitFillDek) —
    // same restore, and its fitted inline size goes with it.
    var dek = topBox.querySelector('.card-dek');
    if (dek) {
      if (dek.__fullHTML) { dek.innerHTML = dek.__fullHTML; dek.__stretched = false; }
      dek.style.fontSize = '';
      // stretchFill may have re-solved this against its last line's size.
      dek.style.marginBottom = '';
    }
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
      fitFillDek(panel, dek);
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
    var dekBelowReserve = 0;
    if (!band && dek && getComputedStyle(dek).display !== 'none') {
      var dekBelowCs = getComputedStyle(dek);
      dekBelowReserve = dek.getBoundingClientRect().height
        + (parseFloat(dekBelowCs.marginTop) || 0)
        + (parseFloat(dekBelowCs.marginBottom) || 0);
    }

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
      if (el === dek) {
        // A stretch-fitted dek sized itself to its budget already; the
        // whole-element clamp would fight the per-line spans.
        if (el.__stretched) return;
        // Clamping (or even hiding) the dek to protect the title is not a
        // cut — everything after it shifts up and keeps its shot.
        var dekLim = groupLimit - reserve;
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
        el.style.display = 'none';
        return;
      }
      if (el.classList.contains('card-preview-block')) {
        var colCount = parseInt(getComputedStyle(el).columnCount, 10) || 1;
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
          var budget = bandTop - GAP - dekBelowReserve - el.getBoundingClientRect().top;
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
          el.style.height = (maxLines * plh) + 'px';
          var blockLines = 0;
          var stMax = columnFill(el, plh, colCount);
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
          if (allFull || el.scrollWidth > el.clientWidth + 1) {
            blockLines = maxLines;
          } else {
            var interiorFull = true;
            for (var ci = 0; ci < colCount - 1; ci++) {
              if (!stMax.full[ci]) interiorFull = false;
            }
            blockLines = interiorFull && stMax.any[colCount - 1]
              ? maxLines
              : pickColumnHeight(el, plh, maxLines, colCount);
          }
          if (blockLines) {
            el.style.height = (blockLines * plh) + 'px';
            var spills = el.scrollWidth > el.clientWidth + 1;
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
            if (spills) truncateToWord(el);
            // The cut can leave the box a row taller than its ink (a
            // paragraph gap costs a slot of its own, so a single leftover
            // row can hold nothing). Shrink to the rows the ink really
            // occupies.
            var seated = inkRows(el, colCount);
            if (seated && seated < blockLines) {
              el.style.height = (seated * plh + 1) + 'px';
            }
            // Whatever ground the seated rows leave above the floor —
            // the grid's sub-line remainder, a structurally freed row —
            // is handed to the stack's gaps afterwards (see
            // distributeStackSlack at the end of fit).
          } else {
            // Content too short to floor every column at any height —
            // let it balance naturally and just cap what there is.
            el.style.height = '';
            el.style.columnFill = '';
            el.style.maxHeight = (maxLines * plh) + 'px';
            if (el.scrollWidth > el.clientWidth + 1) truncateToWord(el);
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
        var scAvail = bandTop - GAP - dekBelowReserve - el.getBoundingClientRect().top;
        var scSlots = Math.floor(scAvail / scLh);
        if (scSlots < 1) {
          el.style.display = 'none';
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
            // Not even one line seats — hide the block and the quote
            // divider that would otherwise sit orphaned above it.
            el.style.display = 'none';
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
            var scRows = Math.min(inkRows(el, 1) || scUsed, scSlots);
            el.style.maxHeight = (scRows * scLh + 1) + 'px';
            el.style.overflow = 'hidden';
            if (el.scrollHeight > el.clientHeight + 1) truncateToWord(el);
            // The slot remainder under the seated rows goes to the
            // stack's gaps (see distributeStackSlack at the end of fit).
          }
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
    if (!band) distributeStackSlack(topBox, title, dek, limit);

    slackToTitle(panel, topBox, band, title);
    slackToBodyColumn(panel, topBox, band, title);

    // Last: run the column rule from the panel's top border to the band's.
    if (band) fitColumnDivider(panel, topBox, band);

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

  function fitAll() {
    fitHeroLink(); // before the panels: the hero panel pins to the fitted link
    fitContraLead(); // before too: the lead's height moves every row below it
    // Re-queried every pass, not captured once: the ticker clones its whole
    // strip after this script runs (essay-ticker.js), so a NodeList taken at
    // load would leave every cloned berth's panel unfitted — its title stuck
    // at the CSS size while the original's filled its box.
    [].forEach.call(document.querySelectorAll('.duo-panel'), fit);
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
  // A back/forward restore brings the page back exactly as it was left —
  // every panel fitted for the window the reader LEFT at, with no load or
  // resize event to correct it. The archive deep links make homepage →
  // archive → back a routine round trip, and a window that changed size
  // (or zoom) while away restores half-empty boxes with paragraphs stuck
  // hidden. Refit on the restore itself.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) fitAll();
  });
})();
