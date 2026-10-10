# Lessons

## Route renames: grep template literals, then click, don't just load
- 2026-09-24: memo's `/grammar` → `/gramatica`. The import rewrite and a grep for `"/grammar"`
  missed two `` href={`/grammar/${slug}`} `` template links in TopicGrid; screenshots only
  loaded `/gramatica`, never clicked a topic → every topic 404'd in production.
- Rule: after moving routes, grep for the old path with every quote style (`"`, `'`, `` ` ``),
  add redirects for the old URLs, and run the internal-link crawl (`.playtest/links.mjs`
  pattern: collect every `a[href^='/']` from each section, request each, flag ≥400) plus at
  least one real click per list page.

## .gitignore patterns without a leading slash match at any depth
- 2026-09-24: root `.gitignore` had `tense` / `donde` (to skip the old apps) — this also hid
  `app/src/features/games/tense` and `/donde`, so Vercel failed with "Can't resolve './tense/server'".
- Rule: anchor folder ignores to the root (`/tense/`), and when a build can't find a file that
  exists locally, check ignore rules first.

## `next dev` with NEXT_DIST_DIR rewrites tsconfig.json
- 2026-09-27: `NEXT_DIST_DIR=.next-was next dev` appended `.next-was/types/**` and `.next-was/dev/types/**` to
  tsconfig `include`.
- Rule: after a side-by-side dev server, stop it, then remove the added `.next-*` include lines and the dist dir.

## Playtests without a DB: the dev overlay swallows taps
- 2026-09-27: with Supabase env blanked (so a playtest can't write to the live DB), every save/attempt Server
  Action throws. That's expected, but the Next dev overlay it opens intercepts pointer events, so taps time out.
- Rule: in no-DB playtests, hide `nextjs-portal` via an init script. Keep collecting `pageerror` / console
  errors so real failures still fail the run (see scripts/was-playtest.mjs).

## Playwright clock: setSystemTime, not fastForward, with framer-motion
- 2026-09-30: `page.clock.fastForward(days)` also jumps rAF/performance time; AnimatePresence finished the
  drawer's exit animation but never unmounted it, so its invisible backdrop ate every tap.
- Rule: to make SRS items due in a playtest, move `Date` only with `page.clock.setSystemTime`.

## No git commands in this repo
- 2026-09-30: ran `git diff --stat` to check a generated file, against ../CLAUDE.md ("Do not use any GIT commands").
- Rule: inspect files directly (cat/grep/diff against a scratch copy), never git.

## Back up tsconfig.json *before* starting a side-by-side dev server
- 2026-10-05: the pasado session copied tsconfig after `next dev` had already appended `.playtest/next-pasado/**`,
  so the "unchanged" diff passed and the lines stayed in until the next game's playtest.
- Rule: snapshot tsconfig in the same command, before launching `next dev`; afterwards drop every `.playtest/` and
  `.next-*` include that isn't `.next/`.

## Animations must not make tap targets unstable
- 2026-10-05: a scale pulse on the hint chip made Playwright wait forever ("element is not stable"), and a
  moving target is worse for thumbs too. AnimatePresence mode="wait" also got stuck after its block unmounted
  and remounted (options froze on the old step).
- Rule: pulse with rings/glow, not size. For step-by-step option rows, key a plain slide-in by step; skip exit
  animations unless they're needed. Keyframe arrays need a tween, not a spring.

## overflow-hidden breaks sticky children
- 2026-10-08: the Glosario list box had `overflow-hidden` (for its rounded corners); that made it the sticky
  containing scroller, so group headers with `top: <header height>` were pushed down inside each section and
  covered rows. Full-page screenshots made it look like a capture glitch.
- Rule: round a box that holds sticky elements with `overflow-clip`, not `overflow-hidden`. Playtests assert the
  first sticky header's position instead of trusting a screenshot.

## Deleting seeded rows: match on content, not on dates
- 2026-10-09: the first cleanup SQL deleted the starter words by "checked imports created before 9 Oct". The local
  dry run (seed applied today) deleted nothing, and after enrich the same filter could have hit my own words.
- Rule: identify seeded rows by something only the seed has (word + its seeded example sentence), check the match
  count against the live DB read-only first, and dry-run destructive SQL on a throwaway local Postgres, re-run included.
