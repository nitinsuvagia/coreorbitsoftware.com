/// All API endpoint paths used by the app.
/// Change [baseUrl] to point at your environment.
class ApiConstants {
  ApiConstants._();

  // ── Base URL ─────────────────────────────────────────────────────────────
  /// Development: API Gateway runs on localhost:4000
  static const String baseUrl = 'http://localhost:4000';

  // For production, override via build flavors or env injection:
  // static const String baseUrl = 'https://api.yourdomain.com';

  static const String _v1 = '/api/v1';

  // ── Auth ─────────────────────────────────────────────────────────────────
  static const String login = '$_v1/auth/tenant/login';
  static const String logout = '$_v1/auth/logout';
  static const String refreshToken = '$_v1/auth/refresh';
  static const String profile = '$_v1/auth/users/profile';
  static const String changePassword = '$_v1/auth/change-password';

  // ── Attendance (self-service — server resolves employeeId from JWT) ───────
  static const String attendanceCheckIn = '$_v1/attendance/check-in/self';
  static const String attendanceCheckOut = '$_v1/attendance/check-out/self';
  static const String attendanceMy = '$_v1/attendance/my';

  // ── Leave ─────────────────────────────────────────────────────────────────
  static const String leaveTypes = '$_v1/leaves/types';
  static const String leaveBalancesMe = '$_v1/leaves/balances/me';
  static const String leaveRequests = '$_v1/leaves/requests';
  static const String leaveRequestsMy = '$_v1/leaves/requests/my';
  static String leaveRequestCancel(String id) => '$_v1/leaves/requests/$id/cancel';

  // ── Tasks ─────────────────────────────────────────────────────────────────
  static const String tasks = '$_v1/tasks';
  static String task(String id) => '$_v1/tasks/$id';

  // ── Employee ──────────────────────────────────────────────────────────────
  static const String employees = '$_v1/employees';
  static String employee(String id) => '$_v1/employees/$id';

  // ── Timeouts ──────────────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
