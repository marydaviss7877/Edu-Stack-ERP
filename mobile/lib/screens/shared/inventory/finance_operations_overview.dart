import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_design.dart';
import 'financial_overview_card.dart' show formatPkr;

class FinanceOperationsOverview extends StatelessWidget {
  const FinanceOperationsOverview({
    super.key,
    required this.finance,
    required this.inventory,
    required this.history,
    required this.items,
    required this.expenses,
    required this.procurements,
    required this.role,
    required this.branchLabel,
    required this.onOpenTab,
  });

  final Map<String, dynamic> finance;
  final Map<String, dynamic> inventory;
  final List<Map<String, dynamic>> history;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> expenses;
  final List<Map<String, dynamic>> procurements;
  final String role;
  final String branchLabel;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context) {
    return role == 'branch_principal'
        ? _PrincipalBlueprint(
            finance: finance,
            inventory: inventory,
            history: history,
            items: items,
            expenses: expenses,
            procurements: procurements,
            branchLabel: branchLabel,
            onOpenTab: onOpenTab,
          )
        : _GroupBlueprint(
            finance: finance,
            inventory: inventory,
            history: history,
            items: items,
            expenses: expenses,
            procurements: procurements,
            branchLabel: branchLabel,
            onOpenTab: onOpenTab,
          );
  }
}

class _GroupBlueprint extends StatelessWidget {
  const _GroupBlueprint({
    required this.finance,
    required this.inventory,
    required this.history,
    required this.items,
    required this.expenses,
    required this.procurements,
    required this.branchLabel,
    required this.onOpenTab,
  });

  final Map<String, dynamic> finance;
  final Map<String, dynamic> inventory;
  final List<Map<String, dynamic>> history;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> expenses;
  final List<Map<String, dynamic>> procurements;
  final String branchLabel;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context) {
    final verified = items.where(_isVerified).length;
    final verifiedPct =
        items.isEmpty ? 0 : (verified / items.length * 100).round();
    final pending = _number(inventory['pendingExpenses']).round() +
        _number(inventory['pendingProcurements']).round();
    final branches = _mapList(finance['branchPerformance'])
      ..sort((a, b) => _number(b['operatingSurplus'])
          .compareTo(_number(a['operatingSurplus'])));
    final margin = _number(finance['operatingMargin']);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FinanceHero(finance: finance, scoped: branchLabel != 'All campuses'),
        const SizedBox(height: 14),
        _BriefCard(
          eyebrow: 'GROUP ADMINISTRATOR BRIEF',
          title: _number(finance['operatingSurplus']) >= 0
              ? 'Healthy and improving'
              : 'Deficit needs intervention',
          body:
              'Every PKR 100 received produced PKR ${margin.abs().toStringAsFixed(2)} in operating ${margin >= 0 ? 'surplus' : 'deficit'} after cash costs and depreciation.',
        ),
        const SizedBox(height: 14),
        _MetricsGrid(children: [
          _MetricTile(
            label: 'Outstanding fees',
            value: formatPkr(finance['outstandingFees']),
            hint:
                '${_number(finance['feeRecoveryRate']).toStringAsFixed(1)}% recovery',
            icon: Icons.account_balance_wallet_rounded,
            color: AppColors.warning,
          ),
          _MetricTile(
            label: 'Net book value',
            value: formatPkr(inventory['netBookValue']),
            hint: '${inventory['fixedAssets'] ?? 0} fixed assets',
            icon: Icons.domain_rounded,
            color: AppColors.info,
          ),
          _MetricTile(
            label: 'Assets verified',
            value: '$verifiedPct%',
            hint: '$verified of ${items.length} current',
            icon: Icons.verified_user_rounded,
            color: AppColors.success,
          ),
          _MetricTile(
            label: 'Decisions waiting',
            value: '$pending',
            hint: 'Expenses + procurement',
            icon: Icons.approval_rounded,
            color: AppColors.error,
          ),
        ]),
        const _SectionTitle('Income vs total operating cost',
            subtitle: 'Actual six-month ledger trend'),
        _FinanceTrend(history: history),
        const _SectionTitle('Decision queue',
            subtitle: 'Only items that need action'),
        _DecisionQueue(
          inventory: inventory,
          expenses: expenses,
          procurements: procurements,
          onOpenTab: onOpenTab,
        ),
        const _SectionTitle('Campus operating performance',
            subtitle: 'Final operating surplus after depreciation'),
        _BranchPerformance(branches: branches),
        const _SectionTitle('Governance assurance',
            subtitle: 'Asset and workflow controls'),
        _AssuranceCard(
          verified: verifiedPct.toDouble(),
          recovery: _number(finance['feeRecoveryRate']),
          approvals:
              pending == 0 ? 100 : math.max(0, 100 - pending * 5).toDouble(),
        ),
        const SizedBox(height: 16),
        _SourceTruth(
          finance: finance,
          recordCount: items.length + expenses.length + procurements.length,
        ),
        const _Disclaimer(),
      ],
    );
  }
}

