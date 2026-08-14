import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/accountant_providers.dart';
import '../../../core/layout/responsive.dart';

class AccountantDashboard extends ConsumerWidget {
  const AccountantDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final org = ref.watch(orgProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: cs.surfaceContainerLowest,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(accountantDashboardStatsProvider);
          ref.invalidate(overdueCountProvider);
          ref.invalidate(allChallansProvider(null));
          ref.invalidate(accountantUnreadCountProvider);
        },
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              backgroundColor: cs.surface,
              title: Row(
                children: [
                  if (org?.logoUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CachedNetworkImage(
                          imageUrl: org!.logoUrl!,
                          width: 28,
                          height: 28,
                          fit: BoxFit.contain),
                    )
                  else
                    Icon(Icons.school_rounded, color: cs.primary, size: 26),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      org?.name ?? 'EduStack',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.person_rounded),
                  tooltip: 'Profile',
                  onPressed: () => context.push('/profile'),
                ),
                _UnreadBadge(),
                const SizedBox(width: 8),
              ],
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  context.pageGutter,
                  16,
                  context.pageGutter,
                  100,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Welcome ────────────────────────────────
                    _WelcomeBanner(name: user?.name ?? 'Accountant'),

                    const SizedBox(height: 20),

                    // ── Stats row ──────────────────────────────
                    _StatsRow(),

                    const SizedBox(height: 24),

                    // ── Overdue alert ─────────────────────────
                    _OverdueBanner(),

                    // ── Quick actions ─────────────────────────
                    const _SectionHeader(title: 'Quick Actions'),
                    const SizedBox(height: 10),
                    GridView.count(
                      crossAxisCount: context.isCompactPhone ? 2 : 3,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      childAspectRatio: context.isCompactPhone ? 1.8 : 1.35,
                      children: [
                        _ActionCard(
                          icon: Icons.receipt_long_rounded,
                          label: 'All Challans',
                          color: cs.primary,
                          onTap: () => context.go('/accountant/challans'),
                        ),
                        _ActionCard(
                          icon: Icons.bar_chart_rounded,
                          label: 'Monthly Report',
                          color: cs.secondary,
                          onTap: () => context.go('/accountant/reports'),
                        ),
                        _ActionCard(
                          icon: Icons.warning_rounded,
                          label: 'Overdue',
                          color: cs.error,
                          onTap: () => context.go('/accountant/challans'),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Recent unpaid challans ────────────────
                    _SectionHeader(
                        title: 'Recent Unpaid',
                        onSeeAll: () => context.go('/accountant/challans')),
                    const SizedBox(height: 10),
                    _RecentUnpaid(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WelcomeBanner extends StatelessWidget {
  const _WelcomeBanner({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.secondary, cs.primary.withValues(alpha: 0.9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Fee Management',
                    style: TextStyle(
                        color: cs.onSecondary.withValues(alpha: 0.8),
                        fontSize: 13)),
                Text(name,
                    style: TextStyle(
                        color: cs.onSecondary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Accountant',
                    style: TextStyle(
                        color: cs.onSecondary.withValues(alpha: 0.7),
                        fontSize: 12)),
              ],
            ),
          ),
          CircleAvatar(
            radius: 26,
            backgroundColor: cs.onSecondary.withValues(alpha: 0.15),
            child: Icon(Icons.account_balance_wallet_rounded,
                color: cs.onSecondary, size: 28),
          ),
        ],
      ),
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

class _ActionCard extends StatelessWidget {
  const _ActionCard(
      {required this.icon,
      required this.label,
      required this.color,
      required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 10, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
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

class _UnreadBadge extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(accountantUnreadCountProvider);
    return IconButton(
      icon: Badge(
        isLabelVisible:
            count.maybeWhen(data: (c) => c > 0, orElse: () => false),
        label: count.maybeWhen(data: (c) => Text('$c'), orElse: () => null),
        child: const Icon(Icons.notifications_outlined),
      ),
      onPressed: () => context.go('/accountant/notifications'),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onSeeAll});
  final String title;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        if (onSeeAll != null)
          TextButton(
            onPressed: onSeeAll,
            child: Text('See all',
                style: TextStyle(
                    color: cs.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13)),
          ),
      ],
    );
  }
}
