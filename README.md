# The New Critic — custom homepage

A static homepage for `thenewcritic.com`, generated at build time from the
Substack RSS feed at `https://www.thenewcritic.com/feed`. No framework, no
dependencies — one Node script (`build.js`) parses the feed and writes
`dist/index.html` + `dist/style.css`.

`www.thenewcritic.com` keeps working exactly as it does today — this only
replaces what lives at the bare `thenewcritic.com` domain. Every post link
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

## Deploy on Cloudflare Pages

Since your nameservers are already on Cloudflare, this is the path of
least resistance for the apex domain:

1. Push this folder to a GitHub/GitLab repo (Cloudflare Pages builds from
   a repo, not a local upload).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git**, select the repo.
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
4. Deploy. You'll get a `*.pages.dev` URL first — confirm it looks right.
5. **Workers & Pages → your project → Custom domains → Set up a domain** →
   enter `thenewcritic.com`. Because your nameservers already point to
   Cloudflare, it creates the apex DNS record automatically — no manual
   CNAME flattening needed.
6. Remove whatever redirect rule currently sends `thenewcritic.com` to
   `www.thenewcritic.com` (check **Rules → Redirect Rules** or the older
   **Page Rules** in the Cloudflare dashboard for a rule matching the bare
   domain).
7. Leave the DNS record for `www` exactly as it is — don't touch it.

## Keeping it fresh

Substack doesn't send a webhook when you publish, so the homepage only
updates when the site rebuilds. Two easy ways to trigger that:

- **Scheduled rebuild (recommended):** In your Pages project, create a
  **Deploy Hook** (Settings → Builds & deployments → Deploy hooks). It
  gives you a URL. Use a free cron service (e.g. cron-job.org) to hit that
  URL every hour or two — each hit triggers a fresh build, which re-fetches
  the feed.
- **Manual:** Trigger a redeploy from the Cloudflare dashboard, or push any
  commit, whenever you publish something you want reflected immediately.

## Customizing

- `build.js` — change `FEATURED_COUNT` / `LIST_COUNT` to show more or fewer
  posts, or edit the HTML templates inside `renderHomepage`.
- `style.css` — all design tokens (colors, fonts) are CSS variables at the
  top of the file.
