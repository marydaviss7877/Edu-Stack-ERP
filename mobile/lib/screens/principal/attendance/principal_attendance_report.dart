import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/principal_providers.dart';

class PrincipalAttendanceReport extends ConsumerStatefulWidget {
  const PrincipalAttendanceReport({super.key});

  @override
  ConsumerState<PrincipalAttendanceReport> createState() =>
      _PrincipalAttendanceReportState();
}

class _PrincipalAttendanceReportState
    extends ConsumerState<PrincipalAttendanceReport> {
  DateTime _selectedDate = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(attendanceByClassProvider);
    final lowAsync = ref.watch(lowAttendanceStudentsProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Report'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today_rounded),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime.now().subtract(const Duration(days: 90)),
                lastDate: DateTime.now(),
              );
              if (picked != null) setState(() => _selectedDate = picked);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(attendanceByClassProvider);
          ref.invalidate(lowAttendanceStudentsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Date header ────────────────────────────────────
            Row(
              children: [
                Icon(Icons.today_rounded, size: 18, color: cs.primary),
                const SizedBox(width: 6),
                Text(
                  '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                  style: tt.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600, color: cs.primary),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Class-wise table ────────────────────────────────
            Text('By Class',
                style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            classesAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const Text('Could not load data'),
              data: (classes) {
                if (classes.isEmpty) return const Text('No data available');
                return Card(
                  child: Column(
                    children: [
                      // Table header
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        child: Row(
                          children: [
                            Expanded(
                                flex: 2,
                                child: Text('Class',
                                    style: tt.labelMedium?.copyWith(
                                        color: cs.onSurfaceVariant))),
                            Expanded(
                                child: Text('Present',
                                    maxLines: 1,
                                    overflow: TextOverflow.fade,
                                    textAlign: TextAlign.center,
                                    style: tt.labelSmall?.copyWith(
                                        color: cs.onSurfaceVariant))),
                            Expanded(
                                child: Text('Absent',
                                    maxLines: 1,
                                    overflow: TextOverflow.fade,
                                    textAlign: TextAlign.center,
                                    style: tt.labelSmall?.copyWith(
                                        color: cs.onSurfaceVariant))),
                            Expanded(
                                child: Text('%',
                                    textAlign: TextAlign.center,
                                    style: tt.labelSmall?.copyWith(
                                        color: cs.onSurfaceVariant))),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      ...classes.map((c) {
                        final name = c['className'] as String? ?? '';
                        final section = c['sectionName'] as String? ?? '';
                        final present = (c['presentCount'] as int?) ?? 0;
                        final absent = (c['absentCount'] as int?) ?? 0;
                        final total = (c['totalStudents'] as int?) ?? 0;
                        final pct = total > 0 ? (present / total * 100) : 0.0;
                        final low = pct < 75;
                        return Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              child: Row(
                                children: [
                                  Expanded(
                                      flex: 2,
                                      child: Text(
                                          '$name${section.isNotEmpty ? " $section" : ""}',
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: tt.bodyMedium)),
                                  Expanded(
                                      child: Text('$present',
                                          textAlign: TextAlign.center,
                                          style: tt.bodyMedium
                                              ?.copyWith(color: cs.primary))),
                                  Expanded(
                                      child: Text('$absent',
                                          textAlign: TextAlign.center,
                                          style: tt.bodyMedium
                                              ?.copyWith(color: cs.error))),
                                  Expanded(
                                    child: Text(
                                      '${pct.toStringAsFixed(0)}%',
                                      textAlign: TextAlign.center,
                                      style: tt.bodySmall?.copyWith(
                                        color: low ? cs.error : cs.primary,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1),
                          ],
                        );
                      }),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // ── Low attendance students ─────────────────────────
            Text('Low Attendance Students (< 75%)',
                style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            lowAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const Text('Could not load data'),
              data: (students) {
                if (students.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('No students below threshold. ✓'),
                    ),
                  );
                }
                return Card(
                  child: Column(
                    children: students.map((s) {
                      final name =
                          (s['profile']?['name'] as String?) ?? 'Unknown';
                      final cls =
                          '${s['className'] ?? ''} ${s['sectionName'] ?? ''}'
                              .trim();
                      final pct =
                          (s['attendancePercentage'] as num?)?.toDouble() ?? 0;
                      return ListTile(
                        leading: Icon(Icons.warning_rounded,
                            color: cs.error, size: 20),
                        title: Text(name,
                            style: tt.bodyMedium
                                ?.copyWith(fontWeight: FontWeight.w600)),
                        subtitle: Text(cls),
                        trailing: Text(
                          '${pct.toStringAsFixed(1)}%',
                          style: TextStyle(
                              color: cs.error, fontWeight: FontWeight.bold),
                        ),
                      );
                    }).toList(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
