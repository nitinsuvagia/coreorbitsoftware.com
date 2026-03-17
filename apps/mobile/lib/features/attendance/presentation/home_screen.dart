import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/models/attendance_models.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../providers/attendance_provider.dart';

// ══════════════════════════════════════════════════════════════
//  Home / Dashboard  –  HR App Reference Design
// ══════════════════════════════════════════════════════════════

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final attendance = ref.watch(attendanceProvider);

    final name = auth.session?.user.displayName ?? 'Employee';
    final roles = auth.session?.user.roles ?? [];
    final role =
        roles.isNotEmpty ? _formatRole(roles.first) : 'Employee';
    final avatarUrl = auth.session?.user.avatar;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FF),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(attendanceProvider.notifier).fetchToday(),
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Header(
                      name: name, role: role, avatarUrl: avatarUrl),
                  const _DateStrip(),
                  const SizedBox(height: 20),
                  _TodayAttendanceSection(attendance: attendance),
                  const SizedBox(height: 20),
                  _ActivitySection(attendance: attendance, ref: ref),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatRole(String r) => r
      .split('_')
      .map((w) => w.isNotEmpty
          ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
          : '')
      .join(' ');
}

// ─────────────────────────────────────────────────────────────
//  Header  (white card with avatar + name + role + bell)
// ─────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final String name;
  final String role;
  final String? avatarUrl;

  const _Header(
      {required this.name, required this.role, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    final initials = name
        .trim()
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
        .join();

    return Container(
      color: Colors.white,
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 16, 20, 20),
      child: Row(
        children: [
          // Avatar circle
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                  color: AppColors.primary.withOpacity(0.25), width: 2),
            ),
            child: ClipOval(
              child: avatarUrl != null && avatarUrl!.isNotEmpty
                  ? Image.network(
                      avatarUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          _InitialsCircle(initials: initials),
                    )
                  : _InitialsCircle(initials: initials),
            ),
          ),
          const SizedBox(width: 14),
          // Name + role
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  role,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF6B7280),
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
          // Bell button
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border:
                  Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
            ),
            child: const Icon(Icons.notifications_none_rounded,
                color: Color(0xFF111827), size: 22),
          ),
        ],
      ),
    );
  }
}

class _InitialsCircle extends StatelessWidget {
  final String initials;
  const _InitialsCircle({required this.initials});

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.primary.withOpacity(0.12),
        child: Center(
          child: Text(
            initials,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
        ),
      );
}

// ─────────────────────────────────────────────────────────────
//  Horizontal Date Strip
// ─────────────────────────────────────────────────────────────

class _DateStrip extends StatefulWidget {
  const _DateStrip();

  @override
  State<_DateStrip> createState() => _DateStripState();
}

class _DateStripState extends State<_DateStrip> {
  static const int _before = 7;
  static const int _after = 14;
  static const double _itemW = 60.0;
  static const double _gap = 9.0;

  late final ScrollController _ctrl;
  late final DateTime _today;
  late final List<DateTime> _days;

