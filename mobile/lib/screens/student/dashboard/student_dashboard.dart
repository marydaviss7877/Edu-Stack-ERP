import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/student_providers.dart';
import '../../../models/timetable.dart';
import '../../../models/student_progress.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_design.dart';

class StudentDashboard extends ConsumerWidget {
  const StudentDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final photoUrl = user?.photoUrl;
    final org = ref.watch(orgProvider);
    final profile = ref.watch(studentProfileProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;
    final studentName = profile.valueOrNull?.name.isNotEmpty == true
        ? profile.valueOrNull!.name
        : user?.name ?? 'Student';
    final studentSubtitle = profile.maybeWhen(
      data: (p) => [
        if ((p.className ?? '').isNotEmpty) p.className!,
        if ((p.sectionName ?? '').isNotEmpty) 'Section ${p.sectionName}',
      ].join(' · '),
      orElse: () => 'Student',
    );

    return Scaffold(
      body: Column(
        children: [
          AppIdentityHeader(
            organization: org?.name ?? 'EduStack',
            name: studentName,
            subtitle: studentSubtitle.isEmpty ? 'Student' : studentSubtitle,
            photoUrl: profile.valueOrNull?.photoUrl ?? photoUrl,
            notificationCount: unread,
            onProfile: () => context.push('/profile'),
            onNotifications: () => context.go('/student/notifications'),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(studentProfileProvider);
                ref.invalidate(todayTimetableProvider);
                ref.invalidate(latestResultProvider);
                ref.invalidate(myChallansProvider);
                ref.invalidate(unreadCountProvider);
                ref.invalidate(myProgressProvider);
              },
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  context.pageGutter,
                  18,
                  context.pageGutter,
                  100,
                ),
                children: [
                  Text('Today at a glance',
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text('Here is what needs your attention today.',
                      style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 16),
                  const _FeePriorityAlert(),
                  AppSectionHeader(
                    title: 'Next class',
                    actionLabel: 'Full timetable',
                    onAction: () => context.go('/student/timetable'),
                  ),
                  _TodayTimetable(),
                  const SizedBox(height: 12),
                  _StatCards(),
                  AppSectionHeader(
                    title: 'Upcoming deadlines',
                    actionLabel: 'Assignments',
                    onAction: () => context.go('/student/assignments'),
                  ),
                  _PendingAssignments(),
                  AppSectionHeader(
                    title: 'Upcoming exams',
                    actionLabel: 'Results',
                    onAction: () => context.go('/student/results'),
                  ),
                  _UpcomingExams(),
                  const AppSectionHeader(title: 'Learning coverage'),
                  const _LearningCoverageSection(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeePriorityAlert extends ConsumerWidget {
  const _FeePriorityAlert();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final challans = ref.watch(myChallansProvider);
    final unpaid = challans.valueOrNull
        ?.where((challan) => !challan.isPaid)
        .toList()
      ?..sort((a, b) => a.dueDate.compareTo(b.dueDate));
    if (challans.isLoading) return const _SkeletonCard();
    if (unpaid == null || unpaid.isEmpty) return const SizedBox.shrink();
    final first = unpaid.first;
    final total = unpaid.fold<double>(0, (sum, item) => sum + item.balance);
    final days = first.dueDate.difference(DateTime.now()).inDays;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: .07),
        border: Border.all(color: AppColors.error.withValues(alpha: .25)),
        borderRadius: BorderRadius.circular(AppRadius.medium),
      ),
      child: Row(
        children: [
          const Icon(Icons.account_balance_wallet_rounded,
              color: AppColors.error),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PKR ${total.toStringAsFixed(0)} is due${days >= 0 ? ' in $days days' : ''}',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 2),
                Text('${first.month} fee challan · ${first.challanNo}',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => context.go('/student/fees'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
              minimumSize: const Size(44, 38),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            child: const Text('View fee'),
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

    return ResponsiveGrid(
      childAspectRatio: context.isNarrowPhone ? 1.25 : 1.4,
      children: [
        _StatCard(
          icon: Icons.check_circle_outline_rounded,
          label: 'Attendance',
          value: attendance.when(
            data: (v) => '${v.percentage.toStringAsFixed(0)}%',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: attendance.maybeWhen(
            data: (v) =>
                v.percentage >= 75 ? AppColors.success : AppColors.error,
            orElse: () => Colors.grey,
          ),
        ),
        _StatCard(
          icon: Icons.grade_rounded,
          label: 'Last grade',
          value: result.when(
            data: (r) => r?.grade ?? '—',
            loading: () => '—',
            error: (_, __) => '—',
          ),
          color: result.maybeWhen(
            data: (r) => r != null
                ? (r.isPassed ? AppColors.success : AppColors.error)
                : Colors.grey,
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
          return const _EmptyCard(message: 'No classes scheduled today.');
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
                        ? AppColors.error.withValues(alpha: 0.1)
                        : cs.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.assignment_rounded,
                      color: urgent ? AppColors.error : cs.primary, size: 22),
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
                        ? AppColors.error.withValues(alpha: 0.1)
                        : cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    days <= 0 ? 'Today!' : '${days}d',
                    style: TextStyle(
                      color: urgent ? AppColors.error : cs.onSurfaceVariant,
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
                        ? AppColors.error.withValues(alpha: 0.1)
                        : cs.tertiaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.task_alt_rounded,
                    color: overdue ? AppColors.error : cs.tertiary,
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
                    color: overdue ? AppColors.error : cs.onSurfaceVariant,
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

// ── Learning Coverage (weekly topics + weak-topic tracking) ───────────
class _LearningCoverageSection extends ConsumerStatefulWidget {
  const _LearningCoverageSection();

  @override
  ConsumerState<_LearningCoverageSection> createState() =>
      _LearningCoverageSectionState();
}

class _LearningCoverageSectionState
    extends ConsumerState<_LearningCoverageSection> {
  String? _selectedSubjectId;

  @override
  Widget build(BuildContext context) {
    final progress = ref.watch(myProgressProvider);

    return progress.when(
      loading: () => const _SkeletonCard(),
      error: (_, __) =>
          const _EmptyCard(message: 'Could not load learning progress'),
      data: (data) {
        if (data.subjects.isEmpty && data.weekly.isEmpty) {
          return const _EmptyCard(
              message: 'No weekly topic tests recorded yet');
        }
        final weekly = _selectedSubjectId == null
            ? data.weekly
            : data.weekly
                .where((w) => w.subjectId == _selectedSubjectId)
                .toList();
        final weakTopics = weekly
            .where((w) => w.isWeak && !w.isAbsent)
            .toList()
          ..sort((a, b) => a.percentage.compareTo(b.percentage));

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SyllabusMasteryCard(
              subjects: data.subjects,
              overallPct: data.overallMasteryPct,
              overallTotal: data.overallTotalTopics,
            ),
            const SizedBox(height: 12),
            _WeeklyTopicsCard(
              weekly: weekly,
              subjects: data.subjects,
              selectedSubjectId: _selectedSubjectId,
              onSubjectChanged: (v) => setState(() => _selectedSubjectId = v),
            ),
            const SizedBox(height: 12),
            _WeakTopicsCard(weakTopics: weakTopics.take(8).toList()),
          ],
        );
      },
    );
  }
}

Color _masteryColor(double pct) {
  if (pct >= 80) return AppColors.success;
  if (pct >= 50) return AppColors.warning;
  return AppColors.error;
}

class _SyllabusMasteryCard extends StatelessWidget {
  final List<SubjectMastery> subjects;
  final double overallPct;
  final int overallTotal;
  const _SyllabusMasteryCard({
    required this.subjects,
    required this.overallPct,
    required this.overallTotal,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (subjects.isEmpty) {
      return const _EmptyCard(message: 'No weekly topic tests recorded yet');
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Syllabus mastery',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: cs.onSurface)),
                if (overallTotal > 0)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _masteryColor(overallPct).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${overallPct.toStringAsFixed(0)}% overall',
                        style: TextStyle(
                            color: _masteryColor(overallPct),
                            fontWeight: FontWeight.w700,
                            fontSize: 11)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            ...subjects.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(s.subjectName,
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: cs.onSurface),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          ),
                          Text('${s.topicsMastered}/${s.totalTopics} topics',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: cs.onSurfaceVariant,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (s.masteryPct / 100).clamp(0, 1),
                          minHeight: 6,
                          backgroundColor: cs.surfaceContainerHighest,
                          valueColor:
                              AlwaysStoppedAnimation(_masteryColor(s.masteryPct)),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

class _WeeklyTopicsCard extends StatelessWidget {
  final List<ProgressWeeklyRow> weekly;
  final List<SubjectMastery> subjects;
  final String? selectedSubjectId;
  final ValueChanged<String?> onSubjectChanged;

  const _WeeklyTopicsCard({
    required this.weekly,
    required this.subjects,
    required this.selectedSubjectId,
    required this.onSubjectChanged,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final rows =
        weekly.length > 10 ? weekly.sublist(weekly.length - 10) : weekly;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Weekly topics covered',
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: cs.onSurface)),
                ),
                if (subjects.length > 1)
                  DropdownButton<String?>(
                    value: selectedSubjectId,
                    isDense: true,
                    underline: const SizedBox.shrink(),
                    style: TextStyle(fontSize: 12, color: cs.onSurface),
                    items: [
                      const DropdownMenuItem(
                          value: null, child: Text('All subjects')),
                      ...subjects.map((s) => DropdownMenuItem(
                          value: s.subjectId, child: Text(s.subjectName))),
                    ],
                    onChanged: onSubjectChanged,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (rows.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Center(
                    child: Text('No weekly topic tests recorded yet',
                        style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12))),
              )
            else ...[
              SizedBox(
                height: 170,
                child: BarChart(
                  BarChartData(
                    maxY: 100,
                    minY: 0,
                    alignment: BarChartAlignment.spaceAround,
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: 25,
                      getDrawingHorizontalLine: (_) => FlLine(
                          color: cs.outlineVariant.withValues(alpha: 0.4),
                          strokeWidth: 1),
                    ),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      show: true,
                      rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 30,
                          interval: 25,
                          getTitlesWidget: (v, meta) => Text('${v.toInt()}%',
                              style: TextStyle(
                                  fontSize: 9, color: cs.onSurfaceVariant)),
                        ),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 24,
                          getTitlesWidget: (v, meta) {
                            final i = v.toInt();
                            if (i < 0 || i >= rows.length) {
                              return const SizedBox.shrink();
                            }
                            final d = rows[i].scheduledDate;
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text('${d.day}/${d.month}',
                                  style: TextStyle(
                                      fontSize: 9, color: cs.onSurfaceVariant)),
                            );
                          },
                        ),
                      ),
                    ),
                    barTouchData: BarTouchData(
                      touchTooltipData: BarTouchTooltipData(
                        getTooltipColor: (_) => cs.inverseSurface,
                        getTooltipItem: (group, groupIndex, rod, rodIndex) {
                          final row = rows[group.x];
                          return BarTooltipItem(
                            '${row.topicName}\n${row.subjectCode.isNotEmpty ? '${row.subjectCode} · ' : ''}${row.percentage.toStringAsFixed(0)}%',
                            TextStyle(
                                color: cs.onInverseSurface,
                                fontSize: 11,
                                fontWeight: FontWeight.w600),
                          );
                        },
                      ),
                    ),
                    barGroups: [
                      for (var i = 0; i < rows.length; i++)
                        BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: rows[i].percentage,
                              width: 14,
                              borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(4)),
                              color: rows[i].isAbsent
                                  ? Colors.grey
                                  : (rows[i].isWeak
                                      ? AppColors.error
                                      : AppColors.success),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              const Wrap(
                spacing: 14,
                children: [
                  _LegendDot(color: AppColors.success, label: 'Strong'),
                  _LegendDot(color: AppColors.error, label: 'Weak'),
                  _LegendDot(color: Colors.grey, label: 'Absent'),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
      ],
    );
  }
}

class _WeakTopicsCard extends StatelessWidget {
  final List<ProgressWeeklyRow> weakTopics;
  const _WeakTopicsCard({required this.weakTopics});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Weak topics to review',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: cs.onSurface)),
                if (weakTopics.isNotEmpty)
                  Text('${weakTopics.length} flagged',
                      style:
                          TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
              ],
            ),
            const SizedBox(height: 10),
            if (weakTopics.isEmpty)
              Text('No weak topics right now — great work!',
                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant))
            else
              ...weakTopics.map((w) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 120,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(w.topicName,
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: cs.onSurface),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                              Text(
                                  '${w.subjectName}${w.chapterNumber != null ? ' · Ch.${w.chapterNumber}' : ''}',
                                  style: TextStyle(
                                      fontSize: 10, color: cs.onSurfaceVariant),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: (w.percentage / 100).clamp(0, 1),
                              minHeight: 8,
                              backgroundColor: cs.surfaceContainerHighest,
                              valueColor: const AlwaysStoppedAnimation(
                                  AppColors.error),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 36,
                          child: Text('${w.percentage.toStringAsFixed(0)}%',
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.error)),
                        ),
                      ],
                    ),
                  )),
          ],
        ),
      ),
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
