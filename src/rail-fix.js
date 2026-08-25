(function(){
  // THE HELD HEAD: the mini-rail is CSS-sticky (stiff, compositor-
  // locked). Everything else that rides — the hero's courier CLONES,
  // the foot mark's arrival, the whole sidebar's release — is
  // position:absolute at DOCUMENT ANCHORS computed here, flipping to
  // viewport-fixed only while truly pinned. The anchors are chosen
  // so every flip is geometrically continuous, and the compositor
  // does all the riding: this script only measures on load/resize
  // and toggles body classes at scroll thresholds — no per-frame
  // geometry, no scroll-handler lag, no bounce.
  var rail = document.querySelector('.topbar-rail');
  if (!rail) return;
  // The release measures against whatever arrives FIRST above the
  // reprint — the foot band when present (its gold top is the line
  // the mark's 48 air must respect), else the reprint itself.
  var reprint = document.querySelector('.dek-band--foot') || document.querySelector('.reprint');
  var mega = document.querySelector('.duo-half--mega');
  var rows = [].slice.call(document.querySelectorAll(
    '.duo-half--mega .duo-panel .ground-kicker, .duo-half--mega .duo-panel .panel-col--right .ground-credit'));
  var clones = [];
  var fixAt = 0;
  var goneAt = Infinity;
  // The couriers sit BELOW the rail's line (the head rule pushed the
  // hero down), so they get their own thresholds: swapped to clones
  // the instant they'd slip under the mask band (its bottom rides at
  // 67.13), riding 1:1 at the originals' own document seat, pinned
  // at the held line.
  var courierDocTop = 0;
  var releaseAt = Infinity;
  function buildClones(){
    for (var i = 0; i < clones.length; i++) clones[i].remove();
    clones = rows.map(function(r){
      var rect = r.getBoundingClientRect();
      var c = r.cloneNode(true);
      c.classList.add('courier-clone');
      c.style.left = (rect.left) + 'px';
      c.style.width = rect.width + 'px';
      c.style.margin = '0';
      // The held-hover stripe extension: how far past this clone's
      // right edge the rule must reach to close on the cover's right
      // line (100vw - 299.6), as a right-offset for the ::after.
      c.style.setProperty('--stripe-extend',
        (rect.right - (window.innerWidth - 299.6)).toFixed(2) + 'px');
      document.body.appendChild(c);
      return c;
    });
  }
  function apply(){
    var y = window.scrollY;
    document.body.classList.toggle('rail-fixed', y >= fixAt);
    document.body.classList.toggle('hero-gone', y >= goneAt);
    if (clones.length) {
      document.body.classList.toggle('courier-held', y >= courierDocTop - 67.13);
      document.body.classList.toggle('courier-pinned', y >= courierDocTop - 35.93);
    }
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
    if (reprint) {
      var reprintDocTop = reprint.getBoundingClientRect().top + window.scrollY;
      // Release when the rule reaches the viewport foot — the mark's
      // 48 foot air is PRESERVED: its foot rides 48 above the
      // arriving rule the whole way, never touching it.
      releaseAt = reprintDocTop - H;
      // The RELEASE anchors: each rider's absolute seat continuous
      // with its pinned position at the contact scroll — the rail
      // (the foot mark rides inside it) 41.93 above its own handoff
      // line, the strip's foot on the rule.
      bs.setProperty('--rail-release-top', (reprintDocTop - H + 41.93).toFixed(2) + 'px');
      bs.setProperty('--strip-release-top', (reprintDocTop - H).toFixed(2) + 'px');
    }
    if (mega && rows.length) {
      // Gone only when the hero's FOOT crosses the held divider line.
      goneAt = mega.getBoundingClientRect().bottom + window.scrollY - 67.13;
      courierDocTop = rows[0].getBoundingClientRect().top + window.scrollY;
      bs.setProperty('--clone-doc-top', courierDocTop.toFixed(2) + 'px');
      // THE CURTAIN anchor: past goneAt the clones sit here instead —
      // box top 31.2 above the hero's document foot, so their rule's
      // 1px foot rides exactly ON the hero's foot, continuous with
      // the pin at the flip and reversible on the way back.
      bs.setProperty('--clone-push-top', (goneAt + 35.93).toFixed(2) + 'px');
      buildClones();
    }
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
