import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../../../core/models/employee_models.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../providers/profile_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(profileProvider.notifier).fetchProfile(),
          ),
        ],
      ),
      body: state.isLoading
          ? const AppLoadingIndicator(message: 'Loading profile…')
          : state.error != null && state.profile == null
              ? _ErrorView(
                  error: state.error!,
                  onRetry: () =>
                      ref.read(profileProvider.notifier).fetchProfile(),
                )
              : _ProfileContent(
                  profile: state.profile,
                  onLogout: () => _confirmLogout(context, ref),
                ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.absent),
            onPressed: () {
              Navigator.pop(context);
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

// ── Main Content ──────────────────────────────────────────────────────────

class _ProfileContent extends ConsumerWidget {
  final EmployeeProfile? profile;
  final VoidCallback onLogout;

  const _ProfileContent({required this.profile, required this.onLogout});

  String _formatDate(DateTime d) => DateFormat('MMMM d, yyyy').format(d);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Fallback values from auth session when profile failed to load
    final authState = ref.watch(authProvider);
    final session = authState.session;

    final displayName =
        profile?.fullName ?? session?.user.displayName ?? 'Employee';
    final email = profile?.email ?? session?.user.email ?? '';
    final designation = profile?.designation ?? '';
    final department = profile?.department ?? '';
    final tenantName = session?.user.tenantName ?? '';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Avatar header ───────────────────────────────────────────
          _AvatarHeader(
            name: displayName,
            designation: designation,
            department: department,
            avatarUrl: profile?.avatar,
            tenantName: tenantName,
          ),
          const SizedBox(height: 16),

          // ── Contact info card ───────────────────────────────────────
          _Section(
            title: 'Contact Information',
            children: [
              if (email.isNotEmpty)
                InfoRow(
                    icon: Icons.email_outlined,
                    label: 'Email',
                    value: email),
              if (profile?.phone != null)
                InfoRow(
                    icon: Icons.phone_outlined,
                    label: 'Phone',
                    value: profile!.phone!),
            ],
          ),
          const SizedBox(height: 12),

          // ── Employment info card ────────────────────────────────────
          _Section(
            title: 'Employment Details',
            children: [
              if (profile?.employeeCode != null)
                InfoRow(
                    icon: Icons.badge_outlined,
                    label: 'Employee ID',
                    value: profile!.employeeCode!),
              if (designation.isNotEmpty)
                InfoRow(
                    icon: Icons.work_outline,
                    label: 'Designation',
                    value: designation),
              if (department.isNotEmpty)
                InfoRow(
                    icon: Icons.business_outlined,
                    label: 'Department',
                    value: department),
              if (profile?.joinDate != null)
                InfoRow(
                    icon: Icons.calendar_month_outlined,
                    label: 'Joined',
                    value: _formatDate(profile!.joinDate!)),
              if (profile?.workLocation != null)
                InfoRow(
                    icon: Icons.access_time_outlined,
                    label: 'Location',
                    value: profile!.workLocation!),
              if (profile?.manager != null)
                InfoRow(
                    icon: Icons.person_outline,
                    label: 'Reporting To',
                    value: profile!.manager!),
            ],
          ),
          const SizedBox(height: 12),

          // ── Actions ─────────────────────────────────────────────────
          _Section(
            title: 'Account',
            children: [
              _ActionTile(
                icon: Icons.lock_outline,
                label: 'Change Password',
                trailing: const Icon(Icons.chevron_right,
                    color: AppColors.textSecondary),
                onTap: () => _showChangePasswordSheet(context, ref),
              ),
            ],
          ),
          const SizedBox(height: 16),

          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.absentLight,
              foregroundColor: AppColors.absent,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.logout),
            label: const Text('Sign Out',
                style: TextStyle(fontWeight: FontWeight.w600)),
            onPressed: onLogout,
          ),
        ],
      ),
    );
  }

  void _showChangePasswordSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const _ChangePasswordSheet(),
    );
  }
}

// ── Avatar Header ──────────────────────────────────────────────────────────

