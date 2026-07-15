// Tile-cascade cover reveal (see the .tile-cascade styles in style.css):
// a cover image appears as a grid of square tiles, each unfolding to land
// face-up (half around their vertical axis, half around their horizontal
// one), trickling in on a diagonal chain from the top-left corner. Only
// one cover plays at a time — finishing one triggers the next — and the
// procession follows the READER: the next to play is always the top-most
// unplayed cover currently in the viewport (see tryAdvance), never a
// fixed document order. Read from the top and it runs top-left,
// top-right, next row, like a gallery walk; scroll ahead and the reveal
// simply picks up where you're looking, with the covers you passed
// staying dark until you come back to them. Nothing ever constrains
// scrolling. The cover-image cousin of the archive ledger's rule-draw.
// Runs on the homepage (hero + row cells) and the essays/postscript/
// contra pages (see renderCoverCascadeScript in build.js); archive,
// give, and about stay out.
(function(){
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  // Every cover frame on the page, in document order — which, for every
  // page this runs on, already reads top-to-bottom, left-to-right, so the
  // chain below needs no separate ordering step. Frames without a real
  // image (blank covers) never play.
  var frames = [].slice.call(
    document.querySelectorAll('.card--feature .card-image-frame, .duo-card-image')
  ).filter(function(f){ return f.querySelector('img.card-image'); });
  if (!frames.length) return;
  // Covers stay hidden until their cascade begins. The class lands here —
  // parser-blocking at the end of body, so before first paint — and only
  // when the effect will actually run (no-JS and reduced-motion loads
  // keep plain visible covers).
  frames.forEach(function(f){ f.classList.add('cover-pending'); });
  var TILE = 20;       // target tile edge in px — the grid derives from it
  var CHAIN_STEP = 20; // how long each diagonal waits before triggering the
                       // next (see revealChain below) — a 20px grid has
                       // ~85 diagonals on the hero, so this keeps one
                       // cover's own sweep to ~1.7s before the per-tile
                       // duration and jitter settle on top of it
  var TILE_JITTER = 170; // small per-tile random extra lag WITHIN a
                       // diagonal's own reveal — without it every tile on
                       // a diagonal flips in lockstep and that instant
                       // reads as a rigid little wipe; kept small (unlike
                       // an earlier whole-sweep jitter) since the diagonal
                       // chain already does the large-scale trickling
  var DUR = 850;       // longest cell transition (.77s flip), with settle margin
  // Catch-up: when the reader has scrolled ahead and several unplayed
  // covers sit in view at once, the procession hustles — each hurried
  // cascade compresses its sweep and jitter by this factor and flips its
  // tiles faster (see HURRY_FLIP + hurried DUR below, ~35% shorter
  // overall) — and relaxes back to full pace as the backlog clears,
  // since every start re-evaluates the count.
  var HURRY = 0.65;
  var HURRY_FLIP = 'transition-duration:.5s,.4s;'; // per-tile override of the
                       // stylesheet's .77s/.6s (properties/easings keep)
  var HURRY_DUR = 560; // .5s hurried flip, with settle margin

  // Removing the overlay restores the untouched image underneath — the
  // effect owns nothing permanent, so any interruption (resize, replay)
  // can simply finish instantly. cover-pending (hover disabled) only lifts
  // here, alongside — never when the cascade merely starts — so the card
  // stays inert for the whole trickle and springs to life only once the
  // real image is what's showing. Frames that haven't been triggered yet
  // (no 'tiling' class — still waiting their turn in the chain) keep
  // their pending state; only an actual in-progress or completed cascade
  // releases it. Clears every timer this frame may have running (its
  // deferred start, its diagonal chain, its completion) — the one place
  // that has to, since several callers (a fresh build, a resize, a
  // replay) all need the same guarantee that nothing stale fires later
  // for a frame they just tore down.
  function finish(frame) {
    var wasTiling = frame.classList.contains('tiling');
    frame.classList.remove('tiling');
    if (wasTiling) frame.classList.remove('cover-pending');
    clearTimeout(frame.__chainTimer);
    clearTimeout(frame.__tileTimer);
    clearTimeout(frame.__startTimer);
    var overlay = frame.querySelector('.tile-cascade');
    if (overlay) overlay.parentNode.removeChild(overlay);
    // The outline-trace overlay (see buildCoverTrace) only exists
    // mid-cascade — tearing it down here, right as cover-pending comes
    // off and the static outline (suppressed while pending — see
    // .card-image-frame.cover-pending .card-image-link::after in
    // style.css) appears, hands off with no gap: by the time this runs
    // the trace's own transition has reached its fully-drawn state
    // anyway, so the two are visually identical.
    var trace = frame.querySelector('.cover-trace');
    if (trace) trace.parentNode.removeChild(trace);
    return wasTiling;
  }

  // Two droplets race out from the top-left corner of a cover and meet
  // at the bottom-right — one across the top then down the right edge,
  // one down the left then across the bottom — each tracing half the
  // rectangle's perimeter and leaving a permanent white line behind.
  // Both halves of a rectangle's perimeter, split at two opposite
  // corners, are exactly the same length (fw+fh either way), so
  // animating both at the same linear rate over the same duration always
  // lands them together at the far corner. Each half is a PAIR of paths
  // on the same geometry: the line (dash grows from the start corner —
  // the white left behind) and the comet (a short dash pinned to the
  // draw front — the Subscribe button's caterpillar droplet, in SVG; see
  // .trace-comet in style.css for its glow). The comet's dasharray is
  // COMET followed by a gap of the full half-length, so exactly one dash
  // ever shows: at offset COMET its segment is [-COMET, 0] — entirely
  // before the path, invisible — and at offset COMET-half it's
  // [half-COMET, half], tucked into the far corner; every offset between
  // keeps its head exactly at the line's draw front. Built folded shut
  // and released by the caller in the same tick as the tile reveal (see
  // __startChain), same "commit the hidden state, then transition"
  // reasoning as the tiles themselves.
  var COMET = 60; // droplet length in px along the path
  function buildCoverTrace(linkEl, fw, fh, duration) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + fw + ' ' + fh);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'cover-trace');
    // The path runs 0.5px inside the box — the centerline of the static
    // outline's 1px border strip (drawn just inside the edge) — so the
    // 1px trace stroke covers that border's exact pixels and the handoff
    // at the end is invisible (see .trace-line in style.css).
    var x0 = 0.5, y0 = 0.5, x1 = fw - 0.5, y1 = fh - 0.5;
    var half = (x1 - x0) + (y1 - y0);
    [
      'M' + x0 + ',' + y0 + ' L' + x1 + ',' + y0 + ' L' + x1 + ',' + y1, // top, then right
      'M' + x0 + ',' + y0 + ' L' + x0 + ',' + y1 + ' L' + x1 + ',' + y1  // left, then bottom
    ].forEach(function(d){
      var line = document.createElementNS(svg.namespaceURI, 'path');
      line.setAttribute('d', d);
      line.setAttribute('class', 'trace-line');
      line.style.strokeDasharray = half;
      line.style.strokeDashoffset = half;
      line.style.transition = 'stroke-dashoffset ' + duration + 'ms linear';
      svg.appendChild(line);
      var comet = document.createElementNS(svg.namespaceURI, 'path');
      comet.setAttribute('d', d);
      comet.setAttribute('class', 'trace-comet');
      comet.style.strokeDasharray = COMET + ' ' + half;
      comet.style.strokeDashoffset = COMET;
      comet.style.transition = 'stroke-dashoffset ' + duration + 'ms linear';
      svg.appendChild(comet);
    });
    linkEl.appendChild(svg);
    // One start() releases all four paths together (see __startChain).
    svg.__release = function(){
      [].forEach.call(svg.querySelectorAll('.trace-line'), function(p){
        p.style.strokeDashoffset = '0';
      });
      [].forEach.call(svg.querySelectorAll('.trace-comet'), function(p){
        // The droplet dims away over the last quarter of its run, so by
        // the time it reaches the far corner there's no bright glowing
        // head to vanish abruptly at teardown — the ending is just the
        // drawn line quietly becoming the static border.
        p.style.transition = 'stroke-dashoffset ' + duration + 'ms linear, ' +
          'opacity ' + Math.round(duration * 0.25) + 'ms linear ' + Math.round(duration * 0.75) + 'ms';
        p.style.strokeDashoffset = (COMET - half) + 'px';
        p.style.opacity = '0';
      });
    };
    return svg;
  }

  // Reproduces object-fit:cover's own math for a single axis: a
  // percentage crops proportionally to how much the scaled image
  // overhangs the box on that side; a length (the rarer case — a focal
  // override in px) offsets by that fixed amount instead. Needed because
  // each tile now paints its own slice of ONE shared background-size/
  // position pair rather than living inside an oversized inner div that
  // let the browser's own `cover` keyword do this — see buildOverlay.
  function axisOffset(token, containerSize, imageSize) {
    token = (token || '50%').trim();
    if (token.charAt(token.length - 1) === '%') {
      return (imageSize - containerSize) * (parseFloat(token) / 100);
    }
    return parseFloat(token) || 0;
  }

  // Pure writes — every layout/style read its caller needs (image-area
  // size, object-position) arrives as arguments, so a build never
  // interleaves reads and writes (that interleaving, across several
  // frames built in one batch, was the visible hitch an earlier version
  // of this effect had on scroll). Builds the tile grid folded shut and
  // returns it WITHOUT starting the reveal — the caller commits the
  // folded state (one forced layout) before calling the returned
  // start() function, or the fold-in transition would just snap open.
  function buildOverlay(frame, linkEl, img, fw, fh, objectPosition, objectFit, hurried) {
    finish(frame); // a replay clears any pass still running (and clears its timers)
    // Catch-up pace (see HURRY above): a backlog of visible unplayed
    // covers compresses this cascade's clock — sweep step, jitter, and
    // per-tile flip alike — without touching its geometry.
    var step = hurried ? Math.round(CHAIN_STEP * HURRY) : CHAIN_STEP;
    var jitter = hurried ? Math.round(TILE_JITTER * HURRY) : TILE_JITTER;
    var dur = hurried ? HURRY_DUR : DUR;
    var cols = Math.max(2, Math.round(fw / TILE));
    var rows = Math.max(2, Math.round(fh / (fw / cols)));
    // The url() rides inside a double-quoted style attribute, so it uses
    // single quotes and percent-encodes every character that could break
    // either layer of quoting.
    var src = (img.currentSrc || img.src).replace(/['"()\s]/g, function(ch){
      return '%' + ch.charCodeAt(0).toString(16);
    });
    // The image's own scale for the FULL image area, computed once per
    // frame rather than left to the browser per tile: a tile is much
    // smaller than the image area, so background-size:cover (or contain)
    // on the tile itself would resolve against just that tiny box — the
    // wrong scale entirely. Every tile instead shares this one explicit
    // background-size and a background-position offset by its own
    // (x0,y0), so each is a small window onto the same, correctly-scaled
    // image (one shared decoded bitmap, not a clone per tile). max()
    // reproduces cover (scales up until there's no gap, overhanging one
    // axis); min() reproduces contain (scales up only as far as neither
    // axis overhangs, letterboxing the other) — the hero uses contain
    // (see .card--feature .card-image in style.css), everything else
    // cover, so this reads the element's own computed value rather than
    // assuming one or the other.
    var nw = img.naturalWidth, nh = img.naturalHeight;
    var scale = objectFit === 'contain' ? Math.min(fw / nw, fh / nh) : Math.max(fw / nw, fh / nh);
    var bgW = nw * scale, bgH = nh * scale;
    var opParts = objectPosition.split(/\s+/);
    var offX = axisOffset(opParts[0], fw, bgW);
    var offY = axisOffset(opParts[1], fh, bgH);
    var baseBg = "background-image:url('" + src + "');" +
      'background-size:' + bgW + 'px ' + bgH + 'px;background-repeat:no-repeat;';
    var html = '';
    var diagonals = rows - 1 + cols - 1 + 1;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        // Neighbouring tiles share integer edges — no seams, no overlap.
        var x0 = Math.round(c * fw / cols), x1 = Math.round((c + 1) * fw / cols);
        var y0 = Math.round(r * fh / rows), y1 = Math.round((r + 1) * fh / rows);
        // Half the tiles flip around their vertical axis, half (.tile-v)
        // around their horizontal one — dealt at random, like the jitter.
        // data-d marks which diagonal (r+c) the tile belongs to, read
        // back after insertion to group cells for the chained reveal —
        // cheaper than re-deriving it from position, and avoids a second
        // pass computing r/c from the flat NodeList.
        html += '<div class="tile-cascade-cell' + (Math.random() < 0.5 ? ' tile-v' : '') + '"' +
          ' data-d="' + (r + c) + '"' +
          ' style="left:' + x0 + 'px;top:' + y0 + 'px;' +
          'width:' + (x1 - x0) + 'px;height:' + (y1 - y0) + 'px;' + baseBg +
          'background-position:' + (-(offX + x0)) + 'px ' + (-(offY + y0)) + 'px;' +
          (hurried ? HURRY_FLIP : '') +
          'transition-delay:' + Math.round(Math.random() * jitter) + 'ms"></div>';
      }
    }
    var overlay = document.createElement('div');
    overlay.className = 'tile-cascade';
    overlay.innerHTML = html;
    linkEl.appendChild(overlay);
    // Hide the real image only now that its stand-in is fully in place —
    // if anything above failed, the cover just shows normally (or stays
    // pending). cover-pending stays on through the whole cascade (see
    // finish) — hover only returns when the tiles do.
    frame.classList.add('tiling');

    // Group cells by diagonal (r+c) for the chained reveal below — one
    // pass over the already-inserted children, reading a data attribute
    // rather than geometry, so this doesn't force a layout of its own.
    var byDiagonal = [];
    [].forEach.call(overlay.children, function(cell){
      var d = +cell.dataset.d;
      (byDiagonal[d] || (byDiagonal[d] = [])).push(cell);
    });

    // The reveal is a chain, not one command to every tile at once: each
    // diagonal's cells flip in, and only THAT triggers the next
    // diagonal's turn (a short timer standing in for "wait for this
    // batch to get going, then hand off"). Toggling one shared class on
    // the whole overlay (an earlier approach) forces the browser to
    // compute new target styles for every tile in a single synchronous
    // pass — with hundreds to thousands of tiles that pass was a visible
    // stutter right as a cascade began. Chaining spreads that same total
    // work across ~85 much smaller steps, each cheap enough not to drop
    // a frame — the per-tile visuals (transform, duration, jitter) are
    // unchanged.
    function revealChain(i) {
      var cells = byDiagonal[i];
      if (cells) cells.forEach(function(cell){ cell.classList.add('in'); });
      if (i + 1 < diagonals) {
        frame.__chainTimer = setTimeout(function(){ revealChain(i + 1); }, step);
      }
    }
    // Every cover gets the droplet-trace flourish — built folded shut now
    // (see buildCoverTrace) and timed to totalDuration so both droplets
    // land at the far corner as the last tile settles (the trace and its
    // comet-fade percentages inherit a hurried pace automatically, since
    // everything keys off this one number).
    var totalDuration = diagonals * step + jitter + dur;
    var trace = buildCoverTrace(linkEl, fw, fh, totalDuration);
    // Everything that moves starts HERE, in one moment — the diagonal
    // chain, the trace release, and the completion clock (droplets meet
    // in the bottom corner at exactly totalDuration; that same instant
    // reveals the real cover and hands the page-wide chain to the next —
    // the meeting IS the trigger). The caller schedules this a tick
    // after building (see tryAdvance), so it can never run on a frame
    // that was torn down in between — hence the tiling guard.
    overlay.__startChain = function(){
      if (!frame.classList.contains('tiling')) return;
      revealChain(0);
      trace.__release();
      frame.__tileTimer = setTimeout(function(){
        // The ending is a short crossfade, not a hard swap: the tile
        // grid re-rasterizes the image as many background slices and the
        // SVG trace line antialiases slightly differently than the crisp
        // CSS border, so cutting straight from one to the other let
        // those sub-pixel differences land in a single frame — a visible
        // shudder. Instead the real image and its outline are revealed
        // UNDERNEATH (the border sits below the z-indexed overlay and
        // trace, and white-on-white in the same strip blends invisibly),
        // the overlay and trace dissolve over 160ms, and only then are
        // they removed. The chain still advances at the droplets'
        // meeting, not after the dissolve.
        frame.classList.remove('tiling');
        frame.classList.remove('cover-pending');
        overlay.style.transition = 'opacity 160ms linear';
        trace.style.transition = 'opacity 160ms linear';
        overlay.style.opacity = '0';
        trace.style.opacity = '0';
        frame.__tileTimer = setTimeout(function(){ finish(frame); }, 200);
        tryAdvance();
      }, totalDuration);
    };
    return overlay;
  }

  // Only one cover plays at a time, and the procession follows the
  // reader: each advance plays the top-most (then left-most) unplayed
  // cover currently in the viewport. A frame plays once its image has
  // loaded AND it's in view (a pure load trigger would let below-fold
  // covers play out unseen); when nothing qualifies, tryAdvance just
  // waits and gets called again by the poller, an image's load event, or
  // a finishing cover.
  function ready(frame) {
    var img = frame.querySelector('img.card-image');
    return img && img.complete && img.naturalWidth > 0;
  }
  function inViewport(frame) {
    var r = frame.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }
  function tryAdvance() {
    var i, f;
    // One at a time: an active cover's own completion timer (see
    // buildOverlay) is what calls tryAdvance next, not this poll tick.
    // Without this guard the poller would re-trigger the still-visible
    // active frame every 400ms, restarting its cascade forever.
    for (i = 0; i < frames.length; i++) {
      if (frames[i].classList.contains('tiling')) return;
    }
    // Pick where the reader is looking: among pending, ready, in-view
    // covers, the one nearest the top of the viewport (left-most on a
    // tie, so an untouched page still reads top-left → top-right → down).
    var best = null, bestTop = Infinity, bestLeft = Infinity;
    var anyPending = false;
    var candidates = 0;
    for (i = 0; i < frames.length; i++) {
      f = frames[i];
      if (!f.classList.contains('cover-pending')) continue; // played (or dissolving)
      anyPending = true;
      if (!ready(f) || !inViewport(f)) continue;
      candidates++;
      var r = f.getBoundingClientRect();
      if (r.top < bestTop - 1 || (Math.abs(r.top - bestTop) <= 1 && r.left < bestLeft)) {
        best = f;
        bestTop = r.top;
        bestLeft = r.left;
      }
    }
    if (!best) {
      // Retire the poller only once every cover on the page has played.
      if (!anyPending && pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      return;
    }
    var frame = best;
    // The tile grid is sized to the image area (the .card-image-link,
    // which fills the frame).
    var linkEl = frame.querySelector('.card-image-link');
    var img = frame.querySelector('img.card-image');
    var fw = linkEl.clientWidth, fh = linkEl.clientHeight;
    if (!fw || !fh) return;
    var imgStyle = getComputedStyle(img);
    // Hustle while at least two more covers wait in view behind this one
    // (a backlog — the reader is ahead of the procession); breathe at
    // full pace otherwise. Re-decided at every start, so the pace relaxes
    // as the backlog clears.
    var hurried = candidates >= 3;
    var overlay = buildOverlay(frame, linkEl, img, fw, fh, imgStyle.objectPosition, imgStyle.objectFit, hurried);
    void document.documentElement.offsetWidth; // commit the folded state
    // Start one timer tick later, never in this same task: the first
    // cover of a fresh page load reaches here synchronously during
    // parsing, BEFORE first paint — and transitions on a never-painted
    // element can be skipped outright, which is why the trace's
    // draw-in silently no-showed on a hard refresh while the tiles
    // (revealed by their own later timers) still played. The tick puts
    // a painted frame between the folded state and its release for
    // every start path equally.
    frame.__startTimer = setTimeout(function(){ overlay.__startChain(); }, 30);
  }
  var pollTimer = null;
  function ensurePolling() {
    if (pollTimer == null) pollTimer = setInterval(tryAdvance, 400);
  }
  frames.forEach(function(frame){
    var img = frame.querySelector('img.card-image');
    if (img && !img.complete) img.addEventListener('load', tryAdvance, { once: true });
  });
  ensurePolling();
  tryAdvance();

  // Tiles are pixel-fitted to the image area, so a mid-pass resize would
  // tear the mosaic — whichever frame was active just completes
  // instantly instead, immediately handing off rather than waiting out
  // its original (now-abandoned) duration.
  window.addEventListener('resize', function(){
    var aborted = false;
    frames.forEach(function(frame){
      if (finish(frame)) aborted = true;
    });
    if (aborted) tryAdvance();
  });

  // The page's gray rules — the full-bleed row dividers and the vertical
  // dividers between cells — draw themselves in as they enter the
  // viewport, the archive ledger's ruling brought to these pages (see
  // .line-draw in style.css: horizontals sweep left-to-right, verticals
  // drop downward). Same conventions as everything else here: classes
  // land pre-paint so no-JS keeps static lines, a poller drives reveals
  // (with a batch stagger via --line-delay, sorted by position so the
  // ruling always reads downward), and it retires itself when done.
  var lines = [].slice.call(
    document.querySelectorAll('.row-divider, .duo-half-divider, .duo-divider--h')
  );
  var replayLines = null;
  if (lines.length) {
    lines.forEach(function(l){ l.classList.add('line-draw'); });
    var pendingLines = lines.slice();
    var lineTimer = null;
    var drawLines = function() {
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
    };
    lineTimer = setInterval(drawLines, 400);
    drawLines();
    // Return visits redraw the ruling like everything else (see
    // replayAll): the rest state carries no transition, so stripping
    // in-view snaps lines back to undrawn instantly, ready to sweep in
    // again — the rect reads in drawLines' filter commit that state
    // before fresh in-view classes land.
    replayLines = function() {
      lines.forEach(function(l){ l.classList.remove('in-view'); });
      pendingLines = lines.slice();
      if (lineTimer == null) lineTimer = setInterval(drawLines, 400);
      drawLines();
    };
  }

  // Same return-visit rules as the archive ledger: replay on a
  // back/forward restore (the restored DOM arrives with the effect long
  // finished), and defer any pass that would play in a hidden tab until
  // the reader can actually see it. The procession restarts wherever the
  // reader actually is; onVisible dedupes itself.
  function replayAll() {
    frames.forEach(function(frame){
      finish(frame); // clears every timer this frame might still have pending
      // Hidden-until-initiated applies to replays too: frames go dark
      // again until their turn comes back around.
      frame.classList.add('cover-pending');
    });
    if (replayLines) replayLines();
    ensurePolling();
    tryAdvance();
  }
  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    replayAll();
  }
  window.addEventListener('pageshow', function(e){
    if (!e.persisted) return;
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', onVisible);
    } else {
      replayAll();
    }
  });
  if (document.visibilityState === 'hidden') {
    document.addEventListener('visibilitychange', onVisible);
  }
})();
