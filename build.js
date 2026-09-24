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

// Stamped into the stylesheet link — browsers cache the un-versioned
// style.css hard, and every design pass was needing a manual hard
// refresh to show. THE STAMP IS THE STYLESHEET'S OWN HASH (2026-09-17),
// not the clock: a build that changes nothing writes the same pages,
// so a rebuild leaves no diff and a ship carries only real change,
// and browsers refetch exactly when the CSS is new.
const crypto = require('crypto');
const BUILD_STAMP = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(__dirname, 'style.css')))
  .digest('hex').slice(0, 8);
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
    if (o.head) p.head = o.head;
    if (o.zoom) p.zoom = o.zoom;
    if (o.mat) p.mat = o.mat;
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
      // THE ISSUE NUMBER IS KEPT on the post: the postscript's card
      // prints it in the courier over the title ("No. 21 · Jul 21").
      const psNoMatch = ps[1].match(/\d+/);
      if (psNoMatch) p.psNo = Number(psNoMatch[0]);
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
        // and just drop the issue number off the front (keeping it).
        const pre = p.subtitle.match(POSTSCRIPT_DEK_PREFIX);
        const preNo = pre && pre[0].match(/\d+/);
        if (preNo) p.psNo = Number(preNo[0]);
        p.subtitle = p.subtitle.replace(POSTSCRIPT_DEK_PREFIX, '');
      }
      continue;
    }

    // "<Reviewer> contra <Work>" → "Contra <Work>" (with its capital
    // since 2026-09-24; lowered before). Gated on the prefix
    // reading as a NAME rather than on the word "contra" alone, so an
    // essay dek that happens to use it in a sentence is left be. Matching
    // the prefix against post.author is too strict on its own — one
    // review's author field is "Nadav" where its dek says "Nadav Asal".
    const con = p.subtitle.match(/^(.+?)\s+contra\s+(.+)$/i);
    if (con && looksLikeName(con[1])) {
      p.subtitle = `Contra ${con[2]}`;
      continue;
    }

    // Deks that already arrive in the target shape — a hand-written
    // override, or a review whose dek opens on "Contra" with no reviewer
    // in front of it for the branch above to strip.
    p.subtitle = p.subtitle
      .replace(POSTSCRIPT_DEK_PREFIX, '')
      .replace(/^contra\s+/i, 'Contra ');
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
  { key: 'essays', label: 'Essays', href: 'archive.html#section=essays' },
  { key: 'postscript', label: 'Postscript', href: 'archive.html#section=postscript', dek: 'Interviews w/\nextraordinary gen zers' },
  { key: 'contra', label: 'Contra', href: 'archive.html#section=contra', dek: 'New Critics take on\nsignificant gen z works' },
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
// PAGE SIZE 12, AND THE OFFSET ADVANCES BY WHAT CAME BACK. Asked for 24
// (or anything larger) the API answers the first page one short — 23
// posts — and a fixed-stride offset of 24 then skipped the 24th-newest
// post outright (Voluntary Oasis went missing this way, 2026-09-16).
// Pages of 12 come back full, and stepping the offset by the count
// actually received means a short page can never open a gap.
const ARCHIVE_API_PAGE_SIZE = 12;

async function fetchFullArchive() {
  const all = [];
  const seen = new Set();
  const MAX_PAGES = 100;
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${SITE_URL}/api/v1/archive?sort=new&offset=${offset}&limit=${ARCHIVE_API_PAGE_SIZE}`;
    const json = await fetchHtml(url);
    if (!json) break;
    let items;
    try { items = JSON.parse(json); } catch { break; }
    if (!Array.isArray(items) || items.length === 0) break;
    for (const p of items) {
      const key = p.canonical_url || p.slug || p.id;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
    offset += items.length;
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
function focalStyle(post, frame) {
  if (post.focal) return ` style="object-position: ${escapeHtml(post.focal)}"`;
  if (!post.head) return '';
  const c = headCrop(post, frame, { transform: true });
  if (!c) return ` style="object-position: ${(post.head[0] * 100).toFixed(1)}% ${(post.head[1] * 100).toFixed(1)}%"`;
  // The zoom is a transform, pivoting on the point that lands the head
  // in the middle. The cover lets its overflow show (the title column
  // reaches past it), so the picture clips itself: the clip is drawn
  // before the transform and scaled with it, so it is cut short by the
  // zoom and grows back to exactly the frame's edges.
  if (c.zoom === 1) return ` style="object-position: ${c.x}% 50%"`;
  const k = (1 - 1 / c.zoom) * 100;
  const cut = (v) => +v.toFixed(2) + '%';
  const clip = `inset(${cut(c.y / 100 * k)} ${cut((1 - c.ox / 100) * k)} ${cut((1 - c.y / 100) * k)} ${cut(c.ox / 100 * k)})`;
  return ` style="object-position: ${c.x}% 50%; --cover-zoom: ${c.zoom}; --cover-zoom-o: ${c.ox}% ${c.y}%; --cover-zoom-clip: ${clip}"`;
}

// THE HEAD IN THE MIDDLE (2026-09-23): a postscript cover's `head`
// override is where the sitter's head is centred in the drawing, as
// fractions of its width and height ([x, y]; see content-overrides.js).
// A postscript frame is always narrower than its drawing, so the
// drawing fills the frame's height and only slides sideways; a head
// that stands high or low is brought to the middle by zooming in just
// far enough that the drawing's top (or bottom) edge can meet the
// frame's. The sideways slide is worked out for the frame's shape —
// width over height, measured at 1440 (it ranges about ±0.06 from 1280
// to 1920, which moves a head by a few pixels at most):
//   the box at rest (the title's ::before, painted with --swap-img) —
//     0.70 in the latest row, a column (384) on the card's height
//     (551), and 0.49 in a pair, a column of the pairs' four (270),
//     since the postscripts turned portrait (2026-09-23);
//   the <img> shown when a preview opens — 0.71 and 0.53.
const PS_FRAMES = {
  latest: { box: 0.70, img: 0.71 },
  pair: { box: 0.49, img: 0.53 },
};
// The box at rest zooms by sizing its background, so its slide is taken
// on the zoomed drawing; the <img> zooms by a transform AFTER
// object-fit has cropped it (`transform`), so its slide is taken on the
// drawing as fitted and the transform pivots (ox, as a fraction of the
// frame's width) on the point that carries the head to the middle.
function headCrop(post, frame, { transform = false } = {}) {
  const m = frame && post.head && /_(\d+)x(\d+)\.\w+$/.exec(decodeURIComponent(post.image || ''));
  if (!m) return null;
  const aspect = m[1] / m[2];
  const [hx, hy] = post.head;
  // A post's own `zoom` overrides the one that just brings the head to
  // the middle: over 1 it crops in, under 1 it stands the drawing back
  // from the frame's edges on a mat (`mat`, the box's ground) to give
  // the head air — the <img> stops at 1 (it would show the cover behind
  // it), which costs nothing: it stays hidden while the box is shown.
  let zoom = post.zoom || (hy < 0.5 ? 0.5 / hy : 0.5 / (1 - hy));
  if (!post.zoom && zoom < 1.05) zoom = 1;
  if (transform) zoom = Math.max(1, zoom);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  // where along its slack the drawing stands for the head to sit in the
  // middle, the slack being overhang (drawing bigger) or mat (smaller)
  const slide = (size, box, at) => (size === box ? 0.5 : clamp((size * at - box / 2) / (size - box)));
  const w = transform ? aspect : aspect * zoom; // the drawing's width, in frame heights
  const x = slide(w, frame, hx);
  const y = transform || zoom === 1 ? 0.5 : slide(zoom, 1, hy);
  const f = w > frame ? (w * hx - x * (w - frame)) / frame : 0.5; // the head across the frame, before the transform
  const ox = zoom === 1 ? 0.5 : clamp((zoom * f - 0.5) / (zoom - 1));
  return {
    x: +(x * 100).toFixed(1),
    y: transform && zoom > 1 ? (hy < 0.5 ? 0 : 100) : +(y * 100).toFixed(1),
    ox: +(ox * 100).toFixed(1),
    zoom: +zoom.toFixed(3),
  };
}
// The box at rest reads its crop off the title (the ::before inherits
// it), which beats the --swap-pos the fitter copies onto the card from
// the <img>, whose frame is a different shape.
function headBoxStyle(post, frame) {
  const c = headCrop(post, frame);
  if (!c) return '';
  const size = c.zoom !== 1 ? `; --swap-size: auto ${+(c.zoom * 100).toFixed(1)}%` : '';
  const mat = c.zoom < 1 && post.mat ? `; --swap-mat: ${escapeHtml(post.mat)}` : '';
  return ` style="--swap-pos: ${c.x}% ${c.y}%${size}${mat}"`;
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
  if (!m) {
    // A cover the API hands over as the raw S3 upload (four posts as of
    // 2026-09-16; one is the 3839px original at 5.5MB) goes through the
    // same CDN fetch route, which takes the S3 URL as its source and
    // serves the sized, progressive variant like every other cover.
    if (/^https:\/\/substack-post-media\.s3\.amazonaws\.com\//.test(url)) {
      return `https://substackcdn.com/image/fetch/w_${w},c_limit,f_auto,q_auto:good,fl_progressive:steep/${encodeURIComponent(url)}`;
    }
    return null;
  }
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
  // MEASURED, NOT ESTIMATED (2026-09-21). Every latest cell said 40vw
  // and none of them is: read off the rendered page at 1280, 1440 and
  // 1920, a postscript or review cell in a latest row stands at 27.1 to
  // 29.8vw, a review in a trio at 25.8 to 28.3, and a postscript in a
  // pair at 20.8 to 22.2. A browser believes what it is told, so on a
  // retina laptop (1440 at 2x) 40vw asked for 1152 device pixels and
  // took the 1200 candidate for a picture drawn 412 wide — where 30vw
  // asks for 864 and the pair's 23vw for 662, which is the 800. Fourteen
  // of the front page's twenty-three covers came down at 1200 for it.
  // The wide cell's 60vw is right (56 to 59.6 measured) and stands.
  third: '(max-width: 720px) 100vw, 30vw',
  pair: '(max-width: 720px) 100vw, 23vw',
};
// THE COVER IS CROPPED TO ITS BOX, AND THE CROP NEEDS PIXELS (2026-09-22).
// A postscript's box is tall — 412 by 577 at 1440, a pair's 306 by 577 —
// and the artwork is object-fit: cover, so a landscape original is
// scaled to the box's HEIGHT and most of its width is cut away. The
// browser sizes its pick by the width `sizes` states, which was the
// box's: a 1456x1092 original in a pair cell took the 800 candidate
// (800x600) for a box 1154 device pixels tall, and came up soft. The
// original's own proportions are in its file name (_WxH); where they
// are wider than the box's, the width asked for grows by the ratio.
const COVER_BOX_ASPECT = { wide: 1.43, cell: 1.0, third: 0.714, pair: 0.53 };
function cropAwareSizes(url, sizes) {
  const key = Object.keys(COVER_SIZES).find((k) => COVER_SIZES[k] === sizes);
  const box = key && COVER_BOX_ASPECT[key];
  const m = /_(\d+)x(\d+)\.[a-z]+/i.exec(url || '');
  const vw = /,\s*(\d+)vw$/.exec(sizes);
  if (!box || !m || !vw) return sizes;
  const img = +m[1] / +m[2];
  if (!(img > box)) return sizes;
  const need = Math.min(100, Math.ceil(+vw[1] * (img / box)));
  return sizes.replace(/,\s*\d+vw$/, `, ${need}vw`);
}
function coverSrcAttrs(url, sizes, { preload = false } = {}) {
  sizes = cropAwareSizes(url, sizes);
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
  // A KICKER OR AN AUTHOR FILTERS THE LEDGER (2026-09-17), as the OPS
  // words do by section: the archive opens on the column head with
  // that kind's rows alone under it (src/ledger.js reads #topic= and
  // #author=). A date still sorts the ledger by date and lands on the
  // post itself.
  if (key === 'kicker' && post.kicker) return `archive.html#topic=${encodeURIComponent(post.kicker.toLowerCase())}`;
  if (key === 'author' && post.author) return `archive.html#author=${encodeURIComponent(post.author.toLowerCase())}`;
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
  // (The masthead's wordmark no longer carries this: it is not a link
   // any more, and aria-current on a thing that goes nowhere says
   // nothing. Kept declared against its return.)
  const homeCurrent = currentKey === 'home' ? ' aria-current="page"' : '';
  void homeCurrent;
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
  <a class="wordmark topbar-wordmark" href="${currentKey === 'home' ? '#top' : './#top'}" aria-label="The New Critic — to the top of the front page">
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
  // The words go to the ledger, filtered to their kind (2026-09-17;
  // src/ledger.js reads #section=), not to the section pages.
  essays: { word: 'Essays', href: 'archive.html#section=essays' },
  postscript: { word: 'Postscript', href: 'archive.html#section=postscript' },
  contra: { word: 'Contra', href: 'archive.html#section=contra' },
};
// THE COMMAS ARE ELEMENTS NOW (2026-09-19). A run of band links was
// joined with a bare ', ', which makes every comma a TEXT NODE — and a
// text node cannot be reached by a selector. It had to be, because a
// link carrying a highlight block carries the comma beside it onto
// that block (the block clears the word by --hl-pad either side, which
// at this size is more than the space before the comma), and a
// charcoal comma on a charcoal block reads as a nick out of the mark.
// Each separator is its own span, so the ones beside a marked word can
// take the block's own ink. The character and the space are unchanged.
const BAND_SEP = '<span class="band-sep">, </span>';
function bandDeks(m) {
  if (m === 'latest') {
    const by = (key) => SITE_LINKS.find((l) => l.key === key);
    const a = (l) => l ? `<a href="${escapeHtml(l.href)}"${l.href.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(l.label)}</a>` : '';
    return [a(by('archive')), a(by('about')), '<span class="nav-links-dead">Store</span>', '<span class="nav-links-dead">Events</span>',
      `<a href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a>`].filter(Boolean).join(BAND_SEP);
  }
  const list = m === 'contra' ? CONTRA_CATEGORIES : RAIL_CATEGORIES;
  return list.map((c) => `<a href="archive.html#topic=${encodeURIComponent(c.toLowerCase())}">${escapeHtml(c)}</a>`).join(BAND_SEP);
}
// THE MASTHEAD LINE RIDES IN THE BAND'S MIDDLE — the magazine line and
// the date, centred between the mark and the list. The fixed line under
// the wordmark is seated on this same box (fitMastheadPickup), so as the
// band rises it takes the two lines up with it: the band simply arrives
// where they already stand.
function bandDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
// (THE DATE STOOD IN A SEAM for a day, 2026-09-22: a 36 band of
// charcoal of its own under the head band. It is back in the band's
// middle, 2026-09-23, and the seam is struck — renderSectionBand.)
function mastheadLine() {
  return `<a href="./">The Young American Magazine</a>
      <span>${bandDate()}</span>`;
}
// EVERY BAND READS IN THREE SLOTS, and the same three everywhere:
//   LEFT    the magazine's name in Garamond (EST. MAY 2025 on the
//           colophon's band, the one line the footer owns).
//   MIDDLE  one courier line — the date on the masthead's band, the
//           section's own line on the sections', the copyright on the
//           colophon's — centred BETWEEN THE TWO INKS (seatBandMid in
//           duo-panel-fit.js: the Garamond on the left and the list on
//           the right seldom measure alike, so the band's own centre
//           is not the centre of the space between them).
//   RIGHT   a Garamond list — the site's links on the masthead's band,
//           ALL <what the section holds> on the sections', the socials
//           on the colophon's.
// (The bird that stood in the middle of every band is struck: the
// middle prints a word now.)
function bandName(html) {
  return `<p class="band-deks band-name">${html}</p>`;
}
// THE NAME IS NOT A WAY ANYWHERE, EXCEPT IN THE BAND (2026-09-19).
// The masthead's wordmark and the reprint at the foot gave up both
// their link and their answer to the hand: they are the magazine's
// name over and under its pages, not an offer, and the reader holding
// them is already here. They keep the <a> so every rule and every
// measurement that names one still finds it — an anchor with no href
// is not a link: no pointer, no click, and out of the tab order too,
// which `pointer-events: none` alone would not have managed.
// THE BAND'S NAMES DO LINK, and to the TOP of the front page (#top is
// the id on .page-rows), since the band is the one place the name is
// furniture a reader steers by rather than a masthead.
const TYAM_LINK = '<a href="./#top">The Young American Magazine</a>';
// The section's own line, in the courier at the right.
const BAND_LINES = {
  essays: 'The Greatest Writing on Gen Z',
  postscript: 'TNC Editors Interview Extraordinary Gen Zers',
  contra: 'New Critics Take On Significant Gen Z Works',
};
// ALL … at the right, in the list's italic, to the section's page.
// (SEE is struck: the line is a destination, not an instruction.)
const SEE_ALL = { essays: 'All Essays', postscript: 'All Interviews', contra: 'All Criticism' };
// The word pages (renderWordPage) take the masthead's band too, with
// their own line in the middle slot in place of the date (mid) and
// their own link among the right slot's marked current (currentKey).
// THE SOCIAL STACK IS STRUCK FROM THE MARGIN (2026-09-18). Substack,
// Instagram, X and Email stood as four 13px marks in the LEFT margin,
// the toggle's mirror, fixed at the viewport's centre. The margin is
// bare now — the toggle keeps the right on its own — and the four
// names read in words in the colophon at the foot instead, where the
// X has joined them. renderSocialStack and its marks are kept below,
// unused, against a return. The dashes that stood between them are struck
// (later on 2026-09-17): the marks stand a dash's line apart, 13, on
// the stack's own gap. Each mark is its own link and takes the
// highlight under the pointer.
// THE MARGINALIA (2026-09-17): the toggle and its field in the right
// margin, the social marks in the left — fixed to the viewport, and
// standing as a direct child of <main> rather than inside the band:
// inside the band they stood in ITS stacking context, at the band's
// own level, and the reprint and the archive's column head, a level
// or two over the band, covered them as they rose (and the browser's
// rubber-band past the foot brought the reprint over them). Here they
// stand over every row of the page.
function renderMarginalia() {
  return `<div class="marginalia">
  <button type="button" class="theme-toggle" aria-label="Light or dark, and a highlight colour of your own"><span class="theme-toggle-light">Light</span><span class="theme-toggle-sep" aria-hidden="true">·</span><span class="theme-toggle-dark">Dark</span><span class="theme-toggle-sep" aria-hidden="true">·</span><span class="theme-toggle-hex">Hex</span></button><input class="theme-hex" type="text" maxlength="7" placeholder="#" aria-label="Highlight colour, as a hex code" autocomplete="off" autocapitalize="off" spellcheck="false" hidden>
  </div>`;
}
function renderSocialStack() {
  const substack = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false"><path d="M2 2.5h20M2 7.5h20M2 12.5h20v9l-10-5.5L2 21.5v-9z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  const instagram = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.6" cy="6.4" r="1.4" fill="currentColor"/></svg>';
  // X (2026-09-18): the mark's own silhouette, filled in the ink rather
  // than drawn in strokes like the three beside it — the letter is the
  // logo, and two crossed strokes would read as a close button. Its
  // bars run about 2.6 of the 24 wide against the others' 2.2, so it
  // stands with them at 13 without a rule of its own.
  const x = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z" fill="currentColor"/></svg>';
  const email = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false"><rect x="1.5" y="4" width="21" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2.5 6.5 12 13.5l9.5-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  const sep = '';
  return `<span class="social-stack"><a href="https://www.thenewcritic.com" rel="noopener" aria-label="Substack">${substack}</a>${sep}<a href="https://www.instagram.com/thenewcritic" rel="noopener" aria-label="Instagram">${instagram}</a>${sep}<a href="https://x.com/thenewcritic" rel="noopener" aria-label="X">${x}</a>${sep}<a href="mailto:editors@thenewcritic.com" aria-label="Email">${email}</a></span>`;
}
// THE MIDDLE SLOT IS EMPTY ON THE WORD PAGES (2026-09-19). The
// magazine's name stood a second time in the band's middle there —
// THE NEW CRITIC in miniature between The Young American Magazine and
// the list of links, sized off the reprint's fit — and it was never
// optically centred in the band it stood in: 31.8 of air over its
// caps against 15.4 under its baseline, the band's own box centred
// rather than the ink inside it. It is struck rather than seated. The
// name is already on the page in full at the head and again at the
// foot; a third setting of it, in the one place it could not be made
// to sit straight, was the one the page could spare. (bareMid: the
// slot is rendered and left blank, so the three columns keep their
// stations — the date does NOT come back in its place, which would be
// a substitution rather than a removal.)
// THE SUBSCRIBE TICKER (2026-09-23): a 36 strip of the mark's blue under
// the head band at the page's head — scrolling up under the band once
// it pins — and again over the colophon at the foot, running SUBSCRIBE and a
// line of the pitch, SUBSCRIBE and the other line, round and round —
// the whole strip one link to the subscribe page. The run is two equal
// halves so it can loop by sliding one half's width (style.css, THE
// SUBSCRIBE TICKER). Neither first nor last in the band: the sheet
// seats the band's slots by :first-child and :last-child.
// (as HTML: the price is set bold in the ticker as in the corner box —
// style.css, THE TICKER'S PRICE IS BOLD, 2026-09-24)
function tickerLines() { return [
  escapeHtml('Sign up for our free newsletter, or become a paid subscriber.'),
  `For <strong class="sub-ticker-price">${escapeHtml(SUBSCRIBE_PITCH_PARTS[1])}</strong>${escapeHtml(', hundreds of paid readers get access to Postscript, our interview series; Contra, our criticism section; and exclusive New Critic parties.')}`,
]; }
function subTicker(where = 'head') {
  const unit = tickerLines().map((l) => `<b>Subscribe</b><span>${l}</span>`).join('');
  const half = `<span class="sub-ticker-half">${unit}${unit}</span>`;
  return `<a class="sub-ticker sub-ticker--${where}" href="${SITE_URL}/subscribe" rel="noopener" aria-label="Subscribe to The New Critic"><span class="sub-ticker-run" aria-hidden="true">${half}${half}</span></a>`;
}

