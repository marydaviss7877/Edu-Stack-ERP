import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/principal_providers.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_design.dart';

class CoordinatorDashboard extends ConsumerWidget {
  const CoordinatorDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final photoUrl = user?.photoUrl;
    final org = ref.watch(orgProvider);

    return Scaffold(
      body: Column(
        children: [
          AppIdentityHeader(
            organization: org?.name ?? 'EduStack',
            name: user?.name ?? 'Coordinator',
            subtitle: 'Academic Coordinator',
            photoUrl: photoUrl,
            onProfile: () => context.push('/profile'),
            onNotifications: () => context.go('/coordinator/notifications'),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(todayAttendanceOverviewProvider);
                ref.invalidate(upcomingExamsPrincipalProvider);
              },
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                    context.pageGutter, 18, context.pageGutter, 100),
                children: [
                  Text('Academic operations',
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(
                      'Timetables, attendance, and exam readiness at a glance.',
                      style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 3,
                    crossAxisSpacing: 8,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.05,
                    children: [
                      AppQuickAction(
                          icon: Icons.analytics_rounded,
                          label: 'Attendance',
                          onTap: () => context.go('/coordinator/attendance')),
                      AppQuickAction(
                          icon: Icons.calendar_month_rounded,
                          label: 'Timetable',
                          color: AppColors.info,
                          onTap: () => context.go('/coordinator/timetable')),
                      AppQuickAction(
                          icon: Icons.campaign_rounded,
                          label: 'Alerts',
                          color: AppColors.error,
                          onTap: () =>
                              context.go('/coordinator/notifications')),
                    ],
                  ),
                  const AppSectionHeader(title: "Today's attendance"),
                  _AttendanceSummary(),
                  const AppSectionHeader(title: 'Upcoming exams'),
                  _UpcomingExams(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
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
