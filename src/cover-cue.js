// READ NOW IN PLACE OF THE POINTER, OVER A COVER (2026-09-18).
// The dim is struck: a cover under the hand goes to grey and nothing
// else (style.css, THE PICTURE ANSWERS THE POINTER), and the errand is
// SAID instead. The arrow GOES on a cover — cursor:none, hung on a
// class this script writes, so a page whose script never ran keeps its
// pointer — and the words stand where it stood, white, for as long as
// the hand is on the picture.
//
// ON THE POINTER, AND UNDER THE BORDER. The pointer stands at the
// line's CENTRE, across and down both: the word IS the cursor, sitting
// on the hand rather than hanging off it, and it is never moved off
// the pointer to make it fit. Where it runs past the picture's edge it
// SLIDES UNDER THE BORDER — clipped to the frame, so it goes beneath
// the outline a letter at a time as the hand travels out, and is whole
// again the instant the hand comes back. Nothing eases and nothing is
// nudged: the seat is the pointer's, every frame, and the frame does
// the hiding. (It tucked under the pointer for an hour, which JUMPED
// — the thing this replaces.)
//
// One line for the whole page, moved between covers: a span per cover
// would be two dozen boxes waiting on an event that visits one.
// Pointer only — a finger has no hover, and the line would be left
// standing on the picture after a tap.
(function () {
  if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
  var COVERS = '.card-image-link, .latest-cover, .ticker-cover-link';
  // A CARD'S TITLE LIGHTS ITS PICTURE TOO (2026-09-18): the words under
  // the hand used to take the crimson, which is the page's mark for a
  // link in a line of text and reads thinly on a headline. The title
  // lights its OWN picture instead — the same grey, the same dim — and
  // leaves the words in their ink, with READ NOW standing in the
  // MIDDLE of the picture, since there is no pointer over there to
  // stand on. Cross onto the picture and it snaps to the hand: nothing
  // eases, so the jump from the middle to the pointer is the same
  // instant snap as the one back out.
  var TITLES = '.card-title, .latest-title';
  // The words of a card: its title and the dek under it, which answer
  // as one (see resolveFrom).
  // AND THE PREVIEW'S OWN WORDS (2026-09-21): a hand on an open
  // preview's paragraphs — which go to the post now, src/card-open.js
  // — cues the picture beside them and says Read Now in it, as a hand
  // on the title does.
  var WORDS = '.card-title, .latest-title, .card-dek, .latest-dek, .latest-plate-p, .card-preview';
  var CELLS = '.duo-half--mega, .latest-cell--ps, .latest-cell--contra';
  // THE CONTRAS DO NOT HOLD ACROSS THEIR SEAM (2026-09-19). The hold
  // below was written for the cards whose picture stands BESIDE their
  // words, where the gutter is 26 or 30 of the column's own padding and
  // a hand crossing it would otherwise drop the whole mark and pick it
  // straight back up — a flicker in the middle of one gesture.
  // A contra is not built that way. Its picture stands OVER its words,
  // and what separates them is a seam of seven or eight pixels: not a
  // crossing that needs covering, just the line where the artwork ends
  // and the title begins. Measured on the page, every contra's gap box
  // came back between 7 and 8 high against the 26 and 30 the others
  // carry. Holding a mark across it keeps the block up while the hand
  // is on neither the words nor the picture, which is the thing the
  // hold was meant to prevent, not to cause. So the contras are out of
  // it: leave the rectangle or the picture and the mark ends there.
  var NO_HOLD = '.latest-cell--contra';
  // THE MARK'S OWN BOX, not the element's: where a title has been
  // squared off the rectangle it draws IS the mark, and it is neither
  // the title's box (the column's whole width) nor the dek's. Read off
  // the pseudo the sheet draws, so what the hand is tested against is
  // exactly what the reader can see.
  function markBox(title) {
    if (!title) return null;
    var r = title.getBoundingClientRect();
    if (!title.classList.contains('hl-rect')) return r;
    var c = getComputedStyle(title, '::before');
    if (c.content === 'none') return r;
    return {
      top: r.top + (parseFloat(c.top) || 0),
      bottom: r.bottom - (parseFloat(c.bottom) || 0),
      left: r.left + (parseFloat(c.left) || 0),
      right: r.right - (parseFloat(c.right) || 0)
    };
  }
  // THE PICTURE SITS IN THE BOX (2026-09-22): at rest a card's picture
  // is painted in its title's box and the picture's old seat is the
  // title column (.swap-col, src/duo-panel-fit.js). There the cue
  // stands in the box: a hand in the column centres it in the box, as
  // a hand on the words did, and a hand in the box carries it, as a
  // hand on the picture did. Open, the card is what it was.
  function swapped(cover) {
    if (!cover || !cover.querySelector) return null;
    var cell = cover.closest(CELLS);
    if (!cell) return null;
    var col = cover.querySelector('.swap-col');
    return col && col.classList.contains('is-set') ? cell : null;
  }
  function hostRect() {
    var cell = swapped(host);
    var b = cell ? markBox(cell.querySelector(TITLES)) : null;
    if (!b) return host.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.right - b.left, height: b.bottom - b.top };
  }
  function inBox(b) {
    return !!b && px >= b.left && px <= b.right && py >= b.top && py <= b.bottom;
  }
  // The gap between two boxes that do not overlap, as a box of its own:
  // the two facing edges, and the run they share on the other axis. Set
  // beside each other it is the gutter; set one above the other — the
  // reviews, whose picture stands over its words — it is the seam
  // between them. A hand crossing straight from one to the other is in
  // it the whole way; a hand leaving at a corner is not, and the mark
  // ends, which is what leaving means.
  function gapBox(a, b) {
    if (!a || !b) return null;
    if (a.right <= b.left || b.right <= a.left) {
      return {
        left: Math.min(a.right, b.right), right: Math.max(a.left, b.left),
        top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom)
      };
    }
    if (a.bottom <= b.top || b.bottom <= a.top) {
      return {
        top: Math.min(a.bottom, b.bottom), bottom: Math.max(a.top, b.top),
        left: Math.max(a.left, b.left), right: Math.min(a.right, b.right)
      };
    }
    return null;
  }
  // noGap: the mark's two pieces still hold — the rectangle's own air
  // between its words, and the picture — but the seam BETWEEN them
  // does not. See NO_HOLD above for which cards ask for that and why.
  function inMark(cell, noGap) {
    var mark = markBox(cell.querySelector(TITLES));
    var cover = host && host.getBoundingClientRect ? host.getBoundingClientRect() : null;
    if (inBox(mark) || inBox(cover)) return true;
    if (noGap) return false;
    return inBox(gapBox(mark, cover));
  }
  // AN OPEN CARD SAYS READ NOW FOR A HAND IN ITS BOX (2026-09-22): the
  // preview's box — the plate's own pseudo, read as the title's is —
  // or the picture, and not the frame round the box. The cell carries
  // .is-inbox while the hand is in either; the sheet paints the
  // picture's Read Now from it (and from the three moves out and
  // home, which need no hand).
  var inboxCell = null;
  function inbox(cell) {
    var on = false;
    if (cell) {
      var cu = cell.querySelector('.plate-curtain');
      var cover = cell.querySelector(COVERS);
      var box = null;
      if (cu) {
        var c = getComputedStyle(cu, '::before');
        var r = cu.getBoundingClientRect();
        if (c.content !== 'none') {
          // the pseudo spans the frame with the box painted --pb-i
          // inside it on every side but the picture's, where it runs
          // --pb-o onto the picture (style.css, THE PREVIEW IS THE
          // RESTING BOX'S TWIN)
          var i = parseFloat(c.getPropertyValue('--pb-i')) || 0;
          box = { top: r.top + (parseFloat(c.top) || 0) + i, bottom: r.bottom - (parseFloat(c.bottom) || 0) - i, left: r.left + (parseFloat(c.left) || 0) + i, right: r.right - (parseFloat(c.right) || 0) - i };
          var f = parseFloat(c.getPropertyValue('--pb-f')) || i;
          if (cell.classList.contains('pic-left')) { box.right += i; box.left += f - i; }
          else if (cell.classList.contains('pic-right')) { box.left += i; box.right -= f - i; }
          else if (cell.classList.contains('latest-cell--contra-rev')) box.top -= i;
          else if (cell.classList.contains('latest-cell--contra')) box.bottom += i;
        }
      }
      on = inBox(box);
    }
    var next = on ? cell : null;
    if (next === inboxCell) return;
    if (inboxCell) inboxCell.classList.remove('is-inbox');
    inboxCell = next;
    if (inboxCell) inboxCell.classList.add('is-inbox');
  }
  // What the point under the hand asks for: which picture is lit, and
  // whether the words are said over it.
  function resolveFrom(node) {
    if (!node || !node.closest) return null;
    // AN OPEN CARD SAYS READ NOW ON ITS OWN (2026-09-21, late): its
    // picture carries the words in the sheet while the preview is
    // open, so this line stands down there rather than doubling them.
    var openCell = node.closest(CELLS);
    // (Through the moves out and home it said nothing for a day; it
    // answers through them now — 2026-09-22, later — the picture
    // passing under a still hand taking the line as it arrives: see
    // THE PICTURE MOVES UNDER A STILL HAND, below.)
    // (a card whose picture is in its box answers open as it does shut:
    // the box travels with the frame, and the body column is words)
    if (openCell && openCell.classList.contains('is-open') && !swapped(openCell.querySelector('.card-image-link, .latest-cover'))) {
      // …BUT ON ITS PICTURE THE LINE RIDES THE POINTER AS EVER
      // (2026-09-22, night): the box says Read Now from its centre
      // (.is-inbox); a hand on the picture takes the words with it.
      var onPic = node.closest(COVERS);
      inbox(onPic ? null : openCell);
      if (onPic) return { cover: onPic, say: true, mid: false, title: null };
      return null;
    }
    inbox(null);
    var direct = node.closest(COVERS);
    if (direct) {
      // AND THE PICTURE LIGHTS ITS WORDS BACK (2026-09-19). The title
      // lit its own picture from the start; the picture returned
      // nothing, so a hand on the artwork left the title and its dek
      // dark and the card answered with half a mark. The pair is one
      // card either way round — the cell's own title, found the way the
      // title finds its cover.
      var back = direct.closest(CELLS);
      return {
        cover: direct, say: true, mid: !!swapped(direct),
        title: back ? back.querySelector(TITLES) : null
      };
    }
    // THE DEK RAISES IT TOO (2026-09-19). The Garamond under a title is
    // part of the title's mark — it lights with it and joins its block —
    // so a hand on the dek is a hand on the words, and asks for what a
    // hand on the title asks for: the picture grey, READ NOW in the
    // middle of it since there is no pointer over there to stand on,
    // and the cue on the title, which is where the whole mark hangs.
    var words = node.closest(WORDS);
    if (!words) {
      // THE GUTTER IS NOT A WAY OUT, AND NOTHING ELSE IS A WAY IN
      // (2026-09-19). The words stand 36 from the artwork and that 36 is
      // neither: crossing it the hand passed over the column's own
      // padding, nothing answered, and the whole mark — the blocks, the
      // grey, READ NOW — dropped and came back in the space of the
      // crossing. A mark already up holds across it.
      // ONLY across it. The hold was the whole CARD for an hour, which
      // is more card than the mark covers: the byline over the title and
      // READ PREVIEW under it kept a mark that had nothing to do with
      // them, and the mark outlived the box it is drawn in. The hold is
      // the mark's OWN geometry now — the rectangle, the picture, and
      // the rectangle of gap between the two, which is the one place the
      // hand must pass through to get from one to the other. Leave any
      // of them and it ends.
      // It only ever HOLDS: nothing here lights a mark that was not lit,
      // so the pad around the words raises nothing until the hand
      // reaches them.
      // (…EXCEPT ACROSS A CONTRA'S SEAM, which is no crossing to cover
      // — see NO_HOLD above. The SEAM alone is struck there, not the
      // hold: a contra's rectangle still keeps its own mark up while
      // the hand crosses the air inside it, between the title and the
      // dek, or the whole thing would flicker on the way down the
      // words — which is the very fault the hold was written for.
      // Refusing the cell outright was the first cut of this and did
      // exactly that.)
      var within = node.closest(CELLS);
      var noGap = !!(within && within.matches && within.matches(NO_HOLD));
      if (within && host && within.contains(host) && inMark(within, noGap)) {
        var held = within.querySelector(TITLES);
        return { cover: host, say: true, mid: !(swapped(host) && inBox(markBox(held))), title: held };
      }
      return null;
    }
    var cell = words.closest(CELLS);
    var title = words.closest(TITLES) || (cell ? cell.querySelector(TITLES) : null);
    var cover = cell ? cell.querySelector('.card-image-link, .latest-cover') : null;
    var boxed = !!swapped(cover) && !!words.closest('.card-title, .latest-title, .card-dek, .latest-dek');
    return cover ? { cover: cover, say: true, mid: !boxed, title: title } : null;
  }
  var cue = null, host = null, rafId = 0, px = 0, py = 0;
  // WHERE THE WORDS SIT: on the pointer, or in the middle of the
  // picture. (A third seat, HELD where the pointer left it and pulled
  // the courier's 24 inside the border, stood here for a few minutes
  // and was taken back: coming off the picture onto the words, the
  // middle is the seat.)
  var mode = 'pointer', lit = null;
  // WHERE AN ABSOLUTE SEAT IS MEASURED FROM, read once off the page
  // itself rather than assumed: the line is a child of <body>, and what
  // its left and top count from depends on whether anything above it is
  // positioned.
  var originX = 0, originY = 0, seated = false;
  function origin() {
    if (seated || !cue) return;
    seated = true;
    var was = cue.style.cssText;
    cue.style.position = 'absolute'; cue.style.left = '0px'; cue.style.top = '0px'; cue.style.transform = 'none';
    var r = cue.getBoundingClientRect();
    originX = r.left + window.pageXOffset;
    originY = r.top + window.pageYOffset;
    cue.style.cssText = was;
  }

  // ONE FRAME PENDING AT A TIME, AND NEVER A LATCHED ONE. A plain
  // boolean guard latches: where the frame it was set for never runs —
  // a hidden tab throttles them away — the guard stays raised and every
  // later move and scroll is dropped, the words frozen on the page.
  // The pending frame is CANCELLED and replaced instead, so the guard
  // cannot outlive the frame it stands for.
  function schedule(fn) {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () { rafId = 0; fn(); });
  }

  // The arrow goes only once there is something to put in its place.
  document.documentElement.classList.add('has-cover-cue');
  // THE BIG NAMES TURN THE PAGE (2026-09-22): a hand on either
  // full-width THE NEW CRITIC turns the page's ground to the mark's
  // colour — a class on the root, set here, where an html:has() over
  // the whole document made every style pass on the page a search.
  // (listened for on the document, not bound to each name: the band's
  // miniature is made by another script, after this one has run)
  var WM = '.topbar-wordmark, .reprint-link, .topbar-name, .reprint-name, .section-band .band-mini, .section-band .band-name-mid';
  var wmOf = function (n) { return n && n.closest ? n.closest(WM) : null; };
  var wmSet = function (on) { document.documentElement.classList.toggle('nc-wm-lit', on); };
  document.addEventListener('mouseover', function (e) { if (wmOf(e.target)) wmSet(true); }, true);
  document.addEventListener('mouseout', function (e) { if (wmOf(e.target) && !wmOf(e.relatedTarget)) wmSet(false); }, true);
  document.addEventListener('focusin', function (e) { if (wmOf(e.target)) wmSet(true); }, true);
  document.addEventListener('focusout', function (e) { if (wmOf(e.target) && !wmOf(e.relatedTarget)) wmSet(false); }, true);

  function make() {
    cue = document.createElement('span');
    cue.className = 'cover-cue';
    // It speaks to the eye, not to a reader on a screen reader: the
    // link it stands on already says where it goes.
    cue.setAttribute('aria-hidden', 'true');
    cue.textContent = 'Read Now';
    // INSIDE MAIN, NOT ON BODY (2026-09-21). main.has-mega is a stacking
    // context of its own (z-index 1), and the corner box is docked
    // inside it now (src/subscribe-box.js) at 95 — a line on <body> at
    // 90 stood over the whole of main, the box included, and Read Now
    // printed across SUBSCRIBE. In main it stands at 90 among the
    // covers' 5s, the band's 30 and the clones' 35, and under the
    // box; fixed is still the window's, main carrying no transform.
    (document.querySelector('main.has-mega') || document.body).appendChild(cue);
    return cue;
  }

  function place() {
    if (!host || !cue) return;
    var f = hostRect();
    if (!f.width || !f.height) return hide();
    cue.classList.toggle('is-boxed', !!swapped(host));
    // The PAINTED box, not offsetWidth/offsetHeight: those are whole
    // pixels, and a line 78.34 wide reported as 78 cuts a third of a
    // pixel off the wrong end of the clip.
    var cb = cue.getBoundingClientRect();
    var w = cb.width, h = cb.height;
    // On the pointer; or, where the hand is on the title, either held
    // where the pointer left it or — if the hand never was on the
    // picture — in its middle.
    // IN THE MIDDLE OF A PICTURE, THE LINE RIDES THE DOCUMENT (2026-09-18).
    // Fixed to the viewport, its seat is the PICTURE's — which scrolls —
    // so the seat had to be rewritten every tick, and a fixed thing
    // rewritten from a moving reference is a frame behind the page it
    // stands on: the words swam against the picture. Centred, it is
    // ABSOLUTE at a point in the document and the browser carries it;
    // nothing is written while the page moves, so nothing can lag. On
    // the pointer it stays fixed, where its seat is the hand's and the
    // hand does not move with a scroll.
    if (mode === 'centre') {
      origin();
      if (cue.__abs !== true) {
        cue.__abs = true;
        cue.style.position = 'absolute';
        cue.style.transform = 'none';
        cue.style.clipPath = 'none';
      }
      cue.style.left = (f.left + window.pageXOffset - originX + (f.width - w) / 2).toFixed(2) + 'px';
      cue.style.top = (f.top + window.pageYOffset - originY + (f.height - h) / 2).toFixed(2) + 'px';
      return;
    }
    if (cue.__abs !== false) {
      cue.__abs = false;
      cue.style.position = 'fixed';
      cue.style.left = '0px';
      cue.style.top = '0px';
    }
    var x = px - w / 2, y = py - h / 2;
    cue.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
    // WHAT HANGS PAST THE PICTURE GOES UNDER IT. Four insets measured
    // against the frame, each 0 while that side is clear — so the line
    // is untouched in the middle of a picture and loses exactly what
    // crosses an edge, without being moved a pixel to do it.
    // AND A PIXEL MORE THAN EXACTLY. A frame's edge falls on a fraction
    // of a pixel, and a clip cut to the fraction leaves the glyph's own
    // antialiasing on the wrong side of it — a hair of the line bleeding
    // past the border it had gone under. Each crossing side is rounded
    // UP and given the border's own pixel besides, so the line goes
    // under the rule rather than up against it. A side that is clear
    // stays at a true 0 and cuts nothing.
    var cut = function (v) { return v > 0 ? Math.ceil(v) + 1 : 0; };
    var t = cut(f.top - y),
        r = cut((x + w) - f.right),
        b = cut((y + h) - f.bottom),
        l = cut(f.left - x);
    cue.style.clipPath = (t || r || b || l)
      ? 'inset(' + t.toFixed(2) + 'px ' + r.toFixed(2) + 'px ' + b.toFixed(2) + 'px ' + l.toFixed(2) + 'px)'
      : 'none';
  }

  function queue() { schedule(place); }

  // THE PAGE MOVES UNDER A STILL HAND. On a scroll the picture travels
  // and the pointer does not, so the words have to be re-seated against
  // the frame's new box — and the cover under the hand may not be the
  // cover that was there a moment ago, or may be no cover at all. The
  // point is asked again and the answer seated. (It USED to hide here,
  // which was wrong the moment the words became the cursor: the arrow
  // is off over a cover, so hiding them left the reader with no pointer
  // at all for as long as the wheel turned.)
  function follow() {
    if (!cue) return;
    var res = resolveFrom(document.elementFromPoint(px, py));
    if (!res) return hide();
    if (res.cover !== host) take(res.cover);
    lightTitle(res.title);
    mode = res.mid ? 'centre' : 'pointer';
    // AND THEY COME BACK. A picture scrolled off the pointer takes them
    // with it; a picture scrolled BACK under a hand that never moved has
    // to have them again, or the reader is left on a cover with no
    // cursor and nothing in its place until they stir.
    place();
    cue.classList.add('is-on');
  }
  // ON THE SCROLL'S OWN TICK, NOT THE NEXT FRAME'S. The line is fixed
  // to a pointer that is not moving; what moves is the PICTURE, and the
  // clip that hides the line under its border is measured against it. A
  // frame's delay on a slow scroll is nothing, but a fast one carries
  // the picture a hundred pixels in that frame and the stale clip shows
  // the whole line standing clear of a picture that has gone — the line
  // escaping its box. A scroll event is dispatched before the paint it
  // belongs to, so the work is done in it.
  function queueFollow() {
    // Nothing to do until the reader has stood on a picture once: no
    // line has been made, so no line can be out of place.
    if (!cue) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    follow();
  }

  // THE GREY IS THIS SCRIPT'S TOO, not the sheet's :hover (2026-09-18).
  // A browser does not re-evaluate :hover while the page scrolls — it
  // waits for the next stir of the mouse — so a picture that arrived
  // under a still hand took its words at once (this hit test runs on
  // the frame) and its grey only when the reader moved, which read as
  // the hover being late. Both hang on the same class now, written
  // here, so the picture and the words answer together on the frame
  // the picture arrives.
  function take(el) {
    if (host === el) return;
    if (host) host.classList.remove('is-cued');
    if (host && host.closest && host.closest(CELLS)) host.closest(CELLS).classList.remove('is-cue-host');
    host = el;
    if (host) host.classList.add('is-cued');
    // (the card holding the cue says so itself — the box's grey reads
    // it, where a :has() on every card cost every style pass a search)
    if (host && host.closest && host.closest(CELLS)) host.closest(CELLS).classList.add('is-cue-host');
    // UNDER THE BOX'S OVERHANG (2026-09-21, late). The resting box
    // reaches 54 onto the picture, ranked 9 in the movement's body —
    // a context of its own (z-index 1) that main's 90 could only stand
    // OVER. So the line goes INTO the body the cover stands in, where
    // the sheet ranks it 8: over the picture (8, and earlier in the
    // body), under the box (9). Its absolute seat is measured again
    // from the new body.
    if (host && cue) {
      var body = host.closest('.movement-body');
      if (body && cue.parentNode !== body) { body.appendChild(cue); seated = false; }
    }
  }
  // THE TITLE'S OWN MARK, off the SAME hit test as the picture's — so
  // the crimson on the words and the grey on the picture begin on one
  // frame. On :hover alone the words waited for the reader to stir
  // after a scroll while the picture had already answered, which is
  // the two marks falling out of step. The sheet lights the crimson
  // from either.
  function lightTitle(el) {
    if (lit === el) return;
    if (lit) lit.classList.remove('is-cued');
    lit = el;
    if (lit) lit.classList.add('is-cued');
  }

  function hide() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    take(null);
    lightTitle(null);
    if (cue) cue.classList.remove('is-on');
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    // THE HAND'S PLACE IS TAKEN FIRST, always — before the question of
    // what is under it, and before any turning back. It is read again
    // on every scroll to ask what has arrived there, and a place left
    // behind the last time the hand was over a picture is a place the
    // hand is no longer at: a cover scrolling under THAT lit the line
    // beside the reader's pointer rather than beneath it. (It was
    // written below the turn-back for a minute, for a seat that needed
    // the previous place; that seat is gone and this is not.)
    px = e.clientX; py = e.clientY;
    var res = resolveFrom(e.target);
    if (!res) return hide();
    if (!cue) make();
    var shown = cue.classList.contains('is-on');
    var was = mode;
    mode = res.mid ? 'centre' : 'pointer';
    take(res.cover);
    lightTitle(res.title);
    // Seated before it is shown, so it never fades in where it last
    // stood and travels across the page to here — and re-seated at once
    // when the hand crosses between the title and the picture, so that
    // crossing is a snap rather than a frame of the old seat.
    if (was !== mode || !shown) { place(); cue.classList.add('is-on'); return; }
    // Held or centred, the line does not follow a hand that is only
    // moving over the words.
    if (mode === 'pointer') queue();
  }, { passive: true });

  // THE PICTURE MOVES UNDER A STILL HAND TOO (2026-09-22): while a card
  // opens or shuts its picture travels for a second under a pointer
  // that need not stir, so the point is asked again on every frame of
  // the move (src/card-open.js says when one starts), as a scroll asks
  // it — Read Now arriving with the picture and leaving with it.
  var travelUntil = 0, travelRaf = 0;
  var travelTick = function () {
    travelRaf = 0;
    if (px == null || py == null) return;
    if (!cue) make();
    follow();
    if (performance.now() < travelUntil) travelRaf = requestAnimationFrame(travelTick);
  };
  window.addEventListener('newcritic:travel', function () {
    travelUntil = performance.now() + 1100;
    if (!travelRaf) travelRaf = requestAnimationFrame(travelTick);
  });
  window.addEventListener('scroll', queueFollow, { passive: true });
  window.addEventListener('resize', queueFollow, { passive: true });
  // And on the press that takes the reader away.
  document.addEventListener('pointerdown', hide, { passive: true });
  window.addEventListener('blur', function () { hide(); inbox(null); });
})();
