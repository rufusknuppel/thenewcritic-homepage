// THE EDIT MODE (2026-09-24). With ?edit in the front page's address
// (and a window 1024 or wider), every picture takes a handle on each of
// its four corners and a bar on each side: drag a corner to move that corner — a left one moves the
// picture's left edge, a right one its right edge; a top or bottom one
// its height (Shift keeps its proportions); a side bar moves that one
// edge alone — the left and right bars the width, the top and bottom
// bars the height — and the page re-seats
// itself on letting go (the fitter's 36s hold, so where a picture
// starts DOWN the page is still the rules', and a picture made taller
// from the top grows downward once let go). Double-click a handle to
// give that picture back its kind's size and seat. Press anywhere else
// on a picture and drag to move it whole: across, and down or up by an
// offset from where the rules would seat it (the cards under it follow).
// The picture last touched takes an ADJUST button (or press A) that
// snaps its edges to the 36s: the window's margins, the page's middle,
// and the pictures beside it. SAVE sends every
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
    '.nc-edit-handle.c-l,.nc-edit-handle.c-r{border-radius:3px;width:10px;height:36px;cursor:ew-resize}' +
    '.nc-edit-handle.c-t,.nc-edit-handle.c-b{border-radius:3px;width:36px;height:10px;cursor:ns-resize}' +
    '.nc-edit-size{position:absolute;z-index:2147483000;font:12px/1 Courier,monospace;color:#fff;background:#1184C4;padding:4px 6px;pointer-events:none;white-space:nowrap}' +
    '.nc-edit-bar{position:fixed;left:16px;bottom:16px;z-index:2147483001;display:flex;gap:8px;align-items:center;' +
    'font:12px/1 Courier,monospace;text-transform:uppercase;color:#fff;background:#121417;border:1px solid #1184C4;padding:8px 10px}' +
    '.nc-edit-bar button{font:inherit;text-transform:inherit;color:#121417;background:#fff;border:0;padding:6px 8px;cursor:pointer}' +
    '.nc-edit-bar button.is-go{background:#1184C4;color:#fff}' +
    '.nc-edit-dirty .nc-edit-bar{border-color:#fff}' +
    '.nc-edit-adjust{position:absolute;z-index:2147483000;font:12px/1 Courier,monospace;text-transform:uppercase;color:#fff;background:#1184C4;border:2px solid #fff;padding:6px 8px;cursor:pointer}' +
    '.nc-edit-on main.has-mega .page-rows .card{pointer-events:none!important}' +
    '.nc-edit-on body{cursor:default}' +
    '.nc-edit-handle[hidden],.nc-edit-adjust[hidden]{display:none!important}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.className = 'nc-edit-bar';
  bar.innerHTML = '<span class="nc-edit-msg">Edit · drag a picture (one way at a time; Option frees it), a corner, or a side bar (one edge) · double-click resets</span>' +
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
  // (nothing is drawn over the head band and the strip under it: a
  // handle whose picture has gone under them is hidden)
  function headFoot() {
    var el = document.querySelector('.page-rows > .sub-ticker--head') || document.querySelector('.page-rows > .section-band');
    return el ? el.getBoundingClientRect().bottom : 0;
  }
  function place() {
    var hf = headFoot();
    var cp = current && wide() && picOf(current);
    if (cp && cp.t + 12 < hf) cp = null;
    adjustBtn.hidden = !cp;
    if (cp) {
      adjustBtn.style.left = (cp.l + scrollX + 12) + 'px';
      adjustBtn.style.top = (cp.t + scrollY + 12) + 'px';
    }
    handles.forEach(function (h) {
      var p = wide() && picOf(h.card);
      if (!p) { h.el.hidden = true; return; }
      h.el.hidden = false;
      var hx = /l/.test(h.c) ? 'l' : /r/.test(h.c) ? 'r' : '', vy = /t/.test(h.c) ? 't' : /b/.test(h.c) ? 'b' : '';
      var x = hx === 'l' ? p.l : hx === 'r' ? p.l + p.w : p.l + p.w / 2;
      var y = vy === 't' ? p.t : vy === 'b' ? p.t + p.h : p.t + p.h / 2;
      var hw = h.el.offsetWidth || HANDLE, hh = h.el.offsetHeight || HANDLE;
      if (y - hh / 2 < hf) { h.el.hidden = true; return; }
      h.el.style.left = (Math.max(0, Math.min(document.documentElement.clientWidth - hw, x - hw / 2)) + scrollX) + 'px';
      h.el.style.top = (y + scrollY - hh / 2) + 'px';
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
    card.style.removeProperty('--ov-dy');
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

  // ADJUST (2026-09-24): the picture last dragged or clicked takes an
  // ADJUST button (and the A key does the same): its edges snap to the
  // 36s — its left to 36 from the window's edge, 18 past the page's
  // middle, or 36 past the right edge of a picture beside it; its right
  // to 36 short of the window's edge, 18 short of the middle, or 36
  // short of a picture beside it — each to the nearest such line within
  // 120; and its offset down or up is cleared, so the rules seat it 36
  // from the cards over and under it. Its height stays.
  var SNAP = 120, current = null;
  var adjustBtn = document.createElement('button');
  adjustBtn.type = 'button';
  adjustBtn.className = 'nc-edit-adjust';
  adjustBtn.textContent = 'Adjust';
  adjustBtn.hidden = true;
  function choose(card) { current = card; queue(); }
  function adjust(card) {
    var p = picOf(card);
    if (!p) return;
    var W = window.innerWidth, l = p.l, r = p.l + p.w;
    var lefts = [36, W / 2 + 18], rights = [W - 36, W / 2 - 18];
    cards().forEach(function (o) {
      if (o === card) return;
      var q = picOf(o);
      if (!q || !(q.t < p.t + p.h + 72 && p.t < q.t + q.h + 72)) return;
      if (q.l + q.w / 2 < p.l + p.w / 2) lefts.push(q.l + q.w + 36); else rights.push(q.l - 36);
    });
    var near = function (v, list) {
      var best = v, d = SNAP;
      list.forEach(function (c) { if (Math.abs(c - v) < d) { d = Math.abs(c - v); best = c; } });
      return best;
    };
    var nl = near(l, lefts), nr = near(r, rights);
    if (nr - nl < 120) { nl = l; nr = r; }
    setSize(card, nl, nr - nl, p.h);
    card.style.removeProperty('--ov-dy');
    say('Adjusted to the 36s · Save to keep it');
    root.classList.add('nc-edit-dirty');
    refit();
  }
  adjustBtn.addEventListener('click', function () { if (current) adjust(current); });
  window.addEventListener('keydown', function (e) {
    if ((e.key === 'a' || e.key === 'A') && current && !e.metaKey && !e.ctrlKey && !(e.target && /input|textarea/i.test(e.target.tagName))) adjust(current);
  });

  function start() {
    document.body.appendChild(bar);
    document.body.appendChild(label);
    document.body.appendChild(adjustBtn);
    cards().forEach(function (card) {
      // (the corners move two edges; the sides one — the left and right
      // bars its width, the top and bottom bars its height)
      ['tl', 'tr', 'bl', 'br', 'l', 'r', 't', 'b'].forEach(function (c) {
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
          var hx = /l/.test(c) ? 'l' : /r/.test(c) ? 'r' : '', vy = /t/.test(c) ? 't' : /b/.test(c) ? 'b' : '';
          var move = function (ev) {
            var dx = ev.clientX - x0, dy = ev.clientY - y0;
            var l = p.l, r = p.l + p.w;
            if (hx === 'l') l = Math.max(0, Math.min(r - 120, p.l + dx));
            else if (hx === 'r') r = Math.min(W, Math.max(l + 120, p.l + p.w + dx));
            var w = r - l;
            var hh = ev.shiftKey && hx ? w * ratio : vy ? Math.max(90, p.h + (vy === 't' ? -dy : dy)) : p.h;
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
            choose(card);
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
        var dy = parseFloat(card.style.getPropertyValue('--ov-dy'));
        if (dy) o.dy = +dy.toFixed(5);
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
    if (act === 'reset') { cards().forEach(clearSize); current = null; dirty(); refit(); return; }
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

  var own = function (t) { return t && t.closest && t.closest('.nc-edit-handle, .nc-edit-bar, .nc-edit-adjust'); };
  // THE WHOLE PICTURE MOVES (2026-09-24): pressed anywhere on a picture
  // (not a handle), it follows the hand — across, its left edge (x);
  // down or up, an offset from the seat the rules give it (dy, a share
  // of the window's width), which the fitter adds to its seat, so the
  // cards under it re-seat round it (seatRowGaps). While it is carried
  // it rides on a translate; on letting go the offset is stated and the
  // page re-seats.
  root.classList.add('nc-edit-on');
  // (the hand shows MOVE over a picture — the cards take no pointer here)
  window.addEventListener('pointermove', function (e) {
    if (e.buttons) return;
    var over = wide() && !own(e.target) && cards().some(function (card) {
      var q = picOf(card);
      return q && e.clientX >= q.l && e.clientX <= q.l + q.w && e.clientY >= q.t && e.clientY <= q.t + q.h;
    });
    document.body.style.cursor = over ? 'move' : '';
  }, true);
  // (and the page's own hover — the cue and the scrim a picture takes
  // under the hand — sleeps: the hand's moves stop here, short of the
  // page's listeners, except over the edit mode's own controls)
  ['pointermove', 'mousemove', 'pointerover', 'mouseover', 'pointerenter', 'mouseenter'].forEach(function (type) {
    window.addEventListener(type, function (e) { if (!own(e.target)) e.stopPropagation(); }, true);
  });
  window.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !wide() || own(e.target)) return;
    var hit = null, p = null;
    cards().some(function (card) {
      var q = picOf(card);
      if (q && e.clientX >= q.l && e.clientX <= q.l + q.w && e.clientY >= q.t && e.clientY <= q.t + q.h) { hit = card; p = q; return true; }
      return false;
    });
    if (!hit) return;
    e.preventDefault(); e.stopPropagation();
    var card = hit, x0 = e.clientX, y0 = e.clientY, W = window.innerWidth;
    var dy0 = parseFloat(card.style.getPropertyValue('--ov-dy')) || 0;
    var moved = false;
    var axis = null;
    var move = function (ev) {
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      // (ONE WAY AT A TIME, 2026-09-24: the carry keeps to the way it
      // set out in — across or down — once the hand has gone 8; Option
      // held frees it)
      if (!axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (!ev.altKey) { if (axis === 'x') dy = 0; else if (axis === 'y') dx = 0; }
      var l = Math.max(0, Math.min(W - p.w, p.l + dx));
      setSize(card, l, p.w, p.h);
      card.style.translate = '0 ' + dy + 'px';
      label.hidden = false;
      label.textContent = 'x ' + Math.round(l) + ' · ' + (dy >= 0 ? '+' : '') + Math.round(dy);
      label.style.left = (ev.clientX + scrollX + 14) + 'px';
      label.style.top = (ev.clientY + scrollY + 14) + 'px';
      queue();
    };
    var up = function (ev) {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      label.hidden = true;
      card.style.translate = '';
      choose(card);
      if (!moved) return;
      var dy = ev.clientY - y0;
      if (axis === 'x' && !ev.altKey) dy = 0;
      card.style.setProperty('--ov-dy', (dy0 + dy / W).toFixed(5));
      dirty();
      refit();
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  }, true);

  // THE PAGE HOLDS STILL WHILE IT IS EDITED: a click anywhere but on a
  // handle or the bar opens nothing — no post, no preview — so a missed
  // handle cannot take the reader out of the edit mode. (Caught on the
  // way down, before any of the page's own listeners.)
  ['click', 'auxclick', 'dblclick', 'mousedown', 'mouseup', 'pointerup'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (own(e.target)) return;
      if (type === 'click' || type === 'auxclick' || e.target.closest && e.target.closest('a, button, [role=button], .card')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
  // (and a link that would open another way — Enter on a focused one)
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('a') && !own(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
