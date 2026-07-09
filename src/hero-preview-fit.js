(function(){
  // Sequential fill: show the first paragraph in full (no ellipsis) if it
  // fits in the box; only if it's too long to fit does IT get clamped (with
  // an ellipsis) to use up the whole box, with every paragraph after it
  // hidden. Otherwise each following paragraph gets whatever's left over
  // after the ones before it, in order, clamped to that with its own
  // ellipsis if it runs long — and once one paragraph doesn't fully fit,
  // every paragraph after it is hidden rather than clamped to 0 lines.
  // Static CSS clamps on .card-preview (see style.css) are just the no-JS
  // fallback — this is the real fit, since no CSS mechanism lets one
  // clamped box hand its leftover space to a sibling; it has to be measured.
  var box = document.querySelector('.card--feature .card-text--right');
  if (!box) return;
  var imageCell = document.querySelector('.card--feature .feature-image-cell');
  var block = box.querySelector('.card-preview-block');
  if (!block) return;
  var paras = Array.prototype.slice.call(block.querySelectorAll('.card-preview'));
  if (!paras.length) return;
  var first = paras[0];
  var cta = box.querySelector('.card-preview-cta');
  var tagline = box.querySelector('.preview-tagline');

  function setClamp(el, value) {
    el.style.setProperty('-webkit-line-clamp', value);
    el.style.setProperty('line-clamp', value);
  }

  function reset() {
    paras.forEach(function(p){
      setClamp(p, '');
      p.style.display = '';
    });
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
    // Every paragraph after the first shares the same margin-top (see the
    // .card-preview + .card-preview rule in style.css), so one measurement
    // covers the gap ahead of any of them.
    var gap = paras.length > 1 ? (parseFloat(getComputedStyle(paras[1]).marginTop) || 0) : 0;
    var lineHeight = parseFloat(getComputedStyle(first).lineHeight);
    if (!lineHeight) return;
    var budget = innerHeight - ctaSpace - taglineSpace;

    setClamp(first, 'none');
    var natural1 = first.scrollHeight;

    var remaining; // -1 means "no room left, hide everything after this point"
    if (natural1 <= budget) {
      // First paragraph reads through in full — no ellipsis on it.
      first.style.display = ''; // back to block if a resize clamped it before
      remaining = budget - natural1;
    } else {
      // First paragraph alone is longer than the box — it fills the whole
      // thing and gets the ellipsis instead; no room left for the rest.
      // The clamp needs display:-webkit-box, which the CSS deliberately
      // leaves off the first paragraph so its drop cap can float (see
      // .card-preview:first-child in style.css) — restore it inline here.
      var lines1 = Math.max(1, Math.floor(budget / lineHeight));
      first.style.display = '-webkit-box';
      setClamp(first, String(lines1));
      remaining = -1;
    }

    for (var i = 1; i < paras.length; i++) {
      var p = paras[i];
      if (remaining === -1) {
        p.style.display = 'none';
        continue;
      }
      var avail = remaining - gap;
      var lines = Math.floor(avail / lineHeight);
      if (lines <= 0) {
        p.style.display = 'none';
        remaining = -1;
        continue;
      }
      setClamp(p, 'none');
      var naturalP = p.scrollHeight;
      if (naturalP <= avail) {
        // This paragraph reads through in full; whatever's left carries
        // over to the next one.
        p.style.display = '';
        setClamp(p, '');
        remaining = avail - naturalP;
      } else {
        // Cut off here — this paragraph takes the rest of the budget and
        // gets its own ellipsis; nothing after it can fit.
        p.style.display = '';
        setClamp(p, String(lines));
        remaining = -1;
      }
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
