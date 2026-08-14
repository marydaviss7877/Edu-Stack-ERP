import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/principal_providers.dart';
import '../../../core/layout/responsive.dart';

class CoordinatorDashboard extends ConsumerWidget {
  const CoordinatorDashboard({super.key});

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
          ref.invalidate(upcomingExamsPrincipalProvider);
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
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            cs.tertiary,
                            cs.primary.withValues(alpha: 0.85)
                          ],
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
                                Text('Coordinator',
                                    style: TextStyle(
                                        color: cs.onTertiary
                                            .withValues(alpha: 0.8),
                                        fontSize: 13)),
                                Text(user?.name ?? 'Coordinator',
                                    style: TextStyle(
                                        color: cs.onTertiary,
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ),
                          Icon(Icons.manage_accounts_rounded,
                              color: cs.onTertiary.withValues(alpha: 0.6),
                              size: 48),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── Quick actions ─────────────────────────
                    Text('Quick Actions',
                        style: tt.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    GridView.count(
                      crossAxisCount: context.isCompactPhone ? 2 : 3,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      childAspectRatio: context.isCompactPhone ? 1.8 : 1.35,
                      children: [
                        _ActionTile(
                            icon: Icons.how_to_reg_rounded,
                            label: 'Attendance Report',
                            color: cs.primary,
                            onTap: () => context.go('/coordinator/attendance')),
                        _ActionTile(
                            icon: Icons.event_note_rounded,
                            label: 'Timetables',
                            color: cs.secondary,
                            onTap: () => context.go('/coordinator/timetable')),
                        _ActionTile(
                            icon: Icons.notifications_rounded,
                            label: 'Alerts',
                            color: cs.error,
                            onTap: () =>
                                context.go('/coordinator/notifications')),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Today's attendance overview ───────────
                    Text("Today's Attendance",
                        style: tt.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    _AttendanceSummary(),

                    const SizedBox(height: 24),

                    // ── Upcoming exams ────────────────────────
                    Text('Upcoming Exams',
                        style: tt.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
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

class _ActionTile extends StatelessWidget {
  const _ActionTile(
      {required this.icon,
      required this.label,
      required this.color,
      required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12)),
          child: Column(
            children: [
              Icon(icon, color: color, size: 22),
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

class _AttendanceSummary extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(todayAttendanceOverviewProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return overviewAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load attendance'),
      data: (d) {
        final present = (d['presentCount'] as int?) ?? 0;
        final total = (d['totalStudents'] as int?) ?? 0;
        final pct = total > 0 ? present / total : 0.0;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('School Attendance', style: tt.titleSmall),
                    Text('${(pct * 100).toStringAsFixed(1)}%',
                        style: tt.titleLarge?.copyWith(
                            color: pct >= 0.75 ? cs.primary : cs.error,
                            fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 10,
                    backgroundColor: cs.surfaceContainerHighest,
                    valueColor: AlwaysStoppedAnimation(
                        pct >= 0.75 ? cs.primary : cs.error),
                  ),
                ),
                const SizedBox(height: 8),
                Text('$present present out of $total students',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
              ],
            ),
          ),
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
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load exams'),
      data: (exams) {
        if (exams.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: cs.surfaceContainerHighest.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(12)),
            child: const Center(child: Text('No upcoming exams')),
          );
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
                  backgroundColor: days != null && days <= 3
                      ? cs.errorContainer
                      : cs.primaryContainer,
                  child: Text('${days ?? '?'}d',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: days != null && days <= 3
                              ? cs.error
                              : cs.primary)),
                ),
                title: Text(name,
                    style:
                        tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                subtitle: dt != null
                    ? Text('${dt.day}/${dt.month}/${dt.year}')
                    : null,
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
