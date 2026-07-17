// thenewcritic.com edge router.
//
// This apex domain has two backends:
//   - GITHUB_ORIGIN: the built static homepage (this repo's dist/,
//     published to the gh-pages branch, served by GitHub Pages as a
//     project page under a /thenewcritic-homepage/ subpath).
//   - SUBSTACK_ORIGIN: www.thenewcritic.com, the real Substack-hosted
//     magazine — every post, comment, like, paywall, and Substack's own
//     discovery network lives there permanently and is not moving.
//
// Only the exact front-door paths this repo's build.js actually emits
// (see the `pages` map in build.js and the contents of dist/) are routed
// to GitHub Pages. Everything else — /p/*, Substack's own /archive,
// /about, /feed, comments, likes, sitemap.xml, etc. — is proxied straight
// through to Substack, so thenewcritic.com never bounces the visitor to
// a different address bar for content this site doesn't generate.
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create Worker ->
// paste this file -> Deploy -> add a route thenewcritic.com/* pointing
// at it (Custom Domains tab, or a Route under the zone).

const GITHUB_ORIGIN = 'https://rufusknuppel.github.io/thenewcritic-homepage';
const SUBSTACK_ORIGIN = 'https://www.thenewcritic.com';

// Exact paths this repo's build.js writes to dist/.
const STATIC_PAGES = new Set([
  '/', '/index.html',
  '/essays.html',
  '/postscript.html',
  '/contra.html',
  '/about.html',
  '/archive.html',
  '/style.css',
  '/bird-mark.png',
  '/bird.png',
  '/favicon.png',
]);

// Directories build.js copies wholesale into dist/.
const STATIC_PREFIXES = ['/fonts/', '/people/'];

function isGithubPath(pathname) {
  if (STATIC_PAGES.has(pathname)) return true;
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

async function proxy(request, origin, pathname, search) {
  const upstream = new URL(pathname + search, origin);
  const upstreamReq = new Request(upstream, request);
  const res = await fetch(upstreamReq);
  // Strip backend-identifying headers before handing the response back;
  // everything else (content-type, cache-control, etc.) passes through.
  const headers = new Headers(res.headers);
  headers.delete('server');
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === '' ? '/' : url.pathname;

    if (isGithubPath(pathname)) {
      // GitHub Pages serves this repo as a project page, so every asset
      // actually lives one path segment down.
      const ghPath = pathname === '/' ? '/index.html' : pathname;
      return proxy(request, GITHUB_ORIGIN, '/thenewcritic-homepage' + ghPath, url.search);
    }

    return proxy(request, SUBSTACK_ORIGIN, pathname, url.search);
  },
};
