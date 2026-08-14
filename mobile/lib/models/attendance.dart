class AttendanceRecord {
  final DateTime date;
  final String status; // present | absent | late | excused
  final String? note;

  const AttendanceRecord({
    required this.date,
    required this.status,
    this.note,
  });

  bool get isPresent => status == 'present';
  bool get isAbsent => status == 'absent';
  bool get isLate => status == 'late';
  bool get isExcused => status == 'excused';

  factory AttendanceRecord.fromJson(Map<String, dynamic> j) => AttendanceRecord(
        date: DateTime.parse(j['date'] as String),
        status: j['status'] as String,
        note: j['note'] as String?,
      );
}

// For teacher: full class attendance document
class ClassAttendance {
  final String id;
  final DateTime date;
  final int? periodNo;
  final List<StudentAttendanceRecord> records;

  const ClassAttendance({
    required this.id,
    required this.date,
    this.periodNo,
    required this.records,
  });

  factory ClassAttendance.fromJson(Map<String, dynamic> j) => ClassAttendance(
        id: j['_id'] as String,
        date: DateTime.parse(j['date'] as String),
        periodNo: j['periodNo'] as int?,
        records: (j['records'] as List? ?? [])
            .map((r) =>
                StudentAttendanceRecord.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
}

class StudentAttendanceRecord {
  final String studentId;
  final String studentName;
  final String rollNo;
  String status; // mutable for teacher marking flow

  StudentAttendanceRecord({
    required this.studentId,
    required this.studentName,
    required this.rollNo,
    required this.status,
  });

  factory StudentAttendanceRecord.fromJson(Map<String, dynamic> j) {
    final stu = j['studentId'];
    return StudentAttendanceRecord(
      studentId: stu is Map ? stu['_id'] as String : stu as String,
      studentName: stu is Map ? (stu['profile']?['name'] as String? ?? '') : '',
      rollNo: stu is Map ? (stu['rollNo'] as String? ?? '') : '',
      status: j['status'] as String? ?? 'present',
    );
  }
}

// Offline queue entry stored in Hive
class OfflineAttendanceEntry {
  final String classId;
  final String sectionId;
  final String date; // ISO string
  final int periodNo;
  final List<Map<String, String>> records; // [{ studentId, status }]
  final DateTime createdAt;

  const OfflineAttendanceEntry({
    required this.classId,
    required this.sectionId,
    required this.date,
    required this.periodNo,
    required this.records,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'sectionId': sectionId,
        'date': date,
        'periodNo': periodNo,
        'records': records,
        'createdAt': createdAt.toIso8601String(),
      };
}
