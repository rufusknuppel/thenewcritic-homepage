// ---------- POSTSCRIPT INDEX ----------
// The postscript page's reading room (see renderPostscriptPage in
// build.js): the left column scrolls every interviewee's name, newest
// first; clicking one swaps the column beside it to that postscript's
// hover cell (cover standing, card opening over it on hover).
// Everything is prerendered and hidden, so selection is a display
// toggle — plus a debounced refit (the fitter skips hidden panels and
// a freshly shown one has never been measured at real size).
(function () {
  var nav = document.querySelector('.ps-index');
  if (!nav) return;
  var cells = document.querySelectorAll('.ps-hero-cell');
  var links = nav.querySelectorAll('.ps-index-link');
  function show(idx) {
    [].forEach.call(cells, function (c) { c.hidden = c.getAttribute('data-idx') !== idx; });
    [].forEach.call(links, function (b) {
      var on = b.getAttribute('data-idx') === idx;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    window.dispatchEvent(new Event('resize'));
  }
  [].forEach.call(links, function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-idx')); });
  });
})();
