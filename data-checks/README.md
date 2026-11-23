# Club data checks

How PlusFore's club list (websites, hole counts, closed clubs) and English opens were filled in and
kept honest. Photos have their own notes in `club-photos/README.md`, and the Scottish and Welsh
opens in `competitions-poc/README.md`.

## Ground rules

- Record only what a club's own page says. Never invent or tidy up a name, date or fee.
- Never fetch booking platforms (BRS, ClubV1, HowDidiDo, IntelligentGolf, dotgolf, Golf Genius) or
  Golf Empire. `competitions-poc/fetch.js` refuses them and obeys robots.txt.
- A club is only hidden (`active = false`) on clear, dated evidence that the course has closed, and
  never while it has an active open listed. Where only a driving range, footgolf, disc golf or pitch
  and putt is left, it counts as closed for golf.
- Every database change sets `updated_at = now()` so phones pick it up.

## Websites (23 November 2026)

Search helpers suggested a site for each club without one (one search per club, directories and
booking platforms ruled out). Every suggestion was then loaded with `fetch.js` and only added if:

1. the page names the club (or the hotel, resort, council or operator that runs it), or
2. the site shows only a "One moment, please..." bot check, but the web address itself is the
   club's name (for example `royallytham.org`).

Left out: casino, betting and game-cheat sites on old club domains, parked or for-sale domains,
suspended hosting, blank hosting pages, unrelated businesses with the same name, and addresses
that don't name the club.

| Where | Added | Websites now |
| --- | --- | --- |
| England | 371 | about 1,465 of 1,849 clubs |
| Republic of Ireland | 80 | about 193 of 298 clubs |

`linkcheck.py` sorts already loaded sites into fine, clearly bad (spam, parked, suspended, empty)
and look by hand. Run on the North West it removed 4 links (Maryport to a betting page, Castle Hawk
for sale, Sutton Hall blank, Liverpool Municipal North to a general council page). Newtownstewart's
link in Northern Ireland was removed for the same reason (now an Indonesian betting site). The
other 882 older English sites were checked in a separate run.

## Hole counts

`holes.py`: a hole count is only taken when a club's homepage names a single number of holes (9,
18, 27 or 36) at least twice and no other number, and only when the site belongs to one course. Each
result is still read by eye: Breightmet was left out because "plays 18 holes" means 9 played twice.
Added: 21 in Wales, 7 in Northern Ireland, 18 in North West England, 18 in the Republic of
Ireland, 18 in Yorkshire and the North East, 9 in the Midlands, 8 in the South West, 7 in South Central.

## Closed clubs

29 English clubs were hidden on dated evidence (news reports, council records, the club's own
notice or a London Gazette liquidation), plus four whose name in the map data already said
"(closed)". The 13 English clubs where sources still disagree are in
`cowork-england-closed-check.md`, a prompt for Cowork.

## English opens

The method used in Wales, region by region:

1. Load every club homepage in the region (`fetch.js --html`), then `competitions-poc/classify.py`
   finds links to the club's own opens pages.
2. Load those pages and keep the ones that show 2027 or other future dates.
3. Readers follow `EXTRACT-opens.md` (put today's date in it first). Titles are the club's own
   wording, a year must be certain, and every other field is filled only if the page states it.
4. `build_opens_insert.py` checks dates, allowed values and dashes, then writes the insert. Before
   running it, drop invitation days that need a member to invite you: they are not opens. Match on
   the title only (notes can mention a "member and guest" price for a real open).
5. Look at any open whose title carries a different year from its date. Clubs often reuse last
   year's title, so check the page's full date before trusting or rejecting it. Matching weekdays
   alone don't prove a year: 2021 and 2027 share a calendar, so an old table relabelled "2027"
   still fits (Tehidy Park's page said its 2027 dates weren't confirmed, so it was left out).
   County championships and "placeholder" entries are not club opens and are dropped too.
6. The insert skips anything already listed for the same club on the same day. Clubs with an open
   week can run two events on one day: check what was skipped and add those by hand. Opens more than about
   500 days ahead are held back for a later run.

North West England: 66 clubs had future opens pages; 372 opens at 58 clubs were added on 23 November
2026 (26 November 2026 to 27 December 2027), after dropping 10 invitation days.

| Region (23 November 2026) | Clubs with future opens pages | Opens added |
| --- | --- | --- |
| North West England | 66 | 372 |
| Yorkshire and the North East | 49 | 262 |
| Midlands | 44 | 239 |
| South West (with Herefordshire, Worcestershire and south Warwickshire) | 34 | 281 |
| South Central (Hampshire, Isle of Wight, Berkshire, Oxfordshire, Buckinghamshire, south Northamptonshire, west Surrey and West Sussex) | 19 | 58 at 15 clubs |
| Republic of Ireland | 5 | 2 (Mallow; euro fees go in the notes, never in fee_gbp) |

In all, 1,212 English opens at 185 clubs. Still to do: East of England, and London and the South
East (everything east of longitude 0.55 W and south of 52.3 N).
