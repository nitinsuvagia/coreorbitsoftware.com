import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

// ── Dio Provider ───────────────────────────────────────────────────────────

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(AuthInterceptor(dio, ref));
  return dio;
});

// ── Auth Interceptor ───────────────────────────────────────────────────────

/// Attaches JWT + tenant-slug to every request.
/// On 401: attempts a silent token refresh, retries the original request once.
/// On refresh failure: clears storage and signals logout.
class AuthInterceptor extends QueuedInterceptorsWrapper {
  final Dio _dio;
  final Ref _ref;

  AuthInterceptor(this._dio, this._ref);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = await SecureStorageService.getAccessToken();
    final tenantSlug = await SecureStorageService.getTenantSlug();

    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    if (tenantSlug != null) {
      options.headers['X-Tenant-Slug'] = tenantSlug;
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      // Skip refresh attempts for the refresh/login endpoint itself
      final path = err.requestOptions.path;
      final isAuthEndpoint =
          path.contains('/auth/refresh') || path.contains('/auth/tenant/login');

      if (!isAuthEndpoint) {
        final refreshed = await _tryRefreshToken();
        if (refreshed) {
          try {
            final options = err.requestOptions;
            final newToken = await SecureStorageService.getAccessToken();
            options.headers['Authorization'] = 'Bearer $newToken';
            final retryResponse = await _dio.fetch(options);
            return handler.resolve(retryResponse);
          } catch (_) {}
        }
      }

      // Refresh failed — clear session
      await SecureStorageService.clearAll();
      // Notify auth provider so router redirects to /login
      _ref.read(_logoutCallbackProvider).call();
    }

    handler.next(err);
  }

  Future<bool> _tryRefreshToken() async {
    final refreshToken = await SecureStorageService.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      // Use a fresh Dio instance (no interceptors) to avoid recursion
      final response = await Dio().post(
        '${ApiConstants.baseUrl}${ApiConstants.refreshToken}',
        data: {'refreshToken': refreshToken},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final tokens = response.data['tokens'] as Map<String, dynamic>;
        await SecureStorageService.saveAccessToken(
            tokens['accessToken'] as String);
        final newRefresh = tokens['refreshToken'] as String?;
        if (newRefresh != null) {
          await SecureStorageService.saveRefreshToken(newRefresh);
        }
        return true;
      }
    } catch (_) {}

    return false;
  }
}

// ── Logout Callback Provider ───────────────────────────────────────────────
// The auth provider sets this to its own logout method so the interceptor
// can trigger navigation without a circular dependency.

final _logoutCallbackProvider = StateProvider<void Function()>((_) => () {});

/// Call this from the auth provider to register its logout handler.
final setLogoutCallbackProvider =
    Provider<void Function(void Function())>((ref) {
  return (callback) {
    ref.read(_logoutCallbackProvider.notifier).state = callback;
  };
});
