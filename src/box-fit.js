(function(){
  // Box cards (the essays/postscript/contra list-page leads and the archive
  // mosaic) have a fixed aspect ratio, so a long dek can push the meta line
  // down into the box's 24px bottom padding — the content is top-aligned
  // and nothing else gives. No static CSS clamp count is right at every
  // width (the box's height tracks its width via aspect-ratio), so measure:
  // clamp the dek to however many lines keep everything inside the padding
  // box, hiding it entirely if even one line is too many.
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.card-box-text'));
  if (!boxes.length) return;

  function setClamp(el, value) {
    el.style.setProperty('-webkit-line-clamp', value);
    el.style.setProperty('line-clamp', value);
  }

  function overflowPx(box) {
    var cs = getComputedStyle(box);
    var limit = box.getBoundingClientRect().bottom
      - (parseFloat(cs.borderBottomWidth) || 0)
      - (parseFloat(cs.paddingBottom) || 0);
    var maxBottom = -Infinity;
    Array.prototype.forEach.call(box.children, function(k){
      if (getComputedStyle(k).display === 'none') return;
      maxBottom = Math.max(maxBottom, k.getBoundingClientRect().bottom);
    });
    return maxBottom - limit;
  }

  function fit(box) {
    var dek = box.querySelector('.card-dek');
    if (!dek) return;
    dek.style.display = '';
    dek.style.overflow = '';
    dek.style.webkitBoxOrient = '';
    dek.style.flexShrink = '';
    setClamp(dek, '');
    // Static fallback layout (narrow screens / touch — see the
    // @media (max-width: 640px), (hover: none) rules in style.css): the
    // box is back in normal flow and grows with its content, so there's
    // no fixed height to fit.
    if (getComputedStyle(box).position === 'static') return;
    if (overflowPx(box) <= 0.5) return;
    var lineHeight = parseFloat(getComputedStyle(dek).lineHeight);
    if (!lineHeight) return;
    var lines = Math.max(1, Math.round(dek.getBoundingClientRect().height / lineHeight));
    dek.style.display = '-webkit-box';
    dek.style.webkitBoxOrient = 'vertical';
    dek.style.overflow = 'hidden';
    // overflow:hidden drops the dek's min-height:auto floor to 0, letting
    // the flex column shrink it by raw pixels — which "fixes" the overflow
    // by clipping the last line mid-glyph before the clamp loop below ever
    // sees it. Pin the flex basis so the clamp is what does the fitting.
    dek.style.flexShrink = '0';
    while (lines > 1 && overflowPx(box) > 0.5) {
      lines -= 1;
      setClamp(dek, String(lines));
    }
    // Even a one-line dek doesn't fit — the title alone fills the box.
    if (overflowPx(box) > 0.5) dek.style.display = 'none';
  }

  function fitAll() { boxes.forEach(fit); }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAll);
  } else {
    fitAll();
  }

  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 150);
  });
})();
