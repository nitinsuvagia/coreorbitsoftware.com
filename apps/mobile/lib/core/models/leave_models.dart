// ── Leave Type ─────────────────────────────────────────────────────────────

class LeaveType {
  final String id;
  final String name;
  final String code;
  final String? description;
  final double defaultDaysPerYear;
  final bool isPaid;
  final String? color;

  const LeaveType({
    required this.id,
    required this.name,
    required this.code,
    this.description,
    required this.defaultDaysPerYear,
    required this.isPaid,
    this.color,
  });

  factory LeaveType.fromJson(Map<String, dynamic> json) => LeaveType(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        description: json['description'] as String?,
        defaultDaysPerYear:
            (json['defaultDaysPerYear'] as num?)?.toDouble() ?? 0.0,
        isPaid: json['isPaid'] as bool? ?? true,
        color: json['color'] as String?,
      );
}

// ── Leave Balance ──────────────────────────────────────────────────────────

class LeaveBalance {
  final String id;
  final String leaveTypeId;
  final String leaveTypeName;
  final String leaveTypeCode;
  final String? leaveTypeColor;
  final double totalDays;
  final double usedDays;
  final double pendingDays;
  final double remainingDays;

  const LeaveBalance({
    required this.id,
    required this.leaveTypeId,
    required this.leaveTypeName,
    required this.leaveTypeCode,
    this.leaveTypeColor,
    required this.totalDays,
    required this.usedDays,
    required this.pendingDays,
    required this.remainingDays,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    final lt = json['leaveType'] as Map<String, dynamic>?;
    return LeaveBalance(
      id: json['id'] as String,
      leaveTypeId: json['leaveTypeId'] as String? ?? lt?['id'] as String? ?? '',
      leaveTypeName: lt?['name'] as String? ?? json['leaveTypeName'] as String? ?? '',
      leaveTypeCode: lt?['code'] as String? ?? json['leaveTypeCode'] as String? ?? '',
      leaveTypeColor: lt?['color'] as String? ?? json['leaveTypeColor'] as String?,
      totalDays: (json['totalDays'] as num?)?.toDouble() ?? 0.0,
      usedDays: (json['usedDays'] as num?)?.toDouble() ?? 0.0,
      pendingDays: (json['pendingDays'] as num?)?.toDouble() ?? 0.0,
      remainingDays: (json['remainingDays'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

// ── Leave Request ──────────────────────────────────────────────────────────

class LeaveRequest {
  final String id;
  final String leaveTypeId;
  final String leaveTypeName;
  final String? leaveTypeColor;
  final String fromDate;
  final String toDate;
  final double totalDays;
  final bool isHalfDay;
  final String reason;
  final String status; // pending | approved | rejected | cancelled
  final String? approverComments;
  final DateTime createdAt;

  const LeaveRequest({
    required this.id,
    required this.leaveTypeId,
    required this.leaveTypeName,
    this.leaveTypeColor,
    required this.fromDate,
    required this.toDate,
    required this.totalDays,
    required this.isHalfDay,
    required this.reason,
    required this.status,
    this.approverComments,
    required this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    final lt = json['leaveType'] as Map<String, dynamic>?;
    return LeaveRequest(
      id: json['id'] as String,
      leaveTypeId: json['leaveTypeId'] as String,
      leaveTypeName: lt?['name'] as String? ?? json['leaveTypeName'] as String? ?? '',
      leaveTypeColor: lt?['color'] as String?,
      fromDate: json['fromDate'] as String? ?? json['startDate'] as String? ?? '',
      toDate: json['toDate'] as String? ?? json['endDate'] as String? ?? '',
      totalDays: (json['totalDays'] as num?)?.toDouble() ?? 1.0,
      isHalfDay: json['isHalfDay'] as bool? ?? false,
      reason: json['reason'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      approverComments: json['approverComments'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

// ── New Leave Request Input ────────────────────────────────────────────────

class CreateLeaveRequest {
  final String employeeId;
  final String leaveTypeId;
  final String fromDate;
  final String toDate;
  final bool isHalfDay;
  final String? halfDayType;
  final String reason;

  const CreateLeaveRequest({
    required this.employeeId,
    required this.leaveTypeId,
    required this.fromDate,
    required this.toDate,
    required this.isHalfDay,
    this.halfDayType,
    required this.reason,
  });

  Map<String, dynamic> toJson() => {
        'employeeId': employeeId,
        'leaveTypeId': leaveTypeId,
        'fromDate': fromDate,
        'toDate': toDate,
        'isHalfDay': isHalfDay,
        if (halfDayType != null) 'halfDayType': halfDayType,
        'reason': reason,
      };
}
