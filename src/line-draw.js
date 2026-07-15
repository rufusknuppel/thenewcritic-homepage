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
    document.querySelectorAll('.row-divider, .duo-half-divider, .duo-divider--h')
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
      var r = l.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
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
  drawLines();

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
    drawLines();
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
