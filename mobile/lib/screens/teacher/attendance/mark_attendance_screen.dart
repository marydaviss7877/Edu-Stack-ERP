import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../providers/teacher_providers.dart';
import '../../../models/attendance.dart';

class MarkAttendanceScreen extends ConsumerStatefulWidget {
  final String classId;
  final String sectionId;
  final String className;
  final String sectionName;
  final String subjectName;

  const MarkAttendanceScreen({
    super.key,
    required this.classId,
    required this.sectionId,
    required this.className,
    required this.sectionName,
    required this.subjectName,
  });

  @override
  ConsumerState<MarkAttendanceScreen> createState() => _MarkAttendanceState();
}

class _MarkAttendanceState extends ConsumerState<MarkAttendanceScreen> {
  Map<String, String> _statusMap = {}; // studentId → status
  bool _submitting = false;
  bool _submitted = false;
  int _periodNo = 1;

  final _statuses = ['present', 'absent', 'late', 'excused'];

  @override
  void initState() {
    super.initState();
    _loadExistingAttendance();
  }

  Future<void> _loadExistingAttendance() async {
    final svc = ref.read(attendanceServiceProvider);
    final existing = await svc.getTodayAttendance(
        widget.classId, widget.sectionId, _periodNo);
    if (existing != null) {
      setState(() {
        _statusMap = {
          for (final r in existing.records) r.studentId: r.status,
        };
        _submitted = true;
      });
    }
  }

  Future<void> _submit() async {
    if (_statusMap.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Mark at least one student before submitting.')),
      );
      return;
    }

    setState(() => _submitting = true);

    final today = DateTime.now().toIso8601String().split('T').first;
    final records = _statusMap.entries
        .map((e) => {'studentId': e.key, 'status': e.value})
        .toList();
    final svc = ref.read(attendanceServiceProvider);

