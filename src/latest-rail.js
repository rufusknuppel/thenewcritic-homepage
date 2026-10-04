// THE LATEST'S RAIL RIDES UP WITH THE ROWS (design/latest-rail, 2026-10-04,
// at the user's word — "The Latest column should pull up in same way as
// content on top band transition"): the rail's box begins where the
// strip's foot stands once it has settled — the page's rest (the name's
// block and the air under it, as band-mark.js reads it) plus the settled
// strip's 144 — so through the pull the rail comes up the window with the
// rows, a pixel for a pixel, and its hold pins under the strip just as the
// strip settles. Before, the box began at the body's top, behind the
// opening, and the rail held still on the screen while the rows rose.
(function () {
  var rail = document.querySelector('.latest-rail');
  var main = document.querySelector('main');
  if (!rail || !main) return;
  var STRIP_SETTLED = 144;
  var seat = function () {
    if (!rail.offsetWidth) return;
    var body = rail.parentElement;
    var rest = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-h')) || 0)
      + (parseFloat(main.style.getPropertyValue('--wm-under') || getComputedStyle(main).getPropertyValue('--wm-under')) || 0);
    if (!main.classList.contains('wm-opening')) rest = 0;
    var bodyTop = body.getBoundingClientRect().top + (window.pageYOffset || 0);
    var top = Math.max(0, rest + STRIP_SETTLED - bodyTop);
    var cur = parseFloat(rail.style.top) || 0;
    if (Math.abs(cur - top) > 0.25) rail.style.setProperty('top', top.toFixed(2) + 'px', 'important');
  };
  ['load', 'resize', 'newcritic:fit', 'newcritic:fitdone', 'newcritic:settled'].forEach(function (ev) {
    addEventListener(ev, function () { setTimeout(seat, 0); }, { passive: true });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(seat);
  seat();
})();
