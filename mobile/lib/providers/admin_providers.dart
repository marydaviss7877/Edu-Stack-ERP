import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/admin_service.dart';
import '../services/notification_service.dart';

final adminServiceProvider = Provider((_) => AdminService());
final _notifServiceProvider = Provider((_) => NotificationService());

final orgStatsProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(adminServiceProvider).getOrgStats();
});

final branchesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(adminServiceProvider).getBranches();
});

final allOrgsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(adminServiceProvider).getAllOrgs();
});

// Role filter: 'teacher' | 'student' | null (all)
final usersListProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String?>((ref, role) {
  return ref.watch(adminServiceProvider).getUsers(role: role);
});

final adminUnreadCountProvider = FutureProvider<int>((ref) {
  return ref.watch(_notifServiceProvider).getUnreadCount();
});
