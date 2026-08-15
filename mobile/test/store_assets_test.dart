import 'dart:io';
import 'dart:ui' as ui;

import 'package:edustack_mobile/core/layout/responsive.dart';
import 'package:edustack_mobile/core/storage/local_storage.dart';
import 'package:edustack_mobile/core/theme/app_design.dart';
import 'package:edustack_mobile/core/theme/app_theme.dart';
import 'package:edustack_mobile/models/assignment.dart';
import 'package:edustack_mobile/models/challan.dart';
import 'package:edustack_mobile/models/result.dart';
import 'package:edustack_mobile/models/student_profile.dart';
import 'package:edustack_mobile/models/timetable.dart';
import 'package:edustack_mobile/models/user.dart';
import 'package:edustack_mobile/providers/accountant_providers.dart';
import 'package:edustack_mobile/providers/admin_providers.dart';
import 'package:edustack_mobile/providers/auth_provider.dart';
import 'package:edustack_mobile/providers/inventory_providers.dart';
import 'package:edustack_mobile/providers/principal_providers.dart';
import 'package:edustack_mobile/providers/student_providers.dart';
import 'package:edustack_mobile/providers/teacher_providers.dart';
import 'package:edustack_mobile/screens/accountant/dashboard/accountant_dashboard.dart';
import 'package:edustack_mobile/screens/admin/dashboard/admin_dashboard.dart';
import 'package:edustack_mobile/screens/admin/users/user_management_screen.dart';
import 'package:edustack_mobile/screens/principal/attendance/principal_attendance_report.dart';
import 'package:edustack_mobile/screens/principal/dashboard/principal_dashboard.dart';
import 'package:edustack_mobile/screens/student/dashboard/student_dashboard.dart';
import 'package:edustack_mobile/screens/student/fees/my_challans.dart';
import 'package:edustack_mobile/screens/student/results/results_screen.dart';
import 'package:edustack_mobile/screens/student/timetable/student_timetable.dart';
import 'package:edustack_mobile/screens/teacher/attendance/select_class_screen.dart';
import 'package:edustack_mobile/screens/teacher/dashboard/teacher_dashboard.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _captureKey = ValueKey('store-capture');

Future<void> _loadFont(String family, String assetPath) async {
  final data = await rootBundle.load(assetPath);
  final loader = FontLoader(family)..addFont(Future.value(data));
  await loader.load();
}

const _student = AppUser(
    id: 's14',
    name: 'Ayesha Khan',
    email: 'ayesha@falconschool.edu.pk',
    role: 'student');
const _teacher = AppUser(
    id: 't7',
    name: 'Usman Ahmed',
    email: 'usman@falconschool.edu.pk',
    role: 'teacher');
const _principal = AppUser(
    id: 'p1',
    name: 'Dr. Fatima Noor',
    email: 'principal@falconschool.edu.pk',
    role: 'branch_principal');
const _accountant = AppUser(
    id: 'a3',
    name: 'Ali Raza',
    email: 'accounts@falconschool.edu.pk',
    role: 'accountant');
const _admin = AppUser(
    id: 'admin1',
    name: 'Super Admin',
    email: 'admin@edustack.pk',
    role: 'super_admin');

final _result = ExamResult(
  id: 'r1',
  examId: 'e1',
  examName: 'Mid Term Examination 2026',
  subjectMarks: const [
    SubjectMark(
        subjectId: 'math',
        subjectName: 'Mathematics',
        marksObtained: 88,
        totalMarks: 100,
        isAbsent: false,
        isPassed: true),
    SubjectMark(
        subjectId: 'science',
        subjectName: 'General Science',
        marksObtained: 92,
        totalMarks: 100,
        isAbsent: false,
        isPassed: true),
    SubjectMark(
        subjectId: 'english',
        subjectName: 'English',
        marksObtained: 84,
        totalMarks: 100,
        isAbsent: false,
        isPassed: true),
    SubjectMark(
        subjectId: 'pak',
        subjectName: 'Pakistan Studies',
        marksObtained: 87,
        totalMarks: 100,
        isAbsent: false,
        isPassed: true),
  ],
  totalMarksObtained: 351,
  totalMarks: 400,
  percentage: 87.8,
  grade: 'A',
  classPosition: 3,
  sectionPosition: 2,
  isPassed: true,
  remarks: 'Excellent progress throughout the term.',
);

