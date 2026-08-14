import 'package:dio/dio.dart';
import '../core/network/dio_client.dart';
import '../core/constants/api_constants.dart';
import '../models/notification.dart';

class NotificationService {
  final Dio _dio = DioClient.instance;

  Future<List<AppNotification>> getNotifications({int page = 1}) async {
    final res = await _dio.get(ApiConstants.notifications,
        queryParameters: {'page': page, 'limit': 20});
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) {
      throw Exception('Failed to load notifications');
    }
    return (data['data'] as List)
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> getUnreadCount() async {
    final res = await _dio.get(ApiConstants.unreadCount);
    final data = res.data as Map<String, dynamic>;
    if (data['success'] != true) return 0;
    return (data['data']?['count'] as int?) ?? 0;
  }

  Future<void> markAsRead(String notificationId) async {
    await _dio.patch('${ApiConstants.notifications}/$notificationId/read');
  }

  Future<void> markAllAsRead() async {
    await _dio.patch('${ApiConstants.notifications}/read-all');
  }
}
