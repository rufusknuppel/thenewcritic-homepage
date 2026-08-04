// ---------- ABOUT SECTIONS ----------
// The about page's head lists its sections down one centred column (see
// .about-head in style.css): each name opens its section's text below
// the head's full-bleed divider. ONE section at a time; clicking the
// open section's name closes it and the page rests on the head alone.
// The About panel ships open in the markup (and its button .is-active),
// so a no-JS reader still gets the page's one indispensable paragraph —
// this script only reads that state back rather than restating it.
//
// The open section is written to the URL as a hash (about.html#give), so
// a reload holds its place and the link is shareable. replaceState
// rather than assigning location.hash: assigning would stack a history
// entry per click and turn the back button into a section-by-section
// rewind of everything the reader browsed through. hashchange is still
// listened for — a pasted link, or a browser walking back to a different
// page state, must land on the named section.
(function () {
  var head = document.querySelector('.about-head');
  if (!head) return;
  var btns = [].slice.call(head.querySelectorAll('.about-link'));
  var panels = [].slice.call(document.querySelectorAll('.about-panel'));
  if (!btns.length || !panels.length) return;
  var keys = panels.map(function (p) { return p.getAttribute('data-key'); });
  var active = null;
  panels.forEach(function (p) {
    if (!p.hidden) active = p.getAttribute('data-key');
  });

  function apply() {
    btns.forEach(function (b) {
      var on = b.getAttribute('data-key') === active;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute('data-key') !== active;
    });
  }
  // The hash carries the open section, and nothing when the page rests
  // closed — pathname + search kept so the URL is only ever rewritten
  // from its fragment down.
  function writeHash() {
    if (!window.history || !window.history.replaceState) return;
    var url = location.pathname + location.search + (active ? '#' + active : '');
    window.history.replaceState(null, '', url);
  }
  function readHash() {
    var want = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (!want || keys.indexOf(want) < 0 || want === active) return false;
    active = want;
    apply();
    return true;
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-key');
      active = active === k ? null : k;
      apply();
      writeHash();
    });
  });
  // On arrival: an addressed section wins over the markup's default;
  // without one, the default is stamped into the URL so a reload from
  // here holds the same page.
  if (!readHash()) writeHash();
  window.addEventListener('hashchange', readHash);
})();
