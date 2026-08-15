#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
MOBILE_DIR="${SCRIPT_DIR:h}"
OUT="$SCRIPT_DIR/png"

mkdir -p "$OUT/app" "$OUT/phone" "$OUT/tablet-7" "$OUT/tablet-10" "$OUT/chromebook" "$OUT/android-xr"

cd "$MOBILE_DIR"
flutter test test/store_assets_test.dart
sips -z 512 512 assets/images/icon.png --out "$OUT/app/app-icon-512.png" >/dev/null

echo "Rendered current Flutter Play Store PNGs to $OUT"
