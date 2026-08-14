import 'package:edustack_mobile/core/theme/app_design.dart';
import 'package:edustack_mobile/core/theme/app_theme.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile theme uses the finalized EduStack palette', () {
    final light = AppTheme.light();
    final dark = AppTheme.dark();

    expect(light.colorScheme.primary, AppColors.primary);
    expect(light.scaffoldBackgroundColor, AppColors.canvas);
    expect(dark.colorScheme.inversePrimary, AppColors.primary);
  });

  test('mobile theme matches the web typography families', () {
    final theme = AppTheme.light();

    expect(theme.textTheme.bodyMedium?.fontFamily, 'PlusJakartaSans');
    expect(theme.textTheme.headlineMedium?.fontFamily, 'Outfit');
  });
}
