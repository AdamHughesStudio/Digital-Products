# Club photos

How the club photos in PlusFore were found, first run for Scotland on 10 November 2026.

## Rules

- Golf course or clubhouse photos only. No car parks, roads, signs, snow, people close up, or views where the course isn't the subject.
- Openly licensed photos only, from Wikimedia Commons (most are from Geograph Britain and Ireland, CC BY-SA 2.0). Each must be shown with its credit, which the app does under the photo.
- Every photo is looked at before it's used. A placeholder is better than a poor photo.
- A club's own photos, sent with permission, should replace these over time.

## Steps

1. `candidates.py clubs.json > candidates.json`: for each club (id, name, lat, lng), photos on Commons within 800 m whose title or description says golf course or clubhouse, with car parks and the like filtered out. Up to 8 per club, the ones naming the club first.
2. Download each club's top 6 thumbnails at 330 px (a standard Wikimedia size; others are refused). Wikimedia rate limits heavy downloads, so the Scotland run fetched them through Apify in four slow runs.
3. `sheets2.py candidates.json thumbs.json outdir`: contact sheets, five clubs per sheet, candidates numbered.
4. Claude agents look at each sheet and choose one photo per club, or none, by the rules above. The choices are then checked, borderline ones removed, and any photo picked for two clubs kept only for the club it names.
5. `build_photos.py candidates.json choices.json > photos.json`: rows for the `clubs` table (`photo_url` at 960 px, `photo_credit`, `photo_page`, `photo_licence`, `photo_source`).

## Scotland, first run

515 clubs; 281 had candidates; 208 got a photo after review.

## Scotland, second pass

`candidates2.py clubs.json skip.json > candidates.json` searches 1.5 km instead of 800 m, takes up to 100 photos, and skips any photo already judged for the club or used for another club (`skip.json`: `{"used": [...], "seen": {club_id: [...]}}`). A pick is only kept if its description names the club or it was taken within 800 m, so a neighbouring club's course isn't used by mistake.

307 clubs without a photo; 148 had new candidates; 89 got a photo after review. Scotland total: 297 of 515 clubs.
