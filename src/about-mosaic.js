(function () {
  // THE ABOUT MOSAIC (see renderAboutPage in build.js): the Letter and
  // the Manifesto open clamped to a screen's worth of their text; READ
  // ON at the foot lets the card out to its full height, and reads
  // CLOSE while it is open. A hash naming a card (about.html#letter)
  // opens it and lands on it.
  var cards = [].slice.call(document.querySelectorAll('.about-card--clamped'));
  function setOpen(card, open) {
    card.classList.toggle('is-open', open);
    var btn = card.querySelector('.about-card-more');
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Read on';
    }
  }
  cards.forEach(function (card) {
    var btn = card.querySelector('.about-card-more');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var opening = !card.classList.contains('is-open');
      setOpen(card, opening);
      // Closing a long card can leave the reader far below it — bring
      // its head back into view.
      if (!opening) card.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  });
  var want = (location.hash || '').replace(/^#/, '').toLowerCase();
  if (want) {
    var target = document.getElementById(want);
    if (target && target.classList.contains('about-card')) {
      if (target.classList.contains('about-card--clamped')) setOpen(target, true);
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      var land = function () { target.scrollIntoView({ block: 'start', behavior: 'instant' }); };
      land();
      addEventListener('load', function () { requestAnimationFrame(land); });
    }
  }
})();
(function () {
  // 72 BETWEEN INK, down the column: the cards stand on the page's own
  // charcoal with no box to see, so what reads is the distance from one
  // card's last line of ink to the next card's first. Each pair is
  // measured — the last text's ink foot (its baseline plus what hangs
  // under it, read off a canvas for that text at that font) to the
  // next text's ink top (baseline less its cap) — and the next card's
  // margin takes up the difference to 72. The first card's ink is
  // seated 72 under the band, and the last card's ink foot 72 over the
  // hero that follows.
  var col = document.querySelector('.about-col');
  if (!col) return;
  var cards = [].slice.call(col.querySelectorAll(':scope > .about-card'));
  if (cards.length < 1) return;
  var cv = document.createElement('canvas').getContext('2d');
  if (!cv) return;
  var GAP = 72;
  function textNodes(el) {
    var out = [];
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = w.nextNode())) {
      if (!/\S/.test(n.textContent)) continue;
      var p = n.parentElement;
      if (!p || !p.offsetParent && getComputedStyle(p).position !== 'fixed') continue;
      out.push(n);
    }
    return out;
  }
  function metrics(node, text) {
    var el = node.parentElement;
    var cs = getComputedStyle(el);
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    return cv.measureText(text);
  }
  // The ink top of a text node's FIRST line and the ink foot of its LAST.
  function inkTop(node) {
    var r = document.createRange();
    r.selectNodeContents(node);
    var rects = r.getClientRects();
    if (!rects.length) return null;
    var first = rects[0];
    var m = metrics(node, blockText(node));
    if (m.fontBoundingBoxAscent == null) return null;
    var baseline = first.top + m.fontBoundingBoxAscent;
    return baseline - m.actualBoundingBoxAscent;
  }
  // The foot is read off the WHOLE last block's text, not the last text
  // node alone: "Follow us on <a>Instagram</a>." ends on a text node
  // holding only the period, whose ink has no descender — and the g's
  // was being cut by the block that follows.
  function blockText(node) {
    var b = node.parentElement && node.parentElement.closest('p, li, h3, .mh-name, .mh-role');
    return ((b || node.parentElement || node).textContent || '').trim();
  }
  function inkFoot(node) {
    var r = document.createRange();
    r.selectNodeContents(node);
    var rects = r.getClientRects();
    if (!rects.length) return null;
    var last = rects[rects.length - 1];
    var m = metrics(node, blockText(node));
    if (m.fontBoundingBoxDescent == null) return null;
    var baseline = last.bottom - m.fontBoundingBoxDescent;
    return baseline + m.actualBoundingBoxDescent;
  }
  function seat() {
    cards.forEach(function (c) { c.style.marginTop = ''; c.style.marginBottom = ''; });
    void col.offsetHeight;
    var block = col.closest('.about-mosaic-block');
    var band = document.querySelector('.ledger-band--head');
    for (var i = 0; i < cards.length; i++) {
      var nodes = textNodes(cards[i]);
      if (!nodes.length) continue;
      var top = inkTop(nodes[0]);
      if (top == null) continue;
      if (i === 0) {
        // 72 under the band's foot (the block's own 72 of padding is
        // the base; the first line's leading is taken back).
        var boxTop = cards[0].getBoundingClientRect().top;
        var blockTop = block ? block.getBoundingClientRect().top : boxTop;
        cards[0].style.marginTop = (GAP - (top - blockTop)).toFixed(2) + 'px';
      } else {
        var prevNodes = textNodes(cards[i - 1]);
        var foot = prevNodes.length ? inkFoot(prevNodes[prevNodes.length - 1]) : null;
        if (foot == null) continue;
        var d = top - foot;
        cards[i].style.marginTop = (GAP - d).toFixed(2) + 'px';
        void col.offsetHeight;
      }
    }
    // The last card's ink foot 72 over what follows the block.
    var lastNodes = textNodes(cards[cards.length - 1]);
    var lastFoot = lastNodes.length ? inkFoot(lastNodes[lastNodes.length - 1]) : null;
    if (lastFoot != null) {
      var boxBottom = cards[cards.length - 1].getBoundingClientRect().bottom;
      cards[cards.length - 1].style.marginBottom = (lastFoot - boxBottom).toFixed(2) + 'px';
    }
  }
  seat();
  addEventListener('load', seat);
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(seat, function () {});
    // A face that lands after fonts.ready has settled (a late webfont
    // swap) re-seats the column too — the measure is taken off the
    // face that prints, never a fallback's.
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', seat);
  }
  setTimeout(seat, 1500);
  var t;
  addEventListener('resize', function () { clearTimeout(t); t = setTimeout(seat, 100); });
})();
