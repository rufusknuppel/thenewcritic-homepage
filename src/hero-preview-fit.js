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
  var imageCell = document.querySelector('.card--feature .feature-image-cell');
  var block = box.querySelector('.card-preview-block');
  if (!block) return;
  var paras = block.querySelectorAll('.card-preview');
  if (paras.length < 2) return;
  var first = paras[0], second = paras[1];
  var cta = box.querySelector('.card-preview-cta');
  var tagline = box.querySelector('.preview-tagline');

  function setClamp(el, value) {
    el.style.setProperty('-webkit-line-clamp', value);
    el.style.setProperty('line-clamp', value);
  }

  function reset() {
    setClamp(first, '');
    setClamp(second, '');
    first.style.display = '';
    second.style.display = '';
  }

  function fit() {
    // Below the 640px breakpoint the box just stacks under the image and
    // grows to fit its content (see style.css) — there's no fixed height
    // to fill, so the static CSS clamps are all that's needed.
    if (window.innerWidth <= 640) { reset(); return; }

    // Budget off the image cell's own rendered height, not the box's —
    // the box stretches (align-self: stretch) to match the grid row, but
    // the row's height is itself influenced by the box's *current*
    // content (e.g. still at the static-CSS fallback clamp on first run).
    // Measuring the box would be circular and could inflate the row past
    // the image by a couple of px. The image cell's height is unaffected
    // by the box's content, so it's the real source of truth.
    var boxCs = getComputedStyle(box);
    var borderY = (parseFloat(boxCs.borderTopWidth) || 0) + (parseFloat(boxCs.borderBottomWidth) || 0);
    var targetHeight = imageCell ? imageCell.getBoundingClientRect().height : box.clientHeight;
    var innerHeight = targetHeight - parseFloat(boxCs.paddingTop) - parseFloat(boxCs.paddingBottom) - borderY;
    // The CTA's margin-top is CSS `auto` (see style.css) so it always
    // lands flush at the box's bottom padding, absorbing this fit's
    // rounding slack as extra breathing room instead of leaving it as
    // dead space below the button. getComputedStyle would resolve that
    // auto margin to its *current* (stale, pre-fit) used value here —
    // circular, same trap as measuring the box's own height — so budget
    // off a fixed minimum gap instead.
    var CTA_MIN_GAP = 18;
    var ctaSpace = cta ? cta.getBoundingClientRect().height + CTA_MIN_GAP : 0;
    // The "from the essay" tagline sits above the paragraphs inside the
    // same box — its rendered height (border/padding included) plus its
    // margin comes off the paragraphs' budget.
    var taglineSpace = 0;
    if (tagline) {
      var tagCs = getComputedStyle(tagline);
      taglineSpace = tagline.getBoundingClientRect().height
        + (parseFloat(tagCs.marginTop) || 0)
        + (parseFloat(tagCs.marginBottom) || 0);
    }
    var gap = parseFloat(getComputedStyle(second).marginTop) || 0;
    var lineHeight = parseFloat(getComputedStyle(first).lineHeight);
    if (!lineHeight) return;
    var budget = innerHeight - ctaSpace - taglineSpace;

    setClamp(first, 'none');
    var natural1 = first.scrollHeight;

    if (natural1 <= budget) {
      // First paragraph reads through in full — no ellipsis on it.
      first.style.display = ''; // back to block if a resize clamped it before
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
      // The clamp needs display:-webkit-box, which the CSS deliberately
      // leaves off the first paragraph so its drop cap can float (see
      // .card-preview:first-child in style.css) — restore it inline here.
      var lines1 = Math.max(1, Math.floor(budget / lineHeight));
      first.style.display = '-webkit-box';
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
