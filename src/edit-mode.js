// THE EDIT MODE (2026-09-24). With ?edit in the front page's address
// (and a window 1024 or wider), every picture takes a handle on its free
// bottom corner: drag it to size the picture — across and down, or
// across alone with Shift held to keep its proportions — and the page
// re-seats itself on letting go (the fitter's 36s hold). Double-click a
// handle to give that picture back its kind's size. SAVE sends every
// size to the dev server (serve.js, PUT /__layout), which writes
// layout-overrides.json and rebuilds; the page reloads on the new
// build, still in edit mode. A size is kept as w, the picture's width
// over the window's, and r, its height over its width (build.js,
// LAYOUT_OVERRIDES; style.css, SIZES SET BY HAND). Inert without ?edit.
(function () {
  if (!/[?&]edit\b/.test(location.search)) return;
  var root = document.documentElement;
  var HANDLE = 18;

  function cards() {
    return [].slice.call(document.querySelectorAll('main.has-mega .page-rows .movement-body > .wrap > .card--mega[data-slug]'));
  }
  // The picture is its title's box (::before), whatever the kind.
  function picOf(card) {
    var t = card.querySelector('.card-title.hl-rect.rx, .latest-title.hl-rect.rx');
    if (!t) return null;
    var c = getComputedStyle(t, '::before');
    if (c.content === 'none') return null;
    // (as the fitter's snapPictures reads it: the pseudo's insets, and
    // the frame's --wrap each side)
    var r = t.getBoundingClientRect(), wr = parseFloat(getComputedStyle(t).getPropertyValue('--wrap')) || 0;
    var l = r.left + (parseFloat(c.left) || 0) - wr, rr = r.right - (parseFloat(c.right) || 0) + wr;
    var tp = r.top + (parseFloat(c.top) || 0), b = r.bottom - (parseFloat(c.bottom) || 0);
    return rr > l && b > tp ? { l: l, t: tp, w: rr - l, h: b - tp } : null;
  }
  // The edge a picture stands on: an essay on its words' side of the
  // window; a postscript or review on the page's middle, so its free
  // edge is the outer one.
  function anchoredRight(card) {
    var r = card.classList.contains('card--align-r');
    var pair = card.classList.contains('card--kind-postscript') || card.classList.contains('card--kind-contra');
    return pair ? !r : r;
  }

  var style = document.createElement('style');
  style.textContent =
    '.nc-edit-handle{position:absolute;width:' + HANDLE + 'px;height:' + HANDLE + 'px;z-index:2147483000;' +
    'background:#1184C4;border:2px solid #fff;box-sizing:border-box;border-radius:50%;cursor:nwse-resize;touch-action:none}' +
    '.nc-edit-handle.is-left{cursor:nesw-resize}' +
    '.nc-edit-size{position:absolute;z-index:2147483000;font:12px/1 Courier,monospace;color:#fff;background:#1184C4;padding:4px 6px;pointer-events:none;white-space:nowrap}' +
    '.nc-edit-bar{position:fixed;left:16px;bottom:16px;z-index:2147483001;display:flex;gap:8px;align-items:center;' +
    'font:12px/1 Courier,monospace;text-transform:uppercase;color:#fff;background:#121417;border:1px solid #1184C4;padding:8px 10px}' +
    '.nc-edit-bar button{font:inherit;text-transform:inherit;color:#121417;background:#fff;border:0;padding:6px 8px;cursor:pointer}' +
    '.nc-edit-bar button.is-go{background:#1184C4;color:#fff}' +
    '.nc-edit-dirty .nc-edit-bar{border-color:#fff}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.className = 'nc-edit-bar';
  bar.innerHTML = '<span class="nc-edit-msg">Edit · drag a corner (Shift keeps shape) · double-click resets</span>' +
    '<button type="button" class="is-go" data-act="save">Save</button>' +
    '<button type="button" data-act="reset">Reset all</button>' +
    '<button type="button" data-act="exit">Exit</button>';
  var msg = bar.querySelector('.nc-edit-msg');
  function say(t) { msg.textContent = t; }

  var handles = [];
  var label = document.createElement('div');
  label.className = 'nc-edit-size';
  label.hidden = true;

  function wide() { return window.innerWidth >= 1024; }
  function place() {
    handles.forEach(function (h) {
      var p = wide() && picOf(h.card);
      if (!p) { h.el.hidden = true; return; }
      h.el.hidden = false;
      var x = h.right ? p.l : p.l + p.w;
      h.el.style.left = (x + scrollX - HANDLE / 2) + 'px';
      h.el.style.top = (p.t + p.h + scrollY - HANDLE / 2) + 'px';
      h.el.classList.toggle('is-left', h.right);
    });
  }
  var queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    var go = function () { queued = false; place(); };
    // (a tab the browser counts hidden runs no frames: a timer instead)
    if (document.hidden || !window.requestAnimationFrame) setTimeout(go, 16); else requestAnimationFrame(go);
  }

  function setSize(card, wPx, hPx) {
    var W = window.innerWidth;
    card.style.setProperty('--ov-w', (wPx / W).toFixed(5));
    card.style.setProperty('--ov-r', (hPx / wPx).toFixed(5));
    card.classList.add('card--ov');
  }
  function clearSize(card) {
    card.style.removeProperty('--ov-w');
    card.style.removeProperty('--ov-r');
    card.classList.remove('card--ov');
  }
  function refit() {
    if (window.__ncRequestFit) window.__ncRequestFit();
    setTimeout(queue, 300); setTimeout(queue, 1200);
  }
  function dirty() { root.classList.add('nc-edit-dirty'); say('Unsaved sizes · Save to keep them'); }

  function start() {
    document.body.appendChild(bar);
    document.body.appendChild(label);
    cards().forEach(function (card) {
      var el = document.createElement('div');
      el.className = 'nc-edit-handle';
      el.title = 'Drag to size · Shift keeps shape · double-click resets';
      document.body.appendChild(el);
      var h = { card: card, el: el, right: anchoredRight(card) };
      handles.push(h);
      el.addEventListener('pointerdown', function (e) {
        var p = picOf(card);
        if (!p) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        var x0 = e.clientX, y0 = e.clientY, w0 = p.w, h0 = p.h, ratio = p.h / p.w;
        var move = function (ev) {
          var dx = (ev.clientX - x0) * (h.right ? -1 : 1);
          var w = Math.max(120, Math.min(window.innerWidth - 72, w0 + dx));
          var hh = ev.shiftKey ? w * ratio : Math.max(90, h0 + (ev.clientY - y0));
          setSize(card, w, hh);
          label.hidden = false;
          label.textContent = Math.round(w) + ' × ' + Math.round(hh);
          label.style.left = (ev.clientX + scrollX + 14) + 'px';
          label.style.top = (ev.clientY + scrollY + 14) + 'px';
          queue();
        };
        var up = function () {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          label.hidden = true;
          dirty();
          refit();
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
      el.addEventListener('dblclick', function () { clearSize(card); dirty(); refit(); });
    });
    place();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    addEventListener('newcritic:fitdone', queue);
    addEventListener('newcritic:settled', queue);
    setInterval(queue, 1000);
  }

  function collect() {
    var out = {};
    cards().forEach(function (card) {
      if (!card.classList.contains('card--ov')) return;
      var w = parseFloat(card.style.getPropertyValue('--ov-w')), r = parseFloat(card.style.getPropertyValue('--ov-r'));
      if (w > 0 && r > 0) out[card.getAttribute('data-slug')] = { w: +w.toFixed(5), r: +r.toFixed(5) };
    });
    return out;
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'exit') { location.search = location.search.replace(/[?&]edit\b[^&]*/, '').replace(/^&/, '?'); return; }
    if (act === 'reset') { cards().forEach(clearSize); dirty(); refit(); return; }
    if (act === 'save') {
      var data = collect();
      say('Saving and rebuilding…');
      fetch('/__layout', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error((res.j && res.j.error) || 'save failed');
          say('Saved · reloading');
          location.reload();
        })
        .catch(function (err) {
          // (no endpoint — not the dev server): hand the sizes over by hand
          var text = JSON.stringify(data, null, 2);
          try { navigator.clipboard.writeText(text); } catch (e2) {}
          say('Could not save here (' + err.message + ') · sizes copied as JSON');
        });
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
