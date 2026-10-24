// THE ARCHIVE'S INDEX (2026-10-23 — "I want the archive to look like this, with three columns though"; build.js
// renderArchivePage, style.css THE ARCHIVE AN INDEX): the field narrows the index — a title, a writer, a tag — the
// letters and the sections left empty going with their titles; the cards' deep links narrow it too (#author=, #topic=
// fill the field with the name; #section= keeps that section alone) or land on their title (#post=). (The head over it
// — the name, the band — is src/front-head.js.)
(function () {
  var de = document.documentElement;
  var band = document.querySelector('main.has-mega .op-band');
  var arc = document.querySelector('.arc');
  var items = arc ? [].slice.call(arc.querySelectorAll('.arc-ix-item')) : [];
  if (!items.length) return;
  var grps = [].slice.call(arc.querySelectorAll('.arc-ix-grp'));
  var secs = [].slice.call(arc.querySelectorAll('.arc-ix-sec'));
  var none = arc.querySelector('.arc-none');
  var search = arc.querySelector('.arc-search'), clear = arc.querySelector('.arc-clear');
  var count = arc.querySelector('.arc-count');
  var readHash = function () {
    var hp = {};
    location.hash.slice(1).split('&').forEach(function (kv) {
      var eq = kv.indexOf('=');
      if (eq > 0) hp[kv.slice(0, eq)] = decodeURIComponent(kv.slice(eq + 1));
    });
    return hp;
  };
  var textOf = function (r) {
    if (r.__t == null) r.__t = [r.getAttribute('data-title'), r.textContent, r.getAttribute('data-author'),
      r.getAttribute('data-kicker'), r.getAttribute('data-section')].join(' ').replace(/­/g, '').toLowerCase();
    return r.__t;
  };
  // (what is left, in words, for a reader that hears it — "Ninety-six pieces", "Nothing matches “zzz”")
  var ONES = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var inWords = function (n) { return n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : String(n); };
  var say = function (n, words) {
    if (!count) return;
    var t = !n ? 'nothing' + (words ? ' matches “' + words + '”' : '')
      : inWords(n) + (n === 1 ? ' piece' : ' pieces') + (words ? ' matching “' + words + '”' : '');
    count.textContent = t.charAt(0).toUpperCase() + t.slice(1);
  };
  var applyFilter = function () {
    var hp = readHash();
    var sec = (hp.section || '').toLowerCase();
    var typed = search ? search.value.trim() : '';
    var words = typed.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    items.forEach(function (r) {
      var on = !sec || r.getAttribute('data-section') === sec;
      if (on) for (var w = 0; w < words.length; w++) if (textOf(r).indexOf(words[w]) < 0) { on = false; break; }
      r.hidden = !on;
      if (on) shown++;
    });
    grps.forEach(function (g) { g.hidden = !g.querySelector('.arc-ix-item:not([hidden])'); });
    secs.forEach(function (s) { s.hidden = !s.querySelector('.arc-ix-item:not([hidden])'); });
    say(shown, typed);
    if (clear) clear.hidden = !(sec || words.length);
    if (none) none.hidden = shown > 0;
  };
  // (a writer's or a tag's link fills the field with the name, as the reader would have typed it)
  var fromHash = function () {
    var hp = readHash();
    var name = hp.author || hp.topic || '';
    if (search && name) search.value = name;
  };

  // THE LANDING: a named title in the middle of the room under the band
  var bandH = function () { return band ? band.getBoundingClientRect().height : 0; };
  var target = null;
  var land = function () {
    if (!target) return;
    var top = bandH(), r = target.getBoundingClientRect(), room = de.clientHeight - top;
    window.scrollTo({ top: Math.max(0, window.pageYOffset + r.top - top - Math.max(0, (room - r.height) / 2)), behavior: 'instant' });
  };
  var arcMain = arc.querySelector('.arc-main') || arc;
  var toHead = function () {
    var y = window.pageYOffset + arcMain.getBoundingClientRect().top - bandH() + 4;
    if (window.pageYOffset > y + 0.5) window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  };
  var hp0 = readHash();
  if (hp0.post) items.forEach(function (r) { if (r.getAttribute('data-slug') === hp0.post) target = r; });
  if (target) target.classList.add('is-target');
  fromHash();
  applyFilter();
  if (target) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var tries = 0, settle = setInterval(function () { dispatchEvent(new Event('newcritic:lay')); land(); if (++tries >= 8) clearInterval(settle); }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { clearInterval(settle); }, { once: true, passive: true }); });
    land();
  }
  addEventListener('hashchange', function () {
    if (target) target.classList.remove('is-target');
    target = null; fromHash(); applyFilter(); toHead();
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

  // (the marks lit under the hand, as on the front page — "Highlight should work on wordmark on archive", 2026-10-23:
  // latest-rail.js wires them there and is not on this page; the same main.nc-hot-* classes, so style.css THE MARKS LIT
  // TOGETHER paints them, in the white here; on body too, the name standing outside main — style.css THE ARCHIVE'S NAME LIT)
  var mn = document.querySelector('main');
  if (mn) [].forEach.call(document.querySelectorAll('a.content-name .content-name__block > .tnc-words, main .op-band > a.rail-tlm, main .op-band > a.op-tnc'), function (el) {
    var band2 = el.matches('main .op-band > a');
    el.addEventListener('mouseenter', function () {
      // (the band's two names stand one over the other, the one faded out still under the hand: the one showing is lit)
      var tlm = el.classList.contains('rail-tlm');
      if (band2 && parseFloat(getComputedStyle(el).opacity) < 0.5) tlm = !tlm;
      mn.classList.add(tlm ? 'nc-hot-tlm' : 'nc-hot-tnc');
      document.body.classList.add(tlm ? 'nc-hot-tlm' : 'nc-hot-tnc');
    });
    el.addEventListener('mouseleave', function () { mn.classList.remove('nc-hot-tlm', 'nc-hot-tnc'); document.body.classList.remove('nc-hot-tlm', 'nc-hot-tnc'); });
  });
})();
