# Background music

## Story voices

Russian and English story dialogue is synthesized locally with installed macOS voices, then processed into an eight-role cast. The Russian girl uses the previously selected brighter Milena performance; the Gardener has a separate low, warm voice. Mercury Hunter, Scrap Leviathan, Root Cathedral, Mirror Collector, Swarm Shepherd and Mother each use their own source performance, cadence, pitch, frequency band, distortion and echo profile in both languages. Every transmission also plays a quiet synthesized radio bed with static, hum and scanning interference. These are generated performances, not recordings of a human child or actor. Rebuild command: `node scripts/build-story-voice.mjs`.

Tracks approved by the user on 2026-09-08.
Technology loops continuously across the menu, parts atlas and ordinary gameplay; Touch loops while a living boss is engaged. Reality is retained as an unused asset.
Settings inherit their parent screen music. Switching between playlists preserves track position.
Track changes crossfade over 0.8 seconds, after the incoming audio has loaded.
License: Pixabay Content License, including commercial use within the game.
Terms: https://pixabay.com/service/terms/ (section 5).
Files downloaded from the public player sources without login, unchanged.
Quiet background playback gain: 0.2; default music setting remains 10/100 (effective gain 0.02), effects 60/100. User settings are unchanged.
Active boss fights smoothly raise music gain by 15% (×1.15); leaving the fight or returning to the menu restores the background level. This does not change the saved volume setting.

## 231 Реальность (Hard Techno) — Владислав Заворин

File: `reality-zavorin.mp3`
Source: https://pixabay.com/ru/music/техно-и-транс-231-реальность-hard-techno-владислав-заворин-541191/
Download: https://cdn.pixabay.com/audio/2026/06/09/audio_4bfab1e104.mp3
The source page labels this track as AI-generated.

## 105 Касание (Bleep Techno) — Владислав Заворин

File: `touch-zavorin.mp3`
Source: https://pixabay.com/ru/music/электронный-105-касание-bleep-techno-владислав-заворин-527326/
Download: https://cdn.pixabay.com/audio/2026/05/01/audio_4c4737a3f5.mp3
The source page labels this track as AI-generated.

## Technology — Sub_Clair

File: `technology-sub-clair.mp3`
Source: https://pixabay.com/ru/music/техно-и-транс-technology-587852/
Download: https://cdn.pixabay.com/audio/2026/08/18/audio_e42ca84deb.mp3
The source page marks this track as registered with Content ID.

## Approved gunshot

Single Pistol Gunshot — uploaded by freesman.
User approved the audition on 2026-09-07. Used for seed and needle attack events.
Source listing: https://directory.audio/sound-effects/weapons/39507-single-pistol-gunshot
Listing date: 2026-06-20 (original recording date not specified).
Listing license: CC0.
Exact approved preview: https://directory.audio/media/fc_local_media/audio_preview/Single-Pistol-Gunshot.mp3
The shipped file is unchanged from the approved audition.

## Selected combat effects — approved 2026-09-08

Pixabay Content License: https://pixabay.com/service/license-summary/
Processed for gameplay: mono, trimmed silence/segments, short edge fades, gain adjusted. Original recordings retained in artifacts/audio-selected-20260908/originals. Exact cuts and hashes: effect-sources.json.

- **Sword Slash With Metal Shield Impact** — DavidDumaisAudio. [approved-shield.wav](https://pixabay.com/sound-effects/film-special-effects-sword-slash-with-metal-shield-impact-185433/); source 0.20–1.25 s, output 1.05 s.
- **Sword Blade Slicing Flesh** — Universfield. [approved-claws.wav](https://pixabay.com/sound-effects/film-special-effects-sword-blade-slicing-flesh-352708/); source 0.12–0.72 s, output 0.60 s.
- **Drill spinning in open air** — neuroxik (Freesound). [approved-drill.wav](https://pixabay.com/sound-effects/film-special-effects-drill-spinning-in-open-air-33575/); source 1.65–2.25 s, output 0.60 s.
- **Crossbow Firing** — GameWithBepis (Freesound). [approved-harpoon.wav](https://pixabay.com/sound-effects/film-special-effects-crossbow-firing-95020/); source 0.00–0.70 s, output 0.70 s.
- **Electric Sparks** — kev_durr (Freesound). [approved-electric.wav](https://pixabay.com/sound-effects/film-special-effects-electric-sparks-6130/); source 0.10–0.42 s, output 0.32 s.
- **HQ Explosion** — Quaker540 (Freesound). [approved-rocket.wav](https://pixabay.com/sound-effects/film-special-effects-hq-explosion-6288/); source 0.00–2.80 s, output 2.80 s.

## UI and pickup effects — approved 2026-09-08

Sources: ui-effect-sources.json. Prepared mono cuts with gain adjustment and edge fades. Closing menu is the exact sample reversal of prepared Window Open Small, as requested. Wet Squelch is used for bodies/organs; Metal Latch for legs/weapons. Original MP3s retained in artifacts/ui-audio-selected-20260908/originals.

- **Cassette Recorder Stop Button – Mechanical Click Sound** — arunangshubanerjee. [approved-ui-click.wav](https://pixabay.com/sound-effects/film-special-effects-cassette-recorder-stop-button-mechanical-click-sound-359987/); 0.18 s. Trimmed and gain adjusted.
- **UI Movement - Menu - Modern Interface - Window Open Small** — RescopicSound. [approved-ui-open.wav](https://pixabay.com/sound-effects/film-special-effects-ui-movement-menu-modern-interface-window-open-small-230486/); 1.36 s. Trimmed and gain adjusted.
- **UI Movement - Menu - Modern Interface - Window Open Small** — RescopicSound. [approved-ui-close.wav](https://pixabay.com/sound-effects/film-special-effects-ui-movement-menu-modern-interface-window-open-small-230486/); 1.36 s. Exact sample reversal of approved-ui-open.wav
- **UI Alert - Menu - Modern Interface - Confirm Small** — RescopicSound. [approved-ui-confirm.wav](https://pixabay.com/sound-effects/film-special-effects-ui-alert-menu-modern-interface-confirm-small-230482/); 0.92 s. Trimmed and gain adjusted.
- **UI Alert - Menu - Modern Interface - Deny Large** — RescopicSound. [approved-ui-deny.wav](https://pixabay.com/sound-effects/film-special-effects-ui-alert-menu-modern-interface-deny-large-230478/); 0.76 s. Trimmed and gain adjusted.
- **Wet Squelch Impact** — Universfield. [approved-ui-organic.wav](https://pixabay.com/sound-effects/film-special-effects-wet-squelch-impact-352302/); 0.90 s. Trimmed and gain adjusted.
- **Metal Latch Latching 2** — deleted_user_7146007 (Freesound). [approved-ui-mechanical.wav](https://pixabay.com/sound-effects/film-special-effects-metal-latch-latching-2-101976/); 0.70 s. Trimmed and gain adjusted.
- **Item Pickup** — UGILA (Freesound). [approved-ui-pickup.wav](https://pixabay.com/sound-effects/film-special-effects-item-pickup-37089/); 0.40 s. Trimmed and gain adjusted.
