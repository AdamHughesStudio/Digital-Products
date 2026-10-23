# PlusFore promo video

A 60 second, 1920 x 1080 product tour built with HyperFrames from real app screens. No stock footage.

## Scenes

| Time | Scene |
|---|---|
| 0 to 5s | Brand open: the mark builds, "PlusFore", "Find your four." |
| 5 to 10.5s | Hook: "Short of a fourth?", fourball fills up |
| 10.5 to 20s | 01 Discover: the Home feed |
| 20 to 28.5s | 02 Join: a game page, request to join |
| 28.5 to 37s | 03 Chat: group chat and reactions |
| 37 to 45.5s | 04 Compete: competitions and the date filter |
| 45.5 to 53s | 05 Your season: profile, mutual friends, calendar |
| 53 to 56.5s | Word wall: Games, Opens, Championships, Group chats, Your season |
| 56.5 to 60s | Call to action: getplusfore.app |

## Files

- `build.py` writes `index.html` from `style.css`, `timeline.js`, the screenshots in `shots/` and the call-out definitions inside it. Edit those, not `index.html`.
- `shots/` are screenshots of the demo app at 390 x 844 (2x). Call-out boxes are in screen pixels.
- `fonts/` holds Plus Jakarta Sans; `vendor/` holds GSAP so rendering works offline.

## Rebuild and render

```bash
python3 build.py
npx hyperframes lint
npx hyperframes render -f 30 -q delivery -o renders/plusfore-promo.mp4
```

Rendering needs FFmpeg and a headless Chrome (`npx hyperframes browser ensure`). The video has no sound; add a music bed in any editor.
