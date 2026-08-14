class ApiConstants {
  ApiConstants._();

  // Change this to your Railway backend URL for production
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.tws.enterprises/api',
  );

  // Headers sent with every mobile request
  static const String clientTypeHeader = 'X-Client-Type';
  static const String clientTypeValue = 'mobile';
  static const String orgSlugHeader = 'X-Org-Slug';

  // Auth endpoints
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';

  // Public (no auth)
  static const String orgBranding = '/public/orgs'; // + /:slug

  // User
  static const String fcmToken = '/users/me/fcm-token';

  // Org (mobile config + QR)
  static const String generateQr = '/organizations'; // + /:id/generate-qr
  static const String mobileConfig = '/organizations/mobile-config';

  // Features
  static const String students = '/students';
  static const String attendance = '/attendance';
  static const String myAttendance = '/attendance/my-records';
  static const String timetable = '/timetable';
  static const String exams = '/exams';
  static const String assignments = '/assignments';
  static const String fees = '/fees/challans';
  static const String notifications = '/notifications';
  static const String inventory = '/inventory';
  static const String unreadCount = '/notifications/unread-count';
}
