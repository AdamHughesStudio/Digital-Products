# Open competitions feed: proof of concept

Run on 9 November 2026 to answer one question before building the real pipeline: can PlusFore match Golf Empire's coverage of open competitions from clubs' own websites?

Everything was fetched with Apify's Website Content Crawler (limited permissions) on the Free plan. Total cost: about $1.85 of the $5 monthly free usage.

## Findings

### 1. Where Scottish clubs publish their opens

486 Scottish club websites from the `clubs` table (466 loaded).

| Where the opens are | Clubs | Share |
| --- | --- | --- |
| Club's own site, readable text with dates | 117 | 25% |
| Only through a booking platform (BRS, ClubV1/HowDidiDo, IntelligentGolf) | 113 | 24% |
| Opens page with no list yet, or only one or two dates | 52 | 11% |
| No opens page found (fixtures or member events only, or nothing) | 158 | 34% |
| Site did not load | 20 | 4% |

57% of club homepages mention at least one booking platform (BRS 33%, ClubV1/HowDidiDo 30%, IntelligentGolf 7%).

These figures come from pattern matching, so treat them as accurate to within a few percentage points.

### 2. Golf Empire, Scotland, 2027 season

- 2,611 events across 379 clubs.
- 793 (30%) are confirmed. The other 70% are Golf Empire's own predictions ("Not yet confirmed by the club"), made by rolling this year's dates forward.

### 3. Head to head

54 club opens pages already mention 2027. 45 matched a Golf Empire club by name, and 26 of those have confirmed 2027 dates on Golf Empire.

- 15 of the 26 clubs: 80% or more of Golf Empire's confirmed dates are on the club's own page (121 of 129 dates). Examples: Blairgowrie, Duff House Royal, Leven.
- 9 of the 26: under half found. The reasons, from spot checks:
  - The 2027 list is in a PDF (Fortrose and Rosemarkie). The real pipeline needs to read PDFs.
  - The list is only on the booking platform (Carnwath, whose page still shows 2026; Brora, on IntelligentGolf).
  - We picked the wrong page on the club's site (Nairn Dunbar, Kilmarnock Barassie).
- Club pages also list events Golf Empire does not, but that count is inflated by sister clubs sharing a page (for example Leven Thistle on the Leven Links page), so it needs a proper extraction to measure.

### Conclusion

Where a club publishes its own list, we can match Golf Empire almost exactly. Golf Empire's extra coverage comes from three places: its predictions, the booking platforms, and PDFs. We can build predictions ourselves from last season's data and read PDFs, but about a quarter of clubs publish only through BRS, ClubV1/HowDidiDo or IntelligentGolf, so a data partnership with those platforms is the critical path to full coverage.

## Ground rules followed

- Golf Empire is used as a checklist only. `ge_checklist.py` keeps club, date, confirmed or predicted and the event id. No descriptions, fees or wording. Golf Empire data is not committed to this repo.
- Golf Empire's robots.txt asks for 10 seconds between requests and blocks `/search/api/`. Region pages were fetched one run at a time, with `respectRobotsTxtFile` on, and no login.
- HowDidiDo's terms prohibit scraping. A discovery crawl followed links into five HowDidiDo pages by mistake. Nothing from them is used. Future crawls must exclude `howdidido.com`, `clubv1.com`, `brsgolf.com`, `dotgolf.co.uk` and `intelligentgolf.co.uk`.

## How to rerun

The Apify token is saved as a network credential on the cloud environment, not in code. Each step is a Website Content Crawler run (`POST https://api.apify.com/v2/acts/apify~website-content-crawler/runs`) with an input from `apify-inputs/`, then the dataset is downloaded with `GET /v2/datasets/{id}/items?clean=true&fields=url,html,crawl` (or `markdown` for Golf Empire).

1. `apify-inputs/1-club-homepages.json`: every Scottish club homepage, read straight from the public Supabase API. Change the `country` filter in the URL for other countries.
2. `python3 -I classify.py homepages.json` sorts each club and writes `classified.json`.
3. `python3 -I opens_check.py urls classified.json > opens-urls.json` picks one opens page per club. Put those into `apify-inputs/2-club-opens-pages.json` as `startUrls` and run it.
4. `python3 -I opens_check.py check opens-pages.json classified.json` classifies each opens page.
5. `apify-inputs/3-golf-empire-region.json`: one Golf Empire region page per run (change the region in the URL). Then `python3 -I ge_checklist.py region-1.json region-2.json ... > ge-scotland.json`.
6. `python3 -I compare.py homepages.json opens-pages.json ge-scotland.json` writes `comparison.json`.

## Next steps

1. Partnership conversations with BRS (Golf Genius), Club Systems International (ClubV1, HowDidiDo) and IntelligentGolf.
2. Build the production pipeline: scheduled Apify runs, a webhook in the Vercel `api/` folder, Claude Haiku extraction (including PDFs), a `competitions` table in Supabase, and a coverage report against the checklist.
3. Predicted dates from our own history, labelled "expected, not yet confirmed".
