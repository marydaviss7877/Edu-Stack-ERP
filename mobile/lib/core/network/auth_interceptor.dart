import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';
import '../storage/local_storage.dart';

class AuthInterceptor extends Interceptor {
  final Dio dio;
  final SecureStorageService secureStorage;

  bool _isRefreshing = false;
  final List<RequestOptions> _pendingRequests = [];

  AuthInterceptor({required this.dio, required this.secureStorage});

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Attach Bearer token
    final token = await secureStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    // Attach org slug so backend can resolve tenant
    final slug = LocalStorageService.orgSlug;
    if (slug != null) {
      options.headers[ApiConstants.orgSlugHeader] = slug;
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;

    // Only handle 401s — skip login & refresh endpoints to avoid loops
    final path = err.requestOptions.path;
    if (response?.statusCode != 401 ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/login')) {
      handler.next(err);
      return;
    }

    // Queue request while refresh is in progress
    if (_isRefreshing) {
      _pendingRequests.add(err.requestOptions);
      return;
    }

    _isRefreshing = true;

    try {
      final refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken == null) {
        _clearAndRedirect();
        handler.next(err);
        return;
      }

      // Call refresh — send token in body (mobile pattern, not cookie)
      final refreshDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl))
        ..options.headers[ApiConstants.clientTypeHeader] =
            ApiConstants.clientTypeValue;

      final slug = LocalStorageService.orgSlug;
      if (slug != null) {
        refreshDio.options.headers[ApiConstants.orgSlugHeader] = slug;
      }

      final refreshResponse = await refreshDio.post(
        ApiConstants.refresh,
        data: {'refreshToken': refreshToken},
      );

      final data = refreshResponse.data['data'];
      await secureStorage.saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
      );

      // Retry the original request
      err.requestOptions.headers['Authorization'] =
          'Bearer ${data['accessToken']}';
      final retried = await dio.fetch(err.requestOptions);
      handler.resolve(retried);

      // Retry all queued requests
      for (final pending in _pendingRequests) {
        pending.headers['Authorization'] = 'Bearer ${data['accessToken']}';
        dio.fetch(pending);
      }
      _pendingRequests.clear();
    } catch (_) {
      _clearAndRedirect();
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  void _clearAndRedirect() {
    secureStorage.clearTokens();
    // Router will redirect to login via auth state change
    // Handled by GoRouter redirect guard watching authProvider
  }
}
