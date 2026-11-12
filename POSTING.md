# When you post on Substack

The homepage at https://rufusknuppel.github.io/thenewcritic-homepage/
is rebuilt from Substack. Your new post shows up once a rebuild runs.

## Each time you post

1. Publish on Substack as usual.
2. From this folder, run:

       npm run posted

   This starts the Rebuild workflow on GitHub and waits for it to finish.
   A run takes about 2 minutes; GitHub Pages serves the result within
   another minute or so.
3. Check that the post is on https://rufusknuppel.github.io/thenewcritic-homepage/
   (reload hard, or wait a minute: Pages caches for up to 10 minutes).

If you skip step 2, the hourly scheduled rebuild picks the post up
eventually. GitHub runs that schedule late and sometimes skips it
(on 2026-11-12 it ran only three times all day), so don't rely on it.

To fix a typo or title in a post that is already up, edit it on Substack,
then run `npm run posted` again.

## If the post doesn't appear

- `gh run list --workflow rebuild.yml --limit 3` shows the latest runs.
  A failed run means the build stopped on a bad answer from Substack
  (FETCH FAILED). The live site keeps its last good build. Run it again
  in a few minutes.
- A post published seconds earlier can be missing from Substack's list
  for a moment. Run `npm run posted` again.

## Making it automatic (one-time setup, optional)

`cloudflare/feed-watch.js` checks Substack every minute and starts the
rebuild by itself, so step 2 isn't needed. As of 2026-11-12 it is
**not deployed** (its workers.dev URL answers Cloudflare error 1042).
To deploy it, follow the steps in that file's header (Cloudflare
dashboard: create the `feed-watch` Worker, add the `GH_TOKEN` secret and
`LIVE_URL` variable, and a `* * * * *` cron trigger).
