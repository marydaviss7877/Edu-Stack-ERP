import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/layout/responsive.dart';

class CoordinatorShell extends StatelessWidget {
  final Widget child;
  const CoordinatorShell({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_rounded, label: 'Dashboard', path: '/coordinator'),
    (
      icon: Icons.how_to_reg_rounded,
      label: 'Attendance',
      path: '/coordinator/attendance'
    ),
    (
      icon: Icons.event_note_rounded,
      label: 'Timetable',
      path: '/coordinator/timetable'
    ),
    (
      icon: Icons.notifications_outlined,
      label: 'Alerts',
      path: '/coordinator/notifications'
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _tabs.indexWhere(
        (t) => location == t.path || location.startsWith('${t.path}/'));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: child,
      bottomNavigationBar: AdaptiveNavigationBar(
        selectedIndex: current,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        items: _tabs
            .map((t) => AppNavigationItem(icon: t.icon, label: t.label))
            .toList(),
      ),
    );
  }
}
