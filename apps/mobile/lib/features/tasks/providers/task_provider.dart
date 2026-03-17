import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/task_models.dart';
import '../../../core/network/api_client.dart';

// ── State ──────────────────────────────────────────────────────────────────

class TaskState {
  final List<TaskItem> tasks;
  final bool isLoading;
  final String? error;
  final String filterStatus; // '' = all

  const TaskState({
    this.tasks = const [],
    this.isLoading = false,
    this.error,
    this.filterStatus = '',
  });

  TaskState copyWith({
    List<TaskItem>? tasks,
    bool? isLoading,
    String? error,
    bool clearError = false,
    String? filterStatus,
  }) =>
      TaskState(
        tasks: tasks ?? this.tasks,
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        filterStatus: filterStatus ?? this.filterStatus,
      );

  List<TaskItem> get filtered => filterStatus.isEmpty
      ? tasks
      : tasks.where((t) => t.status == filterStatus).toList();
}

// ── Notifier ───────────────────────────────────────────────────────────────

class TaskNotifier extends StateNotifier<TaskState> {
  final Ref _ref;

  TaskNotifier(this._ref) : super(const TaskState()) {
    fetchTasks();
  }

  Future<void> fetchTasks() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final dio = _ref.read(dioProvider);
      // The API resolves assigned tasks for current user via JWT
      final resp = await dio.get(
        ApiConstants.tasks,
        queryParameters: {'pageSize': '100'},
      );

      final raw = resp.data;
      List<dynamic> items;
      if (raw is Map) {
        items = raw['data'] as List<dynamic>? ??
            raw['tasks'] as List<dynamic>? ??
            raw['items'] as List<dynamic>? ??
            [];
      } else if (raw is List) {
        items = raw;
      } else {
        items = [];
      }

      state = state.copyWith(
        tasks: items
            .map((e) => TaskItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        isLoading: false,
      );
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _msg(e));
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Failed to load tasks');
    }
  }

  Future<void> updateStatus(String taskId, String newStatus) async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.patch(
        ApiConstants.task(taskId),
        data: {'status': newStatus},
      );
      // Optimistically update local state
      state = state.copyWith(
        tasks: state.tasks
            .map((t) => t.id == taskId
                ? TaskItem.fromJson({
                    ...{
                      'id': t.id,
                      'title': t.title,
                      'description': t.description,
                      'status': newStatus,
                      'priority': t.priority,
                      'type': t.type,
                      'projectId': t.projectId,
                      'labels': t.labels,
                      'createdAt': t.createdAt.toIso8601String(),
                    }
                  })
                : t)
            .toList(),
      );
    } on DioException catch (e) {
      state = state.copyWith(error: _msg(e));
    } catch (_) {
      state = state.copyWith(error: 'Failed to update status');
    }
  }

  /// Creates a new task. Returns null on success, or an error message.
  Future<String?> createTask(
    String title, {
    String priority = 'medium',
    DateTime? dueDate,
    String? description,
  }) async {
    try {
      final dio = _ref.read(dioProvider);
      final resp = await dio.post(
        ApiConstants.tasks,
        data: {
          'title': title,
          'priority': priority,
          'status': 'todo',
          'type': 'task',
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
          if (description != null && description.isNotEmpty)
            'description': description,
        },
      );
      final raw = resp.data;
      final json = raw is Map && raw['data'] is Map
          ? raw['data'] as Map<String, dynamic>
          : raw as Map<String, dynamic>;
      final newTask = TaskItem.fromJson(json);
      state = state.copyWith(tasks: [newTask, ...state.tasks]);
      return null;
    } on DioException catch (e) {
      return _msg(e);
    } catch (_) {
      return 'Failed to create task';
    }
  }

  void setFilter(String status) =>
      state = state.copyWith(filterStatus: status);

  String _msg(DioException e) {
    final data = e.response?.data;
    if (data is Map) return (data['error'] ?? data['message'] ?? 'Error').toString();
    return 'Network error';
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

final taskProvider =
    StateNotifierProvider<TaskNotifier, TaskState>((ref) => TaskNotifier(ref));
