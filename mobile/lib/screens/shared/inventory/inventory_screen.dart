import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/layout/responsive.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/inventory_providers.dart';
import 'finance_operations_overview.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this)..addListener(_tabChanged);
  }

  void _tabChanged() {
    if (!_tabs.indexIsChanging) setState(() {});
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    invalidateInventory(ref);
    await Future.wait([
      ref.read(inventoryDashboardProvider.future),
      ref.read(financeSummaryProvider.future),
    ]);
  }

  Future<bool?> _showCreateSheet() {
    return switch (_tabs.index) {
      1 => showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          builder: (_) => const _CreateItemSheet(),
        ),
      2 => showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          builder: (_) => const _CreateExpenseSheet(),
        ),
      3 => showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          builder: (_) => const _CreateIncomeSheet(),
        ),
      4 => showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          builder: (_) => const _CreateProcurementSheet(),
        ),
      _ => Future<bool?>.value(false),
    };
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(currentUserProvider)?.role;
    final canCreateExpense = role == 'accountant' || role == 'group_admin';
    final canCreate = _tabs.index == 1 ||
        (_tabs.index == 2 && canCreateExpense) ||
        (_tabs.index == 3 && canCreateExpense) ||
        _tabs.index == 4;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Finance & Operations'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Assets & Stock'),
            Tab(text: 'Expenses'),
            Tab(text: 'Income'),
            Tab(text: 'Procurement'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _OverviewTab(
            onRefresh: _refresh,
            onOpenTab: (index) => _tabs.animateTo(index),
          ),
          _ItemsTab(onRefresh: _refresh),
          _ExpensesTab(onRefresh: _refresh),
          _IncomeTab(onRefresh: _refresh),
          _ProcurementsTab(onRefresh: _refresh),
        ],
      ),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () async {
                final saved = await _showCreateSheet();
                if (!mounted) return;
                if (saved == true) invalidateInventory(ref);
              },
              icon: const Icon(Icons.add_rounded),
              label: Text(switch (_tabs.index) {
                1 => 'Add item',
                2 => 'Add expense',
                3 => 'Add income',
                4 => 'New request',
                _ => 'Add',
              }),
            )
          : null,
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.onRefresh, required this.onOpenTab});
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(inventoryDashboardProvider);
    final finance = ref.watch(financeSummaryProvider);
    final history = ref.watch(financeHistoryProvider);
    final items = ref.watch(inventoryItemsProvider);
    final expenses = ref.watch(expensesProvider);
    final procurements = ref.watch(procurementsProvider);
    final user = ref.watch(currentUserProvider);
    final error = inventory.error ??
        finance.error ??
        history.error ??
        items.error ??
        expenses.error ??
        procurements.error;
    final loading = inventory.isLoading ||
        finance.isLoading ||
        history.isLoading ||
        items.isLoading ||
        expenses.isLoading ||
        procurements.isLoading;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
            context.pageGutter, 16, context.pageGutter, 110),
        children: [
          if (loading) const LinearProgressIndicator(),
          if (error != null) _ErrorCard(message: error.toString()),
          if (!loading && error == null)
            FinanceOperationsOverview(
              finance: finance.requireValue,
              inventory: inventory.requireValue,
              history: history.requireValue,
              items: items.requireValue,
              expenses: expenses.requireValue,
              procurements: procurements.requireValue,
              role: user?.role ?? '',
              branchLabel: _overviewBranchLabel(
                user?.role ?? '',
                items.requireValue,
              ),
              onOpenTab: onOpenTab,
            ),
        ],
      ),
    );
  }
}

String _overviewBranchLabel(String role, List<Map<String, dynamic>> items) {
  if (role == 'group_admin') return 'All campuses';
  if (items.isNotEmpty && items.first['branchId'] is Map) {
    final branch = Map<String, dynamic>.from(items.first['branchId'] as Map);
    final name = branch['name']?.toString();
    if (name != null && name.isNotEmpty) return name;
  }
  return role == 'branch_principal' ? 'Your branch' : 'Current campus';
}

