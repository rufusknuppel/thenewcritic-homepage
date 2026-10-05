(function () {
  // AN ESSAY OFFERS TWO THINGS UNDER THE HAND (2026-09-23): a hand on
  // its picture (not its title, 2026-09-23) sets READ NOW ↗ | PREVIEW ⤢ in the middle
  // of the picture, over a scrim — the first the post's link, the
  // second the card's preview (the hidden .peek-open, card-open.js);
  // the pointer's Read Now and the corner's dog-ear stand down for
  // essays (cover-cue.js, style.css THE ESSAY OFFERS TWO THINGS).
  var ESSAYS = '.duo-half--mega';
  var READ = '<svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4h8v8M16 4L4 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function picBox(card) {
    var t = card.querySelector('.card-title.hl-rect.rx');
    if (!t) return null;
    var r = t.getBoundingClientRect(), c = getComputedStyle(t, '::before');
    if (c.content === 'none') return null;
    // (the pseudo is widened past its box by the frame's --wrap each
    // side, which its computed insets do not carry)
    var wrap = parseFloat(getComputedStyle(t).getPropertyValue('--wrap')) || 0;
    var box = { l: r.left + (parseFloat(c.left) || 0) - wrap, r: r.right - (parseFloat(c.right) || 0) + wrap, t: r.top + (parseFloat(c.top) || 0), b: r.bottom - (parseFloat(c.bottom) || 0) };
    // (READ ON THE WINDOW, 2026-10-04, "Adjust Read essay effect too": a
    // card resting open shows only the picture's window — the rest has
    // slid under the margin's line — so the scrim and the word take the
    // window, cut where the line stands, as the picture's own centring
    // does: card-open.js, recal)
    if (card.classList.contains('is-rest-open')) {
      var cv = (getComputedStyle(t).clipPath.match(/-?[\d.]+px/g) || []).map(parseFloat).filter(function (n) { return Math.abs(n) < 50000; })[0];
      if (cv != null) {
        var dx = parseFloat(card.style.getPropertyValue('--slide-x')) || 0, cut = r.left + cv;
        if (dx < 0) box.l = Math.max(box.l, cut); else box.r = Math.min(box.r, cut);
      }
    }
    return box.r > box.l && box.b > box.t ? box : null;
  }
  // the card beside it in its row (duo-panel-fit.js, slideMate)
  function mateOf(card) {
    var sec = card.closest('section.card');
    var g = sec && sec.getAttribute('data-group'), r = sec && sec.getAttribute('data-row');
    if (!sec || g == null || r == null) return null;
    var all = document.querySelectorAll('section.card[data-row="' + r + '"]');
    for (var i = 0; i < all.length; i++) {
      if (all[i] !== sec && all[i].getAttribute('data-group') === g) return all[i].querySelector(ESSAYS);
    }
    return null;
  }
  function inside(b, x, y) { return b && x >= b.l && x <= b.r && y >= b.t && y <= b.b; }

  // READ NOW ALONE, AND THE WHOLE PICTURE ITS LINK (2026-10-01, at the
  // user's word): the scrim is the post's link wherever the hand falls
  // in the picture, and Preview has gone down to the courier's line
  // (duo-panel-fit.js, seatPeekCorners)
  function acts(card) {
    if (card.__acts) return card.__acts;
    var link = card.querySelector('a.card-image-link') || card.querySelector('a[href]');
    var el = document.createElement('a');
    el.className = 'essay-acts';
    el.href = link ? link.getAttribute('href') : '#';
    // (named for its kind: Read Essay, Read Interview, Read Review)
    var word = card.classList.contains('duo-half--kind-postscript') ? 'Read Interview' : card.classList.contains('duo-half--kind-contra') ? 'Read Review' : 'Read Essay';
    el.innerHTML = '<span class="essay-act essay-act--read">' + word + READ + '</span>';
    card.appendChild(el);
    card.__acts = el;
    return el;
  }

  var shown = null;
  function hide() {
    if (!shown) return;
    shown.classList.remove('is-acts');
    shown = null;
  }
  function place(card, box) {
    var el = acts(card);
    var op = el.offsetParent || card;
    var o = op.getBoundingClientRect();
    el.style.left = (box.l - o.left + op.clientLeft).toFixed(2) + 'px';
    el.style.top = (box.t - o.top + op.clientTop).toFixed(2) + 'px';
    el.style.width = (box.r - box.l).toFixed(2) + 'px';
    el.style.height = (box.b - box.t).toFixed(2) + 'px';
    // (THE WORD FITS THE SLIVER, 2026-10-01: where the box is narrower
    // than the word on one line — the uncovered edge of a mate's picture
    // — the word breaks over its lines, centred; style.css, READ ON THE
    // SLIVER. The one-line width is read once per card.)
    if (card.__actW == null) { var a = el.firstElementChild; card.__actW = a ? a.getBoundingClientRect().width : 0; }
    el.classList.toggle('is-narrow', (box.r - box.l) < card.__actW + 24);
  }
  // THE SCRIM IS HELD THROUGH A PREVIEW (2026-09-24). It was the hover's
  // alone, and a preview brought a charcoal of its own that faded in
  // with its text: pressed, the scrim went at once and the picture showed
  // bright for a frame before the preview's charcoal came up; shut, the
  // scrim came back at once OVER the text, cutting it off mid-fade. Now
  // the scrim stays the one charcoal from the hand to the preview and
  // home again — held while the card opens, stands open and shuts
  // (.is-acts-held), its two acts faded out — and the preview is its
  // text alone, fading in and out over it (style.css, THE PREVIEW FADES
  // OVER THE SCRIM). Watched on the card's own classes, so the hold
  // starts and ends in the same breath as the preview.
  // (A SLIDING PREVIEW HOLDS NO SCRIM, 2026-10-01: the card slides off
  // its preview with its picture in the light — style.css, THE PREVIEW
  // SLIDES)
  function hold(card) {
    var held = !card.classList.contains('is-slide') && card.matches('.is-open, .is-opening, .is-shutting');
    if (held) { var box = picBox(card); if (box) place(card, box); }
    if (card.classList.contains('is-acts-held') !== held) card.classList.toggle('is-acts-held', held);
  }
  if (window.MutationObserver) {
    var watch = new MutationObserver(function (ms) {
      ms.forEach(function (m) { if (m.target.matches && m.target.matches(ESSAYS)) hold(m.target); });
    });
    [].forEach.call(document.querySelectorAll(ESSAYS), function (c) {
      watch.observe(c, { attributes: true, attributeFilter: ['class'] });
    });
  }
  function show(card, box) {
    place(card, box);
    if (shown !== card) hide();
    card.classList.add('is-acts');
    shown = card;
  }

  var lx = -1, ly = -1, pending = false;
  function run() {
    pending = false;
    // (not while THE LATEST slides: the pictures pass under a still hand —
    // "during the latest column slide, deactivate hover in kickers")
    var mn = document.querySelector('main');
    if (mn && mn.classList.contains('rail-anim')) { hide(); return; }
    var hitCard = null, hitBox = null;
    // (a card slid out over its mate is asked first, and the mate under
    // it not at all, 2026-10-01)
    // (READ ON THE SLIVER, 2026-10-01, "when one preview is open, read
    // should adjust and still work for other card": the mate under an
    // open card is asked too, for the part of its picture the slid
    // picture leaves in the light — its box cut to that edge; while the
    // slid picture is still moving the mate is not asked)
    var cards = [].slice.call(document.querySelectorAll(ESSAYS));
    var out = cards.filter(function (c) { return c.classList.contains('is-slide') && c.matches('.is-open, .is-opening, .is-shutting'); });
    var under = [], cover = [];
    out.forEach(function (c) {
      var m = mateOf(c); if (!m) return;
      under.push(m);
      var cv = c.matches('.is-opening, .is-shutting') ? null : picBox(c);
      // (the slid picture goes on its sheet, 36 of the page's ground
      // either side of it — .slide-sheet, seatSlides — which covers the
      // mate's picture as the picture does: the cover is the sheet's width)
      var sh = cv && c.querySelector(':scope > .slide-sheet');
      if (sh) { var sr = sh.getBoundingClientRect(); if (sr.width > 0) cv = { l: sr.left, r: sr.right, t: cv.t, b: cv.b }; }
      cover.push(cv);
    });
    cards = out.concat(cards.filter(function (c) { return out.indexOf(c) < 0; }));
    // (not through the head strip, or the name and the bird settled in it,
    // that stand over a picture as it passes under them: the hand is on
    // the strip, not the picture — design/stacked-wordmark, 2026-10-02)
    var top = lx >= 0 && document.elementFromPoint ? document.elementFromPoint(lx, ly) : null;
    if (top && top.closest && top.closest('.page-rows > .head-rail, .site-nav--top')) { hide(); return; }
    for (var i = 0; i < cards.length && !hitCard; i++) {
      var card = cards[i];
      if (card.matches('.is-opening, .is-shutting')) continue;
      if (card.matches('.is-open') && !card.classList.contains('is-slide')) continue;
      var cr = card.getBoundingClientRect();
      if (ly < cr.top - 400 || ly > cr.bottom + 400) continue;
      var box = picBox(card);
      if (!box) continue;
      var ui = under.indexOf(card);
      if (ui >= 0) {
        var cv = cover[ui];
        if (!cv) continue;
        // (the slid picture lies over one end of the mate's: what is
        // left is the other end, from the slid picture's edge)
        var mid = (box.l + box.r) / 2;
        if (cv.l < mid) box = { l: Math.max(box.l, cv.r), r: box.r, t: box.t, b: box.b };
        else box = { l: box.l, r: Math.min(box.r, cv.l), t: box.t, b: box.b };
        if (box.r - box.l < 8) continue;
      }
      var on = inside(box, lx, ly);
      if (on) { hitCard = card; hitBox = box; }
    }
    if (hitCard) show(hitCard, hitBox); else hide();
  }
  function ask() {
    if (pending) return;
    pending = true;
    if (window.requestAnimationFrame) requestAnimationFrame(run); else setTimeout(run, 16);
  }
  document.addEventListener('pointermove', function (e) { lx = e.clientX; ly = e.clientY; ask(); }, { passive: true });
  document.addEventListener('pointerleave', function () { lx = ly = -1; ask(); });
  addEventListener('scroll', ask, { passive: true });
  addEventListener('newcritic:fit', ask);
  addEventListener('newcritic:closed', ask);
})();
