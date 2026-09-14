# BIOSO — English screenshot set

18 original PNG captures: 16 portrait images at 390 × 844 px and 2 desktop survival images at 1280 × 720 px. Captured in the Codex in-app browser on 2026-09-10.

- 5 locations with crowds (49–67 surviving enemies in the staged rooms).
- 5 mission bosses.
- 3 distinct assembly screens.
- Weapon upgrade, level-up selection and Fire ability tree.

These are staged screenshots of the current game renderer and UI, not generated artwork or an uninterrupted normal playthrough. The isolated development fixture grants equipment, progress and populations, advances combat briefly, then freezes simulation. Normal player saves and production game sources were not changed.

Original PNGs are unretouched. overview.jpg is a labeled contact sheet only. No upscaling was applied. Some publishing platforms may require larger native captures; these files are not claimed as platform-ready resolution exports.

Reproduce: run node scripts/store-screenshots-server.mjs from the game root and open the routes in manifest.json with a 390 × 844 viewport. Capture routes must finish asset loading. The scripts are excluded from production entry points.

Additional checks: actual game routes at 360 × 640 and 1280 × 720; the wide assembly dialog measures 389 px with no horizontal overflow. Evidence is under verification/.

## Desktop survival additions

The desktop/ folder contains two native 16:9 screenshots of Survival mode: Upper Gardens with Rootwalker (91 visible enemies) and Quiet Scrapyard with Bastion (78 visible enemies). The actual game canvas spans the desktop viewport; no stage CSS overrides or image stretching were applied. Both use English UI and the same staged-media method described above. overview.jpg remains the contact sheet for the original 16 portrait images.
