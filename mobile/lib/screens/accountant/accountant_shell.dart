import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/layout/responsive.dart';

class AccountantShell extends StatelessWidget {
  final Widget child;
  const AccountantShell({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_rounded, label: 'Dashboard', path: '/accountant'),
    (
      icon: Icons.receipt_long_rounded,
      label: 'Challans',
      path: '/accountant/challans'
    ),
    (
      icon: Icons.bar_chart_rounded,
      label: 'Reports',
      path: '/accountant/reports'
    ),
    (
      icon: Icons.notifications_outlined,
      label: 'Alerts',
      path: '/accountant/notifications'
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
