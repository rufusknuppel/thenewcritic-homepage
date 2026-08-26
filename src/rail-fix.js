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
  // And the sidebar REPRINTS on the left for the second movement:
  // a document-anchored copy seated below the band (see measure).
  var railLeft = document.querySelector('.topbar-rail--left');
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
      head: row.querySelector('.latest-col .latest-courier:not(.latest-courier--under)'),
      docTop: Infinity
    };
  });
  // The MEGA COVER HEADS hold their own masks' gate (.head-held):
  // like the rows', the mask may only exist once the head pins.
  var megaHeads = [].slice.call(document.querySelectorAll('.mega-cover-head')).map(function(h){
    return { el: h, row: h.querySelector('.latest-courier--cover'), docTop: Infinity };
  });
  var fixAt = 0;
  var releaseAt = Infinity;
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
      // past this clone's box edge to close on ITS cover's line — the
      // lead hero's cover ends 299.6 from the right (a right-offset
      // for the ::after), the rev hero's opens 48 from the left (a
      // left-offset).
      c.style.setProperty('--stripe-extend', g.rev
        ? (48 - rect.left).toFixed(2) + 'px'
        : (rect.right - (window.innerWidth - 299.6)).toFixed(2) + 'px');
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
    megaHeads.forEach(function(m){
      if (m.row) m.el.classList.toggle('head-held', y >= m.docTop - 35.93);
    });
    // THE RELEASE: past the contact scroll — the reprint's rule
    // reaching the mark's 48 foot seat — the sidebar column (rail,
    // mark, right strip) goes document-absolute and rides away.
    document.body.classList.toggle('rail-released', y >= releaseAt);
  }
  function measure(){
    var prev = rail.style.position;
    rail.style.position = 'static';
    fixAt = rail.getBoundingClientRect().top + window.scrollY - 41.93;
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
      // (the foot mark rides inside it) 41.93 above its own handoff
      // line, the strip's foot on the line.
      bs.setProperty('--rail-release-top', (releaseDocTop - H + 41.93).toFixed(2) + 'px');
      bs.setProperty('--strip-release-top', (releaseDocTop - H).toFixed(2) + 'px');
    }
    // THE LEFT RAIL'S SEAT: top 48 under the subscribe band's
    // charcoal (the rev latest row's own opening line), the box
    // running to the mark's top — the mark (382.61 tall) hangs off
    // the box foot, its own foot 48 above the reprint's rule, the
    // right rail's release contact restated as a resting seat.
    if (railLeft && reprint) {
      var subBand = document.querySelector('.subscribe-band');
      if (subBand) {
        var lTop = subBand.getBoundingClientRect().bottom + window.scrollY + 48;
        var repTop = reprint.getBoundingClientRect().top + window.scrollY;
        railLeft.style.top = lTop.toFixed(2) + 'px';
        railLeft.style.height = Math.max(0, repTop - 48 - 382.61 - lTop).toFixed(2) + 'px';
      }
    }
    latestRows.forEach(function(l){
      if (!l.head) return;
      // The rail's own trick: sticky may be HOLDING right now, so the
      // rect lies — measure the flow seat with the stick released.
      var lprev = l.head.style.position;
      l.head.style.position = 'static';
      l.docTop = l.head.getBoundingClientRect().top + window.scrollY;
      l.head.style.position = lprev;
    });
    megaHeads.forEach(function(m){
      if (!m.row) return;
      var mp = m.row.style.position;
      m.row.style.position = 'static';
      m.docTop = m.row.getBoundingClientRect().top + window.scrollY;
      m.row.style.position = mp;
    });
    megaGroups.forEach(function(g){
      if (!g.rows.length) return;
      // Gone only when this hero's FOOT crosses the held divider line.
      g.goneAt = g.half.getBoundingClientRect().bottom + window.scrollY - 67.13;
      g.docTop = g.rows[0].getBoundingClientRect().top + window.scrollY;
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
  measure();
})();