class _PrincipalBlueprint extends StatelessWidget {
  const _PrincipalBlueprint({
    required this.finance,
    required this.inventory,
    required this.history,
    required this.items,
    required this.expenses,
    required this.procurements,
    required this.branchLabel,
    required this.onOpenTab,
  });

  final Map<String, dynamic> finance;
  final Map<String, dynamic> inventory;
  final List<Map<String, dynamic>> history;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> expenses;
  final List<Map<String, dynamic>> procurements;
  final String branchLabel;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final month = finance['month']?.toString() ?? '';
    final currentMonth = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    final parts = month.split('-');
    final year = int.tryParse(parts.isNotEmpty ? parts.first : '') ?? now.year;
    final monthNo = int.tryParse(parts.length > 1 ? parts[1] : '') ?? now.month;
    final days = DateTime(year, monthNo + 1, 0).day;
    final elapsed = month == currentMonth ? now.day : days;
    final forecast =
        (_number(finance['operatingSurplus']) / math.max(1, elapsed) * days)
            .round();
    final committed = procurements
        .where((row) => const {
              'approved',
              'quotation',
              'ordered',
              'partially_received'
            }.contains(row['status']))
        .fold<double>(0, (sum, row) => sum + _number(row['estimatedTotal']));
    final affected = items.where(_requiresMaintenance).take(4).toList();
    final locations = affected
        .map((row) => row['location']?.toString() ?? 'Unassigned')
        .toSet()
        .length;
    final peer = finance['peerBenchmark'] is Map
        ? Map<String, dynamic>.from(finance['peerBenchmark'] as Map)
        : <String, dynamic>{};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ScopeStrip(
          branchLabel: branchLabel,
          month: month,
          dataAsOf: finance['dataAsOf']?.toString(),
        ),
        const SizedBox(height: 14),
        _FinanceHero(finance: finance, scoped: true),
        const SizedBox(height: 14),
        _ForecastCard(
          value: forecast,
          elapsed: elapsed,
          days: days,
        ),
        const SizedBox(height: 14),
        _MetricsGrid(children: [
          _MetricTile(
            label: 'Fee recovery',
            value: '${_number(finance['feeRecoveryRate']).toStringAsFixed(1)}%',
            hint: '${formatPkr(finance['outstandingFees'])} outstanding',
            icon: Icons.payments_rounded,
            color: AppColors.warning,
          ),
          const _MetricTile(
            label: 'Budget available',
            value: 'Not configured',
            hint: 'Budget model required',
            icon: Icons.account_balance_rounded,
            color: AppColors.warning,
          ),
          _MetricTile(
            label: 'Committed procurement',
            value: formatPkr(committed),
            hint: 'Approved + in progress',
            icon: Icons.shopping_cart_checkout_rounded,
            color: AppColors.info,
          ),
          _MetricTile(
            label: 'Spaces impacted',
            value: '$locations',
            hint: '${affected.length} maintenance records',
            icon: Icons.location_on_rounded,
            color: affected.isEmpty ? AppColors.success : AppColors.error,
          ),
        ]),
        const _SectionTitle('Income vs total operating cost',
            subtitle: 'Actual six-month branch trend'),
        _FinanceTrend(history: history),
        const _SectionTitle('Fee collection risk',
            subtitle: 'Outstanding receivables by due-date age'),
        _ReceivableAgeing(finance: finance),
        const _SectionTitle('Your decision queue',
            subtitle: 'Branch-scoped approvals and exceptions'),
        _DecisionQueue(
          inventory: inventory,
          expenses: expenses,
          procurements: procurements,
          onOpenTab: onOpenTab,
        ),
        const _SectionTitle('Operational impact by location',
            subtitle: 'Assets affecting service delivery'),
        _OperationalImpact(items: affected, onOpen: () => onOpenTab(1)),
        const _SectionTitle('Budget control',
            subtitle: 'Authorized, committed and available'),
        _BudgetUnavailable(committed: committed),
        const _SectionTitle('Peer benchmark',
            subtitle: 'Your branch versus the group'),
        _PeerBenchmark(data: peer),
        const SizedBox(height: 16),
        _SourceTruth(
          finance: finance,
          recordCount: items.length + expenses.length + procurements.length,
        ),
        const _Disclaimer(
          extra:
              'Forecast is directional; budgets remain unavailable until configured.',
        ),
      ],
    );
  }
}

