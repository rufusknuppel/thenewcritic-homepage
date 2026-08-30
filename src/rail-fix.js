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
  // PER-MEGA GROUPS: every hero on the page (the lead and the
  // mirrored second) runs its own clone machinery — its own document
  // seat, its own curtain, its own held/pinned/gone state, toggled
  // as classes on its half (originals) and its clones. The rev hero
  // marks its clones so the mirrored hover rules find them.
  var megaGroups = [].slice.call(document.querySelectorAll('.card--mega')).map(function(card){
    var half = card.querySelector('.duo-half--mega');
    if (!half) return null;
    return {
      half: half,
      rev: card.classList.contains('card--mega-rev'),
      rows: [].slice.call(half.querySelectorAll(
        '.duo-panel .ground-kicker, .duo-panel .panel-col--right .ground-credit')),
      clones: [],
      docTop: 0,
      goneAt: Infinity
    };
  }).filter(Boolean);
  // PER-ROW LATEST HEADS (native sticky): past a row's own pin its
  // CONTRA LIFT stands down (.row-held gates it in CSS) — a lifted
  // PINNED head would translate off the viewport, and its mask-above
  // must keep masking the held zone.
  var latestRows = [].slice.call(document.querySelectorAll('.card--latest')).map(function(row){
    return {
      row: row,
      // The CONTRA's own head, named explicitly: this gate exists for
      // the contra lift, and a bare `.latest-col .latest-courier`
      // picked whichever cell led the DOM — the postscript's in a
      // base row, the contra's in a mirrored one.
      head: row.querySelector('.latest-cell--contra .latest-col .latest-courier:not(.latest-courier--under)'),
      docTop: Infinity
    };
  });
  // EVERY STICKY HEAD GATES ITS OWN MASK. One row-wide flag couldn't:
  // the heads in a row pin at different scrolls (a contra's text head
  // sits below its cover), so a single flag either armed the masks
  // early — painting them over the artwork above — or late, which let
  // the COVERS ride under a pinned head unmasked. Each head now
  // carries its own.
  var latestHeads = [].slice.call(document.querySelectorAll(
    '.card--latest .latest-courier:not(.latest-courier--under)')).map(function(el){
    return { el: el, docTop: Infinity };
  });
  // The MEGA COVER HEADS hold their own masks' gate (.head-held):
  // like the rows', the mask may only exist once the head pins.
  var megaHeads = [].slice.call(document.querySelectorAll('.mega-cover-head')).map(function(h){
    return { el: h, row: h.querySelector('.latest-courier--cover'), docTop: Infinity };
  });
  var fixAt = 0;
  var releaseAt = Infinity;
  var releasedNow = false;
  // The couriers sit BELOW the rail's line (the head rule pushed the
  // hero down), so they get their own thresholds: swapped to clones
  // the instant they'd slip under the mask band (its bottom rides at
  // 67.13), riding 1:1 at the originals' own document seat, pinned
  // at the held line.
  function buildClones(g){
    for (var i = 0; i < g.clones.length; i++) g.clones[i].remove();
    g.clones = g.rows.map(function(r){
      var rect = r.getBoundingClientRect();
      var c = r.cloneNode(true);
      c.classList.add('courier-clone');
      if (g.rev) c.classList.add('clone-rev');
      // Anchor by the SLIDING side: the held-hover slide animates the
      // lead hero's clones on `right`, the rev hero's on `left` — the
      // rest anchor must be the same property, or the transition
      // starts from auto and snaps instead of sliding.
      if (g.rev) {
        c.style.left = (rect.left) + 'px';
      } else {
        c.style.left = 'auto';
        c.style.right = (window.innerWidth - rect.right) + 'px';
      }
      c.style.width = rect.width + 'px';
      c.style.margin = '0';
      // The held-hover stripe extension: how far the rule must reach
      // past this clone's box edge to close on ITS OWN cover's line.
      // Read from THIS hero's half rather than the page edges — the
      // old constants (299.6 from the right, 48 from the left) were
      // the lead hero's seat, and every hero in the second movement
      // stands 251.6 further in, so the rule closed short or long.
      // The half's box, not the picture's: on hover the cover leaves
      // its box entirely, and the cover's rest edges are its half's
      // own, 24 inside (the insets the mega covers are seated by).
      var hr = g.half.getBoundingClientRect();
      c.style.setProperty('--stripe-extend', g.rev
        ? ((hr.left + 24) - rect.left).toFixed(2) + 'px'
        : (rect.right - (hr.right - 24)).toFixed(2) + 'px');
      // THE BRIDGE, at rest: held, the hero's divider is THIS clone's
      // own foot rule, and it used to stop at the clone's box like the
      // static rule once did — so the line broke again the moment the
      // head pinned. Reach it across to the cover's head rule (which
      // pins on the same line, 66.13) so the connection survives the
      // swap. Measured off that rule itself; its horizontal seat
      // doesn't move with the scroll.
      var headRule = g.half.querySelector('.mega-cover-head .latest-rule');
      if (headRule) {
        var hrr = headRule.getBoundingClientRect();
        // Each side is an OFFSET INWARD from its own box edge, so the
        // two are not mirror images of one another: `right: b` puts
        // the end at clone.right - b, while `left: b` puts it at
        // clone.left + b. The rev arm needs the opposite sign, and
        // with it flipped its rule sat 24 INSIDE the box instead of
        // reaching 24 past it — a 48 miss, which is what broke the
        // mirrored heroes' held line.
        c.style.setProperty('--stripe-bridge', g.rev
          ? (hrr.right - rect.left).toFixed(2) + 'px'
          : (rect.right - hrr.left).toFixed(2) + 'px');
      }
      document.body.appendChild(c);
      return c;
    });
  }
  function apply(){
    var y = window.scrollY;
    document.body.classList.toggle('rail-fixed', y >= fixAt);
    megaGroups.forEach(function(g){
      var held = y >= g.docTop - 67.13;
      var pinned = y >= g.docTop - 35.93;
      var gone = y >= g.goneAt;
      g.half.classList.toggle('mega-held', held);
      // The band's rule takes the span of whichever hero is holding.
      if (pinned && !gone && g.ruleW) {
        document.documentElement.style.setProperty('--held-l', g.ruleL.toFixed(2) + 'px');
        document.documentElement.style.setProperty('--held-w', g.ruleW.toFixed(2) + 'px');
      }
      for (var i = 0; i < g.clones.length; i++) {
        var cl = g.clones[i].classList;
        cl.toggle('is-held', held);
        cl.toggle('is-pinned', pinned);
        cl.toggle('is-gone', gone);
      }
    });
    latestRows.forEach(function(l){
      if (l.head) l.row.classList.toggle('row-held', y >= l.docTop - 35.93);
    });
    latestHeads.forEach(function(h){
      h.el.classList.toggle('head-held', y >= h.docTop - 35.93);
    });
    megaHeads.forEach(function(m){
      if (m.row) m.el.classList.toggle('head-held', y >= m.docTop - 35.93);
    });
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
    latestRows.forEach(function(l){
      if (!l.head) return;
      // The rail's own trick: sticky may be HOLDING right now, so the
      // rect lies — measure the flow seat with the stick released.
      var lprev = l.head.style.position;
      l.head.style.position = 'static';
      l.docTop = l.head.getBoundingClientRect().top + window.scrollY;
      l.head.style.position = lprev;
    });
    latestHeads.forEach(function(h){
      var hp = h.el.style.position;
      h.el.style.position = 'static';
      h.docTop = h.el.getBoundingClientRect().top + window.scrollY;
      h.el.style.position = hp;
      // THE PIN SCROLL, published for the mask itself. The mask-above
      // used to exist only while .head-held was set, and that class
      // rides the main thread while the compositor scrolls ahead of
      // it — so on a real scroll there was a window where the head
      // was already pinned and its mask was not yet there, and the
      // billing row travelling up past the head printed straight
      // over it. The mask opens its overhang off a scroll timeline
      // now (see THE MASKS, style.css) and cannot arrive late.
      h.el.style.setProperty('--head-at', (h.docTop - 35.93).toFixed(2) + 'px');
    });
    megaHeads.forEach(function(m){
      if (!m.row) return;
      var mp = m.row.style.position;
      m.row.style.position = 'static';
      m.docTop = m.row.getBoundingClientRect().top + window.scrollY;
      m.row.style.position = mp;
      // THE HERO'S HEAD NEEDS ITS PIN SCROLL TOO. The mask's overhang
      // opens off a scroll timeline now (see THE MASKS, style.css) and
      // reads --head-at for the scroll to open at; only the cells' own
      // heads were publishing it, so every hero fell back to the 200vh
      // default and its mask never opened at all — the date and
      // section row simply walked over the held head instead of under
      // it. Custom properties inherit, so setting it on the head span
      // reaches the courier's pseudo inside it.
      m.el.style.setProperty('--head-at', (m.docTop - 35.93).toFixed(2) + 'px');
    });
    megaGroups.forEach(function(g){
      if (!g.rows.length) return;
      // Gone only when this hero's FOOT crosses the held divider line.
      g.goneAt = g.half.getBoundingClientRect().bottom + window.scrollY - 67.13;
      g.docTop = g.rows[0].getBoundingClientRect().top + window.scrollY;
      // THE HELD DIVIDER'S OWN MEASURE. The band draws the hero's rule
      // onward as the hero passes under it, and it used to do that from
      // a constant (40vw - 230.24) tuned for the old geometry — before
      // the sidebar margins doubled and the wrap's cap became the
      // viewport. It has been ending ~1100 short of the rule it is
      // continuing ever since, which leaves the held author's ink
      // hanging well past the end of its own line. Measured per hero
      // (horizontal only, so the stick cannot lie about it) and
      // published at the pin.
      var mr = g.half.querySelector('.latest-rule');
      if (mr) {
        var mb = mr.getBoundingClientRect();
        if (mb.width) { g.ruleL = mb.left; g.ruleW = mb.width; }
      }
      buildClones(g);
      // Per-clone anchors: the ride seat (the originals' own document
      // top) and THE CURTAIN — past goneAt the clones sit at a
      // document anchor with box top 31.2 above the hero's foot, so
      // their rule's 1px foot rides exactly ON it, continuous with
      // the pin at the flip and reversible on the way back.
      for (var i = 0; i < g.clones.length; i++) {
        g.clones[i].style.setProperty('--clone-doc-top', g.docTop.toFixed(2) + 'px');
        g.clones[i].style.setProperty('--clone-push-top', (g.goneAt + 35.93).toFixed(2) + 'px');
      }
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
