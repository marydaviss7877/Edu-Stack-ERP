import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/teacher_providers.dart';
import '../../../core/layout/responsive.dart';

class EnterMarksScreen extends ConsumerStatefulWidget {
  const EnterMarksScreen({super.key});

  @override
  ConsumerState<EnterMarksScreen> createState() => _EnterMarksState();
}

class _EnterMarksState extends ConsumerState<EnterMarksScreen> {
  String? _selectedExamId;
  String? _selectedClassKey; // 'classId:sectionId'
  List<Map<String, dynamic>> _students = [];
  final Map<String, TextEditingController> _controllers = {};
  bool _loading = false;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadMarks() async {
    if (_selectedExamId == null || _selectedClassKey == null) return;
    setState(() => _loading = true);
    try {
      final parts = _selectedClassKey!.split(':');
      final svc = ref.read(examServiceProvider);
      final marks =
          await svc.getClassMarks(_selectedExamId!, parts[0], parts[1]);

      // Merge with student list
      final students = ref.read(classStudentsProvider(_selectedClassKey!));
      final list = students.maybeWhen(
          data: (d) => d, orElse: () => <Map<String, dynamic>>[]);

      _controllers.clear();
      for (final s in list) {
        final id = s['_id'] as String? ?? '';
        final entry = marks.firstWhere(
          (m) =>
              (m['studentId'] is Map
                  ? m['studentId']['_id']
                  : m['studentId']) ==
              id,
          orElse: () => {},
        );
        _controllers[id] = TextEditingController(
          text: entry.isEmpty
              ? ''
              : (entry['marksObtained'] as num?)?.toStringAsFixed(0) ?? '',
        );
      }

      setState(() {
        _students = list;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _saveMarks() async {
    if (_selectedExamId == null || _students.isEmpty) return;
    setState(() => _saving = true);

    final marksEntries = _students.map((s) {
      final id = s['_id'] as String? ?? '';
      final text = _controllers[id]?.text.trim() ?? '';
      return {
        'studentId': id,
        'marksObtained': text.isEmpty ? null : double.tryParse(text),
        'isAbsent': text.isEmpty,
      };
    }).toList();

    try {
      final svc = ref.read(examServiceProvider);
      await svc.saveMarks(_selectedExamId!, {'marks': marksEntries});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Marks saved successfully.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final examsAsync = ref.watch(activeExamsProvider);
    final classesAsync = ref.watch(myClassesProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Enter Marks')),
      body: Column(
        children: [
          // ── Filters ─────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            color: cs.surfaceContainerLow,
            child: Column(
              children: [
                // Exam picker
                examsAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (_, __) => const Text('Could not load exams'),
                  data: (exams) => DropdownButtonFormField<String>(
                    initialValue: _selectedExamId,
                    decoration: const InputDecoration(
                        labelText: 'Select Exam', border: OutlineInputBorder()),
                    items: exams.map((e) {
                      final id = e['_id'] as String? ?? '';
                      final name = e['name'] as String? ?? id;
                      return DropdownMenuItem(value: id, child: Text(name));
                    }).toList(),
                    onChanged: (v) => setState(() {
                      _selectedExamId = v;
                      _students.clear();
                    }),
                  ),
                ),
                const SizedBox(height: 12),
                // Class picker
                classesAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (_, __) => const Text('Could not load classes'),
                  data: (classes) => DropdownButtonFormField<String>(
                    initialValue: _selectedClassKey,
                    decoration: const InputDecoration(
                        labelText: 'Select Class',
                        border: OutlineInputBorder()),
                    items: classes.map((c) {
                      final classId =
                          c['classId'] as String? ?? c['_id'] as String? ?? '';
                      final sectionId = c['sectionId'] as String? ?? '';
                      final className = c['className'] as String? ?? '';
                      final sectionName = c['sectionName'] as String? ?? '';
                      final key = '$classId:$sectionId';
                      return DropdownMenuItem(
                        value: key,
                        child: Text(
                            '$className${sectionName.isNotEmpty ? " · $sectionName" : ""}'),
                      );
                    }).toList(),
                    onChanged: (v) {
                      setState(() {
                        _selectedClassKey = v;
                        _students.clear();
                      });
                      if (v != null) {
                        ref.read(classStudentsProvider(v)); // prefetch
                      }
                    },
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: (_selectedExamId != null &&
                          _selectedClassKey != null &&
                          !_loading)
                      ? _loadMarks
                      : null,
                  icon: const Icon(Icons.download_rounded),
                  label: const Text('Load Students'),
                  style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(44)),
                ),
              ],
            ),
          ),

          // ── Marks list ───────────────────────────────────────
          if (_loading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_students.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit_note_rounded,
                        size: 56, color: cs.outlineVariant),
                    const SizedBox(height: 12),
                    Text('Select an exam and class to load students.',
                        style: tt.bodyMedium),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: _students.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (context, i) {
                  final s = _students[i];
                  final id = s['_id'] as String? ?? '';
                  final name = (s['profile']?['name'] as String?) ?? 'Unknown';
                  final rollNo = s['rollNo'] as String? ?? '';
                  final photoUrl = s['profile']?['photoUrl'] as String?;
                  final ctrl = _controllers[id] ?? TextEditingController();

                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
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
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 10),
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
                          SizedBox(
                            width: context.isNarrowPhone ? 60 : 72,
                            child: TextField(
                              controller: ctrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                      decimal: true),
                              textAlign: TextAlign.center,
                              decoration: InputDecoration(
                                hintText: 'Absent',
                                hintStyle: tt.bodySmall
                                    ?.copyWith(color: cs.outlineVariant),
                                isDense: true,
                                border: const OutlineInputBorder(),
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 8),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

          // ── Save button ───────────────────────────────────────
          if (_students.isNotEmpty)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  onPressed: _saving ? null : _saveMarks,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_rounded),
                  label: Text(_saving ? 'Saving…' : 'Save Marks'),
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
