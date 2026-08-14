import 'package:shared_preferences/shared_preferences.dart';
import '../constants/storage_keys.dart';

class LocalStorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static SharedPreferences get _p {
    assert(_prefs != null, 'LocalStorageService.init() not called');
    return _prefs!;
  }

  // ── Org config ──────────────────────────────────────────
  static void saveOrg({
    required String slug,
    required String name,
    String? logoUrl,
    String? primaryColor,
  }) {
    _p.setString(StorageKeys.orgSlug, slug);
    _p.setString(StorageKeys.orgName, name);
    if (logoUrl != null) _p.setString(StorageKeys.orgLogoUrl, logoUrl);
    if (primaryColor != null) {
      _p.setString(StorageKeys.orgPrimaryColor, primaryColor);
    }
  }

  static String? get orgSlug => _p.getString(StorageKeys.orgSlug);
  static String? get orgName => _p.getString(StorageKeys.orgName);
  static String? get orgLogoUrl => _p.getString(StorageKeys.orgLogoUrl);
  static String get orgPrimaryColor =>
      _p.getString(StorageKeys.orgPrimaryColor) ?? '#4F378A';

  static bool get hasOrg => orgSlug != null;

  static void clearOrg() {
    _p.remove(StorageKeys.orgSlug);
    _p.remove(StorageKeys.orgName);
    _p.remove(StorageKeys.orgLogoUrl);
    _p.remove(StorageKeys.orgPrimaryColor);
  }

  // ── Activity tracking (inactivity logout) ───────────────
  static void updateLastActive() {
    _p.setString(StorageKeys.lastActiveAt, DateTime.now().toIso8601String());
  }

  static bool get isInactive {
    final raw = _p.getString(StorageKeys.lastActiveAt);
    if (raw == null) return false;
    final last = DateTime.tryParse(raw);
    if (last == null) return false;
    return DateTime.now().difference(last).inDays >= 10;
  }

  // ── Preferences ─────────────────────────────────────────
  static String get themeMode =>
      _p.getString(StorageKeys.themeMode) ?? 'system';
  static void setThemeMode(String mode) =>
      _p.setString(StorageKeys.themeMode, mode);
}
