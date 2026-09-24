# The New Critic — custom homepage

## What this is
A static homepage for `thenewcritic.com`, generated at build time by
`build.js` from the Substack RSS feed at `https://www.thenewcritic.com/feed`.
No framework, no npm dependencies — one Node script, zero `npm install`.

## Where things stand (read this before touching anything live)
- `www.thenewcritic.com` is the Substack-hosted magazine. It is NOT
  changing. All real posts, comments, likes, paywalls, and Substack's
  discovery network live there permanently. Its DNS record (a proxied
  CNAME to `target.substack-custom-domains.com`) must never be touched.
- `thenewcritic.com` (the bare apex) currently **301-redirects to `www`**
  via a Cloudflare Redirect Rule named `apex to www`. This is deliberate:
  the apex shows Substack until the user pulls the big trigger (below).
  The only apex path that does not redirect is `/give*`, which the
  `give-redirect` Worker serves.
- The built homepage is live but unlinked: `dist/` is pushed to the
  `gh-pages` branch and served by GitHub Pages at
  `https://rufusknuppel.github.io/thenewcritic-homepage/`.
- `cloudflare/worker.js` is the edge router that would put this build on
  the apex: front-door paths (the files `build.js` emits) proxy to GitHub
  Pages, everything else proxies to Substack. Its code is deployed to the
  Cloudflare Worker named `thenewcritic`, but that Worker has **no route
  and no custom domain**, so it does nothing today.
- The apex DNS A record points at a dead EC2 host that answers every path
  with an empty 200. It is harmless because the Redirect Rule (and, after
  the switch, the Worker route) answers before the origin is contacted.
  Do not "fix" it.
- Every post link on the generated homepage points straight to
  `https://www.thenewcritic.com/p/...` — this page is a front door, not a
  replacement reading experience.

## The big trigger (switching the apex to this build)
Do NOT do this unless the user explicitly asks to flip the apex. It is two
dashboard changes on the `thenewcritic.com` zone, in this order:
1. Workers & Pages → `thenewcritic` → Domains → Add Route:
   `thenewcritic.com/*` (exactly that — no leading `*.`, which would
   also capture `www` and hijack Substack). Zone `thenewcritic.com`.
   The existing `thenewcritic.com/give*` route keeps going to
   `give-redirect` because Cloudflare picks the most specific route.
2. Rules → Redirect Rules → disable (or delete) `apex to www`. Redirect
   Rules run before Workers, so while it is active the Worker never sees
   apex traffic.
Then verify from a terminal: `/`, `/style.css`, `/essays.html` should
return the build (GitHub headers), `/p/anything` and `/feed` should come
from Substack, `/give` should still be the custom give page, and
`www.thenewcritic.com/` must still say `x-served-by: Substack`.
Reverting is the same two steps backwards.

If `cloudflare/worker.js` changes, the Worker must be redeployed by hand:
Workers & Pages → `thenewcritic` → Edit code → paste the file → Deploy.
The deployed version is a comment-trimmed copy of the repo file; the code
is identical.

## Design
Matches the existing `thenewcritic.com/give` page exactly — that page was
provided as a real HTML file and its design system was extracted and
reused, not reinvented:
- Color tokens: `--paper:#000000`, `--surface:#060605`, `--white:#F7F6F1`,
  `--muted:#938F86`, `--faint:#5A574F`, `--line:rgba(247,246,241,0.14)`
- Fonts: Fraunces (display), Source Serif 4 (body), EB Garamond (mono/
  label use — uppercase, letter-spaced nav/footer/button text)
- The bird mark used in the nav, hero, and footer is the *exact* base64
  PNG data URI pulled from the real Give page — not a placeholder.
- Nav links (Home / Essays / Postscript / Contra / About / Give) and
  footer links (same minus Give, plus Contact) point to the real live
  paths on `www.thenewcritic.com`, mirroring the Give page's own nav.
- Reveal-on-scroll via IntersectionObserver, respects
  `prefers-reduced-motion`, copied verbatim from the Give page's script.

## Open items
- Once the apex is switched, the homepage should rebuild on a schedule
  (re-run the build and push `gh-pages`) since Substack doesn't send a
  webhook on publish. Nothing is scheduled yet.
- The Cloudflare dashboard's code editor and rule forms do not cooperate
  with browser automation; dashboard changes are done by the user.

## Commands
- `npm run build` — fetches the feed, writes `dist/` (index, section
  pages, style.css, fonts, images)
- No test suite; no lint config. Keep it dependency-free if possible.

## Working in parallel (sessions, worktrees, commits)
Several Claude sessions work on this repo at once. The rules:
- **`main` is the integration branch, owned by one session at a time.**
  Design passes run in their own worktree on their own branch, cut from a
  *committed* `main` (if `main` is dirty, checkpoint-commit it first).
- **Commits are checkpoints; shipping is the push.** Any session may make
  local commits on its own branch at sensible checkpoints without asking.
  Only the integrator commits on `main` (merges, checkpoints). Nobody
  pushes `main` or `gh-pages`, force-pushes, or rewrites a pushed commit
  unless the user says "ship it".
- **Never touch another session's worktree or write into `main`'s files
  from a worktree.** To pick up another session's unmerged work without
  disturbing it, snapshot it read-only into a new branch (a throwaway
  `GIT_INDEX_FILE` + `write-tree` / `commit-tree`).
- **Scope each branch to files or sections.** `src/*.js` modules split
  cleanly. `style.css` doesn't: every pass appends a dated block at the
  sheet's end, so two branches collide there. Resolve by keeping both
  blocks, main's first, then check the sheet's braces balance.
- **Never hand-merge `dist/`.** `.gitattributes` marks it `merge=ours`
  (needs `git config merge.ours.driver true` once per clone); after any
  merge run `node build.js` and commit the result.
- **Merging back** (integrator, in `main`): `git merge --no-ff <branch>` →
  `node build.js` (exit 0, `FETCH OK`) → check 1280 / 1440 / 1920 and a
  phone width → commit. Then every open branch runs `git rebase main` so
  drift stays small. Remove a worktree and delete its branch once merged.
- Superseded work is kept as `archive/*` branches rather than stashes or
  loose patches.

## Files
- `build.js` — fetch + parse + render, all in one file
- `content-overrides.js` — hand-edited per-post card text (kicker, title,
  dek, author/date meta, paragraph preview), keyed by post URL slug;
  overrides whatever the feed provides
- `style.css` — copied as-is into `dist/` on build
- `cloudflare/worker.js` — the apex edge router (deployed, unrouted)
- `README.md` — how it is hosted and how to flip the apex
