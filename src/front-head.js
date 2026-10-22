// THE FRONT PAGE'S HEAD ON THE ARCHIVE AND ABOUT (2026-10-22; build.js renderFrontAnatomy, style.css THE ARCHIVE ON THE
// FRONT PAGE'S HEAD): the front page's THE NEW CRITIC and the band under it, seated as latest-rail.js seats them there,
// and the side column under the socials as it stands there. Out of src/archive.js since About took the same head ("Redesign
// the about page in the same was as the archive redesign"); a page's own script asks for a fresh seat with the
// newcritic:lay event.
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
  addEventListener('newcritic:lay', function () { last = ''; lay(); });
  lay();
  pin();
})();
