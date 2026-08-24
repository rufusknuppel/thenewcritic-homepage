(function(){
  // THE HELD HEAD: the mini-rail is CSS-sticky (stiff, compositor-
  // locked). The hero's courier rows hold as fixed CLONES — built
  // here with the originals' exact geometry, swapped in at the hold
  // (the originals go invisible at the same instant, in place, so
  // nothing reflows) and pinned on the line until the hero's foot
  // passes the divider COMPLETELY, then faded out (body.hero-gone).
  // This script flips the two body classes and keeps the clones true
  // to the originals across resizes.
  var rail = document.querySelector('.topbar-rail');
  if (!rail) return;
  var mega = document.querySelector('.duo-half--mega');
  var rows = [].slice.call(document.querySelectorAll(
    '.duo-half--mega .duo-panel .ground-kicker, .duo-half--mega .duo-panel .panel-col--right .ground-credit'));
  var clones = [];
  var fixAt = 0;
  var goneAt = Infinity;
  function buildClones(){
    for (var i = 0; i < clones.length; i++) clones[i].remove();
    clones = rows.map(function(r){
      var rect = r.getBoundingClientRect();
      var c = r.cloneNode(true);
      c.classList.add('courier-clone');
      c.style.position = 'fixed';
      c.style.top = '35.93px';
      c.style.left = (rect.left) + 'px';
      c.style.width = rect.width + 'px';
      c.style.margin = '0';
      document.body.appendChild(c);
      return c;
    });
  }
  function apply(){
    document.body.classList.toggle('rail-fixed', window.scrollY >= fixAt);
    document.body.classList.toggle('hero-gone', window.scrollY >= goneAt);
  }
  function measure(){
    var prev = rail.style.position;
    rail.style.position = 'static';
    fixAt = rail.getBoundingClientRect().top + window.scrollY - 41.93;
    rail.style.position = prev;
    if (mega && rows.length) {
      // Gone only when the hero's FOOT crosses the held divider line.
      goneAt = mega.getBoundingClientRect().bottom + window.scrollY - 67.13;
      buildClones();
    }
    apply();
  }
  window.addEventListener('scroll', apply, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();
})();