final _challans = [
  Challan(
    id: 'aug',
    month: 'August 2026',
    challanNo: 'BCH-0826-014',
    items: const [
      ChallanItem(name: 'Tuition Fee', amount: 7000),
      ChallanItem(name: 'Science Lab', amount: 1500)
    ],
    totalAmount: 8500,
    netAmount: 8500,
    paidAmount: 0,
    dueDate: DateTime(2026, 8, 20),
    status: 'unpaid',
  ),
  Challan(
    id: 'jul',
    month: 'July 2026',
    challanNo: 'BCH-0726-014',
    items: const [ChallanItem(name: 'Tuition Fee', amount: 7000)],
    totalAmount: 7000,
    netAmount: 7000,
    paidAmount: 7000,
    dueDate: DateTime(2026, 7, 20),
    status: 'paid',
  ),
];

final _timetable = Timetable(
  id: 'tt8a',
  classId: 'grade8',
  sectionId: 'a',
  isActive: true,
  periodTimings: const [
    PeriodTiming(periodNo: 1, startTime: '08:00', endTime: '08:45'),
    PeriodTiming(periodNo: 2, startTime: '08:45', endTime: '09:30'),
    PeriodTiming(periodNo: 3, startTime: '09:45', endTime: '10:30'),
    PeriodTiming(periodNo: 4, startTime: '10:30', endTime: '11:15'),
  ],
  slots: [
    for (var day = 1; day <= 6; day++) ...[
      TimetableSlot(
          dayOfWeek: day,
          periodNo: 1,
          subjectId: 'math',
          subjectName: 'Mathematics',
          teacherId: 't1',
          teacherName: 'Usman Ahmed',
          roomNo: 'Room 12'),
      TimetableSlot(
          dayOfWeek: day,
          periodNo: 2,
          subjectId: 'science',
          subjectName: 'General Science',
          teacherId: 't2',
          teacherName: 'Sana Malik',
          roomNo: 'Science Lab'),
      TimetableSlot(
          dayOfWeek: day,
          periodNo: 3,
          subjectId: 'english',
          subjectName: 'English',
          teacherId: 't3',
          teacherName: 'Hira Khan',
          roomNo: 'Room 12'),
      TimetableSlot(
          dayOfWeek: day,
          periodNo: 4,
          subjectId: 'pak',
          subjectName: 'Pakistan Studies',
          teacherId: 't4',
          teacherName: 'Adeel Shah',
          roomNo: 'Room 8'),
    ],
  ],
);

final _finance = <String, dynamic>{
  'month': '2026-08',
  'operatingSurplus': 1250000,
  'operatingMargin': 18.4,
  'totalRevenue': 6900000,
  'feeRevenue': 6250000,
  'otherIncome': 650000,
  'operatingExpenses': 3120000,
  'payroll': 2530000,
  'depreciation': 180000,
  'cashSurplus': 1430000,
  'outstandingFees': 870000,
  'feeRecoveryRate': 87.4,
  'dataAsOf': '2026-08-15T10:42:00.000Z',
  'receivableAgeing': {
    'current': {'amount': 520000, 'accounts': 62},
    'days31to60': {'amount': 240000, 'accounts': 21},
    'over60': {'amount': 110000, 'accounts': 9},
  },
};

final _inventory = <String, dynamic>{
  'netBookValue': 12850000,
  'fixedAssets': 184,
  'lowStock': 6,
  'pendingExpenses': 3,
  'pendingProcurements': 2,
  'maintenanceDue': 4,
  'verificationOverdue': 2,
};

final _classes = <Map<String, dynamic>>[
  {
    'className': 'Grade 6',
    'sectionName': 'A',
    'presentCount': 29,
    'absentCount': 1,
    'totalStudents': 30
  },
  {
    'className': 'Grade 7',
    'sectionName': 'B',
    'presentCount': 26,
    'absentCount': 4,
    'totalStudents': 30
  },
  {
    'className': 'Grade 8',
    'sectionName': 'A',
    'presentCount': 27,
    'absentCount': 1,
    'totalStudents': 28
  },
  {
    'className': 'Grade 9',
    'sectionName': 'A',
    'presentCount': 25,
    'absentCount': 3,
    'totalStudents': 28
  },
];

