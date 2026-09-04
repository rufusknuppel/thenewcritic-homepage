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
  // peekLine), and CLOSE PREVIEW closes the plate beside READ ON. Both
  // are printed by the builder, so they hold their seats from the first
  // paint and the fitters measure them like any other line.
  var cards = document.querySelectorAll(
    '.latest-cell--ps, .latest-cell--contra, .duo-half--mega');
  [].forEach.call(cards, function (card) {
    // THE BLOCK LIGHTS on the pointer entering ANY part of the card —
    // the picture, the words, the block, the air between — a class
    // (style.css, .is-lit), because :has(:hover) for the same thing
    // cost a document-wide style pass per move.
    card.addEventListener('mouseenter', function () { card.classList.add('is-lit'); });
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
      if (!vis || card.classList.contains('is-open')) return;
      card.classList.add('is-open');
      card.__openByFocus = true;
    });
    card.addEventListener('focusout', function (e) {
      var t = e.target;
      if (!card.__openByFocus || !t || !t.closest || !t.closest(COVER)) return;
      card.__openByFocus = false;
      card.classList.remove('is-open');
      try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
    });
    card.addEventListener('click', function (e) {
      if (hit(e, '.peek-open')) {
        e.preventDefault(); e.stopPropagation();
        card.classList.add('is-open');
        return;
      }
      // CLOSE PREVIEW stands INSIDE the plate, and on the postscript and
      // the review the whole plate is the post's link — so the click is
      // stopped dead here (preventDefault kills the navigation the
      // anchor would otherwise take once the event is through). It is a
      // span for the same reason: a button inside an anchor is not
      // markup.
      if (hit(e, '.plate-close')) {
        e.preventDefault(); e.stopPropagation();
        card.classList.remove('is-open');
        // The fitter re-seats the card once it has travelled back
        // (duo-panel-fit.js) — a shut card is the page at rest.
        try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
      }
    });
    // The bracketed span is not a button, so its keys are its own.
    card.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      var shut = hit(e, '.plate-close');
      if (!shut) return;
      e.preventDefault(); e.stopPropagation();
      card.classList.remove('is-open');
      try { window.dispatchEvent(new Event('newcritic:closed')); } catch (err) {}
    });
  });
})();
