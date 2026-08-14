import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/principal_service.dart';
import '../services/notification_service.dart';

final principalServiceProvider = Provider((_) => PrincipalService());
final _notifServiceProvider = Provider((_) => NotificationService());

final todayAttendanceOverviewProvider =
    FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(principalServiceProvider).getTodayAttendanceOverview();
});

final attendanceByClassProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(principalServiceProvider).getAttendanceByClass();
});

final classPerformanceProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(principalServiceProvider).getClassPerformance();
});

final staffAttendanceTodayProvider =
    FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(principalServiceProvider).getStaffAttendanceToday();
});

final upcomingExamsPrincipalProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(principalServiceProvider).getUpcomingExams();
});

final lowAttendanceStudentsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(principalServiceProvider).getLowAttendanceStudents();
});

final principalUnreadCountProvider = FutureProvider<int>((ref) {
  return ref.watch(_notifServiceProvider).getUnreadCount();
});

final principalNotificationsProvider = FutureProvider((ref) {
  return ref.watch(_notifServiceProvider).getNotifications();
});
