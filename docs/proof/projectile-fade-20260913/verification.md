# Projectile afterglow — 2026-09-13

Latest direction: Crimsonland-style ending. Active projectiles remain fully visible through their existing range; on removal, a stationary presentation copy fades the body over 0.10 seconds and its trace over 0.25 seconds. Trace opacity also falls along its length. This is an adaptation to BIOSO models, not a pixel-identical recreation.

Reference: the independent reconstruction of Crimsonland Classic retains a stopped projectile in a linger phase, with the bullet sprite disappearing before its trace. See [bullet drawing](https://github.com/banteg/crimson/blob/master/src/crimson/render/projectile_draw/primary_bullet.py) and [projectile lifecycle](https://github.com/banteg/crimson/blob/master/src/crimson/projectiles/runtime/projectile_pool.py). No external game assets or code copied.

Coverage: player seeds, needles, shotgun/pistol and acid shots through the shared renderer; harpoon steel/tether; ricochet bee body/wings/engine; hostile seeds, needles, boss shells, their glows/traces/motes; reflected and summon shots. Persistent rockets retain their existing explosion. Return turns retain their projectile identity. View remnants never enter simulation arrays. Reset, backwards time, and world transitions clear remnants; active shots take pool priority.

Validation:
- 17 focused tests pass, including all hostile layers, instance reuse and growth, return turns, recycled ids, bounded remnants, world transitions, rockets, and distinct shader cache keys for trail geometry bounds.
- Vite production code bundle succeeds. Public asset copying/compression was intentionally outside this code-only check. Existing large-chunk warnings remain.
- Actual production game renderers inspected in the DEV presentation route `/?review=projectile-fade`: full flight, fading body, trace-only and gone states. This route controls visual fixtures; it is not a combat balance test.
- Desktop (1280×720) and mobile (390×844) states inspected. The final MP4 was decoded into `crimson-video-frames.png` and inspected across flight, body fade, stationary trace and disappearance.
- Latest proof is `crimsonland-style.mp4`; `projectile-fade.mp4` and full/half/faint/gone PNGs record the superseded pre-expiry version, before the user's Crimsonland instruction.
