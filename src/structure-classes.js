// THE :has() QUESTIONS ARE ANSWERED ONCE, AS CLASSES (2026-09-30).
// Chrome re-checks a :has() anchor on every mutation beneath it, and the
// fitter makes thousands a pass. With the front page one movement, the
// anchors — every .wrap, .row-divider, .movement-body, the html — stood
// over the whole page, and a forced recalc cost 3.2ms (0.5 without the
// :has()); stage two of the fit held the thread 12s after the reveal.
// So every structural :has() in style.css reads a class instead, set
// here before the first pass and again when the fitter ends one
// (window.__ncStructure), and the two pointer states (:has(+ dek:hover),
// :has(+ a:hover)) are kept by hand. Each class carries the specificity
// of the :has() it replaces — the sheet doubles a class where the
// argument weighed more — so nothing in the cascade moves.
(function () {
  var q = function (s, root) { return [].slice.call((root || document).querySelectorAll(s)); };
  var set = function (el, c, want) { if (el.classList.contains(c) !== !!want) el.classList.toggle(c, !!want); };
  var childWith = function (el, c) { if (!el) return false; for (var k = el.children, i = 0; i < k.length; i++) if (k[i].classList.contains(c)) return true; return false; };
  function mark() {
    // .wrap:has(> .card--latest | > .card--mega | > .page-banner)
    q('.wrap').forEach(function (w) {
      set(w, 'w-latest', childWith(w, 'card--latest'));
      set(w, 'w-mega', childWith(w, 'card--mega'));
      set(w, 'w-banner', childWith(w, 'page-banner'));
    });
    // .movement-body:has(> .wrap:last-child), :has(> .wrap:nth-last-child(2|3) > .card--mega);
    // .movement:has(> .wrap:nth-last-child(2) > .card--mega), .movement:has(+ .movement)
    q('.movement-body, .movement').forEach(function (b) {
      var k = b.children, n = k.length;
      var wrapAt = function (m) { var e = k[n - m]; return e && e.classList.contains('wrap') ? e : null; };
      set(b, 'mb-wrap-last', !!wrapAt(1));
      set(b, 'mb-mega-2nd-last', childWith(wrapAt(2), 'card--mega'));
      set(b, 'mb-mega-3rd-last', childWith(wrapAt(3), 'card--mega'));
      if (b.classList.contains('movement')) {
        set(b, 'm-mega-2nd-last', childWith(wrapAt(2), 'card--mega'));
        var nx = b.nextElementSibling;
        set(b, 'm-next', !!(nx && nx.classList.contains('movement')));
      }
    });
    // .row-divider:has(+ .wrap > .card--mega)
    q('.row-divider').forEach(function (d) {
      var nx = d.nextElementSibling;
      set(d, 'rd-before-mega', !!(nx && nx.classList.contains('wrap') && childWith(nx, 'card--mega')));
    });
    // .duo-half-divider:has(+ .duo-half--ghost)
    q('.duo-half-divider').forEach(function (d) {
      var nx = d.nextElementSibling;
      set(d, 'before-ghost', !!(nx && nx.classList.contains('duo-half--ghost')));
    });
    // .card--latest:not(:has(.latest-cell--contra))
    q('.card--latest').forEach(function (c) { set(c, 'has-contra', !!c.querySelector('.latest-cell--contra')); });
    // .band-deks:has(a[aria-current="page"]); .band-sep:has(+ a[aria-current="page"]);
    // .band-dek:has(> .band-date):not(:has(a))
    q('.section-band .band-deks').forEach(function (p) { set(p, 'has-current', !!p.querySelector('a[aria-current="page"]')); });
    q('.section-band .band-sep').forEach(function (s) {
      var nx = s.nextElementSibling;
      set(s, 'before-current', !!(nx && nx.tagName === 'A' && nx.getAttribute('aria-current') === 'page'));
    });
    q('.section-band .band-dek').forEach(function (p) { set(p, 'date-only', childWith(p, 'band-date') && !p.querySelector('a')); });
    // .plate-more:has(> :is(.plate-close, .plate-read))
    q('.plate-more').forEach(function (p) { set(p, 'has-ctl', childWith(p, 'plate-close') || childWith(p, 'plate-read')); });
    // :is(.card-title, .latest-title):has(.title-line); its a:has(> :is(.title-line, span))
    q('.card-title, .latest-title').forEach(function (t) {
      set(t, 'has-lines', !!t.querySelector('.title-line'));
      q(':scope > a', t).forEach(function (a) {
        var has = false;
        for (var k = a.children, i = 0; i < k.length; i++) if (k[i].tagName === 'SPAN') { has = true; break; }
        set(a, 'has-span', has);
      });
    });
  }
  mark();
  window.__ncStructure = mark;
  // :is(.card-title, .latest-title):has(+ :is(.card-dek, .latest-dek):hover) → .dek-hover on the title
  var DEK = '.card-dek, .latest-dek', TITLE = '.card-title, .latest-title';
  var dekTitle = function (dek) { var t = dek.previousElementSibling; return t && t.matches(TITLE) ? t : null; };
  document.addEventListener('pointerover', function (e) {
    var dek = e.target.closest && e.target.closest(DEK); if (!dek) return;
    var t = dekTitle(dek); if (t) set(t, 'dek-hover', true);
  });
  document.addEventListener('pointerout', function (e) {
    var dek = e.target.closest && e.target.closest(DEK); if (!dek) return;
    if (e.relatedTarget && dek.contains(e.relatedTarget)) return;
    var t = dekTitle(dek); if (t) set(t, 'dek-hover', false);
  });
  // .band-sep:has(+ a:hover) → .next-hover on the separator before a hovered link
  document.addEventListener('pointerover', function (e) {
    var a = e.target.closest && e.target.closest('.section-band .band-deks a'); if (!a) return;
    var s = a.previousElementSibling; if (s && s.classList.contains('band-sep')) set(s, 'next-hover', true);
  });
  document.addEventListener('pointerout', function (e) {
    var a = e.target.closest && e.target.closest('.section-band .band-deks a'); if (!a) return;
    if (e.relatedTarget && a.contains(e.relatedTarget)) return;
    var s = a.previousElementSibling; if (s && s.classList.contains('band-sep')) set(s, 'next-hover', false);
  });
})();
