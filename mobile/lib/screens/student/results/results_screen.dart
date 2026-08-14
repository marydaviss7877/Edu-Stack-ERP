import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../providers/student_providers.dart';
import '../../../providers/org_provider.dart';
import '../../../models/result.dart';
import '../../../services/pdf_service.dart';

class ResultsScreen extends ConsumerWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsAsync = ref.watch(myResultsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Results')),
      body: resultsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorRetry(
            message: e.toString(),
            onRetry: () => ref.invalidate(myResultsProvider)),
        data: (results) {
          if (results.isEmpty) {
            return const _Empty(message: 'No results published yet.');
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myResultsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: results.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _ResultCard(result: results[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});
  final ExamResult result;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    final gradeColor = result.isPassed ? cs.primary : cs.error;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showDetail(context, result),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Grade badge
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: gradeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  result.grade,
                  style: tt.titleLarge?.copyWith(
                    color: gradeColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(result.examName,
                        style: tt.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(
                      '${result.totalMarksObtained.toStringAsFixed(0)} / ${result.totalMarks.toStringAsFixed(0)} marks',
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                    const SizedBox(height: 2),
                    if (result.classPosition != null)
                      Text(
                        'Class Position: ${result.classPosition}',
                        style:
                            tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${result.percentage.toStringAsFixed(1)}%',
                    style: tt.titleMedium?.copyWith(
                      color: gradeColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: gradeColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      result.isPassed
                          ? 'results.passed'.tr().toUpperCase()
                          : 'results.failed'.tr().toUpperCase(),
                      style: tt.labelSmall?.copyWith(
                        color: gradeColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context, ExamResult result) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ResultDetail(result: result),
    );
  }
}

class _ResultDetail extends ConsumerStatefulWidget {
  const _ResultDetail({required this.result});
  final ExamResult result;

  @override
  ConsumerState<_ResultDetail> createState() => _ResultDetailState();
}

class _ResultDetailState extends ConsumerState<_ResultDetail> {
  bool _downloading = false;

  Future<void> _download() async {
    final profile = ref.read(studentProfileProvider).valueOrNull;
    final org = ref.read(orgProvider);
    if (profile == null || org == null) return;

    setState(() => _downloading = true);
    try {
      await PdfService.shareResultCard(
          result: widget.result, student: profile, org: org);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to generate PDF: $e'),
              backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (_, ctrl) => ListView(
        controller: ctrl,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          Text(widget.result.examName,
              style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            'Total: ${widget.result.totalMarksObtained.toStringAsFixed(0)} / ${widget.result.totalMarks.toStringAsFixed(0)}  •  ${widget.result.percentage.toStringAsFixed(1)}%  •  Grade ${widget.result.grade}',
            style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
          ),
          if (widget.result.classPosition != null) ...[
            const SizedBox(height: 2),
            Text('Class Position: ${widget.result.classPosition}',
                style: tt.bodySmall?.copyWith(color: cs.primary)),
          ],
          const Divider(height: 28),
          Text('Subject Breakdown',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ...widget.result.subjectMarks.map((sm) => _SubjectRow(mark: sm)),
          if (widget.result.remarks != null) ...[
            const Divider(height: 28),
            Text('Remarks',
                style: tt.labelLarge?.copyWith(color: cs.onSurfaceVariant)),
            const SizedBox(height: 6),
            Text(widget.result.remarks!, style: tt.bodyMedium),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _downloading ? null : _download,
            icon: _downloading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.download_rounded),
            label: Text('results.downloadPdf'.tr()),
          ),
        ],
      ),
    );
  }
}

class _SubjectRow extends StatelessWidget {
  const _SubjectRow({required this.mark});
  final SubjectMark mark;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final color = mark.isPassed ? cs.primary : cs.error;
    final pct = mark.percentage;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(mark.subjectName, style: tt.bodyMedium)),
              Text(
                mark.isAbsent
                    ? 'Absent'
                    : '${mark.marksObtained.toStringAsFixed(0)} / ${mark.totalMarks.toStringAsFixed(0)}',
                style: tt.bodyMedium
                    ?.copyWith(color: color, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: mark.isAbsent ? 0 : pct / 100,
              minHeight: 6,
              backgroundColor: cs.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.school_rounded,
                size: 56, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text(message),
          ],
        ),
      );
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
