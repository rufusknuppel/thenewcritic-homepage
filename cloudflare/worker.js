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
  // Build the upstream request by hand rather than `new Request(upstream,
  // request)`: that form copies the incoming Host header, and Cloudflare
  // honours a Host override on subrequests to hostnames it serves — so the
  // subrequest was routed back to this same Worker and died with error
  // 1042 instead of ever reaching GitHub or Substack.
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');
  headers.delete('cf-ipcountry');
  headers.delete('x-forwarded-proto');
  headers.delete('x-real-ip');
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const res = await fetch(upstream, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    // Hand Substack's redirects back to the browser untouched rather than
    // following them inside the Worker.
    redirect: 'manual',
  });
  // Strip backend-identifying headers before handing the response back;
  // everything else (content-type, cache-control, etc.) passes through.
  const out = new Headers(res.headers);
  out.delete('server');
  return new Response(res.body, { status: res.status, headers: out });
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
