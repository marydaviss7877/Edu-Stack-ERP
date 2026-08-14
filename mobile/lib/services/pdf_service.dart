import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/result.dart';
import '../models/student_profile.dart';
import '../models/org.dart';

class PdfService {
  static Future<Uint8List> generateResultCard({
    required ExamResult result,
    required StudentProfile student,
    required OrgConfig org,
  }) async {
    final pdf = pw.Document();

    final primaryColor = _hexColor('#4F378A');
    final resultColor = result.isPassed ? PdfColors.green700 : PdfColors.red700;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            _buildHeader(org, primaryColor),
            pw.SizedBox(height: 14),
            pw.Divider(color: primaryColor, thickness: 2),
            pw.SizedBox(height: 14),
            _buildStudentInfo(student, result),
            pw.SizedBox(height: 18),
            _buildSubjectTable(result, primaryColor),
            pw.SizedBox(height: 18),
            _buildSummaryRow(result, primaryColor, resultColor),
            if (result.remarks != null) ...[
              pw.SizedBox(height: 14),
              _buildRemarks(result.remarks!),
            ],
            pw.Spacer(),
            _buildFooter(),
          ],
        ),
      ),
    );

    return pdf.save();
  }

  static Future<void> shareResultCard({
    required ExamResult result,
    required StudentProfile student,
    required OrgConfig org,
  }) async {
    final bytes =
        await generateResultCard(result: result, student: student, org: org);
    await Printing.sharePdf(
      bytes: bytes,
      filename:
          'result_${student.name.replaceAll(' ', '_')}_${result.examName.replaceAll(' ', '_')}.pdf',
    );
  }

  // ── Sections ──────────────────────────────────────────────

  static pw.Widget _buildHeader(OrgConfig org, PdfColor primary) {
    return pw.Row(
      children: [
        pw.Container(
          width: 56,
          height: 56,
          decoration: pw.BoxDecoration(
            color: primary,
            borderRadius: pw.BorderRadius.circular(10),
          ),
          alignment: pw.Alignment.center,
          child: pw.Text(
            org.name.isNotEmpty ? org.name[0].toUpperCase() : 'E',
            style: pw.TextStyle(
                color: PdfColors.white,
                fontSize: 26,
                fontWeight: pw.FontWeight.bold),
          ),
        ),
        pw.SizedBox(width: 14),
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                org.name,
                style: pw.TextStyle(
                    fontSize: 18,
                    fontWeight: pw.FontWeight.bold,
                    color: primary),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                'RESULT CARD',
                style: const pw.TextStyle(
                    fontSize: 10, color: PdfColors.grey600, letterSpacing: 2.5),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static pw.Widget _buildStudentInfo(
      StudentProfile student, ExamResult result) {
    final leftItems = <_InfoItem>[
      _InfoItem('Student', student.name),
      if (student.rollNo != null) _InfoItem('Roll No.', student.rollNo!),
      if (student.className != null)
        _InfoItem(
          'Class',
          [
            student.className!,
            if (student.sectionName != null) student.sectionName!
          ].join(' — '),
        ),
    ];

    final rightItems = <_InfoItem>[
      _InfoItem('Exam', result.examName),
      if (result.classPosition != null)
        _InfoItem('Class Position', '${result.classPosition}'),
      if (result.sectionPosition != null)
        _InfoItem('Section Position', '${result.sectionPosition}'),
    ];

    return pw.Container(
      padding: const pw.EdgeInsets.all(14),
      decoration: pw.BoxDecoration(
        color: PdfColors.grey100,
        borderRadius: pw.BorderRadius.circular(8),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: leftItems.map(_infoRow).toList(),
            ),
          ),
          pw.SizedBox(width: 24),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: rightItems.map(_infoRow).toList(),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _infoRow(_InfoItem item) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 5),
      child: pw.RichText(
        text: pw.TextSpan(
          children: [
            pw.TextSpan(
              text: '${item.label}:  ',
              style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600),
            ),
            pw.TextSpan(
              text: item.value,
              style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  static pw.Widget _buildSubjectTable(ExamResult result, PdfColor primary) {
    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
      columnWidths: {
        0: const pw.FlexColumnWidth(3.5),
        1: const pw.FlexColumnWidth(1.5),
        2: const pw.FlexColumnWidth(1.5),
        3: const pw.FlexColumnWidth(1.2),
        4: const pw.FlexColumnWidth(1.2),
      },
      children: [
        pw.TableRow(
          decoration: pw.BoxDecoration(color: primary),
          children: [
            _th('Subject'),
            _th('Obtained'),
            _th('Total'),
            _th('%'),
            _th('Status'),
          ],
        ),
        ...result.subjectMarks.map((sm) {
          final statusColor = sm.isAbsent
              ? PdfColors.grey600
              : sm.isPassed
                  ? PdfColors.green700
                  : PdfColors.red700;
          return pw.TableRow(
            children: [
              _td(sm.subjectName),
              _td(sm.isAbsent ? '—' : sm.marksObtained.toStringAsFixed(0)),
              _td(sm.totalMarks.toStringAsFixed(0)),
              _td(sm.isAbsent ? '—' : '${sm.percentage.toStringAsFixed(1)}%'),
              _td(
                sm.isAbsent ? 'Absent' : (sm.isPassed ? 'Pass' : 'Fail'),
                color: statusColor,
                bold: true,
              ),
            ],
          );
        }),
      ],
    );
  }

  static pw.Widget _th(String text) => pw.Padding(
        padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 7),
        child: pw.Text(text,
            style: pw.TextStyle(
                fontSize: 9,
                color: PdfColors.white,
                fontWeight: pw.FontWeight.bold)),
      );

  static pw.Widget _td(String text, {PdfColor? color, bool bold = false}) =>
      pw.Padding(
        padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        child: pw.Text(
          text,
          style: pw.TextStyle(
            fontSize: 9,
            color: color ?? PdfColors.black,
            fontWeight: bold ? pw.FontWeight.bold : null,
          ),
        ),
      );

  static pw.Widget _buildSummaryRow(
      ExamResult result, PdfColor primary, PdfColor resultColor) {
    return pw.Row(
      children: [
        _summaryBox(
          label: 'Total Marks',
          value:
              '${result.totalMarksObtained.toStringAsFixed(0)} / ${result.totalMarks.toStringAsFixed(0)}',
          borderColor: primary,
        ),
        pw.SizedBox(width: 10),
        _summaryBox(
          label: 'Percentage',
          value: '${result.percentage.toStringAsFixed(1)}%',
          borderColor: primary,
        ),
        pw.SizedBox(width: 10),
        _summaryBox(
          label: 'Grade',
          value: result.grade,
          borderColor: primary,
        ),
        pw.SizedBox(width: 10),
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: pw.BoxDecoration(
            color: resultColor,
            borderRadius: pw.BorderRadius.circular(8),
          ),
          child: pw.Text(
            result.isPassed ? 'PASSED' : 'FAILED',
            style: pw.TextStyle(
              fontSize: 13,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
            ),
          ),
        ),
      ],
    );
  }

  static pw.Widget _summaryBox({
    required String label,
    required String value,
    required PdfColor borderColor,
  }) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.all(12),
        decoration: pw.BoxDecoration(
          border: pw.Border.all(color: borderColor),
          borderRadius: pw.BorderRadius.circular(8),
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Text(value,
                style: pw.TextStyle(
                    fontSize: 16,
                    fontWeight: pw.FontWeight.bold,
                    color: borderColor)),
            pw.SizedBox(height: 3),
            pw.Text(label,
                style:
                    const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
          ],
        ),
      ),
    );
  }

  static pw.Widget _buildRemarks(String remarks) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: PdfColors.amber50,
        border: pw.Border.all(color: PdfColors.amber300),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('Remarks',
              style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          pw.Text(remarks, style: const pw.TextStyle(fontSize: 9)),
        ],
      ),
    );
  }

  static pw.Widget _buildFooter() {
    return pw.Column(
      children: [
        pw.Divider(color: PdfColors.grey300),
        pw.SizedBox(height: 5),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('Generated by EduStack PK — WolfStack',
                style:
                    const pw.TextStyle(fontSize: 7, color: PdfColors.grey500)),
            pw.Text('This is a computer-generated document.',
                style:
                    const pw.TextStyle(fontSize: 7, color: PdfColors.grey500)),
          ],
        ),
      ],
    );
  }

  // ── Helpers ───────────────────────────────────────────────

  static PdfColor _hexColor(String hex) {
    try {
      final h = hex.replaceFirst('#', '');
      final r = int.parse(h.substring(0, 2), radix: 16) / 255;
      final g = int.parse(h.substring(2, 4), radix: 16) / 255;
      final b = int.parse(h.substring(4, 6), radix: 16) / 255;
      return PdfColor(r, g, b);
    } catch (_) {
      return const PdfColor(0.118, 0.227, 0.373); // #1e3a5f fallback
    }
  }
}

class _InfoItem {
  final String label;
  final String value;
  const _InfoItem(this.label, this.value);
}
