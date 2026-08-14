import 'package:flutter/material.dart';
import '../../../core/theme/app_design.dart';

class FinancialOverviewCard extends StatelessWidget {
  const FinancialOverviewCard({
    super.key,
    required this.data,
    this.showBranches = false,
  });

  final Map<String, dynamic> data;
  final bool showBranches;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final surplus = (data['operatingSurplus'] as num?)?.toDouble() ?? 0;
    final margin = (data['operatingMargin'] as num?)?.toDouble() ?? 0;
    final branches =
        (data['branchPerformance'] as List?)?.cast<Map<String, dynamic>>() ??
            [];

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.identityStart, AppColors.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${data['month'] ?? ''} · Financial performance',
                    style:
                        const TextStyle(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 5),
                Text(
                  '${surplus >= 0 ? 'Net operating surplus' : 'Net operating deficit'}  ${formatPkr(surplus.abs())}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text('${margin.toStringAsFixed(1)}% operating margin',
                    style: const TextStyle(color: Colors.white70)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Wrap(
              spacing: 24,
              runSpacing: 14,
              children: [
                _Value('Total income', formatPkr(data['totalRevenue']),
                    cs.primary),
                _Value(
                    'Fee receipts', formatPkr(data['feeRevenue']), cs.primary),
                _Value('Other income', formatPkr(data['otherIncome']),
                    cs.secondary),
                _Value('Operating expenses',
                    formatPkr(data['operatingExpenses']), cs.error),
                _Value('Payroll', formatPkr(data['payroll']), cs.secondary),
                _Value('Depreciation', formatPkr(data['depreciation']),
                    cs.tertiary),
                _Value(
                    'Cash surplus', formatPkr(data['cashSurplus']), cs.primary),
                _Value('Fees outstanding', formatPkr(data['outstandingFees']),
                    cs.error),
              ],
            ),
          ),
          if (showBranches && branches.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
              child: Text('Branch performance',
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.w800)),
            ),
            ...branches.take(8).map((branch) {
              final value = (branch['cashSurplus'] as num?)?.toDouble() ?? 0;
              return ListTile(
                dense: true,
                title: Text(branch['name'] as String? ?? 'Branch'),
                subtitle: Text('Revenue ${formatPkr(branch['revenue'])}'),
                trailing: Text(
                  formatPkr(value),
                  style: TextStyle(
                    color: value >= 0 ? cs.primary : cs.error,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              );
            }),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _Value extends StatelessWidget {
  const _Value(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 132,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: color, fontWeight: FontWeight.w800)),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      );
}

String formatPkr(dynamic value) {
  final number = (value as num?)?.round() ?? 0;
  final negative = number < 0;
  final grouped = number
      .abs()
      .toString()
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  return '${negative ? '-' : ''}PKR $grouped';
}