class _FinanceHero extends StatelessWidget {
  const _FinanceHero({required this.finance, required this.scoped});
  final Map<String, dynamic> finance;
  final bool scoped;

  @override
  Widget build(BuildContext context) {
    final result = _number(finance['operatingSurplus']);
    final positive = result >= 0;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(context.isNarrowPhone ? 16 : 20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.identityStart,
            AppColors.identityMid,
            AppColors.primary
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.hero)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${finance['month'] ?? ''} · ${scoped ? 'BRANCH' : 'ORGANIZATION'} OPERATING RESULT',
            style: const TextStyle(
              color: Color(0xFFC7B9E8),
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 12),
          Text(positive ? 'Operating surplus' : 'Operating deficit',
              style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 2),
          Row(children: [
            Icon(
                positive
                    ? Icons.trending_up_rounded
                    : Icons.trending_down_rounded,
                color: positive
                    ? const Color(0xFF7FE1D8)
                    : const Color(0xFFFFB4AB),
                size: 25),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                formatPkr(result.abs()),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white,
                  fontFamily: 'Outfit',
                  fontSize: context.isNarrowPhone ? 28 : 34,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.5,
                ),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          _Pill(
              '${_number(finance['operatingMargin']).toStringAsFixed(1)}% margin'),
          const SizedBox(height: 18),
          _Equation(finance: finance),
          const SizedBox(height: 16),
          const Divider(color: Colors.white12, height: 1),
          const SizedBox(height: 14),
          Wrap(
            spacing: 20,
            runSpacing: 12,
            children: [
              _HeroValue('TOTAL INCOME', formatPkr(finance['totalRevenue'])),
              _HeroValue('OPERATING EXPENSES',
                  formatPkr(finance['operatingExpenses'])),
              _HeroValue('PAYROLL', formatPkr(finance['payroll'])),
              _HeroValue(
                  'FEES OUTSTANDING', formatPkr(finance['outstandingFees'])),
            ],
          ),
        ],
      ),
    );
  }
}

class _Equation extends StatelessWidget {
  const _Equation({required this.finance});
  final Map<String, dynamic> finance;

  @override
  Widget build(BuildContext context) => Row(children: [
        Expanded(child: _EquationValue('Cash surplus', finance['cashSurplus'])),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 5),
          child: Text('−', style: TextStyle(color: Colors.white38)),
        ),
        Expanded(
            child: _EquationValue('Depreciation', finance['depreciation'])),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 5),
          child: Text('=', style: TextStyle(color: Colors.white38)),
        ),
        Expanded(
          child: _EquationValue(
            'Final result',
            finance['operatingSurplus'],
            emphasized: true,
          ),
        ),
      ]);
}

