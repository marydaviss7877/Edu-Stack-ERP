import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/challan.dart';

class AccountantService {
  final Dio _dio = DioClient.instance;

  // All challans (branch-wide, paginated)
  Future<List<Challan>> getAllChallans(
      {String? status, String? month, int page = 1}) async {
    final res = await _dio.get(
      ApiConstants.fees,
      queryParameters: {
        'page': page,
        'limit': 30,
        if (status != null) 'status': status,
        if (month != null) 'month': month,
      },
    );
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load challans');
    return (data['data'] as List)
        .map((e) => Challan.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Monthly collection summary
  Future<Map<String, dynamic>> getMonthlySummary(String month) async {
    try {
      final res = await _dio.get('${ApiConstants.fees}/summary',
          queryParameters: {'month': month});
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) return data['data'] as Map<String, dynamic>;
    } catch (_) {}
    return {};
  }

  // Record manual payment against a challan
  Future<void> recordPayment({
    required String challanId,
    required double amount,
    required String paymentMethod,
    String? referenceNo,
  }) async {
    await _dio.post(
      '${ApiConstants.fees}/$challanId/payment',
      data: {
        'amount': amount,
        'paymentMethod': paymentMethod,
        if (referenceNo != null) 'referenceNo': referenceNo,
      },
    );
  }

  // Overdue challans count
  Future<int> getOverdueCount() async {
    try {
      final res = await _dio.get('${ApiConstants.fees}/overdue-count');
      final data = res.data as Map<String, dynamic>;
      return (data['data']?['count'] as int?) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  // Fee collection dashboard stats
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final res = await _dio.get('${ApiConstants.fees}/dashboard-stats');
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true) return data['data'] as Map<String, dynamic>;
    } catch (_) {}
    return {};
  }
}
