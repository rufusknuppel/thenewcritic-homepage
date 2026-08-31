(function () {
  // THE CARD'S OPEN STATE, HELD.
  //
  // It used to be a pure :has() on the pointer: open while the cover or
  // the revealed body was under it, shut the instant the pointer stood
  // anywhere else. That is exactly one state expressed twice — what
  // opens the card and what keeps it open — and the two want different
  // answers. The COVER opens it, and nothing else should: a pointer
  // arriving on the title has not asked for anything. But once it IS
  // open, the whole card is the reader's: the picture has come across
  // the words, the body stands where the picture was, and every pixel
  // in between belongs to the same object. Leaving the card is the only
  // thing that should close it.
  //
  // :has() cannot say that — it has no memory of how a state began — so
  // the state is carried as a class: added on the cover's own
  // mouseenter, taken off on the card's mouseleave. mouseleave does not
  // fire for a move onto a descendant, so the picture, its couriers, the
  // body and the bare paper between them all hold it open by simply
  // being inside.
  //
  // The keyboard path stays in the stylesheet, where it always was: each
  // open rule reads :is(.is-open, :has(<the cover's link>:focus-visible)),
  // so tabbing to a cover opens its card without any of this.
  var cards = document.querySelectorAll(
    '.latest-cell--ps, .latest-cell--contra, .duo-half--mega');
  [].forEach.call(cards, function (card) {
    var cover = card.querySelector('.latest-cover, .duo-card-image');
    if (!cover) return;
    cover.addEventListener('mouseenter', function () {
      card.classList.add('is-open');
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('is-open');
    });
  });
})();
