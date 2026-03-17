import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/leave_models.dart';
import '../../../core/network/api_client.dart';

// ── State ──────────────────────────────────────────────────────────────────

class LeaveState {
  final List<LeaveBalance> balances;
  final List<LeaveType> leaveTypes;
  final List<LeaveRequest> requests;
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final String? successMessage;

  const LeaveState({
    this.balances = const [],
    this.leaveTypes = const [],
    this.requests = const [],
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.successMessage,
  });

  LeaveState copyWith({
    List<LeaveBalance>? balances,
    List<LeaveType>? leaveTypes,
    List<LeaveRequest>? requests,
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    bool clearError = false,
    String? successMessage,
    bool clearSuccess = false,
  }) =>
      LeaveState(
        balances: balances ?? this.balances,
        leaveTypes: leaveTypes ?? this.leaveTypes,
        requests: requests ?? this.requests,
        isLoading: isLoading ?? this.isLoading,
        isSubmitting: isSubmitting ?? this.isSubmitting,
        error: clearError ? null : (error ?? this.error),
        successMessage:
            clearSuccess ? null : (successMessage ?? this.successMessage),
      );
}

// ── Notifier ───────────────────────────────────────────────────────────────

class LeaveNotifier extends StateNotifier<LeaveState> {
  final Ref _ref;

  LeaveNotifier(this._ref) : super(const LeaveState()) {
    _fetchAll();
  }

  Future<void> _fetchAll() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final dio = _ref.read(dioProvider);
      final results = await Future.wait([
        dio.get(ApiConstants.leaveBalancesMe),
        dio.get(ApiConstants.leaveTypes),
        dio.get(ApiConstants.leaveRequestsMy),
      ]);

      final balancesData =
          results[0].data['data'] as List<dynamic>? ??
              results[0].data['data'] as List<dynamic>? ??
              [];
      final typesData =
          results[1].data['data'] as List<dynamic>? ?? [];
      final requestsData = results[2].data['data'] as List<dynamic>? ??
          results[2].data['requests'] as List<dynamic>? ??
          [];

      state = state.copyWith(
        balances: (balancesData as List)
            .map((e) => LeaveBalance.fromJson(e as Map<String, dynamic>))
            .toList(),
        leaveTypes: (typesData as List)
            .map((e) => LeaveType.fromJson(e as Map<String, dynamic>))
            .toList(),
        requests: (requestsData as List)
            .map((e) => LeaveRequest.fromJson(e as Map<String, dynamic>))
            .toList(),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load leave data');
    }
  }

  Future<void> refresh() => _fetchAll();

  Future<bool> submitRequest(CreateLeaveRequest req) async {
    state = state.copyWith(isSubmitting: true, clearError: true, clearSuccess: true);
    try {
      final dio = _ref.read(dioProvider);
      await dio.post(
        ApiConstants.leaveRequests,
        data: req.toJson(),
      );
      state = state.copyWith(
        isSubmitting: false,
        successMessage: 'Leave request submitted successfully',
      );
      await _fetchAll();
      return true;
    } on DioException catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: _msg(e),
      );
      return false;
    } catch (_) {
      state = state.copyWith(isSubmitting: false, error: 'Failed to submit request');
      return false;
    }
  }

  void clearMessages() =>
      state = state.copyWith(clearError: true, clearSuccess: true);

  String _msg(DioException e) {
    final data = e.response?.data;
    if (data is Map) return (data['error'] ?? data['message'] ?? 'Error').toString();
    return 'Network error';
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

final leaveProvider = StateNotifierProvider<LeaveNotifier, LeaveState>(
  (ref) => LeaveNotifier(ref),
);
