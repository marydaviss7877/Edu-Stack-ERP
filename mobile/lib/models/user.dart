class AppUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? orgId;
  final String? branchId;
  final String? photoUrl;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.orgId,
    this.branchId,
    this.photoUrl,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
        name: json['name'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
        orgId: json['orgId']?.toString(),
        branchId: json['branchId']?.toString(),
        photoUrl: json['photoUrl'] as String?,
      );

  bool get isStudent => role == 'student';
  bool get isTeacher => role == 'teacher';
  bool get isPrincipal => role == 'branch_principal';
  bool get isCoordinator => role == 'coordinator';
  bool get isAccountant => role == 'accountant';
  bool get isItAdmin => role == 'it_admin';
  bool get isGroupAdmin => role == 'group_admin';
  bool get isSuperAdmin => role == 'super_admin';

  String get homeRoute {
    switch (role) {
      case 'student':
        return '/student';
      case 'teacher':
        return '/teacher';
      case 'branch_principal':
        return '/principal';
      case 'coordinator':
        return '/coordinator';
      case 'accountant':
        return '/accountant';
      case 'it_admin':
        return '/it-admin';
      case 'group_admin':
        return '/group';
      case 'super_admin':
        return '/admin';
      default:
        return '/login';
    }
  }
}
