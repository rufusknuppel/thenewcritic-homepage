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
    el.style.maxHeight = '';
    el.style.webkitBoxOrient = '';
    el.style.webkitLineClamp = '';
    el.style.lineClamp = '';
    el.classList.remove('card-preview--clamped');
    el.classList.remove('card-preview--capped');
  }

  // Clamps el to however many of its lines end above `limit`. Returns true
  // if at least one line fit (el stays visible), false if none did (el is
  // hidden). Only called when el's natural bottom crosses the limit.
  function clampToFit(el, limit) {
    var r = el.getBoundingClientRect();
    var lh = parseFloat(getComputedStyle(el).lineHeight) || 22;
    var lines = Math.floor((limit - r.top) / lh);
    if (lines < 1) { el.style.display = 'none'; return false; }
    // lines >= 2 because the floated cap is itself two lines tall — a
    // one-line cut would slice through the cap glyph; the -webkit-box
    // path below flattens the cap to a plain letter instead, which a
    // single line can hold.
    if (lines >= 2 && el.querySelector('.card-preview-dropcap')) {
      // -webkit-line-clamp needs display:-webkit-box, and floats don't
      // wrap inside that display — clamping the opening paragraph that
      // way would cost it its drop cap. Cut by max-height instead: the
      // paragraph stays a normal block (the float keeps working) and the
      // cut still lands on a line boundary; the ellipsis the line-clamp
      // display would have drawn comes from a corner-pinned ::after
      // instead (see .card-preview--capped in style.css).
      el.style.maxHeight = (lines * lh) + 'px';
      el.style.overflow = 'hidden';
      el.classList.add('card-preview--capped');
      return true;
    }
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

  // The panel's chrome (kicker, date/likes, Read on, section link) lives
  // in the fixed header/footer bands now — only the middle column (title,
  // dek, byline, tagline, preview) needs fitting, against the bottom
  // band's top edge. When space runs short, content yields in reverse
  // keep-priority: title (clamps, never vanishes) > byline > dek >
  // everything else (dividers, tagline, preview paragraphs).
  function fit(panel) {
    var topBox = panel.querySelector('.duo-panel-top');
    var band = panel.querySelector('.panel-band--bottom');
    if (!topBox || !band) return;
    var title = topBox.querySelector('.card-title');
    var meta = topBox.querySelector('.card-meta--byline');
    var paras = topBox.querySelectorAll('.card-preview');

    // Reset any previous fit so a refit measures the natural layout.
    [].forEach.call(topBox.children, function(el){ el.style.display = ''; resetClamp(el); });
    [].forEach.call(paras, function(p){ p.style.display = ''; resetClamp(p); });

    // In the static fallback layout (touch devices / narrow viewports) the
    // panel flows under the image and the bands sit in flow too — nothing
    // to fit against, and the CSS fallback clamps handle length.
    if (getComputedStyle(panel).position !== 'absolute') return;

    // Lift the CSS fallback clamps so each paragraph's full text is
    // measurable (and kept, when the box turns out to have the room).
    [].forEach.call(paras, function(p){
      p.style.webkitLineClamp = '999';
      p.style.lineClamp = '999';
    });

    var limit = band.getBoundingClientRect().top - 14;

    // The title outranks everything: if it crosses the floor it clamps to
    // the lines that fit rather than vanishing.
    if (title && title.getBoundingClientRect().bottom > limit) {
      clampToFit(title, limit);
    }

    // The byline (author only) sits right below the dek — the bottom-up
    // cut would reach it first, but the byline outranks the dek: the DEK
    // alone fits against a limit with the byline's height reserved out of
    // it (so it clamps a line early and the byline rides in the space
    // that saves).
    var metaSpace = 0;
    if (meta && getComputedStyle(meta).display !== 'none') {
      metaSpace = meta.getBoundingClientRect().height
        + (parseFloat(getComputedStyle(meta).marginTop) || 0);
    }
    var cutting = false;
    [].forEach.call(topBox.children, function(el){
      if (getComputedStyle(el).display === 'none') return;
      // The title was already fitted above — a clamped title's
      // padding-bottom can leave its border box a hair past the limit,
      // and the generic branch below would hide it for that.
      if (el === title) return;
      if (cutting) {
        if (el === meta) {
          // The byline survives the cut — its space was reserved. Only if
          // it still crosses the real limit (a panel too small for even
          // the title + byline) does it hide like everything else.
          if (el.getBoundingClientRect().bottom > limit) el.style.display = 'none';
          return;
        }
        el.style.display = 'none';
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
        // The dek is running text — give it however many lines fit
        // rather than dropping the whole thing. Hard blocks just hide.
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
