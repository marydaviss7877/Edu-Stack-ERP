import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/accountant_service.dart';
import '../services/notification_service.dart';
import '../models/challan.dart';

final accountantServiceProvider = Provider((_) => AccountantService());
final _notifServiceProvider = Provider((_) => NotificationService());

final accountantDashboardStatsProvider =
    FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(accountantServiceProvider).getDashboardStats();
});

final allChallansProvider =
    FutureProvider.family<List<Challan>, String?>((ref, status) {
  return ref.watch(accountantServiceProvider).getAllChallans(status: status);
});

final overdueCountProvider = FutureProvider<int>((ref) {
  return ref.watch(accountantServiceProvider).getOverdueCount();
});

// Month: 'YYYY-MM'
final monthlySummaryProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, month) {
  return ref.watch(accountantServiceProvider).getMonthlySummary(month);
});

final accountantUnreadCountProvider = FutureProvider<int>((ref) {
  return ref.watch(_notifServiceProvider).getUnreadCount();
});
