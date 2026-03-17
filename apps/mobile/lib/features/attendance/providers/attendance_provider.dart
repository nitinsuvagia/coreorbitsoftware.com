import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/attendance_models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

// ── State ──────────────────────────────────────────────────────────────────

class AttendanceState {
  final AttendanceRecord? today;
  final List<AttendanceRecord> sessions;
  final bool isLoading;
  final bool isActionLoading;
  final String? error;
  final Duration elapsed;

  const AttendanceState({
    this.today,
    this.sessions = const [],
    this.isLoading = false,
    this.isActionLoading = false,
    this.error,
    this.elapsed = Duration.zero,
  });

  AttendanceState copyWith({
    AttendanceRecord? today,
    bool clearToday = false,
    List<AttendanceRecord>? sessions,
    bool? isLoading,
    bool? isActionLoading,
    String? error,
    bool clearError = false,
    Duration? elapsed,
  }) =>
      AttendanceState(
        today: clearToday ? null : (today ?? this.today),
        sessions: sessions ?? this.sessions,
        isLoading: isLoading ?? this.isLoading,
        isActionLoading: isActionLoading ?? this.isActionLoading,
        error: clearError ? null : (error ?? this.error),
        elapsed: elapsed ?? this.elapsed,
      );
}

// ── Notifier ───────────────────────────────────────────────────────────────

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final Ref _ref;
  Timer? _timer;
  /// Sum of all completed sessions for today – accumulated reliably
  /// independent of what the API returns on any given fetch.
  Duration _completedBase = Duration.zero;

  AttendanceNotifier(this._ref) : super(const AttendanceState()) {
    fetchToday();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> fetchToday() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final dio = _ref.read(dioProvider);
      // Use /my endpoint filtered to today
      final today = DateTime.now();
      final dateStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      final resp = await dio.get(
        ApiConstants.attendanceMy,
        queryParameters: {'startDate': dateStr, 'endDate': dateStr},
      );
      final items = resp.data['data']['items'] as List<dynamic>? ?? [];
      final sessions = items
          .map((i) => AttendanceRecord.fromJson(i as Map<String, dynamic>))
          .toList();

      // Sort newest checkIn first so UI displays latest session on top.
      sessions.sort((a, b) {
        final at = a.checkIn ?? DateTime(0);
        final bt = b.checkIn ?? DateTime(0);
        return bt.compareTo(at);
      });

      // Re-initialise completed base from ALL fully completed sessions.
      _completedBase = Duration.zero;
      for (final s in sessions) {
        if (s.checkIn != null && s.checkOut != null) {
          _completedBase += s.checkOut!.difference(s.checkIn!);
        }
      }

      // 'today' must be the currently active session (checked in, no checkOut).
      // If none is active, fall back to the most recent session for display.
      AttendanceRecord? record;
      if (sessions.isNotEmpty) {
        final activeIndex = sessions.indexWhere(
            (s) => s.checkIn != null && s.checkOut == null);
        record = activeIndex >= 0 ? sessions[activeIndex] : sessions.first;
      }

      state = state.copyWith(
        today: record,
        clearToday: record == null,
        sessions: sessions,
        isLoading: false,
      );
      _startTimerIfNeeded();
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _msg(e));
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Failed to load attendance');
    }
  }

  Future<void> checkIn({bool isRemote = false, String? notes}) async {
    state = state.copyWith(isActionLoading: true, clearError: true);
    try {
      final dio = _ref.read(dioProvider);
      final resp = await dio.post(
        ApiConstants.attendanceCheckIn,
        data: {
          if (isRemote) 'isRemote': true,
          'deviceInfo': {'type': 'mobile'},
          if (notes != null) 'notes': notes,
        },
      );
      final record = AttendanceRecord.fromJson(
          resp.data['data'] as Map<String, dynamic>);
      // New active session goes to front (newest-first order).
      state = state.copyWith(
        today: record,
        sessions: [record, ...state.sessions],
        isActionLoading: false,
      );
      _startTimerIfNeeded();
    } on DioException catch (e) {
      state = state.copyWith(isActionLoading: false, error: _msg(e));
    } catch (_) {
      state = state.copyWith(isActionLoading: false, error: 'Check-in failed');
    }
  }

  Future<void> checkOut({String? notes}) async {
    state = state.copyWith(isActionLoading: true, clearError: true);
    try {
      final dio = _ref.read(dioProvider);
      final resp = await dio.post(
        ApiConstants.attendanceCheckOut,
        data: {
          if (notes != null) 'notes': notes,
        },
      );
      final record = AttendanceRecord.fromJson(
          resp.data['data'] as Map<String, dynamic>);
      _timer?.cancel();
      final updatedSessions = state.sessions
          .map((s) => s.id == record.id ? record : s)
          .toList();
      // Accumulate this session into the persistent completed base.
      if (record.checkIn != null && record.checkOut != null) {
        _completedBase += record.checkOut!.difference(record.checkIn!);
      }
      state = state.copyWith(
        today: record,
        sessions: updatedSessions,
        isActionLoading: false,
        elapsed: _completedBase,
      );
    } on DioException catch (e) {
      state = state.copyWith(isActionLoading: false, error: _msg(e));
    } catch (_) {
      state = state.copyWith(isActionLoading: false, error: 'Check-out failed');
    }
  }

  void _startTimerIfNeeded() {
    _timer?.cancel();
    final today = state.today;
    if (today?.isCheckedIn == true && !today!.isCheckedOut) {
      final checkInTime = today.checkIn!;
      // Snapshot the completed base once – stable for the whole session.
      final base = _completedBase;
      state = state.copyWith(
          elapsed: base + DateTime.now().difference(checkInTime));
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        state = state.copyWith(
            elapsed: base + DateTime.now().difference(checkInTime));
      });
    }
  }

  String _msg(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      return (data['error'] ?? data['message'] ?? 'Request failed').toString();
    }
    return 'Network error';
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

final attendanceProvider =
    StateNotifierProvider<AttendanceNotifier, AttendanceState>(
  (ref) => AttendanceNotifier(ref),
);
