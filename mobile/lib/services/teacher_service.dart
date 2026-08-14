import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';

class TeacherService {
  final Dio _dio = DioClient.instance;

  // Classes the teacher is assigned to (from timetable)
  Future<List<Map<String, dynamic>>> getMyClasses() async {
    final res = await _dio.get('${ApiConstants.timetable}/my-classes');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // Today's periods for the teacher (with class info)
  Future<List<Map<String, dynamic>>> getTodayPeriods() async {
    final res = await _dio.get('${ApiConstants.timetable}/teacher-today');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // Summary stats: total students, pending attendance, pending marks
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final res = await _dio.get('/teachers/dashboard-stats');
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) return data['data'] as Map<String, dynamic>;
    } catch (_) {}
    return {};
  }

  // Students for a specific class/section (for attendance & marks)
  Future<List<Map<String, dynamic>>> getStudents(
      String classId, String sectionId) async {
    final res = await _dio.get(
      ApiConstants.students,
      queryParameters: {'classId': classId, 'sectionId': sectionId},
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load students');
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // Exams available for mark entry (teacher's subjects only)
  Future<List<Map<String, dynamic>>> getActiveExams() async {
    final res =
        await _dio.get(ApiConstants.exams, queryParameters: {'active': true});
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }
}
