// THE STORE'S PAGE (2026-10-23; store.js renders it, style.css THE STORE): the shelves under the band, a product's
// own view when the address names it (store.html#bird-cap), and the bag. Live, the bag is a Shopify cart made through
// the Storefront API and kept by its id, and Checkout goes to Shopify's checkout for it; on the stand-in products it
// is kept in the browser alone and Checkout stays shut.
(function () {
  var dataEl = document.getElementById('store-data');
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var KEY = DATA.live ? 'tnc-cart-id' : 'tnc-sample-bag';
  var byVariant = {};
  DATA.products.forEach(function (p) { p.variants.forEach(function (v) { byVariant[v.id] = { p: p, v: v }; }); });

  var store = function (k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    return null;
  };
  var money = function (n, cur) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  };

  // ---------- the cart: Shopify's, or the browser's ----------
  var CART = 'id checkoutUrl totalQuantity cost { subtotalAmount { amount currencyCode } } '
    + 'lines(first: 100) { nodes { id quantity merchandise { ... on ProductVariant { id } } } }';
  var gql = function (query, variables) {
    return fetch('https://' + DATA.domain + '/api/' + DATA.apiVersion + '/graphql.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': DATA.token },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.errors) throw new Error(j.errors[0].message);
      return j.data;
    });
  };
  var fromShopify = function (c) {
    if (!c) return null;
    return {
      id: c.id,
      checkoutUrl: c.checkoutUrl,
      lines: c.lines.nodes.map(function (l) { return { id: l.id, variant: l.merchandise.id, qty: l.quantity }; }),
      total: Number(c.cost.subtotalAmount.amount),
      currency: c.cost.subtotalAmount.currencyCode
    };
  };
  var mutate = function (name, args, vars) {
    return gql('mutation M(' + args + ') { ' + name + ' { cart { ' + CART + ' } userErrors { message } } }', vars)
      .then(function (d) { var r = d[name.split('(')[0]]; if (r.userErrors.length) throw new Error(r.userErrors[0].message); return fromShopify(r.cart); });
  };
  var live = {
    load: function () {
      var id = store(KEY);
      if (!id) return Promise.resolve(null);
      return gql('query C($id: ID!) { cart(id: $id) { ' + CART + ' } }', { id: id }).then(function (d) { return fromShopify(d.cart); });
    },
    add: function (cart, variant) {
      if (!cart) return mutate('cartCreate(input: { lines: $lines })', '$lines: [CartLineInput!]!', { lines: [{ merchandiseId: variant, quantity: 1 }] });
      return mutate('cartLinesAdd(cartId: $id, lines: $lines)', '$id: ID!, $lines: [CartLineInput!]!', { id: cart.id, lines: [{ merchandiseId: variant, quantity: 1 }] });
    },
    set: function (cart, line, qty) {
      if (qty < 1) return mutate('cartLinesRemove(cartId: $id, lineIds: $ids)', '$id: ID!, $ids: [ID!]!', { id: cart.id, ids: [line.id] });
      return mutate('cartLinesUpdate(cartId: $id, lines: $lines)', '$id: ID!, $lines: [CartLineUpdateInput!]!', { id: cart.id, lines: [{ id: line.id, quantity: qty }] });
    },
    keep: function (cart) { store(KEY, cart ? cart.id : null); }
  };
  var local = {
    load: function () {
      var lines = [];
      try { lines = JSON.parse(store(KEY) || '[]'); } catch (e) {}
      return Promise.resolve(local.total({ id: 'local', checkoutUrl: '', lines: lines.filter(function (l) { return byVariant[l.variant]; }) }));
    },
    total: function (cart) {
      cart.total = cart.lines.reduce(function (s, l) { return s + byVariant[l.variant].v.price * l.qty; }, 0);
      cart.currency = cart.lines.length ? byVariant[cart.lines[0].variant].v.currency : 'USD';
      return cart;
    },
    add: function (cart, variant) {
      var line = cart.lines.filter(function (l) { return l.variant === variant; })[0];
      if (line) line.qty++; else cart.lines.push({ id: variant, variant: variant, qty: 1 });
      return Promise.resolve(local.total(cart));
    },
    set: function (cart, line, qty) {
      cart.lines = cart.lines.filter(function (l) { if (l.id === line.id) l.qty = qty; return l.qty > 0; });
      return Promise.resolve(local.total(cart));
    },
    keep: function (cart) { store(KEY, JSON.stringify(cart.lines.map(function (l) { return { id: l.id, variant: l.variant, qty: l.qty }; }))); }
  };
  var api = DATA.live ? live : local;
  var cart = null;

  // ---------- the bag ----------
  var bag = document.getElementById('sto-bag');
  // (out to the body's end: main stacks under the name, so a bag inside it lay under CRITIC however high its z-index)
  document.body.appendChild(bag);
  var opener = document.querySelector('.sto-bag-open');
  var count = document.querySelector('.sto-bag-count');
  var list = bag.querySelector('.sto-bag__lines');
  var empty = bag.querySelector('.sto-bag__empty');
  var foot = bag.querySelector('.sto-bag__foot');
  var totalEl = bag.querySelector('.sto-bag__total');
  var checkout = bag.querySelector('.sto-checkout');
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };

  var draw = function () {
    var lines = cart ? cart.lines : [];
    var n = lines.reduce(function (s, l) { return s + l.qty; }, 0);
    count.textContent = '(' + n + ')';
    empty.hidden = n > 0;
    foot.hidden = n === 0;
    list.innerHTML = lines.map(function (l) {
      var hit = byVariant[l.variant];
      if (!hit) return '';
      var pic = hit.v.image || hit.p.image;
      var opts = hit.p.options.length ? hit.v.title : '';
      return '<li class="sto-line" data-line="' + esc(l.id) + '">'
        + (pic ? '<img class="sto-line__img" src="' + esc(pic) + '" alt="">' : '<span class="sto-line__img sto-blank"></span>')
        + '<span class="sto-line__words"><a class="sto-line__name" href="#' + esc(hit.p.handle) + '">' + esc(hit.p.title) + '</a>'
        + (opts ? '<span class="sto-line__opts">' + esc(opts) + '</span>' : '')
        + '<span class="sto-line__qty"><button type="button" data-qty="-1" aria-label="One fewer">&minus;</button><span>' + l.qty + '</span>'
        + '<button type="button" data-qty="1" aria-label="One more">+</button></span></span>'
        + '<span class="sto-line__price">' + money(hit.v.price * l.qty, hit.v.currency) + '</span></li>';
    }).join('');
    totalEl.textContent = cart ? money(cart.total, cart.currency) : '';
    if (DATA.live && cart) checkout.href = cart.checkoutUrl;
  };
  var busy = false;
  var change = function (p) {
    if (busy) return Promise.resolve();
    busy = true;
    bag.classList.add('is-busy');
    return p.then(function (c) { cart = c; api.keep(cart); draw(); })
      .catch(function (e) { console.warn('store:', e.message); })
      .then(function () { busy = false; bag.classList.remove('is-busy'); });
  };
  var openBag = function (open) {
    bag.hidden = !open;
    opener.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('sto-bag-is-open', open);
  };
  opener.addEventListener('click', function () { openBag(bag.hidden); });
  bag.querySelector('.sto-bag-close').addEventListener('click', function () { openBag(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bag.hidden) openBag(false); });
  // (a click anywhere off the bag shuts it — the page beside it is still the page)
  document.addEventListener('click', function (e) {
    if (!bag.hidden && !bag.contains(e.target) && !opener.contains(e.target) && !e.target.closest('[data-add]')) openBag(false);
  });
  list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qty]');
    if (!b || !cart) return;
    var id = b.closest('.sto-line').getAttribute('data-line');
    var line = cart.lines.filter(function (l) { return l.id === id; })[0];
    if (line) change(api.set(cart, line, line.qty + Number(b.getAttribute('data-qty'))));
  });
  checkout.addEventListener('click', function (e) { if (!DATA.live || !cart) e.preventDefault(); });

  // A cart Shopify has closed (paid, or expired) comes back null: start a fresh one.
  api.load().then(function (c) { cart = c; if (!c) api.keep(null); draw(); }).catch(function () { api.keep(null); draw(); });

  // ---------- the shelves and a product's view ----------
  var grid = document.querySelector('.sto-grid');
  var shelves = [].slice.call(document.querySelectorAll('.sto-shelf'));
  var tiles = [].slice.call(document.querySelectorAll('.sto-tile'));
  var views = [].slice.call(document.querySelectorAll('.sto-view'));
  var sto = document.querySelector('.sto');
  var showShelf = function (s) {
    shelves.forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-shelf') === s); });
    tiles.forEach(function (t) { t.hidden = !!s && t.getAttribute('data-shelf') !== s; });
  };
  shelves.forEach(function (b) {
    b.addEventListener('click', function () {
      if (location.hash.length > 1) history.pushState(null, '', location.pathname + location.search);
      route();
      showShelf(b.getAttribute('data-shelf'));
    });
  });
  var route = function () {
    var h = decodeURIComponent(location.hash.slice(1));
    var view = null;
    views.forEach(function (v) { var on = v.id === h; v.hidden = !on; if (on) view = v; });
    grid.hidden = !!view;
    sto.classList.toggle('is-viewing', !!view);
    if (view || h === '') window.scrollTo({ top: 0, behavior: 'instant' });
  };
  addEventListener('hashchange', route);
  route();

  views.forEach(function (view) {
    var p = DATA.products.filter(function (x) { return x.handle === view.id; })[0];
    if (!p) return;
    var priceEl = view.querySelector('[data-price]');
    var add = view.querySelector('[data-add]');
    var chosen = function () {
      var want = {};
      [].slice.call(view.querySelectorAll('.sto-opt')).forEach(function (f) {
        var on = f.querySelector('input:checked');
        want[f.getAttribute('data-option')] = on ? on.value : '';
      });
      return p.variants.filter(function (v) {
        return Object.keys(want).every(function (k) { return v.options[k] === want[k]; });
      })[0];
    };
    var sync = function () {
      var v = chosen();
      priceEl.textContent = v ? money(v.price, v.currency) : '';
      add.disabled = !v || !v.available;
      add.textContent = v && v.available ? 'Add to bag' : 'Sold out';
      return v;
    };
    view.addEventListener('change', sync);
    sync();
    add.addEventListener('click', function () {
      var v = sync();
      if (!v || !v.available) return;
      change(api.add(cart, v.id)).then(function () { openBag(true); });
    });
  });
})();