function renderSectionBand(m, { mid = '', currentKey = '', bareMid = false } = {}) {
  const b = SECTION_BANDS[m] || SECTION_BANDS.latest;
  if (m === 'latest') {
    // The masthead's band: the site's links, the magazine's name, the
    // date. The name no longer rides in the courier beside the date —
    // it has the middle to itself.
    const links = currentKey
      ? bandDeks(m).replace(`<a href="${currentKey}.html">`, `<a href="${currentKey}.html" aria-current="page">`)
      : bandDeks(m);
    // THE DATE IS BACK IN THE MIDDLE (2026-09-23), on the word pages
    // too (bareMid still keeps their own line out of it): it gives its
    // seat to the band's miniature THE NEW CRITIC as the big name goes
    // under the band (src/band-mark.js).
    return `<nav class="section-band section-band--three" aria-label="The Young American Magazine">
    ${bandName(TYAM_LINK)}
    <p class="band-deks band-dek">${mid && !bareMid ? `<span>${escapeHtml(mid)}</span>` : `<span class="band-date">${bandDate()}</span>`}</p>
    <p class="band-deks">${links}</p>
  </nav>`;
  }
  const line = BAND_LINES[m] || '';
  return `<nav class="section-band section-band--${escapeHtml(String(b.word).toLowerCase().replace(/[^a-z0-9]+/g, '-'))} section-band--three" aria-label="${escapeHtml(b.word)}">
    ${bandName(TYAM_LINK)}
    <p class="band-deks band-dek"><a href="${escapeHtml(b.href)}">${escapeHtml(line)}</a></p>
    <p class="band-deks"><a href="${escapeHtml(b.href)}">${escapeHtml(SEE_ALL[m] || `All ${b.word}`)}</a></p>
  </nav>`;
}
// THE COLOPHON BAND closes the page the way the header's band opens
// it — the same three slots in the footer's voice: the founding date
// in the list's italic at the left, where the magazine's name stands
// above; the copyright line in the courier between; the socials in
// that same italic at the right.
// THE FOOT IS THE HEAD TURNED OVER: the reprint — THE NEW CRITIC
// again at full width — rises in the flow, overtakes the pinned band
// at the screen's top and sticks there; under it the blue field, a
// viewport less the name and the band; and the colophon band closes
// the page on the screen's foot (style.css, THE FOOT IS THE HEAD
// TURNED OVER). The front page and the word pages close alike.
// THE NAME GOES HOME (2026-09-21). Both big wordmarks — the masthead's
// and this one — had no href at all for two days: links in name only.
// They go to the TOP OF THE FRONT PAGE: a bare #top where the reader is
// already on it, so the page scrolls rather than reloads (the rows'
// wrapper carries the id), and ./#top from a word page.
// THE FOOT TAKES THE MARK when the movement over it does (onMark): the
// reprint stands on the mark's colour; the colophon keeps its own
// charcoal (2026-09-23: it took the mark for a night, then the page's
// white for a morning), the copyright in its middle again where a 36
// band of charcoal over it had carried it for a day.
// THE BAND OVER THE NAME (2026-09-23): the head turned over, as the
// head now opens on the name with its band under it — the colophon
// closes the rows and the reprint stands UNDER it, the page's last
// thing, pinned to the window's foot a level under the page until the
// colophon lifts off it (style.css, THE BAND OPENS UNDER THE NAME).
function renderPageFoot(onHome = false, onMark = false) {
  const mk = onMark ? ' on-mark' : '';
  // (the foot's own ticker is struck, 2026-09-24: the head's rides
  // under the band the whole page, style.css, THE TICKER RIDES UNDER THE
  // BAND)
  return `
  ${renderColophonBand()}
  <section class="reprint${mk}">
    <div class="reprint-rule" aria-hidden="true"></div>
    <a class="reprint-name" href="${onHome ? '#top' : './#top'}" aria-label="The New Critic — to the top of the front page">The <span class="tn-new">New</span> Critic</a>
  </section>
  <div class="foot-field${mk}" aria-hidden="true"></div>`;
}
// THE FOOT IS THE HEAD TURNED OVER IN ITS SLOTS (2026-09-19): the head
// band opens on its NAME at the left and closes on its links at the
// right; the colophon takes the same pair the other way round — the
// socials at the left, EST. MAY 2025 at the right — so the two bands
// mirror each other across the page rather than repeating each other.
// (It stood this way first to put the Garamond opposite the Helvetica
// capitals the names wore for an hour. The capitals are struck and
// both names are the Garamond again; the turn stays on its own
// account.)
// The order here is the order on the page — the band is a grid of 1fr
// auto 1fr and the sheet ranges the first slot left and the last right
// — so the turn is made by emitting them the other way, not by
// ordering them in CSS where the ranging would then be arguing with
// the markup.
function renderColophonBand(mk = '') {
  return `<nav class="section-band section-band--colophon section-band--three${mk}" aria-label="Colophon">
    <p class="band-deks"><a href="https://www.thenewcritic.com" rel="noopener">Substack</a>${BAND_SEP}<a href="https://www.instagram.com/thenewcritic" rel="noopener">Instagram</a>${BAND_SEP}<a href="https://x.com/thenewcritic" rel="noopener">X</a>${BAND_SEP}<a href="mailto:editors@thenewcritic.com">Email</a></p>
    <p class="band-deks band-dek"><span class="band-copyright">Copyright The New Critic, Inc.</span></p>
    ${bandName('<span>Est. May 2025</span>')}
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
// THE SUBSCRIBE BAND'S LINE (2026-09-17): the offer alone, one courier
// line in capitals under the word, seated by ink 32 off its feet
// (fitSubscribeName, duo-panel-fit.js). (The terms and the list stood
// under it in Garamond for a spell; struck.)
const SUBSCRIBE_ABOVE = [];
const SUBSCRIBE_BELOW = ['Sign up for our free newsletter, or become a paid subscriber.'];
// THE PITCH ITSELF, SAID ONCE (2026-09-19). The About page's Subscribe
// card and the corner box (renderSubscribeBox) are the same offer in
// two places, so the words are one constant and the markup around them
// is each site's own.
// THE PRICE CARRIES THE WEIGHT (2026-09-19), in the corner box and
// there alone: the pitch is one sentence and the offer inside it is
// three words, so they are set bold and the rest is not. The About
// card keeps the sentence plain — the emphasis is the box's, where the
// reader is being asked, not the page's, where they are already
// reading. Hence two forms of one string, joined from the same parts
// so the WORDS can never drift apart.
const SUBSCRIBE_PITCH_PARTS = [
  'Sign up for our free newsletter, or become a paid subscriber. For ',
  '$30 a year',
  ', hundreds of paid readers get access to:',
];
const SUBSCRIBE_PITCH = SUBSCRIBE_PITCH_PARTS.join('');
const SUBSCRIBE_PITCH_HTML = SUBSCRIBE_PITCH_PARTS[0]
  + `<strong class="sub-box-price">${SUBSCRIBE_PITCH_PARTS[1]}</strong>`
  + SUBSCRIBE_PITCH_PARTS[2];
const SUBSCRIBE_GETS = [
  'Postscript, our interview series',
  'Contra, our criticism section',
  'Exclusive New Critic parties',
];
// A run of numbered lines (1. 2. 3.) is one LIST: set ragged-left
// inside a block that is itself centred, so the numbers stand in a
// column and the list stands on the page's axis (style.css,
// .banner-list), and stood off the line before it by the same ink
// gap the message stands off the word (fitSubscribeName).
const bannerLines = (lines, where) => {
  if (!lines || !lines.length) return '';
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\d+\.\s/.test(lines[i])) {
      const run = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) run.push(escapeHtml(lines[i++]));
      i--;
      out.push(`<span class="banner-list">${run.join('<br>')}</span>`);
    } else out.push(lines[i] ? escapeHtml(lines[i]) : '&nbsp;');
  }
  return `<p class="banner-line banner-line--${where}">${out.join('<br>')}</p>`;
};

function renderBanner({ word, href, words, line, modifier, spacer = true, above, below }) {
  // A banner may carry no courier line at all — STORE is the word by
  // itself, so the charcoal closes on its baseline ink instead of on
  // a band's 48 box (see .page-banner--bare).
  // A banner may also carry TWO WORDS on the one line (ARCHIVE ABOUT
  // closes the page): each its own link inside the one name box, so
  // the fitter sizes and tracks the pair to the measure as one word.
  const link = (w, h) => `<a href="${escapeHtml(h)}"${h.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(w)}</a>`;
  // THE SECTION'S WORD IS A TITLE, NOT A LINK (2026-09-22): ESSAYS,
  // POSTSCRIPT and CONTRA name what stands under them and go nowhere —
  // the band's links and the margin's names still do. A heading, so it
  // is still read as one; with no link fillNameBand seats no hit patch
  // and the word does not answer the hand (style.css, THE ESSAYS STAND
  // ON THE MARK).
  const name = words
    ? `<span class="banner-name banner-name--pair">${words.map((w) => link(w.word, w.href)).join(' ')}</span>`
    : `<span class="banner-name" role="heading" aria-level="2">${escapeHtml(word)}</span>`;
  // AN EMPTY WHITE BANNER STANDS ABOVE THE SECTION'S WORD — the same
  // box as the word's own banner, with nothing on it (the fitter
  // matches its height to the banner it opens for, fitBlankBanners) —
  // and the viewport-tall spacer that used to stand BELOW the word is
  // gone.
  return `<section class="page-banner ${modifier}${line ? '' : ' page-banner--bare'}">
        ${bannerLines(above, 'above')}${name}${bannerLines(below, 'below')}
        ${line ? `<div class="dek-band dek-band--banner">
          <span>${escapeHtml(line)}</span>
        </div>` : ''}
      </section>`;
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
// THE REVIEW'S AUTHOR AND DATE STAND UP THE FRAME'S SIDES (2026-09-22):
// each a vertical stack of its capitals, one to the line — the author
// in the frame's left column, the date in its right — linking where the
// byline's two did. The fitter seats and sizes them (seatMatterMeta);
// the byline row stands invisible in the flow for the review's fit.
// THE BYLINE AND THE KICKER TRADE SEATS (2026-09-23): the author
// stands across the frame's head band now and the kicker up its left
// side, the date up the right as before; a postscript's issue number
// (lead) stands where its author would. The SEATS keep the classes the
// fitter and the sheet know them by — .cover-meta--kick with its
// .cover-kicker for the head band, .side-stack--author for the left
// column — so every seat, size and ink is as it was; what stands in
// each is chosen here.
// THE WORDS IN THE FRAME'S CORNERS (2026-09-23): the date at the head's
// right and the kicker at the foot's right, lines of the frame's own kind
// (the byline's head line, kickLine, at the head's left and Preview at
// the foot's left) — seatMatterMeta ranges all four on the picture's
// edges. They stood up the frame's sides as stacks of capitals before.
function sideStacksHtml(post) {
  const line = (text, cls, href) => text
    ? `<p class="cover-meta cover-meta--kick cover-meta--corner cover-meta--${cls}"><span class="cover-kicker"><a href="${escapeHtml(href)}">${escapeHtml(text)}</a></span></p>`
    : '';
  return line(metaDateText(post), 'cdate', archiveHref(post, 'date'))
    + line(post.kicker, 'ckick', archiveHref(post, 'kicker'));
}
// THE FRAME'S HEAD BAND carries the byline at its left (seatMatterMeta
// seats it); the date, the kicker and Preview take the other corners.
function kickLine(post, { lead = '' } = {}) {
  const text = lead || authorDisplay(post, false);
  return text
    ? `<p class="cover-meta cover-meta--kick"><span class="cover-kicker"><a href="${escapeHtml(archiveHref(post, 'author'))}">${escapeHtml(text)}</a></span></p>`
    : '';
}
function peekLine() {
  return '<p class="cover-meta cover-meta--peek">' +
    '<button type="button" class="peek-open">Preview</button></p>';
}
// THE POSTSCRIPT'S DEK NAMES ITS SUBJECT: "Declan Rexer on Deep Springs"
// — the name the courier used to carry over the title (w/ ...), set
// back into the dek before the subtitle, whose own leading "On" is
// lowered to read on from the name. The courier over the title is the
// date alone now.
function psDek(post) {
  const name = post.psName ? post.psName : authorDisplay(post, false);
  const sub = String(post.subtitle || '').trim();
  if (!name && !sub) return '';
  if (!name) return `<p class="latest-dek">${escapeHtml(sub)}</p>`;
  if (!sub) return `<p class="latest-dek">${escapeHtml(name)}</p>`;
  const rest = sub.replace(/^on\s+/i, '');
  return `<p class="latest-dek">${escapeHtml(`${name} on ${rest}`)}</p>`;
}
function coverMetaLine(post, { authorPrefix = '', only = '', cls = '', lead = '', withKicker = false } = {}) {
  // A LEAD PIECE — the postscript's issue number ("No. 21") — stands
  // where the author used to, in the author's own span so the fitters
  // seat the pair as they seated AUTHOR · DATE.
  const leadPiece = lead ? `<span class="cover-author cover-no">${escapeHtml(lead)}</span>` : '';
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
  // THE KICKER IS BACK ON THE LINE, IN THE FRAME (2026-09-22): out of
  // the preview, where it opened the plate, and at the head of the
  // frame's own line — withKicker, for the cards whose frame it is.
  const parts = (withKicker ? [kicker] : []).concat(only === 'author' ? [author] : only === 'date' ? [leadPiece, date] : [author, date]).filter(Boolean);
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
  // Covers always load — never lazily — so a preview never slides open on
  // an empty picture; the ones past the fold go at low priority so the
  // first screen's type and styles come first.
  const imgAttrs = eager ? 'loading="eager" fetchpriority="high"' : 'loading="eager" fetchpriority="low"';

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
function renderDuoHalf(post, { tag, btnLabel, btnHref, sectionBtn = true, showArtInBand = true, showDek = true, restChipArt = false, megaLabel = 'The Latest', megaSwapMeta = false, megaKind = '' }, halfClass = '') {
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
    ? `<p class="card-dek">${section === 'contra' || megaKind === 'contra' ? contraWorkDek(post.subtitle) : escapeHtml(post.subtitle)}</p>`
    : '';
  // Full, untruncated paragraphs (several of them where the row-posts
  // fetch in main() ran) — duo-panel-fit.js decides at render time how
  // many lines each panel actually has room for and clamps there, with
  // the line-clamp display's own ellipsis.
  const previewParas = post.previewParagraphs && post.previewParagraphs.length
    ? post.previewParagraphs
    : (post.preview ? [post.preview] : []);
  const previewHtml = previewParas.length
    ? `<div class="card-preview-block"><div class="plate-curtain">${post.kicker ? `<a class="plate-title" href="${escapeHtml(archiveHref(post, 'kicker'))}">${escapeHtml(post.kicker)}</a>` : ''}<div class="card-preview-cols">${previewParas
        .map((p) => `<p class="card-preview">${emHtml(p)}</p>`)
        .join('')}</div><p class="plate-more"><span class="plate-close" role="button" tabindex="0">Close Preview</span></p></div></div>`
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
  const authorPrefix = isPostscript || megaKind === 'postscript' ? 'w/ ' : '';
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
  const kickerHref = section === 'contra' || megaKind === 'contra'
    ? `archive.html#section=contra&topic=${escapeHtml(post.kicker ? post.kicker.toLowerCase() : '')}`
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
          ${post.image ? `<img class="card-image" ${coverSrcAttrs(post.image, halfClass.includes('duo-half--wide') ? COVER_SIZES.wide : COVER_SIZES.cell)} alt=""${focalStyle(post)} loading="eager" fetchpriority="low" decoding="async">` : '<span class="card-image card-image--blank"></span>'}
        </a></span>
        <div class="duo-panel">
          ${cornersHtml}
          <div class="duo-panel-top">
            <div class="panel-col panel-col--left">
              ${kickerHtml}
              ${underKickerHtml}
              ${isMega ? coverMetaLine(post, { only: 'author', cls: 'author' }) + kickLine(post) : ''}
              ${titleHtml}
              ${isMega ? '' : creditHtml}
              ${splitCredit ? dekHtml : ''}
              ${isMega ? peekLine() + sideStacksHtml(post) : ''}
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
      ? renderDuoHalf(essayPost, wideOpts || { tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'archive.html#section=essays', showDek }, 'duo-half--wide')
      : '<div class="duo-half duo-half--ghost duo-half--wide" aria-hidden="true"></div>',
    psPost
      ? renderDuoHalf(psPost, narrowOpts || { tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'archive.html#section=postscript', showDek }, 'duo-half--narrow')
      : '<div class="duo-half duo-half--ghost duo-half--narrow" aria-hidden="true"></div>',
  ];
  if (flip) halves.reverse();
  return `
    <article class="card card--duo card--split">
      ${halves.join(`\n      ${DUO_DIVIDER}\n      `)}
    </article>`;
}

