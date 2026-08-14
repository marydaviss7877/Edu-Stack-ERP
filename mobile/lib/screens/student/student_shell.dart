import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';

import '../../core/layout/responsive.dart';

class StudentShell extends StatelessWidget {
  final Widget child;
  const StudentShell({super.key, required this.child});

  static const _paths = [
    '/student',
    '/student/timetable',
    '/student/results',
    '/student/fees',
    '/student/notifications',
  ];

  static const _icons = [
    Icons.home_rounded,
    Icons.calendar_today_rounded,
    Icons.bar_chart_rounded,
    Icons.account_balance_wallet_outlined,
    Icons.notifications_outlined,
  ];

  @override
  Widget build(BuildContext context) {
    final labels = [
      'nav.home'.tr(),
      'nav.timetable'.tr(),
      'nav.results'.tr(),
      'nav.fees'.tr(),
      'nav.notifications'.tr(),
    ];

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
