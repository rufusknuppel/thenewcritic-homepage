// THE STORE (2026-10-23 — "I want it to be on thenewcritic.com/store";
// "I want the store to have a charcoal background"): the products come
// from Shopify (store m65bpc-ss.myshopify.com, the goods made and shipped
// by Printify) through the Storefront API at build time, the way the
// essays come from the feed; the page is ours, and Shopify only takes
// over at checkout. build.js renders store.html from what loadStore()
// hands it; src/store-bag.js runs the bag in the page.
//
// store-config.json holds the shop's domain and its Storefront API
// token — the PUBLIC token from Shopify's Headless channel, made to sit
// in web pages (it reads products and runs a cart; it can't see orders
// or customers). With no token yet the page is built on SAMPLE_PRODUCTS,
// stand-ins that say so on the page, and the bag runs in the browser
// alone with checkout shut.

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'store-config.json');

function storeConfig() {
  const base = { domain: 'm65bpc-ss.myshopify.com', token: '', apiVersion: '2026-07' };
  if (!fs.existsSync(CONFIG_FILE)) return base;
  return { ...base, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
}

const PRODUCTS_QUERY = `query StoreProducts {
  products(first: 100, sortKey: CREATED_AT, reverse: true) {
    nodes {
      handle title description descriptionHtml productType availableForSale
      collections(first: 10) { nodes { handle title } }
      images(first: 12) { nodes { url altText width height } }
      options { name optionValues { name } }
      variants(first: 100) {
        nodes {
          id title availableForSale
          price { amount currencyCode }
          selectedOptions { name value }
          image { url }
        }
      }
    }
  }
}`;

// The Storefront API's product, cut down to what the page shows. The
// shelf a product stands on is its first collection, else its type.
function normalize(p) {
  const coll = (p.collections && p.collections.nodes[0]) || null;
  const shelf = coll ? coll.title : (p.productType || 'Goods');
  const variants = p.variants.nodes.map((v) => ({
    id: v.id,
    title: v.title,
    available: v.availableForSale,
    price: Number(v.price.amount),
    currency: v.price.currencyCode,
    options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
    image: v.image ? v.image.url : '',
  }));
  return {
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml || '',
    shelf,
    available: p.availableForSale,
    images: p.images.nodes.map((i) => ({ url: i.url, alt: i.altText || '', w: i.width, h: i.height })),
    // Shopify's lone "Title / Default Title" option is no choice at all
    options: p.options
      .map((o) => ({ name: o.name, values: o.optionValues.map((v) => v.name) }))
      .filter((o) => !(o.name === 'Title' && o.values.length === 1 && o.values[0] === 'Default Title')),
    variants,
  };
}

async function fetchProducts(cfg) {
  const res = await fetch(`https://${cfg.domain}/api/${cfg.apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': cfg.token },
    body: JSON.stringify({ query: PRODUCTS_QUERY }),
  });
  if (!res.ok) throw new Error(`Storefront API ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data.products.nodes.map(normalize);
}

// Stand-ins until the token is in store-config.json: a tee and a hat,
// as the store will open with — no pictures, so the tiles say what they
// are rather than show someone else's shirt.
const SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const SAMPLE_PRODUCTS = [
  {
    handle: 'the-new-critic-tee',
    title: 'The New Critic Tee',
    descriptionHtml: '<p>Heavyweight cotton, the name across the chest and the bird on the back.</p><p>Printed to order.</p>',
    shelf: 'Tees',
    available: true,
    images: [],
    options: [{ name: 'Color', values: ['Black', 'Natural'] }, { name: 'Size', values: SIZES }],
    variants: ['Black', 'Natural'].flatMap((c) => SIZES.map((s) => ({
      id: `sample-tee-${c}-${s}`.toLowerCase(), title: `${c} / ${s}`, available: true,
      price: s === '2XL' ? 38 : 35, currency: 'USD', options: { Color: c, Size: s }, image: '',
    }))),
  },
  {
    handle: 'bird-cap',
    title: 'Bird Cap',
    descriptionHtml: '<p>An unstructured cotton cap, the bird embroidered on the front.</p><p>Made to order.</p>',
    shelf: 'Hats',
    available: true,
    images: [],
    options: [{ name: 'Color', values: ['Black', 'Stone'] }],
    variants: ['Black', 'Stone'].map((c) => ({
      id: `sample-cap-${c}`.toLowerCase(), title: c, available: true,
      price: 32, currency: 'USD', options: { Color: c }, image: '',
    })),
  },
];

async function loadStore() {
  const cfg = storeConfig();
  if (!cfg.token) {
    console.log('STORE: sample products (no token in store-config.json)');
    return { live: false, cfg, products: SAMPLE_PRODUCTS };
  }
  try {
    const products = await fetchProducts(cfg);
    console.log(`STORE: ${products.length} products from ${cfg.domain}`);
    return { live: true, cfg, products };
  } catch (e) {
    console.error(`STORE FETCH FAILED (${e.message}) — building on sample products`);
    return { live: false, cfg, products: SAMPLE_PRODUCTS, failed: true };
  }
}

// ---------- the page ----------

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function money(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}

function priceLabel(p) {
  const prices = p.variants.map((v) => v.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const cur = p.variants[0] ? p.variants[0].currency : 'USD';
  return lo === hi ? money(lo, cur) : `From ${money(lo, cur)}`;
}

// Shopify's CDN sizes an image by its URL's width parameter.
function sized(url, w) {
  return url ? `${url}${url.includes('?') ? '&' : '?'}width=${w}` : '';
}

function picture(p, img, cls, sizes) {
  if (!img) return `<span class="${cls} sto-blank" aria-hidden="true"><span>${esc(p.title)}</span></span>`;
  const set = [360, 720, 1080, 1440].map((w) => `${sized(img.url, w)} ${w}w`).join(', ');
  return `<img class="${cls}" src="${esc(sized(img.url, 720))}" srcset="${esc(set)}" sizes="${sizes}" alt="${esc(img.alt || p.title)}" loading="lazy" decoding="async">`;
}

function tile(p) {
  return `<a class="sto-tile" href="#${esc(p.handle)}" data-shelf="${esc(p.shelf)}">
        <span class="sto-tile__pic">${picture(p, p.images[0], 'sto-tile__img', '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw')}</span>
        <span class="sto-tile__name">${esc(p.title)}</span>
        <span class="sto-tile__price">${p.available ? esc(priceLabel(p)) : 'Sold out'}</span>
      </a>`;
}

// A product's own view: its pictures down the left, its words and its
// choices at the right. Every product's view is in the page (hidden till
// its #handle is the address), so a product link is a plain link.
function productView(p) {
  const pics = p.images.length
    ? p.images.map((img, i) => picture(p, img, `sto-view__img${i ? '' : ' is-first'}`, '(min-width: 1024px) 50vw, 100vw')).join('\n          ')
    : picture(p, null, 'sto-view__img is-first', '');
  const choices = p.options.map((o) => `<fieldset class="sto-opt" data-option="${esc(o.name)}">
            <legend class="sto-opt__name">${esc(o.name)}</legend>
            ${o.values.map((v, i) => `<label class="sto-opt__v"><input type="radio" name="${esc(`${p.handle}--${o.name}`)}" value="${esc(v)}"${i ? '' : ' checked'}><span>${esc(v)}</span></label>`).join('')}
          </fieldset>`).join('\n          ');
  return `<article class="sto-view" id="${esc(p.handle)}" data-handle="${esc(p.handle)}" hidden>
        <a class="sto-back" href="#">All goods</a>
        <div class="sto-view__pics">
          ${pics}
        </div>
        <div class="sto-view__words">
          <h2 class="sto-view__name">${esc(p.title)}</h2>
          <p class="sto-view__price" data-price>${esc(priceLabel(p))}</p>
          <div class="sto-view__desc">${p.descriptionHtml}</div>
          ${choices}
          <button class="sto-add" type="button" data-add>${p.available ? 'Add to bag' : 'Sold out'}</button>
          <p class="sto-view__note">Each piece is printed to order and ships in one to two weeks.</p>
        </div>
      </article>`;
}

function renderStoreBody({ live, cfg, products }) {
  const shelves = [...new Set(products.map((p) => p.shelf))];
  const shelfLinks = ['All'].concat(shelves)
    .map((s, i) => `<button class="sto-shelf${i ? '' : ' is-on'}" type="button" data-shelf="${i ? esc(s) : ''}">${esc(s)}</button>`)
    .join('<span class="sto-bar__sep">, </span>');
  // What the bag needs at run time: the variants by id, the API to call.
  const data = {
    live,
    domain: cfg.domain,
    token: live ? cfg.token : '',
    apiVersion: cfg.apiVersion,
    products: products.map((p) => ({
      handle: p.handle,
      title: p.title,
      image: p.images[0] ? sized(p.images[0].url, 240) : '',
      options: p.options.map((o) => o.name),
      variants: p.variants.map((v) => ({ id: v.id, title: v.title, available: v.available, price: v.price, currency: v.currency, options: v.options, image: v.image ? sized(v.image, 240) : '' })),
    })),
  };
  return `<section class="sto" aria-label="The New Critic store">
  <nav class="sto-bar" aria-label="Store">
    <span class="sto-bar__shelves">${shelfLinks}</span>
    <button class="sto-bag-open" type="button" aria-controls="sto-bag" aria-expanded="false">Bag <span class="sto-bag-count">(0)</span></button>
  </nav>
  ${live ? '' : '<p class="sto-sample">Stand-in products. Your Shopify catalog takes their place once the store is connected.</p>'}
  <div class="sto-grid">
      ${products.map(tile).join('\n      ')}
  </div>
  <div class="sto-views">
      ${products.map(productView).join('\n      ')}
  </div>
  <aside class="sto-bag" id="sto-bag" aria-label="Bag" hidden>
    <div class="sto-bag__head"><span class="sto-bag__title">Bag</span><button class="sto-bag-close" type="button" aria-label="Close the bag">Close</button></div>
    <ul class="sto-bag__lines"></ul>
    <p class="sto-bag__empty">The bag is empty.</p>
    <div class="sto-bag__foot">
      <p class="sto-bag__sub"><span>Subtotal</span><span class="sto-bag__total"></span></p>
      <p class="sto-bag__ship">Shipping and tax at checkout.</p>
      <a class="sto-checkout${live ? '' : ' is-shut'}" href="#"${live ? '' : ' aria-disabled="true"'}>${live ? 'Checkout' : 'Checkout opens when the store is connected'}</a>
    </div>
  </aside>
  <script type="application/json" id="store-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
</section>`;
}

module.exports = { loadStore, renderStoreBody };
