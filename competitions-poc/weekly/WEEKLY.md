# Weekly competitions check

Keeps PlusFore's club opens current on Apify's free plan. Each week it re-reads only the club pages
we already take opens from (about 90), skips any page whose text hasn't changed, and reads the
changed ones again for new, changed and cancelled opens and for entry status. It finds no new clubs:
that is the monthly full crawl's job.

Cost: about $0.20 of Apify usage a run (the free plan gives $5 a month).

## Ground rules

- Never fetch booking platforms (HowDidiDo, ClubV1, BRS, IntelligentGolf, dotgolf) or Golf Empire.
  `fetch_pages.py` skips them.
- Only record what the club's page says. No guessing dates, fees or entry status. If a page is
  unclear, leave the open as it is and list it in the report.
- An open is only taken down (`active = false`) when a page that loaded properly no longer lists it.
  A page that failed to load changes nothing.
- UK English, no em or en dashes, in anything written.

## Steps

All database work is through the Supabase connector (project `dmdpywaljmowdylkgrzp`).

1. **Pages to check.** Run
   `select json_agg(distinct source_url) from public.competitions where active and starts_on >= current_date;`
   and save the list as `urls.json` in the scratchpad.
2. **Fetch.** `python3 -I competitions-poc/weekly/fetch_pages.py <scratchpad>/urls.json <scratchpad>/pages.json`
3. **Last week's fingerprints.** `select url, content_hash from public.competition_pages;`
4. **Unchanged pages** (same hash as last week): mark their opens as still listed and the page as checked.
   `update public.competitions set last_seen = now() where active and source_url = any(array[...]);`
   `update public.competition_pages set checked_at = now() where url = any(array[...]);`
5. **Changed or new pages:** read each page's Markdown and list every open competition on it with a
   date from today onwards. For each, note: title, starts_on, ends_on, start_time, fee_gbp,
   fee_basis (`per player`, `per pair`, `per team`), format, holes, entry (`individual`, `pairs`,
   `teams`), gender, seniors, juniors, max_handicap, entry_url, and only if the page says so:
   entry_status (`open`, `closing`, `full`, `waiting_list`, `ballot`, `closed`, `not_open`),
   entry_opens and entry_closes. Then compare with the page's current rows
   (`select * from public.competitions where source_url = '...' and starts_on >= current_date`):
   - Same open (same date, same or near title): update any field that changed, set
     `last_seen = now()`, `updated_at = now()`.
   - Not in the database: insert it. `id` is `'c-'` plus the first 16 hex characters of
     `md5(club_id || '|' || starts_on || '|' || lower(title))`; copy `club_id`, `host`, `lat` and
     `lng` from the page's other rows; `confirmed = true`, `active = true`,
     `first_seen = now()`, `last_seen = now()`, `source_url` = the page.
   - In the database but no longer on the page: `active = false`, `updated_at = now()`.
   Then record the page:
   `insert into public.competition_pages (url, content_hash, checked_at, changed_at) values (...) on conflict (url) do update set content_hash = excluded.content_hash, checked_at = excluded.checked_at, changed_at = excluded.changed_at;`
6. **Report**, in a few lines: pages checked, unchanged, changed, failed to load, skipped; opens
   added, changed, taken down; entry statuses set; Apify cost; anything that needs a person to look at.
   Nothing needs committing to the repo.
