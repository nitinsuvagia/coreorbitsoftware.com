import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/models/leave_models.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../providers/leave_provider.dart';

class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});

  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(leaveProvider);

    // Show success/error snackbars
    ref.listen(leaveProvider, (_, next) {
      if (next.successMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.successMessage!),
            backgroundColor: AppColors.approved,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(leaveProvider.notifier).clearMessages();
      } else if (next.error != null && !next.isLoading) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.absent,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(leaveProvider.notifier).clearMessages();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Leave'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(leaveProvider.notifier).refresh(),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'My Leaves'),
            Tab(text: 'Balances'),
          ],
        ),
      ),
      body: state.isLoading
          ? const AppLoadingIndicator(message: 'Loading leave data…')
          : TabBarView(
              controller: _tabs,
              children: [
                _MyLeavesTab(
                  requests: state.requests,
                ),
                _BalancesTab(balances: state.balances),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showRequestSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('New Request'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  Future<void> _showRequestSheet(BuildContext context) async {
    final types = ref.read(leaveProvider).leaveTypes;
    if (types.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leave types not loaded yet. Please refresh.'),
            behavior: SnackBarBehavior.floating),
      );
      return;
    }
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LeaveRequestSheet(leaveTypes: types),
    );
  }
}

// ── My Leaves Tab ─────────────────────────────────────────────────────────

class _MyLeavesTab extends StatelessWidget {
  final List<LeaveRequest> requests;
  const _MyLeavesTab({required this.requests});

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) {
      return const EmptyState(
        icon: Icons.beach_access_outlined,
        title: 'No leave requests',
        subtitle: 'Tap + to submit a new leave request',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: requests.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _LeaveCard(request: requests[i]),
    );
  }
}

class _LeaveCard extends StatelessWidget {
  final LeaveRequest request;
  const _LeaveCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('MMM d, yyyy');
    final typeColor = request.leaveTypeColor != null
        ? Color(int.parse(request.leaveTypeColor!.replaceAll('#', '0xFF')))
        : AppColors.primary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 52,
            decoration: BoxDecoration(
              color: typeColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  request.leaveTypeName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${fmt.format(DateTime.parse(request.fromDate))} – '
                  '${fmt.format(DateTime.parse(request.toDate))}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${request.totalDays.toStringAsFixed(request.totalDays == request.totalDays.truncateToDouble() ? 0 : 1)} day(s)',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          StatusBadge.leave(request.status),
        ],
      ),
    );
  }
}

// ── Balances Tab ──────────────────────────────────────────────────────────

class _BalancesTab extends StatelessWidget {
  final List<LeaveBalance> balances;
  const _BalancesTab({required this.balances});

