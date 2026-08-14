import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/admin_providers.dart';
import '../../../core/layout/responsive.dart';
import '../../../providers/inventory_providers.dart';
import '../../shared/inventory/financial_overview_card.dart';
import '../../../core/theme/app_design.dart';

class AdminDashboard extends ConsumerWidget {
  final bool isSuperAdmin;
  const AdminDashboard({super.key, this.isSuperAdmin = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final photoUrl = user?.photoUrl;
    final org = ref.watch(orgProvider);
    final base = isSuperAdmin ? '/admin' : '/group';

    return Scaffold(
      body: Column(
        children: [
          AppIdentityHeader(
            organization:
                isSuperAdmin ? 'EduStack Platform' : org?.name ?? 'EduStack',
            name: user?.name ?? 'Admin',
            subtitle: isSuperAdmin
                ? 'Super Admin · Administration'
                : 'Administration',
            photoUrl: photoUrl,
            onProfile: () => context.push('/profile'),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(orgStatsProvider);
                ref.invalidate(branchesProvider);
                ref.invalidate(financeSummaryProvider);
                ref.invalidate(inventoryDashboardProvider);
                if (isSuperAdmin) ref.invalidate(allOrgsProvider);
              },
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                    context.pageGutter, 18, context.pageGutter, 100),
                children: [
                  Text('Administration panel',
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text('Organizations, users, and system configuration.',
                      style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 16),
                  _QuickActions(base: base),
                  const SizedBox(height: 16),
                  _OrgStatsCards(),
                  if (!isSuperAdmin) ...[
                    const AppSectionHeader(title: 'Financial position'),
                    const _GroupFinancialOverview(),
                    const AppSectionHeader(title: 'Branches'),
                    _BranchList(),
                  ],
                  if (isSuperAdmin) ...[
                    const AppSectionHeader(title: 'Organizations'),
                    _OrgList(),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrgStatsCards extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(orgStatsProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return stats.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
      data: (d) {
        final items = [
          (
            label: 'Students',
            value: '${d['totalStudents'] ?? 0}',
            color: cs.primary,
            icon: Icons.people_rounded
          ),
          (
            label: 'Teachers',
            value: '${d['totalTeachers'] ?? 0}',
            color: cs.secondary,
            icon: Icons.school_rounded
          ),
          (
            label: 'Classes',
            value: '${d['totalClasses'] ?? 0}',
            color: cs.tertiary,
            icon: Icons.class_rounded
          ),
          (
            label: 'Branches',
            value: '${d['totalBranches'] ?? 0}',
            color: cs.error,
            icon: Icons.business_rounded
          ),
        ];
        return ResponsiveGrid(
          childAspectRatio: context.isNarrowPhone ? 1.3 : 1.5,
          children: items
              .map((item) => Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(item.icon, color: item.color, size: 20),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.value,
                                  style: tt.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: item.color),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                              Text(item.label,
                                  style: tt.bodySmall
                                      ?.copyWith(color: cs.onSurfaceVariant),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                            ],
                          ),
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

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.base});
  final String base;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final items = [
      (
        icon: Icons.person_add_rounded,
        label: 'Manage Users',
        color: cs.primary,
        path: '$base/users'
      ),
      (
        icon: Icons.qr_code_2_rounded,
        label: 'Generate QR',
        color: cs.secondary,
        path: '$base/qr'
      ),
      (
        icon: Icons.inventory_2_rounded,
        label: 'Finance & Operations',
        color: AppColors.info,
        path: '$base/inventory'
      ),
      (
        icon: Icons.settings_rounded,
        label: 'Settings',
        color: cs.tertiary,
        path: '$base/settings'
      ),
    ];
    final columns = context.isCompactPhone ? 2 : 3;
    return GridView.count(
      crossAxisCount: columns,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: columns == 2 ? 1.8 : 1.45,
      children: items
          .map((item) => InkWell(
                onTap: () => context.go(item.path),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Icon(item.icon, color: item.color, size: 24),
                      const SizedBox(height: 6),
                      Text(item.label,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 10,
                              color: item.color,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ))
          .toList(),
    );
  }
}

class _GroupFinancialOverview extends ConsumerWidget {
  const _GroupFinancialOverview();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final finance = ref.watch(financeSummaryProvider);
    final inventory = ref.watch(inventoryDashboardProvider);
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Group financial control',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        finance.when(
          loading: () => const LinearProgressIndicator(),
          error: (_, __) => const Card(
              child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Financial data is unavailable'))),
          data: (data) => FinancialOverviewCard(data: data, showBranches: true),
        ),
        const SizedBox(height: 8),
        inventory.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) => const SizedBox.shrink(),
          data: (data) => Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(
                  avatar: Icon(Icons.inventory_2_rounded,
                      size: 18, color: cs.primary),
                  label: Text('${data['fixedAssets'] ?? 0} fixed assets')),
              Chip(
                  avatar: Icon(Icons.warning_amber_rounded,
                      size: 18, color: cs.error),
                  label: Text('${data['lowStock'] ?? 0} low-stock items')),
              Chip(
                  avatar: Icon(Icons.approval_rounded,
                      size: 18, color: cs.secondary),
                  label: Text(
                      '${(data['pendingExpenses'] ?? 0) + (data['pendingProcurements'] ?? 0)} approvals')),
            ],
          ),
        ),
      ],
    );
  }
}

class _BranchList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final branchesAsync = ref.watch(branchesProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return branchesAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load branches'),
      data: (branches) {
        if (branches.isEmpty) return const Text('No branches configured');
        return Column(
          children: branches
              .map((b) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: cs.primaryContainer,
                        child: Text(
                            (b['name'] as String? ?? '?')[0].toUpperCase(),
                            style: TextStyle(
                                color: cs.onPrimaryContainer,
                                fontWeight: FontWeight.bold)),
                      ),
                      title: Text(b['name'] as String? ?? '',
                          style: tt.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w600)),
                      subtitle: Text(b['address'] as String? ?? '',
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      trailing: Icon(Icons.arrow_forward_ios_rounded,
                          size: 14, color: cs.onSurfaceVariant),
                    ),
                  ))
              .toList(),
        );
      },
    );
  }
}

class _OrgList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orgsAsync = ref.watch(allOrgsProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return orgsAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load organizations'),
      data: (orgs) {
        if (orgs.isEmpty) return const Text('No organizations found');
        return Column(
          children: orgs
              .map((o) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: cs.primaryContainer,
                        child: Text(
                            (o['name'] as String? ?? '?')[0].toUpperCase(),
                            style: TextStyle(
                                color: cs.onPrimaryContainer,
                                fontWeight: FontWeight.bold)),
                      ),
                      title: Text(o['name'] as String? ?? '',
                          style: tt.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w600)),
                      subtitle: Text('/${o['slug'] as String? ?? ''}',
                          style: tt.bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant)),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (o['status'] == 'active'
                              ? cs.primaryContainer
                              : cs.errorContainer),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          o['status'] as String? ?? '',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: o['status'] == 'active'
                                ? cs.onPrimaryContainer
                                : cs.onErrorContainer,
                          ),
                        ),
                      ),
                    ),
                  ))
              .toList(),
        );
      },
    );
  }
}
