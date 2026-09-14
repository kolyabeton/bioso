# Mission fences and scenery — 8 September 2026

Mission rooms now have a persistent transverse fence and two sliding gate leaves. The last defender unlocks the passage; every third room retains its event decision gate. The shoulders remain solid after opening. Movement, swept movement and firing visibility respect the boundary. Survival terrain and elevation files were not changed.

Existing environment atlas buildings, trees and scrapyard art now appear beside the portrait route, alongside the existing architecture models and seeded rock pockets. The central route fits the largest player body; boss-room decoration stays outside its fighting area.

## Verification

- `focused-tests.log`: mission environment, mission bosses, unlocks and events.
- `build.log`: successful production build; existing bundle size warning.
- `tests.log`: full suite, 532 passed / 18 failed.
- `baseline-tests.log`: same suite with the pre-change mission world factory substituted through a temporary Node loader, 530 passed / 20 failed. All 18 existing failures reproduce; the two additional failures are new tests for the newly implemented fence collision and visible scenery. No previously passing test regressed in this comparison.
- `browser-proof.json`: actual game route in the in-app browser at 360×640, 390×844 and 1280×720. Wide viewport retains a 405×720 portrait stage; no horizontal overflow or asset errors.
- Browser movement probe: closed gate stopped the player at Z −30.5, remained closed with one defender, opened after the fourth kill, still blocked at X 6, and admitted the player through X 0 to Z −42.5, activating room 2.

Screenshots use the development-only `?review=mission-environment&mission=garden` checkpoint with ordinary production world/render/movement/damage functions and isolated saves. The simulation is paused and the player invulnerable; kills are invoked explicitly by test controls. They are visual and interaction evidence, not an unaided complete mission playthrough.

- `entry-390x844.png`: visible building and scenery at the room entrance.
- `closed-360x640.png`: locked gate.
- `open-390x844.png`: opened passage after four kills.
- `wide-1280x720.png`: unchanged portrait stage in a wide viewport.

The temporary browser tab was closed and its viewport override reset after verification.
