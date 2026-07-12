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
  // and a cut gets an ellipsis attached to the last visible word.
  function fitCard(card) {
    var text = card.querySelector('.arch-ledger-card-text');
    if (!text || card.hidden) return;
    var band = text.querySelector('.panel-band--bottom');
    var paras = text.querySelectorAll('.card-preview');
    text.style.paddingTop = '';
    var oldE = text.querySelector('.preview-ellipsis');
    if (oldE) oldE.parentNode.removeChild(oldE);
    [].forEach.call(text.children, function(el){
      if (el === band) return;
      el.style.display = '';
      el.style.maxHeight = '';
      el.style.overflow = '';
      el.classList.remove('card-preview-block--cut');
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
        var firstP = el.querySelector('.card-preview');
        var plh = parseFloat(getComputedStyle(firstP || el).lineHeight) || 22;
        var budget = limit - el.getBoundingClientRect().top;
        var blockLines = Math.floor(budget / plh);
        if (blockLines < 1) { el.style.display = 'none'; return; }
        el.style.maxHeight = (blockLines * plh) + 'px';
        el.style.overflow = 'hidden';
        var isCut = el.scrollWidth > el.clientWidth + 1;
        el.classList.toggle('card-preview-block--cut', isCut);
        // Anchor to the footer band: leftover space (line remainder or
        // whole unused lines) raises the top padding above its minimum.
        var anchorShift = limit - el.getBoundingClientRect().bottom;
        if (anchorShift > 0) {
          var basePad = parseFloat(getComputedStyle(text).paddingTop) || 0;
          text.style.paddingTop = (basePad + anchorShift) + 'px';
        }
        if (isCut) {
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
