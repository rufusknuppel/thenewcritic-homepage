#!/usr/bin/env node
// Builds a static homepage for The New Critic from its Substack RSS feed,
// styled to match the existing thenewcritic.com brand (same nav, hero,
// buttons, footer, fonts, and bird mark used on the Give page).
// No dependencies — uses Node's built-in fetch (Node 18+) and a small
// hand-rolled RSS parser, so there's no npm install step required.

const fs = require('fs');
const path = require('path');

// Hand-edited per-post text overrides (kicker/title/dek/meta/preview),
// keyed by URL slug — see the field guide at the top of that file.
const CONTENT_OVERRIDES = require('./content-overrides.js');

const FEED_URL = 'https://www.thenewcritic.com/feed';
const SITE_NAME = 'The New Critic';
const SITE_TAGLINE = 'The Young American Magazine';
const SITE_URL = 'https://www.thenewcritic.com';
// Where THIS build is served: the apex domain, routed to the gh-pages
// deploy by cloudflare/worker.js. Social cards need absolute URLs, and
// the in-page relative paths (which keep the GitHub Pages subpath
// working) can't provide them — so og:url resolves against this.
const CANONICAL_ORIGIN = 'https://thenewcritic.com';
const FEATURED_COUNT = 1;
const LIST_COUNT = 14;
const OUT_DIR = path.join(__dirname, 'dist');

const SECTIONS = [
  { slug: 'essays', label: 'Essays', cardCount: 6 },
  { slug: 'postscript', label: 'Postscript', cardCount: 3 },
  { slug: 'contra', label: 'Contra', cardCount: 3 },
];

// Repeating 6-card rhythm used to size cards across the essays/postscript/
// contra grids (and the archive/list-page grids that reuse the same
// component): a 2-across "lg" card plus two 4-across "sm" cards fill one
// row (6+3+3=12), followed by three 3-across "md" cards (4+4+4=12) — both
// rows tile the 12-column grid exactly, with no leftover space. "lg" cards
// get the box-style hover treatment (room enough for an always-visible
// text box); "md"/"sm" cards keep the existing image-first hover-overlay
// treatment used everywhere else on the site.
const CARD_LAYOUT_PATTERN = [
  { span: 'lg', variant: 'box' },
  { span: 'sm', variant: '' },
  { span: 'sm', variant: '' },
  { span: 'md', variant: '' },
  { span: 'md', variant: '' },
  { span: 'md', variant: '' },
];
function cardLayoutAt(i) {
  return CARD_LAYOUT_PATTERN[i % CARD_LAYOUT_PATTERN.length];
}

// Manual first-paragraph overrides for Contra posts — hand-picked opening
// text that wins over whatever the auto-extractor pulls (historically it
// pulled nothing for Contra, whose preserved-text credits block swallowed
// the opening paragraph; that's fixed in extractParagraphs, but these
// hand edits still take precedence where present).
// Keyed by URL slug (the part after /p/) — more stable than title matching.
const CONTRA_MANUAL_PREVIEWS = new Map([
  [`contra`, `The critic has two roles: to worship excellence and to wage war on its behalf.`],
  [`young-mann-in-a-hurry`, `Nelio Biedermann is the rarest of young men: a mainstream literary wunderkind and recipient of the New York Times imprimatur. His Instagram shows him signing books with Patti Smith and modeling for a Warby Parker ad campaign. The jacket blurb from novelist Daniel Kehlmann on Lázár, Biedermann's recently translated novel, reads like stage directions: “A truly great writer steps onto the stage, in full possession of his powers.” Biedermann, a 22-year-old writer from Zurich, has been called the next Thomas Mann, the next Joseph Roth, and the next Gabriel García Márquez. He is very handsome, and his novel—a multi-generational story told in a distinctly European idiom—has been selling.`],
  [`now-the-story-please`, `I'm running late to catch the tail end of the thrice-extended, off-broadway run of Dad Don't Read This, a surprise NYT Critic's Pick by 20-something playwright Eliya Smith and director Chloe Claudel. St. Luke's Theatre is not quite a basement, but it's not far from it. Once I settle on a metal stool the producer sets down for me on the periphery, I clock Jesse Eisenberg with his parents in the back. Next to me, a girl with a tooth gap tells me she's working with a director who's worked with Nicole Kidman. So it's a hot show.`],
  [`ugly-fleshy-flap`, `Perhaps the most important quality in a young musician is their ability to make beautiful that which their parents would find hideous. As a teenager, you want to listen to music that makes you feel free, music to play fucking loud, the kind of music your parents would demand you turn off. In short, you're after awful-sounding music that, once illicit, becomes mystical and possessive, all yours, just yours.`],
  [`snug-as-a-gun`, `It is hard to imagine a reporter having more success out of the gate than (the then 17-year-old) Theo Baker. By the time he returned home after the autumn quarter of his first year at Stanford in 2022, the Stanford Daily journalist had already broken three major stories: the university's heavy-handed suppression of parties in the post-Covid years; its failure to act against a con man who had lived illegally in student dorms for the better part of a year and allegedly harassed a female student; and the revelation that a series of papers published by then‑university president Marc Tessier‑Lavigne (almost always referred to by his initials, MTL) showed a clear pattern of research misconduct through the use of doctored images.`],
  [`terms-of-service`, `When the average film directors are a decade south of receiving an AARP subscription, it's a breath of fresh air to see young faces. Kane Parsons, the director of A24's new movie Backrooms, is the youngest we've seen in a while. What started in 2019 as an anonymous 4chan creepypasta (a horror related short story) turned into Parsons's directorial debut at the sober age of 20.`],
  [`seem-pretty`, `Singer-songwriter phenom Olivia Rodrigo's revamped website features a collaged e-bedroom setting, replete with pink guitar, pink laptop computer, and diary with pink key and lock. There is a bookshelf which, once clicked, allows one to purchase Rodrigo's CDs. If you press the red bra spilling out of the hand-drawn dresser drawer, the website takes you straight to Rodrigo's online store. In honor of her new album, Instagram released a custom Rodrigo-designed typeface to every one of its 3 billion monthly active users. YouTube provides a custom pink yarn ball cursor anytime you watch one of her music videos. It's a veritable fangirl's wonderland. It seems the entire internet has conspired to promote you seem pretty sad for a girl so in love.`],
]);