function renderDuoCard(posts, opts = {}) {
  const { tag = 'From the Essay', btnLabel = 'Essays', btnHref = 'archive.html#section=essays', extraClass = '', padTo = 0, sectionBtn = true, showDek = true } = opts;
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
// THE LATEST, STACKED (2026-09-18): the two words one letter to the
// line, in the name's condensed bold, against the right margin's line
// from the top of the lead card down — a blank line between the words.
// Absolute in the card (style.css, .latest-stack); the fitter seats
// the first cap on the card's top edge (fitLatestStack).
// (Either margin — the front page's THE LATEST at the right, the
// archive's EDITORS' PICKS at the left. An apostrophe rides on the
// line of the letter before it, HUNG off that letter's right: the
// letter centres on the column's axis like every other and the mark
// stands outside it, absolute on the letter's own box — style.css,
// .latest-stack-mark.)
const stackHtml = (text, side = 'right', href = 'archive.html') => `<a class="latest-stack latest-stack--${side}" href="${escapeHtml(href)}" aria-label="${escapeHtml(text)}">${text.match(/ |[^\s'’]['’]?/g).map((ch) => ch === ' ' ? '<span class="latest-stack-gap" aria-hidden="true"></span>' : ch.length > 1 ? `<span aria-hidden="true"><span class="latest-stack-glyph">${escapeHtml(ch[0])}<span class="latest-stack-mark">${escapeHtml(ch.slice(1))}</span></span></span>` : `<span aria-hidden="true">${escapeHtml(ch)}</span>`).join('')}</a>`;
// ONE LINE OF POSTS (2026-09-23): the postscripts and the reviews wear
// the essay's card too — picture, courier line and title under it, the
// preview a dog-ear in its corner — each keeping its own picture
// (a postscript's portrait, a review's square: style.css, ONE LINE OF
// POSTS). `kind` names which; the card is the essay's in every other
// respect, the fitter's essay paths and all.
function renderMegaHero(post, { rev = false, label = 'The Latest', m2 = false, stack = '', stackSide = 'right', stackHref = 'archive.html', kind = '', pair = '', align = '' } = {}) {
  if (!post) return '';
  const half = renderDuoHalf(post, { tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'archive.html#section=essays', megaLabel: label, megaSwapMeta: rev, megaKind: kind }, `duo-half--wide duo-half--mega${kind ? ` duo-half--kind-${kind}` : ''}`);
  // (The hero's masthead row is retired — the top header carries the
  // brand; the hero opens straight on its courier band.)
  // The REV hero mirrors the composition — cover left, ground right
  // (see THE SECOND HERO in style.css).
  // EVERY PICTURE TURNED OVER (2026-09-22): the heroes' sides are dealt
  // the other way round from the alternation above — the first hero's
  // picture on the left, its title column on the right
  // THE WORDS UNDER THE PICTURE TAKE A SIDE (2026-09-24): the courier
  // line and the title set right on every other essay (align 'r') and
  // on the right-hand card of a pair, left on the rest (style.css and
  // seatMatterMeta, THE WORDS UNDER THE PICTURE TAKE A SIDE)
  const alignR = align === 'r' || pair === 'b';
  return `<section class="card card--duo card--split card--mega${!rev ? ' card--mega-rev' : ''}${m2 ? ' card--m2' : ''}${kind ? ` card--kind-${kind}` : ''}${pair ? ` card--pair-${pair}` : ''}${alignR ? ' card--align-r' : ''}">
        ${half}${stack ? stackHtml(stack, stackSide, stackHref) : ''}</section>`;
}

// THE SECTION SHELVES: two half-page boxes side by side under the
// hero. The first is INTERVIEWS — the label in the dek's voice at the
// box's left, the latest postscript as a live hover cell taking the
// box's right half. (The second box comes next.)
function renderShelvesRow(psPost) {
  if (!psPost) return '';
  const psHalf = renderDuoHalf(psPost, { tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'archive.html#section=postscript' });
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
  return cell;
}

// TWO POSTSCRIPTS TO A LINE: each cell keeps its cover-and-text pair,
// so four columns share the measure and every one of them narrows by
// the same amount (the cover column is stated as half its own cell).
// THE PICTURES MEET IN THE MIDDLE: the LEFT postscript of each pair
// reads turned over — words at the rail, picture toward the seam — so
// its cover and the right cell's stand side by side down the centre
// of the row, and the two text columns take the outer edges.
function renderPostscriptPair(a, b, { stacked = false, rev = false } = {}) {
  const cells = [a, b].filter(Boolean)
    .map((p, i) => renderLatestRow(p, null, { cellOnly: 'ps', noLabel: true, psRev: i === 0 }))
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
    // The middle review used to turn over (words first, picture at the
    // foot); every review stands the same way up now — picture at the
    // head, as the row's other cells do.
    .map((p) => renderContraCell(p, { rev: false }))
    .join('\n        ');
  if (!cells) return '';
  return `<section class="card card--latest card--contra-trio${stacked ? ' card--stacked' : ''}">
        ${cells}
      </section>`;
}

function renderLatestRow(psPost, contraPost, { rev = false, m2 = false, stacked = false, cellOnly = false, noLabel = false, psRev = false } = {}) {
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
  // The postscript's frame shapes, for its head crop (see headCrop):
  // a pair's when the cell stands in the Postscript section, the
  // latest row's otherwise.
  const psFrame = PS_FRAMES[cellOnly === 'ps' ? 'pair' : 'latest'];
  const coverImg = (post, frame) => post.image
    ? `<img class="card-image" ${coverSrcAttrs(post.image, cellOnly === 'ps' ? COVER_SIZES.pair : COVER_SIZES.third)} alt=""${focalStyle(post, frame)} loading="eager" fetchpriority="low" decoding="async">`
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
      ? `<a class="latest-plate" href="${escapeHtml(post.link)}" rel="noopener"><span class="plate-curtain">${post.kicker ? `<span class="plate-title" data-href="${escapeHtml(archiveHref(post, 'kicker'))}">${escapeHtml(post.kicker)}</span>` : ''}${paras.map((p) => `<span class="latest-plate-p">${emHtml(p)}</span>`).join('')}<span class="plate-more"><span class="plate-close" role="button" tabindex="0">Close Preview</span></span></span></a>`
      : '';
  };
  // `between` stands between the title and the dek — the review's two
  // courier lines (see THE REVIEW'S COURIER STANDS BETWEEN ITS WORDS
  // in style.css).
  // THE COURIER STANDS OVER THE TITLE (the `before` slot): author and
  // date, then the title, then the dek.
  const matter = (post, dekHtml, { before = '', after = '', titleStyle = '' } = {}) => `<div class="latest-matter">
            ${before}
            <h3 class="latest-title"${titleStyle}><a href="${escapeHtml(post.link)}" rel="noopener">${escapeHtml(post.title)}</a></h3>
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
  // psRev turns the ONE cell over — text left, cover right — without
  // the row modifier (.latest-cell--ps-rev in style.css shares the
  // mirrored row's rules); the pairs use it on their left cell.
  const ps = psPost ? `<div class="latest-cell latest-cell--ps${psRev ? ' latest-cell--ps-rev' : ''}">
        <!-- THE PICTURE RESTS BARE. Nothing is set into it and nothing
             hangs off its edges: the courier reads once, on one line
             under the dek in the column beside it. -->
        <div class="latest-cover-col latest-cover-col--portrait">
          <a class="latest-cover latest-cover--portrait" href="${escapeHtml(psPost.link)}" rel="noopener">${coverImg(psPost, psFrame.img)}</a>
        </div>
        <div class="latest-col">
          ${matter(psPost, psDek(psPost), { titleStyle: headBoxStyle(psPost, psFrame.box), before: (psPost.psNo ? `<p class="cover-meta cover-meta--author"><span class="cover-author cover-no">${escapeHtml(`No. ${psPost.psNo}`)}</span></p>` : coverMetaLine(psPost, { only: 'author', cls: 'author' })) + kickLine(psPost, { lead: psPost.psNo ? `No. ${psPost.psNo}` : '' }), after: peekLine() + sideStacksHtml(psPost) })}
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
  // EVERY REVIEW TURNED OVER (2026-09-22): the picture's frame on top,
  // the title column under it (.latest-cell--contra-rev on every cell)
  const contra = contraPost ? `<div class="latest-cell latest-cell--contra latest-cell--contra-rev">
        <div class="latest-cover-col latest-cover-col--square">
          <a class="latest-cover latest-cover--square" href="${escapeHtml(contraPost.link)}" rel="noopener">${coverImg(contraPost)}</a>
        </div>
        <div class="latest-col">
          ${matter(contraPost, contraPost.subtitle ? `<p class="latest-dek">${contraWorkDek(contraPost.subtitle)}</p>` : '', { before: coverMetaLine(contraPost, { cls: 'author' }), after: peekLine() + sideStacksHtml(contraPost) + kickLine(contraPost) })}
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
  // (NOT PRELOADED since 2026-09-24: the page opens on the masthead a
  // window tall, and the first covers wait for the faces — see the gate,
  // THE FIRST COVERS WAIT FOR THE FACES. A preload would fetch the lead
  // at the head of the load, which is exactly what that undoes.)
  const lead = essays[0];
  const leadPreload = '';

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
        btnHref: 'archive.html#section=contra',
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
  // EVERY ESSAY TURNED (2026-09-18): picture LEFT on the lead, then
  // alternating — each card the mirror of what it was.
  blocks.push(renderMegaHero(essays[0], { rev: true, label: 'Essays', stack: 'The Latest', stackHref: 'archive.html' }));
  // The latest postscript and contra, in the hero's dress (see
  // renderLatestRow above).
  // (ONE LINE OF POSTS, 2026-09-23: every essay the one way round now —
  // picture over its words, nothing beside it to face — and the latest
  // postscript and review
  // follow it one to a row, in the essay's card)
  // (TWO ACROSS, 2026-09-23, later: the postscript and the review side by
  // side, the review's square centred on the portrait — style.css, ONE
  // LINE OF POSTS; seatRowGaps)
  blocks.push(renderMegaHero(postscripts[0], { rev: true, label: 'Postscript', kind: 'postscript', pair: contras[0] ? 'a' : '' }));
  blocks.push(renderMegaHero(contras[0], { rev: true, label: 'Contra', kind: 'contra', pair: postscripts[0] ? 'b' : '' }));
  // (SUBSCRIBE IS OFF THE FRONT PAGE'S BODY, 2026-09-19. The word stood
  // under the latest row in the sections' own dress, carrying the offer
  // as a courier line beneath it — both are struck. The offer is made
  // in the corner box now (renderSubscribeBox), which asks for the
  // reader once rather than standing in the middle of the reading.
  // SUBSCRIBE_ABOVE and SUBSCRIBE_BELOW stay declared against its
  // return; the banner was:
  //   blocks.push(renderBanner({ word: 'Subscribe', href: `${SITE_URL}/subscribe`,
  //     modifier: 'subscribe-word page-banner--apart',
  //     above: SUBSCRIBE_ABOVE, below: SUBSCRIBE_BELOW })
  //     .replace('class="page-banner', 'class="ops-word page-banner'));
  // — .ops-word kept it out of the movement loop's banner test so it
  // stood in the body between the rows, the next row opening 72 under
  // its feet as under any section word.)
  void SUBSCRIBE_ABOVE; void SUBSCRIBE_BELOW;
  // The SECOND essay as a mirrored hero inside the first movement —
  // cover left, ground right — then the next postscript/contra pair
  // MIRRORED too: contra left, postscript right with its text in the
  // middle and its cover closing the row's right end. Both keep the
  // lead seat (the rail is on the right up here, so no m2).
  blocks.push(renderMegaHero(essays[1], { rev: true, label: 'Essays', align: 'r' }));
  blocks.push(renderMegaHero(postscripts[1], { rev: true, label: 'Postscript', kind: 'postscript', pair: contras[1] ? 'a' : '' }));
  blocks.push(renderMegaHero(contras[1], { rev: true, label: 'Contra', kind: 'contra', pair: postscripts[1] ? 'b' : '' }));
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
  // EACH SECTION'S WORD CARRIES ITS LINE (2026-09-18): one courier
  // sentence under the word, inside the 72 under its feet, seated the
  // way SUBSCRIBE's offer is (fitSubscribeLines, .page-banner--apart).
  blocks.push(renderBanner({ word: 'Essays', href: SECTION_BANDS.essays.href, modifier: 'subscribe-band page-banner--apart page-banner--section', below: ['The great writing of our generation.'] }));
  // THE SECOND MOVEMENT, under the band: the next essay as a
  // MIRRORED hero (cover left, ground right, labelled Essay), then
  // the next contra/postscript pair mirrored the same way.
  // THE ESSAYS OPEN ON THE BASE BUILD — title column LEFT, cover
  // right, as the page's own hero — and alternate from there: base,
  // mirrored, base, mirrored, base. essays[0] and [1] are spent in the
  // first movement, so this movement reads from [2] and repeats
  // nothing.
  // (the essays' words alternate sides down the page, left then right,
  // counted from the lead: [0] left, [1] right, [2] left… — 2026-09-24)
  blocks.push(renderMegaHero(essays[2], { rev: true, label: 'Essays', m2: true }));
  blocks.push(renderMegaHero(essays[3], { rev: true, label: 'Essays', m2: true, align: 'r' }));
  blocks.push(renderMegaHero(essays[4], { rev: true, label: 'Essays', m2: true }));
  blocks.push(renderMegaHero(essays[5], { rev: true, label: 'Essays', m2: true, align: 'r' }));
  blocks.push(renderMegaHero(essays[6], { rev: true, label: 'Essays', m2: true }));
  // EVENTS closes the essays — the word alone, like STORE.
  blocks.push(renderBanner({ word: 'Postscript', href: SECTION_BANDS.postscript.href, modifier: 'events-band page-banner--apart page-banner--section', below: ['TNC editors interview extraordinary gen zers.'] }));
  // THE POSTSCRIPTS' MOVEMENT: three rows under EVENTS — the base
  // build, then the pair MIRRORED, then the base again. All three
  // keep the base SEAT (the strip is back on the right down here), so
  // the middle one mirrors its contents without moving its box.
  // The contras have left these rows — this movement is postscripts
  // alone, each row's two columns splitting the whole measure. In
  // every pair the LEFT cell reads turned over (renderPostscriptPair),
  // so the two pictures stand together at the row's centre.
  // (one to a row since ONE LINE OF POSTS, 2026-09-23 — the pairs are
  // retired; renderPostscriptPair stands for the word pages)
  // (two across since 2026-09-23, later)
  // (a post with no partner stands alone, centred)
  const pairOf = (list, i) => (i % 2 ? 'b' : (list[i + 1] ? 'a' : ''));
  postscripts.slice(2, 8).forEach((p, i, l) => blocks.push(renderMegaHero(p, { rev: true, label: 'Postscript', kind: 'postscript', pair: pairOf(l, i) })));
  // The middle pair reads REVERSED — cover right, text left.
  // The middle pair used to mirror (picture on the other side); every
  // pair reads the same way now.
  // And a third pair back in the base build — covers on the left.
  // STORE closes the postscripts — the word alone, no courier line.
  blocks.push(renderBanner({ word: 'Contra', href: SECTION_BANDS.contra.href, modifier: 'store-band page-banner--apart page-banner--section', below: ['New Critics take on gen z’s best and worst.'] }));
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
  // (one to a row since ONE LINE OF POSTS, 2026-09-23)
  // (two across since 2026-09-23, later)
  contras.slice(2, 8).forEach((p, i, l) => blocks.push(renderMegaHero(p, { rev: true, label: 'Contra', kind: 'contra', pair: pairOf(l, i) })));
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
  // THE ESSAYS STAND ON THE MARK (2026-09-22), AND THE REVIEWS: their
  // movements carry .on-mark, and the sheet grounds each in the mark's
  // colour from halfway up its own word's ink to halfway down the next
  // word's — or, for the last movement, on to the page's foot, which
  // takes the mark with it (renderPageFoot's onMark; style.css, THE
  // ESSAYS STAND ON THE MARK). A class of its own rather than
  // .m--essays, which the word pages give every movement after their
  // first.
  // (…ON THE CHARCOAL since THE SECTIONS ARE CHARCOAL, 2026-09-23; the
  // latest and the postscripts stand on the white, and the colophon and
  // the reprint under the reviews are white too.)
  // (THE LATEST STANDS ON THE WHITE again, 2026-09-23: it was marked for
  // an evening; the name's opening screen keeps its charcoal — style.css,
  // THE LATEST STANDS ON THE WHITE.)
  const ON_MARK = ['essays', 'contra'];
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
  // THE HEADER TURNED OVER: the first movement opens on its band —
  // pinned to the screen's top from the first pixel — then the blue
  // field, then the wordmark in the flow under both, its foot on the
  // fold. Scrolling, the field shrinks under the pinned band until it
  // is gone, and the wordmark then passes under the band the way every
  // row does (see THE HEADER TURNED OVER in style.css). The wordmark
  // is the site header itself, moved here from the top of the body.
  // ONE BAND FOR THE WHOLE SITE. The masthead's band stands in
  // .page-rows AHEAD of the first movement, so its sticky box is the
  // page itself: pinned to the screen's top from the first pixel to
  // the last screen, where the reprint overtakes it. The sections
  // carry no band of their own any more (and no field): their words
  // pass under this one the way the wordmark does.
  const openMovement = (m) => {
    const head = m === 'latest'
      ? `\n  ${renderSectionBand(m)}\n  ${subTicker('head')}\n  <div class="head-field" aria-hidden="true"></div>\n  <div class="movement m--${m}${ON_MARK.includes(m) ? ' on-mark' : ''}">\n${renderHeader()}`
      : `\n  <div class="movement m--${m}${ON_MARK.includes(m) ? ' on-mark' : ''}">`;
    // THE LATEST, over the first row (2026-09-23): the section's name in
    // the body's Garamond, seated by the fitter (seatRowGaps) 36 under the
    // head band, the first row 36 under it
    // (the ticker stands in the rows now, under the band — 2026-09-24)
    const lead = m === 'latest' ? `\n  <h2 class="latest-head">The Latest</h2>` : '';
    duoHtml += `${head}\n  <div class="movement-body">${lead}`; open = true;
  };
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
    const isWord = /class="ops-word/.test(block);
    const last = i === blocks.length - 1;
    const nextIsWord = !last && /class="ops-word/.test(blocks[i + 1]);
    // AN IN-MOVEMENT WORD (SUBSCRIBE): straight into the body, no wrap,
    // no divider before or after it.
    if (isWord) {
      const mw = MOVEMENTS[Math.min(movement, MOVEMENTS.length - 1)];
      if (!open) openMovement(mw);
      duoHtml += `\n  ${block}`;
      return;
    }
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
      // THE WORD OPENS THE SECTION, THE BAND UNDER IT: the poster word
      // first, then the courier band (the magazine's name, the
      // section's line, its subjects), then the body.
      // A SPACER UNDER THE WORD, before the band: a screen of the
      // word's own ground (fitWordSpacers sizes it to the viewport less
      // the word and the band), so the section's band arrives at the
      // fold's foot as the word pins.
      // (The word's field and the section's own band are struck: the
      // masthead's band holds through the whole site, and the word
      // scrolls under it in the flow, its rows 72 under its feet.)
      duoHtml += `\n  <div class="movement m--${m}${ON_MARK.includes(m) ? ' on-mark' : ''}">\n  ${block}\n  <div class="movement-body">`;
      open = true;
      return;
    }
    const m = MOVEMENTS[Math.min(movement, MOVEMENTS.length - 1)];
    if (!open) openMovement(m);
    duoHtml += `
  <div class="wrap m--${m}">
    ${block}
  </div>${last || nextIsWord ? '' : `\n  <div class="row-divider m--${m}"></div>`}`;
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
  // TWO SCHEMES, ALTERNATING: white on charcoal, charcoal on white,
  // and the word alone turns pink under the pointer (style.css). The
  // pink grounds are struck — five schemes over five banners read as
  // five different ideas rather than one deck.
  const STACK = [
    { word: 'Archive', href: 'archive.html', scheme: 'wb' },
    { word: 'About', href: 'about.html', scheme: 'bw' },
    { word: 'Store', href: `${SITE_URL}/subscribe`, scheme: 'wb' },
    { word: 'Events', href: `${SITE_URL}/subscribe`, scheme: 'bw' },
    // (SUBSCRIBE left the deck for the first movement, under the
    // latest row.)
  ];
  // (THE DECK IS STRUCK: no closing stack — the page goes from the
  // last review row straight to the reprint. STACK stays declared
  // against its return.)
  void STACK;
  duoHtml += renderPageFoot(true, ON_MARK.includes(MOVEMENTS[Math.min(movement, MOVEMENTS.length - 1)]));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#FFFFFF">
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
<link rel="preconnect" href="https://use.typekit.net" crossorigin>
<link rel="preconnect" href="https://substackcdn.com">
<link rel="stylesheet" href="https://use.typekit.net/fnn8swo.css">
<link rel="stylesheet" href="style.css?v=${BUILD_STAMP}">
${renderFontGateScript()}
${renderImgFadeScript()}
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

<!-- (The site header — the wordmark — stands INSIDE the first
     movement now, under its band and the blue field: see
     openMovement. The head rule and the dek band below stay, empty
     and flat, because the fitters still measure them.) -->

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

  <!-- THE MARGINS TAKE THE ESSAYS' MARK: the two 72s painted in the
       page from ESSAYS' ink middle to POSTSCRIPT's, over the window's
       fixed margins (style.css, THE ESSAYS STAND ON THE MARK; seated
       by seatMarkGutters). Ahead of the rows, never between two
       movements, where it would part the pair .movement + .movement
       pulls together. -->
  <div class="mark-gutters" aria-hidden="true"></div>

  <div class="page-rows" id="top">
${duoHtml}
  </div>

  <!-- THE MOVEMENTS' RAILS: the header's own ends at SUBSCRIBE;
       ESSAYS takes the LEFT from there to EVENTS, and POSTSCRIPT the
       RIGHT from EVENTS to the reprint. Each rides, pins at the 48
       line and is pushed off by its track's end. -->
  <!-- (The movements' rails are retired: each movement carries its
       section band at its head instead — see renderSectionBand.) -->

  <!-- (The reprint stands inside .page-rows now, at the head of the
       page's closing screen — see the foot above.) -->

  <!-- (The colophon stands in the last section's foot band now —
       renderColophonBand.) -->
${renderMarginalia()}
</main>

${renderFooter()}

${renderCaterpillarScript()}
${renderFoilPourScript()}
${renderDuoPanelFitScript()}
${renderRectClickScript()}
${renderCardOpenScript()}
${renderChromeOpenScript()}
${renderCoverColorScript()}
${renderCopyLinkScript()}
${renderLineDrawScript()}
${renderRailFixScript()}
${renderBandMarkScript()}
${renderCoverCueScript()}
${renderCardRevealScript()}
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
// whatever motion remains happens off stage. The reveal waits two frames
// past fonts.ready so the fitters have seated the wordmark, then fades
// the body up over the charcoal ground. The cap holds the wait at
// 1000ms — a slow or dead font host degrades to the old behaviour, a
// fallback paint and one refit, rather than a blank page.
// (Its commentary comes out at build time like the body scripts' —
// slimJs — since 2026-09-24: half of the head's weight was the notes.)
function renderFontGateScript() {
  return slimJs(`<style>html.fonts-loading body{opacity:0}body{transition:opacity .25s ease}</style>
<script>
(function () {
  var root = document.documentElement;
  // LIGHT OR DARK, before first paint: the stored choice, else light.
  // GHOST WHITE (2026-09-18): the one white on the site — the light
  // ground and the dark ink.
  var WHITE = '#FFFFFF', CHARCOAL = '#121417';
  // HEX SETS THE MARK, NOT THE GROUND (2026-09-21). The third word in
  // the margin used to paint the page's ground in a colour of the
  // reader's own, with the ink turned white on it. It names the
  // HIGHLIGHT now: every yellow on the site reads one token, --nc-mark
  // (style.css, THE MARK'S COLOUR IS ONE TOKEN), and a code typed here
  // is written onto the root in its place. The ground is light or dark
  // and nothing else; the mark rides over both and is kept separately,
  // so turning the page over does not lose it.
  // (YELLOW names the DEFAULT mark, whatever colour that is: the banana
  // when this was written, the blue #1182c2 for a day, the banana
  // again on the 22nd, and #1184C4 from later that day. It must match
  // --nc-mark in style.css. Written in lower case, the form hexOf
  // returns, so a reader typing the default's own code is sent home
  // rather than stored — the banana's capitals never compared equal.)
  var YELLOW = '#1184c4';
  var hexOf = function (v) {
    var m = /^\s*#?([0-9a-f]{3}|[0-9a-f]{6})\s*$/i.exec(v || '');
    if (!m) return null;
    var h = m[1].toLowerCase();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return '#' + h;
  };
  // THE INK ON THE BLOCK IS CHOSEN BY CONTRAST. On the yellow it is the
  // charcoal, stated in the sheet; on a reader's colour it is whichever
  // of the charcoal and the white reads better (WCAG relative
  // luminance), so a navy or a black does not swallow the word it was
  // put behind. (A hex GROUND gave this rule up and inked everything
  // white; a block is a few words wide, and those words are the ones
  // the reader is pointing at.)
  var lum = function (hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  var inkOn = function (hex) {
    var l = lum(hex);
    var onWhite = (lum(WHITE) + 0.05) / (l + 0.05);
    var onCharcoal = (l + 0.05) / (lum(CHARCOAL) + 0.05);
    return onWhite > onCharcoal ? WHITE : CHARCOAL;
  };
  var setMeta = function (colour) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = colour;
  };
  // Paints the ground: light is the page's own, dark is written on the
  // root. (The inline --g and --k a hex ground wrote are cleared for
  // any page still carrying them from a view transition's old state.)
  var paint = function (mode) {
    root.style.removeProperty('--g');
    root.style.removeProperty('--k');
    root.style.removeProperty('--yves');
    if (mode === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    setMeta(mode === 'dark' ? CHARCOAL : WHITE);
  };
  // Paints the mark: the reader's colour and the ink that stands on it,
  // or — for no colour, or the yellow's own code — nothing at all, and
  // the sheet's yellow and charcoal stand.
  var mark = function (hex) {
    if (hex && hex !== YELLOW) {
      root.style.setProperty('--nc-mark', hex);
      root.style.setProperty('--hl-ink', inkOn(hex));
    } else {
      root.style.removeProperty('--nc-mark');
      root.style.removeProperty('--hl-ink');
    }
  };
  var store = function (mode) {
    try { localStorage.setItem('nc-theme', mode); } catch (err) {}
  };
  var storeMark = function (hex) {
    try {
      if (hex && hex !== YELLOW) localStorage.setItem('nc-accent', hex);
      else localStorage.removeItem('nc-accent');
    } catch (err) {}
  };
  var accent = null;
  try {
    var theme = localStorage.getItem('nc-theme');
    // THE READERS WHO STOOD ON A HEX GROUND come back to the light page,
    // which is the default, and their stored ground is NOT carried over
    // as a mark: it was chosen (or handed out — the slate #556677) to be
    // stood on in white ink, and as a highlight it is a colour nobody
    // picked. The old keys are struck so this runs once.
    if (theme === 'hex') {
      theme = 'light';
      try {
        localStorage.setItem('nc-theme', 'light');
        localStorage.removeItem('nc-hex');
        localStorage.removeItem('nc-hex-auto');
      } catch (e2) {}
    }
    // THE MODE WORDS ARE STRUCK (2026-09-23): with no Light, Dark or Hex
    // left in the margin a stored choice could not be taken back, so
    // none is applied — every reader has the light page and the blue.
    void theme;
  } catch (e) {}
  // A LOOK WITHOUT A CHANGE (2026-09-18): ?hex=888899 in the address
  // paints that mark for this view only — nothing is stored, and the
  // reader's own choice stands on the next plain visit.
  try {
    var qHex = hexOf(new URLSearchParams(location.search).get('hex'));
    if (qHex) mark(qHex);
  } catch (e) {}
  // THE FLIP IS ONE CROSSFADE OF THE WHOLE PAGE (2026-09-17, later):
  // where the browser has view transitions the old page and the new
  // are snapshotted whole and dissolved one into the other over .3s —
  // every colour, ground, rule, picture and the canvas together, with
  // no per-element transition running underneath (html.theme-instant
  // holds every transition off for the change's frame, so the new
  // snapshot is the settled page). Elsewhere the per-element ease
  // above stands in.
  var flipTimer = null;
  var flip = function (mode) {
    store(mode);
    var change = function () { paint(mode); };
    if (document.startViewTransition) {
      root.classList.add('theme-instant');
      var done = function () { root.classList.remove('theme-instant'); };
      var vt;
      try { vt = document.startViewTransition(change); } catch (err) { change(); done(); return; }
      if (vt && vt.finished && vt.finished.then) vt.finished.then(done, done);
      // A skipped transition (a hidden tab, a second flip mid-dissolve)
      // rejects every one of its promises; none is an error here.
      var quiet = function () {};
      if (vt && vt.ready && vt.ready.then) vt.ready.then(quiet, quiet);
      if (vt && vt.updateCallbackDone && vt.updateCallbackDone.then) vt.updateCallbackDone.then(quiet, quiet);
      // A hidden tab may never run the animation; let go regardless.
      setTimeout(done, 800);
      return;
    }
    root.classList.add('theme-flip');
    clearTimeout(flipTimer);
    flipTimer = setTimeout(function () { root.classList.remove('theme-flip'); }, 350);
    change();
  };
  var current = function () {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  };
  // THE HEX FIELD: a courier line under the three words, shown on HEX
  // and hidden on Enter, Escape or leaving it. A valid code paints the
  // mark as it is typed (the transitions are simply held off for the
  // change); an invalid one paints nothing; and a field EMPTIED gives
  // the yellow back, which is the only way home short of typing its
  // code.
  var field = null;
  var openField = function () {
    field = field || document.querySelector('.theme-hex');
    if (!field) return;
    field.value = accent || YELLOW;
    field.hidden = false;
    field.focus();
    // The caret at the end of the code, nothing highlighted: the
    // field opens to be typed into, not swept.
    try { var n = field.value.length; field.setSelectionRange(n, n); } catch (err) {}
  };
  var closeField = function () {
    if (field) field.hidden = true;
  };
  var typed = function () {
    var bare = /^\s*#?\s*$/.test(field.value);
    var hex = bare ? null : hexOf(field.value);
    if (!hex && !bare) return;
    accent = hex && hex !== YELLOW ? hex : null;
    root.classList.add('theme-instant');
    mark(accent);
    storeMark(accent);
    setTimeout(function () { root.classList.remove('theme-instant'); }, 50);
  };
  // HEX IS NOT A THIRD GROUND: the word opens its field and changes
  // nothing until a code is typed. Light and Dark turn the page over
  // and leave the mark where it is.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.theme-toggle');
    if (!b) return;
    var t = e.target.closest('.theme-toggle-light, .theme-toggle-dark, .theme-toggle-hex');
    if (t && t.classList.contains('theme-toggle-hex')) { openField(); return; }
    var mode = t ? (t.classList.contains('theme-toggle-light') ? 'light' : 'dark')
      : (current() === 'light' ? 'dark' : 'light');
    closeField();
    if (mode !== current()) flip(mode);
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('theme-hex')) typed();
  });
  document.addEventListener('keydown', function (e) {
    if (!(e.target && e.target.classList && e.target.classList.contains('theme-hex'))) return;
    if (e.key === 'Enter') { e.preventDefault(); typed(); closeField(); }
    if (e.key === 'Escape') { e.preventDefault(); closeField(); }
  });
  document.addEventListener('focusout', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('theme-hex')) closeField();
  });
  root.classList.add('fonts-loading');
  // THE PAGE ARRIVES WHOLE (2026-09-17). Every page is held at opacity
  // 0 until its fonts are in AND every cover on it is loaded and
  // decoded, then fades up once, as one — the words in their faces
  // and the pictures beside them together, on a hard refresh as on
  // a warm one. No cover arrives after the words next to it and no
  // fallback face is ever painted. The one exception is a dead font
  // or picture host: after eight seconds the page lifts with what it
  // has rather than never.
  var shown = false;
  var gate = { fonts: 0, covers: 0, fitted: 0, lifted: 0 };
  try { window.__ncGate = gate; } catch (err) {}
  // THE SAME FADE ON A CLICK AS ON A COLD LOAD (2026-09-17, later).
  // Chrome holds the OLD page's pixels on a same-site navigation until
  // the new page's first contentful frame, or half a second. A word
  // page reached by a click has its faces and covers cached and is
  // ready in a fraction of that, so its fade ran under the held
  // homepage and was mostly swallowed: the reader saw a cut where the
  // front page, whose fitters take longer, shows its ground and then
  // fades up. So no page lifts before the hold has expired: the lift
  // waits out the floor (measured from the navigation itself, so a
  // slow load pays nothing), the ground is seen, and the fade is the
  // same everywhere.
  var FLOOR = 600;
  var go = function () {
    if (shown) return;
    shown = true;
    var wait = Math.max(0, FLOOR - performance.now());
    setTimeout(reveal, wait);
  };
  var reveal = function () {
    var lifted = false;
    var lift = function () {
      if (lifted) return;
      lifted = true;
      gate.lifted = performance.now();
      root.classList.remove('fonts-loading');
      setTimeout(function () {
        root.classList.add('page-shown');
        // The fade is over: the fitter may take the thread for the rest
        // of the page (src/duo-panel-fit.js, THE PAGE IS FITTED IN TWO
        // STAGES) without stalling the dissolve the reader is watching.
        try { window.__ncShown = true; } catch (err) {}
        try { window.dispatchEvent(new Event('newcritic:shown')); } catch (err) {}
      }, 400);
    };
    // Two frames past ready, so the fitters (which run on fonts.ready)
    // have laid the page out before it is seen.
    requestAnimationFrame(function () { requestAnimationFrame(lift); });
    // A hidden tab runs no frames; lift on a timer there so the page
    // is never left held when the tab is shown.
    setTimeout(lift, 250);
  };
  // THE FONTS: the five faces the page sets in, then the whole set.
  var fontsDone = new Promise(function (resolve) {
    var f = document.fonts;
    if (!f || !f.load) { resolve(); return; }
    Promise.all([
      f.load('700 100px helvetica-neue-lt-pro'),
      f.load('400 100px helvetica-neue-lt-pro'),
      f.load('italic 400 100px futura-pt'),
      // (The chips' face is the system's Courier since 2026-09-22 —
      // nothing to wait on.)
      f.load('400 100px courier-std'),
      f.load('400 100px garamond-premier-pro'),
      f.load('italic 400 100px garamond-premier-pro'),
      f.load('700 100px garamond-premier-pro'), // the corner box's price
      f.load('400 100px trajan-pro-3'),
      f.load('700 100px trajan-pro-3')
    ]).then(function () { return f.ready; }).then(resolve, resolve);
  }).then(function () {
    gate.fonts = performance.now();
    // Said out loud for the fitter (src/duo-panel-fit.js), which holds
    // its first pass for the faces and cannot ask this promise itself:
    // a flag for a listener that arrives late, an event for one that
    // is already waiting.
    try { window.__ncFontsIn = true; } catch (err) {}
    try { window.dispatchEvent(new Event('newcritic:fontsin')); } catch (err) {}
  });
  // THE COVERS: the ones the page HOLDS for, loaded (or failed) and then
  // decoded, so the first paint has their pixels ready. That was every
  // cover on the page and is the front page's first three now, marked
  // at build time (build.js, holdFirstCovers); the rest are lazy and
  // fade up as they land. A page that marks none holds for none.
  var HOLD = 'img.card-image[data-hold]';
  // ONLY A COVER THE FIRST SCREEN SHOWS HOLDS IT (2026-09-24). The page
  // opens on the masthead standing a whole window tall (src/chrome-
  // open.js), so the three first covers are all below the fold when the
  // page is shown — and their cards stand unseen until the whole page is
  // fitted and each has its picture decoded (src/card-reveal.js). The
  // lift waited out a megabyte and a half of pictures no reader could
  // see yet, sharing the line with the faces the masthead is set in.
  // The three are still asked for first; the gate holds only for those
  // whose box meets the window when it looks (none, on a fresh visit).
  var held = function () {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return [].filter.call(document.querySelectorAll(HOLD), function (img) {
      var r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < vh && r.width > 0;
    });
  };
  // AND THE FIRST COVERS WAIT FOR THE FACES (2026-09-24). Asked for at
  // the head of the load, the three came down beside the faces and took
  // the larger part of the line from them — a megabyte and a half
  // against half a megabyte of type — so on an ordinary phone line the
  // masthead's faces landed a third of a second later than they would
  // alone, and the page with them (measured at 1440 on a 9 Mbps line:
  // faces 1.47s with the covers, 1.14s without). The faces are what the
  // first screen is set in; the covers are not seen until the page is
  // fitted whole, seconds later. So the three are printed lazy (the
  // browser's look-ahead leaves a lazy picture alone), their sources are
  // lifted off here as the parser lays them down — before any layout
  // could ask for them — and handed back the moment the faces are in,
  // asked for at once. Without script they are ordinary lazy pictures.
  var parked = [];
  var park = function (img) {
    if (img.__ncParked || unparked) return;
    img.__ncParked = true;
    ['srcset', 'src'].forEach(function (a) {
      var v = img.getAttribute(a);
      if (v != null) { img.setAttribute('data-nc-' + a, v); img.removeAttribute(a); }
    });
    parked.push(img);
  };
  var unparked = false;
  var unpark = function () {
    if (unparked) return;
    unparked = true;
    if (mo) mo.disconnect();
    parked.forEach(function (img) {
      img.loading = 'eager';
      ['srcset', 'src'].forEach(function (a) {
        var v = img.getAttribute('data-nc-' + a);
        if (v != null) { img.setAttribute(a, v); img.removeAttribute('data-nc-' + a); }
      });
      img.__ncParked = false;
    });
    parked = [];
  };
  var mo = window.MutationObserver ? new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      var added = recs[i].addedNodes;
      for (var k = 0; k < added.length; k++) {
        var n = added[k];
        if (n.nodeType !== 1) continue;
        if (n.matches(HOLD)) park(n);
        else if (n.firstElementChild) [].forEach.call(n.querySelectorAll(HOLD), park);
      }
    }
  }) : null;
  if (mo) {
    mo.observe(root, { childList: true, subtree: true });
    fontsDone.then(unpark, unpark);
    // never parked for long, whatever the faces do
    setTimeout(unpark, 2500);
  }
  var coversDone = new Promise(function (resolve) {
    var settle = function () {
      // The decode is asked for, not waited on past a beat: a hidden
      // tab decodes nothing until it is shown (its decode() promises
      // simply hang), and a page opened in the background should not
      // stand blank for the cap once it is brought forward.
      var imgs = held();
      if (document.visibilityState === 'hidden') { resolve(); return; }
      var decodes = imgs.map(function (img) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      });
      var beat = new Promise(function (r) { setTimeout(r, 600); });
      Promise.race([Promise.all(decodes), beat]).then(resolve, resolve);
    };
    var pending = function () {
      var imgs = held();
      for (var i = 0; i < imgs.length; i++) if (!imgs[i].complete || imgs[i].__ncParked) return true;
      return false;
    };
    var watch = function () {
      if (!pending()) { settle(); return; }
      var onArrive = function (e) {
        if (!(e.target && e.target.tagName === 'IMG')) return;
        if (pending()) return;
        document.removeEventListener('load', onArrive, true);
        document.removeEventListener('error', onArrive, true);
        settle();
      };
      document.addEventListener('load', onArrive, true);
      document.addEventListener('error', onArrive, true);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
    else watch();
  }).then(function () { gate.covers = performance.now(); });
  // THE FIT: the page laid out whole before it is shown. This used to
  // be free — the fitters' first pass ran synchronously during parse,
  // so the parser could not reach the end of the body (and neither
  // promise above could settle) until the page was fitted. That pass
  // is struck (src/duo-panel-fit.js: it measured fallback metrics and
  // was thrown away entire by the pass that followed the fonts), and
  // the guarantee is held here instead: the fitter announces its first
  // completed pass and the gate waits for it. The flag is checked
  // before the listener because this runs in the HEAD, long before the
  // fitter has parsed — but also long before it could have announced,
  // so the listener is what actually answers on every real load.
  var fitDone = new Promise(function (resolve) {
    if (window.__ncFitDone) { resolve(); return; }
    addEventListener('newcritic:fitdone', function () { resolve(); }, { once: true });
  }).then(function () { gate.fitted = performance.now(); });
  Promise.all([fontsDone, coversDone, fitDone]).then(go, go);
  setTimeout(go, 8000);
  // Pulled back by the reader (the back/forward cache restores the
  // page whole, with its class already lifted): nothing to do — but a
  // page restored still held is let go at once.
  addEventListener('pageshow', function (e) { if (e.persisted) { shown = true; reveal(); } });
})();
</script>`);
}

// The held head — the mini-rail and the hero's courier line hold at 48
// on scroll while the hero slides under the divider (src/rail-fix.js).
function renderRailFixScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/rail-fix.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// THE WORDMARK'S MINIATURE IN THE BAND — the date goes as the
// wordmark's ink touches the pinned band's rule, and a miniature of
// the name descends into the band as the ink passes under, settling
// centred when the feet have gone (src/band-mark.js).
function renderBandMarkScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/band-mark.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// READ NOW RIDES WITH THE POINTER over a cover, inside the picture's
// own outline, tucking under the hand where the frame's edge is close
// (src/cover-cue.js). The grey the cover takes under the hand is the
// stylesheet's; this is the errand said out loud beside it.
function renderCoverCueScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/cover-cue.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// EACH CARD ARRIVES WHOLE: a front-page card fades in as one — picture,
// courier and title — as the reader scrolls it into the window, its
// picture fetched and decoded before it is shown (src/card-reveal.js;
// style.css, EACH CARD ARRIVES WHOLE).
function renderCardRevealScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/card-reveal.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// A post card opens on its COVER and closes only when the pointer leaves
// the card entirely (src/card-open.js) — a state :has() cannot express,
// having no memory of how it began.
function renderCardOpenScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/card-open.js'), 'utf8'))
    + '\n' + slimJs(fs.readFileSync(path.join(__dirname, 'src/essay-acts.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// THE OPENING: every chrome block stands a viewport tall when the site
// opens and folds to its settled height on the first scroll, one-way
// (src/chrome-open.js).
function renderChromeOpenScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/chrome-open.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// The duo/trio/quad row panels live on the homepage and the essays/
// postscript/contra pages (see renderListPage's extraScripts) — the other
// shell pages (about, give, archive) have none, so this stays out of
// renderPageShell's fixed script set.
function renderDuoPanelFitScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/duo-panel-fit.js'), 'utf8'));
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

  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/cover-color.js'), 'utf8'));
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
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/copy-link.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

function renderLineDrawScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/line-draw.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// The about page's section toggle — see renderAboutPage / src/about-panel.js.
function renderAboutPanelScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/about-panel.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

function renderCaterpillarScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/caterpillar.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// THE POUR: reseeds the masthead's foil plate per visit (src/
// foil-pour.js sets --foil-uri; the stylesheet's baked crumple is the
// no-JS fallback). Ships with every page that carries the masthead —
// all of them.
function renderFoilPourScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/foil-pour.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// THE SUBSCRIBE BOX (2026-09-19): the yellow panel in the bottom right
// corner of every page — the About page's own pitch, SUBSCRIBE in the
// title face's capitals over it, and the archive ledger's X (the same
// 20 viewBox and the same two strokes at 1.6 as .arch-clear-x) in the
// corner opposite. Ships HIDDEN and is dealt by src/subscribe-box.js,
// which also decides what shuts it: a reader with no JavaScript is
// never handed a panel they could not shut.
// (STRUCK FROM THE PAGES, 2026-09-23: the subscribe ticker under the
// head band asks instead — subTicker. Kept for its markup and script.)
function renderSubscribeBox() {
  return `
