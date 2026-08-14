import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../providers/teacher_providers.dart';
import '../../../models/assignment.dart';

class TeacherAssignments extends ConsumerWidget {
  const TeacherAssignments({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignmentsAsync = ref.watch(teacherAssignmentsProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Assignments')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateSheet(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Assignment'),
      ),
      body: assignmentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: cs.error),
              const SizedBox(height: 12),
              Text(e.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => ref.invalidate(teacherAssignmentsProvider),
                  child: const Text('Retry')),
            ],
          ),
        ),
        data: (assignments) {
          if (assignments.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.assignment_rounded,
                      size: 56, color: cs.outlineVariant),
                  const SizedBox(height: 12),
                  const Text('No assignments created yet.'),
                  const SizedBox(height: 8),
                  const Text('Tap + to create your first assignment.',
                      style: TextStyle(fontSize: 12)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(teacherAssignmentsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: assignments.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _TeacherAssignmentCard(
                assignment: assignments[i],
                onViewSubmissions: () =>
                    _showSubmissions(context, ref, assignments[i].id),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showCreateSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _CreateAssignmentSheet(onCreated: () {
        ref.invalidate(teacherAssignmentsProvider);
      }),
    );
  }

  void _showSubmissions(
      BuildContext context, WidgetRef ref, String assignmentId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _SubmissionsSheet(assignmentId: assignmentId),
    );
  }
}

class _TeacherAssignmentCard extends StatelessWidget {
  const _TeacherAssignmentCard(
      {required this.assignment, required this.onViewSubmissions});
  final Assignment assignment;
  final VoidCallback onViewSubmissions;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final days = assignment.daysLeft;
    final overdue = assignment.isOverdue;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: cs.secondaryContainer,
                      borderRadius: BorderRadius.circular(4)),
                  child: Text(assignment.subjectName,
                      style: tt.labelSmall
                          ?.copyWith(color: cs.onSecondaryContainer)),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: overdue ? cs.errorContainer : cs.primaryContainer,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    overdue
                        ? 'Closed'
                        : '$days day${days == 1 ? '' : 's'} left',
                    style: tt.labelSmall?.copyWith(
                      color:
                          overdue ? cs.onErrorContainer : cs.onPrimaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(assignment.title,
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
              assignment.description,
              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.calendar_today_rounded,
                    size: 13, color: cs.onSurfaceVariant),
                const SizedBox(width: 4),
                Text(
                  'Due: ${DateFormat('d MMM yyyy').format(assignment.dueDate)}',
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
                if (assignment.totalMarks != null) ...[
                  const SizedBox(width: 10),
                  Icon(Icons.star_outline_rounded,
                      size: 13, color: cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text('${assignment.totalMarks!.toStringAsFixed(0)} marks',
                      style:
                          tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                ],
                const Spacer(),
                TextButton.icon(
                  onPressed: onViewSubmissions,
                  icon: const Icon(Icons.people_rounded, size: 16),
                  label: const Text('Submissions'),
                  style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateAssignmentSheet extends ConsumerStatefulWidget {
  const _CreateAssignmentSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateAssignmentSheet> createState() =>
      _CreateAssignmentSheetState();
}

class _CreateAssignmentSheetState
    extends ConsumerState<_CreateAssignmentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _marksCtrl = TextEditingController();
  DateTime? _dueDate;
  String? _subjectId;
  bool _submitting = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _marksCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_dueDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a due date.')));
      return;
    }

    setState(() => _submitting = true);
    try {
      final svc = ref.read(assignmentServiceProvider);
      await svc.createAssignment({
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'dueDate': _dueDate!.toIso8601String(),
        'totalMarks': double.tryParse(_marksCtrl.text.trim()),
        if (_subjectId != null) 'subjectId': _subjectId,
      });
      if (mounted) {
        Navigator.of(context).pop();
        widget.onCreated();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (_, ctrl) => Form(
        key: _formKey,
        child: ListView(
          controller: ctrl,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            Text('New Assignment',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                  labelText: 'Title', border: OutlineInputBorder()),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                  labelText: 'Description', border: OutlineInputBorder()),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _marksCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                  labelText: 'Total Marks (optional)',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now().add(const Duration(days: 7)),
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (picked != null) setState(() => _dueDate = picked);
              },
              icon: const Icon(Icons.calendar_today_rounded),
              label: Text(_dueDate == null
                  ? 'Set Due Date'
                  : 'Due: ${DateFormat('d MMM yyyy').format(_dueDate!)}'),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const CircularProgressIndicator()
                  : const Text('Create Assignment'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubmissionsSheet extends ConsumerWidget {
  const _SubmissionsSheet({required this.assignmentId});
  final String assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      builder: (_, ctrl) => FutureBuilder<List<Map<String, dynamic>>>(
        future:
            ref.read(assignmentServiceProvider).getSubmissions(assignmentId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text(snap.error.toString()));
          }
          final submissions = snap.data ?? [];
          if (submissions.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.inbox_rounded, size: 48, color: cs.outlineVariant),
                  const SizedBox(height: 12),
                  const Text('No submissions yet.'),
                ],
              ),
            );
          }
          return ListView.separated(
            controller: ctrl,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            itemCount: submissions.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final s = submissions[i];
              final student = s['studentId'];
              final profile =
                  student is Map ? student['profile'] as Map? : null;
              final name = (profile?['name'] as String?) ?? 'Unknown';
              final photoUrl = profile?['photoUrl'] as String?;
              final submittedAt = s['submittedAt'] as String?;
              final grade = s['grade'] as String?;
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: cs.primaryContainer,
                  backgroundImage: photoUrl != null && photoUrl.isNotEmpty
                      ? NetworkImage(photoUrl)
                      : null,
                  child: photoUrl == null || photoUrl.isEmpty
                      ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: TextStyle(
                              color: cs.onPrimaryContainer,
                              fontWeight: FontWeight.bold))
                      : null,
                ),
                title: Text(name,
                    style:
                        tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                subtitle: submittedAt != null
                    ? Text(
                        'Submitted ${DateFormat('d MMM').format(DateTime.parse(submittedAt))}')
                    : null,
                trailing: grade != null
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                            color: cs.primaryContainer,
                            borderRadius: BorderRadius.circular(8)),
                        child: Text(grade,
                            style: TextStyle(
                                color: cs.onPrimaryContainer,
                                fontWeight: FontWeight.bold)),
                      )
                    : null,
              );
            },
          );
        },
      ),
    );
  }
}
