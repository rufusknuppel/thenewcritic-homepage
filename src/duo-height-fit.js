(function(){
  // The two duo-strip cards sit at half the hero's width (minus the
  // divider/gaps), so a shared aspect-ratio can't also give their image
  // cells the hero's exact height — aspect-ratio only ties height to a
  // box's own width. Measuring the hero image cell's rendered height and
  // applying it directly is the only way to match it regardless of
  // viewport. Sets it on the frame (.duo-card-image), not the <img>
  // itself, so the card-text overlay (a sibling of the frame, sized via
  // position:absolute;inset:0 off the .card--duo ancestor) covers exactly
  // the same rect as the image beneath it.
  var hero = document.querySelector('.feature-image-cell');
  var duoImageCells = document.querySelectorAll('.duo-card-image');
  if (!hero || !duoImageCells.length) return;

  var resizeTimer;
  function fit() {
    var h = hero.getBoundingClientRect().height;
    if (!h) return;
    duoImageCells.forEach(function(cell){ cell.style.height = h + 'px'; });
  }

  fit();
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 100);
  });
})();
