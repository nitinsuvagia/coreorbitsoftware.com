import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/models/task_models.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../providers/task_provider.dart';

const _statuses = [
  ('', 'All'),
  ('todo', 'To Do'),
  ('in_progress', 'In Progress'),
  ('in_review', 'In Review'),
  ('done', 'Done'),
  ('backlog', 'Backlog'),
  ('cancelled', 'Cancelled'),
];

// ══════════════════════════════════════════════════════════════
//  Tasks Screen
// ══════════════════════════════════════════════════════════════

class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key});

  void _openAdd(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const _AddTaskScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(taskProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Tasks',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 20,
            color: AppColors.textPrimary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded),
            color: AppColors.primary,
            iconSize: 26,
            tooltip: 'Add Task',
            onPressed: () => _openAdd(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            color: AppColors.textSecondary,
            onPressed: () => ref.read(taskProvider.notifier).fetchTasks(),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Filter chips ──────────────────────────────────────────────
          _FilterBar(
            current: state.filterStatus,
            onChanged: (s) => ref.read(taskProvider.notifier).setFilter(s),
          ),

          // ── Task list / empty state ───────────────────────────────────
          Expanded(
            child: state.isLoading
                ? const AppLoadingIndicator(message: 'Loading tasks…')
                : state.filtered.isEmpty
                    ? _EmptyState(onAdd: () => _openAdd(context))
                    : ListView.separated(
                        padding:
                            const EdgeInsets.fromLTRB(16, 12, 16, 8),
                        itemCount: state.filtered.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (_, i) => _TaskCard(
                          task: state.filtered[i],
                          onStatusChanged: (s) => ref
                              .read(taskProvider.notifier)
                              .updateStatus(state.filtered[i].id, s),
                        ),
                      ),
          ),

          // ── Quick-add bar ─────────────────────────────────────────────
          _QuickAddBar(
            onAdd: (title) =>
                ref.read(taskProvider.notifier).createTask(title),
          ),
        ],
      ),
    );
  }
}

// ── Empty State ────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_outline_rounded,
              size: 72,
              color: AppColors.textDisabled,
            ),
            const SizedBox(height: 16),
            const Text(
              'No tasks added',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Start by creating your first task',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textDisabled,
              ),
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Add First Task'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                    horizontal: 28, vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Quick Add Bar ──────────────────────────────────────────────────────────

class _QuickAddBar extends StatefulWidget {
  final Future<String?> Function(String title) onAdd;
  const _QuickAddBar({required this.onAdd});

  @override
  State<_QuickAddBar> createState() => _QuickAddBarState();
}

class _QuickAddBarState extends State<_QuickAddBar> {
  final _ctrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _ctrl.text.trim();
    if (title.isEmpty || _busy) return;
    setState(() => _busy = true);
    final err = await widget.onAdd(title);
    if (mounted) {
      setState(() => _busy = false);
      if (err == null) {
        _ctrl.clear();
      } else {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(err)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppColors.divider),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
      child: Row(
        children: [
          // @ badge
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text(
              '@',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _ctrl,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textPrimary,
              ),
              decoration: const InputDecoration(
                hintText: 'Add a quick task…',
                hintStyle: TextStyle(
                  color: AppColors.textDisabled,
                  fontSize: 14,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.symmetric(vertical: 4),
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _submit,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _busy
                    ? AppColors.primaryLight
                    : AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: _busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(
                            AppColors.primary),
                      ),
                    )
                  : const Icon(
                      Icons.arrow_upward_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Add Task – Full-Screen Dialog
// ══════════════════════════════════════════════════════════════

class _AddTaskScreen extends ConsumerStatefulWidget {
  const _AddTaskScreen();

  @override
  ConsumerState<_AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends ConsumerState<_AddTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _priority = 'medium';
  DateTime? _dueDate;
  bool _saving = false;

  static const List<(String, String, Color)> _priorities = [
    ('lowest', 'Lowest', AppColors.priorityLowest),
    ('low', 'Low', AppColors.priorityLow),
    ('medium', 'Medium', AppColors.priorityMedium),
    ('high', 'High', AppColors.priorityHigh),
    ('highest', 'Highest', AppColors.priorityHighest),
  ];

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final err = await ref.read(taskProvider.notifier).createTask(
          _titleCtrl.text.trim(),
          priority: _priority,
          dueDate: _dueDate,
          description: _descCtrl.text.trim().isEmpty
              ? null
              : _descCtrl.text.trim(),
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(err)));
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate:
          _dueDate ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate:
          DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  InputDecoration _fieldDeco(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textDisabled),
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide:
              const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide:
              const BorderSide(color: AppColors.absent, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide:
              const BorderSide(color: AppColors.absent, width: 1.5),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          color: AppColors.textSecondary,
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'New Task',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 18,
            color: AppColors.textPrimary,
          ),
        ),
        actions: [
          _saving
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(
                            AppColors.primary)),
                  ),
                )
              : TextButton(
                  onPressed: _save,
                  child: const Text(
                    'Save',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: AppColors.primary,
                    ),
                  ),
                ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // ── Title ────────────────────────────────────────────────
            const Text(
              'Task Title *',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _titleCtrl,
              autofocus: true,
              style: const TextStyle(
                  fontSize: 15, color: AppColors.textPrimary),
              decoration: _fieldDeco('Enter task title…'),
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Title is required'
                  : null,
            ),
            const SizedBox(height: 22),

            // ── Description ──────────────────────────────────────────
            const Text(
              'Description',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              style: const TextStyle(
                  fontSize: 14, color: AppColors.textPrimary),
              decoration: _fieldDeco('Optional description…'),
            ),
            const SizedBox(height: 22),

            // ── Priority ─────────────────────────────────────────────
            const Text(
              'Priority',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _priorities
                  .map((p) => GestureDetector(
                        onTap: () => setState(() => _priority = p.$1),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: _priority == p.$1
                                ? p.$3.withOpacity(0.12)
                                : Colors.white,
                            border: Border.all(
                              color: _priority == p.$1
                                  ? p.$3
                                  : AppColors.divider,
                              width: _priority == p.$1 ? 1.5 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            p.$2,
                            style: TextStyle(
                              color: _priority == p.$1
                                  ? p.$3
                                  : AppColors.textSecondary,
                              fontWeight: _priority == p.$1
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 22),

            // ── Due Date ─────────────────────────────────────────────
            const Text(
              'Due Date',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 16,
                      color: _dueDate != null
                          ? AppColors.primary
                          : AppColors.textDisabled,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _dueDate != null
                          ? DateFormat('MMMM d, yyyy').format(_dueDate!)
                          : 'Select due date (optional)',
                      style: TextStyle(
                        fontSize: 14,
                        color: _dueDate != null
                            ? AppColors.textPrimary
                            : AppColors.textDisabled,
                      ),
                    ),
                    const Spacer(),
                    if (_dueDate != null)
                      GestureDetector(
                        onTap: () => setState(() => _dueDate = null),
                        child: const Icon(Icons.close_rounded,
                            size: 16,
                            color: AppColors.textSecondary),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 36),

            // ── Create button ─────────────────────────────────────────
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor:
                      AppColors.primaryLight,
                  padding:
                      const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(
                              Colors.white),
                        ),
                      )
                    : const Text('Create Task'),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ── Filter Bar ─────────────────────────────────────────────────────────────

class _FilterBar extends StatelessWidget {
  final String current;
  final ValueChanged<String> onChanged;
  const _FilterBar({required this.current, required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.surface,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _statuses
                .map((s) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(s.$2),
                        selected: current == s.$1,
                        onSelected: (_) => onChanged(s.$1),
                        selectedColor: AppColors.primaryLight,
                        checkmarkColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: current == s.$1
                              ? AppColors.primary
                              : AppColors.textSecondary,
                          fontWeight: current == s.$1
                              ? FontWeight.w600
                              : FontWeight.w400,
                          fontSize: 12,
                        ),
                      ),
                    ))
                .toList(),
          ),
        ),
      );
}

