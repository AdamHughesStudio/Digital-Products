# Extracting open competitions from English club pages

Each file in `pages/` is one golf club's own opens page, as Markdown. The first two lines give
`CLUB_ID` and `SOURCE_URL`. Today is <TODAY, for example Monday 23 November 2026>: replace this with the real date before each run.

For every file you are given, list every open competition the page shows with a date from today
onwards. An open competition is one visitors from other clubs can enter (opens, open days, open
weeks, pro-ams, invitation days that take entries from anyone). Skip members-only events, social
events, results and past dates.

## The one rule that matters

Record only what the page says. Never guess, fill in or tidy up.

- `title`: the club's own wording for the event, exactly as written (you may drop a trailing date or
  price that is part of the same line, and fix ALL CAPS to normal capitals). Never invent or reword
  a name. If the page lists an event with no name, use the wording it does use, such as "Open".
- Dates: a year must be certain. Take it from the page (a heading such as "2027 Opens", a full date,
  or a weekday that only matches one year). If you cannot be sure of the year, leave that event out
  and list it under `skipped` with the reason.
- Every other field: fill it only if the page states it for that event. Otherwise use null.

## Fields per open

- `club_id`, `source_url`: from the top of the file.
- `title` (text), `starts_on` (YYYY-MM-DD), `ends_on` (YYYY-MM-DD or null, for events over several days)
- `start_time` (24 hour "08:00", or null)
- `fee_gbp` (number or null) and `fee_basis` ("per person", "per pair", "per team", or null). If the
  page gives different prices for members and visitors, use the visitor price and mention both in
  `notes`.
- `format`: one of stableford, stroke, scramble, greensomes, fourball, foursomes, matchplay, other,
  or null. Four ball betterball is fourball. Texas scramble is scramble.
- `holes` (number or null), `entry` ("individual", "pairs", "teams", or null)
- `gender`: "men", "women" or "mixed". Gents or men's events are men, ladies' events are women. If
  the page doesn't say, use "mixed".
- `seniors`, `juniors` (true only if the page says so, otherwise false)
- `max_handicap` (number or null)
- `entry_url`: a link the page gives for entering this event, or null. Leave out links to Golf
  Empire.
- `entry_status`: only if the page says it: open, closing, full, waiting_list, ballot, closed,
  not_open. Otherwise null.
- `entry_opens`, `entry_closes` (YYYY-MM-DD or null, only if stated)
- `notes`: one short sentence of anything useful the page says that has no field (for example
  "Visitors £30, members £20." or "Bacon roll included."). In UK English. No dashes. Or null.

## Output

Write a JSON file (path given to you) with this shape, and reply with only a one-line summary:

```
{"opens": [ {...}, ... ],
 "skipped": [ {"club_id": "...", "text": "the line from the page", "reason": "..."} ],
 "pages": [ {"club_id": "...", "found": 0, "comment": "e.g. 2027 list not published yet"} ]}
```

Every file you were given must appear once in `pages`.
