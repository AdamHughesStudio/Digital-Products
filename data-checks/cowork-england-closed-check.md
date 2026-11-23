# Cowork prompt: are these 12 English golf courses still open?

Paste everything below the line into Cowork.

---

I run PlusFore, a golf app for the UK and Ireland. These 12 English golf courses are in the app, but online sources disagree on whether they are still open. Please find out the current status of each one.

For each course:

1. Search the web for the club's own website, social media posts, local news, council or planning records, and recent golfer reviews. Look at dates: 2025 or 2026 activity counts as evidence it is open; a dated closure notice or news report counts as evidence it has closed.
2. If the club has a phone number, you may call or note it for me, but do not book anything or give any personal details.
3. A course that closed and reopened under a new name on the same land counts as OPEN; give the new name exactly as the club writes it.
4. If only a driving range, footgolf, disc golf or pitch and putt remains, count it as CLOSED for golf.
5. Watch for namesakes in other places: use the town and map position to make sure it is the right course.
6. Only mark OPEN or CLOSED when the evidence is clear. Otherwise mark UNSURE and say what you found.

Please give me a CSV with these columns:

ID, Name we have, Status (OPEN, CLOSED or UNSURE), Current name (if different), Own website (or none), Evidence (one sentence with the source and its date), Source link

The courses (ID, name, town, latitude, longitude):

osm-w399083483, Caddington Golf Club, Luton, 51.8790, -0.4731 (sold to Storm Golf; closed in October 2024 for engineering works; has it reopened?)
osm-w5080936, Kent & Surrey Golf & Country Club, Edenbridge, 51.2028, 0.0420 (listed as closed and part sold, but no dated report)
osm-w8916938, Northolt Golf Course, Northolt, 51.5375, -0.3792 (closed in 2017 and became footgolf? Ealing Council said a new 18-hole course would open in Northolt in June 2024)
osm-w88280611, Canons Court Golf, Wotton-under-Edge, 51.6430, -2.3739 (listed as permanently closed, no date)
osm-w1194539852, Clowance Golf Course, Praze-an-Beeble, 50.1697, -5.3145 (one listing says closed; others still list golf at Clowance Estate)
osm-w441532197, Highbullen Golf Course, Chittlehamholt, 50.9676, -3.9220 (now The Mole Resort with 9 holes?)
osm-w368429316, Ratcliffe on Soar Power Station, Ratcliffe-on-Soar, 52.8615, -1.2549 (a staff course at the power station, which shut in September 2024)
osm-w55492229, Essington Golf Course, Essington, 52.6337, -2.0386 (Wood Farm 9-hole course, sold at auction in 2019)
osm-w35767650, TFG Golf Course (Penketh), Penketh, 53.3751, -2.6709 (True Fit Golf at Fiddlers Ferry; a 2025 review says the 18 holes have gone and only the range remains)
osm-w420793306, Belford Golf Club, Belford, 55.5993, -1.8201 (said to have closed in 2020, but housing plans talk of keeping the nine holes)
osm-w167589181, Norton Golf Course, Stockton-on-Tees, 54.5997, -1.3375 (said to have closed in 2016 with homes planned; some listings still show it)
osm-w225992653, Sawdon Pines Golf Club, Sawdon, 54.2443, -0.5565 (one listing says closed; latest review 2021)
