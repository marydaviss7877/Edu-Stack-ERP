import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/assignment.dart';

class AssignmentService {
  final Dio _dio = DioClient.instance;

  Future<List<Assignment>> getMyAssignments({bool pendingOnly = false}) async {
    final res = await _dio.get(
      ApiConstants.assignments,
      queryParameters: pendingOnly ? {'status': 'pending'} : null,
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load assignments');
    return (data['data'] as List)
        .map((e) => Assignment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Assignment> getAssignment(String id) async {
    final res = await _dio.get('${ApiConstants.assignments}/$id');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load assignment');
    return Assignment.fromJson(data['data'] as Map<String, dynamic>);
  }

  // Teacher: create assignment
  Future<Assignment> createAssignment(Map<String, dynamic> payload) async {
    final res = await _dio.post(ApiConstants.assignments, data: payload);
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to create assignment');
    return Assignment.fromJson(data['data'] as Map<String, dynamic>);
  }

  // Teacher: list submissions for an assignment
  Future<List<Map<String, dynamic>>> getSubmissions(String assignmentId) async {
    final res =
        await _dio.get('${ApiConstants.assignments}/$assignmentId/submissions');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load submissions');
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }
}
