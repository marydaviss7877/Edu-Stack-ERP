import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/student_providers.dart';
import '../../../models/timetable.dart';
import '../../../core/layout/responsive.dart';

class StudentDashboard extends ConsumerWidget {
  const StudentDashboard({super.key});

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
          ref.invalidate(studentProfileProvider);
          ref.invalidate(todayTimetableProvider);
          ref.invalidate(latestResultProvider);
          ref.invalidate(myChallansProvider);
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
                    // ── Welcome banner ──────────────────────
                    _WelcomeBanner(userName: user?.name ?? ''),

                    const SizedBox(height: 20),

                    // ── Stat cards ──────────────────────────
                    _StatCards(),

                    const SizedBox(height: 24),

                    // ── Today's timetable ───────────────────
                    _SectionHeader(
                        title: 'dashboard.todaySchedule'.tr(),
                        onSeeAll: () => context.go('/student/timetable')),
                    const SizedBox(height: 10),
                    _TodayTimetable(),

                    const SizedBox(height: 24),

                    // ── Upcoming exams ──────────────────────
                    _SectionHeader(
                        title: 'dashboard.nextExam'.tr(),
                        onSeeAll: () => context.go('/student/results')),
                    const SizedBox(height: 10),
                    _UpcomingExams(),

                    const SizedBox(height: 24),