class _EquationValue extends StatelessWidget {
  const _EquationValue(this.label, this.value, {this.emphasized = false});
  final String label;
  final dynamic value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 9),
        decoration: BoxDecoration(
          color: emphasized
              ? AppColors.success.withValues(alpha: .24)
              : Colors.white.withValues(alpha: .08),
          border: Border.all(color: Colors.white12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white54, fontSize: 8)),
          const SizedBox(height: 3),
          Text(formatPkr(value),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: emphasized ? const Color(0xFF7FE1D8) : Colors.white,
                fontSize: context.isNarrowPhone ? 9 : 10,
                fontWeight: FontWeight.w800,
              )),
        ]),
      );
}

class _Pill extends StatelessWidget {
  const _Pill(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: .2),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(text,
            style: const TextStyle(
                color: Color(0xFF7FE1D8),
                fontSize: 10,
                fontWeight: FontWeight.w700)),
      );
}

class _HeroValue extends StatelessWidget {
  const _HeroValue(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => SizedBox(
        width: context.isNarrowPhone ? 120 : 145,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(
                  color: Colors.white38, fontSize: 8, letterSpacing: .4)),
          const SizedBox(height: 2),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w700)),
        ]),
      );
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final oneColumn = context.isNarrowPhone && scale > 1.15;
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: oneColumn ? 1 : 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: oneColumn
          ? 2.0
          : context.isNarrowPhone
              ? 1.25
              : 1.45,
      children: children,
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    required this.hint,
    required this.icon,
    required this.color,
  });
  final String label;
  final String value;
  final String hint;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(
                  child: Text(label.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: 8,
                          fontWeight: FontWeight.w800,
                          letterSpacing: .4)),
                ),
                Icon(icon, color: color, size: 18),
              ]),
              const Spacer(),
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      color: color,
                      fontFamily: 'Outfit',
                      fontSize: context.isNarrowPhone ? 16 : 19,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(hint,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style:
                      const TextStyle(color: AppColors.inkMuted, fontSize: 9)),
            ],
          ),
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {required this.subtitle});
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 22, bottom: 9),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(subtitle,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.inkMuted)),
        ]),
      );
}

class _FinanceTrend extends StatelessWidget {
  const _FinanceTrend({required this.history});
  final List<Map<String, dynamic>> history;

  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 16, 14, 12),
          child: Column(children: [
            const Row(mainAxisAlignment: MainAxisAlignment.end, children: [
              _Legend(color: AppColors.primary, label: 'Income'),
              SizedBox(width: 12),
              _Legend(color: AppColors.warning, label: 'Cost'),
            ]),
            const SizedBox(height: 10),
            SizedBox(
              height: 150,
              width: double.infinity,
              child: history.length < 2
                  ? const Center(child: Text('Trend needs two months of data.'))
                  : CustomPaint(painter: _TrendPainter(history)),
            ),
            if (history.length >= 2)
              Row(
                children: history
                    .map((row) => Expanded(
                          child: Text(
                            _monthLabel(row['month']),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.fade,
                            style: const TextStyle(
                                color: AppColors.inkMuted, fontSize: 9),
                          ),
                        ))
                    .toList(),
              ),
          ]),
        ),
      );
}

class _TrendPainter extends CustomPainter {
  _TrendPainter(this.rows);
  final List<Map<String, dynamic>> rows;

