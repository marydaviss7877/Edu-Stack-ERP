class StudentProfile {
  final String id;
  final String name;
  final String email;
  final String? rollNo;
  final String? className;
  final String? sectionName;
  final String? photoUrl;
  final String? guardianName;
  final String? guardianPhone;

  const StudentProfile({
    required this.id,
    required this.name,
    required this.email,
    this.rollNo,
    this.className,
    this.sectionName,
    this.photoUrl,
    this.guardianName,
    this.guardianPhone,
  });

  factory StudentProfile.fromJson(Map<String, dynamic> j) {
    final profile = j['profile'] as Map<String, dynamic>? ?? {};
    final classId = j['classId'];
    final sectionId = j['sectionId'];
    return StudentProfile(
      id: j['_id']?.toString() ?? j['id']?.toString() ?? '',
      name: profile['name'] as String? ?? j['name'] as String? ?? '',
      email: j['email'] as String? ?? '',
      rollNo: j['rollNo'] as String?,
      className: classId is Map ? classId['name'] as String? : null,
      sectionName: sectionId is Map ? sectionId['name'] as String? : null,
      photoUrl: profile['photoUrl'] as String?,
      guardianName:
          (j['guardian'] as Map<String, dynamic>?)?['name'] as String?,
      guardianPhone:
          (j['guardian'] as Map<String, dynamic>?)?['phone'] as String?,
    );
  }

  // Fallback when API returns auth/me style response (no nested profile)
  factory StudentProfile.fromAuthMe(Map<String, dynamic> j) => StudentProfile(
        id: j['id']?.toString() ?? j['_id']?.toString() ?? '',
        name: j['name'] as String? ?? '',
        email: j['email'] as String? ?? '',
        photoUrl: j['profilePhotoUrl'] as String?,
      );
}
