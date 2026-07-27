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
})();