    try {
      final connectivity = await Connectivity().checkConnectivity();
      final online = !connectivity.contains(ConnectivityResult.none);

      if (online) {
        await svc.submitAttendance(
          classId: widget.classId,
          sectionId: widget.sectionId,
          date: today,
          periodNo: _periodNo,
          records: records,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Attendance saved successfully.')),
          );
          setState(() {
            _submitted = true;
            _submitting = false;
          });
        }
      } else {
        // Offline: queue for later
        await svc.queueOffline(OfflineAttendanceEntry(
          classId: widget.classId,
          sectionId: widget.sectionId,
          date: today,
          periodNo: _periodNo,
          records: records,
          createdAt: DateTime.now(),
        ));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Saved offline — will sync when connected.'),
              backgroundColor: Colors.orange,
            ),
          );
          setState(() {
            _submitted = true;
            _submitting = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Error: $e'),
              backgroundColor: Theme.of(context).colorScheme.error),
        );
        setState(() => _submitting = false);
      }
    }
  }

  void _markAll(String status) {
    final students = ref
        .read(classStudentsProvider('${widget.classId}:${widget.sectionId}'));
    students.whenData((list) {
      setState(() {
        for (final s in list) {
          final id = s['_id'] as String? ?? '';
          if (id.isNotEmpty) _statusMap[id] = status;
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref
        .watch(classStudentsProvider('${widget.classId}:${widget.sectionId}'));
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
                '${widget.className}${widget.sectionName.isNotEmpty ? " · ${widget.sectionName}" : ""}'),
            if (widget.subjectName.isNotEmpty)
              Text(widget.subjectName,
                  style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
          ],
        ),
        actions: [
          // Period selector
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: DropdownButton<int>(
              value: _periodNo,
              underline: const SizedBox.shrink(),
              items: List.generate(
                  8,
                  (i) => DropdownMenuItem(
                      value: i + 1, child: Text('Period ${i + 1}'))),
              onChanged: _submitted
                  ? null
                  : (v) {
                      if (v != null) {
                        setState(() {
                          _periodNo = v;
                          _statusMap.clear();
                        });
                        _loadExistingAttendance();
                      }
                    },
            ),
          ),
        ],
      ),
      body: studentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (students) {
          if (students.isEmpty) {
            return const Center(child: Text('No students in this class.'));
          }

          // Auto-mark all present if no existing data
          if (_statusMap.isEmpty && !_submitted) {
            Future.microtask(() => setState(() {
                  for (final s in students) {
                    final id = s['_id'] as String? ?? '';
                    if (id.isNotEmpty) _statusMap[id] = 'present';
                  }
                }));
          }

          return Column(
            children: [
              // ── Bulk actions bar ─────────────────────────────
              if (!_submitted)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: cs.surfaceContainerLow,
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('Mark all:', style: tt.labelMedium),
                      ..._statuses.map((s) => ActionChip(
                            label: Text(s[0].toUpperCase() + s.substring(1)),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => _markAll(s),
                          )),
                    ],
                  ),
                ),

              // ── Student list ──────────────────────────────────
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: students.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final s = students[i];
                    final id = s['_id'] as String? ?? '';
                    final name =
                        (s['profile']?['name'] as String?) ?? 'Unknown';
                    final rollNo = s['rollNo'] as String? ?? '';
                    final photoUrl = s['profile']?['photoUrl'] as String?;
                    final status = _statusMap[id] ?? 'present';

                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        child: Row(
                          children: [
                            // Avatar
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: cs.primaryContainer,
                              backgroundImage:
                                  photoUrl != null && photoUrl.isNotEmpty
                                      ? NetworkImage(photoUrl)
                                      : null,
                              child: photoUrl == null || photoUrl.isEmpty
                                  ? Text(
                                      name.isNotEmpty
                                          ? name[0].toUpperCase()
                                          : '?',
                                      style: TextStyle(
                                          color: cs.onPrimaryContainer,
                                          fontWeight: FontWeight.bold),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(name,
                                      style: tt.bodyMedium?.copyWith(
                                          fontWeight: FontWeight.w600)),
                                  if (rollNo.isNotEmpty)
                                    Text('Roll #$rollNo',
                                        style: tt.bodySmall?.copyWith(
                                            color: cs.onSurfaceVariant)),
                                ],
                              ),
                            ),
                            // Status selector
                            if (_submitted)
                              _StatusBadge(status: status)
                            else
                              _StatusToggle(
                                status: status,
                                onChanged: (s) =>
                                    setState(() => _statusMap[id] = s),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              // ── Submit button ─────────────────────────────────
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _submitted
                      ? Row(
                          children: [
                            Icon(Icons.check_circle_rounded, color: cs.primary),
                            const SizedBox(width: 8),
                            Text('Attendance recorded',
                                style:
                                    tt.bodyMedium?.copyWith(color: cs.primary)),
                          ],
                        )
                      : FilledButton.icon(
                          onPressed: _submitting ? null : _submit,
                          icon: _submitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.check_rounded),
                          label: Text(
                              _submitting ? 'Saving…' : 'Submit Attendance'),
                          style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(48)),
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  static Color _color(BuildContext ctx, String s) {
    final cs = Theme.of(ctx).colorScheme;
    return switch (s) {
      'present' => cs.primary,
      'absent' => cs.error,
      'late' => cs.tertiary,
      'excused' => cs.secondary,
      _ => cs.outline,
    };
  }

  @override
  Widget build(BuildContext context) {
    final color = _color(context, status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status[0].toUpperCase() + status.substring(1),
        style:
            TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }
}

class _StatusToggle extends StatelessWidget {
  const _StatusToggle({required this.status, required this.onChanged});
  final String status;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<String>(
      style: SegmentedButton.styleFrom(
        visualDensity: VisualDensity.compact,
        textStyle: const TextStyle(fontSize: 10),
        padding: EdgeInsets.zero,
      ),
      selected: {status},
      onSelectionChanged: (s) => onChanged(s.first),
      segments: const [
        ButtonSegment(value: 'present', label: Text('P'), tooltip: 'Present'),
        ButtonSegment(value: 'absent', label: Text('A'), tooltip: 'Absent'),
        ButtonSegment(value: 'late', label: Text('L'), tooltip: 'Late'),
        ButtonSegment(value: 'excused', label: Text('E'), tooltip: 'Excused'),
      ],
    );
  }
}
