import 'package:flutter/material.dart';

class PeriodTiming {
  final int periodNo;
  final String startTime;
  final String endTime;

  const PeriodTiming({
    required this.periodNo,
    required this.startTime,
    required this.endTime,
  });

  factory PeriodTiming.fromJson(Map<String, dynamic> j) => PeriodTiming(
        periodNo: j['periodNo'] as int,
        startTime: j['startTime'] as String,
        endTime: j['endTime'] as String,
      );
}

class TimetableSlot {
  final int dayOfWeek;
  final int periodNo;
  final String subjectId;
  final String subjectName;
  final String teacherId;
  final String teacherName;
  final String? roomNo;

  const TimetableSlot({
    required this.dayOfWeek,
    required this.periodNo,
    required this.subjectId,
    required this.subjectName,
    required this.teacherId,
    required this.teacherName,
    this.roomNo,
  });

  factory TimetableSlot.fromJson(Map<String, dynamic> j) {
    final sub = j['subjectId'];
    final tch = j['teacherId'];
    return TimetableSlot(
      dayOfWeek: j['dayOfWeek'] as int,
      periodNo: j['periodNo'] as int,
      subjectId: sub is Map ? sub['_id'] as String : sub as String,
      subjectName: sub is Map ? (sub['name'] as String? ?? '') : '',
      teacherId: tch is Map ? tch['_id'] as String : tch as String,
      teacherName: tch is Map ? (tch['name'] as String? ?? '') : '',
      roomNo: j['roomNo'] as String?,
    );
  }
}

class Timetable {
  final String id;
  final String classId;
  final String sectionId;
  final List<TimetableSlot> slots;
  final List<PeriodTiming> periodTimings;
  final bool isActive;

  const Timetable({
    required this.id,
    required this.classId,
    required this.sectionId,
    required this.slots,
    required this.periodTimings,
    required this.isActive,
  });

  factory Timetable.fromJson(Map<String, dynamic> j) => Timetable(
        id: j['_id'] as String,
        classId: j['classId']?.toString() ?? '',
        sectionId: j['sectionId']?.toString() ?? '',
        slots: (j['slots'] as List? ?? [])
            .map((s) => TimetableSlot.fromJson(s as Map<String, dynamic>))
            .toList(),
        periodTimings: (j['periodTimings'] as List? ?? [])
            .map((p) => PeriodTiming.fromJson(p as Map<String, dynamic>))
            .toList(),
        isActive: j['isActive'] as bool? ?? false,
      );

  List<TimetableSlot> slotsForDay(int dayOfWeek) =>
      slots.where((s) => s.dayOfWeek == dayOfWeek).toList()
        ..sort((a, b) => a.periodNo.compareTo(b.periodNo));
}

// Derived model: a slot enriched with timing info + isNow flag for the dashboard
class TodaySlot {
  final int periodNo;
  final String subjectName;
  final String teacherName;
  final String startTime;
  final String endTime;
  final String? roomNo;
  final bool isNow;

  const TodaySlot({
    required this.periodNo,
    required this.subjectName,
    required this.teacherName,
    required this.startTime,
    required this.endTime,
    this.roomNo,
    this.isNow = false,
  });

  static List<TodaySlot> fromTimetable(Timetable timetable, int dayOfWeek) {
    final slots = timetable.slotsForDay(dayOfWeek);
    final now = TimeOfDay.now();
    return slots.map((slot) {
      final timing = timetable.periodTimings.firstWhere(
        (t) => t.periodNo == slot.periodNo,
        orElse: () =>
            PeriodTiming(periodNo: slot.periodNo, startTime: '', endTime: ''),
      );
      return TodaySlot(
        periodNo: slot.periodNo,
        subjectName: slot.subjectName,
        teacherName: slot.teacherName,
        startTime: timing.startTime,
        endTime: timing.endTime,
        roomNo: slot.roomNo,
        isNow: _isCurrent(timing, now),
      );
    }).toList();
  }

  static bool _isCurrent(PeriodTiming t, TimeOfDay now) {
    if (t.startTime.isEmpty || t.endTime.isEmpty) return false;
    try {
      final start = _parseMinutes(t.startTime);
      final end = _parseMinutes(t.endTime);
      final nowMin = now.hour * 60 + now.minute;
      return nowMin >= start && nowMin < end;
    } catch (_) {
      return false;
    }
  }

  static int _parseMinutes(String timeStr) {
    final parts = timeStr.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }
}

// Attendance summary for dashboard stat card
class AttendanceSummary {
  final int totalDays;
  final int presentDays;
  final int absentDays;
  final int lateDays;

  const AttendanceSummary({
    required this.totalDays,
    required this.presentDays,
    required this.absentDays,
    required this.lateDays,
  });

  double get percentage =>
      totalDays > 0 ? (presentDays + lateDays * 0.5) / totalDays * 100 : 0;

  factory AttendanceSummary.fromJson(Map<String, dynamic> j) =>
      AttendanceSummary(
        totalDays: j['totalDays'] as int? ?? 0,
        presentDays: j['presentDays'] as int? ?? 0,
        absentDays: j['absentDays'] as int? ?? 0,
        lateDays: j['lateDays'] as int? ?? 0,
      );
}

// Upcoming exam card model
class UpcomingExam {
  final String id;
  final String name;
  final String type;
  final DateTime startDate;
  final List<String> subjects;

  const UpcomingExam({
    required this.id,
    required this.name,
    required this.type,
    required this.startDate,
    required this.subjects,
  });

  int get daysLeft => startDate.difference(DateTime.now()).inDays;

  factory UpcomingExam.fromJson(Map<String, dynamic> j) => UpcomingExam(
        id: j['_id'] as String,
        name: j['name'] as String,
        type: j['type'] as String? ?? 'exam',
        startDate: DateTime.parse(j['startDate'] as String),
        subjects: (j['subjects'] as List? ?? [])
            .map((s) => s is Map ? (s['name'] as String? ?? '') : s as String)
            .toList(),
      );
}
