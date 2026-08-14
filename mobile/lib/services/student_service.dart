import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/timetable.dart';
import '../models/student_profile.dart';

class StudentService {
  final Dio _dio = DioClient.instance;

  // Fetches the rich student profile (class, section, rollNo, guardian, etc.)
  Future<StudentProfile> getStudentProfile() async {
    try {
      final res = await _dio.get('${ApiConstants.students}/my-profile');
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) {
        return StudentProfile.fromJson(data['data'] as Map<String, dynamic>);
      }
    } catch (_) {}
    // Fallback to /auth/me if student profile endpoint not ready
    final res = await _dio.get(ApiConstants.me);
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load profile');
    return StudentProfile.fromAuthMe(data['data'] as Map<String, dynamic>);
  }

  Future<AttendanceSummary> getAttendanceSummary() async {
    final res = await _dio.get('${ApiConstants.myAttendance}/summary');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) {
      throw Exception('Failed to load attendance summary');
    }
    return AttendanceSummary.fromJson(data['data'] as Map<String, dynamic>);
  }

  // Returns list of class fellows for the student's section
  Future<List<Map<String, dynamic>>> getClassFellows() async {
    final res = await _dio.get('${ApiConstants.students}/class-fellows');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) {
      throw Exception('Failed to load class fellows');
    }
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }
}
