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

// Stamped into the stylesheet link on every build — browsers cache
// the un-versioned style.css hard, and every design pass was needing
// a manual hard refresh to show.
const BUILD_STAMP = Date.now().toString(36);
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
    // The interview subject's display name — locked, so the dek
    // parser (applyDekBylines, which runs after) can't overwrite it
    // with whatever alias the feed's dek used.
    if (o.psName) { p.psName = o.psName; p.psNameLocked = true; }
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
// Soft hyphens for title words too long to set whole in a narrow card
// column. hyphens:auto can't help: engines skip capitalized words by
// design (so proper nouns don't hyphenate), and a title-case word that
// overflows falls through to overflow-wrap's bare mid-letter snap. A
// baked \u00AD breaks with a real painted hyphen in every engine and is
// invisible wherever the word fits. Points are hand-chosen syllable
// breaks; add a word here the day another over-long title appears.
const TITLE_HYPHENATION = new Map([
  ['Commodification', 'Commod\u00ADification'],
  // Lets the contra square keep the full 60px: unbroken, the word out-
  // measures the 313px column and the fitter would shrink the title to
  // 51px rather than let the engine snap it mid-letter (browsers refuse
  // to auto-hyphenate capitalised words \u2014 see CAN_HYPHENATE in
  // duo-panel-fit.js \u2014 so licensed breaks are injected here by hand).
  ['Unstageable', 'Unstage\u00ADable'],
]);
function applyTitleHyphenation(posts) {
  for (const p of posts) {
    if (!p || !p.title) continue;
    for (const [word, broken] of TITLE_HYPHENATION) {
      p.title = p.title.split(word).join(broken);
    }
  }
}

const POSTSCRIPT_DEK = /^(Postscript No\.\s*\d+\s*\|\s*)(.+?)\s+on\s+(.+)$/;
// The issue number on its own, for deks that don't split into the
// name/subject shape above but still carry the prefix.
const POSTSCRIPT_DEK_PREFIX = /^Postscript No\.\s*\d+\s*\|\s*/i;

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

// The deks' house voice: every card dek opens on a function word —
// "On …" for the interviews, "contra …" for the reviews — so the two
// sections read in one register instead of as two headline styles.
// Reviews keep their opening lowercase; names and work titles keep
// their capitals regardless ("contra Freya India's GIRLS®").
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
        // The full subject name(s), unabbreviated — the postscript
        // page's index scroll lists every interviewee by name (see
        // renderPostscriptPage). Serial style: commas between the
        // early names, the ampersand only before the last ("A, B & C").
        if (!p.psNameLocked) {
          p.psName = names.length > 2
            ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
            : names.join(' & ');
        }
        // The issue number goes with the names: the dek is "on <subject>"
        // and nothing more. The number belongs to the post's own page,
        // and repeating it here spent a third of the dek's measure
        // before the subject even started.
        p.subtitle = `On ${ps[3]}`;
      } else {
        // The dek didn't split into name/subject — keep whatever it says
        // and just drop the issue number off the front.
        p.subtitle = p.subtitle.replace(POSTSCRIPT_DEK_PREFIX, '');
      }
      continue;
    }

    // "<Reviewer> contra <Work>" → "contra <Work>". Gated on the prefix
    // reading as a NAME rather than on the word "contra" alone, so an
    // essay dek that happens to use it in a sentence is left be. Matching
    // the prefix against post.author is too strict on its own — one
    // review's author field is "Nadav" where its dek says "Nadav Asal".
    const con = p.subtitle.match(/^(.+?)\s+contra\s+(.+)$/i);
    if (con && looksLikeName(con[1])) {
      p.subtitle = `contra ${con[2]}`;
      continue;
    }

    // Deks that already arrive in the target shape — a hand-written
    // override, or a review whose dek opens on "Contra" with no reviewer
    // in front of it for the branch above to strip.
    p.subtitle = p.subtitle
      .replace(POSTSCRIPT_DEK_PREFIX, '')
      .replace(/^Contra\s+/, 'contra ');
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
  // dek: the section page's own title/dek pair (see renderListPage /
  // renderPostscriptPage) — the sidebar no longer prints it (see
  // navLink in renderNav; the sidebar's own permanent gloss replaced About's
  // copy of it there). A newline is a HARD break where it's rendered —
  // these are set to specific line shapes, not left to wrap.
  { key: 'essays', label: 'Essays', href: 'essays.html' },
  { key: 'postscript', label: 'Postscript', href: 'postscript.html', dek: 'Interviews w/\nextraordinary gen zers' },
  { key: 'contra', label: 'Contra', href: 'contra.html', dek: 'New Critics take on\nsignificant gen z works' },
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

// Every feed cover routes through substackcdn.com/image/fetch/<params>/<src>,
// and the CDN honors extra Cloudinary-style transform params spliced into
// that segment — so width variants cost a string edit at build time, no
// image processing. w_ caps the width, c_limit forbids upscaling past the
// original. The splice lands after Substack's own $s_!..! named-variable
// segment when one leads (the tested-working position; a w_400 variant of
// a 218KB cover came back at 25KB).
function cdnVariant(url, w) {
  const m = /^(https:\/\/substackcdn\.com\/image\/fetch\/)([^/]+)(\/.+)$/.exec(url);
  if (!m) return null;
  const params = m[2].split(',');
  params.splice(params[0].startsWith('$') ? 1 : 0, 0, `w_${w}`, 'c_limit');
  return `${m[1]}${params.join(',')}${m[3]}`;
}

