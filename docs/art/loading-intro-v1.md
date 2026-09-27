# BIOSO loading intro v1

Source: `/Users/serg/Downloads/kling_20260919_VIDEO____________907_0.mp4` (kept unchanged).

Game clip: `public/assets/ui/bioso-intro-v1.mp4`, 1,008,843 bytes, H.264/yuv420p, 1280×662, 24 fps, 5.041667 s, no audio, MP4 faststart.
Poster: `public/assets/ui/bioso-intro-poster-v1.webp`, 39,256 bytes.

The fixed watermark occupied the bottom edge. Processing crops 88 px from the bottom of the 1920×1080 source (`crop=1920:992:0:0`), then scales to 1280 px wide and encodes with libx264 CRF 26. No blurred patch. Portrait presentation uses cover with horizontal position 38% to retain the beetle.

The clip plays once on page entry. Menu waits for both application readiness and the end of the intro. An error or rejected autoplay restores the DS curtain; a 7 s guard prevents an intro from blocking a ready game indefinitely. Reduced motion shows the poster until the game is ready. Video decoding stops after the exit fade. Later asset waits use the existing cloud/meter/three-creature curtain.

Validated in the actual game at 360×640, 390×844 and 1280×720: visible muted playback over the home dialog, no overflow, transition to menu, decoder release, and normal curtain on mission entry. Build in memory and focused lifecycle checks passed.
