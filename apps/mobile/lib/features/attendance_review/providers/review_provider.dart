import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/attendance_models.dart';
import '../../../core/network/api_client.dart';

class ReviewState {
  final List<AttendanceRecord> records;
  final MonthlySummary? summary;
  final bool isLoading;
  final String? error;
  final DateTime focusedMonth;

  const ReviewState({
    this.records = const [],
    this.summary,
    this.isLoading = false,
    this.error,
    required this.focusedMonth,
  });

  ReviewState copyWith({
    List<AttendanceRecord>? records,
    MonthlySummary? summary,
    bool clearSummary = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
    DateTime? focusedMonth,
  }) =>
      ReviewState(
        records: records ?? this.records,
        summary: clearSummary ? null : (summary ?? this.summary),
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        focusedMonth: focusedMonth ?? this.focusedMonth,
      );
}

class ReviewNotifier extends StateNotifier<ReviewState> {
  final Ref _ref;

  ReviewNotifier(this._ref)
      : super(ReviewState(focusedMonth: DateTime(DateTime.now().year, DateTime.now().month))) {
    fetchMonth(state.focusedMonth);
  }

  Future<void> fetchMonth(DateTime month) async {
    state = state.copyWith(isLoading: true, clearError: true, focusedMonth: month);
    try {
      final dio = _ref.read(dioProvider);
      final y = month.year;
      final m = month.month;
      final from =
          '$y-${m.toString().padLeft(2, '0')}-01';
      final lastDay = DateTime(y, m + 1, 0).day;
      final to =
          '$y-${m.toString().padLeft(2, '0')}-${lastDay.toString().padLeft(2, '0')}';

      final resp = await dio.get(
        ApiConstants.attendanceMy,
        queryParameters: {'startDate': from, 'endDate': to, 'limit': 50},
      );

      final items = (resp.data['data']['items'] as List<dynamic>? ?? [])
          .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(records: items, isLoading: false);
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _msg(e));
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Failed to load attendance');
    }
  }

  String _msg(DioException e) {
    final data = e.response?.data;
    if (data is Map) return (data['error'] ?? data['message'] ?? 'Error').toString();
    return 'Network error';
  }
}

final reviewProvider = StateNotifierProvider<ReviewNotifier, ReviewState>(
  (ref) => ReviewNotifier(ref),
);
