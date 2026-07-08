# The New Critic — custom homepage

## What this is
A static homepage for `thenewcritic.com`, generated at build time by
`build.js` from the Substack RSS feed at `https://www.thenewcritic.com/feed`.
No framework, no npm dependencies — one Node script, zero `npm install`.

## The bigger plan (context for any future work here)
- `www.thenewcritic.com` is the existing Substack-hosted site. It is NOT
  changing. All real posts, comments, likes, paywalls, and Substack's
  discovery network live there permanently.
- `thenewcritic.com` (the bare apex domain) currently 301-redirects to
  `www`. That redirect needs to be removed and replaced with this build,
  deployed via Cloudflare Pages (nameservers are already on Cloudflare,
  so apex CNAME flattening is automatic through Pages' custom domain flow).
- Every post link on the generated homepage points straight to
  `https://www.thenewcritic.com/p/...` — this page is just a front door,
  not a replacement reading experience.
- Once deployed, the homepage should rebuild on a schedule (Cloudflare
  Pages Deploy Hook + a free cron service like cron-job.org hitting it
  every hour or two) since Substack doesn't send a webhook on publish.

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

## Status / open items
- Build script is tested against a hand-written fixture RSS feed (CDATA
  titles, missing fields, enclosure images) — logic confirmed sound.
- Has NOT yet been verified end-to-end against the real, live feed from
  inside an AI sandbox (no outbound network there) — only from the user's
  own machine, where it worked and parsed 20 real posts successfully.
- Not yet deployed to Cloudflare Pages. Not yet scheduled to rebuild.
- The apex redirect-to-www has not yet been removed.

## Commands
- `npm run build` — fetches the feed, writes `dist/index.html` + `dist/style.css`
- No test suite; no lint config. Keep it dependency-free if possible.

## Files
- `build.js` — fetch + parse + render, all in one file
- `content-overrides.js` — hand-edited per-post card text (kicker, title,
  dek, author/date meta, paragraph preview), keyed by post URL slug;
  overrides whatever the feed provides
- `style.css` — copied as-is into `dist/` on build
- `README.md` — deployment walkthrough for Cloudflare Pages
