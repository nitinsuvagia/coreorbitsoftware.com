// ── Login ──────────────────────────────────────────────────────────────────

class LoginRequest {
  final String email;
  final String password;
  final String? mfaCode;

  const LoginRequest({
    required this.email,
    required this.password,
    this.mfaCode,
  });

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
        if (mfaCode != null) 'mfaCode': mfaCode,
      };
}

class TokenData {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  const TokenData({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory TokenData.fromJson(Map<String, dynamic> json) => TokenData(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresIn: json['expiresIn'] as int? ?? 900,
      );
}

class AuthUser {
  final String id;
  final String email;
  final String displayName;
  final String? avatar;
  final String tenantId;
  final String tenantSlug;
  final String tenantName;
  final List<String> roles;

  const AuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    this.avatar,
    required this.tenantId,
    required this.tenantSlug,
    required this.tenantName,
    required this.roles,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        displayName: json['displayName'] as String? ?? json['email'] as String,
        avatar: json['avatar'] as String?,
        tenantId: json['tenantId'] as String,
        tenantSlug: json['tenantSlug'] as String,
        tenantName: json['tenantName'] as String,
        roles: (json['roles'] as List<dynamic>?)
                ?.map((r) => r.toString())
                .toList() ??
            [],
      );
}

class LoginResponse {
  final bool success;
  final bool requiresMfa;
  final TokenData? tokens;
  final AuthUser? user;
  final String? errorCode;
  final String? errorMessage;

  const LoginResponse({
    required this.success,
    required this.requiresMfa,
    this.tokens,
    this.user,
    this.errorCode,
    this.errorMessage,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final errorMap = json['error'] as Map<String, dynamic>?;
    return LoginResponse(
      success: json['success'] as bool? ?? false,
      requiresMfa: json['requiresMfa'] as bool? ?? false,
      tokens: json['tokens'] != null
          ? TokenData.fromJson(json['tokens'] as Map<String, dynamic>)
          : null,
      user: json['user'] != null
          ? AuthUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      errorCode: errorMap?['code'] as String?,
      errorMessage: errorMap?['message'] as String?,
    );
  }
}

// ── Session State (held in provider) ──────────────────────────────────────

class AuthSession {
  final AuthUser user;
  final String tenantSlug;

  const AuthSession({required this.user, required this.tenantSlug});
}
