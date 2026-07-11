(function(){
  // Each row panel (essay squares, postscript trio, contra quad) shows as
  // much of its post as its own box has room for above the corner buttons:
  // content is cut from the bottom up — hard blocks (divider, tagline)
  // hidden outright once they'd cross into the button zone, running text
  // (the dek and the preview paragraphs) clamped to the exact number of
  // rendered lines that fit, with the ellipsis the line-clamp display
  // draws at that line's end. The static clamp values in style.css are
  // only the no-JS fallback; this neutralizes them (clamp 999) before
  // measuring so a bigger box really does pull more text. Panels are
  // opacity:0 at rest but still laid out, so everything here is
  // measurable without hovering.
  var panels = document.querySelectorAll('.duo-panel');
  if (!panels.length) return;

  function resetClamp(el) {
    el.style.overflow = '';
    el.style.webkitBoxOrient = '';
    el.style.webkitLineClamp = '';
    el.style.lineClamp = '';
    el.classList.remove('card-preview--clamped');
  }

  // Clamps el to however many of its lines end above `limit`. Returns true
  // if at least one line fit (el stays visible), false if none did (el is
  // hidden). Only called when el's natural bottom crosses the limit.
  function clampToFit(el, limit) {
    var r = el.getBoundingClientRect();
    var lh = parseFloat(getComputedStyle(el).lineHeight) || 22;
    var lines = Math.floor((limit - r.top) / lh);
    if (lines < 1) { el.style.display = 'none'; return false; }
    el.style.display = '-webkit-box';
    el.style.webkitBoxOrient = 'vertical';
    el.style.overflow = 'hidden';
    el.style.webkitLineClamp = String(lines);
    el.style.lineClamp = String(lines);
    // Clamping loses the floated drop cap (floats don't wrap inside the
    // -webkit-box display) — this class turns the cap back into a plain
    // first letter instead (see style.css).
    el.classList.add('card-preview--clamped');
    return true;
  }

  function fit(panel) {
    var topBox = panel.querySelector('.duo-panel-top');
    // The section button (.duo-essays-btn) sits at the top corner now —
    // it no longer marks where the bottom content zone ends. The bottom
    // row is whichever of the read-on link and the date/likes stats line
    // is present (stats is always rendered; read-on only when there's a
    // preview excerpt to link to).
    var btn = panel.querySelector('.duo-readon-btn') || panel.querySelector('.card-meta--stats');
    if (!topBox || !btn) return;

    // Reset any previous fit so a refit measures the natural layout.
    [].forEach.call(topBox.children, function(el){ el.style.display = ''; resetClamp(el); });
    var paras = topBox.querySelectorAll('.card-preview');
    [].forEach.call(paras, function(p){ p.style.display = ''; resetClamp(p); });

    // In the static fallback layout (touch devices / narrow viewports) the
    // panel flows under the image and the buttons sit in flow too — nothing
    // to fit against, and the CSS fallback clamps handle length.
    if (getComputedStyle(panel).position !== 'absolute') return;

    // Lift the CSS fallback clamps so each paragraph's full text is
    // measurable (and kept, when the box turns out to have the room).
    [].forEach.call(paras, function(p){
      p.style.webkitLineClamp = '999';
      p.style.lineClamp = '999';
    });

    var limit = btn.getBoundingClientRect().top - 12;
    // The byline (author only — date/likes moved out to .card-meta--stats,
    // pinned bottom-left outside topBox) sits right below the dek — the
    // bottom-up cut would reach it first, but a byline shouldn't be traded
    // away for dek lines. Priority runs title > byline > dek: the DEK
    // alone fits against a limit with the byline's height reserved out of
    // it (so it clamps a line early and the byline rides in the space
    // that saves); the title and kicker keep the full limit — a reserve
    // big enough to evict the title would defeat the whole panel.
    var meta = topBox.querySelector('.card-meta--byline');
    var metaSpace = 0;
    if (meta && getComputedStyle(meta).display !== 'none') {
      metaSpace = meta.getBoundingClientRect().height
        + (parseFloat(getComputedStyle(meta).marginTop) || 0);
    }
    var cutting = false;
    [].forEach.call(topBox.children, function(el){
      if (getComputedStyle(el).display === 'none') return;
      if (cutting) {
        if (el !== meta) { el.style.display = 'none'; return; }
        // The meta survives the cut — its space was reserved. Only if it
        // still crosses the real limit (a panel too small for even the
        // title + meta) does it hide like everything else.
        if (el.getBoundingClientRect().bottom > limit) el.style.display = 'none';
        return;
      }
      var lim = el.classList.contains('card-dek') ? limit - metaSpace : limit;
      if (el.classList.contains('card-preview-block')) {
        var parasCut = false;
        [].forEach.call(el.querySelectorAll('.card-preview'), function(p){
          if (parasCut) { p.style.display = 'none'; return; }
          if (p.getBoundingClientRect().bottom <= lim) return;
          parasCut = true;
          clampToFit(p, lim);
        });
      } else if (el.getBoundingClientRect().bottom > lim) {
        cutting = true;
        // The dek is running text — give it however many lines fit rather
        // than dropping the whole thing. Hard blocks just hide.
        if (!el.classList.contains('card-dek') || !clampToFit(el, lim)) {
          el.style.display = 'none';
        }
      }
    });
  }

  function fitAll() {
    [].forEach.call(panels, fit);
  }

  fitAll();
  // Fonts landing after first paint change every line's height — refit.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  window.addEventListener('load', fitAll);
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 100);
  });
})();