  @override
  void paint(Canvas canvas, Size size) {
    final maxValue = rows.fold<double>(1, (maxValue, row) {
      final income = _number(row['totalRevenue']);
      final cost = _number(row['operatingExpenses']) +
          _number(row['payroll']) +
          _number(row['depreciation']);
      return math.max(maxValue, math.max(income, cost));
    });
    final grid = Paint()
      ..color = AppColors.outlineVariant
      ..strokeWidth = .7;
    for (final ratio in [.15, .5, .85]) {
      canvas.drawLine(Offset(0, size.height * ratio),
          Offset(size.width, size.height * ratio), grid);
    }
    void draw(bool income, Color color) {
      final path = Path();
      for (var i = 0; i < rows.length; i++) {
        final row = rows[i];
        final value = income
            ? _number(row['totalRevenue'])
            : _number(row['operatingExpenses']) +
                _number(row['payroll']) +
                _number(row['depreciation']);
        final x = i / (rows.length - 1) * size.width;
        final y = size.height - (value / maxValue * size.height * .82) - 4;
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(
          path,
          Paint()
            ..color = color
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.5
            ..strokeCap = StrokeCap.round
            ..strokeJoin = StrokeJoin.round);
    }

    draw(true, AppColors.primary);
    draw(false, AppColors.warning);
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) =>
      oldDelegate.rows != rows;
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});
  final Color color;
  final String label;
  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
                color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 4),
        Text(label,
            style: const TextStyle(fontSize: 9, color: AppColors.inkMuted)),
      ]);
}

class _DecisionQueue extends StatelessWidget {
  const _DecisionQueue({
    required this.inventory,
    required this.expenses,
    required this.procurements,
    required this.onOpenTab,
  });
  final Map<String, dynamic> inventory;
  final List<Map<String, dynamic>> expenses;
  final List<Map<String, dynamic>> procurements;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context) {
    final rows = [
      (
        'Expense approvals',
        expenses.where((r) => r['status'] == 'submitted').length,
        Icons.receipt_long_rounded,
        AppColors.primary,
        2
      ),
      (
        'Procurement approvals',
        procurements.where((r) => r['status'] == 'submitted').length,
        Icons.shopping_cart_rounded,
        AppColors.info,
        4
      ),
      (
        'Maintenance required',
        _number(inventory['maintenanceDue']).round(),
        Icons.build_circle_rounded,
        AppColors.warning,
        1
      ),
      (
        'Verification overdue',
        _number(inventory['verificationOverdue']).round(),
        Icons.fact_check_rounded,
        AppColors.error,
        1
      ),
    ];
    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        children: rows
            .map((row) => Column(children: [
                  ListTile(
                    onTap: () => onOpenTab(row.$5),
                    leading: CircleAvatar(
                      backgroundColor: row.$4.withValues(alpha: .12),
                      foregroundColor: row.$4,
                      child: Icon(row.$3, size: 19),
                    ),
                    title: Text(row.$1,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w700)),
                    subtitle: const Text('Open the detailed ledger',
                        style: TextStyle(fontSize: 10)),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('${row.$2}',
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right_rounded, size: 18),
                    ]),
                  ),
                  if (row != rows.last) const Divider(height: 1, indent: 72),
                ]))
            .toList(),
      ),
    );
  }
}

class _BranchPerformance extends StatelessWidget {
  const _BranchPerformance({required this.branches});
  final List<Map<String, dynamic>> branches;

  @override
  Widget build(BuildContext context) {
    if (branches.isEmpty) {
      return const Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: EdgeInsets.all(24),
          child:
              Center(child: Text('Choose All campuses to compare branches.')),
        ),
      );
    }
    final maxValue = branches.fold<double>(
        1,
        (value, row) =>
            math.max(value, _number(row['operatingSurplus']).abs()));
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            for (var index = 0; index < branches.length; index++) ...[
              _BranchRow(
                  index: index, data: branches[index], maxValue: maxValue),
              if (index != branches.length - 1) const Divider(height: 20),
            ],
          ],
        ),
      ),
    );
  }
}

class _BranchRow extends StatelessWidget {
  const _BranchRow(
      {required this.index, required this.data, required this.maxValue});
  final int index;
  final Map<String, dynamic> data;
  final double maxValue;