final _lowAttendance = <Map<String, dynamic>>[
  {
    'profile': {'name': 'Bilal Ahmed'},
    'className': 'Grade 7',
    'sectionName': 'B',
    'attendancePercentage': 68.0
  },
  {
    'profile': {'name': 'Maham Khan'},
    'className': 'Grade 9',
    'sectionName': 'A',
    'attendancePercentage': 72.0
  },
];

final _users = <Map<String, dynamic>>[
  {
    '_id': 'u1',
    'name': 'Ayesha Khan',
    'email': 'ayesha@falconschool.edu.pk',
    'role': 'student',
    'isActive': true
  },
  {
    '_id': 'u2',
    'name': 'Usman Ahmed',
    'email': 'usman@falconschool.edu.pk',
    'role': 'teacher',
    'isActive': true
  },
  {
    '_id': 'u3',
    'name': 'Sara Malik',
    'email': 'sara@falconschool.edu.pk',
    'role': 'student',
    'isActive': true
  },
  {
    '_id': 'u4',
    'name': 'Ali Raza',
    'email': 'accounts@falconschool.edu.pk',
    'role': 'accountant',
    'isActive': true
  },
  {
    '_id': 'u5',
    'name': 'Hassan Tariq',
    'email': 'hassan@falconschool.edu.pk',
    'role': 'teacher',
    'isActive': false
  },
];

