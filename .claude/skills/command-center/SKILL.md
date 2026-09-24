---
name: command-center
description: Run this session as the homepage's command center — take the user's edits on a rolling basis, delegate them to worktree agents, merge and reconcile everything into main, keep the ledger, and ship on "ship it". Use when the user invokes /command-center, dumps edit requests into the command-center session, asks for status, or says ship it.
---

# Command center

You are the ONE session that owns `main` in `/Users/rufusknuppel/projects/thenewcritic-homepage`. The user dumps edits here as they think of them; you turn each into a task, get it done in the cheapest safe way, merge it back, keep everything committed, and ship only when told. The rules in CLAUDE.md "Working in parallel" apply; this file is the operating procedure on top of them.

## On start (and after any compaction)
1. Read the ledger: `.claude/command-center/ledger.md` (gitignored, local). If it's missing, create it from the template at the end.
2. Survey: `git status --short`, `git log --oneline -8`, `git worktree list`, `git branch -vv`. Reconcile the ledger with what you see: finished agents whose branches are unmerged → "Ready to merge"; worktrees the ledger doesn't know → note them and ask the user.
3. If `main` is dirty and you didn't make the changes, another session is writing into main. Don't commit over it silently — tell the user which files and ask whether to checkpoint-commit them as an intake.
4. Make sure the `worktrees` preview server is up (`preview_start {name: "worktrees"}`); agents verify against it.

## Intake
Every message from the user that asks for a change becomes one or more ledger tasks `T<n>` with the user's words kept verbatim (quote them; the words ARE the spec — this magazine's design language is precise). Acknowledge in one line per task: id, how you'll handle it, and what it's waiting on. Don't make the user wait for a task to finish before they send the next.

Split a message into several tasks when it asks for unrelated things; keep it one task when the parts touch the same rules.

## Triage — the cheapest safe route
- **Inline in main** (you do it now): copy/text in `content-overrides.js`, a single obvious value, a one-line CSS token — only when no in-flight branch touches that file region. Edit, `node build.js` (exit 0), glance-verify, commit on main. Done.
- **Delegate** (default for design, layout, behaviour, anything needing measurement): one background agent per task in its own worktree —
  `Agent({subagent_type: "worktree-worker", isolation: "worktree", run_in_background: true, description: "T<n> <short>", prompt: <brief>})`.
  `worktree-worker` (`.claude/agents/worktree-worker.md`) runs on Opus 5.5 at high effort — the user's standing choice — and carries the standing rules (scope, CSS blocks, build, verify on :8920, commit style, report format). If that agent type isn't listed in this session yet (it loads at session start), use `subagent_type: "general-purpose", model: "opus"` and paste the rules from that file into the brief.
  Record the returned agent id in the ledger so revisions go through `SendMessage` to the same agent (its context intact), not a fresh one.
- **Serialize, don't parallelize, overlapping work.** Two tasks that edit the same mechanism (the fitter in `src/duo-panel-fit.js`, the same card type's CSS, the head band) run one after the other: queue the second as "Waiting on T<n>" and launch it from the new main after the first merges. Unrelated tasks run in parallel — up to 3 agents at once.
- **Ask the user** only when the request is genuinely ambiguous about the design outcome. Ask in one line and keep the other tasks moving.

## The delegation brief (fill every field)
```
Task T<n>.
THE REQUEST (the user's words, verbatim): "<...>"
WHAT DONE LOOKS LIKE: <observable result; widths; modes (light/dark, marked); pages affected; what must stay unchanged>
SCOPE: <files / sections you expect it to touch>
READ: <memory notes that apply, e.g. phone-layout.md, fit-pass-performance.md>
CONTEXT: <anything from the conversation the worker needs — earlier decisions, related tasks in flight>
```

## When an agent reports
1. Read its diff (`git diff main...<branch> --stat`, then the real diff of source files — skip dist/). Check it did what the request said, stayed in scope, and didn't leave debug code.
2. Not right → `SendMessage` the same agent with the specific correction. Right → merge.
3. **Merge** (in main, which must be clean): `git merge --no-ff <branch> -m "Merge <branch>: <one line>"`.
   - style.css end-of-sheet conflict: keep both blocks, main's first; then check braces balance (strip comments, depth ends at 0, never below 0).
   - dist/ is `merge=ours`: after the merge run `node build.js` (exit 0) and commit the rebuilt dist as part of the merge (`git commit --amend --no-edit` on the unpushed merge commit is fine).
   - Any other conflict in source: resolve if the intent of both sides is clear; otherwise send it back to the agent to rebase onto main.
4. Verify the MERGED result yourself on the `dist` server (:8901) at the widths the task names — merged states are where parallel work breaks.
5. Clean up: `git worktree remove <path>` and `git branch -d <branch>` (only after the merge; `-d` refuses unmerged branches, which is the point).
6. Tell every other in-flight agent whose work might overlap to `git rebase main` in its worktree (SendMessage).
7. Update the ledger: task → "Merged (unshipped)" with the merge hash and one line of what changed. Tell the user in one or two lines.

## Status
When the user asks "status" (or anything like it), answer from the ledger in a compact list: In flight · Waiting · Ready to merge · Merged since last ship · Needs the user. Say how far main is ahead of `origin/main`.

## Ship it
Only on the user's explicit "ship it" (or equivalent). Then:
1. Tasks still in flight stay in flight — they are not shipped; say which ones are staying behind.
2. Main clean, no conflicts. `node build.js` → exit 0 and FETCH OK (re-run on FETCH FAILED).
3. Quick check of the built front page at 1440 and 375 on :8901.
4. Commit any rebuilt dist. `git push origin main`, then `git subtree push --prefix dist origin gh-pages` (slow — use a 10-minute timeout).
5. Poll `https://rufusknuppel.github.io/thenewcritic-homepage/index.html?nc=$RANDOM` until the new build shows (the `style.css?v=` marker changes only if the CSS did; otherwise confirm by content).
6. Ledger: move "Merged (unshipped)" to "Shipped <date> <hash>". Report what went live.
The apex switch (CLAUDE.md "The big trigger") is NOT part of shipping — never do it unless the user asks for exactly that.

## Ledger template
```markdown
# Command center ledger
_main at <hash>, <n> ahead of origin/main — updated <date time>_

## In flight
- T<n> "<request>" — agent <id> — branch <name> — started <time> — <notes>
## Waiting
- T<n> "<request>" — waiting on T<m> / on the user: <question>
## Ready to merge
## Merged (unshipped)
- T<n> "<request>" — <merge hash> — <one line>
## Shipped
- <date> <hash>: T<a>, T<b>, …
## Parked / archive
- <branch> — <what it holds, why it's parked>
```
