(function(){
  // THE ARCHIVE LEDGER (see renderArchivePage / renderLedgerRow in
  // build.js): the word at the head is sized to the page; a band opens
  // its plate on click (an accordion — one plate at a time); the head's
  // arrows sort, the shuffle deals; deep links from the cards land on a
  // sorted, opened item.
  var ledger = document.querySelector('.ledger');
  var body = ledger && ledger.querySelector('.ledger-body');
  var items = body ? [].slice.call(body.querySelectorAll('.ledger-item')) : [];

  // THE WORD AT THE HEAD, sized as the homepage's banners are: the
  // masthead's own size (THE NEW CRITIC's ink spanning the measure —
  // the width less one side each way), then the letters tracked out
  // until ARCHIVE's ink spans the same measure. The ink is read off a
  // canvas at that size, so the word sits AIR over its caps and AIR
  // under its feet, and its first ink stands on the left side.
  function fitMast() {
    // Every word band on the page — ARCHIVE, SUBSCRIBE, the closing
    // deck (ABOUT, STORE, EVENTS) and the reprint — sized alike.
    [].forEach.call(document.querySelectorAll(
      '.ledger-mast, .ledger-subscribe, .ledger-deck, .ledger-reprint'
    ), fitWordBand);
    // THE FOOT FIELD: a viewport less the colophon band and the reprint,
    // so the page closes on exactly one screen — band, field, name.
    // THE SPACER UNDER THE WORD: a viewport less the word and the band,
    // so the page opens on exactly one screen — word, ground, band.
    var spacer = document.querySelector('.ledger-spacer');
    var mastEl = document.querySelector('.ledger-mast');
    var pin = document.querySelector('.ledger-pin');
    // Only the BAND shows on the first screen: the head stands just
    // under the fold and comes up with it.
    var headBand = pin && pin.querySelector('.ledger-band--head');
    if (spacer && mastEl && headBand) {
      var open = document.documentElement.clientHeight - mastEl.offsetHeight - headBand.offsetHeight;
      spacer.style.height = Math.round(Math.max(0, open)) + 'px';
    }
    // (The column head overtakes the band and pins at the top itself —
    // style.css; nothing to seat here.)
    // THE FIRST ROW STANDS UNDER THE HEAD AT THE ROWS' OWN SPACING
    // (2026-09-17): the air between the head's foot rule and the first
    // row's ink is the air between one row's ink and the next's — the
    // row's height less its ink — so the ledger is padded by that less
    // what the row already carries over its ink.
    if (ledger && body) {
      var firstTitle = body.querySelector('.ledger-item:not(.is-filtered-out) .ledger-row .lc-title');
      if (firstTitle) {
        ledger.style.paddingTop = '';
        var ink0 = inkOf(firstTitle);
        var row0 = firstTitle.closest('.ledger-row');
        if (ink0 && row0) {
          var rr = row0.getBoundingClientRect();
          var gap = rr.height - (ink0.bottom - ink0.top);
          var over = ink0.top - rr.top;
          ledger.style.paddingTop = Math.max(0, gap - over).toFixed(2) + 'px';
        }
        // CLEAR FILTER STANDS WHERE THE FIRST ROW'S COURIER STANDS,
        // in the search column (2026-09-17): the head carries it, so
        // it holds that seat as the ledger scrolls under the pinned
        // head. The seat is the first row's line measured from the
        // ledger's own top (a fixed distance, pinned or not) below
        // the head's foot.
        var clearEl = document.querySelector('.ledger-head .arch-clear');
        var headEl = document.querySelector('.ledger-head');
        var move = document.querySelector('.m--ledger');
        if (clearEl && headEl && move && row0) {
          var rr2 = row0.getBoundingClientRect();
          var seat = rr2.top - move.getBoundingClientRect().top + headEl.offsetHeight;
          clearEl.style.top = seat.toFixed(2) + 'px';
          clearEl.style.height = rr2.height.toFixed(2) + 'px';
          clearEl.style.lineHeight = rr2.height.toFixed(2) + 'px';
        }
      }
    }
    var field = document.querySelector('.ledger-field');
    var foot = document.querySelector('.ledger-band--foot');
    var reprint = document.querySelector('.ledger-reprint');
    if (field && foot && reprint) {
      var left = document.documentElement.clientHeight - foot.offsetHeight - reprint.offsetHeight;
      field.style.height = Math.round(Math.max(0, left)) + 'px';
    }
    fitInkAir();
  }
  // THE AIR IS MEASURED TO THE INK (2026-09-17). The banners and the
  // reprint open 72 over their caps and close 72 under their feet on
  // their own (duo-panel-fit.js, fillNameBand), so a block whose box
  // meets theirs meets their ink at 72 — what is seated here is the
  // TEXT'S side of each meeting: the block is drawn up or padded until
  // its own first or last line of ink stands where its box edge would.
  // On the archive: the last row's ink 72 over the reprint's caps. On
  // About: the first card's ink 72 under ABOUT's feet, the last card's
  // ink 72 over the Secession's cell.
  var AIR = 72;
  function inkOf(el) {
    // The ink of a text block's first and last lines, viewport
    // coordinates: the baselines off a zero-size inline probe at each
    // end, the ascent and descent off a canvas measure of its text.
    var cs = getComputedStyle(el);
    var cv = document.createElement('canvas').getContext('2d');
    if (!cv) return null;
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var txt = (el.textContent || '').trim() || 'X';
    if (cs.textTransform === 'uppercase') txt = txt.toUpperCase();
    var m = cv.measureText(txt);
    if (m.actualBoundingBoxAscent == null) return null;
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(probe, el.firstChild);
    var base1 = probe.getBoundingClientRect().bottom;
    el.appendChild(probe);
    var base2 = probe.getBoundingClientRect().bottom;
    el.removeChild(probe);
    return { top: base1 - m.actualBoundingBoxAscent, bottom: base2 + m.actualBoundingBoxDescent };
  }
  // EVERY SYMBOL IN THE HEAD STANDS ON THE INK'S CENTRE (2026-09-17):
  // the sort arrows, the shuffle, the glass and the X are each seated
  // so the middle of their own ink is the middle of the ink of the
  // word beside them — the word's cap top to its baseline (the
  // descender of Tag's g is left out, so every column's symbols stand
  // on one line). The words' ink is read as the page reads all air:
  // a canvas measure of the letters on a probed baseline.
  function glyphInk(el, text) {
    var cs = getComputedStyle(el);
    var cv = document.createElement('canvas').getContext('2d');
    if (!cv) return null;
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var txt = text != null ? text : ((el.textContent || '').trim() || 'X');
    if (cs.textTransform === 'uppercase') txt = txt.toUpperCase();
    var m = cv.measureText(txt);
    if (m.actualBoundingBoxAscent == null) return null;
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(probe, el.firstChild);
    var base = probe.getBoundingClientRect().bottom;
    el.removeChild(probe);
    return { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent, base: base };
  }
  function svgInk(svg) {
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var bb = null;
    try { bb = svg.getBBox(); } catch (e) {}
    if (!vb || !bb || !vb.height) return { top: r.top, bottom: r.bottom };
    var k = r.height / vb.height;
    return { top: r.top + (bb.y - vb.y) * k, bottom: r.top + (bb.y + bb.height - vb.y) * k };
  }
  function seatOn(el, ink, target) {
    if (!el || !ink || !target) return null;
    // A symbol not on the page (CLEAR FILTER hidden) has no box to
    // seat; it is seated when it appears (applyFilter refits).
    if (!el.getBoundingClientRect().height) return null;
    var want = (target.top + target.bottom) / 2;
    var have = (ink.top + ink.bottom) / 2;
    var cur = parseFloat(el.style.top) || 0;
    el.style.position = 'relative';
    el.style.top = (cur + want - have).toFixed(2) + 'px';
    return want - have;
  }
  function fitSymbols() {
    var head = document.querySelector('.ledger-head');
    if (!head) return [];
    var out = [];
    [].forEach.call(head.querySelectorAll('.ledger-cell'), function (cell) {
      // The word's measure is the face's cap height on its baseline
      // ('H'), not the letters' own reach: Title's l rises past the
      // cap and Tag's g drops under the line, and read letter by
      // letter the columns' symbols would stand on five lines.
      var label = cell.querySelector('.lc-label');
      var lk = label && glyphInk(label, 'H');
      if (lk) lk = { top: lk.top, bottom: lk.base };
      var arrows = cell.querySelector('.arch-sort-arrows');
      if (arrows && lk) {
        var up = arrows.querySelector('.arch-sort[data-dir="asc"]'), dn = arrows.querySelector('.arch-sort[data-dir="desc"]');
        var iu = up && glyphInk(up), idn = dn && glyphInk(dn);
        if (iu && idn) out.push(['arrows', seatOn(arrows, { top: iu.top, bottom: idn.bottom }, lk)]);
      }
      var shuffle = cell.querySelector('.arch-shuffle');
      if (shuffle && lk) out.push(['shuffle', seatOn(shuffle, glyphInk(shuffle), lk)]);
      var field = cell.querySelector('.arch-search');
      var glass = cell.querySelector('.arch-search-glass');
      if (field && glass) {
        // The field's word: its baseline is where a line of its own
        // height sets one — centred in the box by the face's bounds.
        var fcs = getComputedStyle(field);
        var cv = document.createElement('canvas').getContext('2d');
        cv.font = fcs.fontStyle + ' ' + fcs.fontWeight + ' ' + fcs.fontSize + ' ' + fcs.fontFamily;
        var fm = cv.measureText('H');
        var fr = field.getBoundingClientRect();
        var half = (fr.height - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent)) / 2;
        var fbase = fr.top + half + fm.fontBoundingBoxAscent;
        out.push(['glass', seatOn(glass, svgInk(glass), { top: fbase - fm.actualBoundingBoxAscent, bottom: fbase })]);
      }
      var clearLabel = cell.querySelector('.arch-clear-label');
      var x = cell.querySelector('.arch-clear-x');
      if (clearLabel && x) {
        var ck = glyphInk(clearLabel, 'H');
        if (ck) out.push(['x', seatOn(x, svgInk(x), { top: ck.top, bottom: ck.base })]);
      }
    });
    return out;
  }
  try { window.__ncFitSymbols = fitSymbols; } catch (e) {}
  function fitInkAir() {
    fitSymbols();
    var ledgerBody = document.querySelector('.movement.m--ledger > .movement-body');
    if (ledgerBody && body) {
      ledgerBody.style.marginBottom = '';
      // The pad from the last fit (below) is left in place and taken
      // out of the measure by arithmetic: resetting it first shrank
      // the page for a frame and the browser clamped the scroll, so a
      // refit on resize dropped the pinned head down the screen.
      var pad0 = parseFloat(ledgerBody.style.paddingBottom) || 0;
      var rows = body.querySelectorAll('.ledger-item:not(.is-filtered-out)');
      var lastTitle = rows.length ? rows[rows.length - 1].querySelector('.lc-title') : null;
      var ink = lastTitle && inkOf(lastTitle);
      if (ink) ledgerBody.style.marginBottom = (ink.bottom - (ledgerBody.getBoundingClientRect().bottom - pad0)).toFixed(2) + 'px';
      // A FILTERED LEDGER CAN BE SHORTER THAN A SCREEN, and then the
      // column head could never reach the top to pin: the rows' block
      // is padded under its last row by the shortfall, so the head
      // lands on the screen's edge with the rows under it and the
      // page's ground to the reprint.
      var pad = 0;
      if (filtered) {
        var headEl0 = document.querySelector('.ledger-head');
        if (headEl0) {
          var headTopDoc = headEl0.getBoundingClientRect().top + window.scrollY;
          var unpadded = document.documentElement.scrollHeight - pad0;
          var short = document.documentElement.clientHeight - (unpadded - headTopDoc);
          if (short > 0) pad = Math.ceil(short);
        }
      }
      ledgerBody.style.paddingBottom = pad ? pad + 'px' : '';
    }
    var mosaic = document.querySelector('.about-mosaic-block');
    if (mosaic) {
      mosaic.style.marginTop = '';
      mosaic.style.marginBottom = '';
      mosaic.style.paddingBottom = '';
      var firstText = mosaic.querySelector('.about-card > *');
      var i1 = firstText && inkOf(firstText);
      if (i1) mosaic.style.marginTop = (mosaic.getBoundingClientRect().top - i1.top).toFixed(2) + 'px';
      var cards = mosaic.querySelectorAll('.about-card');
      var lastCard = cards.length ? cards[cards.length - 1] : null;
      var lines = lastCard ? lastCard.querySelectorAll('p, li, h3, .about-card-foot') : [];
      var lastText = lines.length ? lines[lines.length - 1] : null;
      var i2 = lastText && inkOf(lastText);
      if (i2) {
        var diff = AIR - (mosaic.getBoundingClientRect().bottom - i2.bottom);
        if (diff >= 0) mosaic.style.paddingBottom = diff.toFixed(2) + 'px';
        else mosaic.style.marginBottom = diff.toFixed(2) + 'px';
      }
    }
  }
  function fitWordBand(mast) {
    var word = mast && mast.querySelector('.ledger-word');
    if (!word) return;
    var mcs = getComputedStyle(mast);
    var side = parseFloat(mcs.getPropertyValue('--ledger-side')) || 72;
    var air = parseFloat(mcs.getPropertyValue('--ledger-air')) || 72;
    var measure = document.documentElement.clientWidth - side * 2;
    if (!(measure > 0)) return;
    word.style.fontSize = '';
    word.style.letterSpacing = '';
    word.style.marginLeft = '';
    word.style.marginTop = '';
    mast.style.height = '';
    var wcs = getComputedStyle(word);
    var face = wcs.fontFamily;
    var weight = wcs.fontWeight;
    var cv = document.createElement('canvas').getContext('2d');
    if (!cv) return;
    var ink = function (text, size) {
      cv.font = weight + ' ' + size + 'px ' + face;
      var m = cv.measureText(text);
      if (m.actualBoundingBoxRight == null) return null;
      return {
        left: -m.actualBoundingBoxLeft,
        right: m.actualBoundingBoxRight,
        asc: m.actualBoundingBoxAscent,
        desc: m.actualBoundingBoxDescent
      };
    };
    var text = (word.textContent || '').trim().replace(/\s+/g, ' ').toUpperCase();
    var cap = ink('THE NEW CRITIC', 100);
    var w = ink(text, 100);
    if (!cap || !w) return;
    var S = measure / ((cap.right - cap.left) / 100);
    var inkW = (w.right - w.left) * S / 100;
    var n = text.length;
    var ls = 0;
    if (inkW > measure) {
      S = S * measure / inkW;
      inkW = measure;
    } else if (n > 1) {
      ls = (measure - inkW) / (n - 1);
    }
    word.style.fontSize = S.toFixed(3) + 'px';
    word.style.letterSpacing = ls.toFixed(3) + 'px';
    word.style.marginLeft = (-(w.left * S / 100)).toFixed(2) + 'px';
    var capH = w.asc * S / 100;
    var descH = Math.max(0, w.desc * S / 100);
    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    word.appendChild(probe);
    var baseY = probe.getBoundingClientRect().bottom - word.getBoundingClientRect().top;
    word.removeChild(probe);
    word.style.marginTop = (air - (baseY - capH)).toFixed(2) + 'px';
    // WHOLE PIXELS: a fractional band height leaves a hairline between
    // one band and the next where the page's canvas shows through.
    mast.style.height = Math.round(air + capH + descH + air) + 'px';
  }
  // A BAND PINNED ON THE SITE'S HEAD DROPS ITS TOP RULE: every band and
  // word band that can pin is marked .is-at-top while its top edge sits
  // on the viewport's (style.css strikes the rule on the mark).
  var pinnable = [].slice.call(document.querySelectorAll(
    '.ledger-band--head, .ledger-head, .ledger-subscribe, .ledger-deck, .ledger-band--foot'
  ));
  // …and .is-at-bottom while its foot sits on the viewport's; the head
  // band is .is-under-word once it has risen to the word's foot (the
  // spacer between them gone), which is when its top rule comes back.
  var mastEl0 = document.querySelector('.ledger-mast');
  // AN OVERTAKER CARRIES THE RULE: a block riding up over a pinned blue
  // band — SUBSCRIBE over the head band, the column head, a deck word
  // over the blue word or the band — is .is-under-band while the pixel
  // above its top edge is a ruled blue band's, and draws the band's
  // bottom rule on its own top edge as it climbs (style.css).
  var overtakers = [].slice.call(document.querySelectorAll(
    '.ledger-subscribe, .ledger-head, .ledger-deck, .ledger-band--foot'
  ));
  function markAtTop() {
    var vh = document.documentElement.clientHeight;
    pinnable.forEach(function (el) {
      var r = el.getBoundingClientRect();
      el.classList.toggle('is-at-top', r.top <= 0.5 && r.bottom > 0.5);
      el.classList.toggle('is-at-bottom', r.bottom >= vh - 0.5 && r.top < vh - 0.5);
      if (el.classList.contains('ledger-band--head') && mastEl0) {
        el.classList.toggle('is-under-word', r.top <= mastEl0.getBoundingClientRect().bottom + 0.5);
      }
    });
    overtakers.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var under = false;
      if (r.top > 1.5 && r.top < vh) {
        var above = document.elementFromPoint(Math.round(r.left + r.width / 2), r.top - 1);
        under = !!(above && above.closest && above.closest('.ledger-band--head, .ledger-head, .ledger-deck--crimson, .section-band'));
      }
      el.classList.toggle('is-under-band', under);
    });
  }
  markAtTop();
  addEventListener('scroll', markAtTop, { passive: true });
  addEventListener('load', markAtTop);
  fitMast();
  addEventListener('load', fitMast);
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 100px helvetica-neue-lt-pro').then(fitMast, function(){});
    if (document.fonts.ready) document.fonts.ready.then(fitMast, function(){});
  }
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    // A refit resets the word bands to measure them, and for that
    // frame the page is shorter: the browser clamps the scroll, and a
    // head pinned on a short (filtered) ledger came down the screen.
    // If the head stood pinned before, it is put back after.
    var headEl = document.querySelector('.ledger-head');
    if (headEl && headEl.getBoundingClientRect().top <= 0.5 && headEl.getBoundingClientRect().bottom > 0.5) relandAfterFit = true;
    resizeTimer = setTimeout(function () {
      fitMast(); markAtTop();
      if (relandAfterFit && filtered && !target) land();
    }, 100);
  });
  // The front page's fitter announces the end of each of its passes
  // (newcritic:fit); its resize pass comes after the one above and
  // resets the word bands as it measures, so the head is put back
  // once more when it is done.
  var relandAfterFit = false;
  window.addEventListener('newcritic:fit', function () {
    if (!relandAfterFit) return;
    if (filtered && !target) { fitMast(); land(); }
    setTimeout(function () { relandAfterFit = false; }, 400);
  });
  // Everything from here on is the ledger's own — the archive's sorts,
  // shuffle and deep links; About carries the word bands alone.
  if (!ledger || !body) return;

  // Column-head sorting: each .arch-sort button carries data-key (title /
  // author / date / kicker / section — mirrored as data-* on every item
  // by renderLedgerRow) and data-dir. Sorting re-appends the item nodes
  // in order; the bands' alternation is by position, so it re-deals.
  var sortBtns = document.querySelectorAll('.arch-sort');
  function reorder(arr) {
    arr.forEach(function(it){ body.appendChild(it); });
  }
  function clearActive() {
    [].forEach.call(sortBtns, function(b){ b.classList.remove('active'); });
  }
  [].forEach.call(sortBtns, function(btn){
    btn.addEventListener('click', function(){
      var key = btn.getAttribute('data-key');
      var desc = btn.getAttribute('data-dir') === 'desc';
      var sorted = items.slice().sort(function(a, b){
        var av = a.getAttribute('data-' + key) || '';
        var bv = b.getAttribute('data-' + key) || '';
        var cmp = key === 'date' ? (Number(av) - Number(bv)) : av.localeCompare(bv);
        return desc ? -cmp : cmp;
      });
      reorder(sorted);
      clearActive();
      btn.classList.add('active');
    });
  });

  var shuffleBtn = document.querySelector('.arch-shuffle');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', function(){
      var arr = items.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      reorder(arr);
      clearActive();
    });
  }


  // Deep links from the cards' bylines and kickers (see archiveHref in
  // build.js): #sort=<key>&post=<slug> sorts the ledger by that column —
  // alphabetical for author/kicker, newest-first for date — and lands
  // on the named post's band (marked .is-target), so the reader finds
  // it with its neighbours around it.
  var hashParams = {};
  location.hash.slice(1).split('&').forEach(function(kv){
    var eq = kv.indexOf('=');
    if (eq > 0) hashParams[kv.slice(0, eq)] = decodeURIComponent(kv.slice(eq + 1));
  });
  // The ledger loads newest first: the Date column's down arrow prints
  // active from the start, so the standing order reads on the head.
  var newestBtn = document.querySelector('.arch-sort[data-key="date"][data-dir="desc"]');
  if (newestBtn) newestBtn.classList.add('active');
  if (hashParams.sort) {
    var dir = hashParams.sort === 'date' ? 'desc' : 'asc';
    var sortBtn = document.querySelector(
      '.arch-sort[data-key="' + hashParams.sort + '"][data-dir="' + dir + '"]'
    );
    if (sortBtn) sortBtn.click();
  }
  // THE LEDGER FILTERED (2026-09-17): #section=<essays|postscript|contra>
  // (the front page's OPS words) or #topic=<kicker> (the categories)
  // hides every row that is not of that kind, and the page lands on the
  // column head, pinned at the top with the kind's rows under it. The
  // hash is read again if it changes in place.
  var readHash = function () {
    var hp = {};
    location.hash.slice(1).split('&').forEach(function(kv){
      var eq = kv.indexOf('=');
      if (eq > 0) hp[kv.slice(0, eq)] = decodeURIComponent(kv.slice(eq + 1)).toLowerCase();
    });
    return hp;
  };
  var filtered = false;
  var clearBtn = document.querySelector('.arch-clear');
  // THE SEARCH (2026-09-17): a courier field in the head's sixth
  // column. Every keystroke narrows the ledger to the rows whose
  // title, author, tag, section or date carries the words typed (each
  // word on its own, in any order); it stacks with the hash's filter,
  // and CLEAR FILTER empties it with the rest.
  var searchEl = document.querySelector('.arch-search');
  var textOf = function (it) {
    if (it.__text == null) {
      it.__text = [it.getAttribute('data-title'), it.getAttribute('data-author'),
        it.getAttribute('data-kicker'), it.getAttribute('data-section'),
        (it.querySelector('.lc-date') || {}).textContent || ''].join(' ').toLowerCase();
    }
    return it.__text;
  };
  // `typed`: the change came from the search field. The full refit
  // (fitMast) resets the word bands to measure them, and for that
  // frame the page is shorter — the browser clamps the scroll and the
  // pinned head, with the field in it, jumped down the screen under
  // the reader's keystroke. Typed, only the air under the rows is
  // re-fitted (fitInkAir: no reset, arithmetic on the last pad), and
  // the head is put on the screen's top edge with the rows under it —
  // a no-op once it stands there.
  function applyFilter(typed) {
    var hp = readHash();
    var sec = hp.section || '', topic = hp.topic || '', author = hp.author || '';
    var words = searchEl ? searchEl.value.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];
    filtered = !!(sec || topic || author || words.length);
    items.forEach(function(it){
      var show = (!sec || it.getAttribute('data-section') === sec)
        && (!topic || it.getAttribute('data-kicker') === topic)
        && (!author || it.getAttribute('data-author') === author);
      if (show && words.length) {
        var t = textOf(it);
        for (var w = 0; w < words.length; w++) if (t.indexOf(words[w]) < 0) { show = false; break; }
      }
      it.classList.toggle('is-filtered-out', !show);
    });
    // CLEAR FILTER stands at the right of the title column's head
    // while a filter is on.
    if (clearBtn) clearBtn.hidden = !filtered;
    if (!typed) { fitMast(); return; }
    fitInkAir();
    if (filtered) {
      var headEl1 = document.querySelector('.ledger-head');
      var move1 = document.querySelector('.m--ledger');
      if (headEl1 && move1) {
        var top1 = move1.getBoundingClientRect().top + window.scrollY - headEl1.offsetHeight;
        if (Math.abs(window.scrollY - top1) > 0.5) window.scrollTo({ top: Math.max(0, top1), behavior: 'instant' });
      }
    }
  }
  applyFilter();
  addEventListener('hashchange', function () { applyFilter(); land(); requestAnimationFrame(land); });
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      // The hash goes without a jump: the rows come back where the
      // reader stands.
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
      if (searchEl) { searchEl.value = ''; searchEl.dispatchEvent(new Event('input')); return; }
      applyFilter();
    });
  }
  if (searchEl) {
    // Typing filters in place; the head is not re-landed on — the
    // reader is at the field, which is in the head.
    // THE FIELD IS AS WIDE AS ITS WORD: Search, or what is typed,
    // measured in its own face, so the glass stands beside it.
    // Measured on a mirror of the text set in the field's own style
    // (a canvas estimate ran short of the laid-out italic and the
    // field scrolled its first letters out of its box), with the
    // field's own side padding for the italic's overhang.
    var mirror = document.createElement('span');
    mirror.className = 'arch-search-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    searchEl.parentNode.insertBefore(mirror, searchEl);
    var sizeField = function () {
      var cs = getComputedStyle(searchEl);
      mirror.style.font = cs.font;
      mirror.style.letterSpacing = cs.letterSpacing;
      mirror.textContent = searchEl.value || searchEl.placeholder || '';
      var padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      // Six of slack past the word: the caret stands after the last
      // letter and the browser scrolls the field to show it, and with
      // no room it scrolled the first letter's edge out of the box.
      searchEl.style.width = Math.ceil(mirror.getBoundingClientRect().width + padX + 6) + 'px';
    };
    sizeField();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeField);
    searchEl.addEventListener('input', function () { sizeField(); applyFilter(true); });
    // The glass beside the field puts the caret in it.
    var glass = document.querySelector('.arch-search-glass');
    if (glass) glass.addEventListener('click', function () { searchEl.focus(); });
    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { searchEl.value = ''; searchEl.dispatchEvent(new Event('input')); searchEl.blur(); }
      if (e.key === 'Enter') e.preventDefault();
    });
  }

  var target = null;
  if (hashParams.post) {
    items.forEach(function(it){
      if (it.getAttribute('data-slug') === hashParams.post) target = it;
    });
    if (target) target.classList.add('is-target');
  }
  // THE LANDING: on the named row, centred in the room under the
  // pinned head; or, filtered with no row named, on the head itself.
  // The page's blocks are fitted as the fonts arrive, so the landing
  // is re-taken for a while until the reader moves.
  var jumpPoll = null;
  function cancelJumpPoll() {
    if (jumpPoll != null) { clearInterval(jumpPoll); jumpPoll = null; }
  }
  function land() {
    if (!target && !filtered) return;
    if (document.documentElement.clientHeight > 0) {
      cancelJumpPoll();
      var headEl = document.querySelector('.ledger-head');
      var mastH = headEl ? headEl.offsetHeight : 0;
      var y;
      if (target) {
        var tr = target.getBoundingClientRect();
        var room = document.documentElement.clientHeight - mastH;
        y = window.scrollY + tr.top - mastH - Math.max(0, (room - tr.height) / 2);
      } else {
        y = headEl ? window.scrollY + headEl.getBoundingClientRect().top : 0;
      }
      window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
      return;
    }
    if (jumpPoll != null) return;
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      addEventListener(ev, cancelJumpPoll, { once: true, passive: true });
    });
    jumpPoll = setInterval(function () {
      if (document.documentElement.clientHeight > 0) {
        fitMast();
        land();
      }
    }, 300);
  }
  if (target || filtered) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    land();
    if (document.readyState === 'complete') {
      requestAnimationFrame(land);
    } else {
      addEventListener('load', function () { requestAnimationFrame(land); });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(land);
    }
    // The feature block's cards are fitted a while after the fonts;
    // the landing is re-taken every quarter second until the page has
    // held still under it twice running (or four seconds have gone),
    // or the reader moves.
    var settle = 0, still = 0;
    var settleTimer = setInterval(function () {
      var headEl = document.querySelector('.ledger-head');
      var before = headEl ? headEl.getBoundingClientRect().top : 0;
      land();
      var after = headEl ? headEl.getBoundingClientRect().top : 0;
      still = (Math.abs(before) < 1 && Math.abs(after) < 1) ? still + 1 : 0;
      if (++settle >= 16 || still >= 2) clearInterval(settleTimer);
    }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      addEventListener(ev, function () { clearInterval(settleTimer); }, { once: true, passive: true });
    });
  }
})();
