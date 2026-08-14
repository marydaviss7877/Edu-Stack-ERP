import 'package:edustack_mobile/core/layout/responsive.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:edustack_mobile/screens/shared/inventory/finance_operations_overview.dart';
import 'package:edustack_mobile/screens/shared/inventory/financial_overview_card.dart';

void main() {
  final destinations = <AppNavigationItem>[
    const AppNavigationItem(icon: Icons.home_rounded, label: 'Home'),
    const AppNavigationItem(
        icon: Icons.calendar_today_rounded, label: 'Timetable'),
    const AppNavigationItem(icon: Icons.bar_chart_rounded, label: 'Results'),
    const AppNavigationItem(
        icon: Icons.account_balance_wallet_rounded, label: 'Fees'),
    const AppNavigationItem(
        icon: Icons.notifications_rounded, label: 'Notifications'),
  ];

  Future<void> pumpNavigation(
    WidgetTester tester, {
    required double width,
    double textScale = 1,
    TextDirection direction = TextDirection.ltr,
  }) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = Size(width, 720);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
          ),
          child: Directionality(
            textDirection: direction,
            child: child!,
          ),
        ),
        home: Scaffold(
          body: const SizedBox.expand(),
          bottomNavigationBar: AdaptiveNavigationBar(
            selectedIndex: 0,
            onDestinationSelected: (_) {},
            items: destinations,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final width in [320.0, 360.0, 375.0, 390.0, 412.0, 430.0]) {
    testWidgets('five navigation icons fit at ${width.toInt()}px',
        (tester) async {
      await pumpNavigation(tester, width: width);

      expect(find.byType(NavigationDestination), findsNWidgets(5));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('narrow navigation shows only the selected label',
      (tester) async {
    await pumpNavigation(tester, width: 320);

    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(
      bar.labelBehavior,
      NavigationDestinationLabelBehavior.onlyShowSelected,
    );
  });

  testWidgets('large text switches navigation to selected label only',
      (tester) async {
    await pumpNavigation(tester, width: 430, textScale: 2);

    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(
      bar.labelBehavior,
      NavigationDestinationLabelBehavior.onlyShowSelected,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('navigation remains valid in RTL', (tester) async {
    await pumpNavigation(
      tester,
      width: 320,
      direction: TextDirection.rtl,
    );

    expect(find.byType(NavigationDestination), findsNWidgets(5));
    expect(tester.takeException(), isNull);
  });

  testWidgets('responsive grid collapses under narrow large-text conditions',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(320, 720);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(320, 720),
            textScaler: TextScaler.linear(1.5),
          ),
          child: Scaffold(
            body: ResponsiveGrid(
              children: List.generate(4, (index) => Text('Card $index')),
            ),
          ),
        ),
      ),
    );

    final grid = tester.widget<GridView>(find.byType(GridView));
    final delegate =
        grid.gridDelegate as SliverGridDelegateWithFixedCrossAxisCount;
    expect(delegate.crossAxisCount, 1);
    expect(tester.takeException(), isNull);
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets('financial overview fits 320px at ${scale}x text',
        (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 900);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: const Size(320, 900),
              textScaler: TextScaler.linear(scale),
            ),
            child: const Scaffold(
              body: SingleChildScrollView(
                child: FinancialOverviewCard(
                  showBranches: true,
                  data: {
                    'month': '2026-08',
                    'operatingSurplus': 125000,
                    'operatingMargin': 18.4,
                    'totalRevenue': 900000,
                    'feeRevenue': 800000,
                    'otherIncome': 100000,
                    'operatingExpenses': 250000,
                    'payroll': 500000,
                    'depreciation': 25000,
                    'cashSurplus': 150000,
                    'outstandingFees': 75000,
                    'branchPerformance': [
                      {
                        'name': 'Main Campus',
                        'revenue': 900000,
                        'cashSurplus': 150000,
                      }
                    ],
                  },
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Net operating surplus'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  for (final role in ['group_admin', 'branch_principal']) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('$role finance blueprint fits 320px at ${scale}x text',
          (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(320, 900);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        final finance = <String, dynamic>{
          'month': '2026-08',
          'operatingSurplus': 125000,
          'operatingMargin': 18.4,
          'totalRevenue': 900000,
          'feeRevenue': 800000,
          'otherIncome': 100000,
          'operatingExpenses': 250000,
          'payroll': 500000,
          'depreciation': 25000,
          'cashSurplus': 150000,
          'outstandingFees': 75000,
          'feeRecoveryRate': 82.5,
          'dataAsOf': '2026-08-15T10:42:00.000Z',
          'receivableAgeing': {
            'current': {'amount': 40000, 'accounts': 6},
            'days31to60': {'amount': 25000, 'accounts': 3},
            'over60': {'amount': 10000, 'accounts': 1},
          },
          'branchPerformance': [
            {
              'branchId': 'b1',
              'name': 'Main Campus',
              'revenue': 900000,
              'operatingSurplus': 125000,
              'operatingMargin': 18.4,
            }
          ],
          'peerBenchmark': {
            'rank': 2,
            'branchCount': 5,
            'branchMargin': 18.4,
            'groupAverageMargin': 17.8,
          },
        };
        final history = List.generate(
            6,
            (index) => <String, dynamic>{
                  ...finance,
                  'month': '2026-${(index + 3).toString().padLeft(2, '0')}',
                  'totalRevenue': 700000 + index * 40000,
                  'operatingExpenses': 220000 + index * 8000,
                });

        await tester.pumpWidget(MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: const Size(320, 900),
              textScaler: TextScaler.linear(scale),
            ),
            child: Scaffold(
              body: SingleChildScrollView(
                padding: const EdgeInsets.all(12),
                child: FinanceOperationsOverview(
                  finance: finance,
                  inventory: const {
                    'netBookValue': 4500000,
                    'fixedAssets': 70,
                    'pendingExpenses': 2,
                    'pendingProcurements': 1,
                    'maintenanceDue': 1,
                    'verificationOverdue': 2,
                  },
                  history: history,
                  items: const [
                    {
                      '_id': 'a1',
                      'name': 'Air conditioner',
                      'location': 'Science Lab',
                      'condition': 'poor',
                      'status': 'under_maintenance',
                      'lastVerifiedAt': '2026-08-01T00:00:00.000Z',
                      'nextVerificationDue': '2099-08-01T00:00:00.000Z',
                    }
                  ],
                  expenses: const [
                    {'status': 'submitted', 'netPaid': 50000}
                  ],
                  procurements: const [
                    {
                      'status': 'approved',
                      'estimatedTotal': 120000,
                    }
                  ],
                  role: role,
                  branchLabel:
                      role == 'group_admin' ? 'All campuses' : 'Main Campus',
                  onOpenTab: (_) {},
                ),
              ),
            ),
          ),
        ));
        await tester.pumpAndSettle();

        expect(find.textContaining('Operating surplus'), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  }
}
