import 'package:dio/dio.dart';

import '../core/network/dio_client.dart';

class InventoryService {
  final Dio _dio = DioClient.instance;

  Future<Map<String, dynamic>> getDashboard() async {
    final res = await _dio.get('/inventory/dashboard');
    return _dataMap(res);
  }

  Future<Map<String, dynamic>> getFinanceSummary({
    String? month,
    bool includeBenchmarks = true,
  }) async {
    final res = await _dio.get('/inventory/finance-summary', queryParameters: {
      if (month != null) 'month': month,
      'includeBenchmarks': includeBenchmarks,
    });
    return _dataMap(res);
  }

  Future<List<Map<String, dynamic>>> getItems() async {
    final res = await _dio.get('/inventory/items');
    return _dataList(res);
  }

  Future<List<Map<String, dynamic>>> getExpenses() async {
    final res = await _dio.get('/inventory/expenses');
    return _dataList(res);
  }

  Future<List<Map<String, dynamic>>> getIncome() async {
    final res = await _dio.get('/inventory/income');
    return _dataList(res);
  }

  Future<List<Map<String, dynamic>>> getProcurements() async {
    final res = await _dio.get('/inventory/procurements');
    return _dataList(res);
  }

  Future<List<Map<String, dynamic>>> getBranches() async {
    final res = await _dio.get('/branches');
    return _dataList(res);
  }

  Future<void> createItem(Map<String, dynamic> data) async {
    await _dio.post('/inventory/items', data: data);
  }

  Future<void> createExpense(Map<String, dynamic> data) async {
    await _dio.post('/inventory/expenses', data: data);
  }

  Future<void> createIncome(Map<String, dynamic> data) async {
    await _dio.post('/inventory/income', data: data);
  }

  Future<void> createProcurement(Map<String, dynamic> data) async {
    await _dio.post('/inventory/procurements', data: data);
  }

  Map<String, dynamic> _dataMap(Response<dynamic> response) {
    final body = response.data as Map<String, dynamic>;
    if (body['success'] != true) throw Exception('Request failed');
    return body['data'] as Map<String, dynamic>;
  }

  List<Map<String, dynamic>> _dataList(Response<dynamic> response) {
    final body = response.data as Map<String, dynamic>;
    if (body['success'] != true) throw Exception('Request failed');
    return (body['data'] as List).cast<Map<String, dynamic>>();
  }
}