void main() {
  setUpAll(() async {
    // flutter test renders every glyph as a solid block by default (keeps
    // golden tests deterministic across machines). Store screenshots need
    // real, readable text and icons, so load the app's actual font assets.
    await _loadFont('PlusJakartaSans', 'assets/fonts/PlusJakartaSans-Variable.ttf');
    await _loadFont('Outfit', 'assets/fonts/Outfit-Variable.ttf');
    await _loadFont('MaterialIcons', 'fonts/MaterialIcons-Regular.otf');
    // AppTheme.titleMedium requests 'HankenGrotesk', which is not bundled in
    // pubspec.yaml (real devices silently fall back to the system font; the
    // test harness has no fallback and renders blank glyphs). Not this
    // script's call to fix the app's font choice — stand in with the closest
    // bundled family so screenshots aren't missing text.
    await _loadFont('HankenGrotesk', 'assets/fonts/PlusJakartaSans-Variable.ttf');

    SharedPreferences.setMockInitialValues({
      'org_slug': 'falcon-intl',
      'org_name': 'Falcon International School',
      'org_primary_color': '#4F378A',
    });
    await LocalStorageService.init();
  });

  final specs = <_CaptureSpec>[
    _CaptureSpec(
        'phone student dashboard',
        1080,
        1920,
        3,
        'store-assets/png/phone/01-student-dashboard-1080x1920.png',
        _student,
        const _PreviewShell(
            role: _PreviewRole.student, child: StudentDashboard())),
    _CaptureSpec(
        'phone timetable',
        1080,
        1920,
        3,
        'store-assets/png/phone/02-timetable-1080x1920.png',
        _student,
        const _PreviewShell(
            role: _PreviewRole.student,
            selected: 1,
            child: StudentTimetable())),
    _CaptureSpec(
        'phone results',
        1080,
        1920,
        3,
        'store-assets/png/phone/03-results-1080x1920.png',
        _student,
        const _PreviewShell(
            role: _PreviewRole.student, selected: 2, child: ResultsScreen())),
    _CaptureSpec(
        'phone fees',
        1080,
        1920,
        3,
        'store-assets/png/phone/04-fees-1080x1920.png',
        _student,
        const _PreviewShell(
            role: _PreviewRole.student, selected: 3, child: MyChallans())),
    _CaptureSpec(
        '7 inch teacher dashboard',
        1080,
        1920,
        2.0,
        'store-assets/png/tablet-7/01-teacher-dashboard-1080x1920.png',
        _teacher,
        const _PreviewShell(
            role: _PreviewRole.teacher, child: TeacherDashboard())),
    _CaptureSpec(
        '7 inch class selection',
        1080,
        1920,
        2.0,
        'store-assets/png/tablet-7/02-class-selection-1080x1920.png',
        _teacher,
        const _PreviewShell(
            role: _PreviewRole.teacher,
            selected: 1,
            child: SelectClassScreen())),
    _CaptureSpec(
        '7 inch principal dashboard',
        1080,
        1920,
        2.0,
        'store-assets/png/tablet-7/03-principal-dashboard-1080x1920.png',
        _principal,
        const _PreviewShell(
            role: _PreviewRole.principal, child: PrincipalDashboard())),
    _CaptureSpec(
        '10 inch admin dashboard',
        1440,
        2560,
        2,
        'store-assets/png/tablet-10/01-admin-dashboard-1440x2560.png',
        _admin,
        const _PreviewShell(
            role: _PreviewRole.admin,
            child: AdminDashboard(isSuperAdmin: true))),
    _CaptureSpec(
        '10 inch accountant dashboard',
        1440,
        2560,
        2,
        'store-assets/png/tablet-10/02-accountant-dashboard-1440x2560.png',
        _accountant,
        const _PreviewShell(
            role: _PreviewRole.accountant, child: AccountantDashboard())),
    _CaptureSpec(
        '10 inch attendance report',
        1440,
        2560,
        2,
        'store-assets/png/tablet-10/03-attendance-report-1440x2560.png',
        _principal,
        const _PreviewShell(
            role: _PreviewRole.principal,
            selected: 1,
            child: PrincipalAttendanceReport())),
    _CaptureSpec(
        '10 inch results',
        1440,
        2560,
        2,
        'store-assets/png/tablet-10/04-student-results-1440x2560.png',
        _student,
        const _PreviewShell(
            role: _PreviewRole.student, selected: 2, child: ResultsScreen())),
    _CaptureSpec(
        'chromebook admin dashboard',
        2560,
        1440,
        2,
        'store-assets/png/chromebook/01-admin-dashboard-2560x1440.png',
        _admin,
        const _PreviewShell(
            role: _PreviewRole.admin,
            child: AdminDashboard(isSuperAdmin: true))),
    _CaptureSpec(
        'chromebook user management',
        2560,
        1440,
        2,
        'store-assets/png/chromebook/02-user-management-2560x1440.png',
        _admin,
        const _PreviewShell(
            role: _PreviewRole.admin,
            selected: 1,
            child: UserManagementScreen())),
    _CaptureSpec(
        'chromebook accountant dashboard',
        2560,
        1440,
        2,
        'store-assets/png/chromebook/03-accountant-dashboard-2560x1440.png',
        _accountant,
        const _PreviewShell(
            role: _PreviewRole.accountant, child: AccountantDashboard())),
    _CaptureSpec(
        'chromebook attendance report',
        2560,
        1440,
        2,
        'store-assets/png/chromebook/04-attendance-report-2560x1440.png',
        _principal,
        const _PreviewShell(
            role: _PreviewRole.principal,
            selected: 1,
            child: PrincipalAttendanceReport())),
    _CaptureSpec(
        'android xr student dashboard',
        2560,
        1440,
        2,
        'store-assets/png/android-xr/01-student-dashboard-2560x1440.png',
        _student,
        const _PreviewShell(
            role: _PreviewRole.student, child: StudentDashboard())),
    _CaptureSpec(
        'android xr teacher dashboard',
        2560,
        1440,
        2,
        'store-assets/png/android-xr/02-teacher-dashboard-2560x1440.png',
        _teacher,
        const _PreviewShell(
            role: _PreviewRole.teacher, child: TeacherDashboard())),
    _CaptureSpec(
        'android xr principal dashboard',
        2560,
        1440,
        2,
        'store-assets/png/android-xr/03-principal-dashboard-2560x1440.png',
        _principal,
        const _PreviewShell(
            role: _PreviewRole.principal, child: PrincipalDashboard())),
    _CaptureSpec(
        'android xr admin dashboard',
        2560,
        1440,
        2,
        'store-assets/png/android-xr/04-admin-dashboard-2560x1440.png',
        _admin,
        const _PreviewShell(
            role: _PreviewRole.admin,
            child: AdminDashboard(isSuperAdmin: true))),
  ];

  for (final spec in specs) {
    testWidgets('renders ${spec.name}', (tester) => _render(tester, spec));
  }

  testWidgets(
      'renders feature graphic',
      (tester) => _render(
            tester,
            _CaptureSpec(
                'feature graphic',
                1024,
                500,
                1,
                'store-assets/png/app/feature-graphic-1024x500.png',
                _student,
                const _FeatureGraphic()),
          ));
}

