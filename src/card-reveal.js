// EACH CARD ARRIVES WHOLE (2026-09-24). A card on the front page —
// its picture, its courier line and its title — stands unseen until the
// reader scrolls it into the window, and then fades in as one: from
// nothing, ten pixels of blur and 25 below its seat, to rest, over a
// second (ARRIVAL; style.css, EACH CARD ARRIVES WHOLE — atmos.earth's).
//   It arrives READY. The picture was the glitch: lazy, it was fetched
// as it came near and decoded off the thread in 45–60ms, so it popped
// in on a timeline of its own under words already standing. Here a
// card two screens ahead is fetched at once and decoded, and marked
// .is-near (will-change) so its layer is rastered before it is shown;
// the fade waits for the decode, a moment at most (READY_WAIT), so a
// slow picture never holds its words back for long.
//   And it arrives on a SETTLED page. The fitter measures the cards,
// and a card mid-rise is 25 pixels off its seat: no card starts until
// the whole page has been fitted (newcritic:settled, duo-panel-fit.js),
// and a pass that lands during a fade cancels it (atRest), the card
// standing at rest at once — a snap, never a seat measured in flight.
//   No script, no hiding: .nc-reveal on <html> is what hides them, and
// a reader who asks for less motion is never given it.
(function () {
  if (document.body.classList.contains('word-page')) return;
  if (!window.IntersectionObserver) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cards = [].slice.call(document.querySelectorAll('main.has-mega .page-rows .duo-half--mega'));
  if (!cards.length) return;
  document.documentElement.classList.add('nc-reveal');

  var READY_WAIT = 1200;
  // atmos.earth's: a second, eased out, from nothing, a blur and a rise
  var ARRIVAL = [
    { opacity: 0, filter: 'blur(10px)', transform: 'translateY(25px)' },
    { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }
  ];
  var TIMING = { duration: 1000, easing: 'cubic-bezier(0, 0, 0.58, 1)', fill: 'backwards' };
  var ready = function (card) {
    if (card.__ready) return card.__ready;
    var img = card.querySelector('img.card-image');
    if (!img) return (card.__ready = Promise.resolve());
    if (img.loading === 'lazy') img.loading = 'eager';
    card.__ready = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    return card.__ready;
  };

  var shown = function (card) {
    if (card.__shown) return;
    card.__shown = true;
    var go = function () {
      if (card.classList.contains('is-in')) return;
      card.classList.add('is-in');
      // A SCRIPT ANIMATION, NOT THE SHEET'S: every fit pass stands its
      // cards in .fit-still, whose `animation: none` would restart a
      // keyframe animation on every card already shown the moment the
      // pass let go of it — each one fading in again. The fitter's
      // cancel still reaches this one (atRest), and it simply ends.
      var release = function () { card.classList.remove('is-near'); };
      if (!card.animate) return release();
      var a = card.animate(ARRIVAL, TIMING);
      a.finished.then(release, release);
    };
    var t = setTimeout(go, READY_WAIT);
    ready(card).then(function () { clearTimeout(t); go(); });
  };

  // Two screens ahead: fetched, decoded, rastered.
  var near = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      near.unobserve(en.target);
      if (!en.target.classList.contains('is-in')) en.target.classList.add('is-near');
      ready(en.target);
    });
  }, { rootMargin: '0px 0px 200% 0px' });

  // In the window, its top a tenth of the window's height up from the
  // foot (or anywhere in it, for a card above that the reader has come
  // back to): shown.
  var into = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      into.unobserve(en.target);
      shown(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  var begin = function () {
    if (begin.done) return;
    begin.done = true;
    cards.forEach(function (card) { near.observe(card); into.observe(card); });
  };
  if (window.__ncSettled) begin();
  else {
    addEventListener('newcritic:settled', begin);
    // Never left unseen: if the fitter's word is lost, the cards come
    // anyway (the fitter's own backstop for the second stage is 15s).
    setTimeout(begin, 16000);
  }
  addEventListener('beforeprint', function () {
    cards.forEach(function (card) { card.classList.add('is-in'); });
  });
})();