<aside class="sub-box" aria-label="Subscribe to The New Critic" hidden>
  <p class="sub-box-head">
    <a class="sub-box-word" href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a>
    <button class="sub-box-x" type="button" aria-label="Dismiss">
      <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
  </p>
  <div class="sub-box-body">
    <p>${SUBSCRIBE_PITCH_HTML}</p>
    <ol class="sub-box-list">
${SUBSCRIBE_GETS.map((g) => `      <li>${g}</li>`).join('\n')}
    </ol>
  </div>
</aside>`;
}

function renderSubscribeBoxScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/subscribe-box.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// THE WHOLE TITLE-AND-DEK RECTANGLE OPENS THE POST (src/rect-click.js).
// It reads the union the fitter writes (--tx-* on the title) and tests
// a click against it, so the half of the mark that is the dek is a way
// in like the half that is the title. Ships after the fitter, which is
// what writes the offsets it reads.
function renderRectClickScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/rect-click.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// Head-inlined, unlike the body scripts above: it must arm the .imgfade
// gate and its capture-phase load listener before the first <img> is
// parsed, or early covers could paint-then-hide (a flash) or load before
// anyone's listening (stuck invisible). See src/img-fade.js.
function renderImgFadeScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/img-fade.js'), 'utf8'));
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

// ---------- WHAT THE PAGE SHIPS IS SLIMMER THAN WHAT IS WRITTEN ----------
// The stylesheet is two-thirds commentary by weight and the fitter is
// nearly half; the reader downloads none of it. Comments come out at
// build time — /* */ blocks from the CSS (it has no other kind, and no
// string on it holds one), and whole-line // comments from the scripts
// (none of them carries a template literal, so no line inside a string
// can begin that way) — and the blank lines they leave go with them.
// The sources stay as they are.
function slimCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n');
}
function slimJs(js) {
  return js.replace(/^[ \t]*\/\/[^\n]*\n/gm, '').replace(/\n\s*\n+/g, '\n');
}
// THE PAGE KNOWS WHETHER IT HAS HERO CARDS. body:has(.card--mega) and
// main:has(.card--mega) were static questions asked of a live selector —
// and a :has() on the whole page is re-checked on every mutation under
// it, which the fitter makes by the hundred. The answer is printed as a
// class on both (style.css reads body.has-mega / main.has-mega, at the
// same weight). The test is a class TOKEN in a class attribute, not the
// bare word: the inlined fitter names .card--mega in its own text on
// every page, and card--mega-rev is not card--mega.
function markMega(html) {
  // A page carrying the front page's cards in a feature block (the
  // archive's, About's) takes the marks too, hero or no hero: the
  // cards' rules and the fitter read them.
  if (!/class="(?:[^"]*\s)?(?:card--mega|ledger-feature|word-page)(?:\s[^"]*)?"/.test(html)) return html;
  // The ROOT carries the mark too: the canvas behind the page — what
  // shows when the reader pulls past the foot — is painted from the
  // root's own background (style.css, html.has-mega).
  return html
    .replace(/<html(\s[^>]*)?>/, (m, attrs) => /class="/.test(attrs || '')
      ? m.replace('class="', 'class="has-mega ')
      : `<html${attrs || ''} class="has-mega">`)
    .replace(/<body(\s[^>]*)?>/, (m, attrs) => /class="/.test(attrs || '')
      ? m.replace('class="', 'class="has-mega ')
      : `<body${attrs || ''} class="has-mega">`)
    .replace('<main id="main">', '<main id="main" class="has-mega">');
}

// ---------- THREE COVERS HOLD THE PAGE, NOT TWENTY-THREE (2026-09-21) ----
// Every cover was `loading="eager"` and the gate in the head held the
// page at opacity 0 until ALL of them had loaded and decoded — the six
// reviews five screens down included. Measured on a retina laptop that
// is eight to twelve megabytes standing between the reader and the
// masthead: invisible on a fast line, where the covers beat the fitter
// home, and the whole of the wait on an ordinary one, up to the gate's
// eight-second cap.
//   The front page now holds for its FIRST THREE covers — the hero and
// the pair under it, which is what a reader opens on — and marks them
// (data-hold) for the gate to find; those three are asked for first
// (fetchpriority high). Every other cover is `loading="lazy"`: the
// browser fetches it as the reader comes near, and src/img-fade.js
// already fades a late cover up on arrival, so it lands the way a cover
// always has. It is safe for the fitter, which was the worry: the
// covers' boxes are CSS-sized (not one <img> carries a width or height),
// and the page was measured with every cover BLOCKED against the page
// with them all loaded — seventeen values apart, inside the seventy-
// three that two identical loads differed by. A cover arriving moves
// nothing the fitter reads.
//   Decided here, on the assembled page, because "the first three" is a
// fact about document order and no card renderer knows where it stands.
// The word pages hold for no cover at all: theirs sit below the ledger
// and the mosaic, and holding the page for those was never the intent.
// The ticker's covers are left as they are (see the note at the strip:
// lazy cannot work inside one clipped 26,500px box).
function holdFirstCovers(html, filename) {
  let held = 0;
  const hold = filename === 'index.html' ? 3 : 0;
  return html.replace(/<img class="card-image"([^>]*)>/g, (tag, rest) => {
    if (!/\sloading="eager" fetchpriority="(?:low|high)"/.test(rest)) return tag;
    if (held < hold) {
      held++;
      // (lazy in the markup since 2026-09-24, so the browser's look-
      // ahead leaves them for the gate to ask for once the faces are in:
      // renderFontGateScript, THE FIRST COVERS WAIT FOR THE FACES)
      return `<img class="card-image" data-hold${rest.replace(/\sloading="eager" fetchpriority="(?:low|high)"/, ' loading="lazy" fetchpriority="high"')}>`;
    }
    return `<img class="card-image"${rest.replace(/\sloading="eager" fetchpriority="(?:low|high)"/, ' loading="lazy"')}>`;
  });
}

function renderPageShell({ currentKey, title, description, bodyHtml, extraScripts = '', bodyClass = '', ogImage, bare = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#FFFFFF">
<title>${escapeHtml(title)} — ${escapeHtml(SITE_NAME)}</title>${description ? `
<meta name="description" content="${escapeHtml(description)}">` : ''}
${ogTags({ title: `${title} — ${SITE_NAME}`, description, pagePath: `/${currentKey}.html`, image: ogImage })}
<link rel="icon" href="favicon.png">
<link rel="preconnect" href="https://use.typekit.net" crossorigin>
<link rel="preconnect" href="https://substackcdn.com">
<link rel="stylesheet" href="https://use.typekit.net/fnn8swo.css">
<link rel="stylesheet" href="style.css?v=${BUILD_STAMP}">
${renderFontGateScript()}
${renderImgFadeScript()}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>

<a class="skip-link" href="#main">Skip to content</a>

${bare ? '' : renderHeader(currentKey)}

<main id="main">
${bodyHtml}
</main>

${bare ? '' : renderFooter()}

${renderCaterpillarScript()}
${renderFoilPourScript()}
${renderRectClickScript()}${extraScripts ? `\n${extraScripts}` : ''}
</body>
</html>`;
}

