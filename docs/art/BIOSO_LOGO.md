# BIOSO wordmark v1

Generated with built-in imagegen using `docs/references/biomecha-style-master.png` as the style reference.

Asset: `public/assets/ui/bioso-wordmark-v1.png` (1853 × 849).
Consumer: main-menu heading in `src/ui/screens.js`.

Brief: exactly lowercase `bioso`; rounded industrial letters made from weathered warm-white ceramic over dark metal, sparse olive moss and restrained mint lights, cinematic upper-left warm light with cool fill. No icon or tagline.

The generator returned an opaque checkerboard twice when asked for alpha. The final image therefore uses black and the menu applies `mix-blend-mode: screen`. This is a menu compositing asset, not a transparent PNG for arbitrary backgrounds.

Final edit prompt:

> Preserve this exact lowercase bioso wordmark and its weathered warm white ceramic / metal / moss / mint lighting. Replace ALL checkerboard with perfectly uniform pure black #000000, including all holes in letters and spaces. No checkerboard, no gradient, no floor, no shadow on background. Tight horizontal crop: word occupies 94 percent width and 85 percent height, minimal padding. Intended for screen blending on a dark game menu. Keep text exactly bioso.
