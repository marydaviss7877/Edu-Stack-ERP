import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../providers/student_providers.dart';
import '../../../models/assignment.dart';

class MyAssignments extends ConsumerStatefulWidget {
  const MyAssignments({super.key});

  @override
  ConsumerState<MyAssignments> createState() => _MyAssignmentsState();
}

class _MyAssignmentsState extends ConsumerState<MyAssignments>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allAsync = ref.watch(myAssignmentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assignments'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [Tab(text: 'All'), Tab(text: 'Pending')],
        ),
      ),
      body: allAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorRetry(
            message: e.toString(),
            onRetry: () => ref.invalidate(myAssignmentsProvider)),
        data: (assignments) {
          final pending =
              assignments.where((a) => !a.isOverdue && a.isActive).toList();
          return TabBarView(
            controller: _tabCtrl,
            children: [
              _AssignmentList(
                  assignments: assignments,
                  onRefresh: () async => ref.invalidate(myAssignmentsProvider)),
              _AssignmentList(
                  assignments: pending,
                  onRefresh: () async => ref.invalidate(myAssignmentsProvider)),
            ],
          );
        },
      ),
    );
  }
}

class _AssignmentList extends StatelessWidget {
  const _AssignmentList({required this.assignments, required this.onRefresh});
  final List<Assignment> assignments;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    if (assignments.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment_turned_in_rounded,
                size: 56, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 12),
            const Text('No assignments here.'),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: assignments.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) =>
            _AssignmentCard(assignment: assignments[i]),
      ),
    );
  }
}

class _AssignmentCard extends StatelessWidget {
  const _AssignmentCard({required this.assignment});
  final Assignment assignment;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final days = assignment.daysLeft;
    final overdue = assignment.isOverdue;

    final (urgencyColor, urgencyLabel) = switch (days) {
      _ when overdue => (cs.error, 'Overdue'),
      _ when days == 0 => (cs.error, 'Due today'),
      _ when days <= 2 => (
          cs.tertiary,
          'Due in $days day${days == 1 ? '' : 's'}'
        ),
      _ => (cs.primary, 'Due in $days days'),
    };

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showDetail(context),
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
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      assignment.subjectName,
                      style: tt.labelSmall
                          ?.copyWith(color: cs.onSecondaryContainer),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: urgencyColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      urgencyLabel,
                      style: tt.labelSmall?.copyWith(
                          color: urgencyColor, fontWeight: FontWeight.bold),
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
                      size: 14, color: cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    'Due: ${DateFormat('d MMM yyyy').format(assignment.dueDate)}',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  if (assignment.totalMarks != null) ...[
                    const SizedBox(width: 12),
                    Icon(Icons.star_outline_rounded,
                        size: 14, color: cs.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      '${assignment.totalMarks!.toStringAsFixed(0)} marks',
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _AssignmentDetail(assignment: assignment),
    );
  }
}

class _AssignmentDetail extends StatelessWidget {
  const _AssignmentDetail({required this.assignment});
  final Assignment assignment;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      builder: (_, ctrl) => ListView(
        controller: ctrl,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          Text(assignment.title,
              style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(assignment.subjectName,
              style: tt.labelMedium?.copyWith(color: cs.primary)),
          const Divider(height: 24),
          Text('Description',
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(assignment.description, style: tt.bodyMedium),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _InfoChip(
                  icon: Icons.calendar_today_rounded,
                  label: 'Due Date',
                  value: DateFormat('d MMMM yyyy').format(assignment.dueDate),
                ),
              ),
              if (assignment.totalMarks != null)
                Expanded(
                  child: _InfoChip(
                    icon: Icons.star_rounded,
                    label: 'Total Marks',
                    value: assignment.totalMarks!.toStringAsFixed(0),
                  ),
                ),
            ],
          ),
          if (assignment.attachmentUrl != null) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.attach_file_rounded),
              label: const Text('View Attachment'),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip(
      {required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: cs.primary),
            const SizedBox(width: 4),
            Text(label,
                style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
          ],
        ),
        Text(value,
            style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _ErrorRetry extends StatelessWidget {
  const _ErrorRetry({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      );
}
