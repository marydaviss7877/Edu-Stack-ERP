import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'providers/theme_provider.dart';
import 'providers/auth_provider.dart';
import 'services/fcm_service.dart';

class EduStackApp extends ConsumerStatefulWidget {
  const EduStackApp({super.key});

  @override
  ConsumerState<EduStackApp> createState() => _EduStackAppState();
}

class _EduStackAppState extends ConsumerState<EduStackApp> {
  ProviderSubscription<bool>? _authSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initFcm());
  }

  @override
  void dispose() {
    _authSub?.close();
    super.dispose();
  }

  Future<void> _initFcm() async {
    final isAuth = ref.read(isAuthenticatedProvider);
    if (isAuth) await FcmService.instance.init();

    // listenManual is safe to call outside build
    _authSub = ref.listenManual(isAuthenticatedProvider, (prev, next) async {
      if (next && prev != true) {
        await FcmService.instance.init();
      } else if (!next && prev == true) {
        await FcmService.instance.removeToken();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'EduStack',
      debugShowCheckedModeBanner: false,

      // Finalized EduStack design system. Tenant colors do not recolor the UI.
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,

      // GoRouter
      routerConfig: router,

      locale: const Locale('en'),
      supportedLocales: const [Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
