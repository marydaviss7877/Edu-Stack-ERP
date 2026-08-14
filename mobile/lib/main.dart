import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'core/storage/local_storage.dart';
import 'core/constants/storage_keys.dart';
import 'services/fcm_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Local storage (SharedPreferences)
  await LocalStorageService.init();

  // Offline attendance queue (Hive)
  await Hive.initFlutter();
  await Hive.openBox<Map>(StorageKeys.offlineAttendanceBox);

  // Firebase — must init before registering background handler
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('[Firebase] Init failed — push notifications disabled: $e');
  }

  runApp(const ProviderScope(child: EduStackApp()));
}
