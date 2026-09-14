# Current trailer — English, original BIOSO design system

`BIOSO-trailer-EN-16x9.mp4` is the revised deliverable: about 35 seconds, horizontal HD, boss battle music and the game's combat/UI sound effects.

It includes the real home menu and original `bioso-wordmark-v1.png`, inventory, a successful weapon upgrade (damage 6.3 → 7.1), level-up choices, the Bioelectricity skill tree, the world map and a selected event, mission selection, three combat builds and Scrap Leviathan.

All on-screen writing is from the shipped English UI. The game's Onest font, ceramic materials, olive metal components, dialog sizes and layout are preserved. The previous generic title cards and Russian captions are absent.

Combat sequences are staged recordings from the game engine. Interface sequences use exact native in-app-browser screenshots before and after real interactions, cut into the montage; they are not continuous interface recordings. Equipment, learned abilities, invulnerability and explored map state were granted for filming. The game's production source and saved player profile were not changed.

Audio: `public/assets/audio/touch-zavorin.mp3`, the current boss battle track, plus synchronized combat recordings and existing UI samples. Attribution: `public/assets/audio/CREDITS.md`.

`manifest.json` contains the timeline and provenance; `verification.json` records the final decode/audio check. Rebuild using `render.py` from the game root with `PYTHONPATH=temp/trailer-tools` and the bundled Python runtime.
