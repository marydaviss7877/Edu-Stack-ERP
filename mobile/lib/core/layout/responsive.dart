import 'package:flutter/material.dart';

/// Phone-first breakpoints used consistently throughout the mobile app.
///
/// The app intentionally keeps a single-column phone experience. These
/// breakpoints tune density without changing navigation or information
/// architecture between common Android and iPhone widths.
abstract final class AppBreakpoints {
  static const double narrowPhone = 340;
  static const double compactPhone = 375;
  static const double largePhone = 430;
  static const double shortViewport = 680;
}

extension ResponsiveContext on BuildContext {
  Size get viewportSize => MediaQuery.sizeOf(this);
  double get viewportWidth => viewportSize.width;
  double get viewportHeight => viewportSize.height;
  bool get isNarrowPhone => viewportWidth < AppBreakpoints.narrowPhone;
  bool get isCompactPhone => viewportWidth < AppBreakpoints.compactPhone;
  bool get isShortViewport => viewportHeight < AppBreakpoints.shortViewport;

  double get pageGutter => isNarrowPhone ? 12 : 16;
  double get sectionGap => isNarrowPhone ? 16 : 24;
}

class AppNavigationItem {
  final IconData icon;
  final IconData? selectedIcon;
  final String label;

  const AppNavigationItem({
    required this.icon,
    required this.label,
    this.selectedIcon,
  });
}

/// Bottom navigation that remains usable from 320px phones upward.
///
/// Five labels do not reliably fit at the smallest widths or with large text.
/// In that case only the selected label is shown while every destination keeps
/// a tooltip and semantic label. Icons remain centered and never shrink.
class AdaptiveNavigationBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<AppNavigationItem> items;

  const AdaptiveNavigationBar({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final effectiveTextScale = media.textScaler.scale(11) / 11;
    final showSelectedLabelOnly =
        context.isNarrowPhone || effectiveTextScale > 1.15 || items.length > 5;

    return SafeArea(
      top: false,
      child: NavigationBar(
        height: context.isNarrowPhone ? 68 : 72,
        selectedIndex: selectedIndex.clamp(0, items.length - 1),
        labelBehavior: showSelectedLabelOnly
            ? NavigationDestinationLabelBehavior.onlyShowSelected
            : NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: onDestinationSelected,
        destinations: [
          for (final item in items)
            NavigationDestination(
              tooltip: item.label,
              icon: Icon(item.icon, size: 24),
              selectedIcon: Icon(item.selectedIcon ?? item.icon, size: 24),
              label: item.label,
            ),
        ],
      ),
    );
  }
}

/// Constrains content and applies phone-aware horizontal padding without
/// interfering with scroll views or system text scaling.
class ResponsivePadding extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const ResponsivePadding({super.key, required this.child, this.padding});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? EdgeInsets.symmetric(horizontal: context.pageGutter),
      child: child,
    );
  }
}

/// Builds a two-column phone grid when space permits and falls back to one
/// column on narrow screens or under aggressive text scaling.
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  final double spacing;
  final double childAspectRatio;
  final double narrowChildAspectRatio;

  const ResponsiveGrid({
    super.key,
    required this.children,
    this.spacing = 12,
    this.childAspectRatio = 1.4,
    this.narrowChildAspectRatio = 2.4,
  });

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final effectiveTextScale = media.textScaler.scale(14) / 14;
    final oneColumn = context.isNarrowPhone && effectiveTextScale > 1.15;

    return GridView.count(
      crossAxisCount: oneColumn ? 1 : 2,
      crossAxisSpacing: spacing,
      mainAxisSpacing: spacing,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: oneColumn ? narrowChildAspectRatio : childAspectRatio,
      children: children,
    );
  }
}
