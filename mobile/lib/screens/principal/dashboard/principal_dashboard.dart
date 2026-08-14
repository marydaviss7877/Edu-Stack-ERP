import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/principal_providers.dart';
import '../../../core/layout/responsive.dart';

class PrincipalDashboard extends ConsumerWidget {
  const PrincipalDashboard({super.key});

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
          ref.invalidate(todayAttendanceOverviewProvider);
          ref.invalidate(staffAttendanceTodayProvider);
          ref.invalidate(upcomingExamsPrincipalProvider);
          ref.invalidate(lowAttendanceStudentsProvider);
          ref.invalidate(principalUnreadCountProvider);
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
                    // ── Welcome ──────────────────────────────
                    _WelcomeBanner(name: user?.name ?? 'Principal'),

                    const SizedBox(height: 20),

                    // ── Today's overview cards ────────────────
                    _TodayOverviewCards(),

                    const SizedBox(height: 24),

                    // ── Attendance by class ───────────────────
                    _SectionHeader(
                      title: "Today's Attendance",
                      actionLabel: 'Full Report',
                      onAction: () => context.go('/principal/attendance'),
                    ),
                    const SizedBox(height: 10),
                    _AttendanceByClass(),

                    const SizedBox(height: 24),

                    // ── Low attendance warnings ───────────────
                    const _SectionHeader(
                        title: 'Low Attendance Alerts',
                        actionLabel: null,
                        onAction: null),
                    const SizedBox(height: 10),
                    _LowAttendanceWarnings(),

                    const SizedBox(height: 24),

                    // ── Upcoming exams ───────────────────────
                    const _SectionHeader(
                        title: 'Upcoming Exams',
                        actionLabel: null,
                        onAction: null),
                    const SizedBox(height: 10),
                    _UpcomingExams(),
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
    final now = DateTime.now();
    final greeting = now.hour < 12
        ? 'Good morning'
        : now.hour < 17
            ? 'Good afternoon'
            : 'Good evening';

    return Container(
      padding: const EdgeInsets.all(18),
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
                Text(name,
                    style: TextStyle(
                        color: cs.onPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Principal',
                    style: TextStyle(
                        color: cs.onPrimary.withValues(alpha: 0.7),
                        fontSize: 12)),
              ],
            ),
          ),
          CircleAvatar(
            radius: 26,
            backgroundColor: cs.onPrimary.withValues(alpha: 0.15),
            child: Icon(Icons.manage_accounts_rounded,
                color: cs.onPrimary, size: 28),
          ),
        ],
      ),
    );
  }
}

