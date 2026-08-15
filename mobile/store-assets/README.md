# EduStack Play Store PNG assets

These PNGs are rendered from the current Flutter implementation in
`mobile/lib`, using its production widgets, adaptive layout, fonts, icons, and
`redesign-v1` theme. The fixture data in `test/store_assets_test.dart` replaces
network responses only; it does not replace the app UI.

## Output inventory

- App icon: 1 PNG at 512 × 512
- Feature graphic: 1 PNG at 1024 × 500
- Phone: 4 PNGs at 1080 × 1920 (9:16)
- 7-inch tablet: 3 PNGs at 1080 × 1920 (9:16)
- 10-inch tablet: 4 PNGs at 1440 × 2560 (9:16)
- Chromebook: 4 PNGs at 2560 × 1440 (16:9)
- Android XR: 4 PNGs at 2560 × 1440 (16:9)

Run `./render-assets.sh` from this directory to regenerate all output files.
