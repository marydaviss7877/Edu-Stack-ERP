import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/student_service.dart';
import '../services/timetable_service.dart';
import '../services/exam_service.dart';
import '../services/attendance_service.dart';
import '../services/fee_service.dart';
import '../services/notification_service.dart';
import '../services/assignment_service.dart';
import '../services/progress_service.dart';
import '../models/timetable.dart';
import '../models/result.dart';
import '../models/challan.dart';
import '../models/assignment.dart';
import '../models/notification.dart';
import '../models/attendance.dart';
import '../models/student_profile.dart';
import '../models/student_progress.dart';

// ── Service singletons ───────────────────────────────────────────────

final studentServiceProvider = Provider((_) => StudentService());
final timetableServiceProvider = Provider((_) => TimetableService());
final examServiceProvider = Provider((_) => ExamService());
final attendanceServiceProvider = Provider((_) => AttendanceService());
final feeServiceProvider = Provider((_) => FeeService());
final notificationServiceProvider = Provider((_) => NotificationService());
final assignmentServiceProvider = Provider((_) => AssignmentService());
final progressServiceProvider = Provider((_) => ProgressService());

// ── Student data providers ───────────────────────────────────────────

final studentProfileProvider = FutureProvider<StudentProfile>((ref) {
  return ref.watch(studentServiceProvider).getStudentProfile();
});

final todayTimetableProvider = FutureProvider<List<TodaySlot>>((ref) {
  return ref.watch(timetableServiceProvider).getTodaySlots();
});

final myTimetableProvider = FutureProvider<Timetable?>((ref) {
  return ref.watch(timetableServiceProvider).getMyTimetable();
});

final latestResultProvider = FutureProvider<ExamResult?>((ref) {
  return ref.watch(examServiceProvider).getLatestResult();
});

final myResultsProvider = FutureProvider<List<ExamResult>>((ref) {
  return ref.watch(examServiceProvider).getMyResults();
});

final myChallansProvider = FutureProvider<List<Challan>>((ref) {
  return ref.watch(feeServiceProvider).getMyChallans();
});

final upcomingExamsProvider = FutureProvider<List<UpcomingExam>>((ref) {
  return ref.watch(examServiceProvider).getUpcomingExams();
});

final myAttendanceSummaryProvider = FutureProvider<AttendanceSummary>((ref) {
  return ref.watch(attendanceServiceProvider).getSummary();
});

// month: 'YYYY-MM' string or null for all records
final myAttendanceProvider =
    FutureProvider.family<List<AttendanceRecord>, String?>((ref, month) {
  return ref.watch(attendanceServiceProvider).getMyAttendance(month: month);
});

final unreadCountProvider = FutureProvider<int>((ref) {
  return ref.watch(notificationServiceProvider).getUnreadCount();
});

final notificationsProvider = FutureProvider<List<AppNotification>>((ref) {
  return ref.watch(notificationServiceProvider).getNotifications();
});

final myAssignmentsProvider = FutureProvider<List<Assignment>>((ref) {
  return ref.watch(assignmentServiceProvider).getMyAssignments();
});

final pendingAssignmentsProvider = FutureProvider<List<Assignment>>((ref) {
  return ref
      .watch(assignmentServiceProvider)
      .getMyAssignments(pendingOnly: true);
});

final classFellowsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(studentServiceProvider).getClassFellows();
});

// Full weekly-topic coverage + syllabus mastery (unfiltered — screens filter client-side)
final myProgressProvider = FutureProvider<StudentProgress>((ref) {
  return ref.watch(progressServiceProvider).getMyProgress();
});

// ── Offline attendance queue count ────────────────────────────────────

final offlineQueueCountProvider = Provider<int>((ref) {
  return ref.watch(attendanceServiceProvider).pendingOfflineCount;
});
