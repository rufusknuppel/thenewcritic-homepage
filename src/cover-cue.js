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
  var WORDS = '.card-title, .latest-title, .card-dek, .latest-dek';
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
  // What the point under the hand asks for: which picture is lit, and
  // whether the words are said over it.
  function resolveFrom(node) {
    if (!node || !node.closest) return null;
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
        cover: direct, say: true, mid: false,
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
        return { cover: host, say: true, mid: true, title: within.querySelector(TITLES) };
      }
      return null;
    }
    var cell = words.closest(CELLS);
    var title = words.closest(TITLES) || (cell ? cell.querySelector(TITLES) : null);
    var cover = cell ? cell.querySelector('.card-image-link, .latest-cover') : null;
    return cover ? { cover: cover, say: true, mid: true, title: title } : null;
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

  function make() {
    cue = document.createElement('span');
    cue.className = 'cover-cue';
    // It speaks to the eye, not to a reader on a screen reader: the
    // link it stands on already says where it goes.
    cue.setAttribute('aria-hidden', 'true');
    cue.textContent = 'Read Now';
    document.body.appendChild(cue);
    return cue;
  }

  function place() {
    if (!host || !cue) return;
    var f = host.getBoundingClientRect();
    if (!f.width || !f.height) return hide();
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
    host = el;
    if (host) host.classList.add('is-cued');
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

  window.addEventListener('scroll', queueFollow, { passive: true });
  window.addEventListener('resize', queueFollow, { passive: true });
  // And on the press that takes the reader away.
  document.addEventListener('pointerdown', hide, { passive: true });
  window.addEventListener('blur', hide);
})();