// ── Task Card ──────────────────────────────────────────────────────────────

class _TaskCard extends StatelessWidget {
  final TaskItem task;
  final ValueChanged<String> onStatusChanged;

  const _TaskCard({required this.task, required this.onStatusChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: task.isOverdue ? AppColors.absent.withOpacity(0.4) : AppColors.divider,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showDetail(context),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  StatusBadge.priority(task.priority),
                  const SizedBox(width: 8),
                  _StatusPill(status: task.status),
                  const Spacer(),
                  if (task.isOverdue)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.absentLight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Overdue',
                        style: TextStyle(
                          color: AppColors.absent,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              // Title
              Text(
                task.title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),

              // Project
              if (task.projectName != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.folder_outlined,
                        size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      task.projectName!,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],

              // Due date
              if (task.dueDate != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 13,
                      color: task.isOverdue
                          ? AppColors.absent
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Due ${DateFormat('MMM d').format(task.dueDate!)}',
                      style: TextStyle(
                        color: task.isOverdue
                            ? AppColors.absent
                            : AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _TaskDetailSheet(
        task: task,
        onStatusChanged: onStatusChanged,
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String status;
  const _StatusPill({required this.status});

  static const _labels = {
    'backlog': 'Backlog',
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'in_review': 'In Review',
    'done': 'Done',
    'cancelled': 'Cancelled',
  };

  static const _colors = {
    'backlog': AppColors.textDisabled,
    'todo': AppColors.primary,
    'in_progress': AppColors.halfDay,
    'in_review': AppColors.leave,
    'done': AppColors.present,
    'cancelled': AppColors.textDisabled,
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[status] ?? AppColors.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        _labels[status] ?? status,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Task Detail Sheet ─────────────────────────────────────────────────────

class _TaskDetailSheet extends StatelessWidget {
  final TaskItem task;
  final ValueChanged<String> onStatusChanged;

  const _TaskDetailSheet(
      {required this.task, required this.onStatusChanged});

  static const _statusOptions = [
    'backlog',
    'todo',
    'in_progress',
    'in_review',
    'done',
    'cancelled',
  ];

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: ListView(
          controller: ctrl,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Title
            Text(
              task.title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            // Badges
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatusBadge.priority(task.priority),
                _StatusPill(status: task.status),
                if (task.projectName != null)
                  Chip(
                    label: Text(task.projectName!,
                        style: const TextStyle(fontSize: 12)),
                    avatar: const Icon(Icons.folder_outlined, size: 14),
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 16),

            if (task.description != null) ...[
              const Text(
                'Description',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                task.description!,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
            ],

            if (task.dueDate != null)
              InfoRow(
                icon: Icons.calendar_today_outlined,
                label: 'Due Date',
                value: DateFormat('MMMM d, yyyy').format(task.dueDate!),
              ),

            if (task.estimatedHours != null)
              InfoRow(
                icon: Icons.access_time_outlined,
                label: 'Estimated',
                value: '${task.estimatedHours!.toStringAsFixed(1)} hrs',
              ),

            const SizedBox(height: 20),
            const Text(
              'Update Status',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _statusOptions
                  .map(
                    (s) => ChoiceChip(
                      label: Text(s.replaceAll('_', ' '),
                          style: const TextStyle(fontSize: 12)),
                      selected: task.status == s,
                      selectedColor: AppColors.primaryLight,
                      onSelected: (_) {
                        onStatusChanged(s);
                        Navigator.pop(context);
                      },
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}
