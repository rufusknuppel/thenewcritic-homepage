(function(){
  // Sequential fill: show the first paragraph in full (no ellipsis) if it
  // fits in the box; only if it's too long to fit does IT get clamped (with
  // an ellipsis) to use up the whole box, with the second paragraph hidden.
  // Otherwise the second paragraph gets whatever's left over, clamped to
  // that with its own ellipsis if it runs long. Static CSS clamps on
  // .card-preview (see style.css) are just the no-JS fallback — this is
  // the real fit, since no CSS mechanism lets one clamped box hand its
  // leftover space to a sibling; it has to be measured.
  var box = document.querySelector('.card--feature .card-text--right');
  if (!box) return;
  var block = box.querySelector('.card-preview-block');
  if (!block) return;
  var paras = block.querySelectorAll('.card-preview');
  if (paras.length < 2) return;
  var first = paras[0], second = paras[1];
  var cta = box.querySelector('.card-preview-cta');

  function setClamp(el, value) {
    el.style.setProperty('-webkit-line-clamp', value);
    el.style.setProperty('line-clamp', value);
  }

  function reset() {
    setClamp(first, '');
    setClamp(second, '');
    second.style.display = '';
  }

  function fit() {
    // Below the 640px breakpoint the box just stacks under the image and
    // grows to fit its content (see style.css) — there's no fixed height
    // to fill, so the static CSS clamps are all that's needed.
    if (window.innerWidth <= 640) { reset(); return; }

    var boxCs = getComputedStyle(box);
    var innerHeight = box.clientHeight - parseFloat(boxCs.paddingTop) - parseFloat(boxCs.paddingBottom);
    var ctaSpace = cta
      ? cta.getBoundingClientRect().height + parseFloat(getComputedStyle(cta).marginTop)
      : 0;
    var gap = parseFloat(getComputedStyle(second).marginTop) || 0;
    var lineHeight = parseFloat(getComputedStyle(first).lineHeight);
    if (!lineHeight) return;
    var budget = innerHeight - ctaSpace;

    setClamp(first, 'none');
    var natural1 = first.scrollHeight;

    if (natural1 <= budget) {
      // First paragraph reads through in full — no ellipsis on it.
      var remaining = budget - natural1 - gap;
      var lines2 = Math.floor(remaining / lineHeight);
      if (lines2 <= 0) {
        second.style.display = 'none';
      } else {
        second.style.display = '';
        setClamp(second, String(lines2));
      }
    } else {
      // First paragraph alone is longer than the box — it fills the whole
      // thing and gets the ellipsis instead; no room left for a second.
      var lines1 = Math.max(1, Math.floor(budget / lineHeight));
      setClamp(first, String(lines1));
      second.style.display = 'none';
    }
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