                    // ── Pending assignments ─────────────────
                    _SectionHeader(
                        title: 'nav.assignments'.tr(),
                        onSeeAll: () => context.go('/student/assignments')),
                    const SizedBox(height: 10),
                    _PendingAssignments(),
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

// ── Welcome Banner ─────────────────────────────────────────
class _WelcomeBanner extends ConsumerWidget {
  final String userName;
  const _WelcomeBanner({required this.userName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final profile = ref.watch(studentProfileProvider);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.primary, cs.primary.withValues(alpha: 0.8)],
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
                Text('${'dashboard.welcome'.tr()},',
                    style: TextStyle(
                        color: cs.onPrimary.withValues(alpha: 0.8),
                        fontSize: 13)),
                const SizedBox(height: 2),
                Text(
                  profile.when(
                    data: (p) => p.name.isNotEmpty ? p.name : userName,
                    loading: () => userName,
                    error: (_, __) => userName,
                  ),
                  style: TextStyle(
                      color: cs.onPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                profile.when(
                  data: (p) {
                    final cls = p.className ?? '';
                    final sec = p.sectionName ?? '';
                    final roll = p.rollNo ?? '';
                    final label = [
                      if (cls.isNotEmpty) cls,
                      if (sec.isNotEmpty) 'Sec $sec',
                      if (roll.isNotEmpty) 'Roll #$roll',
                    ].join(' · ');
                    return Text(
                      label,
                      style: TextStyle(
                          color: cs.onPrimary.withValues(alpha: 0.75),
                          fontSize: 12),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),
          CircleAvatar(
            radius: 28,
            backgroundColor: cs.onPrimary.withValues(alpha: 0.15),
            child: profile.when(
              data: (p) {
                return p.photoUrl != null
                    ? ClipOval(
                        child: CachedNetworkImage(
                            imageUrl: p.photoUrl!,
                            width: 56,
                            height: 56,
                            fit: BoxFit.cover))
                    : Text(
                        p.name.isNotEmpty ? p.name[0].toUpperCase() : '?',
                        style: TextStyle(
                            color: cs.onPrimary,
                            fontSize: 22,
                            fontWeight: FontWeight.w700),
                      );
              },
              loading: () =>
                  Icon(Icons.person_rounded, color: cs.onPrimary, size: 28),
              error: (_, __) =>
                  Icon(Icons.person_rounded, color: cs.onPrimary, size: 28),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Stat Cards ─────────────────────────────────────────────
class _StatCards extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendance = ref.watch(myAttendanceSummaryProvider);
    final result = ref.watch(latestResultProvider);
    final challans = ref.watch(myChallansProvider);
    final exams = ref.watch(upcomingExamsProvider);

    return ResponsiveGrid(
      childAspectRatio: context.isNarrowPhone ? 1.25 : 1.4,
      children: [
        _StatCard(
          icon: Icons.check_circle_outline_rounded,
          label: 'dashboard.attendance'.tr(),
          value: attendance.when(
            data: (v) => '${v.percentage.toStringAsFixed(0)}%',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: attendance.maybeWhen(
            data: (v) => v.percentage >= 75 ? Colors.green : Colors.red,
            orElse: () => Colors.grey,
          ),
        ),
        _StatCard(
          icon: Icons.grade_rounded,
          label: 'dashboard.lastGrade'.tr(),
          value: result.when(
            data: (r) => r?.grade ?? '—',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: result.maybeWhen(
            data: (r) => r != null
                ? (r.isPassed ? Colors.green : Colors.red)
                : Colors.grey,
            orElse: () => Colors.grey,
          ),
        ),
        _StatCard(
          icon: Icons.account_balance_wallet_rounded,
          label: 'dashboard.feeDue'.tr(),
          value: challans.when(
            data: (list) {
              final due = list
                  .where((c) => !c.isPaid)
                  .fold(0.0, (s, c) => s + c.balance);
              return due > 0 ? 'Rs ${due.toStringAsFixed(0)}' : 'Clear';
            },
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: challans.maybeWhen(
            data: (list) =>
                list.any((c) => !c.isPaid) ? Colors.orange : Colors.green,
            orElse: () => Colors.grey,
          ),
        ),
        _StatCard(
          icon: Icons.event_rounded,
          label: 'dashboard.nextExam'.tr(),
          value: exams.when(
            data: (list) {
              if (list.isEmpty) return 'None';
              final days =
                  list.first.startDate.difference(DateTime.now()).inDays;
              return days <= 0 ? 'Today!' : '${days}d left';
            },
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: exams.maybeWhen(
            data: (list) {
              if (list.isEmpty) return Colors.grey;
              final days =
                  list.first.startDate.difference(DateTime.now()).inDays;
              return days <= 3
                  ? Colors.red
                  : days <= 7
                      ? Colors.orange
                      : Colors.blue;
            },
            orElse: () => Colors.grey,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatCard(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 22),
                Container(
                  width: 8,
                  height: 8,
                  decoration:
                      BoxDecoration(color: color, shape: BoxShape.circle),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: cs.onSurface),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                Text(label,
                    style: TextStyle(
                        fontSize: 11,
                        color: cs.onSurfaceVariant,
                        fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Today's Timetable ──────────────────────────────────────
class _TodayTimetable extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = ref.watch(todayTimetableProvider);

    return today.when(
      loading: () => const _SkeletonCard(),
      error: (e, _) => const _EmptyCard(message: 'Could not load timetable'),
      data: (slots) {
        if (slots.isEmpty) {
          return _EmptyCard(message: 'dashboard.noClassToday'.tr());
        }
        return Column(
          children: slots.map((slot) => _PeriodTile(slot: slot)).toList(),
        );
      },
    );
  }
}

class _PeriodTile extends StatelessWidget {
  final TodaySlot slot;
  const _PeriodTile({required this.slot});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isNow = slot.isNow;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isNow ? cs.primaryContainer : cs.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isNow ? cs.primary : cs.outlineVariant.withValues(alpha: 0.5),
          width: isNow ? 1.5 : 1,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isNow ? cs.primary : cs.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              'P${slot.periodNo}',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12,
                color: isNow ? cs.onPrimary : cs.onSurfaceVariant,
              ),
            ),
          ),
        ),
        title: Text(slot.subjectName,
            style: TextStyle(
                fontWeight: FontWeight.w700,
                color: cs.onSurface,
                fontSize: 14)),
        subtitle: Text(slot.teacherName,
            style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (isNow)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: cs.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('NOW',
                    style: TextStyle(
                        color: cs.onPrimary,
                        fontSize: 10,
                        fontWeight: FontWeight.w800)),
              ),
            if (slot.startTime.isNotEmpty)
              Text(slot.startTime,
                  style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

// ── Upcoming Exams ─────────────────────────────────────────
class _UpcomingExams extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final exams = ref.watch(upcomingExamsProvider);
    return exams.when(
      loading: () => const _SkeletonCard(),
      error: (_, __) => const _EmptyCard(message: 'Could not load exams'),
      data: (list) {
        if (list.isEmpty) return const _EmptyCard(message: 'No upcoming exams');
        return Column(
          children: list.take(3).map((e) {
            final days = e.startDate.difference(DateTime.now()).inDays;
            final urgent = days <= 3;
            final cs = Theme.of(context).colorScheme;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: urgent
                        ? Colors.red.withValues(alpha: 0.1)
                        : cs.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.assignment_rounded,
                      color: urgent ? Colors.red : cs.primary, size: 22),
                ),
                title: Text(e.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13)),
                subtitle: Text(
                  '${e.startDate.day}/${e.startDate.month}/${e.startDate.year}',
                  style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12),
                ),
                trailing: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: urgent
                        ? Colors.red.withValues(alpha: 0.1)
                        : cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    days <= 0 ? 'Today!' : '${days}d',
                    style: TextStyle(
                      color: urgent ? Colors.red : cs.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

// ── Pending Assignments ────────────────────────────────────
class _PendingAssignments extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignments = ref.watch(pendingAssignmentsProvider);
    return assignments.when(
      loading: () => const _SkeletonCard(),
      error: (_, __) => const _EmptyCard(message: 'Could not load assignments'),
      data: (list) {
        if (list.isEmpty) {
          return const _EmptyCard(message: 'No pending assignments ✓');
        }
        final cs = Theme.of(context).colorScheme;
        return Column(
          children: list.take(4).map((a) {
            final overdue = a.isOverdue;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: overdue
                        ? Colors.red.withValues(alpha: 0.1)
                        : cs.tertiaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.task_alt_rounded,
                    color: overdue ? Colors.red : cs.tertiary,
                    size: 20,
                  ),
                ),
                title: Text(a.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                subtitle: Text(a.subjectName,
                    style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12)),
                trailing: Text(
                  overdue
                      ? 'Overdue'
                      : 'Due ${a.dueDate.day}/${a.dueDate.month}',
                  style: TextStyle(
                    color: overdue ? Colors.red : cs.onSurfaceVariant,
                    fontWeight: overdue ? FontWeight.w700 : FontWeight.normal,
                    fontSize: 11,
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

// ── Unread notification badge ──────────────────────────────
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
      onPressed: () => context.go('/student/notifications'),
    );
  }
}

// ── Shared helpers ─────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback onSeeAll;
  const _SectionHeader({required this.title, required this.onSeeAll});

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
        const SizedBox(width: 8),
        TextButton(
          onPressed: onSeeAll,
          child: Text(
            'See all',
            style: TextStyle(
                fontSize: 13, color: cs.primary, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;
  const _EmptyCard({required this.message});

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

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

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
