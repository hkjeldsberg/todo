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
