import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../../../core/models/attendance_models.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../providers/review_provider.dart';

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key});

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  DateTime _selectedDay = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reviewProvider);
    final recordMap = _buildMap(state.records);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance Review'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref
                .read(reviewProvider.notifier)
                .fetchMonth(state.focusedMonth),
          ),
        ],
      ),
      body: state.isLoading
          ? const AppLoadingIndicator(message: 'Loading attendance…')
          : Column(
              children: [
                // ── Calendar ──────────────────────────────────────────
                Container(
                  color: AppColors.surface,
                  child: TableCalendar<AttendanceRecord>(
                    firstDay: DateTime(2020),
                    lastDay: DateTime(2030),
                    focusedDay: state.focusedMonth,
                    selectedDayPredicate: (d) =>
                        isSameDay(_selectedDay, d),
                    eventLoader: (day) {
                      final key = _dateKey(day);
                      return recordMap[key] != null
                          ? [recordMap[key]!]
                          : [];
                    },
                    onDaySelected: (selected, focused) {
                      setState(() => _selectedDay = selected);
                    },
                    onPageChanged: (focused) {
                      ref
                          .read(reviewProvider.notifier)
                          .fetchMonth(focused);
                    },
                    headerStyle: const HeaderStyle(
                      formatButtonVisible: false,
                      titleCentered: true,
                      titleTextStyle: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    calendarStyle: const CalendarStyle(
                      todayDecoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        shape: BoxShape.circle,
                      ),
                      todayTextStyle:
                          TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                      selectedDecoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      selectedTextStyle: TextStyle(color: Colors.white),
                      outsideDaysVisible: false,
                    ),
                    calendarBuilders: CalendarBuilders(
                      markerBuilder: (context, day, events) {
                        if (events.isEmpty) return null;
                        final record = events.first as AttendanceRecord;
                        return Positioned(
                          bottom: 1,
                          child: Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: AppColors.attendanceStatusColor(
                                  record.status),
                              shape: BoxShape.circle,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),

                // ── Summary chips ─────────────────────────────────────
                _SummaryBar(records: state.records),

                // ── Selected day detail ───────────────────────────────
                Expanded(
                  child: _DayDetail(
                    record: recordMap[_dateKey(_selectedDay)],
                    selectedDay: _selectedDay,
                  ),
                ),
              ],
            ),
    );
  }

  Map<String, AttendanceRecord> _buildMap(
      List<AttendanceRecord> records) {
    final map = <String, AttendanceRecord>{};
    for (final r in records) {
      map[_dateKey(r.date)] = r;
    }
    return map;
  }

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

// ── Summary Bar ────────────────────────────────────────────────────────────

class _SummaryBar extends StatelessWidget {
  final List<AttendanceRecord> records;
  const _SummaryBar({required this.records});

  @override
  Widget build(BuildContext context) {
    int present = 0, absent = 0, leave = 0, halfDay = 0;
    for (final r in records) {
      switch (r.status) {
        case 'present':
          present++;
          break;
        case 'absent':
          absent++;
          break;
        case 'on_leave':
          leave++;
          break;
        case 'half_day':
          halfDay++;
          break;
      }
    }

    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _SummaryChip(label: 'Present', count: present, color: AppColors.present),
          _SummaryChip(label: 'Absent', count: absent, color: AppColors.absent),
          _SummaryChip(label: 'Leave', count: leave, color: AppColors.leave),
          _SummaryChip(label: 'Half Day', count: halfDay, color: AppColors.halfDay),
        ],
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _SummaryChip(
      {required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text(
            '$count',
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 18),
          ),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 11)),
        ],
      );
}

// ── Day Detail ─────────────────────────────────────────────────────────────

class _DayDetail extends StatelessWidget {
  final AttendanceRecord? record;
  final DateTime selectedDay;
  const _DayDetail({this.record, required this.selectedDay});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('h:mm a');
    if (record == null) {
      return EmptyState(
        icon: Icons.event_busy_outlined,
        title: 'No record for ${DateFormat('MMM d').format(selectedDay)}',
        subtitle: 'Tap a day with a marker to see details',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.divider),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormat('EEEE, MMMM d').format(selectedDay),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                ),
                StatusBadge.attendance(record!.status),
              ],
            ),
            const Divider(height: 20),
            InfoRow(
              icon: Icons.login,
              label: 'Check In',
              value: record!.checkIn != null
                  ? fmt.format(record!.checkIn!)
                  : 'Not recorded',
            ),
            InfoRow(
              icon: Icons.logout,
              label: 'Check Out',
              value: record!.checkOut != null
                  ? fmt.format(record!.checkOut!)
                  : 'Not recorded',
            ),
            InfoRow(
              icon: Icons.timer_outlined,
              label: 'Work Hours',
              value: '${record!.workHours.toStringAsFixed(2)} hrs',
            ),
            if (record!.overtime > 0)
              InfoRow(
                icon: Icons.more_time,
                label: 'Overtime',
                value: '${record!.overtime.toStringAsFixed(2)} hrs',
              ),
            InfoRow(
              icon: record!.isRemote
                  ? Icons.home_work_outlined
                  : Icons.business_outlined,
              label: 'Work Mode',
              value: record!.isRemote ? 'Remote' : 'On-site',
            ),
          ],
        ),
      ),
    );
  }
}
