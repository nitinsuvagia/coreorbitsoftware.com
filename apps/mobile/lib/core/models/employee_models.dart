// ── Employee Profile ───────────────────────────────────────────────────────

class EmployeeProfile {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? avatar;
  final String? designation;
  final String? department;
  final String? manager;
  final String? employeeCode;
  final String? workLocation;
  final DateTime? joinDate;
  final String status;

  const EmployeeProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.avatar,
    this.designation,
    this.department,
    this.manager,
    this.employeeCode,
    this.workLocation,
    this.joinDate,
    required this.status,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory EmployeeProfile.fromJson(Map<String, dynamic> json) {
    final dept = json['department'] as Map<String, dynamic>?;
    final desig = json['designation'] as Map<String, dynamic>?;
    final mgr = json['reportingManager'] as Map<String, dynamic>?;

    String? mgrName;
    if (mgr != null) {
      mgrName =
          '${mgr['firstName'] ?? ''} ${mgr['lastName'] ?? ''}'.trim();
    }

    return EmployeeProfile(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      avatar: json['avatar'] as String?,
      designation: desig?['name'] as String? ?? json['designation'] as String?,
      department: dept?['name'] as String? ?? json['department'] as String?,
      manager: mgrName,
      employeeCode: json['employeeCode'] as String?,
      workLocation: json['workLocation'] as String?,
      joinDate: json['joinDate'] != null
          ? DateTime.tryParse(json['joinDate'] as String)
          : null,
      status: json['status'] as String? ?? 'ACTIVE',
    );
  }
}
