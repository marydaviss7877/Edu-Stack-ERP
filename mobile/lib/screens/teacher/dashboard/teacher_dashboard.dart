import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/teacher_providers.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_design.dart';

class TeacherDashboard extends ConsumerWidget {
  const TeacherDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final photoUrl = user?.photoUrl;
    final org = ref.watch(orgProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;
    final periods = ref.watch(todayPeriodsProvider).valueOrNull ?? const [];

    return Scaffold(
      body: Column(
        children: [
          AppIdentityHeader(
            organization: org?.name ?? 'EduStack',
            name: user?.name ?? 'Teacher',
            subtitle: 'Teacher · ${periods.length} classes today',
            photoUrl: photoUrl,
            notificationCount: unread,
            onProfile: () => context.push('/profile'),
            onNotifications: () => context.go('/teacher/notifications'),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(todayPeriodsProvider);
                ref.invalidate(teacherDashboardStatsProvider);
                ref.invalidate(unreadCountProvider);
              },
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  context.pageGutter,
                  18,
                  context.pageGutter,
                  100,
                ),
                children: [
                  Text("Today's teaching plan",
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(
                    '${periods.length} classes and your open actions at a glance.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  _QuickActions(),
                  const SizedBox(height: 16),
                  _OfflineQueueBanner(),
                  const AppSectionHeader(title: "Today's agenda"),
                  _TodaySchedule(),
                  const AppSectionHeader(title: 'Actions required'),
                  _PendingActions(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Quick Action Tiles ──────────────────────────────────────
class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final items = [
      AppQuickAction(
        icon: Icons.how_to_reg_rounded,
        label: 'Mark attendance',
        color: AppColors.primary,
        onTap: () => context.go('/teacher/attendance'),
      ),
      AppQuickAction(
        icon: Icons.edit_note_rounded,
        label: 'Enter marks',
        color: AppColors.info,
        onTap: () => context.go('/teacher/marks'),
      ),
      AppQuickAction(
        icon: Icons.assignment_rounded,
        label: 'Assignment',
        color: AppColors.achievement,
        onTap: () => context.go('/teacher/assignments'),
      ),
    ];
    final columns = context.isNarrowPhone ? 1 : 3;
    return GridView.count(
      crossAxisCount: columns,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: columns == 1 ? 3.4 : 1.15,
      children: items,
    );
  }
}

// ── Offline Queue Banner ─────────────────────────────────────
class _OfflineQueueBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(offlineQueueCountProvider);
    if (count == 0) return const SizedBox.shrink();

    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        color: cs.errorContainer,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Icon(Icons.cloud_off_rounded, color: cs.error, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '$count attendance record${count == 1 ? '' : 's'} pending sync',
                  style: TextStyle(
                      color: cs.onErrorContainer,
                      fontWeight: FontWeight.w600,
                      fontSize: 13),
                ),
              ),
              Icon(Icons.sync_rounded, color: cs.error, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Today's Schedule ─────────────────────────────────────────
class _TodaySchedule extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final periodsAsync = ref.watch(todayPeriodsProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return periodsAsync.when(
      loading: () => const _Skeleton(),
      error: (_, __) => const _EmptyCard(message: 'Could not load schedule'),
      data: (periods) {
        if (periods.isEmpty) {
          return const _EmptyCard(message: 'No classes scheduled today 🎉');
        }
        return Column(
          children: periods.map((p) {
            final subjectName = p['subjectName'] as String? ?? '';
            final className = p['className'] as String? ?? '';
            final sectionName = p['sectionName'] as String? ?? '';
            final startTime = p['startTime'] as String? ?? '';
            final endTime = p['endTime'] as String? ?? '';
            final periodNo = p['periodNo'] as int? ?? 0;
            final isNow = p['isNow'] as bool? ?? false;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: isNow ? cs.primaryContainer : cs.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isNow
                      ? cs.primary
                      : cs.outlineVariant.withValues(alpha: 0.5),
                  width: isNow ? 1.5 : 1,
                ),
              ),
              child: ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isNow ? cs.primary : cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'P$periodNo',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: isNow ? cs.onPrimary : cs.onSurfaceVariant,
                    ),
                  ),
                ),
                title: Text(subjectName,
                    style:
                        tt.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                subtitle: Text(
                  '$className${sectionName.isNotEmpty ? " · Sec $sectionName" : ""}',
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (isNow)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                            color: cs.primary,
                            borderRadius: BorderRadius.circular(8)),
                        child: Text('NOW',
                            style: TextStyle(
                                color: cs.onPrimary,
                                fontSize: 10,
                                fontWeight: FontWeight.w800)),
                      ),
                    if (startTime.isNotEmpty)
                      Text('$startTime–$endTime',
                          style: tt.labelSmall
                              ?.copyWith(color: cs.onSurfaceVariant)),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

// ── Pending Actions ───────────────────────────────────────────
class _PendingActions extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(teacherDashboardStatsProvider);
    final cs = Theme.of(context).colorScheme;

    return statsAsync.when(
      loading: () => const _Skeleton(),
      error: (_, __) =>
          const _EmptyCard(message: 'Could not load pending actions'),
      data: (stats) {
        final pendingAttendance = stats['pendingAttendance'] as int? ?? 0;
        final pendingMarks = stats['pendingMarks'] as int? ?? 0;
        final activeAssignments = stats['activeAssignments'] as int? ?? 0;

        if (pendingAttendance == 0 &&
            pendingMarks == 0 &&
            activeAssignments == 0) {
          return const _EmptyCard(message: 'All tasks up to date ✓');
        }

        return Column(
          children: [
            if (pendingAttendance > 0)
              _PendingTile(
                icon: Icons.how_to_reg_rounded,
                label:
                    '$pendingAttendance class${pendingAttendance == 1 ? '' : 'es'} without attendance today',
                color: cs.error,
                onTap: () => context.go('/teacher/attendance'),
              ),
            if (pendingMarks > 0)
              _PendingTile(
                icon: Icons.edit_note_rounded,
                label:
                    '$pendingMarks exam${pendingMarks == 1 ? '' : 's'} with missing marks',
                color: cs.tertiary,
                onTap: () => context.go('/teacher/marks'),
              ),
            if (activeAssignments > 0)
              _PendingTile(
                icon: Icons.assignment_rounded,
                label:
                    '$activeAssignments active assignment${activeAssignments == 1 ? '' : 's'}',
                color: cs.secondary,
                onTap: () => context.go('/teacher/assignments'),
              ),
          ],
        );
      },
    );
  }
}

class _PendingTile extends StatelessWidget {
  const _PendingTile(
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
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(label, style: tt.bodyMedium),
        trailing: Icon(Icons.arrow_forward_ios_rounded,
            size: 14, color: cs.onSurfaceVariant),
        onTap: onTap,
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 20),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(message,
          textAlign: TextAlign.center,
          style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
    );
  }
}

class _Skeleton extends StatelessWidget {
  const _Skeleton();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      height: 72,
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}
