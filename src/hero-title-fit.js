(function(){
  // Sizes the hero title to the largest font-size (up to the CSS clamp's
  // own max) at which (a) no word is ever split across lines — the CSS
  // sets overflow-wrap:normal on this title, so an over-long word shows
  // up as horizontal overflow we can detect, rather than being broken —
  // and (b) the title column doesn't run taller than the cover image
  // beside it. Runs after fonts load so the measurements are real.
  var title = document.querySelector('.card--feature .card-title');
  if (!title) return;
  var leftCol = document.querySelector('.card--feature .card-text--left');
  var imageCell = document.querySelector('.card--feature .feature-image-cell');

  var MAX_PX = 48; // matches the CSS clamp's 3rem ceiling
  var MIN_PX = 18;

  function fits(size) {
    title.style.fontSize = size + 'px';
    // Overflowing words (scrollWidth > clientWidth) mean this size forces
    // a split; +1 absorbs subpixel rounding.
    if (title.scrollWidth > title.clientWidth + 1) return false;
    // Stacked mobile layout has no side-by-side image to overflow.
    if (window.innerWidth <= 640) return true;
    if (!leftCol || !imageCell) return true;
    return leftCol.getBoundingClientRect().bottom
      <= imageCell.getBoundingClientRect().bottom + 1;
  }

  function fit() {
    for (var size = MAX_PX; size >= MIN_PX; size -= 1) {
      if (fits(size)) return;
    }
    // Nothing fit (extreme case) — leave the minimum applied.
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  } else {
    fit();
  }

  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 150);
  });
})();