Future<void> _render(WidgetTester tester, _CaptureSpec spec) async {
  tester.view.devicePixelRatio = spec.pixelRatio;
  tester.view.physicalSize =
      Size(spec.width.toDouble(), spec.height.toDouble());
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(ProviderScope(
    overrides: [
      currentUserProvider.overrideWithValue(spec.user),
      studentProfileProvider.overrideWith((ref) async => const StudentProfile(
          id: 's14',
          name: 'Ayesha Khan',
          email: 'ayesha@falconschool.edu.pk',
          rollNo: '14',
          className: 'Grade 8',
          sectionName: 'A')),
      unreadCountProvider.overrideWith((ref) async => 3),
      todayTimetableProvider.overrideWith((ref) async => const [
            TodaySlot(
                periodNo: 1,
                subjectName: 'Mathematics',
                teacherName: 'Usman Ahmed',
                startTime: '08:00',
                endTime: '08:45',
                roomNo: 'Room 12',
                isNow: true),
            TodaySlot(
                periodNo: 2,
                subjectName: 'General Science',
                teacherName: 'Sana Malik',
                startTime: '08:45',
                endTime: '09:30',
                roomNo: 'Science Lab'),
          ]),
      myTimetableProvider.overrideWith((ref) async => _timetable),
      latestResultProvider.overrideWith((ref) async => _result),
      myResultsProvider.overrideWith((ref) async => [_result]),
      myChallansProvider.overrideWith((ref) async => _challans),
      upcomingExamsProvider.overrideWith((ref) async => [
            UpcomingExam(
                id: 'e1',
                name: 'Final Term Examination',
                type: 'term',
                startDate: DateTime(2026, 8, 24),
                subjects: const ['Mathematics', 'Science'])
          ]),
      myAttendanceSummaryProvider.overrideWith((ref) async =>
          const AttendanceSummary(
              totalDays: 120, presentDays: 110, absentDays: 6, lateDays: 4)),
      pendingAssignmentsProvider.overrideWith((ref) async => [
            Assignment(
                id: 'as1',
                title: 'Algebra worksheet',
                description: 'Complete exercises 4–12.',
                subjectId: 'math',
                subjectName: 'Mathematics',
                dueDate: DateTime(2026, 8, 18),
                isActive: true)
          ]),
      todayPeriodsProvider.overrideWith((ref) async => const [
            {
              'subjectName': 'Mathematics',
              'className': 'Grade 8',
              'sectionName': 'A',
              'startTime': '08:00',
              'endTime': '08:45',
              'periodNo': 1,
              'isNow': true
            },
            {
              'subjectName': 'Mathematics',
              'className': 'Grade 9',
              'sectionName': 'B',
              'startTime': '10:30',
              'endTime': '11:15',
              'periodNo': 4,
              'isNow': false
            },
          ]),
      teacherDashboardStatsProvider.overrideWith((ref) async => const {
            'pendingAttendance': 2,
            'pendingMarks': 1,
            'activeAssignments': 3
          }),
      myClassesProvider.overrideWith((ref) async => const [
            {
              'classId': 'grade8',
              'sectionId': 'a',
              'className': 'Grade 8',
              'sectionName': 'A',
              'subjectName': 'Mathematics',
              'studentCount': 28
            },
            {
              'classId': 'grade9',
              'sectionId': 'b',
              'className': 'Grade 9',
              'sectionName': 'B',
              'subjectName': 'Mathematics',
              'studentCount': 31
            },
            {
              'classId': 'grade10',
              'sectionId': 'a',
              'className': 'Grade 10',
              'sectionName': 'A',
              'subjectName': 'Mathematics',
              'studentCount': 26
            },
          ]),
      offlineQueueCountProvider.overrideWithValue(0),
      todayAttendanceOverviewProvider.overrideWith(
          (ref) async => const {'presentCount': 1118, 'totalStudents': 1248}),
      staffAttendanceTodayProvider
          .overrideWith((ref) async => const {'present': 68, 'total': 72}),
      attendanceByClassProvider.overrideWith((ref) async => _classes),
      lowAttendanceStudentsProvider.overrideWith((ref) async => _lowAttendance),
      upcomingExamsPrincipalProvider.overrideWith((ref) async => const [
            {
              'name': 'Mid Term — Grade 8',
              'startDate': '2026-08-20T00:00:00.000Z'
            },
            {
              'name': 'Mid Term — Grade 9',
              'startDate': '2026-08-22T00:00:00.000Z'
            },
          ]),
      principalUnreadCountProvider.overrideWith((ref) async => 4),
      orgStatsProvider.overrideWith((ref) async => const {
            'totalStudents': 6988,
            'totalTeachers': 412,
            'totalClasses': 238,
            'totalBranches': 34
          }),
      branchesProvider.overrideWith((ref) async => const [
            {'name': 'Main Campus', 'address': 'Gulberg, Lahore'},
            {'name': 'North Campus', 'address': 'Islamabad'}
          ]),
      allOrgsProvider.overrideWith((ref) async => const [
            {
              'name': 'Falcon International School',
              'slug': 'falcon-intl',
              'status': 'active'
            },
            {
              'name': 'Northgate Grammar School',
              'slug': 'northgate-grammar',
              'status': 'active'
            },
            {
              'name': 'Scholars College',
              'slug': 'scholars',
              'status': 'active'
            },
          ]),
      usersListProvider.overrideWith((ref, role) async => role == null
          ? _users
          : _users.where((u) => u['role'] == role).toList()),
      financeSummaryProvider.overrideWith((ref) async => _finance),
      inventoryDashboardProvider.overrideWith((ref) async => _inventory),
      accountantDashboardStatsProvider.overrideWith((ref) async =>
          const {'monthlyCollected': 2400000, 'monthlyPending': 460000}),
      overdueCountProvider.overrideWith((ref) async => 34),
      allChallansProvider.overrideWith(
          (ref, status) async => _challans.where((c) => !c.isPaid).toList()),
      accountantUnreadCountProvider.overrideWith((ref) async => 2),
    ],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: RepaintBoundary(key: _captureKey, child: spec.child),
    ),
  ));

  // FutureProvider fixtures complete in microtasks. Fixed pumps avoid waiting
  // for harmless repeating Material animations (for example progress ink).
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 120));
  await tester.pump(const Duration(milliseconds: 120));
  final boundary =
      tester.renderObject<RenderRepaintBoundary>(find.byKey(_captureKey));

  // toImage/toByteData and file I/O are real async engine/OS work, not
  // fake-clock-driven widget-test work — they must run inside runAsync or
  // AutomatedTestWidgetsFlutterBinding's synthetic zone deadlocks waiting on
  // the real IO-service callback (hangs until the 10-minute test timeout).
  late final int width;
  late final int height;
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: spec.pixelRatio);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File(spec.path);
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
    width = image.width;
    height = image.height;
    image.dispose();
  });
  expect(width, spec.width);
  expect(height, spec.height);
}

