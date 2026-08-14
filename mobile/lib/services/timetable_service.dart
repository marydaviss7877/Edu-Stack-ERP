import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/timetable.dart';

class TimetableService {
  final Dio _dio = DioClient.instance;

  Future<Timetable?> getMyTimetable() async {
    final res = await _dio.get('${ApiConstants.timetable}/my');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return null;
    final raw = data['data'];
    if (raw == null) return null;
    return Timetable.fromJson(raw as Map<String, dynamic>);
  }

  // Returns today's slots enriched with period timings + isNow flag
  Future<List<TodaySlot>> getTodaySlots() async {
    final timetable = await getMyTimetable();
    if (timetable == null) return [];
    final today = DateTime.now().weekday; // 1=Mon … 7=Sun
    return TodaySlot.fromTimetable(timetable, today);
  }

  // For teacher: timetable for a specific class/section
  Future<Timetable?> getTimetableForSection(
      String classId, String sectionId) async {
    final res = await _dio.get(
      ApiConstants.timetable,
      queryParameters: {'classId': classId, 'sectionId': sectionId},
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return null;
    final list = data['data'] as List?;
    if (list == null || list.isEmpty) return null;
    return Timetable.fromJson(list.first as Map<String, dynamic>);
  }
}
