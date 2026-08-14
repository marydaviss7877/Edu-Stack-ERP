class Assignment {
  final String id;
  final String title;
  final String description;
  final String subjectId;
  final String subjectName;
  final DateTime dueDate;
  final double? totalMarks;
  final String? attachmentUrl;
  final bool isActive;

  const Assignment({
    required this.id,
    required this.title,
    required this.description,
    required this.subjectId,
    required this.subjectName,
    required this.dueDate,
    required this.isActive,
    this.totalMarks,
    this.attachmentUrl,
  });

  bool get isOverdue => dueDate.isBefore(DateTime.now());
  int get daysLeft => dueDate.difference(DateTime.now()).inDays;

  factory Assignment.fromJson(Map<String, dynamic> j) {
    final sub = j['subjectId'];
    return Assignment(
      id: j['_id'] as String,
      title: j['title'] as String,
      description: j['description'] as String,
      subjectId: sub is Map ? sub['_id'] as String : sub as String,
      subjectName: sub is Map ? (sub['name'] as String? ?? '') : '',
      dueDate: DateTime.parse(j['dueDate'] as String),
      totalMarks: (j['totalMarks'] as num?)?.toDouble(),
      attachmentUrl: j['attachmentUrl'] as String?,
      isActive: j['isActive'] as bool? ?? true,
    );
  }
}
