import 'package:flutter/material.dart';

/// Finalized EduStack mobile design tokens from redesign-v1.
abstract final class AppColors {
  static const primary = Color(0xFF4F378A);
  static const primaryLight = Color(0xFF7155B1);
  static const primaryContainer = Color(0xFFEADFFF);
  static const secondary = Color(0xFF63597C);
  static const achievement = Color(0xFF9A7611);
  static const success = Color(0xFF13766F);
  static const warning = Color(0xFF9A6700);
  static const error = Color(0xFFBA1A1A);
  static const info = Color(0xFF365F91);

  static const canvas = Color(0xFFFBF9FE);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceHigh = Color(0xFFF4EFF8);
  static const surfaceHighest = Color(0xFFE9E3EE);
  static const ink = Color(0xFF1D1B20);
  static const inkMuted = Color(0xFF554F5B);
  static const outline = Color(0xFF7A7582);
  static const outlineVariant = Color(0xFFD7D0DC);
  static const identityStart = Color(0xFF211D48);
  static const identityMid = Color(0xFF30245F);
}

abstract final class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}

abstract final class AppRadius {
  static const small = 8.0;
  static const medium = 12.0;
  static const large = 16.0;
  static const hero = 20.0;
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.xl, bottom: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          if (actionLabel != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

class AppIdentityHeader extends StatelessWidget {
  const AppIdentityHeader({
    super.key,
    required this.organization,
    required this.name,
    required this.subtitle,
    this.photoUrl,
    this.notificationCount = 0,
    this.onProfile,
    this.onNotifications,
  });

  final String organization;
  final String name;
  final String subtitle;
  final String? photoUrl;
  final int notificationCount;
  final VoidCallback? onProfile;
  final VoidCallback? onNotifications;

  @override
  Widget build(BuildContext context) {
    final safeName = name.trim().isEmpty ? 'User' : name.trim();
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        MediaQuery.paddingOf(context).top + AppSpacing.md,
        AppSpacing.lg,
        18,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.identityStart,
            AppColors.identityMid,
            AppColors.primary,
          ],
          stops: [0, .58, 1],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .1),
                  border: Border.all(color: Colors.white24),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.account_balance_rounded,
                    color: Colors.white, size: 14),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  organization,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFCEC6DA),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(greeting,
                        style: const TextStyle(
                            color: Color(0xFFD7D1E4), fontSize: 12)),
                    const SizedBox(height: 2),
                    Text(
                      safeName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontFamily: 'Outfit',
                        fontSize: 24,
                        height: 1.1,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -.35,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Color(0xFFBBB1CA), fontSize: 11),
                    ),
                  ],
                ),
              ),
              _HeaderAction(
                icon: Icons.notifications_rounded,
                onTap: onNotifications,
                badge: notificationCount,
              ),
              const SizedBox(width: 9),
              Semantics(
                button: true,
                label: 'Open profile for $safeName',
                child: InkWell(
                  onTap: onProfile,
                  customBorder: const CircleBorder(),
                  child: CircleAvatar(
                    radius: 26,
                    backgroundColor: AppColors.primaryContainer,
                    backgroundImage: photoUrl != null && photoUrl!.isNotEmpty
                        ? NetworkImage(photoUrl!)
                        : null,
                    child: photoUrl == null || photoUrl!.isEmpty
                        ? Text(
                            safeName[0].toUpperCase(),
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        : null,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderAction extends StatelessWidget {
  const _HeaderAction({required this.icon, this.onTap, this.badge = 0});

  final IconData icon;
  final VoidCallback? onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Badge(
      isLabelVisible: badge > 0,
      label: Text(badge > 99 ? '99+' : '$badge'),
      child: IconButton.filledTonal(
        onPressed: onTap,
        style: IconButton.styleFrom(
          minimumSize: const Size(44, 44),
          backgroundColor: Colors.white.withValues(alpha: .09),
          foregroundColor: Colors.white,
        ),
        icon: Icon(icon, size: 21),
      ),
    );
  }
}

class AppMetricCard extends StatelessWidget {
  const AppMetricCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.color = AppColors.primary,
    this.caption,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 10),
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 2),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            if (caption != null) ...[
              const SizedBox(height: 4),
              Text(caption!, style: Theme.of(context).textTheme.labelSmall),
            ],
          ],
        ),
      ),
    );
  }
}

class AppQuickAction extends StatelessWidget {
  const AppQuickAction({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = AppColors.primary,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.medium),
        side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.medium),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 76),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 23),
                const SizedBox(height: 7),
                Text(label,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
  });

  final IconData icon;
  final String title;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            children: [
              Icon(icon,
                  color: Theme.of(context).colorScheme.primary, size: 36),
              const SizedBox(height: 10),
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              if (message != null) ...[
                const SizedBox(height: 4),
                Text(message!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
