import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_constants.dart';
import '../models/auth_models.dart';
import '../network/api_client.dart';
import '../storage/secure_storage.dart';

// ── Auth State ─────────────────────────────────────────────────────────────

enum AuthStatus { initializing, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AuthSession? session;
  final bool isLoading;
  final String? error;

  const AuthState({
    required this.status,
    this.session,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    AuthSession? session,
    bool clearSession = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) =>
      AuthState(
        status: status ?? this.status,
        session: clearSession ? null : (session ?? this.session),
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
      );
}

// ── Auth Notifier ──────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;

  AuthNotifier(this._ref)
      : super(const AuthState(status: AuthStatus.initializing)) {
    _restoreSession();
  }

  // ── Restore persisted session on app start ─────────────────────────────

  Future<void> _restoreSession() async {
    try {
      final info = await SecureStorageService.getUserInfo();
      final accessToken = await SecureStorageService.getAccessToken();
      final tenantSlug = info['tenantSlug'];

      if (accessToken != null &&
          info['userId'] != null &&
          tenantSlug != null) {
        final user = AuthUser(
          id: info['userId']!,
          email: info['email'] ?? '',
          displayName: info['name'] ?? info['email'] ?? '',
          tenantId: '',
          tenantSlug: tenantSlug,
          tenantName: '',
          roles: [],
        );
        state = state.copyWith(
          status: AuthStatus.authenticated,
          session: AuthSession(user: user, tenantSlug: tenantSlug),
        );
        _registerLogoutCallback();
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────

  Future<bool> login(
    String email,
    String password,
    String tenantSlug,
  ) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      // Store tenant slug before the call so the interceptor can attach it.
      await SecureStorageService.saveTenantSlug(tenantSlug);

      final dio = _ref.read(dioProvider);
      final response = await dio.post(
        ApiConstants.login,
        data: LoginRequest(email: email, password: password).toJson(),
        options: Options(
          headers: {'X-Tenant-Slug': tenantSlug},
        ),
      );

      final loginResp = LoginResponse.fromJson(
          response.data as Map<String, dynamic>);

      if (!loginResp.success || loginResp.tokens == null) {
        final msg = loginResp.errorMessage ?? 'Login failed';
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          isLoading: false,
          error: msg,
        );
        return false;
      }

      // Persist tokens and user info
      await Future.wait([
        SecureStorageService.saveAccessToken(loginResp.tokens!.accessToken),
        SecureStorageService.saveRefreshToken(loginResp.tokens!.refreshToken),
        if (loginResp.user != null)
          SecureStorageService.saveUserInfo(
            userId: loginResp.user!.id,
            email: loginResp.user!.email,
            name: loginResp.user!.displayName,
          ),
      ]);

      final session = AuthSession(
        user: loginResp.user!,
        tenantSlug: tenantSlug,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        session: session,
        isLoading: false,
      );
      _registerLogoutCallback();
      return true;
    } on DioException catch (e) {
      final msg = _extractDioError(e);
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        isLoading: false,
        error: msg,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────

  Future<void> logout() async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.post(ApiConstants.logout).timeout(
            const Duration(seconds: 5),
          );
    } catch (_) {
      // Best-effort server-side logout
    }
    await SecureStorageService.clearAll();
    state = state.copyWith(
      status: AuthStatus.unauthenticated,
      clearSession: true,
      isLoading: false,
    );
  }

  void clearError() => state = state.copyWith(clearError: true);

  // ── Register the interceptor's logout callback ─────────────────────────

  void _registerLogoutCallback() {
    _ref.read(setLogoutCallbackProvider)(logout);
  }

  String _extractDioError(DioException e) {
    if (e.response != null) {
      final data = e.response!.data;
      if (data is Map) {
        return (data['error']?['message'] ??
                data['error'] ??
                data['message'] ??
                'Login failed')
            .toString();
      }
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Connection timed out. Please check your network.';
    }
    return 'Could not reach the server. Please try again.';
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
