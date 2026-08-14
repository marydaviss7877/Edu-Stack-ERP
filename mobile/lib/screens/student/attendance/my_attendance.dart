import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../providers/student_providers.dart';
import '../../../models/attendance.dart';
import '../../../models/timetable.dart' show AttendanceSummary;

class MyAttendance extends ConsumerStatefulWidget {
  const MyAttendance({super.key});

  @override
  ConsumerState<MyAttendance> createState() => _MyAttendanceState();
}

class _MyAttendanceState extends ConsumerState<MyAttendance> {
  DateTime _selectedMonth = DateTime(DateTime.now().year, DateTime.now().month);

  String get _monthParam =>
      '${_selectedMonth.year}-${_selectedMonth.month.toString().padLeft(2, '0')}';

  void _previousMonth() {
    setState(() {
      _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month - 1);
    });
  }

  void _nextMonth() {
    final now = DateTime.now();
    if (_selectedMonth.year == now.year && _selectedMonth.month == now.month) {
      return;
    }
    setState(() {
      _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month + 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(myAttendanceSummaryProvider);
    final recordsAsync = ref.watch(myAttendanceProvider(_monthParam));
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: Text('nav.attendance'.tr())),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myAttendanceSummaryProvider);
          ref.invalidate(myAttendanceProvider(_monthParam));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Summary card ──────────────────────────────────
            summaryAsync.when(
              loading: () => const _SummaryLoading(),
              error: (_, __) => const SizedBox.shrink(),
              data: (summary) => _SummaryCard(summary: summary),
            ),

            const SizedBox(height: 20),

            // ── Month navigator ───────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                    onPressed: _previousMonth,
                    icon: const Icon(Icons.chevron_left_rounded)),
                Text(
                  _monthLabel(_selectedMonth),
                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                IconButton(
                  onPressed: _canGoNext ? _nextMonth : null,
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // ── Calendar ──────────────────────────────────────
            recordsAsync.when(
              loading: () => const Center(
                  child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator())),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (records) =>
                  _AttendanceCalendar(month: _selectedMonth, records: records),
            ),

            const SizedBox(height: 20),

            // ── Legend ────────────────────────────────────────
            const _Legend(),
          ],
        ),
      ),
    );
  }

  bool get _canGoNext {
    final now = DateTime.now();
    return !(_selectedMonth.year == now.year &&
        _selectedMonth.month == now.month);
  }

  String _monthLabel(DateTime dt) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return '${months[dt.month - 1]} ${dt.year}';
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.summary});
  final AttendanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final pct = summary.percentage;
    final low = pct < 75;

    return Card(
      color: low ? cs.errorContainer : cs.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  low ? Icons.warning_rounded : Icons.check_circle_rounded,
                  color: low ? cs.error : cs.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Overall Attendance',
                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                Text(
                  '${pct.toStringAsFixed(1)}%',
                  style: tt.headlineSmall?.copyWith(
                    color: low ? cs.error : cs.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: pct / 100,
                minHeight: 8,
                backgroundColor: cs.surface.withValues(alpha: 0.4),
                valueColor: AlwaysStoppedAnimation(low ? cs.error : cs.primary),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatPill(
                    label: 'attendance.present'.tr(),
                    value: '${summary.presentDays}',
                    color: cs.primary),
                _StatPill(
                    label: 'attendance.absent'.tr(),
                    value: '${summary.absentDays}',
                    color: cs.error),
                _StatPill(
                    label: 'attendance.late'.tr(),
                    value: '${summary.lateDays}',
                    color: cs.tertiary),
                _StatPill(
                    label: 'Total',
                    value: '${summary.totalDays}',
                    color: cs.outline),
              ],
            ),
            if (low) ...[
              const SizedBox(height: 10),
              Text(
                'Attendance below 75% — please contact administration.',
                style: tt.bodySmall?.copyWith(color: cs.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Column(
      children: [
        Text(value,
            style: tt.titleMedium
                ?.copyWith(color: color, fontWeight: FontWeight.bold)),
        Text(label, style: tt.labelSmall?.copyWith(color: color)),
      ],
    );
  }
}

class _SummaryLoading extends StatelessWidget {
  const _SummaryLoading();

  @override
  Widget build(BuildContext context) => const Card(
        child: Padding(
            padding: EdgeInsets.all(60),
            child: Center(child: CircularProgressIndicator())),
      );
}

class _AttendanceCalendar extends StatelessWidget {
  const _AttendanceCalendar({required this.month, required this.records});
  final DateTime month;
  final List<AttendanceRecord> records;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    // Map date → status
    final Map<int, String> statusMap = {
      for (final r in records) r.date.day: r.status,
    };

    final firstDay = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    // 0=Sun … 6=Sat; we want Mon-first so offset = (weekday-1) % 7
    final offset = (firstDay.weekday - 1) % 7;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            // Day headers
            Row(
              children: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                  .map((d) => Expanded(
                        child: Center(
                          child: Text(d,
                              style: tt.labelSmall
                                  ?.copyWith(color: cs.onSurfaceVariant)),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
            // Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
              ),
              itemCount: offset + daysInMonth,
              itemBuilder: (_, i) {
                if (i < offset) return const SizedBox.shrink();
                final day = i - offset + 1;
                final status = statusMap[day];
                return _DayCell(day: day, status: status);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({required this.day, this.status});
  final int day;
  final String? status;

  static Color _color(BuildContext context, String? s) {
    final cs = Theme.of(context).colorScheme;
    return switch (s) {
      'present' => cs.primary,
      'absent' => cs.error,
      'late' => cs.tertiary,
      'excused' => cs.secondary,
      _ => Colors.transparent,
    };
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final color = _color(context, status);
    final today = DateTime.now();
    final isToday = DateTime(today.year, today.month, today.day) ==
        DateTime(today.year, today.month, day);

    return Container(
      decoration: BoxDecoration(
        color: status != null ? color.withValues(alpha: 0.18) : null,
        border: isToday ? Border.all(color: cs.primary, width: 1.5) : null,
        borderRadius: BorderRadius.circular(6),
      ),
      alignment: Alignment.center,
      child: Text(
        '$day',
        style: tt.labelSmall?.copyWith(
          color: status != null ? color : cs.onSurfaceVariant,
          fontWeight: status != null ? FontWeight.bold : null,
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        _LegendDot(color: cs.primary, label: 'attendance.present'.tr()),
        _LegendDot(color: cs.error, label: 'attendance.absent'.tr()),
        _LegendDot(color: cs.tertiary, label: 'attendance.late'.tr()),
        _LegendDot(color: cs.secondary, label: 'attendance.excused'.tr()),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.labelSmall),
        ],
      );
}
