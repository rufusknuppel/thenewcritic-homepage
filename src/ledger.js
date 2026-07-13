(function(){
  // Archive ledger rows: clicking anywhere on a row folds its card open
  // (cover image + dek/preview/Read on, hidden-by-default markup — see
  // renderLedgerRow in build.js) and marks the item .open, which the CSS
  // uses to hold the row white and whiten its bounding dividers. An
  // accordion: opening a row closes whichever other row was open. Clicks
  // inside the card itself (its links) don't toggle — only the row does.
  var ledger = document.querySelector('.arch-ledger');
  if (!ledger) return;
  var items = [].slice.call(ledger.querySelectorAll('.arch-ledger-item'));
  if (!items.length) return;

  // The card's height is the image's 16:9 (see style.css) — the text
  // column is absolutely bound to its grid area. The excerpt runs in two
  // columns (same rules as the essay panels): the block is capped at a
  // whole-line multiple ending GAP_BOTTOM above the footer band, the
  // line remainder shifts the column down (top padding is the minimum),
  // and a cut ends at its last whole word with the ellipsis joined onto
  // it inline (see truncateToWord — same approach as duo-panel-fit.js).
  var TRAIL_PUNCT = /[\s.,;:!?'"‘’“”()\[\]…—–-]+$/;

  function removeAfter(root, node) {
    var n = node;
    while (n && n !== root) {
      while (n.nextSibling) n.parentNode.removeChild(n.nextSibling);
      n = n.parentNode;
    }
  }

  function truncateToWord(el) {
    if (!el.__fullHTML) el.__fullHTML = el.innerHTML;
    var blockR = el.getBoundingClientRect();
    var EPS = 2;
    function fits(r) {
      return r.bottom <= blockR.bottom + EPS && r.right <= blockR.right + EPS;
    }
    var nodes = [];
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = w.nextNode())) nodes.push(n);
    var cutNode = null, cutEnd = -1;
    for (var i = nodes.length - 1; i >= 0 && !cutNode; i--) {
      var t = nodes[i].textContent;
      var re = /\S+/g, m, best = -1;
      while ((m = re.exec(t))) {
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
    var guard = 30;
    while (guard-- > 0 && cutNode) {
      cutNode.textContent = cutNode.textContent.replace(TRAIL_PUNCT, '') + '…';
      var er = document.createRange();
      er.setStart(cutNode, cutNode.textContent.length - 1);
      er.setEnd(cutNode, cutNode.textContent.length);
      if (fits(er.getBoundingClientRect())) return;
      var rest = cutNode.textContent.slice(0, -1).replace(TRAIL_PUNCT, '').replace(/\S+$/, '');
      if (rest.trim()) {
        cutNode.textContent = rest;
      } else {
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

  // Reads the rendered line boxes of the two-column block and reports, per
  // column, whether the bottom line slot is occupied (…Full) and whether
  // the line sitting in it is an orphan — a paragraph's opening line
  // stranded at the column's foot while its body carries on past the
  // break. Same helper as duo-panel-fit.js.
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

  // Tallest height (in lines) at which both columns run full — top line
  // against the divider, bottom line against the footer gap — with
  // neither column ending in an orphan. 0 when no height fills both
  // columns (content too short). Same helper as duo-panel-fit.js.
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

  function fitCard(card) {
    var text = card.querySelector('.arch-ledger-card-text');
    if (!text || card.hidden) return;
    var band = text.querySelector('.panel-band--bottom');
    // Restore a previous fit's truncation before anything is measured (or
    // queried — the paragraphs below must be the fresh nodes).
    var block0 = text.querySelector('.card-preview-block');
    if (block0 && block0.__fullHTML) block0.innerHTML = block0.__fullHTML;
    var paras = text.querySelectorAll('.card-preview');
    text.style.paddingTop = '';
    [].forEach.call(text.children, function(el){
      if (el === band) return;
      el.style.display = '';
      el.style.maxHeight = '';
      el.style.height = '';
      el.style.columnFill = '';
      el.style.overflow = '';
    });
    [].forEach.call(paras, function(p){
      p.style.display = '';
      p.style.overflow = '';
      p.style.maxHeight = '';
      p.style.webkitBoxOrient = '';
      p.style.webkitLineClamp = '';
      p.style.lineClamp = '';
      p.classList.remove('card-preview--clamped');
    });
    // Stacked fallback layout (narrow viewports): the text column is back
    // in flow and grows with its content — the static CSS clamps handle
    // length, nothing to fit against.
    if (getComputedStyle(text).position !== 'absolute') return;
    [].forEach.call(paras, function(p){
      p.style.webkitLineClamp = '999';
      p.style.lineClamp = '999';
    });
    var GAP_BOTTOM = 16;
    var limit = (band
      ? band.getBoundingClientRect().top
      : text.getBoundingClientRect().bottom - 33) - GAP_BOTTOM;
    var cutting = false;
    [].forEach.call(text.children, function(el){
      if (el === band) return;
      if (getComputedStyle(el).display === 'none') return;
      if (cutting) { el.style.display = 'none'; return; }
      if (el.classList.contains('card-preview-block')) {
        // Two-column excerpt, sized by pickColumnHeight: both columns run
        // full from the divider line down to the footer line, grids
        // aligned, neither column ending in an orphan. Sequential fill
        // against an explicit height makes "both columns full" a property
        // the height alone controls — and deleting the clipped tail later
        // can't re-balance what shows.
        var firstP = el.querySelector('.card-preview');
        var plh = parseFloat(getComputedStyle(firstP || el).lineHeight) || 22;
        var budget = limit - el.getBoundingClientRect().top;
        var maxLines = Math.floor(budget / plh);
        if (maxLines < 1) { el.style.display = 'none'; return; }
        el.style.overflow = 'hidden';
        el.style.columnFill = 'auto';
        var blockLines = pickColumnHeight(el, plh, maxLines);
        if (blockLines) {
          el.style.height = (blockLines * plh) + 'px';
        } else {
          // Content too short to floor both columns at any height — let
          // it balance naturally and just anchor what there is.
          el.style.height = '';
          el.style.columnFill = '';
          el.style.maxHeight = (maxLines * plh) + 'px';
        }
        // Anchor to the footer band: whatever the block doesn't use —
        // lines the fitter gave back, plus the line remainder — raises
        // the top padding above its minimum.
        var anchorShift = limit - el.getBoundingClientRect().bottom;
        if (anchorShift > 0) {
          var basePad = parseFloat(getComputedStyle(text).paddingTop) || 0;
          text.style.paddingTop = (basePad + anchorShift) + 'px';
        }
        if (el.scrollWidth > el.clientWidth + 1) truncateToWord(el);
        return;
      }
      if (el.getBoundingClientRect().bottom > limit) {
        cutting = true;
        el.style.display = 'none';
      }
    });
  }

  function setOpen(item, open) {
    var row = item.querySelector('.arch-ledger-row');
    var card = item.querySelector('.arch-ledger-card');
    item.classList.toggle('open', open);
    if (card) card.hidden = !open;
    if (row) row.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (card && open) fitCard(card);
  }

  items.forEach(function(item){
    var row = item.querySelector('.arch-ledger-row');
    var card = item.querySelector('.arch-ledger-card');
    if (!row || !card) return;
    function toggle(){
      var opening = !item.classList.contains('open');
      if (opening) {
        items.forEach(function(other){
          if (other !== item && other.classList.contains('open')) setOpen(other, false);
        });
      }
      setOpen(item, opening);
    }
    row.addEventListener('click', toggle);
    // The row is a div acting as a button (role="button" tabindex="0") —
    // give it the keys a real button would have.
    row.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Column-head sorting: each .arch-sort button carries data-key (author /
  // date / section — mirrored as data-* on every item by renderLedgerRow)
  // and data-dir. Sorting just re-appends the item nodes in order; the
  // column head is the container's first child and never moves.
  var sortBtns = ledger.querySelectorAll('.arch-sort');
  function reorder(arr) {
    arr.forEach(function(it){ ledger.appendChild(it); });
  }
  function clearActive() {
    [].forEach.call(sortBtns, function(b){ b.classList.remove('active'); });
  }
  [].forEach.call(sortBtns, function(btn){
    btn.addEventListener('click', function(){
      var key = btn.getAttribute('data-key');
      var desc = btn.getAttribute('data-dir') === 'desc';
      var sorted = items.slice().sort(function(a, b){
        var av = a.getAttribute('data-' + key) || '';
        var bv = b.getAttribute('data-' + key) || '';
        var cmp = key === 'date' ? (Number(av) - Number(bv)) : av.localeCompare(bv);
        return desc ? -cmp : cmp;
      });
      reorder(sorted);
      clearActive();
      btn.classList.add('active');
    });
  });

  // A resize changes the image-driven card height and every line wrap —
  // refit whichever card is open.
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      var open = ledger.querySelector('.arch-ledger-item.open .arch-ledger-card');
      if (open) fitCard(open);
    }, 100);
  });

  // The shuffle button beside the Title label: Fisher–Yates over the item
  // nodes, then the same re-append. Clears any active sort direction.
  var shuffleBtn = ledger.querySelector('.arch-shuffle');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', function(){
      var arr = items.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      reorder(arr);
      clearActive();
    });
  }
})();
