class StorageKeys {
  StorageKeys._();

  // SecureStorage keys (encrypted)
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String fcmToken = 'fcm_token';

  // SharedPreferences keys (plain)
  static const String orgSlug = 'org_slug';
  static const String orgName = 'org_name';
  static const String orgLogoUrl = 'org_logo_url';
  static const String orgPrimaryColor = 'org_primary_color';
  static const String lastActiveAt = 'last_active_at';
  static const String themeMode = 'theme_mode'; // 'system'|'light'|'dark'
  // Hive box names
  static const String offlineAttendanceBox = 'offline_attendance';
}
