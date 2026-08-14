import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/accountant_providers.dart';
import '../../../core/layout/responsive.dart';
import '../../../providers/inventory_providers.dart';
import '../../shared/inventory/financial_overview_card.dart';
import '../../../core/theme/app_design.dart';

class AccountantDashboard extends ConsumerWidget {
  const AccountantDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final photoUrl = user?.photoUrl;
    final org = ref.watch(orgProvider);
    final unread = ref.watch(accountantUnreadCountProvider).valueOrNull ?? 0;
    return Scaffold(
      body: Column(
        children: [
          AppIdentityHeader(
            organization: org?.name ?? 'EduStack',
            name: user?.name ?? 'Accountant',
            subtitle: 'Accountant · Fee management',
            photoUrl: photoUrl,
            notificationCount: unread,
            onProfile: () => context.push('/profile'),
            onNotifications: () => context.go('/accountant/notifications'),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(accountantDashboardStatsProvider);
                ref.invalidate(overdueCountProvider);
                ref.invalidate(allChallansProvider(null));
                ref.invalidate(accountantUnreadCountProvider);
                ref.invalidate(financeSummaryProvider);
                ref.invalidate(inventoryDashboardProvider);
              },
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                    context.pageGutter, 18, context.pageGutter, 100),
                children: [
                  Text('Fee management',
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text('Collection progress and work requiring follow-up.',
                      style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 16),
                  const _AccountantFinanceOverview(),
                  const SizedBox(height: 14),
                  _StatsRow(),
                  const SizedBox(height: 14),
                  _OverdueBanner(),
                  const AppSectionHeader(title: 'Quick actions'),
                  GridView.count(
                    crossAxisCount: 3,
                    crossAxisSpacing: 8,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.05,
                    children: [
                      AppQuickAction(
                          icon: Icons.receipt_long_rounded,
                          label: 'Challans',
                          onTap: () => context.go('/accountant/challans')),
                      AppQuickAction(
                          icon: Icons.bar_chart_rounded,
                          label: 'Reports',
                          color: AppColors.info,
                          onTap: () => context.go('/accountant/reports')),
                      AppQuickAction(
                          icon: Icons.inventory_2_rounded,
                          label: 'Ledger',
                          color: AppColors.achievement,
                          onTap: () => context.go('/accountant/inventory')),
                    ],
                  ),
                  AppSectionHeader(
                      title: 'Needs follow-up',
                      actionLabel: 'See all',
                      onAction: () => context.go('/accountant/challans')),
                  _RecentUnpaid(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountantFinanceOverview extends ConsumerWidget {
  const _AccountantFinanceOverview();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final finance = ref.watch(financeSummaryProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Income & expenditure',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
            ),
            TextButton(
              onPressed: () => context.go('/accountant/inventory'),
              child: const Text('Open ledger'),
            ),
          ],
        ),
        finance.when(
          loading: () => const LinearProgressIndicator(),
          error: (_, __) => const Card(
              child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Financial summary unavailable'))),
          data: (data) => FinancialOverviewCard(data: data),
        ),
      ],
    );
  }
}

class _StatsRow extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(accountantDashboardStatsProvider);
    final cs = Theme.of(context).colorScheme;
    final fmt = NumberFormat('#,##0', 'en_PK');

    return ResponsiveGrid(
      childAspectRatio: context.isNarrowPhone ? 1.65 : 1.8,
      narrowChildAspectRatio: 2.8,
      children: [
        _MiniStat(
          label: 'Collected',
          value: stats.when(
            data: (d) =>
                'PKR ${fmt.format((d['monthlyCollected'] as num?)?.toDouble() ?? 0)}',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: cs.primary,
          icon: Icons.trending_up_rounded,
        ),
        _MiniStat(
          label: 'Pending',
          value: stats.when(
            data: (d) =>
                'PKR ${fmt.format((d['monthlyPending'] as num?)?.toDouble() ?? 0)}',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: cs.tertiary,
          icon: Icons.pending_rounded,
        ),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat(
      {required this.label,
      required this.value,
      required this.color,
      required this.icon});
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Text(label,
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            ]),
            const SizedBox(height: 6),
            Text(value,
                style: tt.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}

class _OverdueBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final countAsync = ref.watch(overdueCountProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return countAsync.maybeWhen(
      data: (count) {
        if (count == 0) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Card(
            color: cs.errorContainer,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Icon(Icons.warning_rounded, color: cs.error),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '$count challan${count == 1 ? '' : 's'} are overdue',
                      style: tt.bodyMedium?.copyWith(
                          color: cs.onErrorContainer,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text('View'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _RecentUnpaid extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final challansAsync = ref.watch(allChallansProvider('unpaid'));
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final fmt = NumberFormat('#,##0', 'en_PK');

    return challansAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load challans'),
      data: (challans) {
        if (challans.isEmpty) {
          return Container(
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
                color: cs.surfaceContainerHighest.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(12)),
            child: Center(
                child: Text('All fees collected. ✓',
                    style:
                        tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant))),
          );
        }
        return Column(
          children: challans
              .take(5)
              .map((c) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: c.isOverdue
                            ? cs.errorContainer
                            : cs.primaryContainer,
                        child: Icon(Icons.receipt_rounded,
                            color: c.isOverdue ? cs.error : cs.primary,
                            size: 20),
                      ),
                      title: Text(c.month,
                          style: tt.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w600)),
                      subtitle: Text('# ${c.challanNo}', style: tt.bodySmall),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('PKR ${fmt.format(c.balance)}',
                              style: tt.bodySmall?.copyWith(
                                  color: cs.error,
                                  fontWeight: FontWeight.bold)),
                          if (c.isOverdue)
                            Text('OVERDUE',
                                style: TextStyle(
                                    color: cs.error,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ))
              .toList(),
        );
      },
    );
  }
}
