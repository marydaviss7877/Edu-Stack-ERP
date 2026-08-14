import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/layout/responsive.dart';

class TeacherShell extends StatelessWidget {
  final Widget child;
  const TeacherShell({super.key, required this.child});

  static const _paths = [
    '/teacher',
    '/teacher/attendance',
    '/teacher/marks',
    '/teacher/assignments',
    '/teacher/notifications',
  ];

  static const _icons = [
    Icons.home_rounded,
    Icons.fact_check_outlined,
    Icons.edit_note_rounded,
    Icons.assignment_outlined,
    Icons.notifications_outlined,
  ];

  @override
  Widget build(BuildContext context) {
    const labels = ['Home', 'Attendance', 'Marks', 'Assignments', 'Alerts'];

    final location = GoRouterState.of(context).matchedLocation;
    final idx = _paths.indexWhere((p) => location.startsWith(p));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: child,
      bottomNavigationBar: AdaptiveNavigationBar(
        selectedIndex: current,
        onDestinationSelected: (i) => context.go(_paths[i]),
        items: List.generate(
            _paths.length,
            (i) => AppNavigationItem(
                  icon: _icons[i],
                  label: labels[i],
                )),
      ),
    );
  }
}
