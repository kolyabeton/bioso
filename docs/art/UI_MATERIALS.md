# Shared menu materials

Approved direction: user attachment on 2026-09-07, dark olive metal secondary keys, rounded layered rims and mint indicators. Primary CTAs use a filled green face and occupy the rightmost position in horizontal action rows.

The shared button() atom supports variant, size: 'menu' and indicator: true. Text remains real HTML. Surfaces and states live in src/ui/components.css; home CSS controls placement and dimensions. Live gallery: /?ui=components.

Textures are shared through --ui-texture-ceramic, --ui-texture-metal and --ui-texture-primary. Frames use native CSS resolution so resizing does not stretch corners or text. Compact buttons retain the materials with narrower rims. Focus uses an external mint outline, pressed buttons move down, disabled indicators are unlit.

Generated with built-in image_gen using the selected menu image and docs/references/biomecha-style-master.png. Current runtime textures: public/assets/ui/materials/ceramic-worn-v1.jpg, metal-olive-v1.jpg and ceramic-green-v1.jpg. Unused PNG exports were removed during the 2026-09-10 cleanup.

## Green primary prompt

Use case: game UI material texture. Generate a square seamless tileable deep green weathered ceramic-enamel surface for the inside face of a primary game button, NOT a button or scene. biomecha-style-master.png is authoritative for material realism, palette and mood; metal-olive-v1.png only sets the restrained wear and microtexture scale. Deep desaturated forest and jade green, aged matte ceramic enamel, fine hairline crazing, subtle rubbing and tiny sparse dark nicks. Orthographic front view, edge-to-edge material, quiet center, uniform diffuse illumination, no vignette, directional shadow, hotspot, text, symbol, border, bevel, frame, object, plant, robot or watermark. Seamless repeat; no cartoon, painterly strokes, ornate gold, neon green, glossy plastic, large cracks or loud grunge.

## Ceramic prompt

Use case: game UI material texture. Generate a square seamless tileable surface texture for the inside face of a game menu button, NOT a button or scene. Image 1 is selected UI reference: sample the light primary button ceramic material. Image 2 biomecha-style-master.png is authoritative for material realism palette and mood.
Surface: warm dirty ivory ceramic enamel, desaturated warm off-white base, tiny natural tan chips, subtle hairline crazing, fine age speckle. Predominantly light and calm, enough contrast for dark lettering. Orthographic front view, edge-to-edge material, fine realistic microtexture at readable UI scale. Uniform softly diffuse illumination for tiling; no vignette, no directional shadows or hotspots. No text, letters, logos, borders, bevels, frames, indicators, screws, plants, objects, robot, perspective, grid, panels or composition. Entire image one continuous material, no border. Grounded cinematic realistic solarpunk, aged materials, restrained saturation, no painterly marks or glossy plastic. Subtle wear, not ruined concrete or loud grunge.

## Metal prompt

Use case: game UI material texture. Generate a square seamless tileable surface texture for the inside face of a game menu button, NOT a button or scene. Image 1 is selected UI reference: sample the dark secondary button metal material. Image 2 biomecha-style-master.png is authoritative for material realism palette and mood.
Surface: dark desaturated olive graphite painted industrial metal, matte charcoal gray-green base, fine scuffs exposing muted gray metal, restrained brown patina, subtle sparse scratches. Predominantly dark and calm, enough contrast for ivory lettering. Orthographic front view, edge-to-edge material, fine realistic microtexture at readable UI scale. Uniform softly diffuse illumination for tiling; no vignette, no directional shadows or hotspots. No text, letters, logos, borders, bevels, frames, indicators, screws, plants, objects, robot, perspective, grid, panels or composition. Entire image one continuous material, no border. Grounded cinematic realistic solarpunk, aged materials, restrained saturation, no painterly marks or glossy plastic. Subtle wear, not ruined concrete or loud grunge.


Runtime uses 512px JPEG derivatives at quality 85; original generated PNGs are preserved. Texture density is 256 CSS pixels and does not stretch with button width.
