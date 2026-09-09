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
    // 72 FROM THE COLUMN HEAD'S FOOT TO THE FIRST BAND'S INK: the row's
    // box carries the line's leading over its caps, so the ledger's air
    // is cut by what stands between the row's top and the ink.
    if (ledger && body) {
      var firstCell = body.querySelector('.ledger-row .ledger-cell');
      if (firstCell) {
        ledger.style.paddingTop = '';
        var fcs = getComputedStyle(firstCell);
        var cv2 = document.createElement('canvas').getContext('2d');
        if (cv2) {
          cv2.font = fcs.fontStyle + ' ' + fcs.fontWeight + ' ' + fcs.fontSize + ' ' + fcs.fontFamily;
          var mm = cv2.measureText((firstCell.textContent || '').trim() || 'X');
          var probe2 = document.createElement('span');
          probe2.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
          firstCell.appendChild(probe2);
          var base2 = probe2.getBoundingClientRect().bottom;
          firstCell.removeChild(probe2);
          var rowTop = firstCell.parentElement.getBoundingClientRect().top;
          var inkIn = base2 - mm.actualBoundingBoxAscent - rowTop;
          if (isFinite(inkIn)) ledger.style.paddingTop = Math.round(72 - inkIn) + 'px';
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
        under = !!(above && above.closest && above.closest('.ledger-band--head, .ledger-head, .ledger-deck--crimson'));
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
  if (hashParams.post) {
    var target = null;
    items.forEach(function(it){
      if (it.getAttribute('data-slug') === hashParams.post) target = it;
    });
    if (target) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      target.classList.add('is-target');
      var jumpPoll = null;
      function cancelJumpPoll() {
        if (jumpPoll != null) { clearInterval(jumpPoll); jumpPoll = null; }
      }
      function jumpToTarget() {
        if (document.documentElement.clientHeight > 0) {
          cancelJumpPoll();
          // Centred in the room UNDER the stuck word, not in the
          // viewport — centred in the viewport, the row lands under
          // the mast and only the plate's foot shows.
          var headEl = document.querySelector('.ledger-head');
          var mastH = headEl ? headEl.offsetHeight : 0;
          var tr = target.getBoundingClientRect();
          var room = document.documentElement.clientHeight - mastH;
          var y = window.scrollY + tr.top - mastH - Math.max(0, (room - tr.height) / 2);
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
            jumpToTarget();
          }
        }, 300);
      }
      jumpToTarget();
      if (document.readyState === 'complete') {
        requestAnimationFrame(jumpToTarget);
      } else {
        addEventListener('load', function () {
          requestAnimationFrame(jumpToTarget);
        });
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(jumpToTarget);
      }
    }
  }
})();
