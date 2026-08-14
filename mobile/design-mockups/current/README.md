# EduStack current mobile UI — HTML/CSS reference

This folder is a browser-based inventory of the current Flutter mobile app. It exists as a baseline for redesign work; it does not replace the Flutter implementation.

## View it

Open `index.html` directly in a browser, or serve the folder locally:

```bash
cd mobile/design-mockups/current
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## What is covered

- 26 selectable views spanning onboarding, authentication, student, teacher, leadership, operations, administration, and shared states
- The current school-configurable primary color
- Light and dark theme previews
- A token drawer documenting color, typography, shape, spacing, and component defaults
- Representative sample data to make data-dependent layouts visible

## Source mapping

- Theme source: `mobile/lib/core/theme/app_theme.dart`
- Default school seed: `#1e3a5f` from `mobile/lib/models/org.dart`
- Fixed sign-in gradient: `#1565C0 → #1E88E5 → #42A5F5`
- Screen inventory: `mobile/lib/core/router/app_router.dart`

The Material 3 palette is generated at runtime by Flutter's `ColorScheme.fromSeed`. The CSS reference models the same semantic roles; exact derived color values can vary slightly from Flutter's HCT palette generation.
