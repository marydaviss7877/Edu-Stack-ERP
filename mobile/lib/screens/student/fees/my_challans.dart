import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../providers/student_providers.dart';
import '../../../models/challan.dart';
import '../../../core/theme/app_design.dart';

class MyChallans extends ConsumerWidget {
  const MyChallans({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final challansAsync = ref.watch(myChallansProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Financial Center')),
      body: challansAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorRetry(
            message: e.toString(),
            onRetry: () => ref.invalidate(myChallansProvider)),
        data: (challans) {
          if (challans.isEmpty) {
            return const _Empty(message: 'No fee challans found.');
          }

          final unpaid = challans.where((c) => !c.isPaid).toList();
          final paid = challans.where((c) => c.isPaid).toList();
          final balance = unpaid.fold(0.0, (s, c) => s + c.balance);

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myChallansProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Balance summary ───────────────────────────
                if (unpaid.isNotEmpty)
                  _BalanceBanner(
                    balance: balance,
                    overdueCount: unpaid.where((c) => c.isOverdue).length,
                    nextDue: unpaid
                        .map((c) => c.dueDate)
                        .reduce((a, b) => a.isBefore(b) ? a : b),
                  ),

                if (unpaid.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionHeader(title: 'Outstanding (${unpaid.length})'),
                  const SizedBox(height: 8),
                  ...unpaid.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _ChallanCard(challan: c),
                      )),
                ],

                if (paid.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionHeader(title: 'Paid (${paid.length})'),
                  const SizedBox(height: 8),
                  ...paid.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _ChallanCard(challan: c),
                      )),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _BalanceBanner extends StatelessWidget {
  const _BalanceBanner({
    required this.balance,
    required this.overdueCount,
    required this.nextDue,
  });
  final double balance;
  final int overdueCount;
  final DateTime nextDue;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final fmt = NumberFormat('#,##0', 'en_PK');

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Total outstanding',
              style: tt.labelMedium?.copyWith(color: Colors.white70)),
          const SizedBox(height: 4),
          Text('PKR ${fmt.format(balance)}',
              style: tt.headlineMedium?.copyWith(color: Colors.white)),
          const SizedBox(height: 14),
          Row(
            children: [
              _FinanceDatum(
                  label: 'Due date',
                  value: DateFormat('d MMM').format(nextDue)),
              _FinanceDatum(
                  label: 'Status',
                  value: overdueCount > 0 ? 'Overdue' : 'Unpaid'),
              _FinanceDatum(label: 'Outstanding', value: '${overdueCount + 1}'),
            ],
          ),
        ],
      ),
    );
  }
}

class _FinanceDatum extends StatelessWidget {
  const _FinanceDatum({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(color: Colors.white60, fontSize: 10)),
            const SizedBox(height: 3),
            Text(value,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700)),
          ],
        ),
      );
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) => Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      );
}

class _ChallanCard extends StatelessWidget {
  const _ChallanCard({required this.challan});
  final Challan challan;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final fmt = NumberFormat('#,##0', 'en_PK');

    final (statusLabel, statusColor) = switch (challan.status) {
      'paid' => ('Paid', cs.primary),
      'waived' => ('Waived', cs.secondary),
      'overdue' => ('Overdue', cs.error),
      'partial' => ('Partially paid', cs.tertiary),
      _ => ('Unpaid', cs.error),
    };

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showDetail(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      challan.month,
                      style:
                          tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      statusLabel,
                      style: tt.labelSmall?.copyWith(
                          color: statusColor, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Challan # ${challan.challanNo}',
                style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 16,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _AmountChip(
                      label: 'Total amount',
                      amount: challan.netAmount,
                      fmt: fmt),
                  if (challan.paidAmount > 0)
                    _AmountChip(
                        label: 'Paid', amount: challan.paidAmount, fmt: fmt),
                  if (!challan.isPaid)
                    _AmountChip(
                        label: 'Balance',
                        amount: challan.balance,
                        fmt: fmt,
                        highlight: true),
                  Text(
                    'Due: ${DateFormat('d MMM').format(challan.dueDate)}',
                    style: tt.bodySmall?.copyWith(
                      color: challan.isOverdue ? cs.error : cs.onSurfaceVariant,
                      fontWeight: challan.isOverdue ? FontWeight.w600 : null,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => _ChallanDetail(challan: challan),
    );
  }
}

class _AmountChip extends StatelessWidget {
  const _AmountChip(
      {required this.label,
      required this.amount,
      required this.fmt,
      this.highlight = false});
  final String label;
  final double amount;
  final NumberFormat fmt;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
        Text(
          'PKR ${fmt.format(amount)}',
          style: tt.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: highlight ? cs.error : null,
          ),
        ),
      ],
    );
  }
}

class _ChallanDetail extends StatelessWidget {
  const _ChallanDetail({required this.challan});
  final Challan challan;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;
    final fmt = NumberFormat('#,##0', 'en_PK');

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(challan.month,
              style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          Text('Challan # ${challan.challanNo}',
              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          const Divider(height: 24),
          Text('Fee Breakdown',
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...challan.items.map(
            (item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  Expanded(child: Text(item.name, style: tt.bodyMedium)),
                  Text('PKR ${fmt.format(item.amount)}', style: tt.bodyMedium),
                ],
              ),
            ),
          ),
          const Divider(height: 20),
          Row(
            children: [
              Expanded(
                  child: Text('Total',
                      style: tt.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w600))),
              Text('PKR ${fmt.format(challan.netAmount)}',
                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
          if (challan.paidAmount > 0) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                    child: Text('Paid',
                        style: tt.bodyMedium?.copyWith(color: cs.primary))),
                Text('PKR ${fmt.format(challan.paidAmount)}',
                    style: tt.bodyMedium?.copyWith(color: cs.primary)),
              ],
            ),
            Row(
              children: [
                Expanded(
                    child: Text('Balance',
                        style: tt.bodyMedium?.copyWith(
                            color: cs.error, fontWeight: FontWeight.w600))),
                Text('PKR ${fmt.format(challan.balance)}',
                    style: tt.bodyMedium?.copyWith(
                        color: cs.error, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
          const SizedBox(height: 16),
          Text(
            'Due Date: ${DateFormat('d MMMM yyyy').format(challan.dueDate)}',
            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_rounded,
                size: 56, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text(message),
          ],
        ),
      );
}

class _ErrorRetry extends StatelessWidget {
  const _ErrorRetry({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      );
}
