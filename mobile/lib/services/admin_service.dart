import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';

class AdminService {
  final Dio _dio = DioClient.instance;

  // ── Org-wide stats ────────────────────────────────────────

  Future<Map<String, dynamic>> getOrgStats() async {
    try {
      final res = await _dio.get('/admin/stats');
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) return data['data'] as Map<String, dynamic>;
    } catch (_) {}
    return {};
  }

  // ── User management ───────────────────────────────────────

  Future<List<Map<String, dynamic>>> getUsers(
      {String? role, int page = 1}) async {
    final res = await _dio.get(
      '/users',
      queryParameters: {
        'page': page,
        'limit': 20,
        if (role != null) 'role': role
      },
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load users');
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  Future<void> toggleUserStatus(String userId, bool active) async {
    await _dio.put('/users/$userId', data: {'active': active});
  }

  // ── QR code ───────────────────────────────────────────────

  Future<String> generateQrCode(String orgId) async {
    final res =
        await _dio.post('${ApiConstants.generateQr}/$orgId/generate-qr');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to generate QR');
    return data['data']['qrData'] as String;
  }

  // ── Branches ─────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getBranches() async {
    final res = await _dio.get('/branches');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }

  // ── Super Admin: all orgs ─────────────────────────────────

  Future<List<Map<String, dynamic>>> getAllOrgs() async {
    final res = await _dio.get('/organizations');
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return [];
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }
}