  @override
  Widget build(BuildContext context) {
    if (balances.isEmpty) {
      return const EmptyState(
        icon: Icons.account_balance_wallet_outlined,
        title: 'No leave balances',
        subtitle: 'Contact HR if you think this is incorrect',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: balances.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _BalanceCard(balance: balances[i]),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final LeaveBalance balance;
  const _BalanceCard({required this.balance});

  @override
  Widget build(BuildContext context) {
    final pct = balance.totalDays > 0
        ? (balance.usedDays / balance.totalDays).clamp(0.0, 1.0)
        : 0.0;
    final typeColor = balance.leaveTypeColor != null
        ? Color(int.parse(balance.leaveTypeColor!.replaceAll('#', '0xFF')))
        : AppColors.primary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                balance.leaveTypeName,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${balance.remainingDays.toStringAsFixed(1)} left',
                style: TextStyle(
                  color: typeColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: typeColor.withOpacity(0.12),
              valueColor: AlwaysStoppedAnimation(typeColor),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Used: ${balance.usedDays.toStringAsFixed(1)}',
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 12),
              ),
              Text(
                'Total: ${balance.totalDays.toStringAsFixed(1)}',
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 12),
              ),
            ],
          ),
          if (balance.pendingDays > 0) ...[
            const SizedBox(height: 4),
            Text(
              'Pending: ${balance.pendingDays.toStringAsFixed(1)} days',
              style: const TextStyle(
                  color: AppColors.pending, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}

// ── New Request Sheet ─────────────────────────────────────────────────────

class _LeaveRequestSheet extends ConsumerStatefulWidget {
  final List<LeaveType> leaveTypes;
  const _LeaveRequestSheet({required this.leaveTypes});

  @override
  ConsumerState<_LeaveRequestSheet> createState() =>
      _LeaveRequestSheetState();
}

class _LeaveRequestSheetState extends ConsumerState<_LeaveRequestSheet> {
  final _formKey = GlobalKey<FormState>();
  LeaveType? _selectedType;
  DateTime _fromDate = DateTime.now();
  DateTime _toDate = DateTime.now();
  bool _isHalfDay = false;
  final _reasonCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.leaveTypes.isNotEmpty) {
      _selectedType = widget.leaveTypes.first;
    }
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isSubmitting = ref.watch(leaveProvider).isSubmitting;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
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
            const Text(
              'New Leave Request',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),

            // Leave Type
            DropdownButtonFormField<LeaveType>(
              value: _selectedType,
              decoration: const InputDecoration(labelText: 'Leave Type'),
              items: widget.leaveTypes
                  .map((t) =>
                      DropdownMenuItem(value: t, child: Text(t.name)))
                  .toList(),
              onChanged: (v) => setState(() => _selectedType = v),
              validator: (v) => v == null ? 'Select a leave type' : null,
            ),
            const SizedBox(height: 14),

            // Dates
            Row(
              children: [
                Expanded(
                  child: _DatePicker(
                    label: 'From',
                    date: _fromDate,
                    onPicked: (d) => setState(() {
                      _fromDate = d;
                      if (_toDate.isBefore(_fromDate)) _toDate = _fromDate;
                    }),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DatePicker(
                    label: 'To',
                    date: _toDate,
                    firstDate: _fromDate,
                    onPicked: (d) => setState(() => _toDate = d),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Half-day toggle
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Half Day', style: TextStyle(fontSize: 14)),
              value: _isHalfDay,
              activeColor: AppColors.primary,
              onChanged: (v) => setState(() => _isHalfDay = v),
            ),

            // Reason
            TextFormField(
              controller: _reasonCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Reason',
                hintText: 'Briefly describe the reason for leave…',
              ),
              validator: (v) {
                if (v == null || v.trim().length < 5) {
                  return 'Please provide at least 5 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: isSubmitting ? null : _submit,
                child: isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Submit Request'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    // Retrieve employeeId from storage
    final info = await SecureStorageService.getUserInfo();
    final employeeId = info['employeeId'];
    if (employeeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Employee profile not found. Please re-login.'),
          backgroundColor: AppColors.absent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final fmt = DateFormat('yyyy-MM-dd');
    final req = CreateLeaveRequest(
      employeeId: employeeId,
      leaveTypeId: _selectedType!.id,
      fromDate: fmt.format(_fromDate),
      toDate: fmt.format(_toDate),
      isHalfDay: _isHalfDay,
      reason: _reasonCtrl.text.trim(),
    );

    final ok = await ref.read(leaveProvider.notifier).submitRequest(req);
    if (ok && mounted) Navigator.pop(context);
  }
}

class _DatePicker extends StatelessWidget {
  final String label;
  final DateTime date;
  final DateTime? firstDate;
  final ValueChanged<DateTime> onPicked;

  const _DatePicker({
    required this.label,
    required this.date,
    this.firstDate,
    required this.onPicked,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: date,
            firstDate: firstDate ?? DateTime(2020),
            lastDate: DateTime(2030),
          );
          if (picked != null) onPicked(picked);
        },
        child: InputDecorator(
          decoration: InputDecoration(labelText: label),
          child: Text(
            DateFormat('MMM d, yyyy').format(date),
            style: const TextStyle(fontSize: 14),
          ),
        ),
      );
}