class _ItemsTab extends ConsumerWidget {
  const _ItemsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _AsyncList(
      value: ref.watch(inventoryItemsProvider),
      onRefresh: onRefresh,
      empty: 'No assets or stock recorded yet.',
      itemBuilder: (item) {
        final available = item['availableQuantity'] ?? 0;
        final quantity = item['quantity'] ?? 0;
        return ListTile(
          leading: CircleAvatar(
            child: Icon(item['type'] == 'fixed_asset'
                ? Icons.computer_rounded
                : Icons.inventory_2_rounded),
          ),
          title: Text(item['name'] as String? ?? 'Unnamed item'),
          subtitle: Text(
            '${item['assetCode'] ?? ''} · ${item['category'] ?? ''}\n${item['location'] ?? 'Location not assigned'}',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          isThreeLine: true,
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('$available / $quantity',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(item['condition'] as String? ?? '',
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        );
      },
    );
  }
}

class _ExpensesTab extends ConsumerWidget {
  const _ExpensesTab({required this.onRefresh});
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _AsyncList(
        value: ref.watch(expensesProvider),
        onRefresh: onRefresh,
        empty: 'No expenses recorded yet.',
        itemBuilder: (item) => ListTile(
          leading: const CircleAvatar(child: Icon(Icons.receipt_long_rounded)),
          title: Text(item['description'] as String? ?? 'Expense'),
          subtitle: Text(
              '${item['voucherNo'] ?? ''} · ${item['category'] ?? ''} · ${item['status'] ?? ''}'),
          trailing: Text(_pkr(item['netPaid']),
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
      );
}

class _ProcurementsTab extends ConsumerWidget {
  const _ProcurementsTab({required this.onRefresh});
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _AsyncList(
        value: ref.watch(procurementsProvider),
        onRefresh: onRefresh,
        empty: 'No procurement requests yet.',
        itemBuilder: (item) => ListTile(
          leading: const CircleAvatar(child: Icon(Icons.shopping_cart_rounded)),
          title: Text(item['title'] as String? ?? 'Procurement request'),
          subtitle: Text(
              '${item['requestNo'] ?? ''} · ${item['procurementMethod'] ?? ''} · ${item['status'] ?? ''}'),
          trailing: Text(_pkr(item['estimatedTotal']),
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
      );
}

class _IncomeTab extends ConsumerWidget {
  const _IncomeTab({required this.onRefresh});
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _AsyncList(
        value: ref.watch(incomeProvider),
        onRefresh: onRefresh,
        empty: 'No other income recorded yet.',
        itemBuilder: (item) => ListTile(
          leading: const CircleAvatar(child: Icon(Icons.payments_rounded)),
          title: Text(item['description'] as String? ?? 'Income'),
          subtitle: Text(
              '${item['receiptNo'] ?? ''} · ${item['category'] ?? ''} · ${item['paymentMethod'] ?? ''}'),
          trailing: Text(
            _pkr(item['amount']),
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      );
}

class _AsyncList extends StatelessWidget {
  const _AsyncList({
    required this.value,
    required this.onRefresh,
    required this.empty,
    required this.itemBuilder,
  });
  final AsyncValue<List<Map<String, dynamic>>> value;
  final Future<void> Function() onRefresh;
  final String empty;
  final Widget Function(Map<String, dynamic>) itemBuilder;

  @override
  Widget build(BuildContext context) => value.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: _ErrorCard(message: e.toString())),
        data: (items) => RefreshIndicator(
          onRefresh: onRefresh,
          child: items.isEmpty
              ? ListView(children: [
                  SizedBox(height: MediaQuery.sizeOf(context).height * 0.25),
                  Center(child: Text(empty)),
                ])
              : ListView.separated(
                  padding: EdgeInsets.fromLTRB(
                      context.pageGutter, 12, context.pageGutter, 110),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, index) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: itemBuilder(items[index]),
                  ),
                ),
        ),
      );
}

abstract class _CreateSheetState<T extends ConsumerStatefulWidget>
    extends ConsumerState<T> {
  bool saving = false;
  String? selectedBranch;

  String? branchId() {
    final user = ref.read(currentUserProvider);
    if (user?.branchId != null) return user!.branchId;
    return selectedBranch;
  }

  Widget branchField() {
    final user = ref.watch(currentUserProvider);
    if (user?.branchId != null) return const SizedBox.shrink();
    final branches = ref.watch(inventoryBranchesProvider);
    return branches.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load branches'),
      data: (items) => DropdownButtonFormField<String>(
        initialValue: selectedBranch,
        decoration: const InputDecoration(labelText: 'Branch'),
        items: items
            .map((b) => DropdownMenuItem(
                  value: b['_id'].toString(),
                  child: Text(b['name'] as String? ?? 'Branch'),
                ))
            .toList(),
        onChanged: (value) => setState(() => selectedBranch = value),
      ),
    );
  }

  Widget sheet(List<Widget> fields, Future<void> Function() save) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
              20, 18, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ...fields,
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: saving ? null : save,
                  icon: saving
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_rounded),
                  label: Text(saving ? 'Saving…' : 'Save'),
                ),
              ],
            ),
          ),
        ),
      );

  void fail(Object error) {
    if (!mounted) return;
    setState(() => saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Could not save: $error')),
    );
  }
}

