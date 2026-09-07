# BIOSO — app icon v1

Concept: a weathered ceramic life core with a mint light and an olive sprout. Generated with the built-in image_gen tool using the project's approved style reference. Full prompt: [PROMPT.md](PROMPT.md).

## Files

Exports live in `public/icons/bioso-v1/`:

- `app-store-1024.png`: square 1024×1024 RGB PNG, no alpha, no baked-in rounded corners; master artwork for the iOS app icon / App Store.
- `favicon.ico`: embedded 16, 32 and 48 px PNG images.
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`: browser sizes.
- `apple-touch-icon.png`: 180×180.
- `icon-192.png`, `icon-512.png`: additional web app exports.

Apple reference: [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) and [Configuring an app icon](https://developer.apple.com/documentation/xcode/configuring-your-app-icon). This delivery is static artwork; no App Store upload or native app configuration was performed.

## Verification

The main `index.html` links the ICO, 16/32 px PNGs and Apple touch icon. All linked assets returned HTTP 200 from the real game route and matched local file bytes. PNG dimensions and RGB format verified; small exports visually inspected. `npm run build` passed (existing bundle-size warning). The real home route was visually inspected at 360×640, 390×844 and 1280×720. No game layout or gameplay code changed.
