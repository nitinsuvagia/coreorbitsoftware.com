// ── Attendance Record ──────────────────────────────────────────────────────

class AttendanceRecord {
  final String id;
  final String employeeId;
  final DateTime date;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final double workHours;
  final double overtime;
  final String status; // present | absent | half_day | on_leave | holiday | weekend
  final bool isRemote;
  final List<BreakRecord> breaks;
  final String? notes;

  const AttendanceRecord({
    required this.id,
    required this.employeeId,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.workHours,
    required this.overtime,
    required this.status,
    required this.isRemote,
    required this.breaks,
    this.notes,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) =>
        v == null ? null : DateTime.tryParse(v.toString());

    return AttendanceRecord(
      id: json['id'] as String,
      employeeId: json['employeeId'] as String? ?? '',
      date: parseDate(json['date'] ?? json['createdAt']) ?? DateTime.now(),
      checkIn: parseDate(json['checkIn'] ?? json['checkInTime']),
      checkOut: parseDate(json['checkOut'] ?? json['checkOutTime']),
      workHours: (json['workHours'] as num?)?.toDouble() ?? 0.0,
      overtime: (json['overtime'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'present',
      isRemote: json['isRemote'] as bool? ?? false,
      breaks: (json['breaks'] as List<dynamic>?)
              ?.map((b) => BreakRecord.fromJson(b as Map<String, dynamic>))
              .toList() ??
          [],
      notes: json['notes'] as String?,
    );
  }

  bool get isCheckedIn => checkIn != null;
  bool get isCheckedOut => checkOut != null;
  bool get isOnBreak =>
      breaks.isNotEmpty &&
      breaks.last.startTime != null &&
      breaks.last.endTime == null;
}

class BreakRecord {
  final String id;
  final String breakType; // lunch | short | other
  final DateTime? startTime;
  final DateTime? endTime;

  const BreakRecord({
    required this.id,
    required this.breakType,
    this.startTime,
    this.endTime,
  });

  factory BreakRecord.fromJson(Map<String, dynamic> json) {
    DateTime? p(dynamic v) =>
        v == null ? null : DateTime.tryParse(v.toString());
    return BreakRecord(
      id: json['id'] as String,
      breakType: json['breakType'] as String? ?? 'short',
      startTime: p(json['startTime']),
      endTime: p(json['endTime']),
    );
  }
}

// ── Monthly Summary ────────────────────────────────────────────────────────

class MonthlySummary {
  final int year;
  final int month;
  final int totalDays;
  final int presentDays;
  final int absentDays;
  final int leaveDays;
  final int halfDays;
  final int holidayDays;
  final double totalWorkHours;

  const MonthlySummary({
    required this.year,
    required this.month,
    required this.totalDays,
    required this.presentDays,
    required this.absentDays,
    required this.leaveDays,
    required this.halfDays,
    required this.holidayDays,
    required this.totalWorkHours,
  });

  factory MonthlySummary.fromJson(Map<String, dynamic> json) => MonthlySummary(
        year: json['year'] as int? ?? DateTime.now().year,
        month: json['month'] as int? ?? DateTime.now().month,
        totalDays: json['totalDays'] as int? ?? 0,
        presentDays: json['presentDays'] as int? ?? 0,
        absentDays: json['absentDays'] as int? ?? 0,
        leaveDays: json['leaveDays'] as int? ?? 0,
        halfDays: json['halfDays'] as int? ?? 0,
        holidayDays: json['holidayDays'] as int? ?? 0,
        totalWorkHours: (json['totalWorkHours'] as num?)?.toDouble() ?? 0.0,
      );
}
