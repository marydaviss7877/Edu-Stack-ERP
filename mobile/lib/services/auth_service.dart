import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/user.dart';

class AuthService {
  final Dio _dio = DioClient.instance;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    required String slug,
    required String loginAs,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
          'slug': slug,
          'loginAs': loginAs
        },
      );
      final data = response.data as Map<String, dynamic>;
      if (data['success'] != true) {
        throw Exception(data['message'] ?? 'Login failed');
      }
      final payload = data['data'] as Map<String, dynamic>?;
      if (payload == null || payload['mustChangePassword'] == true) {
        throw Exception('PASSWORD_CHANGE_REQUIRED');
      }
      return payload;
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = (body is Map) ? body['message'] as String? : null;
      throw Exception(message ?? 'Login failed. Please try again.');
    }
  }

  Future<AppUser> getMe() async {
    final response = await _dio.get(ApiConstants.me);
    final data = response.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Session invalid');
    return AppUser.fromJson(data['data'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiConstants.logout);
    } catch (_) {}
  }

  Future<void> registerFcmToken(String token) async {
    try {
      await _dio.post(ApiConstants.fcmToken, data: {'fcmToken': token});
    } catch (_) {}
  }

  Future<void> removeFcmToken(String token) async {
    try {
      await _dio.delete(ApiConstants.fcmToken, data: {'fcmToken': token});
    } catch (_) {}
  }
}
