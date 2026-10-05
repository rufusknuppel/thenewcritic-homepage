(function () {
  // THE CARD'S OPEN STATE, HELD.
  //
  // It used to be a pure :has() on the pointer: open while the cover or
  // the revealed body was under it, shut the instant the pointer stood
  // anywhere else. That is exactly one state expressed twice — what
  // opens the card and what keeps it open — and the two want different
  // answers. :has() cannot say that, since it has no memory of how a
  // state began, so the state is carried as a class.
  //
  // The keyboard path is in here too now. It used to be the stylesheet's
  // — every open rule read :is(.is-open, :has(<the cover's link>
  // :focus-visible)) — but a :has() anchored on the card is re-checked
  // on every mutation inside it, and the fitter's plate cuts are
  // hundreds of those a pass; it was the page's single largest cost.
  // So a visibly-focused cover link sets the same class and clears it
  // on the way out, exactly as the selector did, and the stylesheet
  // reads the class alone (see THE STATIC :has() ANCHORS ARE STRUCK).
  //
  // NOTHING STANDS ON THE PICTURE ANY MORE. The corner control — the
  // charcoal triangle and the X that took its place — is struck. The
  // page asks for the preview IN THE WORDS: OPEN PREVIEW stands on the
  // last line of every card's matter, where the date used to (build.js,
  // peekLine), and CLOSE PREVIEW stands alone at the foot of the plate
  // (READ ON and the dot beside it are struck — the plate itself is the
  // post's link on the cards that carry one, and the closing line says
  // one thing now). Both are printed by the builder, so they hold their
  // seats from the first paint and the fitters measure them like any
  // other line.
  var cards = document.querySelectorAll(
    '.latest-cell--ps, .latest-cell--contra, .duo-half--mega');
  [].forEach.call(cards, function (card) {
    // THE BLOCK LIGHTS on the pointer entering ANY part of the card —
    // the picture, the words, the block, the air between — a class
    // (style.css, .is-lit), because :has(:hover) for the same thing
    // cost a document-wide style pass per move.
    // EVERY OPEN AND CLOSE IS TIMED. The fitter reads the stamp
    // (whenStill, duo-panel-fit.js) so no pass lands on a card whose
    // picture is still travelling — a pass mid-travel cancels the
    // transition and re-seats the card open, and the slide becomes a
    // pop. A plain number on window: the two scripts share nothing else.
    var travel = function () {
      try { window.__ncTravel = performance.now(); } catch (err) {}
      // (and Read Now follows the picture through the move — cover-cue.js)
      try { window.dispatchEvent(new Event('newcritic:travel')); } catch (err) {}
    };
    // AND THE SHUT IS A STATE OF ITS OWN FOR AS LONG AS IT TAKES
    // (2026-09-22): .is-shutting for the 1.4s of the three moves home
    // (style.css, THE RELEASE AND THE ARRIVAL), so the ring, the chips
    // and the picture's Read Now hold until the box is back on it. An
    // open in the meantime clears it.
    var SHUT = 1000, // one fluid second (2026-09-22; the three moves took 1.4)
        shutTimer = 0, openTimer = 0,
        waitTimer = 0; // (the mate's way home, before this one goes out)
    // AND THE OPEN THE SAME (2026-09-22, later): .is-opening for the
    // three moves out, so the picture says Read Now through them; once
    // open and still, it says it only for a hand in the preview's box
    // or on the picture (.is-inbox, src/cover-cue.js).
    var open = function () {
      // (ONE OUT TO A ROW, 2026-10-01: a sliding card goes over its mate,
      // so a mate that is out comes home first — style.css, THE PREVIEW
      // SLIDES)
      // (ONE SHUTS BEFORE THE OTHER OPENS, 2026-10-01, at the user's word:
      // the mate is sent home, and this card waits the length of that
      // move — SHUT, the slide's own second — before it goes out; a
      // second press in the wait calls the wait off)
      var sent = false;
      if (card.classList.contains('is-slide')) {
        var sec = card.closest('section.card');
        var g = sec && sec.getAttribute('data-group'), r = sec && sec.getAttribute('data-row');
        [].forEach.call(r != null ? document.querySelectorAll('section.card[data-row="' + r + '"]') : [], function (s) {
          if (s === sec || s.getAttribute('data-group') !== g) return;
          var m = s.querySelector('.duo-half--mega.is-open');
          var po = m && m.querySelector('.peek-open, .peek-corner');
          if (po) { po.click(); sent = true; }
          // (and the mate's own Preview stands down while this is out)
          var u = s.querySelector('.duo-half--mega');
          if (u) { u.classList.add('is-under'); card.__under = u; }
        });
      }
      if (sent) {
        card.classList.add('is-waiting');
        waitTimer = setTimeout(function () { waitTimer = 0; card.classList.remove('is-waiting'); begin(); }, SHUT);
        return;
      }
      begin();
    };
    var begin = function () {
      if (shutTimer) { clearTimeout(shutTimer); shutTimer = 0; }
      card.classList.remove('is-shutting');
      card.classList.add('is-open'); travel();
      card.classList.add('is-opening');
      if (openTimer) clearTimeout(openTimer);
      openTimer = setTimeout(function () { openTimer = 0; card.classList.remove('is-opening'); }, SHUT);
    };
    var shut = function () {
      if (waitTimer) { clearTimeout(waitTimer); waitTimer = 0; card.classList.remove('is-waiting'); }
      if (openTimer) { clearTimeout(openTimer); openTimer = 0; }
      card.classList.remove('is-opening', 'is-inbox');
      card.classList.remove('is-open'); travel();
      if (card.__under) { card.__under.classList.remove('is-under'); card.__under = null; }
      card.classList.add('is-shutting');
      if (shutTimer) clearTimeout(shutTimer);
      shutTimer = setTimeout(function () { shutTimer = 0; card.classList.remove('is-shutting'); }, SHUT);
    };
    card.addEventListener('mouseenter', function () { var mn = document.querySelector('main'); if (mn && mn.classList.contains('rail-anim')) return; card.classList.add('is-lit'); });
    card.addEventListener('mouseleave', function () { card.classList.remove('is-lit'); });

    // DELEGATED ON THE CARD, not bound to the controls themselves: the
    // fitters REWRITE the plate's own markup (cutPlates trims the
    // paragraphs to the room the box has), so a listener bound to
    // CLOSE PREVIEW dies with the node it was bound to and the click
    // falls through to the plate's link — which is the whole post.
    // The card outlives every pass, so the card holds the handler.
    var hit = function (e, sel) {
      return e.target && e.target.closest ? e.target.closest(sel) : null;
    };
    // A COVER LINK UNDER VISIBLE FOCUS OPENS THE CARD, and shuts it on
    // the way out — the selector's own behaviour, carried as the class.
    // Only what focus opened does focus shut: a card opened by the
    // control stays open when the reader tabs through its cover.
    var COVER = '.latest-cover a, .duo-card-image a, .card-image-link, .latest-cover';
    card.addEventListener('focusin', function (e) {
      var t = e.target;
      if (!t || !t.closest || !t.closest(COVER)) return;
      var vis = false; try { vis = t.matches(':focus-visible'); } catch (err) {}
      if (!vis || card.classList.contains('is-open') || card.classList.contains('is-rest-open')) return;
      open();
      card.__openByFocus = true;
    });
    card.addEventListener('focusout', function (e) {
      var t = e.target;
      if (!card.__openByFocus || card.classList.contains('is-rest-open') || !t || !t.closest || !t.closest(COVER)) return;
      card.__openByFocus = false;
      shut();
      try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
    });
    card.addEventListener('click', function (e) {
      // PREVIEW IS ONE CONTROL (2026-09-22): the arrows open the card
      // and, open, the same word with its × shuts it
      // (and Preview in the courier's other corner, 2026-10-01)
      if (hit(e, '.peek-open, .peek-corner')) {
        e.preventDefault(); e.stopPropagation();
        if (card.classList.contains('is-rest-open')) return;
        // (and a press on the mate's Preview while this card's picture is
        // out over it sends this one home and opens the mate's — ONE OUT
        // TO A ROW, in open(); 2026-10-01, "should disengage one preview,
        // and start other")
        // (a press while this card waits on its mate's way home calls
        // the open off; the mate's shut goes on)
        if (waitTimer) {
          clearTimeout(waitTimer); waitTimer = 0; card.classList.remove('is-waiting');
          if (card.__under) { card.__under.classList.remove('is-under'); card.__under = null; }
          return;
        }
        if (card.classList.contains('is-open')) {
          shut();
          try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
        } else open();
        return;
      }
      // CLOSE PREVIEW stands INSIDE the plate, and on the postscript and
      // the review the whole plate is the post's link — so the click is
      // stopped dead here (preventDefault kills the navigation the
      // anchor would otherwise take once the event is through). It is a
      // span for the same reason: a button inside an anchor is not
      // markup.
      // THE PICTURE IN THE BOX OPENS THE POST, ITS FRAME NOTHING
      // (2026-09-22): the box is the title's pseudo and the frame round
      // it a clear layer of the title's — both answer as the title, which
      // is no link; the click is sorted here by where it fell
      var ttl = hit(e, '.card-title.rx, .latest-title.rx');
      if (ttl && !hit(e, 'a[href]')) {
        e.preventDefault(); e.stopPropagation();
        var tr = ttl.getBoundingClientRect(), bf = getComputedStyle(ttl, '::before');
        // (the picture's box less its insets, and wider by its side
        // margins: it takes the frame's old sides, 2026-09-23)
        var inBox = e.clientX >= tr.left + (parseFloat(bf.left) || 0) + (parseFloat(bf.marginLeft) || 0) && e.clientX <= tr.right - (parseFloat(bf.right) || 0) - (parseFloat(bf.marginRight) || 0) &&
          e.clientY >= tr.top + (parseFloat(bf.top) || 0) && e.clientY <= tr.bottom - (parseFloat(bf.bottom) || 0);
        if (inBox) {
          var toP = card.querySelector('.card-image-link, .latest-cover');
          var hrefP = toP && toP.getAttribute('href');
          if (hrefP) location.href = hrefP;
        }
        return;
      }
      if (hit(e, '.plate-close')) {
        e.preventDefault(); e.stopPropagation();
        shut();
        // The fitter re-seats the card once it has travelled back
        // (duo-panel-fit.js) — a shut card is the page at rest.
        try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
        return;
      }
      // THE BODY TEXT TAKES NO CLICK (2026-09-17): on the plate only
      // the courier kicker goes to the post and CLOSE PREVIEW shuts
      // it. The plate is the post's link whole, so a click anywhere
      // else on it — the paragraphs, the air — is stopped here.
      // THE BODY GOES TO THE POST (2026-09-21): a click on the preview's
      // paragraphs opens the piece, on every card — the cover's own
      // link says where.
      var body = hit(e, '.latest-plate-p, .card-preview');
      if (body) {
        var to = card.querySelector('.card-image-link, .latest-cover');
        var href = to && to.getAttribute('href');
        e.preventDefault(); e.stopPropagation();
        if (href) location.href = href;
        return;
      }
      if (hit(e, '.latest-plate') && !hit(e, '.plate-title')) {
        e.preventDefault(); e.stopPropagation();
        return;
      }
      // THE KICKER FILTERS THE LEDGER (2026-09-17): on the row cells it
      // stands inside the plate's own link (an anchor cannot hold an
      // anchor), so it carries its destination as data-href — the
      // archive filtered to its kind — and the click goes there, not
      // to the post.
      var kicker = hit(e, '.plate-title[data-href]');
      if (kicker) {
        e.preventDefault(); e.stopPropagation();
        location.href = kicker.getAttribute('data-href');
      }
    });
    // (Esc slides an open preview home, 2026-10-01)
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (!card.classList.contains('is-open') || card.classList.contains('is-rest-open')) return;
      shut();
      try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
    });
    // The bracketed span is not a button, so its keys are its own.
    card.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      var closer = hit(e, '.plate-close');
      if (!closer) return;
      e.preventDefault(); e.stopPropagation();
      shut();
      try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
    });
  });
  // EVERY POST RESTS OPEN (2026-10-04, at the user's word — "I want all
  // posts to rest like this, no preview function"): from 1024 up, where
  // the page opens on the band, every card that slides stands open from
  // the first — its picture out under the margin, its words beside it —
  // and there is no Preview to press (style.css, EVERY POST RESTS OPEN:
  // the control stands unseen in its seat, which the fitter measures). The
  // cards are opened once the fitter has stood them (.is-slide is its), at
  // a stroke: main.is-resting holds the slide's easing off for the frame.
  // Under 1024, where nothing slides, the cards stand shut.
  var wide = window.matchMedia('(min-width: 1024px)');
  var mainEl = document.querySelector('main.wm-banded');
  var rest = function () {
    if (!mainEl) return;
    var on = wide.matches;
    var todo = [].filter.call(document.querySelectorAll('.duo-half--mega'), function (c) {
      return on ? c.classList.contains('is-slide') && !c.classList.contains('is-rest-open') : c.classList.contains('is-rest-open');
    });
    if (!todo.length) return;
    mainEl.classList.add('is-resting');
    todo.forEach(function (c) {
      c.classList.remove('is-opening', 'is-shutting', 'is-waiting');
      c.classList.toggle('is-open', on);
      c.classList.toggle('is-rest-open', on);
    });
    try { window.__ncTravel = performance.now() - 5000; } catch (err) {}
    try { window.dispatchEvent(new Event('newcritic:travel')); } catch (err) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { mainEl.classList.remove('is-resting'); }); });
  };
  // (…AND ITS PICTURE CENTRED IN ITS WINDOW, at the user's words — "But
  // images should recalibrate / To be centered": an open card shows its
  // picture through the window the margin leaves it — the box less the
  // slide — and the picture, laid to cover the whole box, showed there
  // only the part that had cleared the margin. It is laid afresh to cover
  // the window alone, centred in it — its own proportions read off the
  // image once loaded — the box, the slide and the cut standing as they
  // were (style.css, --rest-bs / --rest-bp).)
  var sizes = {}, asked = {};
  var recal = function () {
    [].forEach.call(document.querySelectorAll('.duo-half--mega.is-rest-open'), function (h) {
      var t = h.querySelector('.card-title.hl-rect.rx');
      if (!t) return;
      var b = getComputedStyle(t, '::before');
      var url = (/url\("?([^")]+)"?\)/.exec(b.backgroundImage) || [])[1];
      var W = parseFloat(b.width), H = parseFloat(b.height);
      if (!url || !(W > 0) || !(H > 0)) return;
      var dims = sizes[url];
      if (!dims) {
        if (!asked[url]) {
          asked[url] = true;
          var im = new Image();
          im.onload = function () { if (im.naturalWidth && im.naturalHeight) { sizes[url] = [im.naturalWidth, im.naturalHeight]; recal(); } };
          im.src = url;
        }
        return;
      }
      // (the window: the painted box where it stands open — the title's
      // left, the pseudo's left and its margin — cut where the margin's
      // line stands, read off the cut itself)
      var dx = parseFloat(h.style.getPropertyValue('--slide-x')) || 0;
      var tr = t.getBoundingClientRect();
      var boxL = tr.left + (parseFloat(b.left) || 0) + (parseFloat(b.marginLeft) || 0), boxR = boxL + W;
      var cv = (getComputedStyle(t).clipPath.match(/-?[\d.]+px/g) || []).map(parseFloat).filter(function (n) { return Math.abs(n) < 50000; })[0];
      var cut = cv == null ? null : tr.left + cv;
      var winL = boxL, winR = boxR;
      if (cut != null) { if (dx < 0) winL = Math.max(boxL, cut); else winR = Math.min(boxR, cut); }
      var V = winR - winL, x0 = winL - boxL;
      if (!(V > 0)) return;
      var k = Math.max(V / dims[0], H / dims[1]), iw = dims[0] * k, ih = dims[1] * k;
      var bs = iw.toFixed(2) + 'px ' + ih.toFixed(2) + 'px';
      // (a postscript's face at the window's middle where the window crops
      // it — "with the face as the focal point (no zoom tho)": the face's
      // place in the picture, read off its <img>'s object-position (the
      // post's own head, content-overrides.js), the picture held to the
      // window's edges; anything else centred)
      var fx = 0.5, fy = 0.5;
      if (h.classList.contains('duo-half--kind-postscript')) {
        var op = [].map.call(h.querySelectorAll('img[style*="object-position"]'), function (im) { return im.style.objectPosition; })[0] || '';
        var mm = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(op);
        if (mm) { fx = mm[1] / 100; fy = mm[2] / 100; }
      }
      var px = Math.min(0, Math.max(V - iw, V / 2 - fx * iw)), py = Math.min(0, Math.max(H - ih, H / 2 - fy * ih));
      var bp = (x0 + px).toFixed(2) + 'px ' + py.toFixed(2) + 'px';
      if (t.style.getPropertyValue('--rest-bs') !== bs) t.style.setProperty('--rest-bs', bs);
      if (t.style.getPropertyValue('--rest-bp') !== bp) t.style.setProperty('--rest-bp', bp);
    });
  };
  var due = 0;
  var later = function () { if (due) return; due = requestAnimationFrame(function () { due = 0; recal(); }); };
  // (whenever the fitter seats the pictures afresh, too: duo-panel-fit.js,
  // seatSlides)
  addEventListener('newcritic:seated', later);
  ['newcritic:fitdone', 'newcritic:settled', 'load', 'resize'].forEach(function (ev) {
    addEventListener(ev, function () { setTimeout(function () { rest(); later(); }, 0); }, { passive: true });
  });
  // (a picture comes in late — the cards load theirs as they near the
  // window — so any image's arrival lays the open pictures again)
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IMG') later(); }, true);
  setTimeout(function () { rest(); later(); }, 0);
})();
