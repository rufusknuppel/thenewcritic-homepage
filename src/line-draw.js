// Page-ruling line draw (see .line-draw in style.css): the page's gray
// rules — the full-bleed row dividers and the vertical dividers between
// cells — draw themselves in as they enter the viewport, the archive
// ledger's ruling brought to the homepage and the essays/postscript/
// contra pages (horizontals sweep left-to-right, verticals drop
// downward). The one on-load animation these pages carry. Conventions:
// classes land pre-paint (parser-blocking at the end of body) so no-JS
// keeps static lines, reduced-motion loads never enter the effect, a
// poller drives reveals (timers run even in suspended/hidden rendering
// pipelines where IntersectionObserver and scroll events go quiet, so
// the draw can never wedge into a blank page) with a batch stagger via
// --line-delay sorted by position so the ruling always reads downward,
// and it retires itself when every line has drawn.
(function(){
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  var lines = [].slice.call(
    document.querySelectorAll(
      '.row-divider, .duo-half-divider, .duo-divider--h, ' +
      // The About page's ruling: the vertical rules between its card
      // columns, the horizontal rules between stacked cards, every card's
      // band rules, and the quote rules inside the cards.
      '.mission-vr, .mission-hr, .mission-band-rule, .mission-page .duo-quote-divider'
    )
  );
  if (!lines.length) return;
  lines.forEach(function(l){ l.classList.add('line-draw'); });
  var pendingLines = lines.slice();
  var lineTimer = null;
  function drawLines() {
    if (!pendingLines.length) {
      if (lineTimer != null) {
        clearInterval(lineTimer);
        lineTimer = null;
      }
      return;
    }
    var hits = pendingLines.filter(function(l){
      // getBoundingClientRect follows the pending scale transform — a
      // scaleY(0) vertical divider collapses to a point at its own top
      // edge, and the first divider on a section page tops out at exactly
      // y:0 (its negative margin runs it to the page edge), where a
      // transformed bottom of 0 would never pass. offsetHeight is layout
      // height, transform-free.
      var r = l.getBoundingClientRect();
      return r.top + l.offsetHeight > 0 && r.top < window.innerHeight;
    });
    hits.sort(function(a, b){
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });
    hits.forEach(function(l, i){
      l.style.setProperty('--line-delay', (i * 70) + 'ms');
      l.classList.add('in-view');
      pendingLines.splice(pendingLines.indexOf(l), 1);
    });
  }
  lineTimer = setInterval(drawLines, 400);
  // The first pass waits for the UNDRAWN state to paint: this script runs
  // pre-paint (parser-blocking at the end of body), so tagging .line-draw
  // and flipping .in-view in the same tick would compute both classes in
  // one style pass — no transition, and the load-time lines snap in fully
  // drawn instead of sweeping. Two rAFs land the flip after the first
  // painted frame; the poller above is the backstop where rAF is throttled
  // (hidden tabs — whose visibilitychange replay below also covers them).
  requestAnimationFrame(function(){ requestAnimationFrame(drawLines); });

  // Return visits redraw the ruling (same rules as the archive ledger):
  // replay on a back/forward restore — the restored DOM arrives with the
  // lines long drawn — and defer any pass that would play in a hidden
  // tab until the reader can actually see it. The rest state carries no
  // transition, so stripping in-view snaps lines back to undrawn
  // instantly, ready to sweep in again; onVisible dedupes itself.
  function replayLines() {
    lines.forEach(function(l){ l.classList.remove('in-view'); });
    pendingLines = lines.slice();
    if (lineTimer == null) lineTimer = setInterval(drawLines, 400);
    // Same deferral as the initial pass: the stripped (undrawn) state must
    // paint before in-view returns, or the remove/re-add collapses into
    // one style pass and the replay never animates.
    requestAnimationFrame(function(){ requestAnimationFrame(drawLines); });
  }
  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    replayLines();
  }
  window.addEventListener('pageshow', function(e){
    if (!e.persisted) return;
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', onVisible);
    } else {
      replayLines();
    }
  });
  if (document.visibilityState === 'hidden') {
    document.addEventListener('visibilitychange', onVisible);
  }
})();
