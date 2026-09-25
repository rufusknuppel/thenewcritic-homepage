// THE EDIT MODE (2026-09-24). With ?edit in the front page's address
// (and a window 1024 or wider), every picture takes a handle on each of
// its four corners: drag one to move that corner — a left one moves the
// picture's left edge, a right one its right edge; a top or bottom one
// its height (Shift keeps its proportions) — and the page re-seats
// itself on letting go (the fitter's 36s hold, so where a picture
// starts DOWN the page is still the rules', and a picture made taller
// from the top grows downward once let go). Double-click a handle to
// give that picture back its kind's size and seat. SAVE sends every
// size to the dev server (serve.js, PUT /__layout), which writes
// layout-overrides.json and rebuilds; the page reloads on the new
// build, still in edit mode. A size is kept as x, the picture's left
// edge over the window's width, w, its width over the window's, and r,
// its height over its width (build.js,
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
  var style = document.createElement('style');
  style.textContent =
    '.nc-edit-handle{position:absolute;width:' + HANDLE + 'px;height:' + HANDLE + 'px;z-index:2147483000;' +
    'background:#1184C4;border:2px solid #fff;box-sizing:border-box;border-radius:50%;cursor:nwse-resize;touch-action:none}' +
    '.nc-edit-handle.c-tr,.nc-edit-handle.c-bl{cursor:nesw-resize}' +
    '.nc-edit-size{position:absolute;z-index:2147483000;font:12px/1 Courier,monospace;color:#fff;background:#1184C4;padding:4px 6px;pointer-events:none;white-space:nowrap}' +
    '.nc-edit-bar{position:fixed;left:16px;bottom:16px;z-index:2147483001;display:flex;gap:8px;align-items:center;' +
    'font:12px/1 Courier,monospace;text-transform:uppercase;color:#fff;background:#121417;border:1px solid #1184C4;padding:8px 10px}' +
    '.nc-edit-bar button{font:inherit;text-transform:inherit;color:#121417;background:#fff;border:0;padding:6px 8px;cursor:pointer}' +
    '.nc-edit-bar button.is-go{background:#1184C4;color:#fff}' +
    '.nc-edit-dirty .nc-edit-bar{border-color:#fff}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.className = 'nc-edit-bar';
  bar.innerHTML = '<span class="nc-edit-msg">Edit · drag any corner (Shift keeps shape) · double-click resets</span>' +
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
      var x = h.c.charAt(1) === 'l' ? p.l : p.l + p.w;
      var y = h.c.charAt(0) === 't' ? p.t : p.t + p.h;
      h.el.style.left = (x + scrollX - HANDLE / 2) + 'px';
      h.el.style.top = (y + scrollY - HANDLE / 2) + 'px';
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

  function setSize(card, xPx, wPx, hPx) {
    var W = window.innerWidth;
    card.style.setProperty('--ov-x', (xPx / W).toFixed(5));
    card.style.setProperty('--ov-w', (wPx / W).toFixed(5));
    card.style.setProperty('--ov-r', (hPx / wPx).toFixed(5));
    card.classList.add('card--ov', 'card--ovx');
  }
  function clearSize(card) {
    card.style.removeProperty('--ov-x');
    card.style.removeProperty('--ov-w');
    card.style.removeProperty('--ov-r');
    card.classList.remove('card--ov', 'card--ovx');
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
      ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
        var el = document.createElement('div');
        el.className = 'nc-edit-handle c-' + c;
        el.title = 'Drag to move this corner · Shift keeps shape · double-click resets';
        document.body.appendChild(el);
        var h = { card: card, el: el, c: c };
        handles.push(h);
        el.addEventListener('pointerdown', function (e) {
          var p = picOf(card);
          if (!p) return;
          e.preventDefault();
          el.setPointerCapture(e.pointerId);
          var x0 = e.clientX, y0 = e.clientY, ratio = p.h / p.w, W = window.innerWidth;
          var left = c.charAt(1) === 'l', top = c.charAt(0) === 't';
          var move = function (ev) {
            var dx = ev.clientX - x0, dy = ev.clientY - y0;
            var l = p.l, r = p.l + p.w;
            if (left) l = Math.max(0, Math.min(r - 120, p.l + dx));
            else r = Math.min(W, Math.max(l + 120, p.l + p.w + dx));
            var w = r - l;
            var hh = ev.shiftKey ? w * ratio : Math.max(90, p.h + (top ? -dy : dy));
            setSize(card, l, w, hh);
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
      var x = parseFloat(card.style.getPropertyValue('--ov-x'));
      if (w > 0 && r > 0) {
        var o = { w: +w.toFixed(5), r: +r.toFixed(5) };
        if (x >= 0) o.x = +x.toFixed(5);
        out[card.getAttribute('data-slug')] = o;
      }
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
