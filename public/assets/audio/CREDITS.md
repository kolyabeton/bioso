# Background music

## Story voices

Russian and English story dialogue is synthesized locally with installed macOS voices, then processed into an eight-role cast. The Russian girl uses the previously selected brighter Milena performance; the Gardener has a separate low, warm voice. Mercury Hunter, Scrap Leviathan, Root Cathedral, Mirror Collector, Swarm Shepherd and Mother each use their own source performance, cadence, pitch, frequency band, distortion and echo profile in both languages. Every transmission also plays a quiet synthesized radio bed with static, hum and scanning interference. These are generated performances, not recordings of a human child or actor. Rebuild command: `node scripts/build-story-voice.mjs`.

Tracks approved by the user on 2026-09-08.
Technology loops continuously across the menu, parts atlas and ordinary gameplay; boss encounters loop only the first 45 seconds of Touch until the fight ends. Each new boss engagement starts the excerpt from zero. Reality is retained as an unused asset.
Settings inherit their parent screen music. Background playback and pauses within the same boss encounter preserve track position.
Track changes crossfade over 0.8 seconds, after the incoming audio has loaded.
License: Pixabay Content License, including commercial use within the game.
Terms: https://pixabay.com/service/terms/ (section 5).
Files downloaded from the public player sources without login. Touch is trimmed to 0:00–0:45 with a 0.8-second fade-out.
Quiet background playback gain: 0.2; default music setting remains 10/100 (effective gain 0.02), effects 60/100. User settings are unchanged.
Active boss fights smoothly raise music gain by 15% (×1.15); leaving the fight or returning to the menu restores the background level. This does not change the saved volume setting.

## 231 Реальность (Hard Techno) — Владислав Заворин

File: `reality-zavorin.mp3`
Source: https://pixabay.com/ru/music/техно-и-транс-231-реальность-hard-techno-владислав-заворин-541191/
Download: https://cdn.pixabay.com/audio/2026/06/09/audio_4bfab1e104.mp3
The source page labels this track as AI-generated.

## 105 Касание (Bleep Techno) — Владислав Заворин

File: `touch-zavorin-intro.mp3` (first 45 seconds; remainder removed)
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

## Selected weapon effects — approved 2026-09-25

These six recordings were selected from Pixabay under the Pixabay Content License. Original page URLs, direct download URLs, durations and SHA-256 hashes are recorded in `weapon-sources.json`. Pollinator attacks are intentionally silent.