  @override
  Widget build(BuildContext context) {
    final result = _number(data['operatingSurplus']);
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      CircleAvatar(
          radius: 14,
          child: Text('${index + 1}', style: const TextStyle(fontSize: 10))),
      const SizedBox(width: 10),
      Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Text(data['name']?.toString() ?? 'Campus',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700))),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerRight,
              child: Text(formatPkr(result),
                  style: TextStyle(
                      color: result >= 0 ? AppColors.success : AppColors.error,
                      fontSize: 11,
                      fontWeight: FontWeight.w800)),
            ),
          ),
        ]),
        const SizedBox(height: 7),
        LinearProgressIndicator(
          value: math.max(.03, result.abs() / maxValue),
          minHeight: 6,
          borderRadius: BorderRadius.circular(99),
          color: result >= 0 ? AppColors.primary : AppColors.error,
          backgroundColor: AppColors.surfaceHighest,
        ),
        const SizedBox(height: 4),
        Row(children: [
          Expanded(
            child: Text('Income ${formatPkr(data['revenue'])}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 8, color: AppColors.inkMuted)),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
                '${_number(data['operatingMargin']).toStringAsFixed(1)}% margin',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 8, color: AppColors.inkMuted)),
          ),
        ]),
      ])),
    ]);
  }
}

class _AssuranceCard extends StatelessWidget {
  const _AssuranceCard(
      {required this.verified,
      required this.recovery,
      required this.approvals});
  final double verified;
  final double recovery;
  final double approvals;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            _ProgressRow('Asset verification', verified),
            const SizedBox(height: 14),
            _ProgressRow('Fee recovery', recovery),
            const SizedBox(height: 14),
            _ProgressRow('Approval clearance', approvals),
          ]),
        ),
      );
}

class _ProgressRow extends StatelessWidget {
  const _ProgressRow(this.label, this.value);
  final String label;
  final double value;
  @override
  Widget build(BuildContext context) {
    final bounded = value.clamp(0, 100).toDouble();
    final color = bounded >= 85 ? AppColors.success : AppColors.warning;
    return Column(children: [
      Row(children: [
        Expanded(
          child: Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11)),
        ),
        const SizedBox(width: 8),
        Text('${bounded.toStringAsFixed(0)}%',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
      ]),
      const SizedBox(height: 6),
      LinearProgressIndicator(
        value: bounded / 100,
        minHeight: 7,
        color: color,
        backgroundColor: AppColors.surfaceHighest,
        borderRadius: BorderRadius.circular(99),
      ),
    ]);
  }
}

class _BriefCard extends StatelessWidget {
  const _BriefCard(
      {required this.eyebrow, required this.title, required this.body});
  final String eyebrow;
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const CircleAvatar(
              backgroundColor: AppColors.primaryContainer,
              foregroundColor: AppColors.primary,
              child: Icon(Icons.auto_awesome_rounded, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(eyebrow,
                      style: const TextStyle(
                          fontSize: 8,
                          color: AppColors.inkMuted,
                          fontWeight: FontWeight.w800,
                          letterSpacing: .5)),
                  const SizedBox(height: 2),
                  Text(title,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(body,
                      style: const TextStyle(
                          fontSize: 11,
                          height: 1.5,
                          color: AppColors.inkMuted)),
                ])),
          ]),
        ),
      );
}

class _ScopeStrip extends StatelessWidget {
  const _ScopeStrip(
      {required this.branchLabel, required this.month, this.dataAsOf});
  final String branchLabel;
  final String month;
  final String? dataAsOf;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(children: [
            const Badge(label: Text('Principal')),
            const SizedBox(width: 8),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(branchLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w800)),
                  Text('$month · Live branch scope',
                      style: const TextStyle(
                          fontSize: 9, color: AppColors.inkMuted)),
                ])),
            if (dataAsOf != null)
              const Icon(Icons.cloud_done_rounded,
                  color: AppColors.success, size: 18),
          ]),
        ),
      );
}

