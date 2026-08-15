import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/student_progress.dart';

class ProgressService {
  final Dio _dio = DioClient.instance;

  // Student: weekly topic coverage + syllabus mastery, optionally scoped to one subject
  Future<StudentProgress> getMyProgress({String? subjectId}) async {
    final res = await _dio.get(
      '${ApiConstants.papers}/my-progress',
      queryParameters: {
        if (subjectId != null && subjectId.isNotEmpty) 'subjectId': subjectId,
      },
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load progress');
    return StudentProgress.fromJson(data['data'] as Map<String, dynamic>);
  }
}