// The src/srcset/sizes attribute set for a cover <img> — or the
// href/imagesrcset/imagesizes set when preload:true, kept identical so the
// homepage lead's <link rel=preload> warms the exact URL the <img> will
// pick. Covers that don't route through the CDN fall back to the bare
// original with no srcset.
const COVER_SIZES = {
  // A wide split-row cell runs about two thirds of the row; everything
  // else (duo squares, trios, quads, archive fold-outs) sits between a
  // quarter and a half — 40vw overshoots the small cells a step, which
  // beats threading exact row geometry down into renderDuoHalf.
  wide: '(max-width: 720px) 100vw, 60vw',
  cell: '(max-width: 720px) 100vw, 40vw',
};
function coverSrcAttrs(url, sizes, { preload = false } = {}) {
  const variants = [480, 800, 1200, 1600].map((w) => ({ v: cdnVariant(url, w), w }));
  if (variants.some(({ v }) => !v)) {
    return preload ? `href="${escapeHtml(url)}"` : `src="${escapeHtml(url)}"`;
  }
  const srcset = variants.map(({ v, w }) => `${v} ${w}w`).join(', ');
  return preload
    ? `href="${escapeHtml(variants[1].v)}" imagesrcset="${escapeHtml(srcset)}" imagesizes="${escapeHtml(sizes)}"`
    : `src="${escapeHtml(variants[1].v)}" srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"`;
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

// A contra's dek bills the work under review — "Contra <artist>'s
// <work>" — so the work's title sets in italics: everything after the
// first possessive. A dek that doesn't fit the pattern passes through
// plain. (The first "'s" is the artist's — a later apostrophe inside the
// title itself, like "Dad Don't Read This", stays inside the italics.)
function contraWorkDek(subtitle) {
  const m = /^([\s\S]*?[’']s\s+)(\S[\s\S]*)$/.exec(subtitle || '');
  if (!m) return escapeHtml(subtitle || '');
  return `${escapeHtml(m[1])}<em>${escapeHtml(m[2])}</em>`;
}

// The chip-only sibling of contraWorkDek: the corner chip has no room
// for the reviewed artist's name, so it drops everything between
// "contra" and the possessive, keeping just the work in italics.
function contraWorkChipHtml(subtitle) {
  const m = /^(\S+)[\s\S]*?[’']s\s+(\S[\s\S]*)$/.exec(subtitle || '');
  if (!m) return escapeHtml(subtitle || '');
  return `${escapeHtml(m[1])} <em>${escapeHtml(m[2])}</em>`;
}


// Just the reviewed work, italic — no reviewer, no "contra". The contra
// head's category columns list their reviews this way (see
// renderListPage): the column's heading already says what kind of thing
// these are, and the reviewer's name is on the cover a click below, so
// the shelf reads as a shelf — a list of works.
function contraWorkTitle(post) {
  const work = (post.subtitle || '').replace(/^contra\s+/i, '');
  const m = /[’']s\s+(\S[\s\S]*)$/.exec(work);
  return m ? m[1] : work;
}

// The resting chip's billing, by section — the label printed over the
// middle of the cover while the card is closed (see the .rest-title-chip
// rules in style.css). Essays bill the title and author, postscript the
// topic and its subject, contra the reviewer and the work under review
// (italic).
//
// Two lines, and the CONNECTOR leads the second: "Manifest Man / by Alex
// Bronzini-Vender", not "Manifest Man by / Alex Bronzini-Vender". The
// break is where the sense breaks, so the chip reads as a billing —
// the thing, then who it's by — rather than as one long line that ran
// out of room. It's set here rather than left to wrap for the same reason
// the sidebar's tagline is: a wrap would put the break wherever the
// cover's width happened to land it.
function chipLines(first, connector, second) {
  const line1 = `<span class="rest-chip-line">${first}</span>`;
  if (!second) return line1;
  return `${line1}<span class="rest-chip-line">${connector} ${second}</span>`;
}
function composedChipHtml(post, section) {
  if (section === 'postscript') {
    return chipLines(escapeHtml(post.kicker || ''), 'w/', post.psName ? escapeHtml(post.psName) : '');
  }
  if (section === 'contra') {
    // The manifesto is the one contra post that isn't a review — it has
    // no reviewer and no work to be contra, so it names itself.
    if (slugOf(post.link) === 'contra') return chipLines('The Contra Manifesto');
    // subtitle is "contra <artist>'s <Work>" (or just "contra <Work>");
    // keep the reviewer + "contra" + the work alone, italicized.
    return chipLines(escapeHtml(bylineName(post)), 'contra', `<em>${escapeHtml(contraWorkTitle(post))}</em>`);
  }
  return chipLines(escapeHtml(post.title), 'by', escapeHtml(bylineName(post)));
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

// A card's author/kicker/date each deep-link into the archive ledger:
// sorted by that column, folded open at this post's row, so the reader
// lands among its neighbors (the author's other pieces, the tag's other
// posts, the date's contemporaries). src/ledger.js reads the hash.
function archiveHref(post, key) {
  return `archive.html#sort=${key}&post=${slugOf(post.link)}`;
}

// include picks which of date/author/likes render, AND the order they
// render in — the hover panels run one byline (author · date · likes)
// under the title rule, while the box/grid cards keep the default
// date · author · likes. Ordering by the caller's array is what lets the
// same builder serve both without a second function. caps:false drops the
// uppercasing for the panels' byline, which reads in Newsreader roman.
// archiveLinks:true renders the author and date as archive deep links
// (see archiveHref) instead of inert spans — same classes, so the byline
// boxes keep their ruling either way.
// metaDate is the manual override from content-overrides.js — a display
// string used verbatim, skipping the formatting below.
// This year's posts are dated to the day — "Jul 13" — and older ones to
// the month and year — "Dec 2025". The month is abbreviated in both, so
// the two shapes read as one format at two precisions rather than as
// two different formats sitting side by side.
function metaDateText(post) {
  const d = post.date;
  const thisYear = new Date().getFullYear();
  return post.metaDate
    || (d && !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', d.getFullYear() < thisYear
          ? { month: 'short', year: 'numeric' }
          : { month: 'short', day: 'numeric' })
      : '');
}
function metaLine(post, { include = ['date', 'author', 'likes'], caps = true, archiveLinks = false, authorPrefix = '' } = {}) {
  const raw = metaDateText(post);
  const md = caps ? raw.toUpperCase() : raw;
  const parts = [];
  for (const field of include) {
    if (field === 'date' && md) {
      parts.push(archiveLinks
        ? `<a class="meta-date" href="${escapeHtml(archiveHref(post, 'date'))}">${escapeHtml(md)}</a>`
        : `<span class="meta-date">${escapeHtml(md)}</span>`);
    } else if (field === 'author' && bylineName(post)) {
      const authorText = escapeHtml(`${authorPrefix}${authorDisplay(post, caps)}`);
      parts.push(archiveLinks
        ? `<a class="meta-author" href="${escapeHtml(archiveHref(post, 'author'))}">${authorText}</a>`
        : `<span class="meta-author">${authorText}</span>`);
    } else if (field === 'likes') {
      const likes = typeof post.reactionCount === 'number' ? post.reactionCount : 0;
      // The heart is a door, not a control: liking lives on Substack (it
      // needs the reader's session there), so the heart links to the post
      // itself, where the real button is. Same classes either way, so the
      // styling doesn't care whether a post is missing its link.
      const likesInner = `<svg class="likes-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class="likes-count">${likes}</span>`;
      parts.push(post.link
        ? `<a class="likes" href="${escapeHtml(post.link)}" rel="noopener" title="Like this on Substack">${likesInner}</a>`
        : `<span class="likes">${likesInner}</span>`);
    }
  }

  return parts.join(' <span class="meta-dot">&middot;</span> ');
}

// The copy-link corner button — a chain icon and the word "Share" that put the post's
// Substack URL on the clipboard (src/copy-link.js does the copying and
// flips .copied for the check-mark beat). Rides the top-right corner of
// every hover panel: outermost box of the duo byline strip, last band
// box of the hero's header band. Both icons ship in the one button and
// CSS swaps them on .copied.
function copyLinkBtnHtml(post, cls) {
  if (!post.link) return '';
  // The visible word is "Share", so the accessible name has to CONTAIN it
  // (a name that says only "Copy link" leaves voice control with no way to
  // say what's on screen) — hence "Share" first, the mechanism after.
  return `<button type="button" class="${cls}" data-copy-link="${escapeHtml(post.link)}" title="Share" aria-label="Share — copy link to this post"><svg class="copylink-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><svg class="copylink-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg><span class="copylink-label">Share</span></button>`;
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

// The rail's link list, extracted from renderNav so the LEFT rail
// (the homepage's reprinted sidebar) can set the identical list.
function railLinks(currentKey = 'home') {
  // The sidebar no longer prints each item's gloss (l.dek stays set on
  // SITE_LINKS — the section pages' own title/dek pair still reads it,
  // see renderListPage/renderPostscriptPage) — every item is now just
  // its title, so the column condenses to one even rhythm instead of
  // reserving a hidden gloss line under Postscript/Contra/About alone.
  function navLink(l) {
    return `<li class="nav-item--${escapeHtml(l.key)}"><a href="${escapeHtml(l.href)}"${l.key === currentKey ? ' aria-current="page"' : ''}${l.href.startsWith('http') || l.href.startsWith('mailto:') ? ' rel="noopener"' : ''}>${escapeHtml(l.label)}</a></li>`;
  }
  // The three SECTIONS are out of the rail (they head the page's own
  // movements now) — the list opens on the archive.
  const sectionKeys = ['archive'];
  const links = SITE_LINKS.filter(l => sectionKeys.includes(l.key)).map(navLink).join('\n      ')
    // (The courier tagline that rode between the two Garamond groups is
    // retired from the rail — it heads the MEGA HERO's masthead row now,
    // see renderMegaHero.)
    + '\n      ' + SITE_LINKS.filter(l => l.key === 'about').map(navLink).join('')
    // Store and Events stand in the list but go nowhere yet — plain
    // spans, no href, no hover; they take the list's cut by inheritance
    // and turn into navLink entries the day they have destinations.
    + '\n      <li><span class="nav-links-dead">Store</span></li>'
    + '\n      <li><span class="nav-links-dead">Events</span></li>'
    // Subscribe rides in the list now — the one item that keeps a place
    // in the collapsed bar (see the ≤720px rules in style.css).
    + `\n      <li class="nav-item--subscribe"><a href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a></li>`;
  return links;
}

function renderNav(currentKey = 'home') {
  const links = railLinks(currentKey);
  const homeCurrent = currentKey === 'home' ? ' aria-current="page"' : '';
  // The masthead IS the brand — the framed-bird mark that used to sit
  // above it is gone, so the name carries the home link itself. It sets
  // on ONE line in the rail's small courier now, which is why it's a
  // plain string again: it spent a while broken one word per line, each
  // word its own block so the three could be set to alternating margins,
  // and none of that structure survives a single line.
  // The tagline closes the column under Subscribe, across two lines and
  // off a blank one — the break is spelled out rather than left to wrap,
  // because "The Young / American Magazine" is the reading and "The Young
  // American / Magazine" is what the rail's measure would otherwise give.
  // It points home like the name and the mark above it, and lights with
  // them (see THE MASTHEAD in style.css): the three are one brand said
  // three ways — in words, in the mark, and in the set's own gloss — so
  // they answer a hover as one thing however far apart they sit in the
  // column.
  //
  // The rail reads name → sections → socials → tagline. The bird that
  // used to stand under the name is gone; the name and the tagline are
  // the brand now, and they light together on hover (see THE MASTHEAD in
  // style.css) since both point home.
  // (The "The Young American Magazine" tagline is retired from the
  // rail — the masthead stands alone.)
  // The name SPLITS across the rail: THE/NEW at the head, CRI/TIC at
  // the foot, the section list floating between them.
  // THE TOP HEADER (experiment): the rail turned horizontal — the name
  // on ONE line across the top, then the section list spread between
  // two rules (see THE TOP HEADER in style.css).
  return `<nav class="site-nav site-nav--top">
  <a class="wordmark topbar-wordmark" href="./"${homeCurrent} aria-label="The New Critic — home">
    <span class="topbar-name">The <span class="tn-new">New</span> Critic</span>
  </a>
  ${currentKey === 'home'
    // MOVEMENT ONE'S RAIL IS A TRACK LIKE THE REST. It used to be the
    // one sidebar with no document box of its own — sticky straight
    // into the header, seated by a vw-sloped margin and carried off
    // the page by a scroll-timeline ride, where every other movement
    // simply holds inside a track that opens on one banner and closes
    // on the next. Given the same box it needs none of that: the hold
    // and the release are the browser's, the charcoal is the track's,
    // and all four sidebars are now one mechanism.
    // THE SIDEBAR IS RETIRED on the front page: each movement opens on
    // a SECTION BAND instead (renderSectionBand), pinned to the top of
    // the viewport while its movement scrolls and pushed off by the
    // banner that opens the next.
    ? ''

    // Every other page keeps the header rail it always had: they have
    // no subscribe band to close a first movement against.
    : `<div class="topbar-rail">
    ${railInner(links, {})}
  </div>`}
</nav>`;
}

// THE PAGE RAILS: each movement carries its own sidebar — a
// document-anchored TRACK (rail-fix seats it from the two banners
// named here: the mark's cap ink 48 under the one above, the foot 48
// above the one below) holding a STICKY column, so the hold and the
// release are the browser's own. Movement one's rail is the header's;
// these are its reprints, reading the section's name over the
// categories.
// THE SECTION BANDS: the sidebar turned horizontal — a charcoal band
// at the head of each movement, the section's name in Trajan pinned
// to the left edge and its list, comma-separated in the dek's voice,
// pinned to the right. Sticky inside its movement (see the assembly
// in renderHomepage): it rides to the viewport's top, holds there
// while the movement scrolls under it, and is pushed off by the
// banner that opens the next, whose own band then takes the seat.
const SECTION_BANDS = {
  latest: { word: 'The Latest', href: './' },
  essays: { word: 'Essays', href: 'essays.html' },
  postscript: { word: 'Postscript', href: 'postscript.html' },
  contra: { word: 'Contra', href: 'contra.html' },
};
function bandDeks(m) {
  if (m === 'latest') {
    const by = (key) => SITE_LINKS.find((l) => l.key === key);
    const a = (l) => l ? `<a href="${escapeHtml(l.href)}"${l.href.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(l.label)}</a>` : '';
    return [a(by('archive')), a(by('about')), '<span class="nav-links-dead">Store</span>', '<span class="nav-links-dead">Events</span>',
      `<a href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a>`].filter(Boolean).join(', ');
  }
  const list = m === 'contra' ? CONTRA_CATEGORIES : RAIL_CATEGORIES;
  return list.map((c) => `<a href="archive.html#topic=${encodeURIComponent(c.toLowerCase())}">${escapeHtml(c)}</a>`).join(', ');
}
// THE MASTHEAD LINE RIDES IN THE BAND'S MIDDLE — the magazine line and
// the date, centred between the mark and the list. The fixed line under
// the wordmark is seated on this same box (fitMastheadPickup), so as the
// band rises it takes the two lines up with it: the band simply arrives
// where they already stand.
function bandDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function mastheadLine() {
  return `<a href="./">The Young American Magazine</a>
      <span>${bandDate()}</span>`;
}
function renderSectionBand(m) {
  const b = SECTION_BANDS[m] || SECTION_BANDS.latest;
  // THE FIRST BAND IS THE MASTHEAD LINE: the magazine's name stands on
  // the mark's seat in place of THE LATEST, the date alone in the
  // middle (no dot — the dot belongs between two things), the links
  // on the right as before. The other bands keep their section's
  // name and the full line.
  // EVERY BAND READS THE SAME WAY, no Placard: a name on the left in
  // the dek's italic, a line in the middle courier, a list on the
  // right. The first: the magazine's name, the date, the site's links.
  // The others: the section's name, its own line, its list.
  if (m === 'latest') {
    return `<nav class="section-band" aria-label="The Young American Magazine">
    <p class="band-deks band-dek"><a href="./">The Young American Magazine</a></p>
    <p class="band-mid"><span>${bandDate()}</span></p>
    <p class="band-deks">${bandDeks(m)}</p>
  </nav>`;
  }
  const BAND_LINES = {
    essays: 'The Greatest Writing By, For, and About Generation Z',
    postscript: 'TNC Editors Interview Extraordinary Gen Zers',
    contra: 'New Critics Take On Significant Gen Z Works',
  };
  const line = BAND_LINES[m] || '';
  return `<nav class="section-band" aria-label="${escapeHtml(b.word)}">
    <p class="band-deks band-dek"><a href="${escapeHtml(b.href)}">${escapeHtml(b.word)}</a></p>
    <p class="band-mid"><span>${escapeHtml(line)}</span></p>
    <p class="band-deks">${bandDeks(m)}</p>
  </nav>`;
}
// THE COLOPHON BAND: the last section's empty foot band, with the
// colophon in it — the section band's own three slots said in the
// footer's voice: the founding date on the left in the dek's italic,
// the copyright line in the middle's courier, the three links in the
// list's italic.
// It closes the page the way the header's band opens it (the reverse
// header — see THE PAGE LIFTS OFF THE REPRINT in style.css).
function renderColophonBand() {
  return `<nav class="section-band section-band--colophon" aria-label="Colophon">
    <p class="band-deks band-dek"><span>Est. May 2025</span></p>
    <p class="band-mid"><span>Copyright The New Critic Inc.</span></p>
    <p class="band-deks"><a href="https://www.thenewcritic.com" rel="noopener">Substack</a>, <a href="https://www.instagram.com/thenewcritic" rel="noopener">Instagram</a>, <a href="mailto:editors@thenewcritic.com">Email</a></p>
  </nav>`;
}
function renderPageRail({ side, word, href, after, before, categories }) {
  // THREES, like the masthead's own THE/NEW/CRI/TIC — whatever is
  // left over stands alone on the last line (POS/TSC/RIP/T), centred
  // on the column's axis by the mark's text-align. Three letters is
  // also the widest line the 251.6 column takes at this fixed size.
  const chunks = word.toUpperCase().match(/.{1,3}/g) || [word];
  return `<div class="rail-track rail-track--${side}" data-after="${escapeHtml(after)}" data-before="${escapeHtml(before)}">
    <div class="topbar-rail topbar-rail--page">
      <a class="rail-mark rail-mark--head" href="${escapeHtml(href)}" aria-label="${escapeHtml(word)}">${chunks.map((c) => `<span aria-hidden="true">${escapeHtml(c)}</span>`).join('')}</a>
      <ul class="nav-links topbar-links">
        ${railCategories(categories)}
      </ul>
    </div>
  </div>`;
}

// THE PAGE BANNERS: the header said again mid-page — the chrome
// block full-bleed, one word in the masthead voice tracked to the
// measure (fitSubscribeName in duo-panel-fit.js sets the letter-
// spacing), and one courier line centred under it. SUBSCRIBE closes
// the first movement; EVENTS closes the essays.
function renderBanner({ word, href, words, line, modifier, spacer = true }) {
  // A banner may carry no courier line at all — STORE is the word by
  // itself, so the charcoal closes on its baseline ink instead of on
  // a band's 48 box (see .page-banner--bare).
  // A banner may also carry TWO WORDS on the one line (ARCHIVE ABOUT
  // closes the page): each its own link inside the one name box, so
  // the fitter sizes and tracks the pair to the measure as one word.
  const link = (w, h) => `<a href="${escapeHtml(h)}"${h.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(w)}</a>`;
  const name = words
    ? `<span class="banner-name banner-name--pair">${words.map((w) => link(w.word, w.href)).join(' ')}</span>`
    : `<a class="banner-name" href="${escapeHtml(href)}"${href.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(word)}</a>`;
  return `<section class="page-banner ${modifier}${line ? '' : ' page-banner--bare'}">
        ${name}
        ${line ? `<div class="dek-band dek-band--banner">
          <span>${escapeHtml(line)}</span>
        </div>` : ''}
      </section>${spacer ? `
      <!-- THE HEADER'S SPACER, said again: the same charcoal field the
           masthead opens on, a viewport less the band, so the next
           section's band arrives at the fold's foot exactly as THE
           LATEST does under the name. -->
      <div class="banner-spacer" aria-hidden="true"></div>` : ''}`;
}

// THE HOVER META: share and likes on their own line directly under
// the cover's courier, spanning the picture's measure. The cover image
// stands over it at rest; on hover the picture gives way and the row
// reads in the open plate's head air, above the body text. Share leads
// at the left with its link mark AFTER the word; likes close the right
// with the heart BEFORE the count.
// DORMANT. Share and likes are off the front page for now — the two
// courier lines carry kicker, author, date and section and nothing
// else. The builder and its CSS are kept whole against their return.
function hoverMetaHtml(post) {
  return `<p class="hover-meta">${copyLinkBtnHtml(post, 'under-share')}<span class="under-likes">${metaLine(post, { include: ['likes'] })}</span></p>`;
}

// THE COVER HEAD'S PAIR: the post's KICKER at the left of the rule
// and its DATE closing the right — the courier meta idiom, on the
// picture's own top line. (It carried the likes count and a Share
// button before; both are retired from the covers.)
// THE FOUR CORNERS: kicker top-left and DATE top-right on the head
// row; AUTHOR bottom-left and SECTION bottom-right on the billing
// under it. The kicker and the section — the two that name what the
// piece is — print white; the author and the date, the facts, in the
// page's ink.
function coverHeadPair(post) {
  const kicker = post.kicker
    ? `<a href="${escapeHtml(archiveHref(post, 'kicker'))}">${escapeHtml(post.kicker)}</a>`
    : '';
  const dateText = metaDateText(post);
  const date = dateText
    ? `<a href="${escapeHtml(archiveHref(post, 'date'))}">${escapeHtml(dateText)}</a>`
    : '';
  return `<span class="cover-kicker">${kicker}</span><span class="cover-date">${date}</span>`;
}
function coverAuthorHtml(post, authorPrefix = '') {
  // The postscript names its SUBJECT ("w/ Jasmine Sun") where the
  // essay and the review name their writer — psName when the dek
  // carried one, the byline otherwise.
  // SENTENCE CASE, like everything else at the covers' corners: the
  // caps were the courier idiom and the courier is gone from here.
  const authorName = post.psName ? post.psName : authorDisplay(post, false);
  return bylineName(post) || post.psName
    ? `<a href="${escapeHtml(archiveHref(post, 'author'))}">${escapeHtml(`${authorPrefix}${authorName}`)}</a>`
    : '';
}

// THE UNDER ROW: the second half of the one courier format every
// section keeps — the DATE under the kicker at the left, the section's
// own name under the author at the right, on the line below the rule.
// Absolute on the essays and postscripts (see .cover-under in
// style.css): the picture's top edge is the rule's, and nothing may
// push it down. The contras print theirs in flow, under the cover.
function coverUnderPair(post, { authorPrefix = '', cat = '' } = {}) {
  return `<p class="cover-under"><span class="cover-author">${coverAuthorHtml(post, authorPrefix)}</span><span class="cover-cat">${cat}</span></p>`;
}

// THE COURIER IS ONE LINE AGAIN, AND IT HAS LEFT THE PICTURE. No chips
// in the artwork's corners, no rules on its edges: AUTHOR · DATE ·
// KICKER — the byline leads, the kicker closes — a single row in the words' own column, standing 24 under the
// dek (fitMatterInk seats it with the title and the dek as one block).
// The section name goes with the chips — the band overhead already
// says which movement the reader is in, and the line reads shorter
// for losing it.
// `only`: 'author' or 'date' renders that half alone (the author over
// the title, the date under the dek — two lines, each its own
// .cover-meta, the second marked .cover-meta--date).
// THE OPEN CONTROL TAKES THE DATE'S SEAT. The date has gone up to
// stand beside the author on the courier line over the title (one
// line, AUTHOR · DATE), and the line under the dek — the last line of
// every card's words — carries the control that opens the preview,
// underlined, in the same courier voice as the line it replaced. The
// fitters seat it exactly as they seated the date (.cover-meta--peek).
function peekLine() {
  return '<p class="cover-meta cover-meta--peek">' +
    '<button type="button" class="peek-open">[Open Preview]</button></p>';
}
function coverMetaLine(post, { authorPrefix = '', only = '', cls = '' } = {}) {
  const kicker = post.kicker
    ? `<span class="cover-kicker"><a href="${escapeHtml(archiveHref(post, 'kicker'))}">${escapeHtml(post.kicker)}</a></span>`
    : '';
  const authorInner = coverAuthorHtml(post, authorPrefix);
  const author = authorInner ? `<span class="cover-author">${authorInner}</span>` : '';
  const dateText = metaDateText(post);
  const date = dateText
    ? `<span class="cover-date"><a href="${escapeHtml(archiveHref(post, 'date'))}">${escapeHtml(dateText)}</a></span>`
    : '';
  // The kicker is retired from the line: AUTHOR · DATE alone.
  const parts = (only === 'author' ? [author] : only === 'date' ? [date] : [author, date]).filter(Boolean);
  // THE DOT TRAVELS WITH WHAT FOLLOWS IT. Each part after the first
  // carries its own separator INSIDE its nowrap span, so when the line
  // breaks the dot opens the second line rather than dangling at the
  // end of the first.
  const joined = parts.map((part, i) => i
    ? part.replace(/^<span class="([^"]+)">/, '<span class="$1"><span class="cover-sep" aria-hidden="true">\u00B7</span>')
    : part);
  const tag = cls || only;
  return parts.length ? `<p class="cover-meta${tag ? ` cover-meta--${tag}` : ''}">${joined.join('')}</p>` : '';
}

// The CONTRA shelf's own five, in its fixed order — the contra page
// and the contra rail read the one list.
const CONTRA_CATEGORIES = ['Art', 'Books', 'Movies', 'Music', 'Theater'];

// THE LEFT RAIL'S CATEGORIES: the second movement's sidebar reads
// subjects, not sections. No category page exists yet, so each lands
// on the archive — the markup is ready the day they have their own.
const RAIL_CATEGORIES = ['Arts', 'Culture', 'Education', 'Ideas', 'Politics', 'Religion', 'Technology'];
function railCategories(list = RAIL_CATEGORIES) {
  return list
    .map((c) => `<li><a href="archive.html#topic=${encodeURIComponent(c.toLowerCase())}">${escapeHtml(c)}</a></li>`)
    .join('\n        ');
}

// The rail's inner dress — the section list and the stacked foot
// mark — extracted so the LEFT rail (the sidebar reprinted under
// the subscribe band on the homepage) sets the exact same column.
function railInner(links, { mark = 'The New Critic', markHref = './' } = {}) {
  // THE WORDMARK LEADS the column now, the items reading under it —
  // the left rail's build (ESS/AYS over its categories), so the two
  // sidebars set the same way up.
  const markChunks = mark.replace(/\s+/g, '').toUpperCase().match(/.{1,3}/g) || [mark];
  return `<a class="rail-mark" href="${escapeHtml(markHref)}" aria-label="${escapeHtml(mark)}">${markChunks.map((c) => `<span aria-hidden="true">${escapeHtml(c)}</span>`).join('')}</a>
    <ul class="nav-links topbar-links">
      ${links}
    </ul>`;
}

function renderFooter() {
  // The footer was removed at the user's request.
  return '';
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
    ? `<div class="card-preview-block"><div class="card-preview-cols">${previewParas
        .map((p) => `<p class="card-preview">${emHtml(p)}</p>`)
        .join('')}</div></div>`
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
          ${copyLinkBtnHtml(post, 'card-copylink pc pc-right')}
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
function renderDuoHalf(post, { tag, btnLabel, btnHref, sectionBtn = true, showArtInBand = true, showDek = true, restChipArt = false, megaLabel = 'The Latest', megaSwapMeta = false }, halfClass = '') {
  // Section accent: essays pink, postscript purple, contra green, carried
  // as a --accent custom property on the cell (see .duo-half--essay etc.
  // in style.css) so every hover effect inside the card — title, glows,
  // band corners, the likes heart — reads off one value. Same section
  // routing the old byline used: the post's own previewTagline (set
  // per-post in main() for the From the Archive rows, whose row-wide tag
  // is a single section) wins over the row's.
  const section = taglineSection(post.previewTagline || tag || '');
  // Full, untruncated subtitle — duo-panel-fit.js clamps it to the lines
  // the panel actually has room for. A build-time character cut here (the
  // old truncate(…, 140)) ellipsized deks short of space the panel had.
  // Contra cards run their "Contra <work>" billing as this ordinary dek
  // now, same as every other cell (it used to ride in the byline as
  // .meta-dek, displacing the date down to the band) — with the work's
  // title in italics (see contraWorkDek).
  const dekHtml = showDek && post.subtitle
    ? `<p class="card-dek">${section === 'contra' ? contraWorkDek(post.subtitle) : escapeHtml(post.subtitle)}</p>`
    : '';
  // Full, untruncated paragraphs (several of them where the row-posts
  // fetch in main() ran) — duo-panel-fit.js decides at render time how
  // many lines each panel actually has room for and clamps there, with
  // the line-clamp display's own ellipsis.
  const previewParas = post.previewParagraphs && post.previewParagraphs.length
    ? post.previewParagraphs
    : (post.preview ? [post.preview] : []);
  const previewHtml = previewParas.length
    ? `<div class="card-preview-block"><div class="plate-curtain">${post.kicker ? `<span class="plate-title">${escapeHtml(post.kicker)}</span>` : ''}<div class="card-preview-cols">${previewParas
        .map((p) => `<p class="card-preview">${emHtml(p)}</p>`)
        .join('')}</div><p class="plate-more"><a class="plate-read" href="${escapeHtml(post.link)}" rel="noopener">Read On</a><span class="cover-sep" aria-hidden="true">\u00B7</span><span class="plate-close" role="button" tabindex="0">[Close Preview]</span></p></div></div>`
    : '';
  // The byline as the panel's HEADER strip: a sibling ABOVE
  // .duo-panel-top rather than a member of its left column, so it runs
  // the panel's whole width on the extra-wide cells too — the two facing
  // columns start beneath it, and the rule between them starts on its
  // foot (see splitTop in duo-panel-fit.js). Flush against the panel's
  // top border, closed underneath by .card-byline-divider (see
  // .card-meta--line in style.css): the author at the left; pushed to
  // the far right, the date closing the corner beside it. No separator
  // between the groups — the line's own width does that job, which is
  // what retired the dots. The copy-link button used to close this
  // corner too; postscript now bills it down in the footer band
  // instead, left of the likes count (see bandBottomHtml below) — every
  // other section keeps it here.
  const isPostscript = section === 'postscript';
  // Postscript names its subject with "w/"; essays and contra reviews print
  // the author's name plain (the "by" is dropped from the hover byline).
  const authorPrefix = isPostscript ? 'w/ ' : '';
  // sectionBtn is true only on the homepage rows (renderListPage and the
  // heroes pass false) — the "this is a homepage cell" signal. On the
  // homepage the copy-link lives in the footer band (left of the likes),
  // so the byline strip drops it there; postscript always bills it down
  // in the band too, on every page.
  const homepage = sectionBtn;
  // On the homepage the byline reads DATE then author (the reverse of the
  // section pages' author-then-date); the .card-meta--line--dateled
  // modifier swaps which box takes the margin-left:auto that pins the
  // right group (see style.css). Off-homepage keeps author left, the
  // copy-link (essay/contra), and the date closing the corner.
  // Essays, postscript and contra all carry their topic/category as a chip
  // of its own at the head of the byline — top-LEFT — boxed by its own
  // vertical rules (see .meta-kicker in style.css); the author (with its
  // "by"/"w/" prefix) takes the top-RIGHT beside it. Essay/postscript chips
  // deep-link into the archive by topic; contra's carries the filtered
  // contra-page link (it used to ride the footer, now dropped from there).
  const kickerHref = section === 'contra'
    ? `contra.html#${escapeHtml(post.kicker ? post.kicker.toLowerCase() : '')}`
    : escapeHtml(archiveHref(post, 'kicker'));
  const bylineKickerBox = post.kicker
    ? `<a class="meta-kicker" href="${kickerHref}">${escapeHtml(post.kicker)}</a>`
    : '';
  const metaLineHtml = homepage
    ? [
        metaLine(post, { include: ['author'], caps: false, archiveLinks: true, authorPrefix }),
        metaLine(post, { include: ['date'], caps: false, archiveLinks: true }),
      ].filter(Boolean).join('')
    : [
        metaLine(post, { include: ['author'], caps: false, archiveLinks: true, authorPrefix }),
        isPostscript ? '' : copyLinkBtnHtml(post, 'meta-copylink'),
        metaLine(post, { include: ['date'], caps: false, archiveLinks: true }),
        // Postscript's header drops the topic chip: its card stands OPEN
        // on the postscript page, where the same word is already printed
        // in the footer band below it and again as the entry's gloss in
        // the index at the left. The sections whose cards only open on
        // hover keep it — there the header is the one place it appears.
        isPostscript ? '' : bylineKickerBox,
      ].filter(Boolean).join('');
  const metaHtml = metaLineHtml
    ? `<p class="card-meta card-meta--line">${metaLineHtml}</p>`
    : '';
  const isWide = halfClass.includes('duo-half--wide');
  // EVERY cell runs the extrawide anatomy now: a body-only charcoal
  // band (the wide's right column; the stacked cells' bottom region),
  // the credit split into the coloured ground's corners — author +
  // date top-left, likes + Share closing the ground's foot (see THE
  // WIDE CORNERS in style.css) — and the dek under the title. Contra
  // included: it prints no body text, so it simply prints no band —
  // its billing dek and corners ride the coloured ground alone.
  const splitCredit = true;
  const bandHtml = previewHtml
    ? (splitCredit
        ? previewHtml
        : previewHtml
            .replace('<div class="card-preview-block">', `<div class="card-preview-block">${metaHtml || ''}`)
            .replace(/<\/div>\s*$/, `${dekHtml || ''}</div>`))
    : (!splitCredit && (metaHtml || dekHtml) ? `<div class="card-preview-block card-preview-block--metaonly">${metaHtml || ''}${dekHtml || ''}</div>` : '');
  const cornerAuthor = splitCredit ? metaLine(post, { include: ['author'], caps: false, archiveLinks: true, authorPrefix }) : '';
  // The corner date spells its month out in full — "August 12", not the
  // bylines' "Aug 12" — same two precisions as metaDateText otherwise.
  const cornerDateText = splitCredit
    ? (post.date && !isNaN(post.date.getTime())
        ? post.date.toLocaleDateString('en-US', post.date.getFullYear() < new Date().getFullYear()
            ? { month: 'long', year: 'numeric' }
            : { month: 'long', day: 'numeric' })
        : (post.metaDate || ''))
    : '';
  const cornerDate = cornerDateText
    ? `<a class="meta-date" href="${escapeHtml(archiveHref(post, 'date'))}">${escapeHtml(cornerDateText)}</a>`
    : '';
  const isMega = halfClass.includes('duo-half--mega');
  // The credit rides IN THE FLOW now — author leading, the date closing
  // the row (the corner blocks and the likes/Share meta are retired).
  // The MEGA flips the pair: its credit heads the BODY column, and the
  // date leads so it can seat flush on the cover's right edge.
  // Likes and Share (the foot row's pair on the stacked cells; the
  // mega hangs them into its band's middle instead — see below).
  const footLikes = splitCredit ? metaLine(post, { include: ['likes'] }) : '';
  const footShare = splitCredit ? copyLinkBtnHtml(post, 'ground-share') : '';
  // The credit row: AUTHOR at the left, DATE closing the right —
  // every cell, the mega's body-column row included.
  // (megaSwapMeta is spent: the rev hero used to TRADE the pairs
  // between its two courier rows, and there is nothing left in those
  // rows to trade — the cover's own line carries all four items, and
  // the mirror is read off the picture's side in CSS instead.)
  const topicLink = post.kicker
    ? `<a class="ground-kicker-line" href="${escapeHtml(archiveHref(post, 'kicker'))}">${escapeHtml(post.kicker)}</a>`
    : '';
  const creditHtml = splitCredit && (cornerAuthor || cornerDate)
    ? (isMega
        // THE HERO'S HEAD ROWS STAND EMPTY. Kicker, author and date
        // read on the cover's own courier now (the contra idiom), and
        // the category prints under the kicker there — so the title
        // column's two courier rows keep their rule and their rhythm
        // and carry no ink of their own.
        ? '<p class="card-meta ground-credit"></p>'
        : `<p class="card-meta ground-credit">${cornerAuthor}${cornerDate}</p>`)
    : '';
  // The mega's DATE moves UNDER the divider — a second courier row at
  // the body column's head, right-aligned on the body measure.
  // (Swapped mega: the TOPIC rides here instead.)
  // THE UNDER ROWS TRADE with the cover head: the kicker and date
  // moved onto the picture's own line, so LIKES take the kicker's old
  // seat and SHARE the date's — the swap holds through the rev
  // hero's mirroring too, since each side keeps whichever the pair
  // it replaced was standing in.
  const dateUnderHtml = isMega
    ? '<p class="card-meta ground-under ground-under--date"></p>'
    : '';
  const cornersHtml = '';
  // The MEGA HERO's kicker ROW over the title: "The Latest" above the
  // divider, and the post's TOPIC back on a second courier row UNDER
  // it, below the divider, linking into the archive. (Swapped mega:
  // the AUTHOR heads the title column, the DATE under it.)
  const kickerHtml = isMega
    ? '<p class="card-meta ground-kicker"><span class="ground-kicker-line"></span></p>'
    : '';
  const underKickerHtml = isMega
    ? '<p class="card-meta ground-under ground-under--kicker"></p>'
    : '';
  // The FOOT row closes the ground under the dek: likes at the left,
  // Share at the right — the same ruled courier row as the others.
  const footHtml = (footLikes || footShare)
    ? `<p class="card-meta ground-foot">${footLikes ? `<span class="ground-likes">${footLikes}</span>` : ''}${footShare}</p>`
    : '';
  // The footer band: kicker (and, on the homepage's essay/postscript
  // cells, the cover credit) at the left; at the right, the likes box
  // ahead of the corner box — same box the hero's header band gives
  // the likes. The corner is the section link on homepage rows, or —
  // on a section's own page, where the link is dropped (sectionBtn:
  // false, set by renderListPage) because every card there IS the
  // section — the cover credit, slid over from the left group to close
  // the band instead. Homepage contra squares drop the credit
  // outright: the narrow band has no room to seat it. duo-panel-fit.js
  // sheds left boxes right-to-left when a narrow card can't seat them
  // all (see fitBandBoxes). showArtInBand:false drops it from here
  // entirely — the postscript hero card bills its credit as a chip on
  // the cover column instead (see renderPostscriptPage), so the band
  // doesn't repeat it.
  const artBox = (side) => showArtInBand && post.coverArtist
    ? `<p class="card-meta pc pc-${side} pc-art">Art by ${escapeHtml(post.coverArtist)}</p>`
    : '';
  const likesLine = metaLine(post, { include: ['likes'] });
  const kickerBox = post.kicker
    ? `<a class="hero-kicker pc pc-left" href="${escapeHtml(archiveHref(post, 'kicker'))}">${escapeHtml(post.kicker)}</a>`
    : '';
  const likesBox = likesLine
    ? `<p class="card-meta card-meta--stats pc pc-right">${likesLine}</p>`
    : '';
  const copyBox = copyLinkBtnHtml(post, 'card-copylink pc pc-right');
  // The homepage card reads to its four corners and nothing else: author
  // top-left, date top-right, topic bottom-left, share and likes
  // bottom-right. The section chip that used to sit in the band is gone —
  // on the homepage every row is already labelled by the row above it, so
  // the chip only ever repeated what the reader could see.
  const bandBottomHtml = homepage
    ? `<div class="panel-band panel-band--bottom">
            ${kickerBox}
            ${copyBox}
            ${likesBox}
          </div>`
    : `<div class="panel-band panel-band--bottom">
            ${kickerBox}
            ${isPostscript ? copyBox : ''}
            ${likesBox}
            ${isPostscript ? '' : artBox('right')}
          </div>`;
  const sectionClass = section === 'other' ? '' : ` duo-half--${section}`;
  // The resting kicker: the topic alone, printed over the cover's
  // bottom-left corner while the card is closed — at the exact spot the
  // footer band's kicker box holds it when the panel opens, so the hover
  // reads as the panel materialising AROUND a label that never moves
  // (see .rest-kicker in style.css). aria-hidden: it duplicates the panel
  // band's kicker link, which is the one assistive tech should meet.
  const titleHtml = `<h3 class="card-title"><a href="${escapeHtml(post.link)}" rel="noopener">${escapeHtml(post.title)}</a></h3>`;
  // THE STACK: title then dek in the left column, with the byline as the
  // panel's full-width header strip above .duo-panel-top (see THE STACK
  // in style.css) — every section, postscript included. Postscript's own
  // byline/footer CONTENT still differs (its copy-link bills down in the
  // footer band, not the strip — see metaLineHtml / bandBottomHtml and
  // the isPostscript gates there), but the arrangement matches the rest.
  // (The resting billing chip that sat over the cover is retired — the
  // covers rest bare now, and the panel carries every label.)
  // Every cell reads the stack — title → byline strip → excerpt → dek,
  // 24 of ink at the panel's head and foot, 36 between the interior
  // pairs (see PANEL INK RHYTHM in style.css). The dek CLOSES the
  // stack, under the body preview, stretch-fitted like the title
  // (fitFillDek in duo-panel-fit.js). The footer band is GONE from all
  // of these cells — the byline strip is the panel's one chip row. The
  // extra-wides run the same rhythm down their RIGHT column with the
  // title facing from a centred column on the left (the CSS pins the
  // strip over the right column; the markup is one shared path).
  return `<div class="duo-half${halfClass ? ` ${halfClass}` : ''}${sectionClass}">
        <span class="card-image-frame duo-card-image"><a class="card-image-link" href="${escapeHtml(post.link)}" rel="noopener">
          ${post.image ? `<img class="card-image" ${coverSrcAttrs(post.image, halfClass.includes('duo-half--wide') ? COVER_SIZES.wide : COVER_SIZES.cell)} alt=""${focalStyle(post)} loading="lazy" decoding="async">` : '<span class="card-image card-image--blank"></span>'}
        </a></span>
        <div class="duo-panel">
          ${cornersHtml}
          <div class="duo-panel-top">
            <div class="panel-col panel-col--left">
              ${kickerHtml}
              ${underKickerHtml}
              ${isMega ? coverMetaLine(post, { cls: 'author' }) : ''}
              ${titleHtml}
              ${isMega ? '' : creditHtml}
              ${splitCredit ? dekHtml : ''}
              ${isMega ? peekLine() : ''}
              ${splitCredit && !isMega ? footHtml : ''}
            </div>
            <div class="panel-col-divider" role="separator"></div>
            <div class="panel-col panel-col--right">
              ${isMega ? creditHtml + dateUnderHtml : ''}
              ${previewParas.length ? '<div class="duo-quote-divider"></div>' : ''}
              ${bandHtml}
            </div>
          </div>
        </div>
        <!-- THE BILLING CHIP IS STRUCK. Kicker, author and date read on
             one courier line in the words' column now, under the dek;
             the picture rests bare, with nothing set into it. -->
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
function renderSplitRow(essayPost, psPost, { flip = false, wideOpts, narrowOpts, showDek = true } = {}) {
  const halves = [
    essayPost
      ? renderDuoHalf(essayPost, wideOpts || { tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'essays.html', showDek }, 'duo-half--wide')
      : '<div class="duo-half duo-half--ghost duo-half--wide" aria-hidden="true"></div>',
    psPost
      ? renderDuoHalf(psPost, narrowOpts || { tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'postscript.html', showDek }, 'duo-half--narrow')
      : '<div class="duo-half duo-half--ghost duo-half--narrow" aria-hidden="true"></div>',
  ];
  if (flip) halves.reverse();
  return `
    <article class="card card--duo card--split">
      ${halves.join(`\n      ${DUO_DIVIDER}\n      `)}
    </article>`;
}

function renderDuoCard(posts, opts = {}) {
  const { tag = 'From the Essay', btnLabel = 'Essays', btnHref = 'essays.html', extraClass = '', padTo = 0, sectionBtn = true, showDek = true } = opts;
  if (!posts.length) return '';
  const cells = posts.map((post) => renderDuoHalf(post, { tag, btnLabel, btnHref, sectionBtn, showDek }));
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

// THE MEGA HERO: the page opens on one essay stretched across the whole
// content column, cut into FIFTHS — the hover card's coloured ground on
// the left two (title, corners, dek), the charcoal body excerpt in the
// middle one, the cover filling the right two. Structurally it IS a wide
// duo cell (same markup path, same fitter), always open, with the panel
// covering the left three fifths and the cover showing beside it; its
// height runs to the bottom of the rail's TIC (see .card--mega in
// style.css).
function renderMegaHero(post, { rev = false, label = 'The Latest', m2 = false } = {}) {
  if (!post) return '';
  const half = renderDuoHalf(post, { tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'essays.html', megaLabel: label, megaSwapMeta: rev }, 'duo-half--wide duo-half--mega');
  // (The hero's masthead row is retired — the top header carries the
  // brand; the hero opens straight on its courier band.)
  // The REV hero mirrors the composition — cover left, ground right
  // (see THE SECOND HERO in style.css).
  return `<section class="card card--duo card--split card--mega${rev ? ' card--mega-rev' : ''}${m2 ? ' card--m2' : ''}">
        ${half}</section>`;
}

// THE SECTION SHELVES: two half-page boxes side by side under the
// hero. The first is INTERVIEWS — the label in the dek's voice at the
// box's left, the latest postscript as a live hover cell taking the
// box's right half. (The second box comes next.)
function renderShelvesRow(psPost) {
  if (!psPost) return '';
  const psHalf = renderDuoHalf(psPost, { tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'postscript.html' });
  return `<section class="card card--duo card--split card--shelves">
        <div class="section-box section-box--interviews">
          <p class="section-box-label">Interviews</p>
          ${psHalf}
        </div>
      </section>`;
}

// THE LATEST ROW: under the hero's long breath, the latest postscript
// (left, the remaining two thirds) beside the latest contra (the right
// third, 48 of air between them) — both in the HERO'S OWN DRESS:
// courier meta on either side of a tailless rule (the section label
// and author above it, the topic and date below), Garamond
// sentence-case titles, the dek's voice underneath. The postscript
// runs its cover PORTRAIT in the left column with the title/dek
// column beside it; the contra stacks a SQUARE cover over its text.
// ONE CONTRA CELL in the latest rows' dress — the square cover under
// its own head, the courier meta, the Garamond title and the dek.
// renderLatestRow builds its own pair inline; this is the same cell
// for rows that carry NOTHING BUT contras (see renderContraTrio).
// `rev` turns the cell over — words first, picture closing the foot
// (see THE MIDDLE REVIEW TURNS OVER in style.css). It rides as a
// CLASS rather than a position: nth-child counts the DOM, and the
// turn is done in flex order, so the two disagree the moment anything
// reads one for the other.
function renderContraCell(post, { rev = false } = {}) {
  if (!post) return '';
  const cell = renderLatestRow(null, post, { cellOnly: true, noLabel: true });
  return rev ? cell.replace('class="latest-cell latest-cell--contra"', 'class="latest-cell latest-cell--contra latest-cell--contra-rev"') : cell;
}

// TWO POSTSCRIPTS TO A LINE: each cell keeps its cover-and-text pair,
// so four columns share the measure and every one of them narrows by
// the same amount (the cover column is stated as half its own cell).
function renderPostscriptPair(a, b, { stacked = false, rev = false } = {}) {
  const cells = [a, b].filter(Boolean)
    .map((p) => renderLatestRow(p, null, { cellOnly: 'ps', noLabel: true }))
    .join('\n        ');
  if (!cells) return '';
  return `<section class="card card--latest card--ps-pair${rev ? ' card--latest-rev' : ''}${stacked ? ' card--stacked' : ''}">
        ${cells}
      </section>`;
}

// THE CONTRA MOVEMENT'S ROW: three of those cells across, the section
// page's own formation in the homepage's dress.
function renderContraTrio(posts, { stacked = false } = {}) {
  const cells = posts.filter(Boolean)
    .map((p, i) => renderContraCell(p, { rev: i === 1 }))
    .join('\n        ');
  if (!cells) return '';
  return `<section class="card card--latest card--contra-trio${stacked ? ' card--stacked' : ''}">
        ${cells}
      </section>`;
}

function renderLatestRow(psPost, contraPost, { rev = false, m2 = false, stacked = false, cellOnly = false, noLabel = false } = {}) {
  if (!psPost && !contraPost) return '';
  // THE TEXT COLUMN'S HEAD stands empty on every cell now — the
  // postscript reads its kicker, subject and date on the cover's own
  // courier, exactly as the contra always has, and its section name
  // prints under the kicker there. What survives here is the RULE and
  // the rhythm: the row and its line. (The under row went with the
  // share/likes pair it was built to seat — empty, it was 12px of
  // dead height the contra columns never carried.)
  const courierHead = () => `<p class="latest-courier"></p>
        <div class="latest-rule"></div>`;
  const coverImg = (post) => post.image
    ? `<img class="card-image" ${coverSrcAttrs(post.image, COVER_SIZES.cell)} alt=""${focalStyle(post)} loading="lazy" decoding="async">`
    : '';
  // THE PLATE, the card's covered body text: on hover the artwork
  // slides over the title/dek matter and this stands revealed where
  // the picture was (see THE PICTURE SLIDES in style.css). No flown
  // swap image any more — the artwork makes the journey itself.
  const plate = (post) => {
    // The FULL preview, like the hero's plate — the fitter cuts it to
    // the box with the ellipsis the cut owes (see the latest-plate
    // pass in duo-panel-fit.js); slicing here left short plates
    // ending without their … .
    const paras = post.previewParagraphs && post.previewParagraphs.length
      ? post.previewParagraphs
      : (post.preview ? [post.preview] : []);
    // THE KICKER OPENS THE PLATE and READ MORE closes it, both in the
    // dek's voice, centred (see .plate-title / .plate-more in
    // style.css; the fitter's cuts and seats account for both —
    // titleBlockOf / moreBlockOf in duo-panel-fit.js).
    // The CURTAIN wrapper carries the ground, the padding and the
    // clip (see THE CURTAIN in style.css); the plate itself stays an
    // unclipped hit box, so the hover that holds on it never loses
    // the pointer mid-draw.
    return paras.length
      ? `<a class="latest-plate" href="${escapeHtml(post.link)}" rel="noopener"><span class="plate-curtain">${post.kicker ? `<span class="plate-title">${escapeHtml(post.kicker)}</span>` : ''}${paras.map((p) => `<span class="latest-plate-p">${emHtml(p)}</span>`).join('')}<span class="plate-more"><span class="plate-read">Read On</span><span class="cover-sep" aria-hidden="true">\u00B7</span><span class="plate-close" role="button" tabindex="0">[Close Preview]</span></span></span></a>`
      : '';
  };
  // `between` stands between the title and the dek — the review's two
  // courier lines (see THE REVIEW'S COURIER STANDS BETWEEN ITS WORDS
  // in style.css).
  // THE COURIER STANDS OVER THE TITLE (the `before` slot): author and
  // date, then the title, then the dek.
  const matter = (post, dekHtml, { before = '', after = '' } = {}) => `<div class="latest-matter">
            ${before}
            <h3 class="latest-title"><a href="${escapeHtml(post.link)}" rel="noopener">${escapeHtml(post.title)}</a></h3>
            ${dekHtml}
            ${after}
          </div>`;
  // THE COVER HEAD: every cover carries the meta idiom on its own top
  // edge — likes at the left, Share at the right, over a rule ON the
  // image's top line. The row is a .latest-courier, so it inherits
  // the whole rolling-head machinery: it pins at the held seats and
  // the IMAGE scrolls under it like text (see .latest-courier--cover
  // in style.css for the z lift over the covers' 5).
  // `rule: false` for the REVIEWS. Their picture travels DOWN the page
  // and shrinks as it goes, and a separate 1px element cannot keep step
  // with it: the travel is a compositor transform and the shrink is a
  // main-thread height, so mid-slide the foot rule detached from the
  // edge it draws. The picture's own BORDER draws both edges instead —
  // it is part of the box, so it cannot come apart from it. (The
  // postscripts keep their rules: their picture only travels sideways,
  // and the rules travel with it on the same transform.)
  const coverHead = (post, { rule = true, ...opts } = {}) => `<p class="latest-courier latest-courier--cover">${coverHeadPair(post, opts)}</p>${rule ? `
        <div class="latest-rule"></div>` : ''}`;
  const ps = psPost ? `<div class="latest-cell latest-cell--ps">
        <!-- THE PICTURE RESTS BARE. Nothing is set into it and nothing
             hangs off its edges: the courier reads once, on one line
             under the dek in the column beside it. -->
        <div class="latest-cover-col latest-cover-col--portrait">
          <a class="latest-cover latest-cover--portrait" href="${escapeHtml(psPost.link)}" rel="noopener">${coverImg(psPost)}</a>
        </div>
        <div class="latest-col">
          ${matter(psPost, psPost.subtitle ? `<p class="latest-dek">${escapeHtml(psPost.subtitle)}</p>` : '', { before: coverMetaLine(psPost, { authorPrefix: 'w/ ', cls: 'author' }), after: peekLine() })}
        </div>
        ${plate(psPost)}
      </div>` : '';
  // THE REVIEW'S COURIER READS LIKE THE ESSAY'S: the head pair under
  // a rule at the top of the words' block, the billing hanging up
  // from a rule at its foot, the title and the dek centred between
  // (fitMatterInk seats them; the rows are absolute in the matter —
  // see THE REVIEW'S COURIER STANDS BETWEEN ITS WORDS in style.css).
  // The picture stands alone at the head of the cell, its top on the
  // postscript's.
  const contra = contraPost ? `<div class="latest-cell latest-cell--contra">
        <div class="latest-cover-col latest-cover-col--square">
          <a class="latest-cover latest-cover--square" href="${escapeHtml(contraPost.link)}" rel="noopener">${coverImg(contraPost)}</a>
        </div>
        <div class="latest-col">
          ${matter(contraPost, contraPost.subtitle ? `<p class="latest-dek">${contraWorkDek(contraPost.subtitle)}</p>` : '', { before: coverMetaLine(contraPost, { cls: 'author' }), after: peekLine() })}
        </div>
        ${plate(contraPost)}
      </div>` : '';
  // The REV row mirrors the pair: contra LEFT, postscript RIGHT with
  // its cover/text columns reversed (see .card--latest-rev in
  // style.css — the modifier flips the PS cell's flex and every
  // directional hover reach).
  // rev mirrors the PAIR (contra first, and the postscript's own
  // columns reversed); m2 is the SEAT, the second movement's clear of
  // the left rail. They were welded together while every mirrored row
  // lived on the left — a mirrored row under a RIGHT rail needs the
  // mirror without the seat, or it runs beneath the sidebar.
  if (cellOnly === 'ps') return ps;
  if (cellOnly) return contra;
  return rev
    ? `<section class="card card--latest card--latest-rev${m2 ? ' card--m2' : ''}${stacked ? ' card--stacked' : ''}">
        ${contra}
        ${ps}
      </section>`
    : `<section class="card card--latest${stacked ? ' card--stacked' : ''}">
        ${ps}
        ${contra}
      </section>`;
}

function renderHomepage({ essays = [], postscripts = [], contras = [], archives = [] }) {
  // The lead essay (top-left, two thirds wide) is the first cover the
  // visitor sees — preloaded the way the old hero was.
  const lead = essays[0];
  const leadPreload = lead?.image
    ? `<link rel="preload" as="image" ${coverSrcAttrs(lead.image, COVER_SIZES.wide, { preload: true })} fetchpriority="high">`
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
  // Deks print in every homepage cell (showDek defaults true) — kicker,
  // title, dek and cover together, matching the section pages and the
  // open hover panel.
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
  // The mega hero opens the page on the lead essay. The OLD below-
  // hero assembly (shelves row, split rows, essay pairs, contra
  // rows, the postscript trio, the archive rows) was cleared — it
  // lives in git history at 73f10d7 — and the new composition begins
  // below with the latest row.
  blocks.push(renderMegaHero(essays[0], { label: 'Essays' }));
  // The latest postscript and contra, in the hero's dress (see
  // renderLatestRow above).
  blocks.push(renderLatestRow(postscripts[0], contras[0]));
  // The SECOND essay as a mirrored hero inside the first movement —
  // cover left, ground right — then the next postscript/contra pair
  // MIRRORED too: contra left, postscript right with its text in the
  // middle and its cover closing the row's right end. Both keep the
  // lead seat (the rail is on the right up here, so no m2).
  blocks.push(renderMegaHero(essays[1], { rev: true, label: 'Essays' }));
  blocks.push(renderLatestRow(postscripts[1], contras[1], { rev: true }));
  // THE SUBSCRIBE BAND: the header said again mid-page — the chrome
  // block full-bleed, SUBSCRIBE in the masthead voice centred where
  // the name stands above, and one courier line whose ink opens on
  // the S's own left ink (glyph-seated by alignBands in
  // duo-panel-fit.js). The statement reads as ONE LINE UNDER the
  // word, centred on the page. It CLOSES the first movement:
  // everything below it is the second.
  // THE SECTION BANNERS NAME THE SECTIONS THEY OPEN — ESSAYS, POSTSCRIPT,
  // CONTRA. (The modifiers keep their old names: the fitter's ground
  // stops and rail-fix read them.)
  blocks.push(renderBanner({ word: 'Essays', href: SECTION_BANDS.essays.href, modifier: 'subscribe-band' }));
  // THE SECOND MOVEMENT, under the band: the next essay as a
  // MIRRORED hero (cover left, ground right, labelled Essay), then
  // the next contra/postscript pair mirrored the same way.
  blocks.push(renderMegaHero(essays[2], { rev: true, label: 'Essays', m2: true }));
  // The essays run on under it, ALTERNATING — base, mirrored, base,
  // mirrored — all carrying the second movement's seat. essays[0] and
  // [1] are spent in the first movement, so this movement reads from
  // [2] and repeats nothing.
  blocks.push(renderMegaHero(essays[3], { label: 'Essays', m2: true }));
  blocks.push(renderMegaHero(essays[4], { rev: true, label: 'Essays', m2: true }));
  blocks.push(renderMegaHero(essays[5], { label: 'Essays', m2: true }));
  blocks.push(renderMegaHero(essays[6], { rev: true, label: 'Essays', m2: true }));
  // EVENTS closes the essays — the word alone, like STORE.
  blocks.push(renderBanner({ word: 'Postscript', href: SECTION_BANDS.postscript.href, modifier: 'events-band' }));
  // THE POSTSCRIPTS' MOVEMENT: three rows under EVENTS — the base
  // build, then the pair MIRRORED, then the base again. All three
  // keep the base SEAT (the strip is back on the right down here), so
  // the middle one mirrors its contents without moving its box.
  // The contras have left these rows — this movement is postscripts
  // alone, each row's two columns splitting the whole measure.
  blocks.push(renderPostscriptPair(postscripts[2], postscripts[3]));
  // The middle pair reads REVERSED — cover right, text left.
  blocks.push(renderPostscriptPair(postscripts[4], postscripts[5], { stacked: true, rev: true }));
  // And a third pair back in the base build — covers on the left.
  blocks.push(renderPostscriptPair(postscripts[6], postscripts[7], { stacked: true }));
  // STORE closes the postscripts — the word alone, no courier line.
  blocks.push(renderBanner({ word: 'Contra', href: SECTION_BANDS.contra.href, modifier: 'store-band' }));
  // THE CONTRA MOVEMENT: the section's own row formation, three
  // squares across, twice — reading from the reviews the rows above
  // haven't already spent.
  // The three reviews the postscript rows gave up come back here, so
  // the section reads the most recent six IN SEQUENCE, top to bottom —
  // contras[0] leads the first movement's row and is not repeated.
  // contras[0] and [1] lead the first movement's rows and are not
  // repeated; the section runs [2] onward, three to a row — TWO rows,
  // six reviews. (A third ran to [11] and is retired: the movement
  // closes on the second row now.)
  blocks.push(renderContraTrio(contras.slice(2, 5)));
  blocks.push(renderContraTrio(contras.slice(5, 8), { stacked: true }));
  // THE FOUR GROUNDS. Each movement stands on its own colour, and the
  // three chrome banners are the joins — a banner OPENS the movement
  // it heralds, so the ground changes on its own top edge, under the
  // charcoal, where no seam can show. The class carries --paper into
  // every block of the movement (see THE MOVEMENTS' GROUNDS in
  // style.css), so the held masks, the clones' grounds and the hover
  // plates all take the colour their own section stands on; main
  // paints the visible band as one gradient with hard stops, seated
  // off the banners themselves by rail-fix.js.
  const MOVEMENTS = ['latest', 'essays', 'postscript', 'contra'];
  let movement = 0;
  // EACH MOVEMENT IS A CONTAINER, opening on its SECTION BAND: the
  // band is sticky inside it, so it pins to the viewport's top while
  // the movement's rows scroll under it and is pushed off by the
  // container's own end — which is where the next banner arrives. The
  // banners stand OUTSIDE the containers (each closes one movement
  // and opens the next).
  let duoHtml = '';
  let open = false;
  // THE MOVEMENT'S BODY — every row, divider and the closing empty
  // band — stands in ONE opaque box over the stuck banner (see THE
  // BANNERS PLAY THE HEADER'S OPENING in style.css): the page's own
  // gutters are transparent, and a banner pinned beneath them showed
  // through every strip between two cards.
  const openMovement = (m) => { duoHtml += `\n  <div class="movement m--${m}">\n  ${renderSectionBand(m)}\n  <div class="movement-body">`; open = true; };
  // EVERY MOVEMENT CLOSES ON AN EMPTY BAND — the section band's own
  // charcoal block, 80 tall, full bleed, with nothing in it: 48 under
  // the movement's last row, flush over the banner (or 48 over the
  // reprint) that follows. The head band opens the section; this one
  // closes it.
  // (The empty foot bands are retired: a movement closes on its body,
  // and the next banner overtakes the head band directly.)
  const closeMovement = () => { if (open) { duoHtml += '\n  </div>\n  </div>'; open = false; } };
  blocks.forEach((block, i) => {
    const isBanner = /class="page-banner/.test(block);
    const last = i === blocks.length - 1;
    // A BANNER OPENS THE NEXT MOVEMENT, INSIDE IT — the first thing in
    // the container, ahead of the section band — so it can play the
    // header's own opening: the word band STICKS to the viewport's
    // top and holds for the whole movement (its sticky box is the
    // movement), the charcoal field scrolls up beneath it, and the
    // band and the rows ride up OVER it, exactly as the section band
    // and the page ride over the fixed wordmark. No wrap around it:
    // its sticky box has to be the movement, not a wrap of its own.
    if (isBanner) {
      closeMovement();
      movement += 1;
      const m = MOVEMENTS[Math.min(movement, MOVEMENTS.length - 1)];
      duoHtml += `\n  <div class="movement m--${m}">\n  ${block}\n  ${renderSectionBand(m)}\n  <div class="movement-body">`;
      open = true;
      return;
    }
    const m = MOVEMENTS[Math.min(movement, MOVEMENTS.length - 1)];
    if (!open) openMovement(m);
    duoHtml += `
  <div class="wrap m--${m}">
    ${block}
  </div>${last ? '' : `\n  <div class="row-divider m--${m}"></div>`}`;
  });
  closeMovement();
  // THE LAST MOVEMENT IS THE PAGE'S CLOSE: it opens on a banner —
  // ARCHIVE ABOUT, two links on the one line — and its band is the
  // COLOPHON (in place of a section band; never sticky), standing
  // FLUSH UNDER the word with no field between. The word sticks at
  // the top like every banner, and the colophon rides straight up
  // over it, the foot field behind it (inside the movement, raised a
  // level, so it keeps the word covered as it goes) — the header's
  // own opening, then the header in reverse: colophon, field, name.
  // THE CLOSING STACK: five banners, one under another with no field
  // between — ARCHIVE, ABOUT, STORE, EVENTS, SUBSCRIBE — each on its
  // own scheme (style.css, THE CLOSING STACK'S SCHEMES). Every one
  // sticks at the top as it arrives and the next slides up over it,
  // a deck; the colophon then rides up over the last.
  const STACK = [
    { word: 'Archive', href: 'archive.html', scheme: 'wb' },
    { word: 'About', href: 'about.html', scheme: 'bw' },
    { word: 'Store', href: `${SITE_URL}/subscribe`, scheme: 'pb' },
    { word: 'Events', href: `${SITE_URL}/subscribe`, scheme: 'bp' },
    { word: 'Subscribe', href: `${SITE_URL}/subscribe`, scheme: 'pw' },
  ];
  duoHtml += `
  <div class="movement m--colophon">
  ${STACK.map((b) => renderBanner({ word: b.word, href: b.href, modifier: `stack-band stack-band--${b.scheme}`, spacer: false })).join('\n  ')}
  ${renderColophonBand()}
  <!-- THE FOOT FIELD: the head rule's mirror — the charcoal between
       the colophon and the name, a viewport less the band and the
       name, so the page closes as it opens, in reverse. -->
  <div class="foot-field" aria-hidden="true"></div>
  </div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#121417">
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
<link rel="preload" href="fonts/ops-placard-bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://use.typekit.net/fnn8swo.css">
<link rel="stylesheet" href="style.css?v=${BUILD_STAMP}">
${renderFontGateScript()}
${renderImgFadeScript()}
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

${renderHeader()}

<!-- THE HEAD RULE: a full-measure divider under the masthead — 48
     from the name's ink to the line, 48 from the line to the hero
     courier's cap ink (the hero's own margin pays that side). -->
<div class="head-rule" aria-hidden="true"></div>

<!-- THE DEK BAND: a 48 white ribbon between the header and the
     middle — the section topics in the dek's own voice, evenly
     spread across the full measure. -->
<!-- (The masthead line is carried by the SECTION BAND now — the
     wordmark stands alone above it. The box stays, empty, because the
     fitters and the chrome's fold machinery still measure it.) -->
<nav class="dek-band dek-band--masthead" aria-label="Masthead line"></nav>

<main id="main">

  <div class="page-rows" id="top">
${duoHtml}
  </div>

  <!-- THE MOVEMENTS' RAILS: the header's own ends at SUBSCRIBE;
       ESSAYS takes the LEFT from there to EVENTS, and POSTSCRIPT the
       RIGHT from EVENTS to the reprint. Each rides, pins at the 48
       line and is pushed off by its track's end. -->
  <!-- (The movements' rails are retired: each movement carries its
       section band at its head instead — see renderSectionBand.) -->

  <!-- THE REPRINT: the masthead again at full width, closing the
       front page — the wordmark's mirror: STUCK to the viewport's
       bottom under the page (style.css, THE PAGE LIFTS OFF THE
       REPRINT), so the field and the rows lift away and reveal it. -->
  <section class="reprint">
    <div class="reprint-rule" aria-hidden="true"></div>
    <a class="reprint-name" href="./" aria-label="The New Critic — home">The <span class="tn-new">New</span> Critic</a>
  </section>

  <!-- (The colophon stands in the last section's foot band now —
       renderColophonBand.) -->

</main>

${renderFooter()}

${renderCaterpillarScript()}
${renderFoilPourScript()}
${renderDuoPanelFitScript()}
${renderCardOpenScript()}
${renderChromeOpenScript()}
${renderCoverColorScript()}
${renderCopyLinkScript()}
${renderLineDrawScript()}
${renderRailFixScript()}
</body>
</html>`;
}

// THE FONT GATE. The page's seats are measured off rendered type, and
// the type arrives late: first paint set the fallbacks, the fitters
// measured THOSE, and when Placard and the Typekit garamond landed the
// fonts.ready refit visibly re-seated every courier line — the
// load-time shuffle. Two moves kill it. The faces are LOADED here, by
// name, from the head — fonts otherwise fetch lazily on first use, so
// by end of body they were still in flight — which puts them in place
// before the parser-blocking fitters measure. And until they land the
// body holds at opacity 0 (opacity, not visibility: layout and every
// fitter guard behave identically, the frame is simply not shown), so
// whatever motion remains happens off stage. The race caps the hold at
// 800ms — a slow or dead font host degrades to the old behaviour, a
// fallback paint and one refit, rather than a blank page.
function renderFontGateScript() {
  return `<style>html.fonts-loading body{opacity:0}</style>
<script>
(function () {
  var root = document.documentElement;
  root.classList.add('fonts-loading');
  var done = function () { root.classList.remove('fonts-loading'); };
  var f = document.fonts;
  if (!f || !f.load) { done(); return; }
  Promise.race([
    Promise.all([
      f.load('700 100px "OPS Placard"'),
      f.load('400 100px garamond-premier-pro'),
      f.load('italic 400 100px garamond-premier-pro'),
      f.load('400 100px trajan-pro-3'),
      f.load('700 100px trajan-pro-3')
    ]),
    new Promise(function (r) { setTimeout(r, 800); })
  ]).then(done, done);
})();
</script>`;
}

// The held head — the mini-rail and the hero's courier line hold at 48
// on scroll while the hero slides under the divider (src/rail-fix.js).
function renderRailFixScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/rail-fix.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// A post card opens on its COVER and closes only when the pointer leaves
// the card entirely (src/card-open.js) — a state :has() cannot express,
// having no memory of how it began.
function renderCardOpenScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/card-open.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// THE OPENING: every chrome block stands a viewport tall when the site
// opens and folds to its settled height on the first scroll, one-way
// (src/chrome-open.js).
function renderChromeOpenScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/chrome-open.js'), 'utf8');
  return `<script>
${js}
</script>`;
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

// Paints each open hover card with its cover's primary colour (src/
// cover-color.js). Ships wherever the duo panels do.
function renderCoverColorScript() {
  // RETIRED with the coloured grounds — the panels sit on the page's
  // dark paper now; src/cover-color.js stays for a revival.
  return '';

  const js = fs.readFileSync(path.join(__dirname, 'src/cover-color.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// The page-ruling line draw — the ledger effect on the page's gray
// dividers — ships with the homepage, the essays/postscript/contra pages
// (renderListPage), and the give/about column pages (their flanking
// rules and section rules join it); archive has the ledger itself. See
// src/line-draw.js.
// Ships wherever the hover-panel cells do (homepage + the essays/
// postscript/contra list pages) — it serves their corner copy-link
// buttons, so it rides alongside renderDuoPanelFitScript.
function renderCopyLinkScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/copy-link.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

function renderLineDrawScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/line-draw.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// The about page's section toggle — see renderAboutPage / src/about-panel.js.
function renderAboutPanelScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/about-panel.js'), 'utf8');
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

// THE POUR: reseeds the masthead's foil plate per visit (src/
// foil-pour.js sets --foil-uri; the stylesheet's baked crumple is the
// no-JS fallback). Ships with every page that carries the masthead —
// all of them.
function renderFoilPourScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/foil-pour.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// Head-inlined, unlike the body scripts above: it must arm the .imgfade
// gate and its capture-phase load listener before the first <img> is
// parsed, or early covers could paint-then-hide (a flash) or load before
// anyone's listening (stuck invisible). See src/img-fade.js.
function renderImgFadeScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/img-fade.js'), 'utf8');
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
<meta name="theme-color" content="#121417">
<title>${escapeHtml(title)} — ${escapeHtml(SITE_NAME)}</title>${description ? `
<meta name="description" content="${escapeHtml(description)}">` : ''}
${ogTags({ title: `${title} — ${SITE_NAME}`, description, pagePath: `/${currentKey}.html`, image: ogImage })}
<link rel="icon" href="favicon.png">
<link rel="preload" href="fonts/ops-placard-bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://use.typekit.net/fnn8swo.css">
<link rel="stylesheet" href="style.css?v=${BUILD_STAMP}">
${renderFontGateScript()}
${renderImgFadeScript()}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>

<a class="skip-link" href="#main">Skip to content</a>

${renderHeader(currentKey)}

<main id="main">
${bodyHtml}
</main>

${renderFooter()}

${renderCaterpillarScript()}
${renderFoilPourScript()}${extraScripts ? `\n${extraScripts}` : ''}
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

// The Contra! manifesto AS EDITED for the page (hand-tuned copy handed
// over 2026-07 — tenses tightened, one paragraph dropped), not the live
// post at /p/contra, which is why it is baked here rather than fetched.
// Only the opening line prints now — the head's excerpt (see
// renderListPage) — but the whole text stays: it's the canonical page
// copy, and the head may want more of it back.
const CONTRA_LEAD_PARAS = [
  'The critic has two roles: to worship excellence and to wage war on its behalf.',
  'Critics are the torchbearers of taste. For every generation of renegades and dilettantes, a new class of sentries must rise up to defend the gates of excellence.',
  'Now a young fleet of artists takes to the fore. They are our comrades and rivals, our ex-lovers and sworn enemies. Who will challenge them? Who will reward their victories and punish their crimes?',
  'The duty falls on us, the New Critics, to wield the sword of Sontag and Trilling, of Mencken and Kael.',
  'In Contra, our critics impress the nutrients of a healthy culture — the requisite cruelty, suspicion, spite, and congratulation — upon the significant works of generation z.',
  'We, the editors, match our critics and subjects like psychic partners: in exposing something about the other, they reveal something, too, about themselves. The two meet in the arena of our reviews like sumo wrestlers, thwacking their bellyrolls together in eternal, aesthetic combat.',
  'New Critics, excess eats the page away; dispassion begets the languor of indifference. Do not interpret, nor reference, the work to death. Do not fear the almighty I — its lifeforce is the soul of everything. Do not cower below the blanket of your reputation.',
  'At last, rush to the theater! It will not write about itself.',
];

// The essays page's masthead: a ticker tape of the section's essays,
// crawling on its own at a slow constant pace (src/essay-ticker.js deals
// the berths into a random order each visit, clones the strip for a
// seamless wrap, and sets the pace; CSS drives the motion). Each berth
// carries the topic over a 10:8 cover as the cards' resting corner chip,
// with full-height vertical rules between berths and the whole tape
// running edge to edge at ~a third of the viewport. Hovering a cover
// opens a hover card over it — the same .duo-panel the row cells use, so
// it inherits their header strip, footer band, rules and padding
// wholesale (see .essay-ticker / .ticker-item .duo-panel in style.css).
// The berth's panel holds nothing but the title, which duo-panel-fit.js
// fills to the box on one or two lines exactly as it does the cards'.
function renderEssayTicker(posts, { lanes = 2 } = {}) {
  const items = posts.filter((p) => p.image);
  if (!items.length) return '';
  // loading:eager, not lazy. The strip is one 26,500px-wide clipped box,
  // so every berth past the first screen sits outside the viewport and a
  // lazy cover only STARTS loading as the crawl carries it in — each
  // berth then entered dark and resolved through .card-image's 0.45s
  // fade in full view. Eager at low fetchpriority loads them all up
  // front (the 480w variant at a 200px slot, ~25KB each) without
  // competing with the page's own critical images.
  //
  // The berth is a DIV, not the anchor it used to be: the panel carries
  // its own links (title, topic, likes) and an anchor can't nest.
  const itemHtml = (p) => {
    const kicker = p.kicker || 'Essay';
    const bandKicker = `<a class="hero-kicker pc pc-left" href="${escapeHtml(archiveHref(p, 'kicker'))}">${escapeHtml(kicker)}</a>`;
    const likesLine = metaLine(p, { include: ['likes'] });
    const likesBox = likesLine
      ? `<p class="card-meta card-meta--stats pc pc-right">${likesLine}</p>`
      : '';
    return `<div class="ticker-item">
          <span class="ticker-cover-frame">
            <a class="ticker-cover-link" href="${escapeHtml(p.link)}" rel="noopener" aria-label="${escapeHtml(bylineName(p) ? `${p.title} by ${bylineName(p)}` : p.title)}"><img class="card-image ticker-cover" ${coverSrcAttrs(p.image, '200px')} alt=""${focalStyle(p)} loading="eager" fetchpriority="low" decoding="async"></a>
            <span class="ticker-kicker" aria-hidden="true">${escapeHtml(kicker)}</span>
            <div class="duo-panel">
              <p class="card-meta card-meta--line">${metaLine(p, { include: ['author'], caps: false, archiveLinks: true })}${metaLine(p, { include: ['date'], caps: false, archiveLinks: true })}</p>
              <div class="card-byline-divider"></div>
              <div class="duo-panel-top">
                <h3 class="card-title"><a href="${escapeHtml(p.link)}" rel="noopener">${escapeHtml(p.title)}</a></h3>
              </div>
              <div class="panel-band panel-band--bottom">
                ${bandKicker}
                ${likesBox}
              </div>
            </div>
          </span>
        </div><div class="ticker-divider" role="separator"></div>`;
  };
  // The pool dealt into `lanes` contiguous runs, as evenly as they
  // divide. This split is only what ships in the HTML: essay-ticker.js
  // repartitions a freshly shuffled pool across the tapes on every load.
  // It still has to be repeat-free on its own, because without JS this
  // static deal IS the page — and a post on two tapes at once would be
  // the one thing the stacked-tape reading is meant to avoid.
  const per = Math.ceil(items.length / lanes);
  const runs = [];
  for (let i = 0; i < items.length; i += per) runs.push(items.slice(i, i + per));
  return runs
    .map(
      (run, i) => `  <section class="essay-ticker" aria-label="Essays, shuffled — tape ${i + 1} of ${runs.length}">
    <div class="ticker-track">
      <div class="ticker-group">
        ${run.map(itemHtml).join('\n        ')}
      </div>
    </div>
  </section>`
    )
    .join('\n  <div class="row-divider"></div>\n') + '\n';
}

// The essays page IS the tape now — TWO of them stacked, sized so the
// pair fills the viewport exactly (see --tape-h in style.css), each
// scrolled by the reader in either direction, together carrying every
// essay exactly once (no card rows below: each berth's hover card
// already prints the title, byline, date, topic and likes the rows used
// to). Three tapes at a third of the screen each was the earlier cut;
// two at half give the berths — and their covers — half again the size.
// src/essay-ticker.js reshuffles the whole pool across the tapes on every
// load and staggers where each one rests.
// The essays page: the postscript page's reading room. Same row of two
// in the same order — the cover leading at the left, the index beside
// it — same classes, same index script. The cover fills the screen and
// sticks while the list runs past; only its WIDTH differs, taking the
// homepage extra-wide cell's two-thirds and leaving the list the narrow
// third (the row wears .card--split for it; see .essay-hero in
// style.css). An entry reads date / topic / writer, where a
// postscript's reads number / name / topic — an essay is known by its
// subject, a postscript by whose interview it is.
// (This page was three scrolling tapes of covers — renderEssayTicker,
// still here and now unused by any page.)
function renderEssaysPage({ currentKey, label, posts }) {
  const chrono = posts.slice();
  const newestIdx = 0;
  // No masthead over this column — no name, no gloss. The rail already
  // says which section you're in (Essays holds the Klein there), the
  // list under it is unmistakably a list of essays, and the column
  // opens straight onto the newest one. (Postscript keeps its name and
  // gloss: see renderPostscriptPage.)
  // restChipArt, as on the postscript page and for the same reason: the
  // list beside the cover already prints the topic, the writer and the
  // date, so the billing chip would only repeat it — the cover credit
  // is the one thing the column doesn't say.
  // duo-half--wide: the cell is the homepage's extra-wide essay, panel
  // and all — title alone in the left column, centred in its height,
  // with the dek opening the right column over the excerpt. It already
  // has that cell's exact dimensions (see .essay-hero in style.css);
  // this gives it the arrangement that goes with them.
  // sectionBtn TRUE is the same "homepage cell" signal renderListPage
  // passes for the contra squares (renderDuoHalf reads it as
  // `homepage`), and it settles the strip and the band the same way:
  // author and date alone in the byline, topic bottom-left, share and
  // likes bottom-right. False gave this page its own cut — the topic
  // repeated as a chip in the byline, the share up beside it, and the
  // cover credit closing the band.
  const cellHtml = (p, i) => `<div class="ps-hero-cell" data-idx="${i}"${i === newestIdx ? '' : ' hidden'}>${renderDuoHalf(p, { tag: 'From the Essay', btnLabel: label, btnHref: 'essays.html', sectionBtn: true, restChipArt: true }, 'duo-half--wide')}</div>`;
  // Date, then topic, then writer. Each span keeps the class that names
  // what it holds — -name is the person, -dek the date — so only the
  // order moves here; which line is italic and which takes the Klein is
  // set in style.css (.ps-index--essays).
  const entryHtml = (p, i) => `<button type="button" class="ps-index-link${i === newestIdx ? ' is-active' : ''}" data-idx="${i}">`
    + `${metaDateText(p) ? `<span class="ps-index-dek">${escapeHtml(metaDateText(p))}</span>` : ''}`
    + `${p.kicker ? `<span class="ps-index-no">${escapeHtml(p.kicker)}</span>` : ''}`
    + `<span class="ps-index-name">${escapeHtml(bylineName(p))}</span>`
    + `</button>`;
  const bodyHtml = `
  <div class="page-rows">
  <div class="wrap">
    <article class="card card--duo card--split ps-hero essay-hero">
      <div class="ps-hero-card">
        ${chrono.map(cellHtml).join('\n        ')}
      </div>
      ${DUO_DIVIDER}
      <div class="ps-hero-names">
        <nav class="ps-index ps-index--essays" aria-label="Every ${escapeHtml(label.toLowerCase())} entry, newest first">
          ${chrono.map(entryHtml).join('\n          ')}
        </nav>
      </div>
    </article>
  </div>
  </div>`;
  return renderPageShell({
    currentKey,
    title: label,
    bodyHtml,
    ogImage: posts.find((p) => p.image)?.image,
    extraScripts: renderDuoPanelFitScript() + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript()
      + renderPostscriptIndexScript(),
  });
}

function renderListPage({ currentKey, label, posts, leadParas }) {
  const cfg = LIST_ROWS[currentKey];
  const rows = [];
  for (let i = 0; i < posts.length; i += cfg.perRow) {
    // sectionBtn TRUE: the flag is really the "homepage cell" signal
    // (renderDuoHalf reads it as `homepage`), and the contra page's
    // squares are the homepage's squares exactly — author and date in
    // the byline strip and nothing else, topic bottom-left, share and
    // likes bottom-right. False gave this page its own cut: the topic
    // repeated as a chip in the byline, the share moved up beside it,
    // and the cover credit closed the band.
    rows.push(renderDuoCard(posts.slice(i, i + cfg.perRow), { ...cfg, padTo: cfg.perRow, sectionBtn: true }));
  }
  // The contra page's head (was a lead card over a sticky filter bar):
  // ONE header section cut like the postscript page's name column — all
  // typewriter, all centred, everything reading down a middle axis.
  // The section speaks first, in a block centred over the shelf: the
  // manifesto's opening line as an epigraph over the section's name and
  // its gloss — and the name itself is the way back, clearing whatever
  // filter is on. (The gloss sheds the hard break SITE_LINKS writes
  // into it: that break is cut for the sidebar's measure, and in a
  // column this narrow it only wastes a line.) Under it, the shelf: the
  // five categories in fixed order — Art holds its place before it has
  // any entries — each heading a filter button with its reviews listed
  // under it as the WORKS alone, italic (see contraWorkTitle): under
  // "Books", a list of books. (They carried the covers' full chip
  // billing, "<Reviewer> / contra <Work>", which repeated the
  // reviewer's name down every column and said "contra" five times a
  // shelf.) data-idx ties an entry to its cell in the grid below (cells
  // sit in posts order), and src/contra-filter.js deals the grid to
  // whichever heading or entry is pressed.
  const KICKER_ORDER = CONTRA_CATEGORIES;
  const colHtml = (k) => {
    const entries = posts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => (p.kicker || '').toLowerCase() === k.toLowerCase());
    const listHtml = entries.length
      ? `\n        <nav class="contra-head-list" aria-label="${escapeHtml(k)} reviews">
          ${entries.map(({ p, i }) => `<button type="button" class="contra-entry-link" data-idx="${i}" aria-pressed="false"><span class="contra-entry-work"><em>${escapeHtml(contraWorkTitle(p))}</em></span></button>`).join('\n          ')}
        </nav>`
      : '';
    return `<div class="contra-head-col">
        <button type="button" class="contra-filter-link" data-kicker="${escapeHtml(k.toLowerCase())}" aria-pressed="false">${escapeHtml(k)}</button>${listHtml}
      </div>`;
  };
  // The manifesto's opening line, in quotes and set as ONE line — it
  // stands above the section's name now, an epigraph the page opens on
  // rather than a paragraph hanging off the gloss, and an epigraph
  // wants to be read in a single breath. (It was broken by hand after
  // the colon and again after "excellence", back when it sat under the
  // gloss and ran three lines deep.) The block is cut wide enough to
  // hold it unbroken — see .contra-head-col--lead in style.css.
  const manifestoQuote = emHtml((leadParas && leadParas[0]) || '');
  // The quote IS the link to the manifesto — not out to Substack, but
  // down into the grid, dealing it to the manifesto's own card the way
  // any other entry in the head does. (It sat under a separate "The
  // Contra Manifesto" line pointing off-site; the card it deals to now
  // carries that title as its chip, see composedChipHtml.) The
  // manifesto's kicker isn't one of the five categories, so no shelf
  // column lists it — this is the only way to it.
  const manifestoIdx = posts.findIndex((p) => slugOf(p.link) === 'contra');
  const headHtml = leadParas && leadParas.length
    ? `  <div class="wrap">
    <header class="card contra-head">
      <div class="contra-head-col contra-head-col--lead">
        ${manifestoIdx >= 0
          ? `<button type="button" class="contra-entry-link contra-head-excerpt" data-idx="${manifestoIdx}" aria-pressed="false">“${manifestoQuote}”</button>`
          : `<p class="contra-head-excerpt">“${manifestoQuote}”</p>`}
        <h2 class="card-title"><button type="button" class="contra-clear-link">${escapeHtml(label)}</button></h2>
        <p class="card-dek">${dekHtml((SITE_LINKS.find((l) => l.key === currentKey) || { dek: '' }).dek || '')}</p>
      </div>
      <div class="contra-head-shelf">
        ${KICKER_ORDER.map(colHtml).join('\n        ')}
      </div>
    </header>
  </div>
  <div class="row-divider"></div>
`
    : '';
  // Same structure as the homepage blocks: one .wrap per row with a
  // full-bleed .row-divider between rows, so every line between cover
  // images runs edge to edge. .page-rows is now the outer sleeve carrying
  // the page's top/bottom insets.
  const bodyHtml = `
  <div class="page-rows">
${headHtml}${rows
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
    extraScripts: renderDuoPanelFitScript() + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript()
      + (headHtml ? renderContraFilterScript() : ''),
  });
}

function renderContraFilterScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/contra-filter.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

function renderEssayTickerScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/essay-ticker.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

function renderPostscriptIndexScript() {
  const js = fs.readFileSync(path.join(__dirname, 'src/postscript-index.js'), 'utf8');
  return `<script>
${js}
</script>`;
}

// The postscript page: not a grid but a reading room — one row of two.
// Right, a column built like the nav rail: the section's name centred in
// the rail's own typewriter face at the deks' size, its gloss under it,
// then every interviewee's name in reverse-chronological order (today at
// the top, reading back), centred and set on the rail's 1.5 leading.
// Each entry runs three lines: its number, the name, then the piece's
// topic as an all-caps dek. The numbers count UP from the first
// postscript ever published — the list prints newest first, so they run
// backwards down the page and the highest is at the top. They're issue
// numbers, not positions in the scroll: an interview keeps the number it
// was given as later ones publish above it.
// src/postscript-index.js drives the selection.
// The cover LEADS, at the left: the selected postscript as an ordinary
// hover cell — cover standing, card opening over it on hover — and it
// sticks to the top of the screen while the names run past it. (It was
// two columns on the right — a cover beside a card pinned permanently
// open — which printed the same picture's frame twice and left the card
// no rest state at all.)
// Every cell is prerendered and hidden; selection is a display toggle
// plus a refit, no fetches.
function renderPostscriptPage({ currentKey, label, posts }) {
  const chrono = posts.slice();
  const newestIdx = 0;
  const dek = (SITE_LINKS.find((l) => l.key === currentKey) || { dek: '' }).dek || '';
  const nameOf = (p) => p.psName || p.title;
  // ONE cell now, not a cover column beside a standing-open card: the
  // duo half already carries its own cover, and letting it behave like
  // every other duo half — panel shut, opening on hover — merges the two
  // columns into the thing they were always two halves of. The credit
  // goes back to the band with it (showArtInBand defaults true), where
  // every other section page bills it; the cover chip it used to ride
  // went with the column.
  const cellHtml = (p, i) => `<div class="ps-hero-cell" data-idx="${i}"${i === newestIdx ? '' : ' hidden'}>${renderDuoHalf(p, { tag: 'From the Interview', btnLabel: label, btnHref: 'postscript.html', sectionBtn: false, restChipArt: true })}</div>`;
  const bodyHtml = `
  <div class="page-rows">
  <div class="wrap">
    <article class="card card--duo ps-hero">
      <div class="ps-hero-card">
        ${chrono.map(cellHtml).join('\n        ')}
      </div>
      ${DUO_DIVIDER}
      <div class="ps-hero-names">
        <h2 class="card-title">${escapeHtml(label)}</h2>
        <p class="card-dek">${dekHtml(dek)}</p>
        <nav class="ps-index" aria-label="Every ${escapeHtml(label)} subject, newest first">
          ${chrono.map((p, i) => `<button type="button" class="ps-index-link${i === newestIdx ? ' is-active' : ''}" data-idx="${i}"><span class="ps-index-no">No. ${chrono.length - i}</span><span class="ps-index-name">${escapeHtml(nameOf(p))}</span>${p.kicker ? `<span class="ps-index-dek">${escapeHtml(p.kicker)}</span>` : ''}</button>`).join('\n          ')}
        </nav>
      </div>
    </article>
  </div>
  </div>`;
  return renderPageShell({
    currentKey,
    title: label,
    bodyHtml,
    ogImage: posts.find((p) => p.image)?.image,
    extraScripts: renderDuoPanelFitScript() + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript()
      + renderPostscriptIndexScript(),
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

// The About page: a head cut like the contra page's (same classes, same
// centred typewriter — see .about-head in style.css), the sections
// slotted down ONE centred column — About the Magazine / Subscriptions
// / Give to The New Critic / Masthead / Letter from the Editors /
// Contact — each a button that opens its section's text below the
// head's full-bleed divider, in a centred column one contra card wide
// and tall enough to hold the footer below the fold, all of it in the
// head's own centred sentence-case courier except the letter's serif
// paragraphs (see .about-panel in style.css). One section at a time,
// About open on load (in the markup, so a no-JS reader still gets the
// page's one indispensable paragraph); src/about-panel.js deals the
// rest. (It was a two-column card grid in the hover cards' skin — the
// .mission-* card/band/column rules went with it; the masthead
// medallions and the subscribe list keep their mission-* names.)
function renderAboutPage(founders = [], manifestoHtml = '') {
  // The masthead panel: a centred list, one heading per role with its
  // people under it, each name a link to that editor's Substack. The
  // roles keep the order they are written in above — a masthead ranks,
  // it doesn't alphabetize — and the names inside each role run
  // alphabetically BY SURNAME (Augsberger, Kluger, Knuppel). A role with
  // more than one person is pluralized; Art Director, held by one, is
  // not. The Founder is left out, as she was from the medallion grid
  // this replaces.
  //
  // Each name carries its own portrait, revealed on hover to one side of
  // the name (see .mh-pfp in style.css) — sides alternating down the
  // whole list, first name's to the left, so the column doesn't lean.
  // Founders' headshots come from give.html's signer blocks (written out
  // in main), the rest from assets/people/ (ADDITIONAL_PEOPLE_PHOTOS).
  const founderLookup = new Map(founders.map((f) => [f.name, f]));
  const surnameOf = (name) => name.trim().split(/\s+/).pop().toLowerCase();
  const mastheadPeople = ABOUT_PEOPLE
    .filter((p) => p.role !== 'Founder')
    .map((p) => {
      const extra = ADDITIONAL_PEOPLE_PHOTOS[p.name];
      const founder = founderLookup.get(p.name);
      const photo = founder?.photo || (extra?.src ? copyPersonPhoto(extra.src) : undefined);
      const href = founder?.href || extra?.href;
      return { ...p, photo, href };
    });
  const roleOrder = [];
  const byRole = new Map();
  for (const p of mastheadPeople) {
    if (!byRole.has(p.role)) { byRole.set(p.role, []); roleOrder.push(p.role); }
    byRole.get(p.role).push(p);
  }
  let sideIdx = 0;
  const mastheadHtml = roleOrder
    .map((role) => {
      const people = byRole.get(role).slice().sort((a, b) => surnameOf(a.name).localeCompare(surnameOf(b.name)));
      const heading = people.length > 1 ? `${role}s` : role;
      const names = people
        .map((p) => {
          const side = sideIdx++ % 2 === 0 ? 'left' : 'right';
          const tag = p.href ? 'a' : 'span';
          const hrefAttr = p.href ? ` href="${escapeHtml(p.href)}" rel="noopener" target="_blank"` : '';
          const pfp = p.photo
            ? `<img class="mh-pfp" src="${escapeHtml(p.photo)}" alt="" aria-hidden="true" loading="lazy">`
            : '';
          return `<${tag} class="mh-name mh-name--${side}"${hrefAttr}>${escapeHtml(p.name)}${pfp}</${tag}>`;
        })
        .join('\n            ');
      return `<div class="mh-group">
            <p class="mh-role">${escapeHtml(heading)}</p>
            ${names}
          </div>`;
    })
    .join('\n          ');

  // Each section: its label in the head's column and its panel's inner
  // HTML — paragraphs stacked single-file down the narrow reveal column,
  // no rules between them (the head's own divider is the page's last
  // line). Nothing in here is a button any more: Subscribe is a line of
  // the same courier under its list, and Give's two destinations are
  // two links inside one sentence — the paragraph above them already
  // draws the distinction (Fractured Atlas for a tax-deductible gift,
  // Stripe for an instant one), so the line itself needs only to name
  // them.
  const sections = [
    {
      key: 'about',
      label: 'About',
      // One sentence, no dek over it: the dek read "The Young American
      // Magazine" and the body opened "The New Critic publishes …" —
      // with the rule between them gone and both lines in the same
      // courier, the pair was one sentence said twice. It says it once.
      html: `<p class="card-preview">The New Critic is the young American magazine. We publish essays, interviews, and criticism by and for generation z.</p>`,
    },
    {
      key: 'subscribe',
      label: 'Subscriptions',
      html: `<p class="card-dek">Sign up for our free newsletter<br>or become a paying member.</p>
      <p class="card-preview">Hundreds of New Critic readers are paid subscribers. For $30 a year, paid subscribers get access to:</p>
      <ol class="mission-list">
        <li>Postscript, our interview series</li>
        <li>Contra, our criticism section</li>
        <li>Exclusive New Critic parties</li>
      </ol>
      <div class="about-actions"><a class="about-action" href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a></div>`,
    },
    {
      key: 'give',
      label: 'Give',
      // The panel opens and closes narrow and swells in the middle: an
      // italic opening at the reveal column's own width, then the two
      // working paragraphs side by side across a measure far wider than
      // the column, the Give line back at the column, and the caveat
      // spilling again to half the wide measure. Every block is centred
      // on the same axis, so the measure widens and narrows around one
      // spine (see .about-give-* in style.css).
      html: `<p class="card-dek">The New Critic finds and supports the extraordinary writers of our generation. Competitive pay and creative license make professional writing possible. When you give to The New Critic, you fund the future of letters.</p>
      <div class="about-give-cols">
        <p class="card-preview">Give a different amount than our subscription rate. Any gift, small or large, supports our work. Donations over $300 receive a lifetime subscription.</p>
        <p class="card-preview">We work with fiscal sponsor Fractured Atlas to allow our patrons to make tax-deductible donations, or you can give any amount instantly through Stripe.</p>
      </div>
      <p class="card-preview about-give-line">Give through <a href="${GIVE_LINKS.fracturedAtlas}" rel="noopener" target="_blank">Fractured Atlas</a> or <a href="${GIVE_LINKS.stripe}" rel="noopener" target="_blank">Stripe</a>.</p>
      <p class="card-preview about-give-caveat">If you are interested in writing a check, donating more than $5,000, or have other questions, email <a href="mailto:editors@thenewcritic.com">editors@thenewcritic.com</a>.</p>`,
    },
    {
      key: 'masthead',
      label: 'Masthead',
      html: `<div class="mh-list">
          ${mastheadHtml}
        </div>`,
    },
    {
      key: 'letter',
      label: 'Letter',
      // The letter's own title, who signs it in italic under that, then
      // a blank line and the date — a dateline, roman, so it reads as
      // the piece's stamp rather than as more of the subtitle.
      html: `<p class="card-dek">A Letter to Our Readers<br><em>from the founding editors</em><br><br>June 26</p>
      ${GIVE_LETTER.map((p) => `<p class="card-preview">${escapeHtml(p)}</p>`).join('\n      ')}`,
    },
    {
      key: 'manifesto',
      label: 'Manifesto',
      // The Secession post — see renderManifestoHtml for what it prints
      // and what it cuts. The dek carries the post's own title and
      // subtitle, and the piece's lede photograph stands under it.
      html: `<p class="card-dek">The New Critic Secession<br><em>A Manifesto of 42 theses</em><br><br>March 24</p>
      ${manifestoHtml || `<p class="card-preview">The manifesto is <a href="${MANIFESTO_URL}" rel="noopener" target="_blank">published here</a>.</p>`}`,
    },
    {
      key: 'contact',
      label: 'Contact',
      // Hard break before "email": the address stays with the verb that
      // governs it, and the line above closes on the clause. Under it,
      // 48 down, the two places to follow the magazine — the same two
      // the footer and the rail carry, named in a sentence here rather
      // than as a list of marks.
      html: `<p class="card-preview">To pitch, submit, or place an inquiry,<br>email <a href="mailto:editors@thenewcritic.com">editors@thenewcritic.com</a>.</p>
      <p class="card-preview about-follow">Subscribe on <a href="https://substack.com/@thenewcritic" rel="noopener" target="_blank">Substack</a><br>Follow us on <a href="https://www.instagram.com/the_newcritic/" rel="noopener" target="_blank">Instagram</a></p>`,
    },
  ];

  const OPEN_KEY = 'about';
  // The head reads down one column — About, Subscriptions, Give,
  // Masthead, Contact — then a 48 of air, then Letter and Manifesto on
  // lines of their own, each named in one word like the sections above. Both are whole documents rather
  // than sections of this page, so the gap sets them apart from the
  // queue above rather than a rule doing it. Seven lines and one gap,
  // which is what the panel's min-height is measured against (see
  // .about-panel in style.css).
  const COLUMN_KEYS = ['about', 'subscribe', 'give', 'masthead', 'contact'];
  const PARTED_KEYS = ['letter', 'manifesto'];
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const headBtn = (s, cls = '') =>
    `<button type="button" class="contra-filter-link about-link${cls}${s.key === OPEN_KEY ? ' is-active' : ''}" data-key="${s.key}" aria-expanded="${s.key === OPEN_KEY ? 'true' : 'false'}">${escapeHtml(s.label)}</button>`;
  const bodyHtml = `  <div class="page-rows">
  <div class="wrap">
    <header class="card contra-head about-head">
      <nav class="about-head-list" aria-label="About sections">
        ${COLUMN_KEYS.map((k) => headBtn(byKey.get(k))).join('\n        ')}
        ${PARTED_KEYS.map((k, i) => headBtn(byKey.get(k), i === 0 ? ' about-link--parted' : '')).join('\n        ')}
      </nav>
    </header>
  </div>
  <div class="row-divider"></div>
  <div class="wrap">
    ${sections
      .map(
        (s) => `<section class="about-panel" data-key="${s.key}" aria-label="${escapeHtml(s.label)}"${s.key === OPEN_KEY ? '' : ' hidden'}>
      ${s.html}
    </section>`
      )
      .join('\n    ')}
  </div>
  </div>`;
  return renderPageShell({
    currentKey: 'about',
    title: 'About',
    description: 'The New Critic is the young American magazine. Essays, interviews, and criticism by and for generation z.',
    bodyHtml,
    bodyClass: 'about-body',
    extraScripts: renderLineDrawScript() + renderAboutPanelScript(),
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
    ? `<div class="card-preview-block"><div class="card-preview-cols">${previewParas
        .map((p) => `<p class="card-preview">${emHtml(p)}</p>`)
        .join('')}</div></div>`
    : '';
  const dekHtml = post.subtitle
    ? `<p class="card-dek">${post.sectionLabel === 'Contra' ? contraWorkDek(post.subtitle) : escapeHtml(post.subtitle)}</p>`
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
  // Sentence case, and bare — the arrow came off with the caps. "Read
  // on" reads as the invitation it is; set loud it was shouting the one
  // thing on the card that didn't need to.
  const readNowHtml = `<a class="card-preview-cta arch-ledger-readon pc pc-right" href="${escapeHtml(post.link)}" rel="noopener">Read on</a>`;
  // The fold-out's band: share leads from the LEFT (the row above
  // already names the topic, so no kicker repeats it here) and Read on
  // closes it on the right — the fold-out has no linked title, and the
  // row toggles rather than navigates. The art credit rides the cover as
  // a chip (see arch-art-chip below), not the band. No likes count: a
  // heart is a thing to press, and pressing it means leaving for
  // Substack — the two doors out of this band were one too many, and
  // Read on is the one that means it.
  const ledgerCopyBox = copyLinkBtnHtml(post, 'card-copylink pc pc-left');
  const ledgerArtChip = post.coverArtist
    ? `<p class="arch-art-chip" aria-hidden="false">Art by ${escapeHtml(post.coverArtist)}</p>`
    : '';
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
    ` data-section="${escapeHtml((post.sectionLabel || '').toLowerCase())}"` +
    // The deep-link target: cards' author/kicker/date links arrive as
    // #sort=<key>&post=<slug> and ledger.js opens the matching item.
    ` data-slug="${escapeHtml(slugOf(post.link))}"`;
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
        ${post.image ? `<img ${coverSrcAttrs(post.image, COVER_SIZES.cell)} alt="" loading="lazy" decoding="async"${focalStyle(post)}>` : '<span class="card-image--blank"></span>'}
      </a>${ledgerArtChip}</span>
      <div class="arch-ledger-card-text">
        ${dekHtml}
        ${dekHtml && previewBlock ? '<div class="arch-ledger-card-divider"></div>' : ''}
        ${previewBlock}
        <div class="panel-band panel-band--bottom">
          ${ledgerCopyBox}${readNowHtml}
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

// ---------- THE MANIFESTO ----------
// The About page's Manifesto section is the Secession post, whole: "The
// New Critic Secession — A Manifesto of 42 Theses". It is fetched at
// build time like every other post body and reprinted here rather than
// retyped, so the page can never drift from what was published.
//
// The piece is not written in paragraphs. Substack's preformatted-text
// block is the whole instrument: twelve <pre class="text"> blocks whose
// leading spaces build a staircase down the page ("| No. 19 |" runs nine
// steps deep), italics on every THE NEW CRITIC, links in the dateline,
// and eight photographs cut between the blocks. So this does not go
// through extractParagraphs — that strips <pre> as non-prose and would
// return the piece as nothing. It walks the body's blocks in order and
// keeps what prints:
//   - <pre class="text">      → the theses, spacing intact
//   - <figure>                → the photographs, with their captions
//   - <p class="button-wrapper"> → dropped: Substack's own Subscribe
//     widget, and this page carries a Subscriptions section of its own
// A run of text bracketed in *…* is Substack's italic aside (the
// dateline that opens the piece, the subscription note that closes it) —
// the stars come off and the block is set italic, the same reading
// extractParagraphs gives them.
const MANIFESTO_URL = `${SITE_URL}/p/the-new-critic-secession`;

// Inside a <pre>, only <em> and <a href> survive; everything else is
// escaped so the post's own angle brackets and ampersands print as
// written. (escapeHtml would eat the tags we are keeping, so the two
// kept tags are parked behind control characters first — the same trick
// EM_OPEN/EM_CLOSE play in extractParagraphs.)
const LINK_OPEN = '\u0003';
const LINK_CLOSE = '\u0004';
function manifestoInline(html) {
  const hrefs = [];
  const marked = String(html || '')
    .replace(/<\/?(?:em|i)\b[^>]*>/gi, (t) => (t[1] === '/' ? EM_CLOSE : EM_OPEN))
    .replace(/<a\b[^>]*\shref="([^"]*)"[^>]*>/gi, (_, h) => {
      hrefs.push(h);
      return LINK_OPEN;
    })
    .replace(/<\/a>/gi, LINK_CLOSE);
  let i = 0;
  return escapeHtml(unescapeNumericEntities(marked.replace(/<[^>]+>/g, '')))
    .split(EM_OPEN).join('<em>')
    .split(EM_CLOSE).join('</em>')
    .replace(new RegExp(LINK_OPEN, 'g'), () => {
      const h = hrefs[i++] || SITE_URL;
      return `<a href="${escapeHtml(h)}" rel="noopener" target="_blank">`;
    })
    .split(LINK_CLOSE).join('</a>');
}

// A preformatted line becomes its own block carrying its indent as
// padding, rather than as the leading spaces it was written with. Two
// things follow from that, and both are the point:
//
//   - A line that runs past the column folds under ITS OWN STEP instead
//     of returning to the left edge. The staircase survives wrapping.
//   - The step can be SCALED. The piece's deepest cascade — the list of
//     the tradition, No. 30, some 180 names each indented three spaces
//     past the last — reaches 138 characters of indent. The column
//     holds about 40. Printed at one character per space that list
//     doesn't cascade, it detonates: every name folding three times,
//     the diagonal gone. So each block's step is divided down until its
//     own deepest line fits INDENT_BUDGET_CH, and the cascade is
//     redrawn at whatever step the column can hold — a fine diagonal
//     for the tradition list (about 2.4px a name, ~110px of drift
//     across a run), the natural full step for the theses, which never
//     go deeper than 27.
//
// Scaled per block, not globally: a shallow block shouldn't lose its
// steps because a deep one exists elsewhere in the piece.
// The piece's standing lines are set upstream in italic capitals
// (<em>THE 42 THESES OF SECESSION</em>) — a plate, at the width of a
// post. Printed here they come out of both: the capitals go to title
// case and the italic comes off, so the line reads as a heading in the
// panel's own voice rather than as shouting in the middle of a column.
// The magazine's own name is italicized throughout the piece — a
// masthead's habit of italicizing itself. On a page that IS the
// magazine it reads as emphasis where none is meant, and the name falls
// in nearly every thesis. So an <em> holding nothing but the name is
// unwrapped; every other italic in the piece stands (USA Today, The
// Republic of Letters, the stressed "to" in No. 19). Written to catch
// the several ways the name is marked up upstream — "THE NEW CRITIC",
// bare "NEW CRITIC" after an un-italicized "The", "The New Critic" in
// the dateline, and the plural "THE NEW CRITICs" whose s sits outside
// the tag.
function unitalicizeMastheadName(html) {
  return String(html || '').replace(
    /<(em|i)\b[^>]*>(\s*(?:the\s+)?new\s+critic\s*)<\/\1>/gi,
    '$2'
  );
}

const TITLE_MINOR = /^(a|an|and|at|by|for|from|in|nor|of|on|or|the|to)$/;
function titleCaseLine(line) {
  let first = true;
  return line.replace(/[A-Za-z][A-Za-z’']*/g, (w) => {
    const lower = w.toLowerCase();
    const out = !first && TITLE_MINOR.test(lower)
      ? lower
      : lower.charAt(0).toUpperCase() + lower.slice(1);
    first = false;
    return out;
  });
}

const INDENT_BUDGET_CH = 14;
function manifestoLines(text) {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  const indentOf = (l) => /^ */.exec(l)[0].length;
  const maxIndent = Math.max(0, ...lines.map(indentOf));
  const scale = maxIndent > INDENT_BUDGET_CH ? INDENT_BUDGET_CH / maxIndent : 1;
  return lines
    .map((line) => {
      const n = indentOf(line);
      const body = manifestoInline(line.slice(n));
      if (!body) return '<span class="manifesto-line"></span>';
      const pad = n ? ` style="padding-left:${(n * scale).toFixed(2)}ch"` : '';
      return `<span class="manifesto-line"${pad}>${body}</span>`;
    })
    .join('');
}

// Substack serves one upload at several widths; the <img src> is already
// the widest f_auto variant, which is what the cards hotlink too.
function manifestoFigure(figureHtml) {
  const src = (/<img[^>]*\ssrc="([^"]+)"/i.exec(figureHtml) || [])[1];
  if (!src) return '';
  const capRaw = (/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(figureHtml) || [])[1];
  const cap = capRaw ? unescapeNumericEntities(stripHtml(capRaw)).trim() : '';
  return `<figure class="manifesto-fig">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(cap || 'From The New Critic Secession')}" loading="lazy">
        ${cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''}
      </figure>`;
}

// The piece as printed here is shorter than the piece as published, and
// deliberately so — three cuts, all made on the piece's own landmarks
// rather than on block numbers, so they survive a re-edit upstream:
//
//   1. It ENDS WHERE IT IS SIGNED. The published post carries a flying
//      bird plate after the signatures, then Substack's subscription
//      note, its Subscribe button and a closing THE YOUNG AMERICANS
//      plate. The bird and everything after it are dropped: the
//      manifesto's last word is the seven editors' names.
//   2. ONE PHOTOGRAPH, the last one standing before that cut, and it is
//      lifted out of the theses to stand under the title instead —
//      where the post's own lede photograph stood. Seven party
//      photographs cut between the theses at the full width of a post;
//      in a column a third this wide they were most of the section's
//      height and none of its argument.
//   3. NO OPENING PLATE. The post opens on a standing THE NEW CRITIC
//      line, which the panel's own title now says.
function renderManifestoHtml(bodyHtml) {
  if (!bodyHtml) return '';
  // Pullquote blocks — the piece's standing lines — are wrapped in
  // <div class="pullquote"> upstream. They centre; the theses range
  // left, because their staircase is measured from the left edge.
  const quoted = new Set();
  for (const q of bodyHtml.match(/<div class="pullquote">[\s\S]*?<\/pre>/gi) || []) {
    const t = (/<pre class="text">([\s\S]*?)<\/pre>$/i.exec(q) || [])[1];
    if (t) quoted.add(t);
  }
  const re = /<pre class="text">([\s\S]*?)<\/pre>|<figure[\s\S]*?<\/figure>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(bodyHtml)) !== null) {
    if (m[1] === undefined) {
      blocks.push({ fig: true, html: manifestoFigure(m[0]) });
      continue;
    }
    let text = unitalicizeMastheadName(m[1]);
    const aside = /^\s*\*/.test(text) && /\*\s*$/.test(text);
    if (aside) text = text.replace(/^(\s*)\*/, '$1').replace(/\*(\s*)$/, '$1');
    const quote = quoted.has(m[1]);
    // A standing line loses its italic capitals — see titleCaseLine.
    if (quote) text = titleCaseLine(text.replace(/<\/?(?:em|i)\b[^>]*>/gi, ''));
    const cls =
      'manifesto-pre'
      + (quote ? ' manifesto-pre--quote' : '')
      + (aside ? ' manifesto-pre--aside' : '');
    blocks.push({
      fig: false,
      quote,
      signed: /^\s*\|\s*Signed\s*\|/i.test(text),
      html: `<pre class="${cls}">${manifestoLines(text)}</pre>`,
    });
  }
  // (1) Cut after the signatures.
  const signedAt = blocks.findIndex((b) => b.signed);
  const kept = signedAt >= 0 ? blocks.slice(0, signedAt + 1) : blocks;
  // (2) Of the photographs left, only the last one stands — and it is
  // moved to the head of the piece, under the title.
  const lastFig = kept.map((b) => b.fig).lastIndexOf(true);
  // (3) The opening plate goes — a leading standing line, before any of
  // the piece's prose has started.
  const firstProse = kept.findIndex((b) => !b.fig && !b.quote);
  const lede = lastFig >= 0 ? [kept[lastFig].html] : [];
  const text = kept
    .filter((b, i) => !b.fig && !(b.quote && i < firstProse))
    .map((b) => b.html);
  return lede.concat(text).join('\n      ');
}

async function fetchManifesto() {
  const html = await fetchHtml(MANIFESTO_URL);
  if (!html) { failedPageFetches++; return ''; }
  const preloads = extractPreloads(html);
  const body = preloads && preloads.post && preloads.post.body_html;
  if (!body) { failedPageFetches++; return ''; }
  return renderManifestoHtml(body);
}

// (The founders' written signatures used to close the letter panel —
// renderSignersHtml, the .col-sig* rules and the sig image write-out all
// went when the letter stopped being signed. give.html is still mined
// for the founders' Substack links and headshots, which the masthead
// uses; the signature data URIs in it are simply no longer written out.)

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
  const homePostscripts = postscriptAll.slice(0, 8);
  // 10 now: four are spent in the rows above (one in the first
  // movement, three in the postscripts'), and the CONTRA movement's
  // two three-across rows want six more.
  const homeContras = contraAll.slice(0, 11);

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
    // 10 paragraphs, not 6: the plate fills two columns bottom-flush,
    // and six was enough only for posts that write long ones. A post
    // of short paragraphs (The Blackpill's run ~200 chars each) came
    // to barely a third of the text the box wants, and the fitter's
    // too-short path collapsed it to a single line. The fitter cuts
    // whatever it is given down to the box, so the extra costs
    // nothing but a little markup.
    const extended = await mapBatched(rowPosts, 10, (p) => fetchExtendedPreview(p.link, 10));
    const parasByLink = new Map();
    const artistByLink = new Map();
    rowPosts.forEach((p, i) => {
      let paras = extended[i].paragraphs;
      if (extended[i].artist) artistByLink.set(p.link, extended[i].artist);
      if ((!paras || !paras.length) && rssBodyByLink.has(p.link)) {
        // Same fallback as the hero's — recent posts still in the feed can
        // recover their free-preview paragraphs from content:encoded.
        paras = extractParagraphs(rssBodyByLink.get(p.link), 6);
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
  applyTitleHyphenation(allPosts);

  const html = renderHomepage({ essays: homeEssays, postscripts: homePostscripts, contras: homeContras, archives: heroArchive });

  // give.html is only mined for assets now (see GIVE_SRC_PATH): the
  // founders' Substack links and signature images, the latter written out
  // from their inline base64 to real cacheable files.
  // The About page's Manifesto section reprints the Secession post —
  // one more post-page fetch, counted with the rest (a failure here
  // trips the same "post pages failed to fetch" warning).
  console.log('Fetching the Secession manifesto');
  const manifestoHtml = await fetchManifesto();

  console.log('Reading give.html');
  const giveSrc = fs.readFileSync(GIVE_SRC_PATH, 'utf8');
  const founders = extractFounders(giveSrc);
  for (const f of founders) {
    // Founder headshots (for the About page's masthead panel): inline
    // base64 in give.html → real cacheable files here.
    if (f.photoDataUri) {
      const ext = f.photoDataUri.startsWith('data:image/png') ? 'png' : 'jpg';
      f.photo = writeDataUriImage(f.photoDataUri, `people/${slugify(f.name)}.${ext}`);
    }
  }

  const archivePool = archivePosts;

  const pages = {
    'index.html': html,
    'essays.html': renderEssaysPage({ currentKey: 'essays', label: 'Essays', posts: essaysAll }),
    'postscript.html': renderPostscriptPage({ currentKey: 'postscript', label: 'Postscript', posts: postscriptAll }),
    'contra.html': renderListPage({ currentKey: 'contra', label: 'Contra', posts: contraAll, leadParas: CONTRA_LEAD_PARAS }),
    'about.html': renderAboutPage(founders, manifestoHtml),
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
