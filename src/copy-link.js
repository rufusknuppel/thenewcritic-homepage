// ---------- COPY-LINK CORNER ----------
// The chain-icon button in every hover panel's top-right corner (see
// copyLinkBtnHtml in build.js) puts the post's Substack URL on the
// clipboard. One delegated listener serves every card — the buttons
// carry their URL in data-copy-link, so nothing here knows about posts.
// On a successful copy the button wears .copied for a beat, which is
// what swaps the chain for the check (see the copy-link rules in
// style.css).
(function () {
  'use strict';

  // The execCommand path is the fallback for the non-secure/older
  // contexts where navigator.clipboard is absent (file:// previews,
  // plain-http staging) — an off-screen textarea selected and copied.
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { /* stays false */ }
    document.body.removeChild(ta);
    return ok;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-copy-link]') : null;
    if (!btn) return;
    e.preventDefault();
    var url = btn.getAttribute('data-copy-link');
    if (!url) return;

    function flash() {
      btn.classList.add('copied');
      clearTimeout(btn._copiedTimer);
      btn._copiedTimer = setTimeout(function () {
        btn.classList.remove('copied');
      }, 1600);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(flash, function () {
        if (legacyCopy(url)) flash();
      });
    } else if (legacyCopy(url)) {
      flash();
    }
  });
})();