  @override
  void initState() {
    super.initState();
    _today = DateTime.now();
    _days = List.generate(
      _before + 1 + _after,
      (i) => _today.subtract(Duration(days: _before - i)),
    );
    _ctrl = ScrollController(
      initialScrollOffset: _before * (_itemW + _gap) - 20,
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  bool _isToday(DateTime d) =>
      d.year == _today.year &&
      d.month == _today.month &&
      d.day == _today.day;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 18),
      child: SizedBox(
        height: 84,
        child: ListView.builder(
          controller: _ctrl,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _days.length,
          itemBuilder: (_, i) {
            final d = _days[i];
            final sel = _isToday(d);
            final isWeekend = d.weekday == DateTime.saturday ||
                d.weekday == DateTime.sunday;

            // Colors
            final bgColor = sel
                ? AppColors.primary
                : isWeekend
                    ? const Color(0xFFF3F4F6)
                    : Colors.white;
            final borderColor = sel
                ? AppColors.primary
                : isWeekend
                    ? const Color(0xFFE5E7EB)
                    : const Color(0xFFE5E7EB);
            final dayNumColor = sel
                ? Colors.white
                : isWeekend
                    ? const Color(0xFFD1D5DB)
                    : const Color(0xFF111827);
            final dayLabelColor = sel
                ? Colors.white.withOpacity(0.85)
                : isWeekend
                    ? const Color(0xFFD1D5DB)
                    : const Color(0xFF9CA3AF);

            return Container(
              width: _itemW,
              margin: EdgeInsets.only(
                  right: i < _days.length - 1 ? _gap : 0),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    d.day.toString().padLeft(2, '0'),
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: dayNumColor,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    DateFormat('EEE').format(d),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: dayLabelColor,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Today Attendance  – 2 × 2 card grid
// ─────────────────────────────────────────────────────────────

class _TodayAttendanceSection extends StatelessWidget {
  final AttendanceState attendance;
  const _TodayAttendanceSection({required this.attendance});

  @override
  Widget build(BuildContext context) {
    final record = attendance.today;
    final timeFmt = DateFormat('hh:mm a');

    final checkInStr = record?.checkIn != null
        ? timeFmt.format(record!.checkIn!.toLocal())
        : '--:-- --';
    final checkOutStr = record?.checkOut != null
        ? timeFmt.format(record!.checkOut!.toLocal())
        : '--:-- --';

    final hour = record?.checkIn?.toLocal().hour ?? -1;
    final checkInStatus = hour < 0
        ? 'Not yet'
        : hour < 9
            ? 'Early Bird'
            : hour <= 9
                ? 'On Time'
                : 'Late';

    final checkOutStatus =
        record?.checkOut != null ? 'Go Home' : 'Still Working';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Today Attendance',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _AttCard(
                  icon: Icons.login_rounded,
                  label: 'Check In',
                  value: checkInStr,
                  sub: checkInStatus,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _AttCard(
                  icon: Icons.logout_rounded,
                  label: 'Check Out',
                  value: checkOutStr,
                  sub: checkOutStatus,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _AttCard(
                  icon: Icons.coffee_rounded,
                  label: 'Break Time',
                  value: '00:30 min',
                  sub: 'Avg Time 30 min',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _AttCard(
                  icon: Icons.calendar_today_rounded,
                  label: 'Total Days',
                  value: '${_workingDaysThisMonth()}',
                  sub: 'Working Days',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  int _workingDaysThisMonth() {
    final now = DateTime.now();
    final first = DateTime(now.year, now.month, 1);
    int count = 0;
    for (var d = first; !d.isAfter(now); d = d.add(const Duration(days: 1))) {
      if (d.weekday != DateTime.saturday &&
          d.weekday != DateTime.sunday) { count++; }
    }
    return count;
  }
}

class _AttCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String sub;

  const _AttCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon + label row
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Big value
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          // Subtitle
          Text(
            sub,
            style: const TextStyle(
                fontSize: 12, color: Color(0xFF9CA3AF)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Your Activity + Swipe button
// ─────────────────────────────────────────────────────────────

class _ActivitySection extends StatelessWidget {
  final AttendanceState attendance;
  final WidgetRef ref;

  const _ActivitySection(
      {required this.attendance, required this.ref});

  @override
  Widget build(BuildContext context) {
    final record = attendance.today;
    final isCheckedIn =
        record?.isCheckedIn == true && record?.isCheckedOut != true;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          const Text(
            'Your Activity',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 14),
          // Swipe button (matches reference image)
          _SwipeCheckButton(
            isCheckedIn: isCheckedIn,
            isLoading: attendance.isActionLoading,
            onConfirm: isCheckedIn
                ? () => ref.read(attendanceProvider.notifier).checkOut()
                : () => ref.read(attendanceProvider.notifier).checkIn(),
          ),
          // Total worked timer – always visible below swipe button
          const SizedBox(height: 14),
          _LiveTimerCard(
              elapsed: attendance.elapsed, isActive: isCheckedIn),
          // Error banner
          if (attendance.error != null) ...[
            const SizedBox(height: 10),
            _ErrorBanner(message: attendance.error!),
          ],
          // Sessions list
          if (attendance.sessions.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              "Today's Sessions",
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 10),
            ...attendance.sessions.map((s) => _SessionTile(record: s)),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Swipe-to-Check-In / Check-Out button
// ─────────────────────────────────────────────────────────────

class _SwipeCheckButton extends StatefulWidget {
  final bool isCheckedIn;
  final bool isLoading;
  final VoidCallback onConfirm;

  const _SwipeCheckButton({
    required this.isCheckedIn,
    required this.isLoading,
    required this.onConfirm,
  });

  @override
  State<_SwipeCheckButton> createState() => _SwipeCheckButtonState();
}

class _SwipeCheckButtonState extends State<_SwipeCheckButton>
    with SingleTickerProviderStateMixin {
  double _frac = 0.0; // 0..1 drag progress
  bool _confirmed = false;

  late AnimationController _springCtrl;
  late Animation<double> _springAnim;

  static const double _thumbSz = 54.0;
  static const double _btnH = 68.0;
  static const double _pad = 7.0;
  static const double _threshold = 0.75;

  @override
  void initState() {
    super.initState();
    _springCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _springAnim = Tween<double>(begin: 0, end: 0).animate(
        CurvedAnimation(parent: _springCtrl, curve: Curves.elasticOut));
    _springCtrl
        .addListener(() => setState(() => _frac = _springAnim.value));
  }

  @override
  void dispose() {
    _springCtrl.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(_SwipeCheckButton old) {
    super.didUpdateWidget(old);
    if (old.isCheckedIn != widget.isCheckedIn) {
      setState(() {
        _frac = 0.0;
        _confirmed = false;
      });
    }
  }

  void _onDragUpdate(DragUpdateDetails d, double trackW) {
    if (_confirmed || widget.isLoading) return;
    final maxTravel = trackW - _thumbSz - _pad * 2;
    setState(() {
      _frac = ((_frac * maxTravel + d.delta.dx) / maxTravel)
          .clamp(0.0, 1.0);
    });
  }

  void _onDragEnd(double trackW) {
    if (_confirmed || widget.isLoading) return;
    if (_frac >= _threshold) {
      setState(() => _confirmed = true);
      HapticFeedback.heavyImpact();
      widget.onConfirm();
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          setState(() {
            _frac = 0.0;
            _confirmed = false;
          });
        }
      });
    } else {
      _springAnim = Tween<double>(begin: _frac, end: 0.0).animate(
          CurvedAnimation(
              parent: _springCtrl, curve: Curves.elasticOut));
      _springCtrl.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOut = widget.isCheckedIn;
    final trackColor =
        isOut ? const Color(0xFFEF4444) : AppColors.primary;
    final label =
        isOut ? 'Swipe to Check Out' : 'Swipe to Check In';
    final thumbIcon =
        isOut ? Icons.logout_rounded : Icons.arrow_forward_rounded;

    return LayoutBuilder(builder: (_, box) {
      final trackW = box.maxWidth;
      final maxTravel = trackW - _thumbSz - _pad * 2;
      final thumbLeft = _pad + _frac * maxTravel;
      final labelOpacity = (1.0 - _frac * 1.8).clamp(0.0, 1.0);

      return GestureDetector(
        onHorizontalDragUpdate: (d) => _onDragUpdate(d, trackW),
        onHorizontalDragEnd: (_) => _onDragEnd(trackW),
        child: Container(
          height: _btnH,
          decoration: BoxDecoration(
            color: trackColor,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: trackColor.withOpacity(0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Label text (fades as you drag)
              Center(
                child: Opacity(
                  opacity: labelOpacity,
                  child: widget.isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2.5),
                        )
                      : Text(
                          label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                ),
              ),
              // White thumb (square with icon)
              if (!widget.isLoading)
                Positioned(
                  left: thumbLeft,
                  top: (_btnH - _thumbSz) / 2,
                  child: Container(
                    width: _thumbSz,
                    height: _thumbSz,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.12),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(thumbIcon, color: trackColor, size: 26),
                  ),
                ),
            ],
          ),
        ),
      );
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  Live timer card (shown while checked in)
// ─────────────────────────────────────────────────────────────

class _LiveTimerCard extends StatelessWidget {
  final Duration elapsed;
  final bool isActive;
  const _LiveTimerCard(
      {required this.elapsed, required this.isActive});

  @override
  Widget build(BuildContext context) {
    final h = elapsed.inHours.toString().padLeft(2, '0');
    final m = (elapsed.inMinutes % 60).toString().padLeft(2, '0');
    final s = (elapsed.inSeconds % 60).toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          Icon(Icons.timer_outlined, color: AppColors.primary, size: 22),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$h:$m:$s',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              Text(
                isActive ? 'Total time worked today' : 'Total time worked',
                style: const TextStyle(
                    fontSize: 12, color: Color(0xFF6B7280)),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : const Color(0xFF059669),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              isActive ? 'Active' : 'Done',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Session tile
// ─────────────────────────────────────────────────────────────

class _SessionTile extends StatelessWidget {
  final AttendanceRecord record;
  const _SessionTile({required this.record});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('hh:mm a');
    final inStr = record.checkIn != null
        ? fmt.format(record.checkIn!.toLocal())
        : '--';
    final outStr = record.checkOut != null
        ? fmt.format(record.checkOut!.toLocal())
        : 'Ongoing';

    String dur = '';
    if (record.checkIn != null && record.checkOut != null) {
      final d = record.checkOut!.difference(record.checkIn!);
      final h = d.inHours;
      final m = d.inMinutes % 60;
      dur = h > 0 ? '${h}h ${m}m' : '${m}m';
    }

    final active = record.checkOut == null;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.10),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.access_time_rounded,
                color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$inStr  →  $outStr',
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF111827)),
                ),
                if (dur.isNotEmpty)
                  Text(dur,
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xFF9CA3AF))),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: active
                  ? AppColors.primary.withOpacity(0.12)
                  : const Color(0xFFD1FAE5),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              active ? 'Active' : 'Done',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: active
                    ? AppColors.primary
                    : const Color(0xFF059669),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Error banner
// ─────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFFECACA)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline,
                color: Color(0xFFEF4444), size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                    color: Color(0xFFDC2626), fontSize: 13),
              ),
            ),
          ],
        ),
      );
}
