# BIOSO abilities v2 — acceptance proof

## Scope

- Ability catalog: 48 branch nodes + 8 synergies = 56 unique abilities, with 5 repeatable minor upgrades unchanged.
- Reworked nodes: `tempo.1`, `might.2`, `ranged.2`, `summons.1`.
- New synergies: `neuralweb`, `countershell`, `sporebrood`, `overgrowth`, `cryotrail`.
- New combat reactions use the shared secondary-damage contract and do not recursively trigger ammo spend, attack counters, echoes, chains, splinters, or spores.
- VFX budgets: 1536 high-quality particles, 512 low-quality particles, 24 active ability sources, 64 ground traces, and 0.12 s local-effect merging.

## Visual proof

All clips below are recordings of the real WebGL combat canvas at 390×844, not isolated particle mockups.

- `neuralweb-390.webm`
- `countershell-390.webm`
- `sporebrood-390.webm`
- `overgrowth-390.webm`
- `cryotrail-390.webm`
- `stress-390.webm` — 100 enemies, 56/56 abilities, 4 weapons.
- `icons-contact-sheet.png` — the nine updated/new transparent 512×512 medallions.

## Responsive checks

| Route | Browser viewport | Result |
|---|---:|---|
| Ability tree | 360×640 | Dialog 344×624, no broken images, no horizontal overflow, controlled vertical scroll. |
| Ability tree and combat | 390×844 | Portrait stage preserved; no broken images or horizontal overflow. |
| Ability tree and stress combat | 1280×800 | Game stage remains centered at 450×800; no broken images or horizontal overflow. |
| Cryotrail combat | 360×640 | Two live canvases, no broken images or horizontal overflow. |

## Automated checks

- Focused ability/tree/VFX/system/i18n suite: 56/56 passed.
- Production build: passed; 99,024,138 bytes, 975,862 bytes below the 100 MB budget at the recorded run.
- Isaac probe: completed all ordinary, mixed, and combined seeded runs; peak larvae 6 and peak returning projectiles 4.
- Full shared-worktree suite: 619/642 passed. The 23 failures are in unrelated in-progress lanes (for example equipment-comparison formatting and expedition spawn expectations); the focused ability suite remains fully green.

Existing unrelated dirty-worktree changes were preserved.