class _CaptureSpec {
  const _CaptureSpec(this.name, this.width, this.height, this.pixelRatio,
      this.path, this.user, this.child);
  final String name;
  final int width;
  final int height;
  final double pixelRatio;
  final String path;
  final AppUser user;
  final Widget child;
}

enum _PreviewRole { student, teacher, principal, accountant, admin }

class _PreviewShell extends StatelessWidget {
  const _PreviewShell(
      {required this.role, required this.child, this.selected = 0});
  final _PreviewRole role;
  final Widget child;
  final int selected;

  @override
  Widget build(BuildContext context) {
    final items = switch (role) {
      _PreviewRole.student => const [
          ('Home', Icons.home_rounded),
          ('Timetable', Icons.calendar_today_rounded),
          ('Results', Icons.bar_chart_rounded),
          ('Fees', Icons.account_balance_wallet_outlined),
          ('Notifications', Icons.notifications_outlined)
        ],
      _PreviewRole.teacher => const [
          ('Home', Icons.home_rounded),
          ('Attendance', Icons.fact_check_outlined),
          ('Marks', Icons.edit_note_rounded),
          ('Assignments', Icons.assignment_outlined),
          ('Alerts', Icons.notifications_outlined)
        ],
      _PreviewRole.principal => const [
          ('Dashboard', Icons.dashboard_rounded),
          ('Attendance', Icons.how_to_reg_rounded),
          ('Results', Icons.bar_chart_rounded),
          ('Finance', Icons.inventory_2_rounded),
          ('Alerts', Icons.notifications_outlined)
        ],
      _PreviewRole.accountant => const [
          ('Dashboard', Icons.dashboard_rounded),
          ('Challans', Icons.receipt_long_rounded),
          ('Reports', Icons.bar_chart_rounded),
          ('Finance', Icons.inventory_2_rounded),
          ('Alerts', Icons.notifications_outlined)
        ],
      _PreviewRole.admin => const [
          ('Dashboard', Icons.dashboard_rounded),
          ('Users', Icons.people_rounded),
          ('QR Code', Icons.qr_code_rounded),
          ('Settings', Icons.settings_rounded)
        ],
    };
    return Scaffold(
      body: child,
      bottomNavigationBar: AdaptiveNavigationBar(
        selectedIndex: selected,
        onDestinationSelected: (_) {},
        items: [
          for (final item in items)
            AppNavigationItem(label: item.$1, icon: item.$2)
        ],
      ),
    );
  }
}