- **Seeder** — `approved-weapon-seed-smg.mp3`; [Submachine Gun](https://pixabay.com/sound-effects/film-special-effects-submachine-gun-79846/) by morganpurkis (Freesound).
- **Spreader** — `approved-weapon-shotgun.mp3`; [Shotgun Blast](https://pixabay.com/sound-effects/film-special-effects-shotgun-blast-352038/) by Universfield.
- **Injector** — `approved-weapon-needle-rifle.mp3`; [Rifle Gunshot](https://pixabay.com/sound-effects/film-special-effects-rifle-gunshot-99749/) by Mozfoo (Freesound).
- **Pruner** — `approved-weapon-whip-slash.mp3`; [Sword Slash and Swing](https://pixabay.com/sound-effects/film-special-effects-sword-slash-and-swing-185432/) by DavidDumaisAudio.
- **Gripper** — `approved-weapon-fangs-silenced-gunshot.mp3`; [Silenced Gunshot](https://pixabay.com/sound-effects/film-special-effects-silenced-gunshot-81063/) by morganpurkis (Freesound).
- **Shield** — `approved-weapon-shield-bash.mp3`; [Sword Slash With Metallic Impact](https://pixabay.com/sound-effects/film-special-effects-sword-slash-with-metallic-impact-185435/) by DavidDumaisAudio.

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

## Pixabay insect combat composites — approved 2026-09-14

Prepared as mono 44.1 kHz attack cuts from Pixabay sources. Original downloads and audition versions are retained in `artifacts/audio-pixabay-candidates-20260914/`; exact hashes and source URLs are recorded in `effect-sources.json`.

- **Insect Washer Attack Composite** — `approved-acid-wash.wav`; 1.18 s. [Wasp Wings 2](https://pixabay.com/sound-effects/film-special-effects-wasp-wings-2-101131/) by Wakerone (Freesound) supplies the real insect wings and gated stridulation; [Wet Squelch Impact](https://pixabay.com/sound-effects/film-special-effects-wet-squelch-impact-352302/) by Universfield supplies the organic discharge. Played by the Мойка/Washer ranged attack at gain 0.30, with 0.08 s retrigger protection and at most three voices.
- **Symbiont Insect Bite Composite** — `approved-symbiont-bite.wav`; 0.82 s. [Wasp Wings 2](https://pixabay.com/sound-effects/film-special-effects-wasp-wings-2-101131/) supplies the wing pickup, [Insectoid Monster Clicking](https://pixabay.com/sound-effects/film-special-effects-insectoid-monster-clicking-98623/) by LucasDuff (Freesound) supplies the mandible click, and [Short Crunches](https://pixabay.com/sound-effects/film-special-effects-short-crunches-107018/) by srkrgt (Freesound) supplies the brittle contact. Shared by Pollinator, ability, Beekeeper-body and Beekeeper-set companions at gain 0.27, with 0.065 s swarm retrigger protection and at most four voices.

## Defense and movement effects — approved 2026-09-14

- **Dodge** — `approved-dodge.wav`; 1.272 s. [Wasp Wings 2](https://pixabay.com/sound-effects/film-special-effects-wasp-wings-2-101131/) by Wakerone (Freesound). Played only when a dodge succeeds, at gain 0.33 with 0.06 s retrigger protection.
- **Spring Leap launch** — `approved-spring-leap.wav`; 0.80 s. [Metal Spring](https://pixabay.com/sound-effects/film-special-effects-metal-spring-96218/) by PappaBert (Freesound). First spring release trimmed for the `spring-leap` event, at gain 0.55 with 0.15 s retrigger protection.

## Drone and ability effects — approved 2026-09-14

- **Drone death** — `approved-drone-death.wav`; 0.50 s. [egg crack sounds mixed](https://pixabay.com/sound-effects/household-egg-crack-sounds-mixed-104392/) by the Freesound Community. Exactly the first 0.5 seconds requested by the user, played on `summon-death` at gain 0.28.
- **Sporebrood** — `approved-sporebrood.wav`; 0.75 s. [Spray Puff](https://pixabay.com/sound-effects/film-special-effects-spray-puff-272431/) by Homemade_SFX. Played once on the `ability-impact:sporebrood` event at gain 0.32; the adjacent visual `soul-proc` does not duplicate it.
- **Overgrowth** — `approved-overgrowth.wav`; 1.60 s. [Big plants (crops) growing quickly](https://pixabay.com/sound-effects/film-special-effects-big-plants-crops-growing-quickly-43721/) by Contant_aghony (Freesound). Played at each `soul-proc:overgrowth` threshold at gain 0.30.
- **Revive** — `approved-revive.wav`; 1.15 s. [Human Heartbeat (60 BPM)](https://pixabay.com/sound-effects/film-special-effects-human-heartbeat-60-bpm-87143/) by FenrirFangs (Freesound). One organic pulse on a successful `soul-proc:revive`, at gain 0.42.
- **Reverse-heart discharge** — `approved-heart-discharge.wav`; 0.85 s. [Single Heartbeat HQ_BeatSmith](https://pixabay.com/sound-effects/people-single-heartbeat-hq-beatsmith-108037/) by Lunardrive (Freesound). Played once for each `heart-pulse` discharge, regardless of how many targets it hits.

## Enemy and boss ability effects — approved 2026-09-14

- **Needle and hive volleys** — `approved-enemy-wasp-volley.wav`; 0.75 s. [Wasp Wings 2](https://pixabay.com/sound-effects/film-special-effects-wasp-wings-2-101131/) by Wakerone (Freesound). Used only for `hunter-volley`, `hive-volley`, `needle-line`, `needle-fan` and `needle-rain`, at gain 0.30.
- **Brood ring, acid bloom and vine sweep** — `approved-enemy-wet-cast.wav`; 0.70 s. [wet squish 1](https://pixabay.com/sound-effects/film-special-effects-wet-squish-1-79324/) by 45t (Freesound). Source cut 26.65–27.35 s, used only for `brood-ring`, `acid-bloom` and `vine-sweep`, at gain 0.38.
- **Boss phase shift** — `approved-boss-phase.wav`; 2.35 s. [Low Monster Roar](https://pixabay.com/sound-effects/horror-low-monster-roar-97413/) by Robson220pl (Freesound). Played only on `boss-phase`; the adjacent `boss-action: phase-2` remains silent so the transition is not doubled.
- **Boss swarm release** — `approved-boss-swarm.wav`; 2.20 s. [Agressive Bees](https://pixabay.com/sound-effects/nature-agressive-bees-45822/) by dlp_coasters (Freesound). Shared by the adjacent `swarm` and `bees` actions with a 0.30 s coalescing interval, producing one release cue per summon.
- **Heavy boss strike family** — `approved-boss-heavy-slam.wav`; 1.55 s. [Boulder Impact](https://pixabay.com/sound-effects/horror-boulder-impact-487673/) by DRAGON-STUDIO. Used only for `slam`, `root-slam`, `crush`, `hunter-pounce` and `ground-claws`; duplicated action/strike events are coalesced for 0.10 s.
- **Cathedral root eruption** — `approved-boss-root-eruption.wav`; 1.20 s. [052256_Cracking Earthquake](https://pixabay.com/sound-effects/nature-052256-cracking-earthquake-cracking-soil-cracking-stone-86770/) by the Freesound Community. Source cut 0.70–1.90 s, used only for `roots`; adjacent action and strike events are coalesced for 0.10 s.
- **Heavy boss sweep family** — `approved-boss-heavy-sweep.wav`; 0.90 s. [Whoosh Large Sub](https://pixabay.com/sound-effects/film-special-effects-whoosh-large-sub-384631/) by SoundReality. Source cut 0.55–1.45 s, used only for `cleave`, `reaping-sweep`, `drill-sweep` and `brood-sweep` at gain 0.36.

## Progression and important event effects — approved 2026-09-14

- **Unlock or achievement** — `approved-unlock.wav`; 0.45 s. [Insect Chirping 01](https://pixabay.com/sound-effects/nature-insect-chirping-01-32552/) by aglinder (Freesound). Source cut 40.20–40.65 s with ×5 source gain, played on `unlock` at gain 0.34 and coalesced for 0.25 s.
- **Group cleared / reward ready** — `approved-group-cleared.wav`; 0.85 s. [seedpods](https://pixabay.com/sound-effects/film-special-effects-seedpods-79721/) by vigorish (Freesound). Source cut 13.20–14.05 s, played on `group-cleared` at gain 0.36.
- **Lore found** — `approved-lore-found.wav`; 1.00 s. [180813 Wasp, scratching wood, collecting for nest, insect TORONTO](https://pixabay.com/sound-effects/nature-180813-wasp-scratching-wood-collecting-for-nest-insect-toronto-26124/) by TRP (Freesound). Source cut 0.75–1.75 s, played on `lore-found` at gain 0.30.
- **Important death / destruction** — `approved-important-death.wav`; 0.95 s. [Crack and Crunch](https://pixabay.com/sound-effects/film-special-effects-crack-and-crunch-14891/) by Aurelon (Freesound). Played only for elite, boss, final and objective destruction events at gain 0.38; ordinary enemy deaths remain silent.
- **Challenge result** — `approved-challenge-result.wav`; 1.10 s. [Seeds](https://pixabay.com/sound-effects/film-special-effects-seeds-404906/) by Prmodrai. Used once when a challenge or race resolves; failure uses the same approved recording at a quieter level and lower playback rate.

## Realistic RPG movement and event effects — approved 2026-09-14

- **Level up** — `approved-level-up.wav`; 3.10 s. [Elemental Magic Spell Impact Outgoing](https://pixabay.com/sound-effects/film-special-effects-elemental-magic-spell-impact-outgoing-228342/) by RescopicSound. One restrained dark-fantasy impact for any number of levels earned by the same XP grant; it replaces the ordinary XP beep for that pickup.
- **Player step** — `approved-player-step.wav`; 0.30 s. [St3 Footstep](https://pixabay.com/sound-effects/film-special-effects-st3-footstep-sfx-323056/) by Data_pion layered with [Robot mechanism 014](https://pixabay.com/sound-effects/film-special-effects-sound-design-elements-robot-mechanism-014-336703/) by AudioPapkin. Clean gated contact with reduced sub-bass and no high squeak; emitted from actual travel distance at a quiet gain 0.22 with one-percent alternating pitch.
- **Shield block** — `approved-shield-block.wav`; 0.86 s. [shield guard](https://pixabay.com/sound-effects/film-special-effects-shield-guard-6963/) by nekoninja (Freesound). Played only for successful set, consumable, organ, or reflection shield events; post-damage invulnerability remains silent.
- **Player death** — `approved-player-death.wav`; 2.35 s. [Heavy Body Fall](https://pixabay.com/sound-effects/film-special-effects-heavy-body-fall-352446/) by Universfield. Played once when the player changes from alive to dead.
- **Boss arrival** — `approved-boss-arrival.wav`; 4.25 s. [giant footsteps](https://pixabay.com/sound-effects/film-special-effects-giant-footsteps-39193/) by Beefmaster69 (Freesound). Played once for mission and invasion spawns, or on the first engagement of a pre-existing Survival habitat boss.

## Combat feedback and resolution — approved 2026-09-14

- **Weapon reload** — `approved-weapon-reload.wav`; 1.056 s. [1911 Reload](https://pixabay.com/sound-effects/film-special-effects-1911-reload-6248/) by nioczkus (Freesound). One short physical mechanism action at gain 0.119, reduced by a further 30%, only on reload start for Инъектор, Рассеиватель and Доставщик; all other weapons and `reload-end` stay silent, and near-simultaneous reloads are coalesced.

## World and environment effects — approved 2026-09-14

- **Root Forest canopy** — `approved-world-root-forest.wav`; 24.0 s. [wind in the trees](https://pixabay.com/sound-effects/nature-wind-in-the-trees-24035/) by deleted_user_229898 (Freesound). Real wind bed, crossfaded by the Root Forest environment weight.
- **Brood Nursery interior** — `approved-world-brood-nursery.wav`; 24.0 s. [Beehive contact microphone recording](https://pixabay.com/sound-effects/nature-beehive-contact-microphone-recording-by-an-aquarian-h2a-france-16690/) by felix.blume (Freesound). Low-passed hive vibration bed, crossfaded by the Brood Nursery environment weight.
- **Garden irrigation** — `approved-world-garden-pump.wav`; 18.0 s. [Underground Water Pumping Noise](https://pixabay.com/sound-effects/film-special-effects-underground-water-pumping-noise-24224/) by pppBala (Freesound). One nearest-emitter loop for irrigators and basins.
- **Scrapyard machinery** — `approved-world-scrap-turbine.wav`; 3.888 s. [Turbine Loop](https://pixabay.com/sound-effects/technology-turbine-loop-36475/) by Aelstraz (Freesound). One nearest-emitter loop shared by turbines and engines.
- **Mission gate opening** — `approved-world-mission-gate.wav`; 1.60 s. [Huge Heavy Metal Door Swinging](https://pixabay.com/sound-effects/household-huge-heavy-metal-door-swinging-48239/) by aryxmyth (Freesound). Short 0.30–1.90 s cut at ×2 source gain, played once on a nearby closed-to-open transition.
