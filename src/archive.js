// THE ARCHIVE'S INDEX (2026-10-23 — "I want the archive to look like this, with three columns though"; build.js
// renderArchivePage, style.css THE ARCHIVE AN INDEX): the field narrows the index — a title, a writer, a tag — the
// letters and the sections left empty going with their titles; the cards' deep links narrow it too (#author=, #topic=
// fill the field with the name; #section= keeps that section alone) or land on their title (#post=). (The head over it
// — the name, the band — is src/front-head.js.)
(function () {
  var de = document.documentElement;
  var band = document.querySelector('main.has-mega .op-band');
  var arc = document.querySelector('.arc');
  var items = arc ? [].slice.call(arc.querySelectorAll('.arc-ix-item')) : [];
  if (!items.length) return;
  var grps = [].slice.call(arc.querySelectorAll('.arc-ix-grp'));
  var secs = [].slice.call(arc.querySelectorAll('.arc-ix-sec'));
  var none = arc.querySelector('.arc-none');
  var search = arc.querySelector('.arc-search'), clear = arc.querySelector('.arc-clear');
  var count = arc.querySelector('.arc-count');
  var tagAs = [].slice.call(arc.querySelectorAll('.arc-ix-tag'));
  var readHash = function () {
    var hp = {};
    location.hash.slice(1).split('&').forEach(function (kv) {
      var eq = kv.indexOf('=');
      if (eq > 0) hp[kv.slice(0, eq)] = decodeURIComponent(kv.slice(eq + 1));
    });
    return hp;
  };
  var textOf = function (r) {
    if (r.__t == null) r.__t = [r.getAttribute('data-title'), r.textContent, r.getAttribute('data-author'),
      r.getAttribute('data-kicker'), r.getAttribute('data-section')].join(' ').replace(/­/g, '').replace(/[‘’]/g, "'").toLowerCase();
    return r.__t;
  };
  // (what is left, in words, for a reader that hears it — "Ninety-six pieces", "Nothing matches “zzz”")
  var ONES = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var inWords = function (n) { return n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : String(n); };
  var say = function (n, words) {
    if (!count) return;
    var t = !n ? 'nothing' + (words ? ' matches “' + words + '”' : '')
      : inWords(n) + (n === 1 ? ' piece' : ' pieces') + (words ? ' matching “' + words + '”' : '');
    count.textContent = t.charAt(0).toUpperCase() + t.slice(1);
  };
  var writerNames = {};
  [].forEach.call(arc.querySelectorAll('.arc-who__w'), function (b) { writerNames[b.getAttribute('data-name').toLowerCase()] = 1; });
  var afterFilter = [];
  var applyFilter = function () {
    var hp = readHash();
    var sec = (hp.section || '').toLowerCase(), topic = (hp.topic || '').toLowerCase();
    var typed = search ? search.value.trim() : '';
    var words = typed.replace(/[‘’]/g, "'").toLowerCase().split(/\s+/).filter(Boolean);
    // (a writer's whole name in the field — pressed in the writers' column, on their tag, or typed — keeps their essays
    // and contras alone, the postscripts they sat down for out: "Postscripts shouldn't be listed under writers for Elan,
    // Tessa, and Rufus", 2026-10-24)
    var who = writerNames[typed.toLowerCase()] ? typed.toLowerCase() : '';
    var shown = 0;
    items.forEach(function (r) {
      var on = (!sec || r.getAttribute('data-section') === sec) && (!topic || r.getAttribute('data-kicker') === topic);
      if (on && who) on = /^(essays|contra)$/.test(r.getAttribute('data-section'))
        && (r.getAttribute('data-author') || '').split(/\s*(?:&|,|\band\b)\s*/).some(function (n) { return n.trim() === who; });
      else if (on) for (var w = 0; w < words.length; w++) if (textOf(r).indexOf(words[w]) < 0) { on = false; break; }
      r.hidden = !on;
      if (on) shown++;
    });
    grps.forEach(function (g) { g.hidden = !g.querySelector('.arc-ix-item:not([hidden])'); });
    secs.forEach(function (s) { s.hidden = !s.querySelector('.arc-ix-item:not([hidden])'); });
    say(shown, typed);
    if (clear) clear.hidden = !(sec || topic || words.length);
    tagAs.forEach(function (t) { var v = t.getAttribute('data-v'), k = t.getAttribute('data-kind'); var on = (k === 'section' ? sec : topic) === v; t.classList.toggle('is-on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    if (none) none.hidden = shown > 0;
    // (nothing left: the index's columns go and the line stands where Essays stood — style.css NOTHING WHERE ESSAYS STANDS)
    arc.classList.toggle('is-empty', !shown);
    afterFilter.forEach(function (f) { f(); });
  };
  // (a writer's or a tag's link fills the field with the name, as the reader would have typed it)
  var fromHash = function () {
    var hp = readHash();
    // (a tag's link is a tag of its own here since — the tags under the field — and keeps its kind alone)
    var name = hp.author || '';
    // (a link's name set as the writer's own, capitals and all — a lowercased one from an older link put back as the
    // index writes it: a writer in the writers' column, else the byline it matches)
    if (name) {
      var low = name.toLowerCase(), as = null;
      [].forEach.call(arc.querySelectorAll('.arc-who__w, .arc-ix-by'), function (e) { var t = e.textContent.trim(); if (!as && t.toLowerCase() === low) as = t; });
      if (as) name = as;
    }
    if (search && name) search.value = name;
  };

  // THE LANDING: a named title in the middle of the room under the band
  var findRow = arc.querySelector('.arc-find-row');
  var bandH = function () { return band ? band.getBoundingClientRect().height : 0; };
  var target = null;
  var land = function () {
    if (!target) return;
    // (under the band and the search's row pinned under it)
    var top = bandH() + (findRow ? findRow.offsetHeight : 0), r = target.getBoundingClientRect(), room = de.clientHeight - top;
    window.scrollTo({ top: Math.max(0, window.pageYOffset + r.top - top - Math.max(0, (room - r.height) / 2)), behavior: 'instant' });
  };
  var arcMain = arc.querySelector('.arc-main') || arc;
  var toHead = function () {
    var y = window.pageYOffset + arcMain.getBoundingClientRect().top - bandH() + 4;
    if (window.pageYOffset > y + 0.5) window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  };
  var hp0 = readHash();
  if (hp0.post) items.forEach(function (r) { if (r.getAttribute('data-slug') === hp0.post) target = r; });
  if (target) target.classList.add('is-target');
  fromHash();
  applyFilter();
  if (target) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var tries = 0, settle = setInterval(function () { dispatchEvent(new Event('newcritic:lay')); land(); if (++tries >= 8) clearInterval(settle); }, 250);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { clearInterval(settle); }, { once: true, passive: true }); });
    land();
  }
  addEventListener('hashchange', function () {
    if (target) target.classList.remove('is-target');
    target = null; fromHash(); applyFilter(); toHead();
  });
  if (search) {
    search.addEventListener('input', function () { applyFilter(); toHead(); });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { search.value = ''; applyFilter(); search.blur(); }
      if (e.key === 'Enter') e.preventDefault();
    });
  }
  if (clear) clear.addEventListener('click', function () {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    if (search) search.value = '';
    applyFilter(); toHead();
  });

  // (a tag pressed keeps its kind alone — a section, a tag, or one of each — and pressed again lets it go; the field's
  // words kept)
  tagAs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      var hp = readHash(), k = t.getAttribute('data-kind'), v = t.getAttribute('data-v');
      if (hp[k] === v) delete hp[k]; else hp[k] = v;
      delete hp.post; delete hp.sort;
      var h = Object.keys(hp).map(function (q) { return q + '=' + encodeURIComponent(hp[q]); }).join('&');
      try { history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : '')); } catch (er) { location.hash = h; }
      if (target) { target.classList.remove('is-target'); target = null; }
      applyFilter(); toHead();
    });
  });

  // THE SIDE COLUMNS ON THE WINDOW'S MIDDLE FROM THE FIRST LOOK (2026-10-23 — "search should look vertically centered
  // on inital load"): the two side columns are the window's height less the band, centred in themselves, so while the
  // head still stands over them (before they pin) their middles hang below the window's room; lifted half the head's
  // height still showing, the search stands on the middle of what is seen, and settle home as they pin
  // (style.css THE SIDE COLUMNS LIFTED)
  var lift = function () {
    var cut = arcMain.getBoundingClientRect().top - (parseFloat(getComputedStyle(de).getPropertyValue('--arc-band')) || bandH());
    arcMain.style.setProperty('--arc-lift', Math.max(0, cut / 2).toFixed(1) + 'px');
  };
  lift();
  addEventListener('scroll', lift, { passive: true });
  addEventListener('resize', lift);

  // THE ESSAYS' WRITERS (2026-10-24 — "When someone clicks the name of the author should be a filter on the search
  // function"): a writer pressed puts the name in the search, as typed, and the index narrows to them; pressed again,
  // or another typed over it, lets it go (build.js renderArchivePage)
  var whos = [].slice.call(arc.querySelectorAll('.arc-who__w'));
  var markWho = function () {
    var v = search ? search.value.trim().toLowerCase() : '';
    whos.forEach(function (b) { var on = b.getAttribute('data-name').toLowerCase() === v; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  };
  whos.forEach(function (b) {
    b.addEventListener('click', function () {
      if (!search) return;
      var n = b.getAttribute('data-name');
      search.value = search.value.trim().toLowerCase() === n.toLowerCase() ? '' : n;
      if (target) { target.classList.remove('is-target'); target = null; }
      applyFilter(); markWho(); toHead();
    });
  });
  if (search) { search.addEventListener('input', markWho); search.addEventListener('keyup', markWho); }
  // (the writers narrowed with the index to those whose essays and contras still stand in it, the column gone when none do —
  // "Writers list should also shrink on search", 2026-10-24)
  var whoCol = arc.querySelector('.arc-who');
  var shrinkWho = function () {
    var left = {};
    items.forEach(function (r) {
      if (r.hidden || (r.getAttribute('data-section') !== 'essays' && r.getAttribute('data-section') !== 'contra')) return;
      (r.getAttribute('data-author') || '').split(/\s*(?:&|,|\band\b)\s*/).forEach(function (n) { if (n.trim()) left[n.trim()] = 1; });
    });
    // (a writer pressed — or typed whole — stands alone, a co-writer of theirs out of it: "When a writer is clicked for a
    // filter, their name should be the only one displayed in the writer list", 2026-10-24)
    var v = search ? search.value.trim().toLowerCase() : '';
    var one = whos.some(function (b) { return b.getAttribute('data-name').toLowerCase() === v; });
    var any = false;
    whos.forEach(function (b) { var nm = b.getAttribute('data-name').toLowerCase(); var on = one ? nm === v : !!left[nm]; b.parentNode.hidden = !on; any = any || on; });
    if (whoCol) whoCol.hidden = !any;
  };
  afterFilter.push(shrinkWho);
  shrinkWho();
  if (clear) clear.addEventListener('click', markWho);
  markWho();

  // (the writer's tag beside a title pressed puts the writer in the search, as their name in the writers' column does,
  // and the link to the post is not followed — "I want to be able to move my mouse, hover the tag with the author name,
  // click on that name and have the filter applied", 2026-10-24)
  items.forEach(function (r) {
    var by = r.querySelector('.arc-ix-by');
    if (!by) return;
    by.addEventListener('click', function (e) {
      if (!search || !by.textContent.trim() || !matchMedia('(min-width: 1024px) and (hover: hover)').matches) return;
      e.preventDefault(); e.stopPropagation();
      var n = by.textContent.trim();
      search.value = search.value.trim().toLowerCase() === n.toLowerCase() ? '' : n;
      if (target) { target.classList.remove('is-target'); target = null; }
      applyFilter(); markWho(); toHead();
    });
  });

  // THE POST'S OPENING IN THE RIGHT COLUMN (2026-10-24 — "On hover, I want the right column to fill with a body text
  // preview of the post, set 54px from top bottom and sides"; no date in it since — "Remove the date from the preview
  // column"): a hand on an entry, or the keys on it, fills the right column with its opening paragraphs (build.js
  // renderArchivePage); the paragraphs that would run past the column's foot dropped and the one crossing it cut at its
  // last whole line with an ellipsis, as the front page's previews are; it stays till another entry takes its place
  // (style.css THE POST'S OPENING IN THE RIGHT COLUMN)
  var peek = arc.querySelector('.arc-peek'), peekData = null, peekWant = null;
  if (peek && peek.getAttribute('data-src') && window.fetch) {
    var peekBody = peek.querySelector('.arc-peek__body'), peekAt = null;
    // THE CUT AS THE FRONT PAGE'S (2026-10-24 — "have ellipsis for body preview work exactly as it does on homepage body
    // previews": duo-panel-fit.js cutPlates): the paragraph crossing the column's foot cut to the last whole word the
    // room holds, its trailing point or comma given up to the … joined on ("below." reads "below…"), the … in a mark of
    // no width so it costs the line nothing — set in the line where the line has room for it; an opening that ends on a
    // whole paragraph closes on a … too, its full stop traded for it
    var cutTo = function (p, html, n) {
      p.innerHTML = html;
      var tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), t, seen = 0, last = null;
      while ((t = tw.nextNode())) {
        var re = /\S+/g, m, end = -1;
        while ((m = re.exec(t.nodeValue))) { if (++seen === n) { end = m.index + m[0].length; break; } }
        if (end > -1) { t.nodeValue = t.nodeValue.slice(0, end); last = t; break; }
      }
      if (!last) return;
      for (var nd = last; nd && nd !== p; nd = nd.parentNode) while (nd.nextSibling) nd.parentNode.removeChild(nd.nextSibling);
      last.nodeValue = last.nodeValue.replace(/[.,;:\s]+$/, '');
      var mark = document.createElement('span');
      mark.className = 'cut-mark';
      mark.textContent = '…';
      p.appendChild(mark);
    };
    var cutPara = function (p, foot) {
      var html = p.innerHTML, words = (p.textContent.match(/\S+/g) || []).length;
      var lo = 0, hi = words;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        cutTo(p, html, mid);
        if (p.getBoundingClientRect().bottom > foot + 0.5) hi = mid - 1; else lo = mid;
      }
      if (!lo) return false;
      cutTo(p, html, lo);
      var mk = p.querySelector('.cut-mark'), h0 = p.getBoundingClientRect().height;
      mk.classList.add('is-set');
      if (p.getBoundingClientRect().height > h0 + 1) mk.classList.remove('is-set');
      return true;
    };
    var fitPeek = function () {
      var paras = [].slice.call(peekBody.children);
      var foot = peekBody.getBoundingClientRect().bottom;
      for (var i = 0; i < paras.length; i++) {
        if (paras[i].getBoundingClientRect().bottom <= foot + 0.5) continue;
        for (var j = paras.length - 1; j > i; j--) peekBody.removeChild(paras[j]);
        if (!cutPara(paras[i], foot)) peekBody.removeChild(paras[i]);
        break;
      }
      var last = peekBody.lastElementChild;
      if (last && !last.querySelector('.cut-mark') && !/…\s*$/.test(last.textContent)) {
        var tw = document.createTreeWalker(last, NodeFilter.SHOW_TEXT), tn = null, n;
        while ((n = tw.nextNode())) if (n.nodeValue.trim()) tn = n;
        if (tn) tn.nodeValue = tn.nodeValue.replace(/[.\s]*$/, '') + '…';
        // (the … run onto a line past the foot: the paragraph cut as a crossing one is)
        if (last.getBoundingClientRect().bottom > foot + 0.5 && !cutPara(last, foot)) peekBody.removeChild(last);
      }
    };
    // (the ink centred, not the lines: the title's letters' tops and the opening's last letters' feet as far from the
    // column's middle as each other — the title's line has more room over its capitals than the last line has under its
    // letters, so the block, centred by its lines, stood low; nudged by the difference, --peek-nudge — "make sure ink is vertically
    // centered in body text column", 2026-10-24)
    var inkCtx = document.createElement('canvas').getContext('2d');
    var baseOf = function (el, atEnd) {
      var m = document.createElement('span');
      m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      if (atEnd) el.appendChild(m); else el.insertBefore(m, el.firstChild);
      var y = m.getBoundingClientRect().top; m.remove(); return y;
    };
    var inkOf = function (el, text) {
      var cs = getComputedStyle(el);
      inkCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      return inkCtx.measureText(text);
    };
    // (a paragraph's first or last line, as set: its letters from the end it starts at, while they stand on one line)
    var lineOf = function (el, fromEnd) {
      var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), t, nodes = [];
      while ((t = tw.nextNode())) nodes.push(t);
      if (fromEnd) nodes.reverse();
      var out = '', lineTop = null, rng = document.createRange();
      for (var i = 0; i < nodes.length; i++) {
        var v = nodes[i].nodeValue;
        for (var j = 0; j < v.length; j++) {
          var c = fromEnd ? v.length - 1 - j : j;
          rng.setStart(nodes[i], c); rng.setEnd(nodes[i], c + 1);
          var r = rng.getBoundingClientRect();
          if (!r.height) continue;
          if (lineTop == null) lineTop = r.top;
          else if (Math.abs(r.top - lineTop) > 2) return out;
          out = fromEnd ? v.charAt(c) + out : out + v.charAt(c);
        }
      }
      return out;
    };
    var inkPeek = function () {
      peek.style.setProperty('--peek-nudge', '0px');
      var firstP = peekBody.firstElementChild, lastP = peekBody.lastElementChild;
      if (!firstP) return;
      // (from the opening's first line's tallest letters to its last line's deepest — the title, that stood over it,
      // gone: "remove title from the body preview", 2026-10-24; Read on, under it, before)
      var top = baseOf(firstP, false) - inkOf(firstP, lineOf(firstP, false)).actualBoundingBoxAscent;
      var foot = baseOf(lastP, true) + Math.max(0, inkOf(lastP, lineOf(lastP, true)).actualBoundingBoxDescent);
      var k = peek.getBoundingClientRect();
      peek.style.setProperty('--peek-nudge', ((k.top + k.bottom) / 2 - (top + foot) / 2).toFixed(2) + 'px');
    };
    var showPeek = function (r) {
      if (!peekData) { peekWant = r; return; }
      var d = peekData[r.getAttribute('data-slug')];
      if (!d) return;
      peekAt = r;
      peekBody.innerHTML = d.map(function (h) { return '<p class="arc-peek__p">' + h + '</p>'; }).join('');
      peek.classList.add('is-on');
      // (fitted once, to the room the window shows under the head as it is shown — the column less 54 over and under,
      // less the head still showing — then let go to its own height, so the lines are kept as the head scrolls away
      // and the block is centred in the column, as the search is — "for preview text, when the column grows in height
      // on scroll, don't add more lines, recenter existing lines the way search does", 2026-10-24)
      // (the room always the opening view's — the window under the whole head, at the page's top — however far down the
      // page the hand is: "have the body text preview only be as tall as the opening viewport allows", 2026-10-24)
      var band0 = parseFloat(getComputedStyle(de).getPropertyValue('--arc-band')) || bandH();
      var head0 = Math.max(0, arcMain.getBoundingClientRect().top + window.pageYOffset - band0);
      var pcs = getComputedStyle(peek), pad = (parseFloat(pcs.paddingTop) || 0) + (parseFloat(pcs.paddingBottom) || 0);
      peekBody.style.maxHeight = Math.max(0, peek.clientHeight - pad - head0) + 'px';
      fitPeek();
      peekBody.style.maxHeight = '';
      inkPeek();
    };
    // (the entry the hand last came onto stays lit — its title in the red, its date, its tag — when the hand leaves it,
    // till another entry takes its place: "leave hover until something else deactivates it", 2026-10-24; lit as a
    // landing is, is-target, whose look is the hand's)
    var lit = null;
    var light = function (r) {
      if (lit && lit !== r && lit !== target) lit.classList.remove('is-target');
      r.classList.add('is-target');
      lit = r;
    };
    items.forEach(function (r) {
      r.addEventListener('mouseenter', function () { light(r); showPeek(r); });
      r.addEventListener('focus', function () { light(r); showPeek(r); });
    });
    // (the openings fetched once the page is in — archive-peek.json, beside the page — and the entry under the hand
    // meanwhile shown when they come)
    var loadPeek = function () {
      fetch(peek.getAttribute('data-src')).then(function (res) { return res.json(); }).then(function (d) {
        peekData = d;
        if (peekWant) showPeek(peekWant);
      }).catch(function () {});
    };
    if (document.readyState === 'complete') loadPeek(); else addEventListener('load', loadPeek, { once: true });
    // (the top entry's opening there from the first look — the newest essay — and the search's top result as the
    // index narrows, till a hand comes onto an entry — "Auto display on open the most recent essay" / "Or whatever the
    // top result is of the search", 2026-10-24)
    // (and lit, as the hand lights one, since its opening is the one showing — "When archive page opens, I want top post
    // to be hovered because preview text is showing", 2026-10-24)
    var showTop = function () {
      for (var i = 0; i < items.length; i++) if (!items[i].hidden) { light(items[i]); showPeek(items[i]); return; }
    };
    afterFilter.push(showTop);
    showTop();
    addEventListener('resize', function () { if (peekAt) showPeek(peekAt); });
  }

  // (the marks lit under the hand, as on the front page — "Highlight should work on wordmark on archive", 2026-10-23:
  // latest-rail.js wires them there and is not on this page; the same main.nc-hot-* classes, so style.css THE MARKS LIT
  // TOGETHER paints them, in the white here; on body too, the name standing outside main — style.css THE ARCHIVE'S NAME LIT)
  var mn = document.querySelector('main');
  if (mn) [].forEach.call(document.querySelectorAll('a.content-name .content-name__block > .tnc-words, main .op-band > a.rail-tlm, main .op-band > a.op-tnc'), function (el) {
    var band2 = el.matches('main .op-band > a');
    el.addEventListener('mouseenter', function () {
      // (the band's two names stand one over the other, the one faded out still under the hand: the one showing is lit)
      var tlm = el.classList.contains('rail-tlm');
      if (band2 && parseFloat(getComputedStyle(el).opacity) < 0.5) tlm = !tlm;
      mn.classList.add(tlm ? 'nc-hot-tlm' : 'nc-hot-tnc');
      document.body.classList.add(tlm ? 'nc-hot-tlm' : 'nc-hot-tnc');
    });
    el.addEventListener('mouseleave', function () { mn.classList.remove('nc-hot-tlm', 'nc-hot-tnc'); document.body.classList.remove('nc-hot-tlm', 'nc-hot-tnc'); });
  });
})();
