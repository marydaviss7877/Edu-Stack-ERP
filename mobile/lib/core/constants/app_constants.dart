class AppConstants {
  AppConstants._();

  static const String appName = 'EduStack';
  static const String appVersion = '1.0.0';

  // Inactivity threshold — auto-logout after this many days without opening
  static const int inactivityDays = 10;

  // Default Navy Blue (matches web app)
  static const String defaultPrimaryColor = '#1e3a5f';

  // Attendance threshold warning
  static const double attendanceThreshold = 75.0;

  // Pagination
  static const int defaultPageSize = 20;
}
