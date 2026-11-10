// PHONE DRAFT (2026-11-10 — "draft a better version for the phone"): a front page for the phone to judge before it
// replaces anything. Opening the page with ?phone=draft puts html.phone-draft on (and keeps it for the tab, so links
// back to the front page keep it); ?phone=off takes it away. style.css's PHONE DRAFT block reads the class under 1024
// only; without it nothing changes. Head-inlined so the class is on before the first paint.
(function () {
  try {
    var q = /[?&]phone=(draft|off)\b/.exec(location.search);
    if (q) sessionStorage.setItem('nc-phone', q[1]);
    if ((q ? q[1] : sessionStorage.getItem('nc-phone')) === 'draft') document.documentElement.classList.add('phone-draft');
  } catch (e) { /* storage blocked: the flag in the address alone */
    if (/[?&]phone=draft\b/.test(location.search)) document.documentElement.classList.add('phone-draft');
  }
})();