class _TodayOverviewCards extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overview = ref.watch(todayAttendanceOverviewProvider);
    final staff = ref.watch(staffAttendanceTodayProvider);
    final cs = Theme.of(context).colorScheme;

    return ResponsiveGrid(
      childAspectRatio: context.isNarrowPhone ? 1.65 : 1.8,
      narrowChildAspectRatio: 2.8,
      children: [
        _StatCard(
          icon: Icons.people_rounded,
          label: 'Students Present',
          value: overview.when(
            data: (d) =>
                '${d['presentCount'] ?? '—'} / ${d['totalStudents'] ?? '—'}',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: cs.primary,
        ),
        _StatCard(
          icon: Icons.work_rounded,
          label: 'Staff Present',
          value: staff.when(
            data: (d) => '${d['present'] ?? '—'} / ${d['total'] ?? '—'}',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: cs.secondary,
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});
  final IconData icon;
  final String label;
  final String value;
  final Color color;

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
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(value,
                style: tt.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800, color: color)),
            Text(label,
                style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _AttendanceByClass extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classesAsync = ref.watch(attendanceByClassProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return classesAsync.when(
      loading: () => const _Skeleton(),
      error: (_, __) =>
          const _EmptyCard(message: 'Could not load class attendance'),
      data: (classes) {
        if (classes.isEmpty) {
          return const _EmptyCard(message: 'No attendance data yet');
        }
        return Column(
          children: classes.take(6).map((c) {
            final name = c['className'] as String? ?? '';
            final section = c['sectionName'] as String? ?? '';
            final present = (c['presentCount'] as int?) ?? 0;
            final total = (c['totalStudents'] as int?) ?? 0;
            final pct = total > 0 ? present / total : 0.0;
            final low = pct < 0.75;

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  SizedBox(
                    width: 80,
                    child: Text(
                      '$name${section.isNotEmpty ? " $section" : ""}',
                      style:
                          tt.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct,
                        minHeight: 8,
                        backgroundColor: cs.surfaceContainerHighest,
                        valueColor:
                            AlwaysStoppedAnimation(low ? cs.error : cs.primary),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${(pct * 100).toStringAsFixed(0)}%',
                    style: tt.bodySmall?.copyWith(
                      color: low ? cs.error : cs.onSurface,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class _LowAttendanceWarnings extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(lowAttendanceStudentsProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return studentsAsync.when(
      loading: () => const _Skeleton(),
      error: (_, __) => const _EmptyCard(message: 'Could not load data'),
      data: (students) {
        if (students.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: cs.primaryContainer.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.check_circle_rounded, color: cs.primary),
                const SizedBox(width: 10),
                Text('All students above 75% attendance', style: tt.bodyMedium),
              ],
            ),
          );
        }
        return Column(
          children: students.take(5).map((s) {
            final name = (s['profile']?['name'] as String?) ?? 'Unknown';
            final cls = s['className'] as String? ?? '';
            final pct = (s['attendancePercentage'] as num?)?.toDouble() ?? 0;
            return Card(
              color: cs.errorContainer.withValues(alpha: 0.4),
              margin: const EdgeInsets.only(bottom: 6),
              child: ListTile(
                dense: true,
                leading: Icon(Icons.warning_rounded, color: cs.error, size: 20),
                title: Text(name,
                    style:
                        tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                subtitle: Text(cls, style: tt.bodySmall),
                trailing: Text(
                  '${pct.toStringAsFixed(0)}%',
                  style: tt.bodyMedium
                      ?.copyWith(color: cs.error, fontWeight: FontWeight.bold),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class _UpcomingExams extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final examsAsync = ref.watch(upcomingExamsPrincipalProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return examsAsync.when(
      loading: () => const _Skeleton(),
      error: (_, __) => const _EmptyCard(message: 'Could not load exams'),
      data: (exams) {
        if (exams.isEmpty) {
          return const _EmptyCard(message: 'No upcoming exams');
        }
        return Column(
          children: exams.map((e) {
            final name = e['name'] as String? ?? '';
            final date = e['startDate'] as String?;
            final dt = date != null ? DateTime.tryParse(date) : null;
            final days = dt?.difference(DateTime.now()).inDays;
            return Card(
              margin: const EdgeInsets.only(bottom: 6),
              child: ListTile(
                leading: CircleAvatar(
                  radius: 18,
                  backgroundColor: (days != null && days <= 3)
                      ? cs.errorContainer
                      : cs.primaryContainer,
                  child: Text(
                    days != null ? '${days}d' : '?',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color:
                          (days != null && days <= 3) ? cs.error : cs.primary,
                    ),
                  ),
                ),
                title: Text(name,
                    style:
                        tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                subtitle: dt != null
                    ? Text('${dt.day}/${dt.month}/${dt.year}',
                        style: tt.bodySmall)
                    : null,
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class _UnreadBadge extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(principalUnreadCountProvider);
    return IconButton(
      icon: Badge(
        isLabelVisible:
            count.maybeWhen(data: (c) => c > 0, orElse: () => false),
        label: count.maybeWhen(data: (c) => Text('$c'), orElse: () => null),
        child: const Icon(Icons.notifications_outlined),
      ),
      onPressed: () => context.go('/principal/notifications'),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(
      {required this.title, required this.actionLabel, required this.onAction});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

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
        if (actionLabel != null && onAction != null)
          TextButton(
            onPressed: onAction,
            child: Text(actionLabel!,
                style: TextStyle(
                    fontSize: 13,
                    color: cs.primary,
                    fontWeight: FontWeight.w600)),
          ),
      ],
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
      padding: const EdgeInsets.symmetric(vertical: 18),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
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
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}