// Each section page renders every one of its posts with the same
// hover-panel cells as its homepage row (see renderDuoCard/renderDuoHalf):
// essays as two-across squares, postscript as three-across 1:2 portraits
// (card--trio), contra as three-across small squares (card--quad styling —
// same look as the homepage's quad row, one cell fewer per row).
const LIST_ROWS = {
  essays: { perRow: 2, extraClass: '', tag: 'From the Essay', btnLabel: 'Essays', btnHref: 'archive.html#section=essays' },
  postscript: { perRow: 3, extraClass: 'card--trio', tag: 'From the Interview', btnLabel: 'Postscript', btnHref: 'archive.html#section=postscript' },
  // card--quad-open lifts the homepage quad's hide-the-excerpt rules —
  // these cells are a third wider than the homepage's four-across squares,
  // wide enough to open on the review's first paragraph (see style.css).
  contra: { perRow: 3, extraClass: 'card--quad card--quad-open', tag: 'From the Review', btnLabel: 'Contra', btnHref: 'archive.html#section=contra' },
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
  const cellHtml = (p, i) => `<div class="ps-hero-cell" data-idx="${i}"${i === newestIdx ? '' : ' hidden'}>${renderDuoHalf(p, { tag: 'From the Essay', btnLabel: label, btnHref: 'archive.html#section=essays', sectionBtn: true, restChipArt: true }, 'duo-half--wide')}</div>`;
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
    extraScripts: renderDuoPanelFitScript() + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript() + renderCoverCueScript()
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
    extraScripts: renderDuoPanelFitScript() + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript() + renderCoverCueScript()
      + (headHtml ? renderContraFilterScript() : ''),
  });
}

function renderContraFilterScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/contra-filter.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

function renderEssayTickerScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/essay-ticker.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

function renderPostscriptIndexScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/postscript-index.js'), 'utf8'));
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
  const cellHtml = (p, i) => `<div class="ps-hero-cell" data-idx="${i}"${i === newestIdx ? '' : ' hidden'}>${renderDuoHalf(p, { tag: 'From the Interview', btnLabel: label, btnHref: 'archive.html#section=postscript', sectionBtn: false, restChipArt: true })}</div>`;
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
    extraScripts: renderDuoPanelFitScript() + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript() + renderCoverCueScript()
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
// THE MANIFESTO AS A CARD: the About page closes on the Secession post
// in the front page's own contra cell (renderContraCell) — cover,
// courier, title, dek and the plate — when main() finds the post in the pool;
// the preview card below is the fallback. The piece is preformatted
// (no prose paragraphs for the plate to read), so its opening lines
// are handed to the plate as paragraphs, read off the manifesto's own
// rendered blocks.
function manifestoPlateParas(html, max = 14) {
  const out = [];
  const re = /<span class="manifesto-line"[^>]*>([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(String(html || ''))) && out.length < max) {
    const t = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    if (t) out.push(t);
  }
  return out;
}
function renderAboutPage(founders = [], manifestoHtml = '', manifestoPost = null) {
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

  // ABOUT IS A MOSAIC OF CARDS under the band (renderWordPage): seven
  // cards on the charcoal, in the content cards' own cut — a courier
  // kicker over a Garamond title, an italic dek, the body in the
  // plates' 16 on 19.2, and a courier line at the foot where the cards
  // print Read Preview. Three columns across the measure, the About and
  // Give cards two wide, the Manifesto the whole row. The Letter stands
  // whole (seven paragraphs fit its card); the Manifesto is PREVIEWED —
  // its opening blocks, and READ ON goes to the post (manifestoPreview).
  // (src/about-mosaic.js lands a hash on its card and keeps the clamp
  // machinery for any card that asks for it.)
  // A card whose title already names it (Contact, Masthead) carries
  // no kicker — the courier line would only say the title
  // again. The left column's three stand on charcoal, white.
  // titleDek: the title said in the dek's own voice — the italic at 20
  // — where a card is a short thing (Masthead, Contact) and the 48
  // would shout.
  // line: a courier line UNDER the title (the Subscribe card's sign-up
  // clause), where the kicker stands over it.
  const card = ({ key, size = '', kicker = '', title = '', titleDek = false, line = '', dek = '', body = '', foot = '', clamp = false, dark = false }) =>
    `<article class="about-card${size ? ` about-card--${size}` : ''}${clamp ? ' about-card--clamped' : ''}${dark ? ' about-card--dark' : ''}" id="${key}" data-key="${key}">${kicker ? `
      <p class="about-card-kicker">${escapeHtml(kicker)}</p>` : ''}${title ? `
      <h3 class="about-card-title${titleDek ? ' about-card-title--dek' : ''}">${title}</h3>` : ''}${line ? `
      <p class="about-card-kicker about-card-line">${line}</p>` : ''}${dek ? `
      <p class="about-card-dek">${dek}</p>` : ''}${body ? `
      <div class="about-card-body">${body}</div>` : ''}${foot ? `
      <p class="about-card-foot">${foot}</p>` : ''}
    </article>`;
  const cards = [
    card({
      // No title: the card is the sentence, in the dek's voice.
      key: 'about', dark: true,
      dek: 'The New Critic is the young American magazine. We publish essays, interviews, and criticism by and for generation z.',
    }),
    card({
      // Subscribe leads in the dek's voice, linked; one sentence of
      // body under it; the list; no foot line.
      key: 'subscribe', dark: true, titleDek: true,
      title: `<a href="${SITE_URL}/subscribe" rel="noopener">Subscribe</a>`,
      body: `<p>${SUBSCRIBE_PITCH}</p>
      <ol class="mission-list">
${SUBSCRIBE_GETS.map((g) => `        <li>${g}</li>`).join('\n')}
      </ol>`,
    }),
    card({
      key: 'contact', dark: true, titleDek: true,
      title: 'Contact',
      body: `<p>To pitch, submit, or place an inquiry, email <a href="mailto:editors@thenewcritic.com">editors@thenewcritic.com</a>.</p>
      <p>Subscribe to our <a class="about-social" href="https://substack.com/@thenewcritic" rel="noopener" target="_blank">Substack</a>.<br>Follow us on <a class="about-social" href="https://www.instagram.com/the_newcritic/" rel="noopener" target="_blank">Instagram</a>.</p>`,
    }),
    card({
      key: 'masthead', dark: true, titleDek: true,
      title: 'Masthead',
      body: `<div class="mh-list">
          ${mastheadHtml}
        </div>`,
    }),
    card({
      key: 'manifesto', size: 'full', kicker: 'Manifesto',
      title: 'The New Critic Secession',
      dek: '<em>A Manifesto of 42 theses</em><br>March 24',
      body: manifestoPreview(manifestoHtml) || `<p>The manifesto is <a href="${MANIFESTO_URL}" rel="noopener" target="_blank">published here</a>.</p>`,
      foot: `<a href="${MANIFESTO_URL}" rel="noopener" target="_blank">Read on</a>`,
    }),
  ];
  // TWO COLUMNS: the short cards — About, Subscribe, Masthead, Contact
  // — stacked in a thinner column at the left, the right two thirds
  // open; the Manifesto across both at
  // the foot. Each column stacks its cards at their own heights, 72
  // between.
  const byKey = new Map(cards.map((html) => [/ id="([a-z]+)"/.exec(html)[1], html]));
  const col = (keys) => `<div class="about-col">
        ${keys.map((k) => byKey.get(k)).join('\n        ')}
      </div>`;
  let heroHtml = '';
  if (manifestoPost) {
    if (!(manifestoPost.previewParagraphs && manifestoPost.previewParagraphs.length)) {
      const paras = manifestoPlateParas(manifestoHtml);
      if (paras.length) manifestoPost.previewParagraphs = paras;
    }
    manifestoPost.kicker = manifestoPost.kicker || 'Manifesto';
    // THE SECESSION AS A CONTRA CARD: the review's square cell — the
    // picture at its head, the words under it — standing alone, centred
    // under the column at the column's own width.
    heroHtml = `
  <div class="wrap m--latest about-hero">
    <section class="card card--latest card--contra-trio about-contra">
        ${renderContraCell(manifestoPost, { rev: false })}
      </section>
  </div>`;
  }
  const contentHtml = `<div class="ledger-content about-mosaic-block${heroHtml ? ' about-mosaic-block--hero-follows' : ''}">
    <div class="about-mosaic">
      ${col(['about', 'subscribe', 'masthead', 'contact'])}
      ${heroHtml ? '' : byKey.get('manifesto')}
    </div>
  </div>${heroHtml}`;
  return renderWordPage({
    currentKey: 'about',
    title: 'About',
    description: 'The New Critic is the young American magazine. Essays, interviews, and criticism by and for generation z.',
    // The band is the front page's own, the date in its middle
    // (2026-09-17; it read About The New Critic for a spell).
    // ABOUT over the mosaic and the Secession's cell; then the reprint.
    // (The closing deck — ARCHIVE, STORE, EVENTS — is struck, 2026-09-17.)
    movements: [
      { word: 'About', href: 'about.html', hook: 'subscribe-band', body: contentHtml },
    ],
    // With the hero on the page, the front page's scripts ride along for
    // it (as on the archive's feature block).
    extraScripts: (heroHtml
      ? renderDuoPanelFitScript() + renderCardOpenScript() + renderChromeOpenScript() + renderCoverCueScript()
        + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript() + renderRailFixScript()
      : '') + renderAboutMosaicScript() + renderLedgerScript(),
  // The body carries the page's own mark for what About alone does
  // (style.css, body.about-page).
  }).replace('<body class="ledger-page word-page">', '<body class="ledger-page word-page about-page">');
}

function renderAboutMosaicScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/about-mosaic.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// THE ARCHIVE IS A LEDGER OF BANDS: one 36px band per post, the post's
// title / author / tag / section / date in white courier across five
// columns. A band is a LINK: clicking it goes straight to the post on
// Substack. (The fold-out plate — cover left, excerpt right — is
// retired; the front page's cards in the feature block carry the
// previews now.)
function renderLedgerRow(post) {
  const d = post.date;
  // Every date carries its year on the ledger — "Jul 15, 2026" — the
  // current year included (the cards elsewhere drop it; the ledger is
  // the one place the whole run is dated in full).
  const dateStr =
    d && !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : post.metaDate || '';
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
    // #sort=<key>&post=<slug> and ledger.js lands on the matching item.
    ` data-slug="${escapeHtml(slugOf(post.link))}"`;
  return `
  <div class="ledger-item"${sortAttrs}>
    <a class="ledger-row" href="${escapeHtml(post.link)}" rel="noopener">
      <span class="ledger-cell lc-title">${escapeHtml(post.title)}</span>
      <span class="ledger-cell lc-author">${escapeHtml(post.author || '')}</span>
      <span class="ledger-cell lc-kicker">${escapeHtml(post.kicker || '')}</span>
      <span class="ledger-cell lc-section">${escapeHtml(post.sectionLabel || '')}</span>
      <span class="ledger-cell lc-date">${escapeHtml(dateStr)}</span>
    </a>
  </div>`;
}

