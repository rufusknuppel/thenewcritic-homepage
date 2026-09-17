# The New Critic — custom homepage

A static homepage for `thenewcritic.com`, generated at build time from the
Substack RSS feed at `https://www.thenewcritic.com/feed`. No framework, no
dependencies — one Node script (`build.js`) parses the feed and writes
`dist/`.

`www.thenewcritic.com` keeps working exactly as it does today — this build
is only ever meant for the bare `thenewcritic.com` domain. Every post link
on the homepage points straight to `https://www.thenewcritic.com/p/...`, so
comments, likes, paywalls, and Substack's own discovery network are
untouched.

**Design:** matches the existing `thenewcritic.com/give` page exactly —
same color tokens, same Fraunces / Source Serif 4 / EB Garamond pairing,
same sticky nav and footer (with the real bird mark embedded as the same
base64 data URI used on that page), same button and reveal-on-scroll
treatment. The nav links to Essays, Postscript, Contra, About, and Give all
point at the live pages on `www.thenewcritic.com`; "Home" is marked as the
current page since this build *is* the homepage.

## Test it locally

```
npm run build
```

This fetches the live feed and writes `dist/`. Open `dist/index.html` in a
browser to preview. Re-run any time to pull in new posts.

## How it is hosted today

| Piece | Where | State |
| --- | --- | --- |
| The build (`dist/`) | GitHub Pages, `gh-pages` branch, at `https://rufusknuppel.github.io/thenewcritic-homepage/` | live, unlinked |
| Edge router (`cloudflare/worker.js`) | Cloudflare Worker `thenewcritic` | code deployed, **no route** |
| `thenewcritic.com` | Cloudflare Redirect Rule `apex to www` | 301 to `www.thenewcritic.com`, path and query preserved, `/give*` excluded |
| `thenewcritic.com/give` | Cloudflare Worker `give-redirect`, route `thenewcritic.com/give*` | custom give page |
| `www.thenewcritic.com` | Substack (proxied CNAME) | untouched, never touch it |

So visitors to the bare domain see Substack. The custom homepage exists and
is publishable, but nothing points at it until you pull the big trigger.

## Publishing a new build (safe any time)

Rebuild, commit, and push `dist/` to `gh-pages`:

```
node build.js
git add dist build.js content-overrides.js style.css
git commit -m "Rebuild"
git push origin main
git subtree push --prefix dist origin gh-pages
```

Re-run the build until it reports no failed post fetches — Substack fetches
fail transiently and a partial build still exits 0. Stage files by name
(never `git add -A`; the working tree carries font packages and drafts
that must not ship). The subtree push can take a couple of minutes. This
only updates the GitHub Pages copy; the apex is unaffected until the
switch below.

## The big trigger: putting this build on the apex

Two changes in the Cloudflare dashboard, zone `thenewcritic.com`, in this
order:

1. **Workers & Pages → `thenewcritic` → Domains → Add Route.** Route
   `thenewcritic.com/*`, zone `thenewcritic.com`. It must be exactly that:
   a leading `*.` would also match `www` and replace Substack's homepage
   with this build. The existing `thenewcritic.com/give*` route keeps
   winning for the give page because Cloudflare picks the most specific
   route.
2. **Rules → Redirect Rules → disable `apex to www`.** Redirect Rules run
   before Workers, so the Worker sees no apex traffic while the rule is on.

Then check from a terminal:

```
curl -sI https://thenewcritic.com/ | grep -i x-github
curl -sI https://thenewcritic.com/p/anything | grep -iE '^HTTP|location'
curl -sI https://www.thenewcritic.com/ | grep -i x-served-by
```

The first should show GitHub Pages headers, the second Substack's redirect
for the post, and the third must still say `Substack`.

**To revert,** re-enable the redirect rule and delete the Worker route.

### If `cloudflare/worker.js` changes

The Worker is deployed by hand: Workers & Pages → `thenewcritic` → Edit
code → replace the contents with the file → Deploy. The router proxies the
exact files `build.js` emits to GitHub Pages and everything else to
Substack. It builds each upstream request by hand and drops the incoming
`Host` header; copying the request wholesale made Cloudflare route the
subrequest back into the Worker (error 1042).

## Keeping it fresh

Substack doesn't send a webhook when you publish, so the homepage only
updates when you rebuild and push `gh-pages`. Once the apex is switched,
schedule that (a cron on any machine that can run the three commands
above) every hour or two.

## Customizing

- `build.js` — change `FEATURED_COUNT` / `LIST_COUNT` to show more or fewer
  posts, or edit the HTML templates inside the render functions.
- `content-overrides.js` — hand-edited card text per post, keyed by slug.
- `style.css` — all design tokens (colors, fonts) are CSS variables at the
  top of the file.
