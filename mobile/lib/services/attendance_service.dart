import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../core/constants/storage_keys.dart';
import '../models/attendance.dart';
import '../models/timetable.dart';

class AttendanceService {
  final Dio _dio = DioClient.instance;

  // ── Student ─────────────────────────────────────────

  Future<List<AttendanceRecord>> getMyAttendance({String? month}) async {
    final res = await _dio.get(
      ApiConstants.myAttendance,
      queryParameters: month != null ? {'month': month} : null,
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load attendance');
    return (data['data'] as List)
        .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<AttendanceSummary> getSummary() async {
    final res = await _dio.get('${ApiConstants.myAttendance}/summary');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load summary');
    return AttendanceSummary.fromJson(data['data'] as Map<String, dynamic>);
  }

  // ── Teacher ─────────────────────────────────────────

  // Get today's attendance for a class (or null if not yet taken)
  Future<ClassAttendance?> getTodayAttendance(
      String classId, String sectionId, int periodNo) async {
    final today = DateTime.now().toIso8601String().split('T').first;
    final res = await _dio.get(
      ApiConstants.attendance,
      queryParameters: {
        'classId': classId,
        'sectionId': sectionId,
        'date': today,
        'periodNo': periodNo,
      },
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return null;
    final list = data['data'] as List?;
    if (list == null || list.isEmpty) return null;
    return ClassAttendance.fromJson(list.first as Map<String, dynamic>);
  }

  // Submit attendance — online path
  Future<void> submitAttendance({
    required String classId,
    required String sectionId,
    required String date,
    required int periodNo,
    required List<Map<String, String>> records,
  }) async {
    await _dio.post(ApiConstants.attendance, data: {
      'classId': classId,
      'sectionId': sectionId,
      'date': date,
      'periodNo': periodNo,
      'records': records,
    });
  }

  // ── Offline queue ────────────────────────────────────

  Future<void> queueOffline(OfflineAttendanceEntry entry) async {
    final box = Hive.box<Map>(StorageKeys.offlineAttendanceBox);
    await box.add(entry.toJson());
  }

  Future<void> syncOfflineQueue() async {
    final box = Hive.box<Map>(StorageKeys.offlineAttendanceBox);
    if (box.isEmpty) return;

    final keys = box.keys.toList();
    for (final key in keys) {
      final raw = box.get(key);
      if (raw == null) continue;
      try {
        final entry = raw.cast<String, dynamic>();
        await submitAttendance(
          classId: entry['classId'] as String,
          sectionId: entry['sectionId'] as String,
          date: entry['date'] as String,
          periodNo: entry['periodNo'] as int,
          records: (entry['records'] as List).cast<Map<String, String>>(),
        );
        await box.delete(key);
      } catch (_) {
        // Leave failed entries for next sync attempt
      }
    }
  }

  int get pendingOfflineCount =>
      Hive.box<Map>(StorageKeys.offlineAttendanceBox).length;
}
