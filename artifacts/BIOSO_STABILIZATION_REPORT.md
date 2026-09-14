# BIOSO stabilization baseline and acceptance

Date: 2026-09-12

## Baseline

- The starting worktree was already extensively modified; no unrelated files were reverted, moved, or deleted.
- The initial full test run was already red in terrain/footprint, death-view CSS import, old audio defaults, i18n, mission/unlock, return-nerve, and map-atlas areas.
- The exclusions were kept: merchant, building-to-roofs-to-underwater chain, and visible arm hinges/mounts.

## Current acceptance

- `node --test tests/stabilization-plan.test.mjs tests/territories.test.mjs tests/i18n.test.mjs`: 19/19 pass.
- `npm run verify:assets`: 365 resources verified, including 144 models; originals unchanged.
- `npm run build`: production build passes; 123,693,987 bytes, below the 500 MB gate.
- Runtime UI checked at 360x640, 390x844, and 1440x900 with the portrait dialog width preserved and no horizontal overflow.
- Summoner diagnostic: five permanent helpers and at least 70% helper damage share in the focused test.

## Outstanding external acceptance

- Physical iPhone 16e High/60 profiling is not available in this workspace, so the 59 FPS / 55 FPS 1% low / 50 ms stall thresholds remain a device acceptance step.
- The legacy full suite remains red where assertions still encode the replaced rules (old muted audio defaults, old weapon/damage values, old boss schedule, old PNG secret presentation), alongside the pre-existing baseline failures above.
