(function(){
  // The left column's corner buttons ("The Latest" bottom-left, date/likes
  // bottom-right — see .card-category-btn/.card-meta--stats in style.css)
  // are pinned to fixed positions regardless of how tall the title/dek
  // run above them. Unlike the duo/trio/quad row panels (clamped live by
  // duo-panel-fit.js), nothing bounded this column's dek before, so a
  // long one could run down behind the buttons instead of stopping above
  // them. Mirrors that same measure-then-clamp approach, just for one box.
  var box = document.querySelector('.card--feature .card-text--left');
  if (!box) return;
  var dek = box.querySelector('.card-dek');
  if (!dek) return;
  // The floor is the footer band now (the corner buttons moved into it).
  var band = document.querySelector('.card--feature .panel-band--bottom');

  function setClamp(el, value) {
    el.style.setProperty('-webkit-line-clamp', value);
    el.style.setProperty('line-clamp', value);
  }

  function fit() {
    dek.style.display = '';
    dek.style.overflow = '';
    dek.style.webkitBoxOrient = '';
    setClamp(dek, '');

    // Below 640px the column drops out of its fixed-height, absolutely
    // positioned layout into normal flow (see the max-width:640px rules
    // in style.css) — no fixed corner zone to clamp against there.
    if (window.innerWidth <= 640) return;

    if (!band) return;
    var limit = band.getBoundingClientRect().top - 16;

    var r = dek.getBoundingClientRect();
    if (r.bottom <= limit) return;

    var lineHeight = parseFloat(getComputedStyle(dek).lineHeight);
    if (!lineHeight) return;
    var lines = Math.floor((limit - r.top) / lineHeight);
    if (lines < 1) { dek.style.display = 'none'; return; }
    dek.style.display = '-webkit-box';
    dek.style.webkitBoxOrient = 'vertical';
    dek.style.overflow = 'hidden';
    setClamp(dek, String(lines));
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  } else {
    fit();
  }
  window.addEventListener('load', fit);
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 150);
  });
})();
