# PlusFore App Store listing (draft for review)

Everything App Store Connect asks for on the app's product page, checked against Apple's limits.
Items marked **[CONFIRM]** need you. Google Play needs the same text: its short description is the
subtitle line below the Play heading.

## Name (30 characters)

**PlusFore: Golf Games & Opens** (28)

The words in the name and subtitle count as search keywords, so they aren't repeated below.

## Subtitle (30 characters)

**Find golfers and club opens** (27)

## Promotional text (170 characters)

Shown above the description, and can be changed at any time without a new release.

> Golfers near you want a game, and clubs across the UK and Ireland are running opens. PlusFore puts
> them in one place, with every entry date on your calendar. (155)

## Keywords (100 characters, comma separated, no spaces)

`tee time,partner,competition,handicap,scramble,stableford,fourball,course,amateur,round,Scotland` (96)

## Description (4,000 characters)

> Find your next game of golf.
>
> PlusFore brings golfers together. Find people near you who have a spare space on their tee time,
> post your own round for others to join, and find club opens and championships worth entering
> across the UK and Ireland.
>
> GAMES NEAR YOU
> • See rounds golfers near you have booked, with spaces for others to join
> • Ask for a space: the host sees your profile and handicap, then says yes or no
> • Post your own tee time and let golfers come to you
> • Members can invite guests at the members' guest rate, where their club allows it
>
> CLUB OPENS AND CHAMPIONSHIPS
> • Opens from clubs across Scotland, England, Wales and Ireland, taken from the clubs' own pages
> • Filter by format, who can enter, handicap limit, date and distance
> • See when entries open and close, and go straight to the club's entry page
> • National championships from the golf unions, with dates and venues
>
> YOUR SEASON
> • Save the games and competitions you're interested in
> • See your whole season on one calendar, with entry dates marked
> • Invite friends to a competition and see which of them are interested
>
> PLAY WITH PEOPLE
> • Add friends and message them, or chat with everyone in your game
> • Profiles show handicap and home club, so you know who you're teeing off with
> • Search near your base town, or let PlusFore use where you are right now
> • Report or block anyone, any time. We read every report
>
> PlusFore is free. We don't sell your details.
>
> Questions or ideas? Email [CONFIRM: support address]

## What's new (first release)

> Welcome to PlusFore. Find a game, enter an open, and plan your season.

## URLs

| Field | Value |
| --- | --- |
| Support URL (required) | [CONFIRM: for example getplusfore.app/support, a page with the support email] |
| Marketing URL | https://getplusfore.app |
| Privacy policy URL (required) | [CONFIRM: for example getplusfore.app/app-privacy, once published] |

## Category and other settings

| Field | Value |
| --- | --- |
| Primary category | Sports |
| Secondary category | Social Networking |
| Price | Free |
| Availability | United Kingdom and Ireland only to start |
| Copyright | 2026 Adam Hughes Studio [CONFIRM: legal name] |
| Age rating | Answer the questionnaire honestly: user-generated content and messaging between users mean Apple will rate it 13+ or similar, whatever minimum age the terms set |
| Content rights | PlusFore shows club photos from Wikimedia Commons under their licences. Answer "Yes, it contains third-party content, and I have the rights" |

## App Review information

Sign-in required: **Yes**

- Email: appreview@getplusfore.app
- Code: give the code from our conversation (kept out of the repository)

Notes for the reviewer:

> PlusFore signs in with a code sent by email, with no password. Reviewers can't receive our
> emails, so this review account has a fixed code: type the email above, tap Send my code (nothing
> is sent), then enter the code.
>
> Once in, you'll set up a profile like any new golfer. Location is only requested when you search
> or tap the location button on the map, and the app works fully if you decline. Golfers can
> report or block anyone from their profile or a chat; reports reach our team straight away and
> we act within 24 hours. Accounts can be deleted under Profile, then Delete account.

## Screenshots

Six iPhone screenshots in `export/6.9in/` (1320 x 2868, the size Apple requires) and
`export/6.5in/` (1284 x 2778), in this order:

1. Find your next game of golf. (Home)
2. Grab the spare space. (A game with a space to join)
3. Opens worth entering. (A club open)
4. Your season, all in one place. (Season calendar)
5. Sort the rest in chat. (Game chat)
6. Meet golfers who play like you. (A golfer's profile)

They use the demo golfers, not real people. To change them: edit `slides.html`, then run
`node export.js`. New phone screens come from `compose_screens.py`.

The app is iPhone only (no iPad version), so no iPad screenshots are needed.