function renderLedgerScript() {
  const js = slimJs(fs.readFileSync(path.join(__dirname, 'src/ledger.js'), 'utf8'));
  return `<script>
${js}
</script>`;
}

// Column-head sort control: a stacked up/down arrow pair after the label.
// Up = ascending (A–Z, oldest first), down = descending; the active
// direction prints charcoal (see src/ledger.js).
function sortArrows(key, label) {
  return `<span class="arch-sort-arrows">
        <button class="arch-sort" type="button" data-key="${key}" data-dir="asc" aria-label="Sort by ${label} ascending">&#9650;</button>
        <button class="arch-sort" type="button" data-key="${key}" data-dir="desc" aria-label="Sort by ${label} descending">&#9660;</button>
      </span>`;
}

// THE WORD PAGE IS THE FRONT PAGE'S ANATOMY (2026-09-17): the
// masthead's band pinned at the top from the first pixel, with the
// page's own line in its middle and the light/dark toggle in its
// right margin; the seam under it; then the page's WORD — ARCHIVE,
// ABOUT — as the first movement's banner, in OPS Placard across the
// measure exactly as ESSAYS opens the front page's second movement;
// the content in that movement's body; further movements each on a
// banner (SUBSCRIBE over the ledger); the closing deck — three words
// one under another, each a bare banner — and the front page's own
// foot: the reprint, the field and the colophon band. The front
// page's style and fitter do the work; nothing here is the ledger's
// own but the column head and the rows (src/ledger.js sorts them).
// (The mast, the crimson spacer, the pinned .ledger-band, the deck
// sections and the ledger reprint of the earlier anatomy are gone.)
//   movements: [{ word, href, hook, body }] — the first is the page's
//   own word; hook is one of the front page's three banner classes
//   (subscribe-band, events-band, store-band — the style hooks every
//   banner rule is keyed on); body is the movement's content, or
//   nothing for a deck word.
function renderWordPage({ currentKey, title, description, mid, movements = [], extraScripts = '' }) {
  const banner = (m) => `<section class="page-banner ${m.hook || 'store-band'} page-banner--bare${m.apart ? ' page-banner--apart' : ''}">
        ${bannerLines(m.above, 'above')}<a class="banner-name" href="${escapeHtml(m.href)}"${m.href.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(m.word)}</a>${bannerLines(m.below, 'below')}
      </section>`;
  //   An entry may instead be { raw } — markup set straight into
  //   .page-rows between movements (the archive's column head, which
  //   pins over the band like the reprint does) — or carry a body and
  //   no word: a movement with no banner (the ledger's rows).
  //   The opening movement is the front page's m--latest and the rest
  //   are m--essays — which is position speaking for dress, and right
  //   until a page wants a movement's dress somewhere other than where
  //   its position would put it. { mcls } says which outright. (The
  //   archive's feature block asks for this: it stands BELOW the ledger
  //   now and still wants the opening movement's ground, and taking
  //   both classes would not do — .m--essays states --paper after
  //   .m--latest in the sheet, so the later one would win and the
  //   cards would come up on the essays' ground.)
  const movementHtml = movements.map((m, i) => m.raw ? `\n  ${m.raw}` : `
  <div class="movement ${m.mcls || (i === 0 ? 'm--latest' : 'm--essays')}${m.cls ? ` ${m.cls}` : ''}">
  ${m.word ? banner(m) : ''}${m.body ? `
  <div class="movement-body">
  ${m.body}
  </div>` : ''}
  </div>`).join('');
  const bodyHtml = `
  <div class="page-rows">
  ${renderSectionBand('latest', { mid, currentKey, bareMid: true })}
  ${subTicker('head')}
  <div class="head-field" aria-hidden="true"></div>${movementHtml}${renderPageFoot()}
  </div>
  ${renderMarginalia()}`;
  return renderPageShell({
    currentKey,
    title,
    description,
    bodyHtml,
    // ledger-page keeps the column head's, the rows' and About's
    // mosaic's own rules; word-page is the anatomy's mark (style.css,
    // THE WORD PAGES ON THE FRONT PAGE'S ANATOMY; markMega reads it).
    bodyClass: 'ledger-page word-page',
    bare: true,
    extraScripts,
  }).replace('<html lang="en">', '<html lang="en" class="ledger-root">');
}

// THE FEATURE BLOCK between the band and the column head: the front
// page's own cards on charcoal — p(doom) as the lead essay, the two
// postscripts as a pair, Freak Show as the mirrored essay to close —
// with every hover, plate and preview the homepage gives them (the
// homepage's scripts ride along; see extraScripts below).
const LEDGER_FEATURE_SLUGS = {
  lead: 'pdoom',
  pair: ['curtis-yarvin-jr', 'beyond-pain-an-interview-with-the'],
  close: 'freak-show',
};
function renderLedgerFeature(features) {
  if (!features) return '';
  const rows = [
    // EDITORS' PICKS stacked on the left margin, as THE LATEST stands on
    // the front page's right (2026-09-18).
    features.lead ? renderMegaHero(features.lead, { label: 'Essays', stack: 'Editors’ Picks', stackSide: 'left', stackHref: 'archive.html#section=editors' }) : '',
    renderPostscriptPair(features.pair[0], features.pair[1]),
    features.close ? renderMegaHero(features.close, { rev: true, label: 'Essays' }) : '',
  ].filter(Boolean);
  if (!rows.length) return '';
  // The rows stand in the word page's first movement (m--latest, the
  // front page's opening one), under the page's word: the cards'
  // reveal, stacking and hover rules are written per movement, and
  // the rows borrow the front page's wholesale (renderWordPage).
  return rows.map((r) => `<div class="wrap m--latest">
    ${r}
  </div>`).join('\n  <div class="row-divider m--latest"></div>\n  ');
}

function renderArchivePage(posts, features) {
  // THE COLUMN HEAD rides up over the pinned band and PINS at the top
  // in its place, the ledger scrolling under it — so it stands in
  // .page-rows itself, a level over the band and under the reprint,
  // between SUBSCRIBE's movement and the rows' (style.css, THE WORD
  // PAGES ON THE FRONT PAGE'S ANATOMY).
  const headHtml = `<div class="ledger-head ledger-row">
      <span class="ledger-cell lc-title"><span class="lc-label">Title</span>${sortArrows('title', 'title')}<button class="arch-shuffle" type="button" aria-label="Shuffle order">&#8644;</button></span>
      <span class="ledger-cell lc-author"><span class="lc-label">Author</span>${sortArrows('author', 'author')}</span>
      <span class="ledger-cell lc-kicker"><span class="lc-label">Tag</span>${sortArrows('kicker', 'tag')}</span>
      <span class="ledger-cell lc-section"><span class="lc-label">Section</span>${sortArrows('section', 'section')}</span>
      <span class="ledger-cell lc-date"><span class="lc-label">Date</span>${sortArrows('date', 'date')}</span>
      <span class="ledger-cell lc-search"><input class="arch-search" type="search" placeholder="Search" aria-label="Search the ledger" autocomplete="off" spellcheck="false"><svg class="arch-search-glass" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 13l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><button class="arch-clear" type="button" hidden><span class="arch-clear-label">Clear filter</span><svg class="arch-clear-x" viewBox="0 0 20 20" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></span>
    </div>`;
  const ledgerHtml = `
  <section class="ledger" aria-label="Every post">
    <div class="ledger-body">${posts.map(renderLedgerRow).join('')}
    </div>
  </section>`;
  return renderWordPage({
    currentKey: 'archive',
    title: 'Archive',
    // The band is the front page's own, the date in its middle
    // (2026-09-17; it read Editors’ Picks for a spell).
    // ARCHIVE over the feature block; SUBSCRIBE over the ledger; then
    // the reprint. (The closing deck — ABOUT, STORE, EVENTS — is
    // struck, 2026-09-17: the page goes from the ledger's last row
    // straight to the reprint, as the front page goes from its last
    // review row.)
    // EDITORS' PICKS FALLS BELOW THE LEDGER (2026-09-19). The feature
    // block stood between the band and the column head, so the archive
    // opened on four hand-picked cards and the reader had to travel
    // past them to reach the thing the page is for. The ledger comes
    // first now and the picks close the page under it.
    // THE WORD STAYS AT THE TOP. It is the page's title, not the
    // feature block's, so it keeps its own movement above the column
    // head — which is why the first entry carries a word and no body
    // and the last a body and no word.
    movements: [
      { word: 'Archive', href: 'archive.html', hook: 'subscribe-band' },
      // (SUBSCRIBE stood here between the feature block and the ledger
      // head, 2026-09-18: struck. The offer is on the front page, in
      // the nav's right slot and in the colophon; the archive is a
      // place to look something up.)
      { raw: headHtml },
      { cls: 'm--ledger', body: ledgerHtml },
      { mcls: 'm--latest', cls: 'm--picks', body: renderLedgerFeature(features) },
    ],
    // The homepage's own scripts for the feature block's cards — the
    // fitter, the click-to-open plates, the cover colours, share, the
    // drawn lines, the held heads — then the ledger's own.
    extraScripts: renderDuoPanelFitScript() + renderCardOpenScript() + renderChromeOpenScript() + renderCoverCueScript()
      + renderCoverColorScript() + renderCopyLinkScript() + renderLineDrawScript() + renderRailFixScript()
      + renderLedgerScript(),
  });
}

// THE MANIFESTO, PREVIEWED: the About card carries the piece's opening —
// its first two preformatted blocks, no photograph — and reads on to
// the post itself.
function manifestoPreview(html, blocks = 2) {
  const parts = String(html || '').split(/(?=<pre class="manifesto-pre)|(?=<figure class="manifesto-fig)/);
  return parts.filter((b) => b.startsWith('<pre class="manifesto-pre')).slice(0, blocks).join('\n');
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
  // cards (the section pages are retired; their rows live in the
  // archive ledger under #section=essays/postscript/contra) — same array
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
  // The archive's feature block reads the same post objects the
  // homepage's rows do (heroArchive first — its objects carry the
  // From the Archive tagline and previews), by slug.
  const featureBySlug = (slug) =>
    [heroArchive, essaysAll, postscriptAll, archivePosts].flat().find((p) => p && slugOf(p.link) === slug) || null;
  const ledgerFeatures = {
    lead: featureBySlug(LEDGER_FEATURE_SLUGS.lead),
    pair: LEDGER_FEATURE_SLUGS.pair.map(featureBySlug),
    close: featureBySlug(LEDGER_FEATURE_SLUGS.close),
  };

  const pages = {
    'index.html': html,
    'about.html': renderAboutPage(founders, manifestoHtml,
      [heroArchive, essaysAll, postscriptAll, archivePosts].flat().find((p) => p && slugOf(p.link) === 'the-new-critic-secession') || null),
    'archive.html': renderArchivePage(archivePool, ledgerFeatures),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [filename, content] of Object.entries(pages)) {
    fs.writeFileSync(path.join(OUT_DIR, filename), markMega(holdFirstCovers(content, filename)), 'utf8');
    console.log(`Wrote ${path.join(OUT_DIR, filename)}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'style.css'), slimCss(fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8')), 'utf8');
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
  // (bird-mark.png and bird-logo.png are no longer copied: nothing on any page references them.)
  // The bird that closes the sidebar (see renderNav / .nav-bird). Kept in
  // assets/ under a clean name rather than read from the root "Bird
  // logo.png" it was drawn as — the build shouldn't depend on a filename
  // with a space in it, and the root copy is deliberately untracked.

  fs.writeFileSync(path.join(OUT_DIR, 'favicon.png'), Buffer.from(FAVICON_B64, 'base64'));
  // (The band's bird mask and its assets/bird.png copy are retired, 2026-09-17.)
  // ONE LINE SAYS WHETHER THE BUILD IS WHOLE (2026-09-17): the pages
  // are written either way (a card that lost its post page falls back
  // to the feed), but any post page that never came back is reported
  // here in a fixed form and the process exits nonzero, so a single
  // run's exit status is the ship's check — no grepping the log.
  if (failedPageFetches) {
    console.error(`FETCH FAILED ${failedPageFetches}`);
    process.exitCode = 1;
  } else {
    console.log('FETCH OK');
  }
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
