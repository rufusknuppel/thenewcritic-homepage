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
  function fitInkAir() {
    var ledgerBody = document.querySelector('.movement.m--ledger > .movement-body');
    if (ledgerBody && body) {
      ledgerBody.style.marginBottom = '';
      var rows = body.querySelectorAll('.ledger-item:not(.is-filtered-out)');
      var lastTitle = rows.length ? rows[rows.length - 1].querySelector('.lc-title') : null;
      var ink = lastTitle && inkOf(lastTitle);
      if (ink) ledgerBody.style.marginBottom = (ink.bottom - ledgerBody.getBoundingClientRect().bottom).toFixed(2) + 'px';
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
    document.fonts.load('700 100px "OPS Placard"').then(fitMast, function(){});
    if (document.fonts.ready) document.fonts.ready.then(fitMast, function(){});
  }
  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { fitMast(); markAtTop(); }, 100);
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
  function applyFilter() {
    var hp = readHash();
    var sec = hp.section || '', topic = hp.topic || '';
    filtered = !!(sec || topic);
    items.forEach(function(it){
      var show = (!sec || it.getAttribute('data-section') === sec)
        && (!topic || it.getAttribute('data-kicker') === topic);
      it.classList.toggle('is-filtered-out', !show);
    });
    fitMast();
  }
  applyFilter();
  addEventListener('hashchange', function () { applyFilter(); land(); requestAnimationFrame(land); });

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
    // the landing is re-taken on each until the reader moves.
    var settle = 0;
    var settleTimer = setInterval(function () {
      land();
      if (++settle >= 8) clearInterval(settleTimer);
    }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      addEventListener(ev, function () { clearInterval(settleTimer); }, { once: true, passive: true });
    });
  }
})();
