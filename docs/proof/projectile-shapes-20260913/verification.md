# Selected projectile shape refresh

- Player seeds reuse the existing sculpted organic shell and its surface shader.
- Player acid uses a smooth tapered droplet and a private clone of canonical jade glass, retaining its reflection texture.
- Hostile needles use a rounded tapered body; their accent ring and all hostile glow cores have smooth surfaces.
- Existing colors, projectile simulation, damage, range, trails and afterglow timing remain in place. Separate bounded organic pools preserve 3D direction, fade, reset and reuse behavior.

18 focused tests passed (`tests.log`). Vite production code bundle passed (`build.log`); this excludes the unrelated public asset compression/copy pipeline.

Inspected actual production renderers in the DEV fixture route `/?review=projectile-fade&capture=1&captureSeconds=5` at 640×733, including fixed full-flight and body-fade states. Browser reported no errors. Recorded `projectile-shapes.mp4`, decoded and inspected its 20-frame contact sheet `video-frames.png`: movement, afterglow, disappearance and subsequent reuse. This is presentation evidence, not a new combat balance test.
