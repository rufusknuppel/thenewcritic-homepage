// feed-watch — puts a new Substack post on the homepage within minutes.
//
// Substack sends no webhook on publish. This Worker runs on a one-minute
// Cron Trigger, asks Substack for its newest post, and if that post isn't
// on the live homepage yet, fires the repo's Rebuild workflow
// (.github/workflows/rebuild.yml) through a repository_dispatch. That
// workflow builds and publishes in about two minutes; GitHub Pages serves
// it a minute or so later.
//
// It asks /api/v1/posts, not the archive API or the RSS feed: on
// 2026-10-28 the archive API took ~25 minutes to list a new post and the
// feed answers from a cache up to ~10 minutes old, while /api/v1/posts had
// it at once (build.js backfills from the same place).
//
// Guards, so it can't fire forever:
// - only a post from the last 24 hours counts (anything older that's
//   missing is the hourly scheduled rebuild's job, or not a front-page post);
// - nothing fires while a Rebuild run is queued or running, or within
//   COOLDOWN_MIN of the last one starting (gives Pages time to serve it).
//
// Deploy (Cloudflare dashboard, by hand):
//   Workers & Pages → Create → Worker named `feed-watch` → paste this file.
//   Settings → Variables and Secrets:
//     GH_TOKEN  (secret) fine-grained token, this repo only,
//               Contents: read & write, Actions: read
//     LIVE_URL  (text)   the homepage as served — today
//               https://rufusknuppel.github.io/thenewcritic-homepage/ ,
//               after the apex flip https://thenewcritic.com/
//   Settings → Triggers → Cron Triggers → add `* * * * *`.
// No route or custom domain. Visiting its workers.dev URL shows what the
// next tick would decide without firing anything.

const SUBSTACK = 'https://www.thenewcritic.com';
const REPO = 'rufusknuppel/thenewcritic-homepage';
const WORKFLOW = 'rebuild.yml';
const MAX_AGE_H = 24;
const COOLDOWN_MIN = 6;

const GH_HEADERS = (env) => ({
  Authorization: `Bearer ${env.GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'thenewcritic-feed-watch',
});

async function decide(env) {
  const res = await fetch(`${SUBSTACK}/api/v1/posts?limit=1`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return { fire: false, why: `substack ${res.status}` };
  const [post] = await res.json();
  if (!post || !post.slug) return { fire: false, why: 'no post' };
  const ageH = (Date.now() - new Date(post.post_date)) / 36e5;
  if (ageH > MAX_AGE_H) return { fire: false, why: 'newest post is old', slug: post.slug };

  // Cache-busted: GitHub Pages sends max-age=600.
  const live = await fetch(`${env.LIVE_URL}?fw=${Date.now()}`, { cf: { cacheTtl: 0 } });
  if (live.ok && (await live.text()).includes(`/p/${post.slug}`)) {
    return { fire: false, why: 'already live', slug: post.slug };
  }

  const runs = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`,
    { headers: GH_HEADERS(env) }
  );
  if (!runs.ok) return { fire: false, why: `github ${runs.status}`, slug: post.slug };
  const [last] = (await runs.json()).workflow_runs || [];
  if (last) {
    if (last.status !== 'completed') return { fire: false, why: 'rebuild in progress', slug: post.slug };
    const sinceMin = (Date.now() - new Date(last.created_at)) / 6e4;
    if (sinceMin < COOLDOWN_MIN) return { fire: false, why: 'cooling down', slug: post.slug };
  }
  return { fire: true, why: 'new post not live', slug: post.slug };
}

async function fire(env, slug) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: GH_HEADERS(env),
    body: JSON.stringify({ event_type: 'substack-publish', client_payload: { slug } }),
  });
  return res.status; // 204 on success
}

export default {
  async scheduled(event, env, ctx) {
    const d = await decide(env);
    if (d.fire) d.dispatch = await fire(env, d.slug);
    console.log(JSON.stringify(d));
  },
  // Dry run: what would the next tick do? Never fires.
  async fetch(request, env) {
    return Response.json(await decide(env));
  },
};
