# Desktop-only cockpit experiment

Standalone route: http://127.0.0.1:5301/cockpit-test.html
Entry: cockpit-test.html; src/cockpit-test.js and src/cockpit-test.css.
No production entry, gameplay, settings, save, model or environment files were edited for this test.
Uses the existing garden world, robot model, weapons and collision system, with session-only state.
WASD / arrows move; mouse drag or Q/E looks; buttons compare overhead and cockpit views and reset the position.
No combat or saves. The cabin frame is a simple test overlay, not an authored interior.

Verified in Codex iab at 1280x720: ready=true, assetErrors=0, no console errors, mouse look changes yaw/pitch without moving, overhead drag changes position, release clears pointer input, both view buttons and reset work. Final screenshot: cockpit-desktop-final.png.
Focused Vite build of cockpit-test.html succeeded. Output is in temp/cockpit-test-build, without copying the shared public assets. Source route above serves those existing assets.
Earlier mobile images are superseded by the user's desktop-only scope. They are not final acceptance evidence.
