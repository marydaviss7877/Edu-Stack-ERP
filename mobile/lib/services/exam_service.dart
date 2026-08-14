import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/result.dart';
import '../models/timetable.dart';

class ExamService {
  final Dio _dio = DioClient.instance;

  // Student: all results ordered by exam date desc
  Future<List<ExamResult>> getMyResults() async {
    final res = await _dio.get('${ApiConstants.exams}/my-results');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load results');
    return (data['data'] as List)
        .map((e) => ExamResult.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Latest single result for dashboard stat card
  Future<ExamResult?> getLatestResult() async {
    final results = await getMyResults();
    return results.isEmpty ? null : results.first;
  }

  // Upcoming exams that haven't started yet
  Future<List<UpcomingExam>> getUpcomingExams() async {
    final res =
        await _dio.get(ApiConstants.exams, queryParameters: {'upcoming': true});
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List)
        .map((e) => UpcomingExam.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Teacher: get class marks for an exam
  Future<List<Map<String, dynamic>>> getClassMarks(
      String examId, String classId, String sectionId) async {
    final res = await _dio.get(
      '${ApiConstants.exams}/$examId/marks',
      queryParameters: {'classId': classId, 'sectionId': sectionId},
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load marks');
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // Teacher: submit/update marks for a student
  Future<void> saveMarks(String examId, Map<String, dynamic> payload) async {
    await _dio.post('${ApiConstants.exams}/$examId/marks', data: payload);
  }
}