class _FeatureGraphic extends StatelessWidget {
  const _FeatureGraphic();

  @override
  Widget build(BuildContext context) => Scaffold(
        body: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.identityStart,
                AppColors.identityMid,
                AppColors.primary
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Row(children: [
            Expanded(
              flex: 6,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(62, 28, 26, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(children: [
                      ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.asset('assets/images/icon.png',
                              width: 64, height: 64)),
                      const SizedBox(width: 15),
                      const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('EduStack',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontFamily: 'Outfit',
                                    fontSize: 28,
                                    fontWeight: FontWeight.w800)),
                            Text('School management, connected.',
                                style: TextStyle(
                                    color: Color(0xFFCFC6DB), fontSize: 13)),
                          ]),
                    ]),
                    const SizedBox(height: 16),
                    const Text('Run your entire school\nfrom one place.',
                        style: TextStyle(
                            color: Colors.white,
                            fontFamily: 'Outfit',
                            fontSize: 43,
                            height: 1.04,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -1.2)),
                    const SizedBox(height: 10),
                    const Text(
                        'Attendance, fees, exams, timetables and communication—built for Pakistani institutions.',
                        style: TextStyle(
                            color: Color(0xFFD7D0E2),
                            fontSize: 15,
                            height: 1.45)),
                    const SizedBox(height: 14),
                    const Wrap(spacing: 8, children: [
                      _FeatureChip('Multi-campus'),
                      _FeatureChip('PKR payments'),
                      _FeatureChip('Role-based')
                    ]),
                  ],
                ),
              ),
            ),
            Expanded(
              flex: 4,
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  width: 300,
                  height: 468,
                  padding: const EdgeInsets.fromLTRB(7, 9, 7, 0),
                  decoration: const BoxDecoration(
                      color: Color(0xFF09070E),
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(34))),
                  child: ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(28)),
                    child: FittedBox(
                      fit: BoxFit.cover,
                      alignment: Alignment.topCenter,
                      child: SizedBox(
                          width: 360,
                          height: 640,
                          child: _PreviewShell(
                              role: _PreviewRole.student,
                              child: StudentDashboard())),
                    ),
                  ),
                ),
              ),
            ),
          ]),
        ),
      );
}

class _FeatureChip extends StatelessWidget {
  const _FeatureChip(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .08),
            border: Border.all(color: Colors.white24),
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w700)),
      );
}
