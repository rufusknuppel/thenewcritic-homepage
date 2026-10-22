// ABOUT ON THE FRONT PAGE'S ANATOMY (2026-10-22; build.js renderAboutPage, style.css ABOUT ON THE FRONT PAGE'S ANATOMY):
// the side column's parts follow the reader — the part whose head stands under the band in red, as THE LATEST is on the
// front page — and an editor's face stands in the bird's place while the hand is on their row of the masthead. (The head
// over it all — the name, the band, the side column — is src/front-head.js.)
(function () {
  var de = document.documentElement;
  var band = document.querySelector('main.has-mega .op-band');
  var links = [].slice.call(document.querySelectorAll('.arc-sections__a[data-part]'));
  var parts = links.map(function (a) { return document.getElementById(a.getAttribute('data-part')); });

  // THE PART IN RED: the last part whose top has come up to the band's foot and a head's height under it; at the page's
  // foot the last part, however short it stands
  var cur = -1;
  var spy = function () {
    var line = (band ? band.getBoundingClientRect().bottom : 0) + 54;
    var k = 0;
    parts.forEach(function (p, i) { if (p && p.getBoundingClientRect().top <= line) k = i; });
    if (window.innerHeight + (window.pageYOffset || 0) >= de.scrollHeight - 2) k = parts.length - 1;
    if (k === cur) return;
    cur = k;
    links.forEach(function (a, i) {
      a.classList.toggle('is-current', i === k);
      if (i === k) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  };
  addEventListener('scroll', spy, { passive: true });
  addEventListener('resize', spy);
  addEventListener('load', spy);
  spy();

  // THE LANDING: a part the link names (about.html#masthead) under the band — the browser takes the anchor before
  // src/front-head.js has seated the band, so it is taken again once it has, and while the faces and the band settle,
  // till the reader moves
  var named = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  if (named && named.classList.contains('ab-part')) {
    var land = function () { named.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    var tries = 0, settle = setInterval(function () { land(); if (++tries >= 6) clearInterval(settle); }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { clearInterval(settle); }, { once: true, passive: true }); });
    land();
  }

  // THE FACE IN THE BIRD'S PLACE: the masthead's row under the hand (or the keys) shows its editor's face where the
  // column's bird stands, the bird back when the hand goes
  var hold = document.querySelector('.arc-side__hold');
  var faces = [].slice.call(document.querySelectorAll('.ab-face[data-face]'));
  var show = function (k) {
    faces.forEach(function (f) { f.classList.toggle('is-on', f.getAttribute('data-face') === k); });
    if (hold) hold.classList.toggle('is-face', k != null);
  };
  [].forEach.call(document.querySelectorAll('.ab-person[data-face]'), function (r) {
    var on = function () { show(r.getAttribute('data-face')); }, off = function () { show(null); };
    r.addEventListener('mouseenter', on);
    r.addEventListener('mouseleave', off);
    r.addEventListener('focus', on);
    r.addEventListener('blur', off);
  });
})();
