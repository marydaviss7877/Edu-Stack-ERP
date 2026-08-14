import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/teacher_service.dart';
import '../models/assignment.dart';

// Reuse shared service providers from student_providers (import for internal use, export for consumers)
import 'student_providers.dart' show assignmentServiceProvider;
export 'student_providers.dart'
    show
        timetableServiceProvider,
        examServiceProvider,
        attendanceServiceProvider,
        assignmentServiceProvider,
        notificationServiceProvider,
        unreadCountProvider,
        notificationsProvider,
        offlineQueueCountProvider;

// ── Service singletons ────────────────────────────────────────────────

final teacherServiceProvider = Provider((_) => TeacherService());

// ── Teacher data providers ────────────────────────────────────────────

final myClassesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(teacherServiceProvider).getMyClasses();
});

final todayPeriodsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(teacherServiceProvider).getTodayPeriods();
});

final teacherDashboardStatsProvider =
    FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(teacherServiceProvider).getDashboardStats();
});

final activeExamsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(teacherServiceProvider).getActiveExams();
});

// Students for a class/section — family provider keyed by 'classId:sectionId'
final classStudentsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, key) {
  final parts = key.split(':');
  if (parts.length != 2) return Future.value([]);
  return ref.watch(teacherServiceProvider).getStudents(parts[0], parts[1]);
});

// Teacher's assignments (created by this teacher)
final teacherAssignmentsProvider = FutureProvider<List<Assignment>>((ref) {
  return ref.watch(assignmentServiceProvider).getMyAssignments();
});
