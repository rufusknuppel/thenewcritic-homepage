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
    var hitCard = null, hitBox = null;
    // (a card slid out over its mate is asked first, and the mate under
    // it not at all, 2026-10-01)
    var cards = [].slice.call(document.querySelectorAll(ESSAYS));
    var out = cards.filter(function (c) { return c.classList.contains('is-slide') && c.matches('.is-open, .is-opening, .is-shutting'); });
    var under = [];
    out.forEach(function (c) { var m = mateOf(c); if (m) under.push(m); });
    cards = out.concat(cards.filter(function (c) { return out.indexOf(c) < 0 && under.indexOf(c) < 0; }));
    for (var i = 0; i < cards.length && !hitCard; i++) {
      var card = cards[i];
      if (card.matches('.is-opening, .is-shutting')) continue;
      if (card.matches('.is-open') && !card.classList.contains('is-slide')) continue;
      var cr = card.getBoundingClientRect();
      if (ly < cr.top - 400 || ly > cr.bottom + 400) continue;
      var box = picBox(card);
      if (!box) continue;
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
