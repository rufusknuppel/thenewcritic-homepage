// THE ARCHIVE ON THE FRONT PAGE'S HEAD (2026-10-22; build.js renderArchivePage, style.css THE ARCHIVE ON THE FRONT
// PAGE'S HEAD): the front page's THE NEW CRITIC and the band under it, seated as latest-rail.js seats them there; then
// the ledger's own — the head's arrows sort, Shuffle deals, the field searches, the hash filters, and the cards'
// deep links land on their row.
(function () {
  var de = document.documentElement;
  var main = document.querySelector('main.has-mega'), band = main && main.querySelector('.op-band');
  var cn = document.querySelector('a.content-name');
  // (the nav upright and the socials as they stand on the front page, which latest-rail.js marks this way there)
  if (main) main.classList.add('logo-split');

  // THE BAND UNDER THE NAME, as the front page lays it (latest-rail.js, THE OPENING): its place in main (--op-mt), the
  // scroll at which it pins (--op-s, for THE NEW CRITIC's coming into it), THE, NEW and CRITIC's middles (--opb-the,
  // --opb-new, --opb-critic), the nav's ink on the left edge of THE's T's stem, the socials' as far in from the right,
  // THE LAST MAGAZINE on the middle between the two (--opb-nav-l, --opb-soc-r, --opb-tlm)
  var last = '', cx = null;
  var glyph = function (el, end) {
    var t = (el.textContent || '').trim(), ch = end ? t.slice(-1) : t.charAt(0), cs = getComputedStyle(el);
    cx = cx || document.createElement('canvas').getContext('2d');
    cx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var m = cx.measureText(ch || 'S');
    return { l: m.actualBoundingBoxLeft || 0, over: (m.actualBoundingBoxRight || 0) - (m.width || 0) };
  };
  var lay = function () {
    if (!main || !band || !cn) return;
    var h = window.innerWidth >= 1024 && band.offsetHeight ? cn.offsetHeight + band.offsetHeight : 0;
    var mt = h - (main.getBoundingClientRect().top + (window.pageYOffset || 0));
    var ws = cn.querySelectorAll('.content-name__block .tnc-words svg');
    var mids = [].map.call(ws, function (w) { var r = w.getBoundingClientRect(); return (r.left + r.right) / 2; });
    var navE = band.querySelector('.rail-top'), socE = band.querySelector('.rail-socials');
    var key = [h, mt, navE ? navE.offsetWidth : 0, socE ? socE.offsetWidth : 0].concat(mids).map(function (v) { return v.toFixed(1); }).join('|');
    if (key === last) return;
    last = key;
    band.style.setProperty('--op-mt', mt.toFixed(1) + 'px');
    // (the ledger begins on the band's foot, its head pinning under the band)
    de.style.setProperty('--arc-top', Math.max(0, mt).toFixed(1) + 'px');
    de.style.setProperty('--arc-band', band.offsetHeight + 'px');
    de.style.setProperty('--op-s', cn.offsetHeight.toFixed(1) + 'px');
    ['--opb-the', '--opb-new', '--opb-critic'].forEach(function (v, k) { if (mids[k] != null) band.style.setProperty(v, mids[k].toFixed(1) + 'px'); });
    if (navE && socE && ws[0]) {
      var nw = navE.getBoundingClientRect().width, sw = socE.getBoundingClientRect().width, vw = de.clientWidth;
      var tR = ws[0].getBoundingClientRect();
      var stemX = tR.height ? Math.round(tR.left + tR.height * 45.3 / 300) : 27;
      var navA = navE.querySelector('.rail-top__nav > *') || navE, socAs = socE.querySelectorAll('a, span'), socA = socAs.length ? socAs[socAs.length - 1] : socE;
      var navL = stemX + glyph(navA, false).l, socR = stemX + glyph(socA, true).over - 1;
      band.style.setProperty('--opb-nav-l', navL.toFixed(2) + 'px');
      band.style.setProperty('--opb-soc-r', socR.toFixed(2) + 'px');
      band.style.setProperty('--opb-tlm', ((navL + nw + vw - socR - sw) / 2).toFixed(1) + 'px');
      // (THE LAST MAGAZINE as wide as the nav and 25, as latest-rail.js sizes it)
      var tlm = band.querySelector(':scope > .rail-tlm'), lwt = tlm ? parseFloat(tlm.style.getPropertyValue('--rl-lwt')) || 0 : 0;
      if (lwt > 0) band.style.setProperty('--rl-tlmf', ((nw + 25) / lwt).toFixed(3) + 'px');
      // (the ledger's sides on the nav's ink and the socials')
      de.style.setProperty('--arc-l', navL.toFixed(2) + 'px');
      de.style.setProperty('--arc-r', socR.toFixed(2) + 'px');
    }
  };
  var pinned = null;
  var pin = function () {
    if (!cn) return;
    var on = (window.pageYOffset || 0) >= cn.offsetHeight - 0.5;
    if (on === pinned) return;
    pinned = on;
    cn.classList.toggle('op-pinned', on);
  };
  window.addEventListener('scroll', pin, { passive: true });
  window.addEventListener('resize', function () { last = ''; setTimeout(lay, 80); pinned = null; pin(); });
  window.addEventListener('load', function () { lay(); pin(); setTimeout(lay, 300); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { last = ''; lay(); });
  lay();
  pin();

  // THE LEDGER
  var arc = document.querySelector('.arc'), body = arc && arc.querySelector('.arc-body');
  if (!body) return;
  var rows = [].slice.call(body.querySelectorAll('.arc-row'));
  var head = arc.querySelector('.arc-head');
  var sortBtns = [].slice.call(arc.querySelectorAll('.arc-sort button'));
  var none = arc.querySelector('.arc-none');
  var reorder = function (list) { list.forEach(function (r) { body.appendChild(r); }); };
  var setActive = function (btn) { sortBtns.forEach(function (b) { b.classList.toggle('is-on', b === btn); }); };
  sortBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-key'), desc = btn.getAttribute('data-dir') === 'desc';
      reorder(rows.slice().sort(function (a, b) {
        var av = a.getAttribute('data-' + k) || '', bv = b.getAttribute('data-' + k) || '';
        var c = k === 'date' ? Number(av) - Number(bv) : av.localeCompare(bv);
        return desc ? -c : c;
      }));
      setActive(btn);
    });
  });
  var shuffle = arc.querySelector('.arc-shuffle');
  if (shuffle) shuffle.addEventListener('click', function () {
    var a = rows.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    reorder(a);
    setActive(null);
  });
  // (newest first as it loads: the Date column's down arrow lit)
  setActive(arc.querySelector('.arc-sort button[data-key="date"][data-dir="desc"]'));

  // (the hash: #section=, #topic= and #author= keep only that kind's rows; #sort=<key>&post=<slug> sorts by the column
  // — newest first for the date, A to Z for the rest — and lands on the named row)
  var readHash = function () {
    var hp = {};
    location.hash.slice(1).split('&').forEach(function (kv) {
      var eq = kv.indexOf('=');
      if (eq > 0) hp[kv.slice(0, eq)] = decodeURIComponent(kv.slice(eq + 1));
    });
    return hp;
  };
  var search = arc.querySelector('.arc-search'), clear = arc.querySelector('.arc-clear');
  var textOf = function (r) {
    if (r.__t == null) r.__t = [r.getAttribute('data-title'), r.getAttribute('data-author'), r.getAttribute('data-kicker'),
      r.getAttribute('data-section'), (r.querySelector('.arc-date') || {}).textContent || ''].join(' ').toLowerCase();
    return r.__t;
  };
  var filtered = false;
  var applyFilter = function () {
    var hp = readHash();
    var sec = (hp.section || '').toLowerCase(), topic = (hp.topic || '').toLowerCase(), author = (hp.author || '').toLowerCase();
    var words = search ? search.value.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];
    filtered = !!(sec || topic || author || words.length);
    var shown = 0;
    rows.forEach(function (r) {
      var on = (!sec || r.getAttribute('data-section') === sec)
        && (!topic || r.getAttribute('data-kicker') === topic)
        && (!author || r.getAttribute('data-author') === author);
      if (on) for (var w = 0; w < words.length; w++) if (textOf(r).indexOf(words[w]) < 0) { on = false; break; }
      r.hidden = !on;
      if (on) shown++;
    });
    if (clear) clear.hidden = !filtered;
    if (none) none.hidden = shown > 0;
  };

  // THE LANDING: a named row in the middle of the room under the band and the column head; filtered with none named,
  // the head on the band's foot
  var target = null;
  var land = function () {
    if (!target && !filtered) return;
    var top = (band ? band.getBoundingClientRect().height : 0) + (head ? head.offsetHeight : 0);
    var y;
    if (target) {
      var r = target.getBoundingClientRect(), room = de.clientHeight - top;
      y = window.pageYOffset + r.top - top - Math.max(0, (room - r.height) / 2);
    } else {
      y = window.pageYOffset + (head || arc).getBoundingClientRect().top - (band ? band.getBoundingClientRect().height : 0);
    }
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  };
  var hp0 = readHash();
  if (hp0.sort) {
    var sb = arc.querySelector('.arc-sort button[data-key="' + hp0.sort + '"][data-dir="' + (hp0.sort === 'date' ? 'desc' : 'asc') + '"]');
    if (sb) sb.click();
  }
  if (hp0.post) rows.forEach(function (r) { if (r.getAttribute('data-slug') === hp0.post) target = r; });
  if (target) target.classList.add('is-target');
  applyFilter();
  if (target || filtered) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // (the faces and the band's seat settle after the first frame: the landing is taken again till the reader moves)
    var tries = 0, settle = setInterval(function () { lay(); land(); if (++tries >= 8) clearInterval(settle); }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { clearInterval(settle); }, { once: true, passive: true }); });
    land();
  }
  addEventListener('hashchange', function () { target = null; applyFilter(); land(); });
  if (search) {
    search.addEventListener('input', applyFilter);
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { search.value = ''; applyFilter(); search.blur(); }
      if (e.key === 'Enter') e.preventDefault();
    });
  }
  if (clear) clear.addEventListener('click', function () {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    if (search) search.value = '';
    applyFilter();
  });
})();