class _CreateItemSheet extends ConsumerStatefulWidget {
  const _CreateItemSheet();
  @override
  ConsumerState<_CreateItemSheet> createState() => _CreateItemSheetState();
}

class _CreateItemSheetState extends _CreateSheetState<_CreateItemSheet> {
  final name = TextEditingController();
  final category = TextEditingController();
  final quantity = TextEditingController(text: '1');
  final cost = TextEditingController(text: '0');
  String type = 'fixed_asset';

  @override
  void dispose() {
    name.dispose();
    category.dispose();
    quantity.dispose();
    cost.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => sheet([
        Text('Add asset or stock',
            style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        branchField(),
        DropdownButtonFormField<String>(
          initialValue: type,
          decoration: const InputDecoration(labelText: 'Item type'),
          items: const [
            DropdownMenuItem(value: 'fixed_asset', child: Text('Fixed asset')),
            DropdownMenuItem(
                value: 'consumable', child: Text('Consumable stock')),
          ],
          onChanged: (value) => setState(() => type = value!),
        ),
        TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Name')),
        TextField(
            controller: category,
            decoration: const InputDecoration(labelText: 'Category')),
        Row(children: [
          Expanded(
              child: TextField(
                  controller: quantity,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Quantity'))),
          const SizedBox(width: 12),
          Expanded(
              child: TextField(
                  controller: cost,
                  keyboardType: TextInputType.number,
                  decoration:
                      const InputDecoration(labelText: 'Unit cost (PKR)'))),
        ]),
      ], () async {
        final branch = branchId();
        if (branch == null ||
            name.text.trim().isEmpty ||
            category.text.trim().isEmpty) {
          return;
        }
        setState(() => saving = true);
        try {
          await ref.read(inventoryServiceProvider).createItem({
            'branchId': branch,
            'name': name.text.trim(),
            'type': type,
            'category': category.text.trim(),
            'quantity': double.tryParse(quantity.text) ?? 1,
            'unitCost': double.tryParse(cost.text) ?? 0,
            'usefulLifeMonths': type == 'fixed_asset' ? 60 : null,
          });
          if (!mounted) return;
          Navigator.of(this.context).pop(true);
        } catch (e) {
          fail(e);
        }
      });
}

class _CreateExpenseSheet extends ConsumerStatefulWidget {
  const _CreateExpenseSheet();
  @override
  ConsumerState<_CreateExpenseSheet> createState() =>
      _CreateExpenseSheetState();
}

class _CreateExpenseSheetState extends _CreateSheetState<_CreateExpenseSheet> {
  final description = TextEditingController();
  final category = TextEditingController();
  final amount = TextEditingController();

  @override
  void dispose() {
    description.dispose();
    category.dispose();
    amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => sheet([
        Text('Record expense', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        branchField(),
        TextField(
            controller: description,
            decoration: const InputDecoration(labelText: 'Description')),
        TextField(
            controller: category,
            decoration: const InputDecoration(labelText: 'Category')),
        TextField(
            controller: amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Gross amount (PKR)')),
        const SizedBox(height: 8),
        const Text('The expense will enter the approval workflow as submitted.',
            style: TextStyle(fontSize: 12)),
      ], () async {
        final branch = branchId();
        final value = double.tryParse(amount.text);
        if (branch == null ||
            value == null ||
            description.text.trim().isEmpty ||
            category.text.trim().isEmpty) {
          return;
        }
        setState(() => saving = true);
        try {
          await ref.read(inventoryServiceProvider).createExpense({
            'branchId': branch,
            'expenseDate': DateTime.now().toIso8601String(),
            'description': description.text.trim(),
            'category': category.text.trim(),
            'grossAmount': value,
            'status': 'submitted',
          });
          if (!mounted) return;
          Navigator.of(this.context).pop(true);
        } catch (e) {
          fail(e);
        }
      });
}

class _CreateIncomeSheet extends ConsumerStatefulWidget {
  const _CreateIncomeSheet();
  @override
  ConsumerState<_CreateIncomeSheet> createState() => _CreateIncomeSheetState();
}

class _CreateIncomeSheetState extends _CreateSheetState<_CreateIncomeSheet> {
  final description = TextEditingController();
  final category = TextEditingController();
  final amount = TextEditingController();

  @override
  void dispose() {
    description.dispose();
    category.dispose();
    amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => sheet([
        Text('Record other income',
            style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        branchField(),
        TextField(
            controller: description,
            decoration: const InputDecoration(labelText: 'Description')),
        TextField(
            controller: category,
            decoration: const InputDecoration(
                labelText: 'Category (grant, donation, transport…)')),
        TextField(
            controller: amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Amount (PKR)')),
      ], () async {
        final branch = branchId();
        final value = double.tryParse(amount.text);
        if (branch == null ||
            value == null ||
            description.text.trim().isEmpty ||
            category.text.trim().isEmpty) {
          return;
        }
        setState(() => saving = true);
        try {
          await ref.read(inventoryServiceProvider).createIncome({
            'branchId': branch,
            'receivedAt': DateTime.now().toIso8601String(),
            'description': description.text.trim(),
            'category': category.text.trim(),
            'amount': value,
            'paymentMethod': 'bank_transfer',
          });
          if (!mounted) return;
          Navigator.of(this.context).pop(true);
        } catch (e) {
          fail(e);
        }
      });
}

class _CreateProcurementSheet extends ConsumerStatefulWidget {
  const _CreateProcurementSheet();
  @override
  ConsumerState<_CreateProcurementSheet> createState() =>
      _CreateProcurementSheetState();
}

class _CreateProcurementSheetState
    extends _CreateSheetState<_CreateProcurementSheet> {
  final title = TextEditingController();
  final quantity = TextEditingController(text: '1');
  final unitCost = TextEditingController();

  @override
  void dispose() {
    title.dispose();
    quantity.dispose();
    unitCost.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => sheet([
        Text('New procurement request',
            style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        branchField(),
        TextField(
            controller: title,
            decoration:
                const InputDecoration(labelText: 'Item / request title')),
        Row(children: [
          Expanded(
              child: TextField(
                  controller: quantity,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Quantity'))),
          const SizedBox(width: 12),
          Expanded(
              child: TextField(
                  controller: unitCost,
                  keyboardType: TextInputType.number,
                  decoration:
                      const InputDecoration(labelText: 'Estimated unit cost'))),
        ]),
      ], () async {
        final branch = branchId();
        if (branch == null || title.text.trim().isEmpty) {
          return;
        }
        setState(() => saving = true);
        try {
          await ref.read(inventoryServiceProvider).createProcurement({
            'branchId': branch,
            'title': title.text.trim(),
            'purpose': title.text.trim(),
            'status': 'draft',
            'procurementMethod': 'quotation',
            'items': [
              {
                'name': title.text.trim(),
                'quantity': double.tryParse(quantity.text) ?? 1,
                'unit': 'unit',
                'estimatedUnitCost': double.tryParse(unitCost.text) ?? 0,
              }
            ],
          });
          if (!mounted) return;
          Navigator.of(this.context).pop(true);
        } catch (e) {
          fail(e);
        }
      });
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Card(
        color: Theme.of(context).colorScheme.errorContainer,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Text(message, maxLines: 3, overflow: TextOverflow.ellipsis),
        ),
      );
}

String _pkr(dynamic value) {
  final number = (value as num?)?.round() ?? 0;
  final negative = number < 0;
  final digits = number.abs().toString();
  final grouped =
      digits.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  return '${negative ? '-' : ''}PKR $grouped';
}
