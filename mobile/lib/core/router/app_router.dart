import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';
import '../../providers/org_provider.dart';
import '../../screens/onboarding/qr_scanner_screen.dart';
import '../../screens/onboarding/org_confirm_screen.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/auth/change_password_screen.dart';

// Student
import '../../screens/student/student_shell.dart';
import '../../screens/student/dashboard/student_dashboard.dart';
import '../../screens/student/timetable/student_timetable.dart';
import '../../screens/student/results/results_screen.dart';
import '../../screens/student/attendance/my_attendance.dart';
import '../../screens/student/assignments/my_assignments.dart';
import '../../screens/student/fees/my_challans.dart';
import '../../screens/student/class_fellows/class_fellows.dart';
import '../../screens/student/notifications/notifications_screen.dart';

// Teacher
import '../../screens/teacher/teacher_shell.dart';
import '../../screens/teacher/dashboard/teacher_dashboard.dart';
import '../../screens/teacher/attendance/select_class_screen.dart';
import '../../screens/teacher/attendance/mark_attendance_screen.dart';
import '../../screens/teacher/results/enter_marks_screen.dart';
import '../../screens/teacher/assignments/teacher_assignments.dart';

// Principal
import '../../screens/principal/principal_shell.dart';
import '../../screens/principal/dashboard/principal_dashboard.dart';
import '../../screens/principal/attendance/principal_attendance_report.dart';

// Coordinator
import '../../screens/coordinator/coordinator_shell.dart';
import '../../screens/coordinator/dashboard/coordinator_dashboard.dart';

// Accountant
import '../../screens/accountant/accountant_shell.dart';
import '../../screens/accountant/dashboard/accountant_dashboard.dart';

// Admin / Group Admin
import '../../screens/admin/admin_shell.dart';
import '../../screens/admin/dashboard/admin_dashboard.dart';
import '../../screens/admin/users/user_management_screen.dart';
import '../../screens/admin/qr/generate_qr_screen.dart';

// Shared
import '../../screens/shared/profile_screen.dart';
import '../../screens/shared/settings_screen.dart';
import '../../screens/shared/no_internet_screen.dart';
import '../../screens/shared/inventory/inventory_screen.dart';

