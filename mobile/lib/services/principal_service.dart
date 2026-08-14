import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';

class PrincipalService {
  final Dio _dio = DioClient.instance;

  // School-wide attendance for today
  Future<Map<String, dynamic>> getTodayAttendanceOverview() async {
    try {
      final today = DateTime.now().toIso8601String().split('T').first;
      final res = await _dio.get('${ApiConstants.attendance}/overview',
          queryParameters: {'date': today});
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) return data['data'] as Map<String, dynamic>;
    } catch (_) {}
    return {};
  }

  // Attendance by class for a given date
  Future<List<Map<String, dynamic>>> getAttendanceByClass(
      {String? date}) async {
    final d = date ?? DateTime.now().toIso8601String().split('T').first;
    final res = await _dio.get('${ApiConstants.attendance}/by-class',
        queryParameters: {'date': d});
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // Class-wise result performance (latest exam)
  Future<List<Map<String, dynamic>>> getClassPerformance() async {
    try {
      final res = await _dio.get('/reports/class-performance');
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) {
        return (data['data'] as List).cast<Map<String, dynamic>>();
      }
    } catch (_) {}
    return [];
  }

  // Staff who marked attendance today
  Future<Map<String, dynamic>> getStaffAttendanceToday() async {
    try {
      final today = DateTime.now().toIso8601String().split('T').first;
      final res = await _dio.get('/staff-attendance/today-summary',
          queryParameters: {'date': today});
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) return data['data'] as Map<String, dynamic>;
    } catch (_) {}
    return {};
  }

  // Upcoming exams in the next 30 days
  Future<List<Map<String, dynamic>>> getUpcomingExams() async {
    final res = await _dio.get(ApiConstants.exams,
        queryParameters: {'upcoming': true, 'limit': 5});
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // Students with attendance below threshold
  Future<List<Map<String, dynamic>>> getLowAttendanceStudents() async {
    try {
      final res = await _dio.get('${ApiConstants.attendance}/low',
          queryParameters: {'threshold': 75});
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) {
        return (data['data'] as List).cast<Map<String, dynamic>>();
      }
    } catch (_) {}
    return [];
  }
}
