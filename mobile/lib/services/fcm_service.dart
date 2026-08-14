import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'auth_service.dart';

// Top-level handler — must be a global function (Firebase requirement)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background processing — avoid heavy work here
}

class FcmService {
  FcmService._();
  static final FcmService instance = FcmService._();

  final _messaging = FirebaseMessaging.instance;
  final _localNotifs = FlutterLocalNotificationsPlugin();

  static const _androidChannel = AndroidNotificationChannel(
    'edustack_high_importance',
    'EduStack Alerts',
    description: 'Fee due dates, attendance warnings, exam reminders',
    importance: Importance.max,
    playSound: true,
  );

  Future<void> init() async {
    // Request permission (iOS + Android 13+)
    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    // Create Android notification channel
    await _localNotifs
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    // Init local notifications (for foreground display)
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );
    await _localNotifs.initialize(initSettings);

    // Register background handler
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Foreground message → show as local notification
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // App opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);

    // App launched from terminated state via notification
    final initial = await _messaging.getInitialMessage();
    if (initial != null) _handleMessageTap(initial);

    // Register token with backend
    await _registerToken();

    // Re-register on token refresh
    _messaging.onTokenRefresh.listen((token) => _sendTokenToServer(token));
  }

  Future<void> _registerToken() async {
    final token = await _messaging.getToken();
    if (token != null) await _sendTokenToServer(token);
  }

  Future<void> _sendTokenToServer(String token) async {
    try {
      final svc = AuthService();
      await svc.registerFcmToken(token);
    } catch (_) {}
  }

  Future<void> removeToken() async {
    final token = await _messaging.getToken();
    if (token == null) return;
    try {
      final svc = AuthService();
      await svc.removeFcmToken(token);
    } catch (_) {}
    await _messaging.deleteToken();
  }

  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifs.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }

  void _handleMessageTap(RemoteMessage message) {
    // Navigate based on notification type
    // Routing handled via navigatorKey or GoRouter after app is mounted
    // Store pending route for post-mount navigation if needed
  }
}
