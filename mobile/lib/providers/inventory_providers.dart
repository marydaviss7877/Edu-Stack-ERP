import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/inventory_service.dart';

final inventoryServiceProvider = Provider((_) => InventoryService());

final inventoryDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(inventoryServiceProvider).getDashboard();
});

final financeSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(inventoryServiceProvider).getFinanceSummary();
});

final financeHistoryProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final service = ref.watch(inventoryServiceProvider);
  final now = DateTime.now();
  final months = List.generate(6, (index) {
    final date = DateTime(now.year, now.month - (5 - index), 1);
    return '${date.year}-${date.month.toString().padLeft(2, '0')}';
  });
  return Future.wait(months.map((month) => service.getFinanceSummary(
        month: month,
        includeBenchmarks: false,
      )));
});

final inventoryItemsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(inventoryServiceProvider).getItems();
});

final expensesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(inventoryServiceProvider).getExpenses();
});

final incomeProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(inventoryServiceProvider).getIncome();
});

final procurementsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(inventoryServiceProvider).getProcurements();
});

final inventoryBranchesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(inventoryServiceProvider).getBranches();
});

void invalidateInventory(WidgetRef ref) {
  ref.invalidate(inventoryDashboardProvider);
  ref.invalidate(financeSummaryProvider);
  ref.invalidate(financeHistoryProvider);
  ref.invalidate(inventoryItemsProvider);
  ref.invalidate(expensesProvider);
  ref.invalidate(incomeProvider);
  ref.invalidate(procurementsProvider);
}
