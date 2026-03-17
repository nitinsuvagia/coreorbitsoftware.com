import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin wrapper around [FlutterSecureStorage] for all persisted auth/session data.
class SecureStorageService {
  SecureStorageService._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // Key names
  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';
  static const _kTenantSlug = 'tenant_slug';
  static const _kUserId = 'user_id';
  static const _kUserEmail = 'user_email';
  static const _kUserName = 'user_name';
  static const _kEmployeeId = 'employee_id';

  // ── Access Token ──────────────────────────────────────────────────────────
  static Future<void> saveAccessToken(String token) =>
      _storage.write(key: _kAccessToken, value: token);

  static Future<String?> getAccessToken() => _storage.read(key: _kAccessToken);

  // ── Refresh Token ─────────────────────────────────────────────────────────
  static Future<void> saveRefreshToken(String token) =>
      _storage.write(key: _kRefreshToken, value: token);

  static Future<String?> getRefreshToken() =>
      _storage.read(key: _kRefreshToken);

  // ── Tenant Slug ───────────────────────────────────────────────────────────
  static Future<void> saveTenantSlug(String slug) =>
      _storage.write(key: _kTenantSlug, value: slug);

  static Future<String?> getTenantSlug() => _storage.read(key: _kTenantSlug);

  // ── User Info ─────────────────────────────────────────────────────────────
  static Future<void> saveUserInfo({
    required String userId,
    required String email,
    required String name,
    String? employeeId,
  }) async {
    await Future.wait([
      _storage.write(key: _kUserId, value: userId),
      _storage.write(key: _kUserEmail, value: email),
      _storage.write(key: _kUserName, value: name),
      if (employeeId != null)
        _storage.write(key: _kEmployeeId, value: employeeId),
    ]);
  }

  static Future<Map<String, String?>> getUserInfo() async {
    final results = await Future.wait([
      _storage.read(key: _kUserId),
      _storage.read(key: _kUserEmail),
      _storage.read(key: _kUserName),
      _storage.read(key: _kEmployeeId),
      _storage.read(key: _kTenantSlug),
    ]);
    return {
      'userId': results[0],
      'email': results[1],
      'name': results[2],
      'employeeId': results[3],
      'tenantSlug': results[4],
    };
  }

  // ── Clear all ─────────────────────────────────────────────────────────────
  static Future<void> clearAll() => _storage.deleteAll();
}
