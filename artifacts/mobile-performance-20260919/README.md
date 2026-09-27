# Mobile frame-budget adaptation — 2026-09-19

Implemented: full-frame CPU and measured frame-interval input, optional fresh GPU samples (missing/stale stays unknown), pause/visibility/target-change warmup, decoration-first degradation, delayed recovery, and resolution changes before rendering. Unrelated settings changes no longer reset the governor. Default mobile low/30 settings and stored choices are preserved.

Decoration budget covers forest pollen, weather particles, and cosmetic hit/blood particles. Only their counts change; their size, material, lifetime and all gameplay damage/projectiles/attack warnings remain unchanged. The later mobile-flicker pass enables the browser's small mobile MSAA buffer and is documented separately; it is not an iPhone performance measurement.

## Method and limitations

Real game renderer/simulation in Codex in-app browser on this Mac, 390×844 CSS pixels, low quality, master sound off. An isolated copy of the workspace at turn start supplies the baseline; the same copy with only the six implementation files replaced supplies the after runs. The fixture forces the existing mobile rendering path (antialiasing off); it does not emulate an iPhone GPU or Safari. Review saves are in memory only.

Each run uses the existing review seed 20317, runs 28 wall seconds and samples the final 20 seconds. Scenarios: stationary game start, combat with replenishment toward 100 enemies and all learned abilities (existing stress setup), and rotating movement input. The load controller refills health to keep the comparison running and suppresses upgrade interruptions. These are bounded regression samples, not a thermal/battery endurance test or proof of 60 FPS on an iPhone. Separate runs and wall-time based movement introduce normal timing variance.

Raw JSON files retain FPS, frame intervals, CPU timing, stalls over 50 ms, renderer scale/draws/triangles/GPU timing, subsystem samples and final game state. The fixture source is `mobile-perf-review.js`; `baseline/` contains the six before files, including the test-only fixture hook and mobile override. `implementation.patch` excludes these test-only changes and unrelated existing workspace edits.

`no-gpu-simulation.json` is a synthetic regression, not a hardware benchmark: requested 60 FPS, delivered 30 FPS, CPU work 5 ms, no GPU query. Before: no response. After: decorative density 0.5 at about 5 seconds, resolution 0.8 at 12 seconds and 0.6 at 19 seconds if overload persists.

## Validation

- 27 focused tests passed: mobile defaults/persistence, missing and stale GPU timing, intentional 30/60 cadence, pauses/resume/target changes, sustained overload/recovery, decorative count/size/lifetime, forest/weather behavior and GPU query lifecycle.
- Production JS/CSS compilation passed with public asset copying disabled in an isolated temporary output directory. This is not a packaged-game asset verification. Warnings about unchanged asset URLs and a large bundle are retained in `build.txt`.
- Additional combat regression checks: 18 passed, one existing shotgun spread expectation failed. The identical failure was reproduced against the before snapshot: actual ±0.2/±0.1 versus expected ±0.18/±0.09. No combat coefficients or expectations were changed.
- The user's square-particle symptom was not confidently reproduced in the inspected mobile-sized start and forest routes. Forest pollen does use unmasked quads, but that is not enough to identify the reported symptom. Particle appearance remains pending a screenshot and the iPhone model.
- No real iPhone/Safari measurement was available; device confirmation remains pending.

## Desktop comparison (not iPhone performance)

| Scenario | Target | FPS before → after | Frame p95 ms before → after | CPU p95 ms before → after | Frames >50 ms before → after |
|---|---:|---:|---:|---:|---:|
| start | 30 | 29.9 → 29.9 | 34.0 → 34.0 | 6.0 → 4.5 | 0 → 0 |
| crowd | 30 | 29.9 → 29.9 | 34.0 → 33.9 | 16.0 → 15.5 | 2 → 1 |
| movement | 30 | 30.0 → 29.9 | 33.9 → 34.1 | 4.3 → 6.1 | 0 → 0 |
| start | 60 | 59.7 → 60.0 | 17.4 → 17.3 | 3.6 → 3.2 | 1 → 0 |
| crowd | 60 | 60.0 → 59.9 | 17.4 → 17.5 | 12.6 → 12.6 | 0 → 0 |
| movement | 60 | 59.7 → 59.8 | 17.4 → 17.5 | 3.7 → 3.3 | 1 → 0 |

All six after runs retained render scale 1 and decoration scale 1, with zero reported asset/model failures. These samples show maintained pacing, not a demonstrated throughput gain; CPU differences between runs include ordinary variance.

## Live governor integration

`synthetic-pressure.json` adds 30 ms of artificial CPU work per frame after the initial warmup in the real game loop. This deliberately slow fixture is not a performance result. At about 12 s decoration fell to 0.5 while resolution stayed 1; at 20 s resolution was 0.8 and at 26 s it was 0.6. Weather particles fell from 14 to 7. This confirms the main-loop measurement, view governor, and decoration consumers are wired together.

## Visual checks

Actual gameplay screenshots were inspected at 360×640, 390×844 and 1280×720. At 390×844 and 1280×720, CSS canvas bounds and drawing-buffer dimensions matched the viewport on low quality at scale 1. Browser error log was empty. The alternate prepared combat fixture opened its existing overload assembly panel; that wide screenshot is named `after-assembly-wide.png` and is not performance evidence. `visual-360.json`, if present, is a viewport smoke run whose size was changed during execution, so it is excluded from the fixed-size comparison.

The temporary test server was stopped and the test page navigated away after verification. The existing project servers were left running.

Preview limitation discovered on shutdown: the isolated Vite allow list blocked the Onest font files during both the baseline and after benchmarks. Those paired measurements therefore use the same fallback font. The allow list was corrected for the final screenshots and font delivery verified separately. This further limits interpreting small CPU differences as an optimization gain.

Final 390×844 screenshot was recaptured after the font correction: font HTTP response 200, `document.fonts.status === 'loaded'`, Onest font check true. `fonts-390.json` is another mixed-viewport smoke run and is excluded from performance comparisons.
