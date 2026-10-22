// THE ARCHIVE ON THE FRONT PAGE'S HEAD (2026-10-22; build.js renderArchivePage, style.css THE ARCHIVE ON THE FRONT
// PAGE'S HEAD): the front page's THE NEW CRITIC and the band under it, seated as latest-rail.js seats them there, and
// the side column under the socials as it stands there; then the ledger's own — the head's words sort, Shuffle deals,
// the sections and the field narrow it, the line under the sections counts what is left, and the cards' deep links
// land on their row.
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
      // (the side column as the front page's stands: its gray rule as far left of the socials as they stand in from the
      // window's right, give or take the rounding of the front page's rows (latest-rail.js reads it off them there); its
      // hold the socials' own box; the bird as tall as the name's capitals)
      var sq = socE.getBoundingClientRect(), colX = Math.floor(sq.left - (vw - sq.right)) - 2;
      de.style.setProperty('--arc-col', colX + 'px');
      de.style.setProperty('--arc-hold-x', (sq.left - colX).toFixed(2) + 'px');
      de.style.setProperty('--arc-hold-w', sq.width.toFixed(2) + 'px');
      if (tR.height) de.style.setProperty('--arc-bird', tR.height.toFixed(2) + 'px');
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
  var none = arc.querySelector('.arc-none');
  var reorder = function (list) { list.forEach(function (r) { body.appendChild(r); }); };

  // (a word in the head sorts by its column — A to Z, the date newest first — and again the other way; the column the
  // ledger stands in red, its arrow beside it; Shuffle deals the rows and stands red till a column is chosen)
  var sortBtns = [].slice.call(arc.querySelectorAll('.arc-head .arc-sort'));
  var shuffle = arc.querySelector('.arc-shuffle');
  var mark = function (btn, dir) {
    sortBtns.forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) b.setAttribute('data-dir', dir); else b.removeAttribute('data-dir');
    });
    if (shuffle) shuffle.classList.toggle('is-on', !btn);
  };
  var sortBy = function (k, dir) {
    reorder(rows.slice().sort(function (a, b) {
      var av = a.getAttribute('data-' + k) || '', bv = b.getAttribute('data-' + k) || '';
      var c = k === 'date' ? Number(av) - Number(bv) : av.localeCompare(bv);
      // (ties newest first, whatever the column)
      if (!c && k !== 'date') return Number(b.getAttribute('data-date')) - Number(a.getAttribute('data-date'));
      return dir === 'desc' ? -c : c;
    }));
    mark(arc.querySelector('.arc-head .arc-sort[data-key="' + k + '"]'), dir);
  };
  sortBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-key');
      var dir = btn.classList.contains('is-on') ? (btn.getAttribute('data-dir') === 'asc' ? 'desc' : 'asc') : (k === 'date' ? 'desc' : 'asc');
      sortBy(k, dir);
    });
  });
  if (shuffle) shuffle.addEventListener('click', function () {
    var a = rows.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    reorder(a);
    mark(null);
  });
  mark(arc.querySelector('.arc-head .arc-sort[data-key="date"]'), 'desc');

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
  var count = arc.querySelector('.arc-count');
  var secAs = [].slice.call(arc.querySelectorAll('.arc-sections__a'));
  var textOf = function (r) {
    if (r.__t == null) r.__t = [r.getAttribute('data-title'), r.getAttribute('data-author'), r.getAttribute('data-kicker'),
      r.getAttribute('data-section'), (r.querySelector('.arc-date') || {}).textContent || ''].join(' ').toLowerCase();
    return r.__t;
  };
  // THE LINE UNDER THE SECTIONS: what the ledger holds, in words — "Ninety-six pieces since May 2025", "Five pieces by
  // Theodore Gary since February 2026", "Nothing matches “zzz”"
  var ONES = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var inWords = function (n) { return n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : String(n); };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var nameOf = function (attr, v) {
    // (the name as the ledger prints it, not the lowercased key)
    var cls = { author: '.arc-author', kicker: '.arc-kicker', section: '.arc-section' }[attr];
    for (var i = 0; i < rows.length; i++) if (rows[i].getAttribute('data-' + attr) === v) {
      var c = rows[i].querySelector(cls); if (c) return c.textContent;
    }
    return v;
  };
  var say = function (n, oldest, f) {
    if (!count) return;
    // (a name, a tag or the words typed kept on one line, and the month with its year)
    var nb = function (t) { return String(t).replace(/ /g, '\u00A0'); };
    var q = function (t) { return '“' + nb(t) + '”'; };
    // (what the reader narrowed to, kept in the line whether anything is left or not — "Nothing on “Books” matches
    // “camp”", not "Nothing matches “camp”", which a reader would take for the whole archive)
    var ctx = '';
    if (f.sec) ctx += ' in ' + nb(nameOf('section', f.sec));
    if (f.author) ctx += ' by ' + nb(nameOf('author', f.author));
    if (f.topic) ctx += ' on ' + q(nameOf('kicker', f.topic));
    var t = !n ? 'nothing' + ctx + (f.words ? ' matches ' + q(f.words) : '')
      : inWords(n) + (n === 1 ? ' piece' : ' pieces') + ctx + (f.words ? ' matching ' + q(f.words) : '')
        + (n > 1 && oldest ? ' since ' + MONTHS[oldest.getMonth()] + '\u00A0' + oldest.getFullYear() : '');
    count.textContent = t.charAt(0).toUpperCase() + t.slice(1);
  };
  var filtered = false;
  var applyFilter = function () {
    var hp = readHash();
    var sec = (hp.section || '').toLowerCase(), topic = (hp.topic || '').toLowerCase(), author = (hp.author || '').toLowerCase();
    var typed = search ? search.value.trim() : '';
    var words = typed.toLowerCase().split(/\s+/).filter(Boolean);
    filtered = !!(sec || topic || author || words.length);
    var shown = 0, oldest = Infinity;
    rows.forEach(function (r) {
      var on = (!sec || r.getAttribute('data-section') === sec)
        && (!topic || r.getAttribute('data-kicker') === topic)
        && (!author || r.getAttribute('data-author') === author);
      if (on) for (var w = 0; w < words.length; w++) if (textOf(r).indexOf(words[w]) < 0) { on = false; break; }
      r.hidden = !on;
      if (on) { shown++; var d = Number(r.getAttribute('data-date')); if (d && d < oldest) oldest = d; }
    });
    // (the section the reader is in, in red; THE ARCHIVE when no kind of post is singled out)
    var here = topic || author ? null : sec;
    secAs.forEach(function (a) {
      var on = here != null && a.getAttribute('data-section') === here;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    say(shown, oldest < Infinity ? new Date(oldest) : null, { sec: sec, topic: topic, author: author, words: typed });
    if (clear) clear.hidden = !filtered;
    if (none) none.hidden = shown > 0;
  };

  // THE LANDING: a named row in the middle of the room under the band and the column head. A filter lands nowhere — the
  // ledger opens under the name, the section in red beside it — but a reader already down the ledger when it narrows
  // is put back at its head, pinned under the band, rather than left under the rows that went
  var target = null;
  var bandH = function () { return band ? band.getBoundingClientRect().height : 0; };
  var land = function () {
    if (!target) return;
    var top = bandH() + (head ? head.offsetHeight : 0);
    var r = target.getBoundingClientRect(), room = de.clientHeight - top;
    window.scrollTo({ top: Math.max(0, window.pageYOffset + r.top - top - Math.max(0, (room - r.height) / 2)), behavior: 'instant' });
  };
  var arcMain = arc.querySelector('.arc-main') || arc;
  var toHead = function () {
    // (four past the pin, so the name's round letters, which hang a little under its box, are gone over the band)
    var y = window.pageYOffset + arcMain.getBoundingClientRect().top - bandH() + 4;
    if (window.pageYOffset > y + 0.5) window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  };
  var hp0 = readHash();
  if (hp0.sort && arc.querySelector('.arc-head .arc-sort[data-key="' + hp0.sort + '"]')) sortBy(hp0.sort, hp0.sort === 'date' ? 'desc' : 'asc');
  if (hp0.post) rows.forEach(function (r) { if (r.getAttribute('data-slug') === hp0.post) target = r; });
  if (target) target.classList.add('is-target');
  applyFilter();
  if (target) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // (the faces and the band's seat settle after the first frame: the landing is taken again till the reader moves)
    var tries = 0, settle = setInterval(function () { lay(); land(); if (++tries >= 8) clearInterval(settle); }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { clearInterval(settle); }, { once: true, passive: true }); });
    land();
  }
  addEventListener('hashchange', function () {
    if (target) target.classList.remove('is-target');
    target = null; applyFilter(); toHead();
  });
  // (THE ARCHIVE: every section again, the field's words kept)
  secAs.forEach(function (a) {
    if (a.getAttribute('data-section')) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      try { history.replaceState(null, '', location.pathname + location.search); } catch (er) { location.hash = ''; }
      applyFilter(); toHead();
    });
  });
  if (search) {
    search.addEventListener('input', function () { applyFilter(); toHead(); });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { search.value = ''; applyFilter(); search.blur(); }
      if (e.key === 'Enter') e.preventDefault();
    });
  }
  if (clear) clear.addEventListener('click', function () {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    if (search) search.value = '';
    applyFilter(); toHead();
  });
})();
