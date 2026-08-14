import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../core/storage/secure_storage.dart';
import '../core/storage/local_storage.dart';

// ── State ────────────────────────────────────────────────
class AuthState {
  final AppUser? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isAuthenticated => user != null;

  AuthState copyWith(
          {AppUser? user,
          bool? isLoading,
          String? error,
          bool clearUser = false}) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ── Notifier ─────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final SecureStorageService _secureStorage;

  AuthNotifier(this._authService, this._secureStorage)
      : super(AuthState(isLoading: LocalStorageService.hasOrg)) {
    if (LocalStorageService.hasOrg) {
      Future.microtask(checkSession);
    }
  }

  Future<void> checkSession() async {
    try {
      // Inactivity check (10 days)
      if (LocalStorageService.isInactive) {
        await _secureStorage.clearTokens();
        state = state.copyWith(isLoading: false, clearUser: true);
        return;
      }

      final token = await _secureStorage.getAccessToken();
      if (token == null) {
        state = state.copyWith(isLoading: false, clearUser: true);
        return;
      }

      // Verify token by calling /auth/me (8s max so splash doesn't hang)
      final user = await _authService.getMe().timeout(
            const Duration(seconds: 8),
            onTimeout: () => throw Exception('session_timeout'),
          );
      LocalStorageService.updateLastActive();
      state = state.copyWith(user: user, isLoading: false);
    } catch (_) {
      // Token invalid or network issue — stay logged out
      await _secureStorage.clearTokens();
      state = state.copyWith(isLoading: false, clearUser: true);
    }
  }

  Future<void> login({
    required String email,
    required String password,
    required String slug,
    required String loginAs, // 'admin' | 'teacher' | 'student'
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _authService.login(
        email: email,
        password: password,
        slug: slug,
        loginAs: loginAs,
      );
      await _secureStorage.saveTokens(
        accessToken: result['accessToken'] as String,
        refreshToken: result['refreshToken'] as String,
      );
      LocalStorageService.updateLastActive();
      final user = AppUser.fromJson(result['user'] as Map<String, dynamic>);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(
          isLoading: false, error: e.toString(), clearUser: true);
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _authService.logout();
    } catch (_) {/* best effort */}
    await _secureStorage.clearTokens();
    state = const AuthState();
  }
}

// ── Providers ────────────────────────────────────────────
final secureStorageProvider = Provider((_) => SecureStorageService());

final authServiceProvider = Provider(
  (ref) => AuthService(),
);

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(
    ref.watch(authServiceProvider),
    ref.watch(secureStorageProvider),
  ),
);

// Convenience selectors
final currentUserProvider =
    Provider<AppUser?>((ref) => ref.watch(authProvider).user);
final isAuthenticatedProvider =
    Provider<bool>((ref) => ref.watch(authProvider).isAuthenticated);
