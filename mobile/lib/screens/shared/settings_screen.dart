import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Appearance ────────────────────────────────────────
          Text('Appearance',
              style: tt.labelLarge?.copyWith(color: cs.onSurfaceVariant)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading:
                      Icon(Icons.brightness_auto_rounded, color: cs.primary),
                  title: const Text('Theme'),
                  subtitle: Text(_themeName(themeMode)),
                  trailing:
                      const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                  onTap: () => _showThemePicker(context, ref, themeMode),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── About ────────────────────────────────────────────
          Text('About',
              style: tt.labelLarge?.copyWith(color: cs.onSurfaceVariant)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: Icon(Icons.info_outline_rounded, color: cs.primary),
                  title: const Text('App Version'),
                  trailing: Text('1.0.0',
                      style:
                          tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: Icon(Icons.school_rounded, color: cs.primary),
                  title: const Text('EduStack'),
                  subtitle: const Text('School Management Platform'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── Account ───────────────────────────────────────────
          Text('Account',
              style: tt.labelLarge?.copyWith(color: cs.onSurfaceVariant)),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: Icon(Icons.logout_rounded, color: cs.error),
              title: Text('Sign Out',
                  style:
                      TextStyle(color: cs.error, fontWeight: FontWeight.w600)),
              onTap: () => _confirmSignOut(context, ref),
            ),
          ),
        ],
      ),
    );
  }

  String _themeName(ThemeMode mode) => switch (mode) {
        ThemeMode.system => 'System default',
        ThemeMode.light => 'Light',
        ThemeMode.dark => 'Dark',
      };

  void _confirmSignOut(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  void _showThemePicker(
      BuildContext context, WidgetRef ref, ThemeMode current) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
              title: const Text('System default'),
              leading: const Icon(Icons.brightness_auto_rounded),
              selected: current == ThemeMode.system,
              onTap: () {
                ref.read(themeModeProvider.notifier).setMode(ThemeMode.system);
                Navigator.of(context).pop();
              }),
          ListTile(
              title: const Text('Light'),
              leading: const Icon(Icons.light_mode_rounded),
              selected: current == ThemeMode.light,
              onTap: () {
                ref.read(themeModeProvider.notifier).setMode(ThemeMode.light);
                Navigator.of(context).pop();
              }),
          ListTile(
              title: const Text('Dark'),
              leading: const Icon(Icons.dark_mode_rounded),
              selected: current == ThemeMode.dark,
              onTap: () {
                ref.read(themeModeProvider.notifier).setMode(ThemeMode.dark);
                Navigator.of(context).pop();
              }),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
