# Mission environments — 9 September 2026

Five mission IDs now resolve to five scenery profiles while preserving the flat 25-room corridor and existing mission progression:

- `garden` — Верхние сады
- `quarantine` — Тихая свалка
- `core` — Корневой лес
- `nursery` — Заросший город
- `mother` — Роевой питомник

Each profile owns its ground treatment, landmark policy, ambient and edge vegetation palettes, three ordinary-room compositions and a boss-room composition. The root forest uses the existing dark soil atlas instead of the garden-like stone override. The swarm nursery mixes the existing garden and forest atlas cells with an organic patch mask and the shipped seedpod, vine and moss models; no new generated art was added.

## Verification

- Focused mission, boss, unlock, UI and asset tests: all environment-related assertions pass. The unrelated pre-existing ranged-navigation assertion remains the only failure in that focused batch.
- Production bundling completes, but the final size gate currently fails at 100,338,392 / 100,000,000 bytes. During this pass the shared environment payload gained two unrelated `forest-living` files totalling 1,254,366 bytes; this mission revision adds no image or model files.
- Real `mission-environment` routes: all five profiles loaded at 390×844 with `ready=true`, zero asset errors, zero model failures and the expected Russian HUD location.
- Real `mission-boss` routes: all five boss models loaded in the correct final-room environment with zero asset errors.
- Responsive proof: 360×640 keeps a 360 px stage; 1280×720 keeps a 405 px portrait stage.

Updated ground and vegetation comparison: `mission-environments-entry-comparison-v2.png`.
Original entry comparison: `mission-environments-entry-comparison.png`.
Boss-room comparison: `mission-environments-boss-comparison.png`.