import '../../core/storage/local_storage.dart';
import '../../models/org.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  // Start directly on the right screen — no splash needed
  final initialLocation =
      LocalStorageService.hasOrg ? '/login' : '/onboarding/scan';

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: initialLocation,
    refreshListenable: _RouterNotifier(ref),
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final org = ref.read(orgProvider);
      final path = state.matchedLocation;

      // Onboarding is never blocked by session loading
      if (path.startsWith('/onboarding')) {
        // Once org is confirmed, move to login immediately
        if (org != null) return '/login';
        return null;
      }

      // Wait for session check before making auth decisions
      if (authState.isLoading) return null;

      final hasOrg = org != null;
      final isAuthed = authState.isAuthenticated;

      if (!hasOrg) return '/onboarding/scan';

      if (!isAuthed) {
        if (path.startsWith('/login') || path.startsWith('/change-password')) {
          return null;
        }
        return '/login';
      }

      // Authenticated — bounce away from auth screens to home
      if (path.startsWith('/login') || path.startsWith('/change-password')) {
        return authState.user!.homeRoute;
      }

      return null;
    },
    routes: [
      // ── Onboarding ─────────────────────────────────────────
      GoRoute(
          path: '/onboarding/scan',
          builder: (_, __) => const QrScannerScreen()),
      GoRoute(
        path: '/onboarding/confirm',
        builder: (_, state) => OrgConfirmScreen(org: state.extra as OrgConfig),
      ),

      // ── Auth ───────────────────────────────────────────────
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
          path: '/change-password',
          builder: (_, __) => const ChangePasswordScreen()),

      // ── Student ────────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => StudentShell(child: child),
        routes: [
          GoRoute(
              path: '/student', builder: (_, __) => const StudentDashboard()),
          GoRoute(
              path: '/student/timetable',
              builder: (_, __) => const StudentTimetable()),
          GoRoute(
              path: '/student/results',
              builder: (_, __) => const ResultsScreen()),
          GoRoute(
              path: '/student/attendance',
              builder: (_, __) => const MyAttendance()),
          GoRoute(
              path: '/student/assignments',
              builder: (_, __) => const MyAssignments()),
          GoRoute(
              path: '/student/fees', builder: (_, __) => const MyChallans()),
          GoRoute(
              path: '/student/class-fellows',
              builder: (_, __) => const ClassFellowsScreen()),
          GoRoute(
              path: '/student/notifications',
              builder: (_, __) => const NotificationsScreen()),
        ],
      ),

      // ── Teacher ────────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => TeacherShell(child: child),
        routes: [
          GoRoute(
              path: '/teacher', builder: (_, __) => const TeacherDashboard()),
          GoRoute(
              path: '/teacher/attendance',
              builder: (_, __) => const SelectClassScreen()),
          GoRoute(
            path: '/teacher/attendance/mark',
            builder: (_, state) {
              final extra = state.extra as Map<String, dynamic>? ?? {};
              return MarkAttendanceScreen(
                classId: extra['classId'] as String? ?? '',
                sectionId: extra['sectionId'] as String? ?? '',
                className: extra['className'] as String? ?? '',
                sectionName: extra['sectionName'] as String? ?? '',
                subjectName: extra['subjectName'] as String? ?? '',
              );
            },
          ),
          GoRoute(
              path: '/teacher/marks',
              builder: (_, __) => const EnterMarksScreen()),
          GoRoute(
              path: '/teacher/assignments',
              builder: (_, __) => const TeacherAssignments()),
          GoRoute(
              path: '/teacher/notifications',
              builder: (_, __) => const NotificationsScreen()),
        ],
      ),

      // ── Principal ──────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => PrincipalShell(child: child),
        routes: [
          GoRoute(
              path: '/principal',
              builder: (_, __) => const PrincipalDashboard()),
          GoRoute(
              path: '/principal/attendance',
              builder: (_, __) => const PrincipalAttendanceReport()),
          GoRoute(
              path: '/principal/results',
              builder: (_, __) => const ResultsScreen()),
          GoRoute(
              path: '/principal/inventory',
              builder: (_, __) => const InventoryScreen()),
          GoRoute(
              path: '/principal/notifications',
              builder: (_, __) => const NotificationsScreen()),
        ],
      ),

      // ── Coordinator ────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => CoordinatorShell(child: child),
        routes: [
          GoRoute(
              path: '/coordinator',
              builder: (_, __) => const CoordinatorDashboard()),
          GoRoute(
              path: '/coordinator/attendance',
              builder: (_, __) => const PrincipalAttendanceReport()),
          GoRoute(
              path: '/coordinator/timetable',
              builder: (_, __) => const StudentTimetable()),
          GoRoute(
              path: '/coordinator/notifications',
              builder: (_, __) => const NotificationsScreen()),
        ],
      ),

      // ── Accountant ─────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => AccountantShell(child: child),
        routes: [
          GoRoute(
              path: '/accountant',
              builder: (_, __) => const AccountantDashboard()),
          GoRoute(
              path: '/accountant/challans',
              builder: (_, __) => const _AccountantChallansPlaceholder()),
          GoRoute(
              path: '/accountant/reports',
              builder: (_, __) => const _AccountantReportsPlaceholder()),
          GoRoute(
              path: '/accountant/inventory',
              builder: (_, __) => const InventoryScreen()),
          GoRoute(
              path: '/accountant/notifications',
              builder: (_, __) => const NotificationsScreen()),
        ],
      ),

      // ── Group Admin ────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => GroupAdminShell(child: child),
        routes: [
          GoRoute(
              path: '/group',
              builder: (_, __) => const AdminDashboard(isSuperAdmin: false)),
          GoRoute(
              path: '/group/users',
              builder: (_, __) => const UserManagementScreen()),
          GoRoute(
              path: '/group/inventory',
              builder: (_, __) => const InventoryScreen()),
          GoRoute(
              path: '/group/qr', builder: (_, __) => const GenerateQrScreen()),
          GoRoute(
              path: '/group/settings',
              builder: (_, __) => const SettingsScreen()),
        ],
      ),

      // ── Super Admin ────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => AdminShell(child: child),
        routes: [
          GoRoute(
              path: '/admin',
              builder: (_, __) => const AdminDashboard(isSuperAdmin: true)),
          GoRoute(
              path: '/admin/users',
              builder: (_, __) => const UserManagementScreen()),
          GoRoute(
              path: '/admin/qr', builder: (_, __) => const GenerateQrScreen()),
          GoRoute(
              path: '/admin/settings',
              builder: (_, __) => const SettingsScreen()),
        ],
      ),

      // ── IT Admin (maps to admin dashboard with limited tabs) ──
      GoRoute(
          path: '/it-admin',
          builder: (_, __) => const AdminDashboard(isSuperAdmin: false)),

      // ── Shared ─────────────────────────────────────────────
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(
          path: '/no-internet', builder: (_, __) => const NoInternetScreen()),
    ],
  );
});

// Inline placeholders for accountant feature screens (built next sprint)
class _AccountantChallansPlaceholder extends StatelessWidget {
  const _AccountantChallansPlaceholder();
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Fee Challans')),
        body: const Center(child: Text('All challans — Sprint 14')),
      );
}

class _AccountantReportsPlaceholder extends StatelessWidget {
  const _AccountantReportsPlaceholder();
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Financial Reports')),
        body: const Center(child: Text('Monthly reports — Sprint 14')),
      );
}

/// Makes GoRouter re-evaluate redirects on auth/org state changes
class _RouterNotifier extends ChangeNotifier {
  _RouterNotifier(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
    ref.listen(orgProvider, (_, __) => notifyListeners());
  }
}
