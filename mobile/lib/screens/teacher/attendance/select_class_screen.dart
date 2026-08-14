import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../providers/teacher_providers.dart';

class SelectClassScreen extends ConsumerWidget {
  const SelectClassScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classesAsync = ref.watch(myClassesProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Mark Attendance')),
      body: classesAsync.when(
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
                  onPressed: () => ref.invalidate(myClassesProvider),
                  child: const Text('Retry')),
            ],
          ),
        ),
        data: (classes) {
          if (classes.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.class_rounded, size: 56, color: cs.outlineVariant),
                  const SizedBox(height: 12),
                  const Text('No classes assigned yet.'),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: classes.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final cls = classes[i];
              final classId =
                  cls['classId'] as String? ?? cls['_id'] as String? ?? '';
              final sectionId = cls['sectionId'] as String? ?? '';
              final className =
                  cls['className'] as String? ?? cls['name'] as String? ?? '';
              final sectionName = cls['sectionName'] as String? ?? '';
              final subjectName = cls['subjectName'] as String? ?? '';
              final studentCount = cls['studentCount'] as int? ?? 0;

              return Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => context.push(
                    '/teacher/attendance/mark',
                    extra: {
                      'classId': classId,
                      'sectionId': sectionId,
                      'className': className,
                      'sectionName': sectionName,
                      'subjectName': subjectName,
                    },
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: cs.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            className.isNotEmpty ? className[0] : '?',
                            style: tt.titleLarge?.copyWith(
                                color: cs.onPrimaryContainer,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$className${sectionName.isNotEmpty ? " · Section $sectionName" : ""}',
                                style: tt.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              if (subjectName.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(subjectName,
                                    style: tt.bodySmall
                                        ?.copyWith(color: cs.primary)),
                              ],
                              const SizedBox(height: 2),
                              Text(
                                '$studentCount student${studentCount == 1 ? '' : 's'}',
                                style: tt.bodySmall
                                    ?.copyWith(color: cs.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.arrow_forward_ios_rounded,
                            size: 16, color: cs.onSurfaceVariant),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
