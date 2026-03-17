import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/employee_models.dart';
import '../../../core/network/api_client.dart';

// ── State ──────────────────────────────────────────────────────────────────

class ProfileState {
  final EmployeeProfile? profile;
  final bool isLoading;
  final String? error;

  const ProfileState({this.profile, this.isLoading = false, this.error});

  ProfileState copyWith({
    EmployeeProfile? profile,
    bool? isLoading,
    String? error,
  }) =>
      ProfileState(
        profile: profile ?? this.profile,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ── Notifier ───────────────────────────────────────────────────────────────

class ProfileNotifier extends StateNotifier<ProfileState> {
  final Dio _dio;

  ProfileNotifier(this._dio) : super(const ProfileState()) {
    fetchProfile();
  }

  Future<void> fetchProfile() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(ApiConstants.profile);
      final data = response.data;

      // Auth service returns the user profile; try to merge with employee data
      // The /auth/profile endpoint typically returns user+employee combined
      EmployeeProfile profile;
      if (data is Map<String, dynamic>) {
        // Handle both direct employee object and nested shapes
        final payload = data['data'] ?? data['employee'] ?? data['profile'] ?? data;
        profile = EmployeeProfile.fromJson(payload as Map<String, dynamic>);
      } else {
        throw Exception('Unexpected profile response shape');
      }

      state = state.copyWith(isLoading: false, profile: profile);
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] as String? ?? e.message ?? 'Failed to load profile';
      state = state.copyWith(isLoading: false, error: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

final profileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  final dio = ref.watch(dioProvider);
  return ProfileNotifier(dio);
});
