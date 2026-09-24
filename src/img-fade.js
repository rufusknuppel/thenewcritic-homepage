// Cover-image arrival: each cover fades in once its pixels are decoded
// instead of popping into place mid-scroll. Inlined into <head>, so it
// runs before any <img> exists — the load listener rides the capture
// phase ('load' doesn't bubble, but it does capture), which is the only
// way a single listener attached this early can catch every image,
// cached ones included. It must sit on document, not window: a
// subresource load's propagation path ends at document. The .imgfade
// class on <html> gates the opacity:0 in style.css: no JS, no hiding,
// covers render as before.
(function () {
  document.documentElement.classList.add('imgfade');
  function arrived(e) {
    var t = e.target;
    if (t && t.tagName === 'IMG') t.classList.add('is-loaded');
  }
  document.addEventListener('load', arrived, true);
  // A broken image should settle on the placeholder tile, not hold the
  // box invisible forever.
  document.addEventListener('error', arrived, true);
  // Sweep for anything already complete — pages restored from the
  // back/forward cache re-fire no load events (pageshow fires on every
  // navigation, so this also backstops ordinary loads).
  addEventListener('pageshow', function () {
    for (var i = 0; i < document.images.length; i++) {
      if (document.images[i].complete) document.images[i].classList.add('is-loaded');
    }
  });
  // A LAZY COVER IS ASKED FOR TWO SCREENS AHEAD (2026-09-24). The covers
  // below the first screen are lazy, and the browser's own reach for a
  // lazy picture is a fixed distance that a quick scroll on a slow line
  // outruns. Each is asked for once it comes within two windows of the
  // view, as the front page's cards already are (card-reveal.js) — but
  // on every page, and only once the faces are in, so no cover takes the
  // line from the type the first screen is set in.
  var ahead = function () {
    if (ahead.done || !window.IntersectionObserver) return;
    ahead.done = true;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (en.target.loading === 'lazy') en.target.loading = 'eager';
      });
    }, { rootMargin: '0px 0px 200% 0px' });
    [].forEach.call(document.querySelectorAll('img.card-image[loading="lazy"]'), function (img) { io.observe(img); });
  };
  var whenReady = function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ahead);
    else ahead();
  };
  if (window.__ncFontsIn) whenReady();
  else {
    addEventListener('newcritic:fontsin', whenReady);
    setTimeout(whenReady, 4000);
  }
})();
