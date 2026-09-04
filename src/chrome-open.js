(function () {
  // EVERY CHROME BLOCK PLAYS THE HEADER'S OPENING, AT ITS OWN ARRIVAL.
  //
  // The masthead, the three banners (SUBSCRIBE, EVENTS, STORE) and the
  // reprint at the foot all stand a WHOLE VIEWPORT tall when the site
  // opens, each with its name and dek centred in its field. The
  // masthead plays first, at the top of the page; each banner then
  // waits, full height, and plays the SAME fold the moment it fills
  // the screen — its top reaching the viewport's, which is exactly the
  // frame the masthead opened on. One block folds at a time, in
  // document order.
  //
  // Within its fold a block is a LIVE, REVERSIBLE animation — scroll
  // down and it plays, scroll up and it plays backwards, all the way
  // back to fully open — until its name lands on its resting seat. At
  // that landing it LOCKS: the page swaps that block to its settled
  // geometry (invisibly — the landing is the one frame where open and
  // settled paint the same pixels, and the swap's height comes off the
  // scroll in the same frame) and that block never opens again. When
  // the last block locks, the whole mechanism takes itself off the
  // page: styles cleared, listeners removed.
  //
  // THE LOCK IS WHY THIS IS A SCROLL LISTENER and not a scroll
  // timeline: a timeline is a pure function of the scroll offset
  // forever — there is no latch in it, no way to say "finished".
  var root = document.documentElement;


  // Each entry: the elements that open the group and close it, and the
  // seats they carry at rest. A BAND is one element and centres its own
  // content between its paddings; a GROUP is a run of siblings (the
  // masthead is a wordmark, a rule and a dek band; the foot is a
  // reprint and its colophon) and is centred whole, by air added above
  // the first and below the last.
  // THE FOOT PLAYS THE HEADER BACKWARDS. Everything above folds: it
  // stands a viewport tall and closes as the reader arrives. The
  // reprint does the opposite — it stands at its resting size all the
  // way down the page and OPENS as the reader reaches it, black
  // growing from both ends while the name drifts down into the middle
  // of the field, until the last pixel of scroll leaves it filling
  // the screen exactly. It has no lock and needs none: the document
  // ends on it, so there is no scroll beyond it to lock for. (Which
  // is also why it cannot fold like the others — a fold needs scroll
  // below it to spend, and this block is the end of the page.)
  // EVERY FOLD IS RETIRED. The banners and the reprint stand at their
  // resting size, the header's own — a blue band, one word in charcoal
  // spanning the measure — and nothing opens or closes as the reader
  // arrives. The mechanism below is kept whole against a change of
  // mind; with no blocks it takes itself off the page at once.
  var specs = [];

  var blocks = [];
  var rev = null;
  specs.forEach(function (s) {
    var head = document.querySelector(s.head);
    if (!head) return;
    var tail = s.tail ? document.querySelector(s.tail) : null;
    if (s.group && !tail) return;
    var b = { head: head, tail: tail, group: !!s.group,
              follow: !!s.follow, reverse: !!s.reverse };
    blocks.push(b);
    if (b.reverse) rev = b;
  });
  if (!blocks.length) return;

  // THE INK, NOT THE BOX — the page's own rule, and it is load-bearing
  // here. Both wordmark faces climb OUT of their boxes on a negative
  // margin (the masthead's is `24px - 0.217 * size`, the banners' the
  // same offset again) and the banners clip their empty head zone away
  // on top of that, so a block's box says nothing about where its name
  // is actually printed. Centre the box and the name lands 13 high.
  // These are the same canvas metrics every vertical seat on this page
  // is measured with: the line box's top to the cap, and its bottom
  // back up to the baseline.
  var mctx = document.createElement('canvas').getContext('2d');
  function offsets(el) {
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize) || 0;
    mctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    var m = mctx.measureText('H');
    var lh = parseFloat(cs.lineHeight) || size * 1.2;
    var half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
    return { cap: half + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent,
             ride: half + m.fontBoundingBoxDescent };
  }
  // The topmost cap and the lowest baseline anything in these blocks
  // prints, in viewport coordinates. It takes the group's OWN elements,
  // never their container: the masthead's parent also holds the rail,
  // whose ink runs a whole viewport down the page and would drag the
  // measure with it.
  function inkBounds(roots) {
    var top = Infinity, bot = -Infinity;
    var all = [];
    roots.forEach(function (root) {
      if (!root) return;
      all.push(root);
      var walk = root.querySelectorAll('*');
      for (var i = 0; i < walk.length; i++) all.push(walk[i]);
    });
    all.forEach(function (el) {
      var hasText = false;
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3 && n.nodeValue.trim()) { hasText = true; break; }
      }
      if (!hasText) return;
      if (getComputedStyle(el).visibility === 'hidden') return;
      var rg = document.createRange();
      rg.selectNodeContents(el);
      var rs = [];
      var raw = rg.getClientRects();
      for (var j = 0; j < raw.length; j++) if (raw[j].height) rs.push(raw[j]);
      if (!rs.length) return;
      var o = offsets(el);
      var t = rs[0].top + o.cap;
      var bm = rs[rs.length - 1].bottom - o.ride;
      if (t < top) top = t;
      if (bm > bot) bot = bm;
    });
    return top === Infinity ? null : { top: top, bot: bot };
  }

  // MEASURED BEFORE ANYTHING IS ADDED. Every number below is the seat
  // the block keeps in its settled state — the state the fold is
  // travelling towards — so it is read once, here, while the page is
  // still exactly that.
  function measure() {
    blocks.forEach(function (b) {
      b.head.style.paddingTop = '';
      b.head.style.paddingBottom = '';
      if (b.tail) b.tail.style.marginBottom = '';
    });
    blocks.forEach(function (b) {
      var hb = b.head.getBoundingClientRect();
      var cs = getComputedStyle(b.head);
      b.padT = parseFloat(cs.paddingTop) || 0;
      b.padB = parseFloat(
        getComputedStyle(b.group ? b.tail : b.head).paddingBottom) || 0;
      if (b.group) {
        var tb = b.tail.getBoundingClientRect();
        // The group's own box, first element's top to last's bottom:
        // the masthead's dek band rides UP into the wordmark on a
        // negative margin, so this is a span, not a sum of heights.
        b.natural = tb.bottom - hb.top;
      } else {
        b.natural = hb.height;
      }
      // Where the block's INK stands inside that box, settled: the
      // climb from the box's top edge to the first cap, and the ink's
      // own height. Both survive the fold unchanged — the fold moves
      // the box, never the type inside it.
      var ink = inkBounds(b.group ? [b.head, b.tail] : [b.head]);
      if (ink) { b.inkOff = ink.top - hb.top; b.inkH = ink.bot - ink.top; }
      else { b.inkOff = b.padT; b.inkH = b.natural - b.padT - b.padB; }
    });
  }

  var vh = 0;
  var span = 0;
  // The first block that has not yet locked; everything before it is
  // settled for good, everything after it stands fully open.
  var active = 0;
  var finished = false;

  function extents() {
    vh = window.innerHeight || 0;
    span = 0;
    blocks.forEach(function (b) {
      b.extra = Math.max(0, vh - b.natural);
      span += b.extra;
    });
    // THE DRIFT RATE IS DERIVED, NOT CHOSEN. The ink must drain its
    // two gaps TOGETHER: the black above it (its centred seat down to
    // its resting one, `lift`) and the black below it (the foot's
    // climb to the resting distance). The foot closes at 1 + extra/span
    // per scrolled pixel — the scroll plus the block's own collapse —
    // so there is exactly one rise rate `r` at which both gaps reach
    // their resting size on the same scroll pixel:
    //     crossover u = extra·span / (span + extra)
    //     r = lift / u
    // At that pixel the block LOOKS fully settled in the viewport —
    // name at its compact seat, foot at its compact distance — which
    // is what makes u the lock point. What seatBlock carries is the
    // ink's doc-drift, 1 − r: how much of each scrolled pixel the ink
    // gives back to the page instead of climbing.
    blocks.forEach(function (b) {
      b.lift = (vh - b.inkH) / 2 - b.inkOff;
      if (b.extra > 0 && span + b.extra > 0) {
        b.u = (b.extra * span) / (span + b.extra);
        b.drift = 1 - (b.u > 0 ? b.lift / b.u : 1);
      } else {
        b.u = 0;
        b.drift = 0;
      }
    });
  }

  function settleBlock(b) {
    b.head.style.paddingTop = '';
    b.head.style.paddingBottom = '';
    if (b.tail) {
      b.tail.style.marginBottom = '';
      b.tail.style.removeProperty('--tail-air');
    }
  }

  // ONE BLOCK'S SEAT AT LOCAL PROGRESS t — the scroll spent since the
  // block filled the viewport (t = 0 is the open panel, ink centred).
  //
  // CENTRED ON THE CONTENT, NOT ON THE BOX: none of these blocks
  // carries equal paddings at rest, so the content's own height comes
  // out first and the field is divided around THAT.
  //
  // THE INK PARALLAXES UP AS THE BLACK DRAINS FROM BOTH ENDS. The box
  // folds linearly; the ink rises at the derived rate r — slower than
  // the scroll — while the block's foot climbs toward it faster, and
  // the gap above the name and the gap below it land on their resting
  // sizes on the same scrolled pixel. Both regimes are one expression:
  //   draining:  lift + drift·t   (the parallax line)
  //   riding:    extra · open     (the resting distance to the foot)
  // and the ink is wherever the SMALLER says. They cross exactly once,
  // at u — the lock point — and at t = 0 the pad is the centring lift.
  function seatBlock(b, t) {
    if (b.extra <= 0) { settleBlock(b); return; }
    var open = 1 - Math.min(1, span > 0 ? t / span : 1);
    if (open <= 0.0005) { settleBlock(b); return; }
    var extraPad = Math.max(0,
      Math.min(b.lift + b.drift * t, b.extra * open));
    var rest = Math.max(0, b.extra * open - extraPad);
    b.head.style.paddingTop = (b.padT + extraPad).toFixed(2) + 'px';
    if (b.group) {
      // A GROUP is a run of siblings, so the air below cannot be its
      // padding — the last of them takes it as a margin instead. A
      // margin paints nothing, so the size goes out as a property
      // too and the chrome prints its own ground over it.
      b.tail.style.marginBottom = rest.toFixed(2) + 'px';
      b.tail.style.setProperty('--tail-air', rest.toFixed(2) + 'px');
    } else {
      b.head.style.paddingBottom = (b.padB + rest).toFixed(2) + 'px';
    }
  }

  // AND THE SAME SEAT, PLAYED BACKWARDS, for the block that ends the
  // page. It opens on the reader's approach: o = 0 the moment its top
  // touches the bottom of the screen — closed, at its resting size —
  // and o = 1 with the block a full viewport tall, its name centred,
  // which is how the page ends. The two blacks grow together in
  // proportion and the ink drifts down at `lift` per unit of o —
  // slower than the scroll, so on screen the name still rises: the
  // header's parallax run the other way.
  //
  // HOW MUCH SCROLL THE OPENING TAKES is not a taste — it is bounded
  // at both ends, and the bounds are tight. The block grows `extra`
  // over the run, and every pixel it grows is a pixel of page the
  // reader has to cross to get to the end: run it over less scroll
  // than `extra` and the page grows faster than they can scroll —
  // a dead stop. Run it over more than a viewport and the last of it
  // sits past the document's own end, where there is no scroll to
  // spend and the opening converges on full without ever arriving
  // (it rubber-bands). So the run must land inside (extra, vh), and
  // this takes the middle of that window — the most room on both
  // sides. What is left over after o reaches 1 is ordinary scroll,
  // carrying the finished panel up to its seat exactly as the page
  // runs out.
  //
  // The block's TOP is what o measures against, and padding added
  // inside it cannot move that top, so the driver never chases its
  // own output — the page grows under the reader instead, which is
  // the mirror of the header shrinking under them.
  function seatReverse(b, y) {
    if (!b || b.extra <= 0) { settleBlock(b); return; }
    var run = (b.extra + vh) / 2;
    var o = (y + vh - startOf(b)) / run;
    if (o <= 0) { settleBlock(b); return; }
    if (o > 1) o = 1;
    var lift = Math.max(0, Math.min(b.lift, b.extra));
    var head = lift * o;
    var rest = Math.max(0, (b.extra - lift) * o);
    b.head.style.paddingTop = (b.padT + head).toFixed(2) + 'px';
    if (b.group) {
      b.tail.style.marginBottom = rest.toFixed(2) + 'px';
      b.tail.style.setProperty('--tail-air', rest.toFixed(2) + 'px');
    } else {
      b.head.style.paddingBottom = (b.padB + rest).toFixed(2) + 'px';
    }
  }

  // The scroll at which a block fills the viewport: its own top's
  // document seat. Read live — everything above the active block is
  // settled by the time it plays, so the seat is stable, and a live
  // read survives anything above it re-laying out.
  function startOf(b) {
    return b.head.getBoundingClientRect().top +
      (window.scrollY || window.pageYOffset || 0);
  }

  // AND THE SEATS THAT HANG OFF THESE, IN THE SAME FRAME. The rail
  // tracks are absolutely seated at measured document coordinates and
  // the fold moves the blocks they hang from every frame; rail-fix's
  // own observer is rAF-coalesced and a frame behind, which flashed
  // red above the sidebar. Announcing synchronously re-seats them
  // before the frame paints.
  var announcing = false;
  function announce() {
    if (announcing) return;
    announcing = true;
    try { window.dispatchEvent(new Event('newcritic:fit')); } catch (e) {}
    announcing = false;
  }

  function paintAll(y) {
    blocks.forEach(function (b, i) {
      if (b.reverse) { seatReverse(b, y); return; }
      if (i < active) { settleBlock(b); return; }
      if (i === active && !b.follow) {
        seatBlock(b, Math.max(0, y - startOf(b)));
        return;
      }
      seatBlock(b, 0);
    });
    announce();
  }

  function teardown() {
    finished = true;
    root.classList.remove('chrome-opening');
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    announce();
  }

  // A page handed back mid-scroll settles the folds outright — but the
  // reverse block has no settled state to jump to: it is a function of
  // where the reader is standing, so it takes its seat and the
  // listeners stay for it.
  function settleAll() {
    blocks.forEach(function (b) { if (!b.reverse) settleBlock(b); });
    active = blocks.length;
    if (rev) {
      seatReverse(rev, window.scrollY || window.pageYOffset || 0);
      announce();
      return;
    }
    teardown();
  }

  var queued = false;
  function frame() {
    queued = false;
    if (finished) return;
    var y = window.scrollY || window.pageYOffset || 0;
    // THE FOOT ANSWERS EVERY FRAME, whichever block is folding above
    // it — its seat is a pure function of the scroll, and by the time
    // the last banner is landing the reader is already close enough
    // for it to have begun.
    if (rev) seatReverse(rev, y);
    for (;;) {
      // A follower at the head of the queue settles the moment its
      // predecessor has: it never plays a fold of its own.
      while (active < blocks.length && blocks[active].follow) {
        settleBlock(blocks[active]);
        active++;
      }
      if (active >= blocks.length) {
        // The reverse block never locks, so the mechanism stays on the
        // page for it — there is always another frame to answer.
        if (rev) { announce(); return; }
        teardown();
        return;
      }
      var b = blocks[active];
      if (b.reverse) { announce(); return; }
      var t = y - startOf(b);
      // THE LOCK, PER BLOCK. Past its own crossover the block's open
      // and settled states paint the same pixels, so it swaps to
      // settled invisibly: the swap removes the block's remaining pad
      // from above the reader's viewport, the same amount comes off
      // the scroll in the same frame, and the loop continues in case
      // a fling has already carried the reader past the NEXT block's
      // landing too.
      if (b.u > 0 && t >= b.u) {
        var open = 1 - Math.min(1, span > 0 ? t / span : 1);
        var pad = Math.max(0,
          Math.min(b.lift + b.drift * t, b.extra * open));
        settleBlock(b);
        active++;
        // INSTANT, against the page's scroll-behavior:smooth — left to
        // the default this correction becomes an animated glide, which
        // is exactly the visible motion it exists to prevent.
        var prevSB = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, Math.max(0, y - pad));
        root.style.scrollBehavior = prevSB;
        y = window.scrollY || window.pageYOffset || 0;
        announce();
        continue;
      }
      // REVERSIBLE inside the fold: t is read fresh from the scroll
      // every frame, down or up alike — t at or below zero is the
      // fully open panel, standing ready below the reader.
      seatBlock(b, Math.max(0, t));
      announce();
      return;
    }
  }
  // BOTH CLOCKS, FIRST ONE WINS — the rail's own idiom, and for the
  // same reason. rAF reads on a clean layout frame, but a backgrounded
  // tab or throttled renderer pauses it outright, and a fold driven by
  // rAF alone simply STOPS there. frame() re-reads the scroll each
  // time and paints from it alone, so running twice costs nothing.
  function onScroll() {
    if (queued || finished) return;
    queued = true;
    requestAnimationFrame(frame);
    setTimeout(frame, 60);
  }
  function refresh() {
    if (finished) return;
    measure();
    extents();
    paintAll(window.scrollY || window.pageYOffset || 0);
  }
  var onResize = refresh;

  // THE OPENING BELONGS TO THE TOP OF THE PAGE, and a browser will
  // hand it back anywhere: Chrome restores the scroll offset on a
  // reload, after this script has run, and the fold would wake a
  // third of the way through a movement nobody performed. A normal
  // load OPENS AT THE TOP; restoration is handed back for a
  // back/forward, where the reader's seat is theirs and no opening is
  // owed — that case settles outright below.
  try {
    var nav = performance.getEntriesByType &&
      performance.getEntriesByType('navigation')[0];
    if ('scrollRestoration' in history && (!nav || nav.type !== 'back_forward')) {
      history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  } catch (e) {}

  measure();
  extents();
  if (span <= 0) return;
  root.classList.add('chrome-opening');
  paintAll(window.scrollY || window.pageYOffset || 0);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  // AND MEASURED AGAIN WHEN THE FACES LAND. This script is
  // parser-blocking at the foot of the body — the cap metrics it read
  // are the fallback's until the real faces arrive (the font gate in
  // the head makes that window vanishingly small, but not zero).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
  // A page that opens ALREADY SCROLLED — a back/forward restore, a
  // deep link, an anchor — has no opening left to play: it settles
  // outright rather than waking mid-movement.
  if ((window.scrollY || 0) > 0.5) settleAll();
})();
