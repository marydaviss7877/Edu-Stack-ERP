import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/teacher_providers.dart';
import '../../../core/layout/responsive.dart';

class TeacherDashboard extends ConsumerWidget {
  const TeacherDashboard({super.key});

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
          ref.invalidate(todayPeriodsProvider);
          ref.invalidate(teacherDashboardStatsProvider);
          ref.invalidate(unreadCountProvider);
        },
        child: CustomScrollView(
          slivers: [
            // ── App Bar ─────────────────────────────────────
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
                    // ── Welcome ──────────────────────────────
                    _WelcomeBanner(name: user?.name ?? 'Teacher'),

                    const SizedBox(height: 20),

                    // ── Quick action tiles ───────────────────
                    _QuickActions(),

                    const SizedBox(height: 24),

                    // ── Offline queue warning ─────────────────
                    _OfflineQueueBanner(),

                    // ── Today's schedule ──────────────────────
                    const _SectionHeader(title: "Today's Classes"),
                    const SizedBox(height: 10),
                    _TodaySchedule(),

                    const SizedBox(height: 24),

                    // ── Pending items ─────────────────────────
                    const _SectionHeader(title: 'Pending Actions'),
                    const SizedBox(height: 10),
                    _PendingActions(),
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

// ── Welcome Banner ──────────────────────────────────────────
class _WelcomeBanner extends StatelessWidget {
  const _WelcomeBanner({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final now = DateTime.now();
    final greeting = now.hour < 12
        ? 'Good morning'
        : now.hour < 17
            ? 'Good afternoon'
            : 'Good evening';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.primary, cs.secondary.withValues(alpha: 0.9)],
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
                Text('$greeting,',
                    style: TextStyle(
                        color: cs.onPrimary.withValues(alpha: 0.8),
                        fontSize: 13)),
                const SizedBox(height: 2),
                Text(name,
                    style: TextStyle(
                        color: cs.onPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.calendar_today_rounded,
                        size: 14, color: cs.onPrimary.withValues(alpha: 0.7)),
                    const SizedBox(width: 4),
                    Text(
                      _dayLabel(now),
                      style: TextStyle(
                          color: cs.onPrimary.withValues(alpha: 0.7),
                          fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          CircleAvatar(
            radius: 26,
            backgroundColor: cs.onPrimary.withValues(alpha: 0.15),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'T',
              style: TextStyle(
                  color: cs.onPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  String _dayLabel(DateTime dt) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    const months = [
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
    return '${days[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
  }
}

// ── Quick Action Tiles ──────────────────────────────────────
class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final items = [
      _ActionTile(
        icon: Icons.how_to_reg_rounded,
        label: 'Mark\nAttendance',
        color: cs.primary,
        onTap: () => context.go('/teacher/attendance'),
      ),
      _ActionTile(
        icon: Icons.edit_note_rounded,
        label: 'Enter\nMarks',
        color: cs.secondary,
        onTap: () => context.go('/teacher/marks'),
      ),
      _ActionTile(
        icon: Icons.assignment_rounded,
        label: 'My\nAssignments',
        color: cs.tertiary,
        onTap: () => context.go('/teacher/assignments'),
      ),
      _ActionTile(
        icon: Icons.notifications_rounded,
        label: 'Alerts',
        color: cs.error,
        onTap: () => context.go('/teacher/notifications'),
      ),
    ];
    final columns = context.isCompactPhone ? 2 : 4;
    return GridView.count(
      crossAxisCount: columns,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: columns == 2 ? 1.8 : 0.95,
      children: items,
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 10, fontWeight: FontWeight.w600, color: color),
            ),
          ],
        ),
      ),
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

// ── Unread Badge ──────────────────────────────────────────────
class _UnreadBadge extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(unreadCountProvider);
    return IconButton(
      icon: Badge(
        isLabelVisible:
            count.maybeWhen(data: (c) => c > 0, orElse: () => false),
        label: count.maybeWhen(data: (c) => Text('$c'), orElse: () => null),
        child: const Icon(Icons.notifications_outlined),
      ),
      onPressed: () => context.go('/teacher/notifications'),
    );
  }
}

// ── Shared helpers ─────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) => Text(
        title,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      );
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
