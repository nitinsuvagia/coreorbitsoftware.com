// ── Task ───────────────────────────────────────────────────────────────────

class TaskItem {
  final String id;
  final String title;
  final String? description;
  final String status; // backlog | todo | in_progress | in_review | done | cancelled
  final String priority; // lowest | low | medium | high | highest
  final String type; // task | bug | story | epic | subtask
  final String? projectId;
  final String? projectName;
  final DateTime? dueDate;
  final double? estimatedHours;
  final double? actualHours;
  final List<String> labels;
  final DateTime? completedAt;
  final DateTime createdAt;

  const TaskItem({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    required this.type,
    this.projectId,
    this.projectName,
    this.dueDate,
    this.estimatedHours,
    this.actualHours,
    required this.labels,
    this.completedAt,
    required this.createdAt,
  });

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    DateTime? p(dynamic v) =>
        v == null ? null : DateTime.tryParse(v.toString());
    final project = json['project'] as Map<String, dynamic>?;
    return TaskItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'todo',
      priority: json['priority'] as String? ?? 'medium',
      type: json['type'] as String? ?? 'task',
      projectId: json['projectId'] as String? ?? project?['id'] as String?,
      projectName: project?['name'] as String? ?? json['projectName'] as String?,
      dueDate: p(json['dueDate']),
      estimatedHours: (json['estimatedHours'] as num?)?.toDouble(),
      actualHours: (json['actualHours'] as num?)?.toDouble(),
      labels: (json['labels'] as List<dynamic>?)
              ?.map((l) => l.toString())
              .toList() ??
          [],
      completedAt: p(json['completedAt']),
      createdAt: p(json['createdAt']) ?? DateTime.now(),
    );
  }

  bool get isOverdue =>
      dueDate != null &&
      dueDate!.isBefore(DateTime.now()) &&
      status != 'done' &&
      status != 'cancelled';
}
