import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/layout/responsive.dart';

class PrincipalShell extends StatelessWidget {
  final Widget child;
  const PrincipalShell({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_rounded, label: 'Dashboard', path: '/principal'),
    (
      icon: Icons.how_to_reg_rounded,
      label: 'Attendance',
      path: '/principal/attendance'
    ),
    (
      icon: Icons.bar_chart_rounded,
      label: 'Results',
      path: '/principal/results'
    ),
    (
      icon: Icons.inventory_2_rounded,
      label: 'Finance',
      path: '/principal/inventory'
    ),
    (
      icon: Icons.notifications_outlined,
      label: 'Alerts',
      path: '/principal/notifications'
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
