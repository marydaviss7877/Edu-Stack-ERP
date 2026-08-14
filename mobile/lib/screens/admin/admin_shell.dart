import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/layout/responsive.dart';

class AdminShell extends StatelessWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_rounded, label: 'Dashboard', path: '/admin'),
    (icon: Icons.people_rounded, label: 'Users', path: '/admin/users'),
    (icon: Icons.qr_code_rounded, label: 'QR Code', path: '/admin/qr'),
    (icon: Icons.settings_rounded, label: 'Settings', path: '/admin/settings'),
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

// Group Admin shell — same tabs but different base path
class GroupAdminShell extends StatelessWidget {
  final Widget child;
  const GroupAdminShell({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_rounded, label: 'Dashboard', path: '/group'),
    (icon: Icons.people_rounded, label: 'Users', path: '/group/users'),
    (icon: Icons.qr_code_rounded, label: 'QR Code', path: '/group/qr'),
    (icon: Icons.settings_rounded, label: 'Settings', path: '/group/settings'),
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
