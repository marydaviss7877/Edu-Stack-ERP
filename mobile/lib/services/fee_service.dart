import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/challan.dart';

class FeeService {
  final Dio _dio = DioClient.instance;

  Future<List<Challan>> getMyChallans() async {
    final res = await _dio.get(ApiConstants.fees);
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) throw Exception('Failed to load challans');
    return (data['data'] as List)
        .map((e) => Challan.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Latest unpaid challan for dashboard stat card
  Future<Challan?> getLatestUnpaid() async {
    final challans = await getMyChallans();
    try {
      return challans.firstWhere((c) => !c.isPaid);
    } catch (_) {
      return null;
    }
  }

  // Total outstanding balance
  double totalBalance(List<Challan> challans) =>
      challans.where((c) => !c.isPaid).fold(0.0, (sum, c) => sum + c.balance);
}
