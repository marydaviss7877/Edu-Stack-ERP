class SubjectMark {
  final String subjectId;
  final String subjectName;
  final double marksObtained;
  final double totalMarks;
  final bool isAbsent;
  final bool isPassed;

  const SubjectMark({
    required this.subjectId,
    required this.subjectName,
    required this.marksObtained,
    required this.totalMarks,
    required this.isAbsent,
    required this.isPassed,
  });

  double get percentage =>
      totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;

  factory SubjectMark.fromJson(Map<String, dynamic> j) {
    final sub = j['subjectId'];
    return SubjectMark(
      subjectId: sub is Map ? sub['_id'] as String : sub as String,
      subjectName: sub is Map ? (sub['name'] as String? ?? '') : '',
      marksObtained: (j['marksObtained'] as num).toDouble(),
      totalMarks: (j['totalMarks'] as num).toDouble(),
      isAbsent: j['isAbsent'] as bool? ?? false,
      isPassed: j['isPassed'] as bool? ?? false,
    );
  }
}

class ExamResult {
  final String id;
  final String examId;
  final String examName;
  final List<SubjectMark> subjectMarks;
  final double totalMarksObtained;
  final double totalMarks;
  final double percentage;
  final String grade;
  final int? classPosition;
  final int? sectionPosition;
  final bool isPassed;
  final String? remarks;

  const ExamResult({
    required this.id,
    required this.examId,
    required this.examName,
    required this.subjectMarks,
    required this.totalMarksObtained,
    required this.totalMarks,
    required this.percentage,
    required this.grade,
    required this.isPassed,
    this.classPosition,
    this.sectionPosition,
    this.remarks,
  });

  factory ExamResult.fromJson(Map<String, dynamic> j) {
    final exam = j['examId'];
    return ExamResult(
      id: j['_id'] as String,
      examId: exam is Map ? exam['_id'] as String : exam as String,
      examName: exam is Map ? (exam['name'] as String? ?? '') : '',
      subjectMarks: (j['subjectMarks'] as List? ?? [])
          .map((s) => SubjectMark.fromJson(s as Map<String, dynamic>))
          .toList(),
      totalMarksObtained: (j['totalMarksObtained'] as num).toDouble(),
      totalMarks: (j['totalMarks'] as num).toDouble(),
      percentage: (j['percentage'] as num).toDouble(),
      grade: j['grade'] as String,
      classPosition: j['classPosition'] as int?,
      sectionPosition: j['sectionPosition'] as int?,
      isPassed: j['isPassed'] as bool,
      remarks: j['remarks'] as String?,
    );
  }
}
