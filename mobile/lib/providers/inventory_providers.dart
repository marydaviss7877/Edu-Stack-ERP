import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/inventory_service.dart';

final inventoryServiceProvider = Provider((_) => InventoryService());

final inventoryDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(inventoryServiceProvider).getDashboard();
});

final financeSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(inventoryServiceProvider).getFinanceSummary();
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
  ref.invalidate(inventoryItemsProvider);
  ref.invalidate(expensesProvider);
  ref.invalidate(incomeProvider);
  ref.invalidate(procurementsProvider);
}