// Extract the slug from a canonical post URL (/p/<slug>).
function slugOf(link) {
  return (link || '').replace(/^.*\/p\//, '').replace(/[?#].*$/, '');
}

function lookupContraPreview(link) {
  const text = CONTRA_MANUAL_PREVIEWS.get(slugOf(link));
  return text ? truncateWords(text, 100) : '';
}

// Apply the hand-edited text overrides from content-overrides.js to every
// post object whose slug has an entry. Runs last in main(), after all the
// automatic preview fetching, so a manual value always wins. Posts can be
// duplicated across collections (same link, different objects), so this is
// called on the raw concatenation, not a deduped list.
function applyContentOverrides(posts) {
  for (const p of posts) {
    const o = CONTENT_OVERRIDES[slugOf(p.link)];
    if (!o) continue;
    if (o.title) p.title = o.title;
    if (o.dek) p.subtitle = o.dek;
    if (o.author) p.author = o.author;
    if (o.date) p.metaDate = o.date;
    if (o.kicker) p.kicker = o.kicker;
    if (o.focal) p.focal = o.focal;
    if (o.preview) {
      const paras = Array.isArray(o.preview) ? o.preview : [o.preview];
      p.preview = paras[0];
      // Only meaningful on the hero card, harmless elsewhere.
      p.previewParagraphs = paras;
    }
  }
}

// Postscript and Contra deks carry a name the byline should be showing
// instead of repeating: an interview's dek names the SUBJECT ("Postscript
// No. 21 | George Monaghan on literary London") while its author field
// holds the interviewer, and a review's dek opens with the reviewer's own
// name, which the byline is already printing a line above.
//
// Both are rewritten here, once, on the post objects — so every renderer
// (hover panels, section pages, the archive ledger) reads the same text
// rather than each parsing the dek for itself.
const POSTSCRIPT_DEK = /^(Postscript No\.\s*\d+\s*\|\s*)(.+?)\s+on\s+(.+)$/;

// "A and B", "A, B, and C" — the dek's own list style. Split on the
// commas and the conjunction; the byline shows the first name and lets
// "et al." stand for the rest.
function splitNames(text) {
  return text
    .split(/\s*,\s*and\s+|\s*,\s*|\s+and\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// One to four capitalised words — enough to tell a byline apart from a
// sentence, which is all the "contra" rewrite below needs it for.
function looksLikeName(text) {
  const words = text.trim().split(/\s+/);
  if (!words.length || words.length > 4) return false;
  return words.every(w => /^[A-Z][\p{L}'’.-]*$/u.test(w));
}

function applyDekBylines(posts) {
  for (const p of posts) {
    if (!p.subtitle) continue;

    const ps = p.subtitle.match(POSTSCRIPT_DEK);
    if (ps) {
      const names = splitNames(ps[2]);
      if (names.length) {
        // displayAuthor, not author: the author field still holds the
        // interviewer, which is the true byline of the piece and what any
        // non-panel use of the post should keep seeing.
        p.displayAuthor = names.length > 1 ? `${names[0]} et al.` : names[0];
        p.subtitle = `${ps[1]}on ${ps[3]}`;
      }
      continue;
    }

    // "<Reviewer> contra <Work>" → "Contra <Work>". Gated on the prefix
    // reading as a NAME rather than on the word "contra" alone, so an
    // essay dek that happens to use it in a sentence is left be. Matching
    // the prefix against post.author is too strict on its own — one
    // review's author field is "Nadav" where its dek says "Nadav Asal".
    const con = p.subtitle.match(/^(.+?)\s+contra\s+(.+)$/i);
    if (con && looksLikeName(con[1])) {
      p.subtitle = `Contra ${con[2]}`;
    }
  }
}

// Small courier kicker above the hero title. Static, set by hand per
// current top post — not derived from feed data.
const HERO_KICKER = 'To Phone or Not';

// The homepage's From the Archive rows, hand-picked by slug, in cell
// order: [first essay square, second essay square, the split row's
// extra-wide cell, the split row's postscript third] — see
// renderHomepage's archive foot rows.
const ARCHIVE_ROW_SLUGS = ['end-times', 'freak-show', 'pdoom', 'curtis-yarvin-jr'];

// The arrow glyph in every "Read on →" link renders in the display face
// (Fraunces) rather than inheriting the mono/courier font around it — see
// .cta-arrow in style.css. Shared so every call site (and preview-card.js,
// which builds its own copy) stays in sync.
const ARROW_HTML = '<span class="cta-arrow">&#8594;</span>';

// Written out to a real file at build time (see main()) instead of being
// inlined as a data URI in every page's <head> — inlined, it can't be
// cached by the browser across page navigations the way a file can.
const FAVICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABWGlDQ1BJQ0MgUHJvZmlsZQAAeJx9kLFLw1AQxr9WpaB1EB0cHDKJQ5SSCro4tBVEcQhVweqUvqapkMZHkiIFN/+Bgv+BCs5uFoc6OjgIopPo5uSk4KLleS+JpCJ6j+N+fO+74zggOW5wbvcDqDu+W1zKK5ulLSX1jAS9IAzm8Zyur0r+rj/j/T703k7LWb///43Biukxqp+UGcZdH0ioxPqezyXvE4+5tBRxS7IV8onkcsjngWe9WCC+JlZYzagQvxCr5R7d6uG63WDRDnL7tOlsrMk5lBNYxA48cNgw0IQCHdk//LOBv4BdcjfhUp+FGnzqyZEiJ5jEy3DAMAOVWEOGUpN3ju53F91PjbWDJ2ChI4S4iLWVDnA2Rydrx9rUPDAyBFy1ueEagdRHmaxWgddTYLgEjN5Qz7ZXzWrh9uk8MPAoxNskkDoEui0hPo6E6B5T8wNw6XwBA6diE8HYWhMAAAWHSURBVHja7VpfSFNtGH/fd2ebmk6jNsdIxdFEvYoIvegqQ+pG7zQIhERQwSAQBZEu6qI7ryJYUCRaaARdRAnSTYF/LrI/Soh/LpweRU2ncnBTT2d7nu/iocNYfX7LzTPHt+fiwMbOOc/v+ft7nneMpSUtaUnL/0w45yaTKW2HJNmeMWa3269fv845F0KkGABJkhhjd+/enZubY4wlBEASbLC3t3f+/PnCwkIAiB+DoQAQkTGmKIoQoqurSw+qFAuhnp4eRAwEAi6XK1GBZJBQ9bx8+XIoFELEO3fu6KhSKYRqamoODg4Q8datW5xzAEgZABQtfr//1KlTmqZduHChoaEBAOJ0gtF9IC8vz+fzAQAATExMxJnKwvgcaGxstFgsmqZxzktLSx0OByIeGYOI3XKJyoHl5WWXyyWEAIDs7OySkpJ4atF/3JaTk0MvTgj9os41Ojo6OTkpSVI4HGaM5efnx2MjcYjVOeeFhYUdHR1OpzMcDsfPXqjmWCwWl8ult+FAIKA75yi95RB3c86np6cZY+3t7d+/f3/+/Dm5AhGPUPsoZtxud0NDg6IoDoeDHrK6uhoPgJii32w2t7W19fb2VlVV6en4t94QQkiS9PDhQ0QMBoOIiIgHBwcFBQXH24/1R5eUlDx9+rS/v//SpUuRo0ks4UsBmZGRMT09HQqFNE0DAETc2Niw2WxGkCI9iWtqat68efPs2TPdG7E4hG6/ffu2z+cLh8MAEA6HEXFhYcFsNhvE6iJHwdra2levXr19+7apqSkvLy+Srv0OhrLf4XDcu3cvEAjAL0HElZWVzMxMQ2lpZMxUVFQ8evTo48ePXq830iH6LwkPQXI6nbIsq6pKqifBA1HK6Wa22+1tbW0jIyMTExOPHz+uq6ujvPxdxsfHddXpOjs7S6onZzAQQkQ2uMrKyidPniiKgojz8/MvXrzo7Oy8du2ax+NxuVyZmZlerxcRiUsTgMXFRavVmuTJJqoW5ebmtra2Tk1N4S9RVVVRFFmWNzY2qIfo17W1tZycHCGEcQAOeRNVev1jVVVVX1/f1tYW/kkIgKqqRCUoYQhJkudMznkkjHPnzt2/f1+WZT1sdKGPfX19paWl/1a1kzxA6nrk5ua+fPkSACgBojDs7++/f/++sbGxqKjozJkzuj9PxLhsMpnMZnNZWdnMzIzevw6R7e3tb9++1dXVxUvmEiiapnk8HqfTGTm4AADnfG1t7cGDB+vr61arNT8//8qVK7W1tadPnx4YGHC73cPDw7Ozsz9//jwuqhc7B6mvr1cUJRQKUe7qxfTGjRtRvy8rK6uurvZ4PMXFxeXl5VlZWUkOISosQ0NDkUlMMILBoN1ulyTJbDZLkkRVKGHzQGLrUjAY3NnZycjIIOYDACaTaWZmRi+yUYDpy1iWLsee5qTH0NCQoigWi4V0pev4+DghiRo7ia7GODYZUacA4PXr12NjY5qmRX7/+fPnBISoAR4QQgQCgbGxMVVVKXdpLp2cnCR4J30zR1FktVoVRaHY4Jxvbm76fL74p2GDAAghCgoK9vf3CQBjTJbl3d1dyteTDoCKyY8fP7Kzs/U8lmU5IbO8QWRDCGGz2UKhEDmEJgGd26bAbhQAbDZbUVERzcec8y9fvkStHE/uaQ3xyuHhYQCghcru7q7D4WApccREs8HNmzeJ/1AZ7e7uPimkP0Yy19zcjIhk/qmpKdoJpMYJHyl68eLF1dVVVVURsb6+nsV9NJaE5cW7d+8A4OvXr0djnUkOoatXr1L1bGlpST3zc84/fPiAiH6//+zZs4ndOxjUiT99+gQAvb29fr+fmFzKAKBzjaWlJSGE1+uN/2A4CWsixpjb7R4cHEyxf0b81VYvBVRPefOnJS1pScuf5B94+3TdscEUswAAAABJRU5ErkJggg==';

// Shared link set for both nav and footer (item 3: same structure, two looks).
// Essays/Postscript/Contra/About point at our own generated pages; Give and
// Contact go straight out to the live site since we don't have local pages for them.
const SITE_LINKS = [
  { key: 'home', label: 'Home', href: './' },
  // dek: the sidebar's gloss under each item (see .nav-dek in style.css).
  // A newline is a HARD break in the rendered gloss — these are set to
  // specific line shapes against the column, not left to wrap. About's is
  // the masthead's old tagline, which moved down here off the wordmark.
  { key: 'essays', label: 'Essays', href: 'essays.html' },
  { key: 'postscript', label: 'Postscript', href: 'postscript.html', dek: 'Interviews w/\nextraordinary gen zers' },
  { key: 'contra', label: 'Contra', href: 'contra.html', dek: 'New Critics take on\ngen z works' },
  { key: 'archive', label: 'Archive', href: 'archive.html' },
  { key: 'about', label: 'About', href: 'about.html', dek: 'The Young\nAmerican Magazine' },
];

async function fetchFeed(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// Courtesy retries: Substack rate-limits bursts (429 Too Many Requests),
// and a build that shrugs those off silently publishes a degraded site —
// cards without excerpts or artist credits (exactly what happened when
// several full builds ran back to back). Waits out Retry-After, or a
// growing pause, before each of two more attempts; still returns null
// when the response stays bad (callers count those — see
// failedPageFetches below).
async function fetchHtml(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) return res.text();
    // Retrying only helps transient statuses; a plain 404/403 is final.
    if (res.status !== 429 && res.status < 500) return null;
    const retryAfter = Number(res.headers.get('retry-after')) * 1000;
    const wait = Math.min(retryAfter || (attempt + 1) * 5000, 30000);
    await new Promise((r) => setTimeout(r, wait));
  }
  return null;
}

// Post pages that never came back despite the retries — checked after the
// preview pass in main(): a few just lose their excerpt/credit (warned),
// but past a quarter of the posts the build aborts nonzero instead, so a
// scheduled deploy keeps the previous complete site rather than shipping
// a gutted one.
let failedPageFetches = 0;

function extractPreloads(html) {
  const m = /window\._preloads\s*=\s*JSON\.parse\("([\s\S]*?)"\)<\/script>/.exec(html);
  if (!m) return null;
  try {
    const jsonString = JSON.parse(`"${m[1]}"`);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

function normalizeTagPost(p) {
  const byline = p.publishedBylines && p.publishedBylines[0];
  const subtitle = unescapeNumericEntities(unescapeXml(p.subtitle || ''));
  return {
    title: p.title || '',
    subtitle,
    preview: looksLikeProse(subtitle) ? subtitle : '',
    link: p.canonical_url || '',
    image: p.cover_image || '',
    date: new Date(p.post_date),
    author: (byline && byline.name) || SITE_NAME,
    // Likes only (item 4) — restacks excluded so "Most Popular" reflects reactions, not shares.
    reactionCount: Object.values(p.reactions || {}).reduce((a, b) => a + b, 0),
  };
}

// The /t/<slug> tag pages only embed their first 12 posts in initial HTML
// (older ones load via a "load more" click we can't trigger from a static
// build), so they undercount any section with more than 12 posts. Instead,
// we page through Substack's archive API — which returns the *entire*
// publication regardless of any `tag` query param — and bucket each post
// ourselves using its real `postTags`. This gets every post, not just the
// first page.
const ARCHIVE_API_PAGE_SIZE = 24;

async function fetchFullArchive() {
  const all = [];
  const MAX_PAGES = 50;
  const WINDOW = 3; // fetch up to 3 pages concurrently
  let pageIndex = 0;
  let done = false;

  while (!done && pageIndex < MAX_PAGES) {
    const batch = [];
    for (let w = 0; w < WINDOW && pageIndex + w < MAX_PAGES; w++) {
      const offset = (pageIndex + w) * ARCHIVE_API_PAGE_SIZE;
      const url = `${SITE_URL}/api/v1/archive?sort=new&offset=${offset}&limit=${ARCHIVE_API_PAGE_SIZE}`;
      batch.push(fetchHtml(url));
    }
    const results = await Promise.all(batch);
    for (const json of results) {
      if (!json) { done = true; break; }
      let page;
      try { page = JSON.parse(json); } catch { done = true; break; }
      if (!Array.isArray(page) || page.length === 0) { done = true; break; }
      all.push(...page);
    }
    pageIndex += batch.length;
  }
  return all;
}

function fetchTagPostsFrom(archive, slug) {
  return archive
    .filter((p) => (p.postTags || []).some((t) => t.slug === slug))
    .map(normalizeTagPost)
    .filter((p) => p.title && p.link);
}

async function fetchFirstParagraph(url) {
  const html = await fetchHtml(url);
  if (!html) { failedPageFetches++; return ''; }
  const preloads = extractPreloads(html);
  const bodyHtml = preloads && preloads.post && preloads.post.body_html;
  return firstParagraph(bodyHtml || '');
}

// The artist credit lives in the post body: the cover image appears there
// as a <figure> whose <figcaption> is the artist's name ("Kit Knuppel").
// Every CDN variant of the same upload shares its S3 image uuid, so the
// cover's figure is found by that uuid rather than by URL equality (the
// body's srcset variants and the cover_image field are all different
// URLs). When no figure carries the cover's uuid — some posts' cover is a
// separate re-upload of the same art — the body's FIRST figure stands in:
// the lede art always opens the piece here. Posts with no figures at all
// (cover set only as metadata) have no caption to pull — empty string.
function extractCoverArtist(bodyHtml, coverUrl) {
  const id = /images(?:%2F|\/)([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})/i.exec(coverUrl || '');
  if (!id || !bodyHtml) return '';
  const figures = bodyHtml.match(/<figure[\s\S]*?<\/figure>/gi) || [];
  const fig = figures.find((f) => f.toLowerCase().includes(id[1].toLowerCase())) || figures[0];
  if (!fig) return '';
  const cap = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(fig);
  return cap ? artistFromCaption(unescapeNumericEntities(stripHtml(cap[1]))) : '';
}

// Captions run "Title, Artist" — portraits title with the sitter's own
// name ("Isabel Mehta, Kit Knuppel"), quoted titles can hold commas of
// their own ("“Sketch of Yarvin by his assistant, Stevie Miller,” Werner
// Zagrebbi"), some add a medium ("Untitled, oil on canvas, Sarah
// Alshreef") — or the caption is the bare artist. Strip the quoted spans
// and the artist is whatever follows the last comma.
function artistFromCaption(caption) {
  const parts = caption.replace(/[“"][^“”"]*[”"]/g, '').split(',');
  return parts[parts.length - 1].trim();
}

// Multi-paragraph preview for the hero (2 paragraphs) and the duo/trio row
// cards (3 — see the row-posts fetch in main()) — one extra fetch of the
// post's own page, keeping the paragraphs separate (rather than flattened
// into one block) so the card can render actual paragraph breaks between
// them. Returns full, untruncated paragraph text: cutting each paragraph
// off at the right line — with a real ellipsis flush at that line's end —
// is a line-clamp job (duo-panel-fit.js, which fits the hero panel and the
// row panels alike), not a build-time word-count guess. The same fetch
// also carries out the cover artist credit (see extractCoverArtist).
async function fetchExtendedPreview(url, max) {
  const html = await fetchHtml(url);
  if (!html) { failedPageFetches++; return { paragraphs: [], artist: '' }; }
  const preloads = extractPreloads(html);
  const post = preloads && preloads.post;
  const bodyHtml = (post && post.body_html) || '';
  return {
    paragraphs: extractParagraphs(bodyHtml, max),
    artist: extractCoverArtist(bodyHtml, (post && post.cover_image) || ''),
  };
}

// Like Promise.all(items.map(fn)) but `size` at a time — the section pages
// pull previews for every post in every section, and firing ~75 requests
// at Substack in one burst is the kind of thing that gets throttled.
async function mapBatched(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

function dedupeByLink(posts) {
  const seen = new Set();
  return posts.filter((p) => {
    if (seen.has(p.link)) return false;
    seen.add(p.link);
    return true;
  });
}

function stripCdata(str) {
  if (!str) return '';
  const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(str.trim());
  return (m ? m[1] : str).trim();
}

function unescapeXml(str) {
  return (str || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Crops default to a centered object-position, which cuts off faces sitting
// off-center (common in tall 1:2 portrait crops). A post's `focal` override
// (see content-overrides.js) sets object-position directly, e.g. 'center 20%'
// to keep a face nearer the top of the frame.
function focalStyle(post) {
  return post.focal ? ` style="object-position: ${escapeHtml(post.focal)}"` : '';
}

// Wraps the paragraph's first letter in a span so CSS can render it as a
// two-line drop cap (see .card-preview-dropcap) — a magazine-style flourish
// on the feature card's opening paragraph. If the paragraph opens with a
// quotation mark, it drops along with the letter, as is conventional.
// Substack italics survive extraction as control-char markers (see
// extractParagraphs), inert everywhere plain text goes and swapped back
// for real <em> tags only here, after HTML-escaping the text around them.
const EM_OPEN = '\u0001';
const EM_CLOSE = '\u0002';

function stripEmMarkers(text) {
  return (text || '').replace(/[\u0001\u0002]/g, '');
}

function emHtml(text) {
  let html = escapeHtml(text).replace(/\u0001/g, '<em>').replace(/\u0002/g, '</em>');
  // A truncation (truncateWords) can cut a paragraph off mid-italic,
  // leaving an unclosed <em> — balance it rather than leaning on the
  // browser's auto-close.
  const opens = (html.match(/<em>/g) || []).length;
  const closes = (html.match(/<\/em>/g) || []).length;
  if (opens > closes) html += '</em>'.repeat(opens - closes);
  return html;
}

function wrapLeadWords(text) {
  // Opening flourish on a card's first preview paragraph: its first three
  // words set in caps (.card-preview-lead uppercases them) — the successor
  // to the old two-line drop cap, which never survived line-clamping well.
  const m = /^((?:\S+\s+){0,2}\S+)([\s\S]*)$/.exec(text);
  if (!m) return emHtml(text);
  return `<span class="card-preview-lead">${emHtml(m[1])}</span>${emHtml(m[2])}`;
}

function stripHtml(html) {
  // Every tag (opening or closing) is replaced with a space so adjacent
  // block/paragraph boundaries stay word-separated — but that also inserts
  // a stray space wherever an inline tag like <em>/<strong> hugs the word
  // before it or a punctuation mark after it (e.g. "the <em>Free Press</em>."
  // -> "the  Free Press ." before cleanup) — see tidyInlineSpaces below.
  return tidyInlineSpaces(
    unescapeXml((html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ')
  ).trim();
}

// Collapse the stray spaces left where an inline tag hugged punctuation —
// before .,!?;: and closing quotes/brackets, after opening ones. Called at
// the end of stripHtml, and AGAIN after unescapeNumericEntities in
// extractParagraphs: in RSS bodies the curly quotes arrive as numeric
// entities (&#8220;), invisible to these patterns until unescaped.
// ’ is excluded because it legitimately opens elided words ("love ’em",
// "’90s"); straight quotes because they don't distinguish opening from
// closing.
function tidyInlineSpaces(text) {
  return text
    .replace(/ +([.,!?;:”)\]])/g, '$1')
    .replace(/([“‘(\[]) +/g, '$1');
}

// Unescape numeric HTML entities that survive after stripHtml (e.g. &#8220; &#x2014;).
// Also handles the &amp;#NN; double-encoded form that appears in Substack body_html.
function unescapeNumericEntities(text) {
  return text
    .replace(/&amp;#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Patterns that identify non-essay paragraphs: author bios, Postscript
// framing boilerplate, interview-transcript lines. Every pattern is
// anchored to the paragraph's opening shape — an unanchored keyword
// (the old /\d+-year-old/, /studied|attended/, /writes (at|for)/) also
// matched real prose that merely mentions an age, a school, or another
// writer mid-sentence, silently skipping the piece's actual opening
// paragraph so a later one showed up on cards as if it were the first.
const BIO_PATTERNS = [
  // The bio's copula, in the first sentence: "Clare Ashcraft is a proud,
  // 22-year-old Ohioan…" / "Theodore Gary is a 22-year-old graduate…" /
  // "John Coleman is the 22-year-old president…" / "Grace Caplan is
  // 21-year-old senior…" (sic, no article) / "Daniel Sandoval is the
  // pseudonym of a 21-year-old undergraduate…". [^.!?] bounds keep both
  // sides inside that sentence, so prose whose LATER clauses mention
  // someone's age isn't touched.
  /^[^.!?]{0,60}\bis (?:an? |the )?[^.!?]{0,24}\d+-year-old\b/i,
  // Same copula shape for age-less bios: "Josie Barboriak is a writer…".
  /^\S+(?: \S+){0,5} is (?:an?|the) (writer|editor|journalist|poet|critic|essayist|contributor)\b/i,
  // Interview-subject placement bios: "Charlotte is from New York City and
  // the editor-in-chief of The Dartmouth…". A short name-shaped opener
  // bounds it — real prose opening on a place ("Mecosta, Michigan is
  // almost inaccessible…") doesn't fit the "is from" shape.
  /^\S+(?: \S+){0,3} is from\b/i,
  // Postscript editorial framing before the interview proper.
  /^What follows is a conversation\b/i,
  /^In the following conversation\b/i,
  // "Our conversation — on the unwritten rules of…, is below." /
  // "Our conversation has been edited for length and clarity." /
  // "This conversation has been edited…" / "This interview has been edited…"
  /^(Our|This) (conversation|interview)\b/i,
  // The two paragraphs of Postscript's paid-subscription appeal. They sit
  // mid-run inside the starred intro (whose opener is real framing, not
  // ASIDE_JUNK), so the run flows through this filter paragraph by
  // paragraph and these two need their own anchored shapes:
  // "Our essays are always online and always free, but we rely on
  // individual donors to support the magazine." and "Postscript, our
  // interview series, can be accessed with a paid subscription. The $30
  // annual rate…".
  /^Our essays are always online\b/i,
  /^[^.!?]{0,60}\bcan be accessed with a paid subscription\b/i,
  // Contra posts carry the same appeal UNstarred, as a lone paragraph
  // between the byline bio and the review's opening line — so no run
  // filter sees it: "New Critic paid subscribers get access to Postscript,
  // our interview series, Contra, our criticism section, and exclusive New
  // Critic parties for only $30 a year."
  /^[^.!?]{0,60}\bpaid subscribers get access\b/i,
  // "If you read The New Critic and take delight or solace in our project,
  // please consider a paid subscription to this flesh-and-blood gen z
  // magazine." — the plea's closing paragraph, phrased sentence-first.
  /^[^.!?]{0,80}\bplease consider a paid subscription\b/i,
  // Event-post housekeeping (Change My Mind's live-debate announcement) —
  // unstarred, so the ASIDE_JUNK run filter never sees it and each
  // paragraph needs its own anchored opener: "A ticket is required to
  // guarantee entry, and a paid subscription to The New Critic is
  // necessary to register." and "If you’re not yet a paid subscriber,
  // you can become one below. For $30 a year…".
  /^A ticket is required\b/i,
  /^If you(?:’|')re not yet a paid subscriber\b/i,
  // Interview-transcript lines: an all-caps speaker name opening the
  // paragraph ("ELAN How did you find out…" / "TESSA Your career is…").
  /^[A-Z]{3,} [A-Z“”"‘’']/,
  // Substack "preserved spacing" block placeholder text
  /\bText within this block will maintain/i,
];

function looksLikeProse(text) {
  // A sentence ends in terminal punctuation (with closing quotes/brackets
  // allowed after it). This is what rejects labels ("CONTRA"), signature
  // lines ("Rufus Knuppel, founding editor"), bare links ("Read more"),
  // and quote attributions ("Jonathan Haidt:") — by shape, not length.
  // There used to be a minimum-length floor here doing that job, but it
  // was a proxy with false positives: it nearly rejected the 79-char
  // Contra manifesto opener, and it silently dropped short real
  // paragraphs ("Fellow mass cultural critics have been quick to anoint
  // her.") out of multi-paragraph previews.
  // A long paragraph ending in ':' is prose introducing a quote (e.g. "...a
  // portrait that Stevie told me forms a pretty accurate picture of
  // Yarvin's psychology):" ahead of a New Yorker blockquote in the Curtis
  // Yarvin Jr. postscript) rather than a short label/attribution — the
  // length cutoff is generous enough to clear any real attribution line
  // ("Jonathan Haidt:") while still catching genuine intro paragraphs.
  const endsWithColon = /:['"”’)\]]*$/.test(text);
  if (!/[.!?…]['"”’)\]]*$/.test(text) && !(endsWithColon && text.length > 80)) return false;
  // Editorial notices often start with * or contain embedded * announcement markers.
  if (text.startsWith('*') || /\s\*[A-Z]/.test(text)) return false;
  // Paragraphs opening with a run of all-caps words are mastheads or section headers.
  if (/^[A-Z][A-Z\s—\-]{7,}/.test(text)) return false;
  if (BIO_PATTERNS.some((re) => re.test(text))) return false;
  return true;
}

// Returns up to `max` real prose paragraphs (raw, untruncated text), in
// order, skipping the same non-prose noise firstParagraph always has:
// asides, bios, mastheads, etc.
function extractParagraphs(html, max) {
  // Remove non-prose block elements so their inner <p> tags don't count.
  // <pre> is in the list for Contra posts' preserved-text credits block
  // ("REVIEWED / Obsession / directed by…") — and it must not reach the
  // <p> regex below at all: <p[^>]*> would match "<pre class=…>" too, and
  // since </pre> is not </p>, the lazy body would swallow everything up to
  // the NEXT real </p> — the review's opening paragraph included — leaving
  // one merged blob that starts "REVIEWED…" and fails the all-caps check.
  // That's what made every Contra post extract as nothing.
  const cleaned = (html || '').replace(
    /<(figure|blockquote|h[1-6]|ul|ol|li|aside|pre)[^>]*>[\s\S]*?<\/\1>/gi,
    ' '
  );
  // (?=[\s>]) so only a real <p> tag matches — not <pre>, <picture>, <path>.
  // The tag's own attributes are captured too: Substack marks button
  // paragraphs ("Subscribe", "Register now!") with class="button-wrapper",
  // and "Register now!" ends in real sentence punctuation, so markup is
  // the only reliable tell for those.
  const re = /<p(?=[\s>])([^>]*)>([\s\S]*?)<\/p>/gi;
  let m;
  // Substack posts bracket runs of paragraphs in *…* (leading "*" on the
  // first, trailing "*" on the last) for two very different things:
  // housekeeping asides (party invites, paid-subscriber appeals, contest
  // reminders) — junk — and, on Postscript posts, the piece's real
  // essayistic intro, which is simply italicized. Treating every starred
  // run as junk skipped whole intros and made cards open on a transcript
  // line ("ELAN How did you find out…") several paragraphs in. So a run is
  // skipped only when its opening paragraph reads like housekeeping
  // (ASIDE_JUNK); otherwise the stars are treated as italics and the run's
  // paragraphs flow through the normal prose filter with the markers
  // stripped. A run that opens AND closes in one paragraph is a
  // self-contained editorial note ("*The quoted interviews in this essay
  // are paraphrased…*") — always skipped.
  // Keyed to the housekeeping phrases the openers actually use — not bare
  // /subscri/ or /register/, which also live in real prose ("she has over
  // 54,000 subscribers on Substack", a singer's vocal register).
  const ASIDE_JUNK = /paid subscri|\bcontest\b|celebrate our readers|you can access|individual donors/i;
  let insideJunkAside = false;
  const out = [];
  // Interview-transcript lines ("ELAN KLUGER Let's begin…") are filtered
  // out of prose previews (see BIO_PATTERNS), but some Postscript posts
  // are transcript all the way down — no essayistic intro, no "Below we
  // discuss" line — and a card with no excerpt at all is worse than one
  // that opens on the conversation itself. Collect the transcript lines
  // that would otherwise pass the prose check, as a fallback used only
  // when no real prose survives.
  const TRANSCRIPT_LINE = /^[A-Z]{3,} [A-Z“”"‘’']/;
  const transcript = [];
  while ((m = re.exec(cleaned)) !== null) {
    if (/button-wrapper/.test(m[1])) continue;
    // The post's own <em>/<i> italics ride through the tag-stripping as
    // control-char markers (emHtml swaps them back for real <em> at
    // render time). Replaced with markers — not spaces, like every other
    // tag — so an italic hugging its neighbors ("the <em>Free Press</em>.")
    // doesn't grow stray spaces either.
    const marked = m[2].replace(/<(\/?)(?:em|i)\b[^>]*>/gi, (_, close) =>
      close ? EM_CLOSE : EM_OPEN
    );
    // tidyInlineSpaces runs a second time here because unescaping can
    // surface punctuation (curly quotes as &#8220;) that stripHtml's own
    // pass couldn't see yet.
    let text = tidyInlineSpaces(unescapeNumericEntities(stripHtml(marked).trim()));
    // Clean up marker noise. Substack nests spans inside its italics
    // (<em><span>Obsession</span></em>) and stripHtml turns those inner
    // tags into spaces, leaving them INSIDE the markers ("\u0001 Obsession
    // \u0002.") — where a trailing one is a break opportunity that lets
    // the period after the italic wrap to a line of its own, and where
    // tidyInlineSpaces can't see the " ." it would normally collapse.
    // Hoist boundary whitespace out of the markers first; then an
    // "italic" wrapping only whitespace becomes that whitespace, and
    // back-to-back runs ("</em> <em>") merge — both would otherwise
    // render as empty or fragmented <em> tags. Then re-tidy, which also
    // recollapses the doubled spaces hoisting leaves behind.
    text = text
      .replace(/\u0001\s+/g, ' \u0001')
      .replace(/\s+\u0002/g, '\u0002 ')
      .replace(/\u0001(\s*)\u0002/g, '$1')
      .replace(/\u0002(\s*)\u0001/g, '$1');
    text = tidyInlineSpaces(text.replace(/\s{2,}/g, ' ')).trim();
    if (!text) continue;
    // Every shape test below runs against the marker-free copy — a
    // paragraph that opens or closes inside an italic would otherwise
    // slip every ^- and $-anchored pattern.
    let plain = stripEmMarkers(text);
    if (!plain) continue;
    if (insideJunkAside) {
      if (plain.endsWith('*')) insideJunkAside = false;
      continue;
    }
    if (plain.startsWith('*')) {
      if (plain.endsWith('*') && plain.length > 1) continue;
      if (ASIDE_JUNK.test(plain)) {
        insideJunkAside = true;
        continue;
      }
      // Italicized intro run — fall through to the prose filter.
    }
    // Strip the run's star markers from the kept text too — they can sit
    // just inside an italics marker ("<em>*What follows…"), so the marker
    // itself survives while the stars go.
    text = text
      .replace(/^([\u0001\u0002]*)\*+/, '$1')
      .replace(/\*+([\u0001\u0002]*)$/, '$1')
      .trim();
    plain = plain.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    if (looksLikeProse(plain)) {
      out.push(text);
      if (out.length >= max) break;
    } else if (
      !out.length &&
      transcript.length < max &&
      TRANSCRIPT_LINE.test(plain) &&
      /[.!?…]['"”’)\]]*$/.test(plain)
    ) {
      transcript.push(text);
    }
  }
  return out.length ? out : transcript;
}

function firstParagraph(html) {
  const [p] = extractParagraphs(html, 1);
  return p ? truncateWords(p, 100) : '';
}

function truncateWords(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '\u2026';
}

function tag(xml, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = re.exec(xml);
  return m ? m[1] : '';
}

function attr(xml, tagName, attrName) {
  const re = new RegExp(`<${tagName}[^>]*\\b${attrName}="([^"]*)"`, 'i');
  const m = re.exec(xml);
  return m ? m[1] : '';
}

function parseItems(xml) {
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return blocks.map((block) => {
    const title = unescapeXml(stripCdata(tag(block, 'title')));
    const link = unescapeXml(stripCdata(tag(block, 'link'))).trim();
    const pubDate = stripCdata(tag(block, 'pubDate')).trim();
    const description = stripCdata(tag(block, 'description'));
    const encoded = stripCdata(tag(block, 'content:encoded'));
    const creator = unescapeXml(stripCdata(tag(block, 'dc:creator'))).trim();

    let image = attr(block, 'enclosure', 'url') || attr(block, 'media:content', 'url');
    if (!image) {
      const body = encoded || description;
      const imgMatch = /<img[^>]+src="([^">]+)"/i.exec(body);
      if (imgMatch) image = imgMatch[1];
    }

    const excerptSource = encoded || description;
    const excerpt = truncate(stripHtml(excerptSource), 180);
    const preview = firstParagraph(excerptSource);

    let dateDisplay = '';
    const d = new Date(pubDate);
    if (!isNaN(d.getTime())) {
      dateDisplay = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // bodyHtml is the raw post body from the feed (content:encoded, or the
    // description when that's absent) — kept so main() can re-extract
    // paragraphs from the feed as a fallback when the post-page fetch
    // yields none (see the hero preview fallback there).
    return { title, link, pubDate, dateObj: d, dateDisplay, excerpt, preview, image, creator, bodyHtml: excerptSource };
  });
}

function normalizeRssItem(item) {
  const preview = [item.preview, item.excerpt]
    .map((t) => unescapeNumericEntities(t || ''))
    .find(looksLikeProse) || '';
  return {
    title: item.title,
    subtitle: item.excerpt,
    preview,
    link: item.link,
    image: item.image,
    date: item.dateObj,
    author: item.creator || SITE_NAME,
    reactionCount: 0,
  };
}

// Shortened byline for authors whose full name doesn't fit the courier
// meta voice as comfortably. Shared by metaLine's author span and the
// essay row/hero's tagline-as-author substitution (see renderCard/
// renderDuoHalf) so both read the same shortened, uppercased form.
const AUTHOR_SHORT = { 'Josie Barboriak': 'Barboriak' };
// caps:false leaves the name in its natural case — the hover panels' byline
// runs in Newsreader roman, not the courier caps of the band corners.
// displayAuthor is the byline the CARD should show where it differs from
// the piece's author field — set by applyDekBylines for the interviews,
// whose subject is named in the dek and whose author is the interviewer.
function bylineName(post) {
  return post.displayAuthor || post.author || '';
}

function authorDisplay(post, caps = true) {
  const raw = bylineName(post);
  if (!raw) return '';
  const name = AUTHOR_SHORT[raw] || raw;
  return caps ? name.toUpperCase() : name;
}

// include picks which of date/author/likes render, AND the order they
// render in — the hover panels run one byline (author · date · likes)
// under the title rule, while the box/grid cards keep the default
// date · author · likes. Ordering by the caller's array is what lets the
// same builder serve both without a second function. caps:false drops the
// uppercasing for the panels' byline, which reads in Newsreader roman.
function metaLine(post, { include = ['date', 'author', 'likes'], caps = true } = {}) {
  const d = post.date;
  const thisYear = new Date().getFullYear();
  // metaDate is the manual override from content-overrides.js — a display
  // string used verbatim, skipping the date formatting below.
  const raw = post.metaDate
    || (d && !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', d.getFullYear() < thisYear
          ? { month: 'long', year: 'numeric' }
          : { month: 'short', day: 'numeric' })
      : '');
  const md = caps ? raw.toUpperCase() : raw;
  const parts = [];
  for (const field of include) {
    if (field === 'date' && md) {
      parts.push(`<span class="meta-date">${escapeHtml(md)}</span>`);
    } else if (field === 'author' && bylineName(post)) {
      parts.push(`<span class="meta-author">${escapeHtml(authorDisplay(post, caps))}</span>`);
    } else if (field === 'likes') {
      const likes = typeof post.reactionCount === 'number' ? post.reactionCount : 0;
      parts.push(
        `<span class="likes"><svg class="likes-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class="likes-count">${likes}</span></span>`
      );
    }
  }

  return parts.join(' <span class="meta-dot">&middot;</span> ');
}

// Which of essay/postscript/contra a tagline belongs to, read off the
// tagline text itself (post.previewTagline for the hero/archive-mosaic
// posts — set per-post in main() from their real section; the row's own
// `tag` param for the essay/postscript/contra rows, where every post in
// one row shares a section). 'other' covers untagged posts (editors'
// notes), which keep the plain byline instead of either treatment below.
function taglineSection(taglineText) {
  if (/essay/i.test(taglineText)) return 'essay';
  if (/interview/i.test(taglineText)) return 'postscript';
  if (/review/i.test(taglineText)) return 'contra';
  return 'other';
}

// Escape first, THEN turn the newlines into breaks — the other way round
// would escape the tags we just inserted.
function dekHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function renderNav(currentKey = 'home') {
  function navLink(l) {
    return `<li class="nav-item--${escapeHtml(l.key)}"><a href="${escapeHtml(l.href)}"${l.key === currentKey ? ' aria-current="page"' : ''}${l.href.startsWith('http') || l.href.startsWith('mailto:') ? ' rel="noopener"' : ''}>${escapeHtml(l.label)}</a>${l.dek ? `\n        <span class="nav-dek">${dekHtml(l.dek)}</span>` : ''}</li>`;
  }
  const linkKeys = ['essays', 'postscript', 'contra', 'archive', 'about'];
  const links = SITE_LINKS.filter(l => linkKeys.includes(l.key)).map(navLink).join('\n      ');

  const homeCurrent = currentKey === 'home' ? ' aria-current="page"' : '';
  // The masthead IS the brand now — the framed-bird mark that used to sit
  // above it is gone, so the name carries the home link itself. Name over
  // tagline reads as the sidebar's own title/dek pair, the same shape
  // every nav item below it takes. The name is broken one word per line,
  // each in its own block so the lines can be set to the margin (see
  // .nav-wordmark-line) rather than wrapping wherever they land.
  const wordmarkLines = SITE_NAME.split(/\s+/)
    .map(w => `<span class="nav-wordmark-line">${escapeHtml(w)}</span>`)
    .join('');
  // Subscribe closes the column as the last item under About, riding the
  // nav links' own list rhythm (and their type) rather than sitting apart.
  return `<nav class="site-nav">
  <div class="nav-top">
    <a class="wordmark" href="./"${homeCurrent} aria-label="The New Critic — home">
      <span class="nav-wordmark">${wordmarkLines}</span>
    </a>
  </div>
  <img class="nav-bird" src="bird-logo.png" alt="" width="962" height="835">
  <ul class="nav-links">
    ${links}
    <li class="nav-item--subscribe nav-subscribe-item"><a class="nav-subscribe" href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a></li>
  </ul>
</nav>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `<footer>
  <div class="wrap">
    <p class="foot-fine"><span class="foot-fine-item">&copy; ${year} The New Critic</span> &middot; <span class="foot-fine-item">est. May 2025</span> &middot; <span class="foot-fine-item">editors@thenewcritic.com</span></p>
  </div>
</footer>`;
}

function renderHeader(currentKey) {
  return `<div class="site-header" id="site-header">
${renderNav(currentKey)}
</div>`;
}

// The artist credit as a footer-band box ("ART: KIT KNUPPEL"): on the
// hover cards an interior box of the right group, left of Read on
// (duo-panel-fit.js hides it when the band's boxes outgrow a narrow
// panel rather than let it displace Read on); on the archive fold-out a
// left-corner box of its own.
function artBoxHtml(post, side = 'right') {
  return post.coverArtist
    ? `<p class="card-meta pc pc-${side} pc-art">Art by ${escapeHtml(post.coverArtist)}</p>`
    : '';
}

// The hero card (the old renderCard's one surviving variant — the box and
// plain-card variants died with the homepage grid). A 3-column layout:
// cover image across the card, one duo panel over it. previewParagraphs
// (set only on the hero post — see fetchExtendedPreview in main()) is
// full, untruncated paragraph text; the CSS line-clamp on .card-preview
// does the cutting off at the rendered line. post.preview alone is the
// fallback if that fetch didn't run.
function renderCard(post, { dekLength = 110, eager = false, kicker = '' } = {}) {
  const dekHtml = post.subtitle ? `<p class="card-dek">${escapeHtml(truncate(post.subtitle, dekLength))}</p>` : '';
  const imgAttrs = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

  const previewParas = post.previewParagraphs && post.previewParagraphs.length
    ? post.previewParagraphs
    : (post.preview ? [post.preview] : []);
  const previewHtml = previewParas.length
    ? `<div class="card-preview-block">${previewParas
        .map((p, i) => `<p class="card-preview">${i === 0 ? wrapLeadWords(p) : emHtml(p)}</p>`)
        .join('')}</div>`
    : '';
  const readNowHtml = post.preview
    ? `<a class="card-preview-cta duo-readon-btn pc pc-right" href="${escapeHtml(post.link)}" rel="noopener">Read on ${ARROW_HTML}</a>`
    : '';
  // Same band routing as renderDuoHalf: essays put the author in a
  // header-band box; untagged editors' notes keep a byline under the
  // dek; postscript/contra show no author at all.
  const effectiveTag = post.previewTagline || 'from the essay';
  const section = taglineSection(effectiveTag);
  const authorBoxHtml = section === 'essay' && post.author
    ? `<p class="card-meta pc pc-right">${escapeHtml(authorDisplay(post))}</p>`
    : '';
  const authorHtml = post.author && section === 'other'
    ? `<p class="card-meta card-meta--byline">${metaLine(post, { include: ['author'] })}</p>`
    : '';
  // The bands render once and serve twice: live inside the panel, and as
  // the resting strip's inert copy over the cover image (cardStripHtml).
  const bandTopHtml = `<div class="panel-band panel-band--top">
          ${kicker ? `<p class="hero-kicker pc pc-left">${escapeHtml(kicker)}</p>` : ''}
          ${authorBoxHtml}
          ${metaLine(post, { include: ['date'] }) ? `<p class="card-meta pc pc-right">${metaLine(post, { include: ['date'] })}</p>` : ''}
          <p class="card-meta card-meta--stats pc pc-right">${metaLine(post, { include: ['likes'] })}</p>
        </div>`;
  const bandBottomHtml = `<div class="panel-band panel-band--bottom">
          <a class="duo-essays-btn card-category-btn pc pc-left" href="archive.html">The Latest</a>
          ${artBoxHtml(post)}${readNowHtml}
        </div>`;
  const imageHtml = `<span class="card-image-frame"><a class="card-image-link" href="${escapeHtml(post.link)}" rel="noopener">
        ${post.image ? `<img class="card-image" src="${escapeHtml(post.image)}" alt=""${focalStyle(post)} ${imgAttrs}>` : '<span class="card-image card-image--blank"></span>'}
      </a></span>`;

  // The hero wears one duo panel — the exact panel formation of the
  // row cells (header band with kicker/author/date/likes; title, rule,
  // eyebrow dek, quote divider, excerpt; footer band with The Latest
  // and Read on) — as a 1:2 portrait column pinned to the cover image's
  // left edge, the Postscript trio look (see .card--feature .duo-panel
  // in style.css). duo-panel-fit.js fits it like any other panel.
  return `
    <article class="card card--feature">
      <div class="feature-image-cell">
        ${imageHtml}
      </div>
      <div class="duo-panel">
        ${bandTopHtml}
        <div class="duo-panel-top">
          <h3 class="card-title"><a href="${escapeHtml(post.link)}" rel="noopener">${escapeHtml(post.title)}</a></h3>
          ${dekHtml ? '<div class="card-title-divider"></div>' : ''}
          ${dekHtml}
          ${authorHtml}
          ${previewHtml ? '<div class="duo-quote-divider"></div>' : ''}
          ${previewHtml}
        </div>
        ${bandBottomHtml}
      </div>
    </article>`;
}

// One card — not several — holding a row of posts side by side, divider-
// separated (see .card--duo in style.css). Each cell gets the hero card's
// hover-reveal mechanic (image always visible, text panel hidden until
// hover), as a single panel per cell reading straight down: title against
// the panel's top margin, a rule, the credit line (author · date · likes ·
// art), the dek, the quote rule, the excerpt. Only ONE band remains, at
// the foot — topic kicker bottom-left (in flow, not absolute; see
// .hero-kicker in style.css), section link bottom-right. There is no
// header band and no "Read on" corner: the title itself is the link, and
// it goes pink on hover to say so.
// Takes the post's own .kicker (set per-slug in content-overrides.js).
// btnLabel/btnHref point the row at its section (essays by default; the
// postscript row passes its own), and extraClass carries the row's aspect
// modifier (e.g. card--trio for the 1:2 portrait postscript row).
// halfClass carries a placement modifier for the mosaic's shaped cells
// (archive-tall / archive-wide).
function renderDuoHalf(post, { tag, btnLabel, btnHref }, halfClass = '') {
  // Full, untruncated subtitle — duo-panel-fit.js clamps it to the lines
  // the panel actually has room for. A build-time character cut here (the
  // old truncate(…, 140)) ellipsized deks short of space the panel had.
  const dekHtml = post.subtitle ? `<p class="card-dek">${escapeHtml(post.subtitle)}</p>` : '';
  // Full, untruncated paragraphs (several of them where the row-posts
  // fetch in main() ran) — duo-panel-fit.js decides at render time how
  // many lines each panel actually has room for and clamps there, with
  // the line-clamp display's own ellipsis.
  const previewParas = post.previewParagraphs && post.previewParagraphs.length
    ? post.previewParagraphs
    : (post.preview ? [post.preview] : []);
  const previewHtml = previewParas.length
    ? `<div class="card-preview-block">${previewParas
        .map((p, i) => `<p class="card-preview">${i === 0 ? wrapLeadWords(p) : emHtml(p)}</p>`)
        .join('')}</div>`
    : '';
  // The byline straight under the title, no rule between them: the author
  // at the left, the date pushed to the far right of the same line (see
  // .card-meta--line in style.css). No separator between them — the line's
  // own width does that job, which is what retired the dots.
  const metaLineHtml = [
    metaLine(post, { include: ['author'], caps: false }),
    metaLine(post, { include: ['date'], caps: false }),
  ].filter(Boolean).join('');
  const metaHtml = metaLineHtml
    ? `<p class="card-meta card-meta--line">${metaLineHtml}</p>`
    : '';
  // The footer band now carries four boxes, not two — kicker and cover
  // credit at the left, likes and section at the right, all in the
  // byline's own cut. duo-panel-fit.js sheds them right-to-left when a
  // narrow card can't seat them all (see fitBandBoxes).
  const bandBottomHtml = `<div class="panel-band panel-band--bottom">
            ${post.kicker ? `<p class="hero-kicker pc pc-left">${escapeHtml(post.kicker)}</p>` : ''}
            ${post.coverArtist ? `<p class="card-meta pc pc-left pc-art">Art by ${escapeHtml(post.coverArtist)}</p>` : ''}
            <a class="duo-essays-btn card-category-btn pc pc-right" href="${escapeHtml(btnHref)}">${escapeHtml(btnLabel)}</a>
            <p class="card-meta card-meta--stats pc pc-right">${metaLine(post, { include: ['likes'] })}</p>
          </div>`;
  // Section accent: essays pink, postscript purple, contra green, carried
  // as a --accent custom property on the cell (see .duo-half--essay etc.
  // in style.css) so every hover effect inside the card — title, glows,
  // band corners, the likes heart — reads off one value. Same section
  // routing the old byline used: the post's own previewTagline (set
  // per-post in main() for the From the Archive rows, whose row-wide tag
  // is a single section) wins over the row's.
  const section = taglineSection(post.previewTagline || tag || '');
  const sectionClass = section === 'other' ? '' : ` duo-half--${section}`;
  return `<div class="duo-half${halfClass ? ` ${halfClass}` : ''}${sectionClass}">
        <span class="card-image-frame duo-card-image"><a class="card-image-link" href="${escapeHtml(post.link)}" rel="noopener">
          ${post.image ? `<img class="card-image" src="${escapeHtml(post.image)}" alt=""${focalStyle(post)} decoding="async">` : '<span class="card-image card-image--blank"></span>'}
        </a></span>
        <div class="duo-panel">
          <div class="duo-panel-top">
            <div class="panel-col panel-col--left">
              <h3 class="card-title"><a href="${escapeHtml(post.link)}" rel="noopener">${escapeHtml(post.title)}</a></h3>
              ${metaHtml}
              ${metaHtml && dekHtml ? '<div class="card-byline-divider"></div>' : ''}
              ${dekHtml}
            </div>
            <div class="panel-col-divider" role="separator"></div>
            <div class="panel-col panel-col--right">
              ${previewParas.length ? '<div class="duo-quote-divider"></div>' : ''}
              ${previewHtml}
            </div>
          </div>
          ${bandBottomHtml}
        </div>
      </div>`;
}

const DUO_DIVIDER = '<div class="duo-half-divider" role="separator"></div>';

// A homepage lead row: one essay cell at two thirds of the row beside
// one postscript cell at the remaining third ({ flip: true } mirrors
// them — postscript's third left, essay's two thirds right). The cells
// are ordinary duo halves in a .card--split row sized so every essay
// and postscript cover on the homepage prints at one height (see
// .card--split in style.css). A missing post pads with a ghost cell so
// the survivor keeps its own width. wideOpts/narrowOpts override the
// cells' section tag and footer button (the From the Archive foot rows
// point theirs at the archive).
function renderSplitRow(essayPost, psPost, { flip = false, wideOpts, narrowOpts } = {}) {
  const halves = [
    essayPost
      ? renderDuoHalf(essayPost, wideOpts || { tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'essays.html' }, 'duo-half--wide')
      : '<div class="duo-half duo-half--ghost duo-half--wide" aria-hidden="true"></div>',
    psPost
      ? renderDuoHalf(psPost, narrowOpts || { tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'postscript.html' }, 'duo-half--narrow')
      : '<div class="duo-half duo-half--ghost duo-half--narrow" aria-hidden="true"></div>',
  ];
  if (flip) halves.reverse();
  return `
    <article class="card card--duo card--split">
      ${halves.join(`\n      ${DUO_DIVIDER}\n      `)}
    </article>`;
}

function renderDuoCard(posts, opts = {}) {
  const { tag = 'From the Essay', btnLabel = 'Essays', btnHref = 'essays.html', extraClass = '', padTo = 0 } = opts;
  if (!posts.length) return '';
  const cells = posts.map((post) => renderDuoHalf(post, { tag, btnLabel, btnHref }));
  // A short last row (the section pages render every post, so their post
  // count rarely divides by the row width) gets empty filler cells — the
  // real cells keep the same flex width they'd have in a full row instead
  // of stretching across the leftover space.
  for (let i = posts.length; i < padTo; i++) {
    cells.push('<div class="duo-half duo-half--ghost" aria-hidden="true"></div>');
  }
  const halves = cells.join(`\n      ${DUO_DIVIDER}\n      `);
  return `
    <article class="card card--duo${extraClass ? ` ${extraClass}` : ''}">
      ${halves}
    </article>`;
}

// The archive mosaic: four cells that close up into one hero-width block —
// a 1:2 tall card on the left at a third of the width, and the remaining
// two thirds split into a 2:1 landscape on top with two squares beneath
// it. With those ratios the left card's height always equals the right
// stack's exactly (see the .card--archive rules in style.css for the
// arithmetic). Cell order: [tall, wide, square, square].
function renderArchiveMosaic(posts, opts) {
  if (posts.length < 4) return '';
  const half = (p, cls) => renderDuoHalf(p, opts, cls);
  return `
    <article class="card card--duo card--archive">
      ${half(posts[0], 'archive-tall')}
      ${DUO_DIVIDER}
      <div class="archive-right">
        ${half(posts[1], 'archive-wide')}
        <div class="duo-half-divider duo-divider--h" role="separator"></div>
        <div class="archive-pair">
          ${half(posts[2])}
          ${DUO_DIVIDER}
          ${half(posts[3])}
        </div>
      </div>
    </article>`;
}

// Homepage is just the hero now — the below-hero sections (announcement,
// Most Read, Essays/Postscript/Contra grids, From the Archive) were
// scrapped for a from-scratch redesign. renderCard/cardLayoutAt/
// renderListPage/renderArchivePage below are still live — the essays/
// postscript/contra/archive pages are unaffected.

function renderHomepage({ essays = [], postscripts = [], contras = [], archives = [] }) {
  // The lead essay (top-left, two thirds wide) is the first cover the
  // visitor sees — preloaded the way the old hero was.
  const lead = essays[0];
  const leadPreload = lead?.image
    ? `<link rel="preload" as="image" href="${escapeHtml(lead.image)}">`
    : '';

  // The homepage grid, top to bottom — no separate hero card. Every
  // essay/postscript cover prints at the 1:1 duo squares' height, and
  // every postscript cell at the contra squares' width (see .card--split
  // / .card--trio-flat in style.css):
  //   1. the latest essay's two thirds beside the latest postscript's
  //      third,
  //   2. two essays as 1:1 duo squares,
  //   3. three contras as 1:1 squares, three across (the contra page's
  //      own row formation),
  //   4. two more essays,
  //   5. three postscripts across (the flat trio),
  //   6. two more essays,
  //   7. three more contras,
  //   8. two more essays,
  //   9. row 1 mirrored: the fifth postscript's third on the left, the
  //      tenth essay's two thirds on the right,
  //   10-11. From the Archive (the hand-picked ARCHIVE_ROW_SLUGS, in
  //      order): two archive essays as 1:1 squares, then a split row —
  //      one archive pick extra-wide on the left, one as the postscript
  //      third on the right — every cell's footer button pointing at
  //      the archive.
  // The old archive mosaic stays unrendered (renderArchiveMosaic kept
  // for its return). Every row is its own block, wrapped in its own .wrap —
  // a .row-divider sits between blocks *outside* any .wrap, so every
  // line between rows of cover images stretches the full width of the
  // content column (edge to edge, past the .wrap's own max-width/
  // padding).
  const blocks = [];
  const essayPair = (pair) => {
    if (pair.length) blocks.push(renderDuoCard(pair, { padTo: 2 }));
  };
  const contraRow = (row) => {
    if (row.length) {
      blocks.push(renderDuoCard(row, {
        tag: 'From the Review',
        btnLabel: 'Contra',
        btnHref: 'contra.html',
        extraClass: 'card--quad card--quad-open',
        padTo: 3,
      }));
    }
  };
  if (essays[0] || postscripts[0]) {
    blocks.push(renderSplitRow(essays[0], postscripts[0]));
  }
  essayPair(essays.slice(1, 3));
  contraRow(contras.slice(0, 3));
  essayPair(essays.slice(3, 5));
  const psTrio = postscripts.slice(1, 4);
  if (psTrio.length) {
    blocks.push(renderDuoCard(psTrio, {
      tag: 'From the Interview',
      btnLabel: 'Postscript',
      btnHref: 'postscript.html',
      extraClass: 'card--trio-flat',
      padTo: 3,
    }));
  }
  essayPair(essays.slice(5, 7));
  contraRow(contras.slice(3, 6));
  essayPair(essays.slice(7, 9));
  if (essays[9] || postscripts[4]) {
    blocks.push(renderSplitRow(essays[9], postscripts[4], { flip: true }));
  }
  const archiveOpts = { tag: 'From the Essay', btnLabel: 'From the Archive', btnHref: 'archive.html' };
  if (archives[0] || archives[1]) {
    blocks.push(renderDuoCard(archives.slice(0, 2), { ...archiveOpts, padTo: 2 }));
  }
  if (archives[2] || archives[3]) {
    blocks.push(renderSplitRow(archives[2], archives[3], {
      wideOpts: archiveOpts,
      narrowOpts: archiveOpts,
    }));
  }
  const duoHtml = blocks
    .map((block, i) => `
  <div class="wrap">
    ${block}
  </div>${i < blocks.length - 1 ? '\n  <div class="row-divider"></div>' : ''}`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#000000">
<title>${escapeHtml(SITE_NAME)} \u2014 ${escapeHtml(SITE_TAGLINE)}</title>
<meta name="description" content="${escapeHtml(SITE_TAGLINE)}. Criticism, essays, and conversation from the most urgent writers of our generation.">
${ogTags({
    title: `${SITE_NAME} \u2014 ${SITE_TAGLINE}`,
    description: `${SITE_TAGLINE}. Criticism, essays, and conversation from the most urgent writers of our generation.`,
    pagePath: '/',
    image: lead?.image,
  })}
<link rel="icon" href="favicon.png">
${leadPreload}
<link rel="stylesheet" href="style.css">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

${renderHeader()}

<main id="main">

  <div class="page-rows" id="top">
${duoHtml}
  </div>

</main>

${renderFooter()}

${renderCaterpillarScript()}
${renderDuoPanelFitScript()}
${renderLineDrawScript()}
</body>
</html>`;
}

// The duo/trio/quad row panels live on the homepage and the essays/
// postscript/contra pages (see renderListPage's extraScripts) — the other
// shell pages (about, give, archive) have none, so this stays out of
// renderPageShell's fixed script set.
function renderDuoPanelFitScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/duo-panel-fit.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// The page-ruling line draw — the ledger effect on the page's gray
// dividers — ships with the homepage, the essays/postscript/contra pages
// (renderListPage), and the give/about column pages (their flanking
// rules and section rules join it); archive has the ledger itself. See
// src/line-draw.js.
function renderLineDrawScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/line-draw.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

function renderCaterpillarScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/caterpillar.js'), 'utf8');
  return `<script>
${js}
</script>`;
}
// The social-card block every page head carries — og:* plus the Twitter
// card flavor. Without these a shared link renders as a bare URL in
// iMessage/Slack/X. Cover art (Substack's CDN URLs are already absolute)
// gets the large-image card; pages with none (about, archive) fall back
// to a plain summary card, which renders fine without an image.
function ogTags({ title, description, pagePath, image }) {
  return [
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    description ? `<meta property="og:description" content="${escapeHtml(description)}">` : '',
    `<meta property="og:url" content="${CANONICAL_ORIGIN}${pagePath}">`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
  ].filter(Boolean).join('\n');
}

function renderPageShell({ currentKey, title, description, bodyHtml, extraScripts = '', bodyClass = '', ogImage }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#000000">
<title>${escapeHtml(title)} — ${escapeHtml(SITE_NAME)}</title>${description ? `
<meta name="description" content="${escapeHtml(description)}">` : ''}
${ogTags({ title: `${title} — ${SITE_NAME}`, description, pagePath: `/${currentKey}.html`, image: ogImage })}
<link rel="icon" href="favicon.png">
<link rel="stylesheet" href="style.css">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>

<a class="skip-link" href="#main">Skip to content</a>

${renderHeader(currentKey)}

<main id="main">
${bodyHtml}
</main>

${renderFooter()}

${renderCaterpillarScript()}${extraScripts ? `\n${extraScripts}` : ''}
</body>
</html>`;
}

// Each section page renders every one of its posts with the same
// hover-panel cells as its homepage row (see renderDuoCard/renderDuoHalf):
// essays as two-across squares, postscript as three-across 1:2 portraits
// (card--trio), contra as three-across small squares (card--quad styling —
// same look as the homepage's quad row, one cell fewer per row).
const LIST_ROWS = {
  essays: { perRow: 2, extraClass: '', tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'essays.html' },
  postscript: { perRow: 3, extraClass: 'card--trio', tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'postscript.html' },
  // card--quad-open lifts the homepage quad's hide-the-excerpt rules —
  // these cells are a third wider than the homepage's four-across squares,
  // wide enough to open on the review's first paragraph (see style.css).
  contra: { perRow: 3, extraClass: 'card--quad card--quad-open', tag: 'From the Review', btnLabel: 'Contra', btnHref: 'contra.html' },
};

function renderListPage({ currentKey, label, posts }) {
  const cfg = LIST_ROWS[currentKey];
  const rows = [];
  for (let i = 0; i < posts.length; i += cfg.perRow) {
    rows.push(renderDuoCard(posts.slice(i, i + cfg.perRow), { ...cfg, padTo: cfg.perRow }));
  }
  // Same structure as the homepage blocks: one .wrap per row with a
  // full-bleed .row-divider between rows, so every line between cover
  // images runs edge to edge. .page-rows is now the outer sleeve carrying
  // the page's top/bottom insets.
  const bodyHtml = `
  <div class="page-rows">
${rows
    .map(
      (row, i) => `  <div class="wrap">
    ${row}
  </div>${i < rows.length - 1 ? '\n  <div class="row-divider"></div>' : ''}`
    )
    .join('\n')}
  </div>`;
  return renderPageShell({
    currentKey,
    title: label,
    bodyHtml,
    // The section's newest cover becomes its share card.
    ogImage: posts.find((p) => p.image)?.image,
    extraScripts: renderDuoPanelFitScript() + renderLineDrawScript(),
  });
}


// The masthead, rendered as medallions on the About page's Masthead card —
// founding editors link out via give.html's signer blocks, the rest via
// ADDITIONAL_PEOPLE_PHOTOS below.
const ABOUT_PEOPLE = [
  { name: 'Tessa Augsberger', role: 'Founding Editor' },
  { name: 'Elan Kluger', role: 'Founding Editor' },
  { name: 'Rufus Knuppel', role: 'Founding Editor' },
  { name: 'Will Diana', role: 'Assistant Editor' },
  { name: 'Theodore Gary', role: 'Assistant Editor' },
  { name: 'Isabel Mehta', role: 'Assistant Editor' },
  { name: 'Owen Yingling', role: 'Assistant Editor' },
  { name: 'Kit Knuppel', role: 'Art Director' },
  { name: 'Milla Ben-Ezra', role: 'Founder' },
];

// Substack links for the non-founder masthead (the founders' come from
// give.html's signer blocks). The photo paths are kept for reference —
// the ledger-list About page no longer renders headshots.
const ADDITIONAL_PEOPLE_PHOTOS = {
  'Will Diana': {
    src: 'assets/people/will-diana.jpg',
    href: 'https://substack.com/@willdiana',
  },
  'Isabel Mehta': {
    src: 'assets/people/isabel-mehta.jpg',
    href: 'https://substack.com/@isabelmehta',
  },
  'Owen Yingling': {
    src: 'assets/people/owen-yingling.jpeg',
    href: 'https://substack.com/@oyyy',
  },
  'Theodore Gary': {
    src: 'assets/people/theodore-gary.jpg',
    href: 'https://substack.com/@theogary',
  },
  'Milla Ben-Ezra': {
    src: 'assets/people/milla-ben-ezra.jpeg',
    href: 'https://substack.com/@millabenezra',
  },
  'Kit Knuppel': {
    src: 'assets/people/kit-knuppel.jpg',
    href: 'https://substack.com/@kitknuppel1',
  },
};

// The About page (née Mission): a card grid in the hover cards' skin —
// left column About/Subscribe/Masthead/Contact, a double-width right
// column with Give over the founders' letter, every rule joining the
// line-draw ledger effect on load. See .mission-* in style.css (the
// class names keep the page's working name).
function renderAboutPage(founders = []) {
  const hr = '<div class="mission-hr" role="separator"></div>';

  // The masthead card's medallions: the About people minus the Founder
  // (Milla), in two columns of four. Founders' headshots come from
  // give.html's signer blocks (written out in main), the rest from
  // assets/people/ (ADDITIONAL_PEOPLE_PHOTOS). Same resolution the old
  // About page used.
  const founderLookup = new Map(founders.map((f) => [f.name, f]));
  const mastheadPeople = ABOUT_PEOPLE
    .filter((p) => p.role !== 'Founder')
    .map((p) => {
      const extra = ADDITIONAL_PEOPLE_PHOTOS[p.name];
      const founder = founderLookup.get(p.name);
      const photo = founder?.photo || (extra?.src ? copyPersonPhoto(extra.src) : undefined);
      const href = founder?.href || extra?.href;
      return { ...p, photo, href };
    });
  const mastheadHtml = mastheadPeople
    .map((p) => {
      const tag = p.href ? 'a' : 'div';
      const hrefAttr = p.href ? ` href="${escapeHtml(p.href)}" rel="noopener" target="_blank"` : '';
      const photoHtml = p.photo
        ? `<img class="mission-person-photo" src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}" loading="lazy">`
        : '<span class="mission-person-photo mission-person-photo--blank" aria-hidden="true"></span>';
      return `<${tag} class="mission-person"${hrefAttr}>
          ${photoHtml}
          <span class="mission-person-name">${escapeHtml(p.name)}</span>
          <span class="mission-person-role">${escapeHtml(p.role)}</span>
        </${tag}>`;
    })
    .join('\n        ');

  // Band strips: boxes over their own rule element (a real element rather
  // than a border, so it joins the line-draw ruling with everything else).
  const bandTop = (boxes) => `<div class="mission-band mission-band--top">
          ${boxes}
        </div>
        <div class="mission-band-rule mission-band-rule--top" role="separator"></div>`;
  const bandBottom = (boxes, extraClass = '') => `<div class="mission-band-rule mission-band-rule--bottom" role="separator"></div>
        <div class="mission-band mission-band--bottom${extraClass}">
          ${boxes}
        </div>`;
  const vr = '<span class="mission-vr" role="separator"></span>';

  const bodyHtml = `
  <div class="mission-page">
    <div class="mission-col">
      <article class="mission-card">
        ${bandTop('<span class="mission-band-box mission-band-box--left">About</span>')}
        <p class="card-dek">The Young American Magazine</p>
        <div class="duo-quote-divider"></div>
        <p class="card-preview">The New Critic publishes essays, interviews, and criticism by and for generation z.</p>
      </article>
      ${hr}
      <article class="mission-card">
        ${bandTop('<span class="mission-band-box mission-band-box--left">Subscribe</span>\n          <span class="mission-band-box mission-band-box--right">$30 / year</span>')}
        <p class="card-dek">Sign up for our free newsletter or become a paying member.</p>
        <div class="duo-quote-divider"></div>
        <p class="card-preview">Hundreds of New Critic readers are paid subscribers. For $30 a year, paid subscribers get access to:</p>
        <ul class="mission-list">
          <li>Postscript, our interview series</li>
          <li>Contra, our criticism section</li>
          <li>Exclusive New Critic parties</li>
        </ul>
        ${bandBottom(`<a class="mission-band-box mission-band-box--right" href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a>`)}
      </article>
      ${hr}
      <article class="mission-card">
        ${bandTop('<span class="mission-band-box mission-band-box--left">Masthead</span>')}
        <div class="mission-people">
        ${mastheadHtml}
        </div>
      </article>
      ${hr}
      <article class="mission-card">
        ${bandTop('<span class="mission-band-box mission-band-box--left">Contact</span>')}
        <p class="card-preview">To pitch, submit, or place an inquiry, email <a href="mailto:editors@thenewcritic.com">editors@thenewcritic.com</a>.</p>
      </article>
    </div>
    ${vr}
    <div class="mission-col mission-col--double">
      <article class="mission-card">
        ${bandTop('<span class="mission-band-box mission-band-box--left">Give</span>\n          <span class="mission-band-box mission-band-box--right">$300 Lifetime Subscription</span>')}
        <p class="card-dek">The New Critic finds and supports the extraordinary writers of our generation. Competitive pay and creative license make professional writing possible. When you give to The New Critic, you fund the future of letters.</p>
        <div class="duo-quote-divider"></div>
        <div class="mission-cols">
          <p class="card-preview">Give a different amount than our subscription rate. Any gift, small or large, supports our work. Donations over $300 receive a lifetime subscription.</p>
          <p class="card-preview">We work with fiscal sponsor Fractured Atlas to allow our patrons to make tax-deductible donations, or you can give any amount instantly through Stripe.</p>
          <p class="card-preview">If you are interested in writing a check, donating more than $5,000, or have other questions, email <a href="mailto:editors@thenewcritic.com">editors@thenewcritic.com</a>.</p>
        </div>
        ${bandBottom(`<a class="mission-band-box" href="${GIVE_LINKS.fracturedAtlas}" rel="noopener" target="_blank">Give through Fractured Atlas</a>
          <a class="mission-band-box" href="${GIVE_LINKS.stripe}" rel="noopener" target="_blank">Give instantly through Stripe</a>`, ' mission-band--split')}
      </article>
      ${hr}
      <article class="mission-card">
        ${bandTop('<span class="mission-band-box mission-band-box--left">From the Founding Editors</span>')}
        <p class="card-dek">A letter to our readers</p>
        <div class="duo-quote-divider"></div>
        <div class="mission-cols">
        ${GIVE_LETTER.map((p, i) => `<p class="card-preview">${i === 0 ? wrapLeadWords(p) : escapeHtml(p)}</p>`).join('\n        ')}
        </div>
        <div class="duo-quote-divider"></div>
        <div class="col-signers">
${renderSignersHtml(founders)}
        </div>
      </article>
    </div>
    ${vr}
  </div>`;
  return renderPageShell({
    currentKey: 'about',
    title: 'About',
    description: 'The New Critic is the young American magazine. Essays, interviews, and criticism by and for generation z.',
    bodyHtml,
    bodyClass: 'mission-body',
    extraScripts: renderLineDrawScript(),
  });
}

// The archive is a ledger: one full-bleed courier-gray line per post under
// a Title/Author/Date/Kicker/Section column head, every row a click target
// that folds out a card (cover image left, dek + preview + Read on right —
// the same look as the row panels elsewhere). Row text goes white on hover
// and stays white while its card is open; the open row's bounding
// dividers go white with it (see the .arch-ledger rules in style.css and
// src/ledger.js for the toggle).
function renderLedgerRow(post) {
  const previewParas =
    post.previewParagraphs && post.previewParagraphs.length
      ? post.previewParagraphs
      : post.preview
        ? [post.preview]
        : [];
  const previewBlock = previewParas.length
    ? `<div class="card-preview-block">${previewParas
        .map((p, i) => `<p class="card-preview">${i === 0 ? wrapLeadWords(p) : emHtml(p)}</p>`)
        .join('')}</div>`
    : '';
  const dekHtml = post.subtitle
    ? `<p class="card-dek">${escapeHtml(post.subtitle)}</p>`
    : '';
  const d = post.date;
  // Current-year dates drop the year — "Jul 15" — while older posts keep
  // it so the ledger still dates its back catalog unambiguously.
  const dateStr =
    d && !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', d.getFullYear() === new Date().getFullYear()
          ? { month: 'short', day: 'numeric' }
          : { month: 'short', day: 'numeric', year: 'numeric' })
      : post.metaDate || '';
  const readNowHtml = `<a class="card-preview-cta arch-ledger-readon pc pc-right" href="${escapeHtml(post.link)}" rel="noopener">Read on ${ARROW_HTML}</a>`;
  // Sort keys for the column-head controls (see src/ledger.js): author and
  // section lowercased for a case-blind alphabetical order, the date as a
  // plain epoch number.
  const sortAttrs =
    // Leading quotes/punctuation stripped so “Quoted” titles don't sort
    // ahead of the alphabet.
    ` data-title="${escapeHtml((post.title || '').toLowerCase().replace(/^[^\p{L}\p{N}]+/u, ''))}"` +
    ` data-author="${escapeHtml((post.author || '').toLowerCase())}"` +
    ` data-date="${d && !isNaN(d.getTime()) ? d.getTime() : 0}"` +
    ` data-kicker="${escapeHtml((post.kicker || '').toLowerCase())}"` +
    ` data-section="${escapeHtml((post.sectionLabel || '').toLowerCase())}"`;
  return `
  <div class="arch-ledger-item"${sortAttrs}>
    <div class="arch-ledger-row arch-ledger-grid" role="button" tabindex="0" aria-expanded="false">
      <span class="arch-ledger-cell lc-title"><span class="cell-text">${escapeHtml(post.title)}</span></span>
      <span class="arch-ledger-cell lc-author"><span class="cell-text">${escapeHtml(post.author || '')}</span></span>
      <span class="arch-ledger-cell lc-date"><span class="cell-text">${escapeHtml(dateStr)}</span></span>
      <span class="arch-ledger-cell lc-kicker"><span class="cell-text">${escapeHtml(post.kicker || '')}</span></span>
      <span class="arch-ledger-cell lc-section"><span class="cell-text">${escapeHtml(post.sectionLabel || '')}</span></span>
    </div>
    <div class="arch-ledger-card arch-ledger-grid" hidden>
      <span class="arch-ledger-card-image"><a href="${escapeHtml(post.link)}" rel="noopener">
        ${post.image ? `<img src="${escapeHtml(post.image)}" alt="" loading="lazy" decoding="async"${focalStyle(post)}>` : '<span class="card-image--blank"></span>'}
      </a></span>
      <div class="arch-ledger-card-text">
        ${dekHtml ? '<div class="arch-ledger-card-divider arch-ledger-card-divider--top"></div>' : ''}
        ${dekHtml}
        ${dekHtml && previewBlock ? '<div class="arch-ledger-card-divider"></div>' : ''}
        ${previewBlock}
        <div class="panel-band panel-band--bottom">
          ${artBoxHtml(post, 'left')}${readNowHtml}
        </div>
      </div>
    </div>
  </div>`;
}

function renderLedgerScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/ledger.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// Column-head sort control: a stacked up/down arrow pair after the label.
// Up = ascending (A–Z, oldest first), down = descending; the active
// direction holds white (see src/ledger.js).
function sortArrows(key, label) {
  return `<span class="arch-sort-arrows">
        <button class="arch-sort" type="button" data-key="${key}" data-dir="asc" aria-label="Sort by ${label} ascending">&#9650;</button>
        <button class="arch-sort" type="button" data-key="${key}" data-dir="desc" aria-label="Sort by ${label} descending">&#9660;</button>
      </span>`;
}

function renderArchivePage(posts) {
  const bodyHtml = `
  <section class="arch-ledger">
    <div class="arch-ledger-head arch-ledger-grid">
      <span class="arch-ledger-cell lc-title"><span class="cell-text"><button class="arch-shuffle" type="button" aria-label="Shuffle order">&#8644;</button> Title ${sortArrows('title', 'title')}</span></span>
      <span class="arch-ledger-cell lc-author"><span class="cell-text">Author ${sortArrows('author', 'author')}</span></span>
      <span class="arch-ledger-cell lc-date"><span class="cell-text">Date ${sortArrows('date', 'date')}</span></span>
      <span class="arch-ledger-cell lc-kicker"><span class="cell-text">Tag ${sortArrows('kicker', 'tag')}</span></span>
      <span class="arch-ledger-cell lc-section"><span class="cell-text">Section ${sortArrows('section', 'section')}</span></span>
    </div>
    ${posts.map(renderLedgerRow).join('')}
  </section>`;
  return renderPageShell({
    currentKey: 'archive',
    title: 'Archive',
    bodyHtml,
    extraScripts: renderLedgerScript(),
  });
}

// Extracts the three founders' name + headshot photo + signature + Substack
// link from give.html's .signer blocks, for reuse as About-page medallions.
// Photo/signature come back as raw base64 data URIs (that's how they're
// embedded in give.html's hand-authored source) — see writeDataUriImage,
// which externalizes them to real files.
function extractFounders(html) {
  const founders = [];
  const marker = 'class="signer"';
  let searchFrom = 0;
  while (true) {
    const markerIdx = html.indexOf(marker, searchFrom);
    if (markerIdx === -1) break;
    const openTagEnd = html.indexOf('>', markerIdx) + 1;

    const divRe = /<\/?div\b[^>]*>/gi;
    divRe.lastIndex = openTagEnd;
    let depth = 1;
    let m;
    let block = null;
    while ((m = divRe.exec(html))) {
      if (m[0].startsWith('</')) {
        depth -= 1;
        if (depth === 0) {
          block = html.slice(openTagEnd, m.index);
          searchFrom = m.index;
          break;
        }
      } else {
        depth += 1;
      }
    }
    if (!block) break;

    const name = (/signer-name">([^<]*)</.exec(block) || [])[1];
    const photoDataUri = (/class="signer-photo"\s+src="([^"]+)"/.exec(block) || [])[1];
    const sigDataUri = (/class="signer-sig[^"]*"\s+src="([^"]+)"/.exec(block) || [])[1];
    const href = (/<a href="([^"]+)"[^>]*>\s*<img class="signer-photo"/.exec(block) || [])[1];
    if (name && photoDataUri) founders.push({ name, photoDataUri, sigDataUri, href });
  }
  return founders;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Copies a local asset (the non-founder headshots in assets/people/) into
// OUT_DIR/people, returning its site-relative URL.
function copyPersonPhoto(relPath) {
  const base = path.basename(relPath);
  const destDir = path.join(OUT_DIR, 'people');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, relPath), path.join(destDir, base));
  return `people/${base}`;
}

// Decodes an inline `data:image/...;base64,...` URI and writes it to a real
// file under OUT_DIR, returning the site-relative URL to reference it by.
function writeDataUriImage(dataUri, destRelPath) {
  const m = /^data:image\/(png|jpe?g);base64,([\s\S]+)$/.exec(dataUri);
  if (!m) throw new Error(`Unrecognized inline image data URI for ${destRelPath}`);
  const destPath = path.join(OUT_DIR, destRelPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(m[2], 'base64'));
  return destRelPath;
}

// give.html — the original hand-built Give page — survives only as an
// asset source: the founders' signature images and Substack links are
// extracted from its .signer blocks in main(). The Give content itself
// lives on the About page's Give card.
const GIVE_SRC_PATH = path.join(__dirname, 'give.html');

// The founders' letter, lifted verbatim from the original hand-authored
// give.html — the About page's letter card.
const GIVE_LETTER = [
  'In this era of investment in technological innovation and big ideas, The New Critic believes the same approach to risk should be applied to the world of letters.',
  'We operate in a different sector than the tech sphere — ours is the bazaar of rhetoric, emotion, and ideas — and our mission is not tied to any bottom line. Rather, our magazine is the product of one long conversation, a lasting friendship between our editors, and a dogged pursuit of excellence in the name of beauty and freedom, that liberty to act according to what activates the mind and invigorates the body.',
  'The New Critic is a venture capital firm for writing. We invest resources in the intrepid thinkers, writers, and ideas of our generation.',
  'Cynics see the internet as a scourge on the intellect, a blight that rots our appetite for reading and mutilates our attention. But we believe in the digital as the accelerant of communication, the medium that will allow our generation of writers to be among the greatest that have ever lived.',
  'With a year of notches on our editorial belt, we now have our ambitions and wits about us. We have built up our arsenal of scouts, sharpened our eye for potential, developed our talent, and expanded our public. We are the foremost experts at identifying the extraordinary among our peers, offering talented writers the range, platform, and connections they need to pursue the writing life.',
  'But our venture firm needs capital. The internet is only as good, as disciplined, as exciting as we make it. By giving to The New Critic, you are investing in young writers before embitteredness, intimidation, and embourgeoisement can overtake their ideals. You are allowing The New Critic to be a patron, to pay our writers more competitive rates, send them on more ambitious assignments, and create the material conditions required for their work.',
  'With our sights set on these ruthless ends, we ask believers in our project to pledge their faith.',
];
const GIVE_LINKS = {
  fracturedAtlas: 'https://fundraising.fracturedatlas.org/the-new-critic',
  stripe: 'https://donate.stripe.com/00w00i0rufwc8KFf9S7AI01',
};

// The founders' letter signatures: each written signature over its courier
// name, linked to the founder's Substack — the About page's letter card.
// Per-signature size modifiers keep the three hands optically even (the
// images' ink boxes differ).
function renderSignersHtml(founders) {
  const SIG_MODS = { 'Elan Kluger': ' col-sig--elan', 'Rufus Knuppel': ' col-sig--rufus' };
  return founders
    .filter((f) => f.sig)
    .map(
      (f) => `            <a class="col-signer" href="${escapeHtml(f.href || SITE_URL)}" rel="noopener" target="_blank">
              <span class="col-sig-wrap"><img class="col-sig${SIG_MODS[f.name] || ''}" src="${escapeHtml(f.sig)}" alt="${escapeHtml(f.name)}’s signature" loading="lazy"></span>
              <span class="col-signer-name">${escapeHtml(f.name)}</span>
            </a>`
    )
    .join('\n');
}

async function main() {
  console.log(`Fetching feed and archive in parallel`);
  const [xml, archive] = await Promise.all([
    fetchFeed(FEED_URL),
    fetchFullArchive(),
  ]);
  const items = parseItems(xml);
  console.log(`Parsed ${items.length} posts from feed.`);
  if (items.length === 0) {
    throw new Error('No posts found in feed — check the feed URL and structure.');
  }
  const rssPosts = items
    .filter((i) => i.title && i.link)
    .map(normalizeRssItem)
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  console.log(`Fetched ${archive.length} total posts from the archive API.`);

  const [essaysAll, postscriptAll, contraAll] = SECTIONS.map((s) =>
    fetchTagPostsFrom(archive, s.slug)
  );
  // Apply manual first-paragraph overrides for Contra posts.
  for (const p of contraAll) {
    const manual = lookupContraPreview(p.link);
    if (manual) p.preview = manual;
  }
  console.log(
    `Parsed ${essaysAll.length} essays, ${postscriptAll.length} postscript, ${contraAll.length} contra posts.`
  );

  // Full archive normalized (every post, real likes/author/subtitle) —
  // richer than the RSS-sourced posts (RSS gives no like count and a
  // generic excerpt); feeds the ledger and the archive-mosaic picks.
  const archivePosts = dedupeByLink(
    archive.map(normalizeTagPost).filter((p) => p.title && p.link)
  ).sort((a, b) => b.date - a.date);

  // Build a preview map from RSS posts (they already have body content).
  const previewByLink = new Map(rssPosts.filter((p) => p.preview).map((p) => [p.link, p.preview]));

  // Raw feed bodies, for re-extracting paragraphs when a post-page fetch
  // comes back empty (paywalled posts whose free preview is thin, or a
  // fetch that failed outright) — the feed's content:encoded carries the
  // same free-preview paragraphs and needs no extra request.
  const rssBodyByLink = new Map(
    items.filter((i) => i.link && i.bodyHtml).map((i) => [i.link, i.bodyHtml])
  );

  // The first N posts of each tag list double as their list page's lead
  // cards (essays.html/postscript.html/contra.html) — same array
  // references as essaysAll/postscriptAll/contraAll (slice() copies the
  // array, not the post objects), so backfilling their preview text here
  // also seeds it there.
  const essaysSlice = essaysAll.slice(0, SECTIONS[0].cardCount);
  const postscriptSlice = postscriptAll.slice(0, SECTIONS[1].cardCount);
  const contraSlice = contraAll.slice(0, SECTIONS[2].cardCount);

  const leadPosts = dedupeByLink(
    [...essaysSlice, ...postscriptSlice, ...contraSlice].filter(Boolean)
  );

  const toFetch = leadPosts.filter((p) => p.link && !previewByLink.has(p.link));
  if (toFetch.length) {
    console.log(`Fetching first paragraphs for ${toFetch.length} posts`);
    const fetched = await Promise.all(toFetch.map((p) => fetchFirstParagraph(p.link)));
    toFetch.forEach((p, i) => { if (fetched[i]) previewByLink.set(p.link, fetched[i]); });
  }

  // Attach previews to all these post objects in-place.
  for (const p of leadPosts) {
    const preview = previewByLink.get(p.link);
    if (preview) p.preview = preview;
  }

  // The homepage rows (no separate hero card anymore — the latest essay
  // leads row 1 itself): ten most recent essays (the lead row's wide
  // cell, four square pairs, the bottom row's wide cell), five most
  // recent postscripts (the lead row's third, the flat trio, the
  // bottom row's third), and six most recent contras (two three-across
  // rows) — see renderHomepage's row plan. All of essaysAll/
  // postscriptAll/contraAll get extended previews below, so these can
  // slice deeper than the list-page lead slices above.
  const homeEssays = essaysAll.slice(0, 10);
  const homePostscripts = postscriptAll.slice(0, 5);
  const homeContras = contraAll.slice(0, 6);

  // The From the Archive rows' four hand-picked posts (see
  // ARCHIVE_ROW_SLUGS for the cell order).
  const heroArchive = ARCHIVE_ROW_SLUGS
    .map((slug) => archivePosts.find((p) => slugOf(p.link) === slug))
    .filter(Boolean);
  for (const p of heroArchive) {
    // Same section-matched tag logic as the hero's own (the visible text is
    // uppercased by CSS either way). archivePosts objects are distinct from
    // the contraAll ones, so the manual contra previews get re-applied here.
    p.previewTagline =
      postscriptAll.some((q) => q.link === p.link) ? 'From the Interview'
      : contraAll.some((q) => q.link === p.link) ? 'From the Review'
      : essaysAll.some((q) => q.link === p.link) ? 'From the Essay'
      : 'From the Editors';
    const manual = lookupContraPreview(p.link);
    if (manual) p.preview = manual;
  }

  // Section column for the archive ledger (see renderLedgerRow) — same
  // membership checks as the tagline logic above, as a bare column label.
  for (const p of archivePosts) {
    p.sectionLabel =
      postscriptAll.some((q) => q.link === p.link) ? 'Postscript'
      : contraAll.some((q) => q.link === p.link) ? 'Contra'
      : essaysAll.some((q) => q.link === p.link) ? 'Essays'
      : 'Editors';
  }

  // The row panels — on the homepage rows AND the essays/postscript/contra
  // pages, which render every section post with the same hover cells (see
  // renderListPage) — show as much of the piece as fits their box
  // (duo-panel-fit.js clamps at the rendered line), so pull several full
  // paragraphs for each, same as the hero. Contra quads hide the preview
  // block itself (see .card--quad in style.css) but still need a preview
  // for the "Read on" button to render; CONTRA_MANUAL_PREVIEWS entries
  // remain as hand edits that win where present. archivePosts rides along
  // for the ledger's fold-out cards (every post, including untagged ones).
  const rowPostGroups = [homeEssays, homePostscripts, heroArchive, essaysAll, postscriptAll, contraAll, archivePosts];
  const rowPosts = dedupeByLink(rowPostGroups.flat());
  if (rowPosts.length) {
    console.log(`Fetching extended previews for ${rowPosts.length} row posts`);
    const extended = await mapBatched(rowPosts, 10, (p) => fetchExtendedPreview(p.link, 3));
    const parasByLink = new Map();
    const artistByLink = new Map();
    rowPosts.forEach((p, i) => {
      let paras = extended[i].paragraphs;
      if (extended[i].artist) artistByLink.set(p.link, extended[i].artist);
      if ((!paras || !paras.length) && rssBodyByLink.has(p.link)) {
        // Same fallback as the hero's — recent posts still in the feed can
        // recover their free-preview paragraphs from content:encoded.
        paras = extractParagraphs(rssBodyByLink.get(p.link), 3);
      }
      if (paras && paras.length) parasByLink.set(p.link, paras);
    });
    console.log(`Cover artist credit found for ${artistByLink.size} of ${rowPosts.length} row posts`);
    // The same post appears as distinct objects across collections (the
    // archive mosaic's picks come from archivePosts; the section pages
    // render the essaysAll/postscriptAll/contraAll objects) — dedupeByLink
    // fetched each link once, so attach the result to every copy by link
    // rather than only to the object that survived the dedupe.
    for (const p of rowPostGroups.flat()) {
      const paras = parasByLink.get(p.link);
      if (paras) p.previewParagraphs = paras;
      const artist = artistByLink.get(p.link);
      if (artist) p.coverArtist = artist;
    }
  }

  // Every failure here already survived fetchHtml's retries. A few are
  // tolerable (those cards fall back to feed excerpts or lose their
  // credit); past a quarter of the posts the site would be visibly
  // gutted — abort nonzero so a scheduled deploy keeps the previous
  // complete build instead.
  if (failedPageFetches) {
    console.warn(`WARNING: ${failedPageFetches} post pages failed to fetch after retries — their cards lose excerpts/credits`);
    if (failedPageFetches > rowPosts.length / 4) {
      console.error('Too many failed post fetches (rate limit?) — aborting build');
      process.exit(1);
    }
  }


  // Hand-edited text overrides win over everything fetched above. Applied
  // to every collection that reaches a page — the same post can appear as
  // different objects in several of them, so no deduping here.
  const allPosts = [...rssPosts, ...essaysAll, ...postscriptAll, ...contraAll, ...archivePosts].filter(Boolean);
  applyContentOverrides(allPosts);
  // After the overrides, so a hand-written dek gets the same treatment as
  // a fetched one (and so an override can opt out by not matching).
  applyDekBylines(allPosts);

  const html = renderHomepage({ essays: homeEssays, postscripts: homePostscripts, contras: homeContras, archives: heroArchive });

  // give.html is only mined for assets now (see GIVE_SRC_PATH): the
  // founders' Substack links and signature images, the latter written out
  // from their inline base64 to real cacheable files.
  console.log('Reading give.html');
  const giveSrc = fs.readFileSync(GIVE_SRC_PATH, 'utf8');
  const founders = extractFounders(giveSrc);
  for (const f of founders) {
    if (f.sigDataUri) f.sig = writeDataUriImage(f.sigDataUri, `people/${slugify(f.name)}-sig.png`);
    // Founder headshots (for the mission page masthead card) — same inline
    // base64 → real file treatment as the signatures.
    if (f.photoDataUri) {
      const ext = f.photoDataUri.startsWith('data:image/png') ? 'png' : 'jpg';
      f.photo = writeDataUriImage(f.photoDataUri, `people/${slugify(f.name)}.${ext}`);
    }
  }

  const archivePool = archivePosts;

  const pages = {
    'index.html': html,
    'essays.html': renderListPage({ currentKey: 'essays', label: 'Essays', posts: essaysAll }),
    'postscript.html': renderListPage({ currentKey: 'postscript', label: 'Postscript', posts: postscriptAll }),
    'contra.html': renderListPage({ currentKey: 'contra', label: 'Contra', posts: contraAll }),
    'about.html': renderAboutPage(founders),
    'archive.html': renderArchivePage(archivePool),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [filename, content] of Object.entries(pages)) {
    fs.writeFileSync(path.join(OUT_DIR, filename), content, 'utf8');
    console.log(`Wrote ${path.join(OUT_DIR, filename)}`);
  }
  fs.copyFileSync(path.join(__dirname, 'style.css'), path.join(OUT_DIR, 'style.css'));
  // The site runs on system faces now, so there may be no fonts/ to copy.
  // Guarded because this loop sits BEFORE the asset copies below — an
  // unguarded ENOENT here aborted main() after the pages were written,
  // leaving the mark, the favicon and the panel fitter stale in dist/.
  const fontsDir = path.join(__dirname, 'fonts');
  if (fs.existsSync(fontsDir)) {
    fs.mkdirSync(path.join(OUT_DIR, 'fonts'), { recursive: true });
    for (const f of fs.readdirSync(fontsDir)) {
      fs.copyFileSync(path.join(fontsDir, f), path.join(OUT_DIR, 'fonts', f));
    }
  }
  // The nav wordmark: the hand-drawn framed bird (white ink on
  // transparency, extracted from "Bird logo.png" in the repo root — see
  // assets/bird-mark.png).
  fs.copyFileSync(path.join(__dirname, 'assets/bird-mark.png'), path.join(OUT_DIR, 'bird-mark.png'));
  // The bird that closes the sidebar (see renderNav / .nav-bird). Kept in
  // assets/ under a clean name rather than read from the root "Bird
  // logo.png" it was drawn as — the build shouldn't depend on a filename
  // with a space in it, and the root copy is deliberately untracked.
  fs.copyFileSync(path.join(__dirname, 'assets/bird-logo.png'), path.join(OUT_DIR, 'bird-logo.png'));
  fs.writeFileSync(path.join(OUT_DIR, 'favicon.png'), Buffer.from(FAVICON_B64, 'base64'));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  parseItems,
  renderHomepage,
  // Extraction pipeline, exported for audit scripts/tests.
  extractParagraphs,
  extractPreloads,
  looksLikeProse,
  stripHtml,
  fetchHtml,
};