class _ForecastCard extends StatelessWidget {
  const _ForecastCard(
      {required this.value, required this.elapsed, required this.days});
  final int value;
  final int elapsed;
  final int days;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(
                spacing: 8,
                runSpacing: 4,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Text('Month-end forecast',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                  Chip(
                      label: Text('$elapsed/$days days'),
                      visualDensity: VisualDensity.compact),
                ]),
            Text('Directional run-rate projection',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 14),
            Text(formatPkr(value),
                style: TextStyle(
                    color: value >= 0 ? AppColors.success : AppColors.error,
                    fontFamily: 'Outfit',
                    fontSize: 26,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            LinearProgressIndicator(
                value: elapsed / days,
                minHeight: 7,
                borderRadius: BorderRadius.circular(99)),
            const SizedBox(height: 12),
            const Text(
              'Projection extrapolates current month-to-date performance. It is not a configured budget forecast.',
              style: TextStyle(
                  fontSize: 9, color: AppColors.inkMuted, height: 1.4),
            ),
          ]),
        ),
      );
}

class _ReceivableAgeing extends StatelessWidget {
  const _ReceivableAgeing({required this.finance});
  final Map<String, dynamic> finance;
  @override
  Widget build(BuildContext context) {
    final ageing = finance['receivableAgeing'] is Map
        ? Map<String, dynamic>.from(finance['receivableAgeing'] as Map)
        : <String, dynamic>{};
    return Card(
      margin: EdgeInsets.zero,
      child: Column(children: [
        _AgeRow('Current · 0–30 days', ageing['current'], AppColors.success),
        const Divider(height: 1, indent: 16),
        _AgeRow(
            'Attention · 31–60 days', ageing['days31to60'], AppColors.warning),
        const Divider(height: 1, indent: 16),
        _AgeRow('High risk · 61+ days', ageing['over60'], AppColors.error),
      ]),
    );
  }
}

class _AgeRow extends StatelessWidget {
  const _AgeRow(this.label, this.raw, this.color);
  final String label;
  final dynamic raw;
  final Color color;
  @override
  Widget build(BuildContext context) {
    final data =
        raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
    return ListTile(
      leading: Container(
          width: 7,
          height: 38,
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(99))),
      title: Text(label, style: const TextStyle(fontSize: 11)),
      subtitle: Text('${data['accounts'] ?? 0} fee accounts',
          style: const TextStyle(fontSize: 9)),
      trailing: Text(formatPkr(data['amount']),
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.w800)),
    );
  }
}

class _OperationalImpact extends StatelessWidget {
  const _OperationalImpact({required this.items, required this.onOpen});
  final List<Map<String, dynamic>> items;
  final VoidCallback onOpen;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: items.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No learning spaces are affected.')),
              )
            : Column(
                children: items
                    .map((item) => ListTile(
                          onTap: onOpen,
                          leading: Container(
                              width: 7,
                              height: 38,
                              decoration: BoxDecoration(
                                  color: AppColors.error,
                                  borderRadius: BorderRadius.circular(99))),
                          title: Text(
                              item['location']?.toString() ??
                                  'Unassigned location',
                              style: const TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w700)),
                          subtitle: Text(
                              '${item['name'] ?? 'Asset'} · ${item['condition'] ?? ''}',
                              style: const TextStyle(fontSize: 9)),
                          trailing: const Icon(Icons.chevron_right_rounded),
                        ))
                    .toList(),
              ),
      );
}

class _BudgetUnavailable extends StatelessWidget {
  const _BudgetUnavailable({required this.committed});
  final double committed;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(children: [
            const Icon(Icons.account_balance_rounded,
                color: AppColors.warning, size: 28),
            const SizedBox(height: 8),
            const Text('Monthly budget not configured',
                style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 5),
            Text(
              'Committed procurement is ${formatPkr(committed)}. Available budget cannot be calculated safely without an authorized budget.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.inkMuted, height: 1.4),
            ),
          ]),
        ),
      );
}

