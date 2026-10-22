// ABOUT ON THE FRONT PAGE'S HEAD (2026-10-22; build.js renderAboutPage, style.css ABOUT ON THE FRONT PAGE'S HEAD): the
// line of About's parts, pinned under the band, follows the reader — the part coming up under it in red, as THE LATEST
// is on the front page — and a part the link names lands under it. (The head over it all — the name, the band — is
// src/front-head.js.)
(function () {
  var de = document.documentElement;
  var strip = document.querySelector('.abo-parts');
  var links = [].slice.call(document.querySelectorAll('.abo-parts__a[data-part]'));
  var parts = links.map(function (a) { return document.getElementById(a.getAttribute('data-part')); });

  // THE PART IN RED: the last part whose top has come up a quarter of the way down the room under the line; at the page's
  // foot the last part, however short it stands
  var cur = -1;
  var spy = function () {
    var foot = strip ? strip.getBoundingClientRect().bottom : 0, line = foot + (window.innerHeight - foot) / 4;
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

  // THE LANDING: a part the link names (about.html#masthead) under the line — the browser takes the anchor before
  // src/front-head.js has seated the band, so it is taken again once it has, and while the faces and the band settle,
  // till the reader moves
  var named = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  if (named && parts.indexOf(named) >= 0) {
    var land = function () { named.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    var tries = 0, settle = setInterval(function () { land(); if (++tries >= 6) clearInterval(settle); }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { clearInterval(settle); }, { once: true, passive: true }); });
    land();
  }
})();