class _AvatarHeader extends StatelessWidget {
  final String name;
  final String designation;
  final String department;
  final String? avatarUrl;
  final String tenantName;

  const _AvatarHeader({
    required this.name,
    required this.designation,
    required this.department,
    this.avatarUrl,
    required this.tenantName,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withOpacity(0.7),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          // Avatar
          CircleAvatar(
            radius: 34,
            backgroundColor: Colors.white.withOpacity(0.25),
            child: avatarUrl != null && avatarUrl!.isNotEmpty
                ? ClipOval(
                    child: CachedNetworkImage(
                      imageUrl: avatarUrl!,
                      width: 68,
                      height: 68,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => _Initials(name: name),
                    ),
                  )
                : _Initials(name: name),
          ),
          const SizedBox(width: 16),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (designation.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    designation,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.85), fontSize: 13),
                  ),
                ],
                if (department.isNotEmpty || tenantName.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    [if (department.isNotEmpty) department, if (tenantName.isNotEmpty) tenantName]
                        .join(' · '),
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.7), fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Initials extends StatelessWidget {
  final String name;
  const _Initials({required this.name});

  @override
  Widget build(BuildContext context) {
    final parts = name.trim().split(' ');
    final initials = parts.length >= 2
        ? '${parts.first[0]}${parts.last[0]}'
        : name.isNotEmpty
            ? name[0]
            : '?';
    return Text(
      initials.toUpperCase(),
      style: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
        fontSize: 22,
      ),
    );
  }
}

// ── Section card ──────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
              letterSpacing: 0.5,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.divider),
          ),
          child: Column(
            children: children
                .asMap()
                .entries
                .map((e) => Column(
                      children: [
                        e.value,
                        if (e.key < children.length - 1)
                          const Divider(height: 1, indent: 16, endIndent: 16),
                      ],
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }
}

// ── Action tile ───────────────────────────────────────────────────────────

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _ActionTile({
    required this.icon,
    required this.label,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon, size: 20, color: AppColors.textSecondary),
        title: Text(label,
            style: const TextStyle(fontSize: 14, color: AppColors.textPrimary)),
        trailing: trailing,
        onTap: onTap,
        dense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      );
}

// ── Change Password Sheet ─────────────────────────────────────────────────

class _ChangePasswordSheet extends ConsumerStatefulWidget {
  const _ChangePasswordSheet();

  @override
  ConsumerState<_ChangePasswordSheet> createState() =>
      _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends ConsumerState<_ChangePasswordSheet> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _loading = false;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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
                'Change Password',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _PasswordField(
                controller: _currentCtrl,
                label: 'Current Password',
                obscure: _obscureCurrent,
                onToggle: () =>
                    setState(() => _obscureCurrent = !_obscureCurrent),
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              _PasswordField(
                controller: _newCtrl,
                label: 'New Password',
                obscure: _obscureNew,
                onToggle: () => setState(() => _obscureNew = !_obscureNew),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if (v.length < 8) return 'Must be at least 8 characters';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              _PasswordField(
                controller: _confirmCtrl,
                label: 'Confirm New Password',
                obscure: _obscureConfirm,
                onToggle: () =>
                    setState(() => _obscureConfirm = !_obscureConfirm),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if (v != _newCtrl.text) return 'Passwords do not match';
                  return null;
                },
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Update Password',
                        style: TextStyle(fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    // TODO: wire to auth service change-password endpoint
    await Future.delayed(const Duration(seconds: 1));
    setState(() => _loading = false);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated successfully')),
      );
    }
  }
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool obscure;
  final VoidCallback onToggle;
  final String? Function(String?)? validator;

  const _PasswordField({
    required this.controller,
    required this.label,
    required this.obscure,
    required this.onToggle,
    this.validator,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        obscureText: obscure,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: IconButton(
            icon: Icon(obscure ? Icons.visibility_off : Icons.visibility,
                size: 20),
            onPressed: onToggle,
          ),
        ),
      );
}

// ── Error view ────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off_outlined,
                  size: 48, color: AppColors.textDisabled),
              const SizedBox(height: 12),
              Text(error,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      );
}
