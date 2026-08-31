(function(){
  // THE HELD HEAD: the mini-rail is CSS-sticky (stiff, compositor-
  // locked). Everything else that rides — each hero's courier CLONES,
  // the foot mark's arrival, the whole sidebar's release — is
  // position:absolute at DOCUMENT ANCHORS computed here, flipping to
  // viewport-fixed only while truly pinned. The anchors are chosen
  // so every flip is geometrically continuous, and the compositor
  // does all the riding: this script only measures on load/resize
  // and toggles classes at scroll thresholds — no per-frame
  // geometry, no scroll-handler lag, no bounce.
  var rail = document.querySelector('.topbar-rail');
  if (!rail) return;
  // The release measures the ARRIVING FOOTER LINE — the reprint's
  // own rule seat (48 under the last row; the colophon band rides
  // BELOW the name now, so the band's top is no longer that line).
  var reprint = document.querySelector('.reprint-rule')
    || document.querySelector('.reprint')
    || document.querySelector('.dek-band--foot');
  // THE SIDEBAR ENDS AT SUBSCRIBE now (homepage): the band's
  // charcoal is the arriving line that carries the rail away — the
  // mark keeps its 48 air above the chrome edge the whole ride.
  // Pages without the band keep the reprint release.
  var releaseRef = document.querySelector('.subscribe-band') || reprint;
  // And the sidebar REPRINTS for each movement below: every track
  // names the block it opens under and the one it must end above
  // (data-after / data-before), so the seats are stated in the
  // markup rather than hard-coded here.
  // The gradient's own anchors: main's box, and the banner that opens
  // each movement after the first.
  var groundMain = document.querySelector('main:has(.card--mega)');
  var groundStops = ['.subscribe-band', '.events-band', '.store-band']
    .map(function(sel){ return document.querySelector(sel); });
  var railTracks = [].slice.call(document.querySelectorAll('.rail-track')).map(function(el){
    return {
      el: el,
      after: document.querySelector(el.getAttribute('data-after')),
      before: document.querySelector(el.getAttribute('data-before'))
    };
  });
  // (THE HELD MACHINERY IS GONE. The hero courier clones, the per-row
  // and per-head hold flags and every anchor they measured are retired
  // with the scroll-pinning: post cards scroll 1:1 now, so there is
  // nothing to clone, flag or anchor. Git holds it all against a
  // change of mind.)
  var fixAt = 0;
  var releaseAt = Infinity;
  var releasedNow = false;
  function apply(){
    var y = window.scrollY;
    document.body.classList.toggle('rail-fixed', y >= fixAt);
    // (The per-card held flags — mega-held, row-held, head-held — and the
    //  band's rule span are retired with the hold. Nothing on a post card
    //  pins any more, so there is no held state to flag.)
    // THE RELEASE: past the contact scroll the sidebar column goes
    // document-absolute and rides away. THE HANDOFF IS MEASURED, not
    // assumed: the anchor measure() precomputes is where the rail
    // OUGHT to be at the flip (scroll + its own sticky 48), and any
    // gap between that and where sticky has ACTUALLY parked it lands
    // as a visible snap the instant the class flips — the rail's
    // containing block is short enough that the sticky constraint
    // really does move it. So on the flip itself, read the rail's
    // true document seat this frame and hand off exactly there. One
    // rect read per crossing, not per frame.
    var wantReleased = y >= releaseAt;
    if (wantReleased && !releasedNow) {
      var seat = rail.getBoundingClientRect().top + y;
      document.body.style.setProperty('--rail-release-top', seat.toFixed(2) + 'px');
    }
    releasedNow = wantReleased;
    document.body.classList.toggle('rail-released', wantReleased);
  }
  function measure(){
    var prev = rail.style.position;
    rail.style.position = 'static';
    fixAt = rail.getBoundingClientRect().top + window.scrollY - 48;
    // Published for the head band, which reveals itself off a scroll
    // timeline rather than off the class below — the class rides the
    // main thread and arrived late on a fast flick, letting covers
    // print over the header (see ALWAYS PAINTED in style.css).
    document.documentElement.style.setProperty('--fix-at', fixAt.toFixed(2) + 'px');
    rail.style.position = prev;
    var H = window.innerHeight;
    var bs = document.body.style;
    if (releaseRef) {
      var releaseDocTop = releaseRef.getBoundingClientRect().top + window.scrollY;
      // Release when the arriving line (the subscribe band's chrome
      // on the homepage, the reprint's rule elsewhere) reaches the
      // viewport foot — the mark's 48 foot air is PRESERVED: its
      // foot rides 48 above the arriving line the whole way.
      releaseAt = releaseDocTop - H;
      // The RELEASE anchors: each rider's absolute seat continuous
      // with its pinned position at the contact scroll — the rail
      // (the mark rides inside it) 48 above its own handoff
      // line, the strip's foot on the line.
      bs.setProperty('--rail-release-top', (releaseDocTop - H + 48).toFixed(2) + 'px');
      bs.setProperty('--strip-release-top', (releaseDocTop - H).toFixed(2) + 'px');
      // The same release, for the SCROLL-DRIVEN ride (see THE RIDE in
      // style.css). The class flip that used to carry this is a main-
      // thread toggle and arrived frames late on a fling, so the rail
      // hung at its 48 and then jumped. The ride runs from the release
      // scroll to the page's end, travelling the same distance, which
      // is what makes it 1:1 with the page.
      var ride = Math.max(0, document.documentElement.scrollHeight - (releaseDocTop - H) - H);
      document.documentElement.style.setProperty('--release-at', (releaseDocTop - H).toFixed(2) + 'px');
      document.documentElement.style.setProperty('--ride', ride.toFixed(2) + 'px');
    }
    // EACH RAIL'S TRACK: the document box its sticky column rides
    // inside — it opens where the mark's INK should sit 48 under the
    // block above (the box runs 16.2 above that cap, so the track
    // starts there), and ends 48 above the block below. The rail holds at the 48 line for the whole of the track
    // and the track's foot pushes it off: hold and release, both the
    // browser's, no thresholds to miss on a fling.
    // THE FOUR GROUNDS' STOPS. main paints the movements as one
    // gradient; the three chrome banners are its hard stops, each
    // measured on its OWN top edge in main's coordinates, so the
    // colour turns under the charcoal where the join can't be seen.
    if (groundMain) {
      var gTop = groundMain.getBoundingClientRect().top + window.scrollY;
      for (var gi = 0; gi < groundStops.length; gi++) {
        var gb = groundStops[gi];
        if (!gb) continue;
        groundMain.style.setProperty('--s' + (gi + 1),
          (gb.getBoundingClientRect().top + window.scrollY - gTop).toFixed(2) + 'px');
      }
    }
    railTracks.forEach(function(t){
      if (!t.after || !t.before) return;
      var top = t.after.getBoundingClientRect().bottom + window.scrollY + 48 - 16.2;
      var foot = t.before.getBoundingClientRect().top + window.scrollY;
      t.el.style.top = top.toFixed(2) + 'px';
      t.el.style.height = Math.max(0, foot - 48 - top).toFixed(2) + 'px';
    });
    apply();
  }
  window.addEventListener('scroll', apply, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  // The fitter announces each pass (fonts/images landing move every
  // document seat) — re-anchor on the final geometry so the held
  // swap is seamless instead of jumping to a stale seat.
  window.addEventListener('newcritic:fit', measure);
  // THE LATE SETTLE: the page's last layout move can land AFTER the
  // fitter's final pass — a lazy cover decoding, a face swapping in —
  // and every anchor measured before it is stale by exactly that
  // shift (the mark's seat was reading 24 off on a cold load, right
  // until anything re-triggered a measure). These three catch the
  // stragglers; rAF-coalesced, so a burst of image loads costs ONE
  // re-anchor, and still nothing per frame.
  var pendingMeasure = false;
  function runPending(){
    if (!pendingMeasure) return;
    pendingMeasure = false;
    measure();
  }
  function measureSoon(){
    if (pendingMeasure) return;
    pendingMeasure = true;
    // BOTH clocks, first one wins (runPending is idempotent): rAF
    // reads on a clean layout frame, but a backgrounded or hidden
    // tab pauses it outright — and an anchor measured before the
    // late settle would then stay stale for as long as the tab sat
    // unwatched. The timer is the floor under that.
    requestAnimationFrame(runPending);
    setTimeout(runPending, 250);
  }
  // Capture phase: 'load' doesn't bubble, so this is how one listener
  // hears EVERY image finishing.
  document.addEventListener('load', measureSoon, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureSoon);
  // And anything else that moves the page's own height.
  if (window.ResizeObserver) new ResizeObserver(measureSoon).observe(document.body);
  measure();
})();