class _PeerBenchmark extends StatelessWidget {
  const _PeerBenchmark({required this.data});
  final Map<String, dynamic> data;
  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: Text('Peer benchmark is unavailable.')),
        ),
      );
    }
    final branch = _number(data['branchMargin']);
    final average = _number(data['groupAverageMargin']);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Align(
            alignment: Alignment.centerLeft,
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('BRANCH MARGIN',
                  style: TextStyle(fontSize: 8, color: AppColors.inkMuted)),
              Text('${branch.toStringAsFixed(1)}%',
                  style: const TextStyle(
                      fontSize: 25, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                  'Rank #${data['rank'] ?? '—'} / ${data['branchCount'] ?? '—'} · Group ${average.toStringAsFixed(1)}%',
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 10,
                      fontWeight: FontWeight.w800)),
            ]),
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
              value: (branch / 25).clamp(0, 1),
              minHeight: 7,
              borderRadius: BorderRadius.circular(99)),
        ]),
      ),
    );
  }
}

class _SourceTruth extends StatelessWidget {
  const _SourceTruth({required this.finance, required this.recordCount});
  final Map<String, dynamic> finance;
  final int recordCount;
  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: Column(children: [
          Container(
            color: AppColors.identityStart,
            padding: const EdgeInsets.all(14),
            child: const Row(children: [
              Icon(Icons.verified_user_rounded, color: Color(0xFF7FE1D8)),
              SizedBox(width: 10),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Source-of-truth controls',
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.w800)),
                    Text('Freshness, formula and record coverage',
                        style: TextStyle(color: Colors.white60, fontSize: 9)),
                  ])),
            ]),
          ),
          _TrustRow('Data freshness', _dateTime(finance['dataAsOf'])),
          const Divider(height: 1, indent: 16),
          const _TrustRow(
              'Calculation', 'Income − expenses − payroll − depreciation'),
          const Divider(height: 1, indent: 16),
          _TrustRow('Record coverage', '$recordCount loaded records'),
        ]),
      );
}

class _TrustRow extends StatelessWidget {
  const _TrustRow(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 100,
              child: Text(label.toUpperCase(),
                  style: const TextStyle(
                      fontSize: 8,
                      color: AppColors.inkMuted,
                      fontWeight: FontWeight.w700))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 10, fontWeight: FontWeight.w700))),
        ]),
      );
}

class _Disclaimer extends StatelessWidget {
  const _Disclaimer({this.extra});
  final String? extra;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 14, 4, 0),
        child: Text(
          'Profit is presented as operating surplus/deficit for public or nonprofit institutions. Management information; not an audited statutory statement.${extra == null ? '' : ' $extra'}',
          style: const TextStyle(
              fontSize: 9, color: AppColors.inkMuted, height: 1.4),
        ),
      );
}

double _number(dynamic value) => (value as num?)?.toDouble() ?? 0;

List<Map<String, dynamic>> _mapList(dynamic value) => value is List
    ? value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList()
    : <Map<String, dynamic>>[];

bool _isVerified(Map<String, dynamic> item) {
  final verified = DateTime.tryParse(item['lastVerifiedAt']?.toString() ?? '');
  final due = DateTime.tryParse(item['nextVerificationDue']?.toString() ?? '');
  return verified != null && (due == null || due.isAfter(DateTime.now()));
}

bool _requiresMaintenance(Map<String, dynamic> item) =>
    item['status'] == 'under_maintenance' ||
    const {'poor', 'unserviceable'}.contains(item['condition']);

String _monthLabel(dynamic value) {
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  final parts = value?.toString().split('-') ?? const <String>[];
  final month = parts.length > 1 ? int.tryParse(parts[1]) : null;
  return month != null && month >= 1 && month <= 12 ? names[month - 1] : '—';
}

String _dateTime(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return 'Not available';
  return '${date.day.toString().padLeft(2, '0')}-${date.month.toString().padLeft(2, '0')}-${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}
