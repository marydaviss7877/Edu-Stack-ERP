import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/student_providers.dart';
import '../../../models/timetable.dart';

class StudentTimetable extends ConsumerStatefulWidget {
  const StudentTimetable({super.key});

  @override
  ConsumerState<StudentTimetable> createState() => _StudentTimetableState();
}

class _StudentTimetableState extends ConsumerState<StudentTimetable>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  static const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @override
  void initState() {
    super.initState();
    // Start on today's tab (1=Mon…6=Sat, clamp to 0-5)
    final todayIndex = (DateTime.now().weekday - 1).clamp(0, 5);
    _tabCtrl = TabController(length: 6, vsync: this, initialIndex: todayIndex);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final timetableAsync = ref.watch(myTimetableProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Timetable'),
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: false,
          tabs: _days.map((d) => Tab(text: d)).toList(),
        ),
      ),
      body: timetableAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
            message: e.toString(),
            onRetry: () => ref.invalidate(myTimetableProvider)),
        data: (timetable) {
          if (timetable == null) {
            return const _EmptyView(message: 'No timetable assigned yet.');
          }
          return TabBarView(
            controller: _tabCtrl,
            children: List.generate(6, (i) {
              final daySlots = timetable.slotsForDay(i + 1); // 1=Mon
              if (daySlots.isEmpty) {
                return const _EmptyView(message: 'No classes this day.');
              }
              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(myTimetableProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: daySlots.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, idx) {
                    final slot = daySlots[idx];
                    final timing = timetable.periodTimings.firstWhere(
                      (t) => t.periodNo == slot.periodNo,
                      orElse: () => PeriodTiming(
                          periodNo: slot.periodNo,
                          startTime: '--',
                          endTime: '--'),
                    );
                    final isToday = DateTime.now().weekday == i + 1;
                    final todaySlots = isToday
                        ? TodaySlot.fromTimetable(timetable, i + 1)
                        : <TodaySlot>[];
                    final isNow = todaySlots.any(
                      (ts) => ts.periodNo == slot.periodNo && ts.isNow,
                    );
                    return _PeriodCard(
                      slot: slot,
                      startTime: timing.startTime,
                      endTime: timing.endTime,
                      isNow: isNow,
                    );
                  },
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

class _PeriodCard extends StatelessWidget {
  const _PeriodCard({
    required this.slot,
    required this.startTime,
    required this.endTime,
    required this.isNow,
  });

  final TimetableSlot slot;
  final String startTime;
  final String endTime;
  final bool isNow;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Card(
      color: isNow ? cs.primaryContainer : cs.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Period number circle
            CircleAvatar(
              radius: 22,
              backgroundColor: isNow ? cs.primary : cs.surfaceContainerHighest,
              child: Text(
                '${slot.periodNo}',
                style: tt.labelLarge?.copyWith(
                  color: isNow ? cs.onPrimary : cs.onSurface,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          slot.subjectName,
                          style: tt.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (isNow)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: cs.primary,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'NOW',
                            style: tt.labelSmall?.copyWith(
                              color: cs.onPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(slot.teacherName,
                      style:
                          tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                  if (startTime.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      '$startTime – $endTime${slot.roomNo != null ? '  •  Room ${slot.roomNo}' : ''}',
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.event_busy_rounded,
              size: 56, color: Theme.of(context).colorScheme.outlineVariant),
          const SizedBox(height: 12),
          Text(message, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
