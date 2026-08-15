class ProgressWeeklyRow {
  final String paperId;
  final String subjectId;
  final String subjectName;
  final String subjectCode;
  final String topicName;
  final int? chapterNumber;
  final int weekNumber;
  final DateTime scheduledDate;
  final double percentage;
  final bool isWeak;
  final bool isAbsent;

  const ProgressWeeklyRow({
    required this.paperId,
    required this.subjectId,
    required this.subjectName,
    required this.subjectCode,
    required this.topicName,
    required this.chapterNumber,
    required this.weekNumber,
    required this.scheduledDate,
    required this.percentage,
    required this.isWeak,
    required this.isAbsent,
  });

  factory ProgressWeeklyRow.fromJson(Map<String, dynamic> j) {
    final chapter = j['chapterNumber'] as int?;
    return ProgressWeeklyRow(
      paperId: j['paperId'] as String,
      subjectId: j['subjectId'] as String,
      subjectName: j['subjectName'] as String? ?? '',
      subjectCode: j['subjectCode'] as String? ?? '',
      topicName: (j['topicName'] as String?) ??
          (chapter != null ? 'Chapter $chapter' : 'Topic test'),
      chapterNumber: chapter,
      weekNumber: j['weekNumber'] as int? ?? 0,
      scheduledDate: DateTime.parse(j['scheduledDate'] as String),
      percentage: (j['percentage'] as num).toDouble(),
      isWeak: j['isWeak'] as bool? ?? false,
      isAbsent: j['isAbsent'] as bool? ?? false,
    );
  }
}

class SubjectMastery {
  final String subjectId;
  final String subjectName;
  final String subjectCode;
  final int totalTopics;
  final int topicsTested;
  final int topicsWeak;
  final int topicsMastered;
  final double masteryPct;

  const SubjectMastery({
    required this.subjectId,
    required this.subjectName,
    required this.subjectCode,
    required this.totalTopics,
    required this.topicsTested,
    required this.topicsWeak,
    required this.topicsMastered,
    required this.masteryPct,
  });

  factory SubjectMastery.fromJson(Map<String, dynamic> j) {
    return SubjectMastery(
      subjectId: j['subjectId'] as String,
      subjectName: j['subjectName'] as String? ?? 'Unknown',
      subjectCode: j['subjectCode'] as String? ?? '',
      totalTopics: j['totalTopics'] as int? ?? 0,
      topicsTested: j['topicsTested'] as int? ?? 0,
      topicsWeak: j['topicsWeak'] as int? ?? 0,
      topicsMastered: j['topicsMastered'] as int? ?? 0,
      masteryPct: (j['masteryPct'] as num?)?.toDouble() ?? 0,
    );
  }
}

class StudentProgress {
  final List<ProgressWeeklyRow> weekly;
  final List<SubjectMastery> subjects;
  final int overallTotalTopics;
  final int overallTopicsMastered;
  final double overallMasteryPct;

  const StudentProgress({
    required this.weekly,
    required this.subjects,
    required this.overallTotalTopics,
    required this.overallTopicsMastered,
    required this.overallMasteryPct,
  });

  factory StudentProgress.fromJson(Map<String, dynamic> j) {
    final overall = j['overall'] as Map<String, dynamic>? ?? {};
    return StudentProgress(
      weekly: (j['weekly'] as List? ?? [])
          .map((e) => ProgressWeeklyRow.fromJson(e as Map<String, dynamic>))
          .toList(),
      subjects: (j['subjects'] as List? ?? [])
          .map((e) => SubjectMastery.fromJson(e as Map<String, dynamic>))
          .toList(),
      overallTotalTopics: overall['totalTopics'] as int? ?? 0,
      overallTopicsMastered: overall['topicsMastered'] as int? ?? 0,
      overallMasteryPct: (overall['masteryPct'] as num?)?.toDouble() ?? 0,
    );
  }

  static const empty = StudentProgress(
    weekly: [],
    subjects: [],
    overallTotalTopics: 0,
    overallTopicsMastered: 0,
    overallMasteryPct: 0,
  );
}
