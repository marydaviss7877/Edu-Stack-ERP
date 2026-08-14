import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/admin_providers.dart';
import '../../../core/layout/responsive.dart';

class UserManagementScreen extends ConsumerStatefulWidget {
  const UserManagementScreen({super.key});

  @override
  ConsumerState<UserManagementScreen> createState() => _UserManagementState();
}

class _UserManagementState extends ConsumerState<UserManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  static const _filters = [null, 'teacher', 'student', 'accountant'];
  static const _labels = ['All', 'Teachers', 'Students', 'Accountants'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _filters.length, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabs: _labels.map((l) => Tab(text: l)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: _filters.map((role) => _UserList(role: role)).toList(),
      ),
    );
  }
}

class _UserList extends ConsumerWidget {
  const _UserList({this.role});
  final String? role;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(usersListProvider(role));
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return usersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: cs.error),
            const SizedBox(height: 12),
            Text(e.toString(), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
                onPressed: () => ref.invalidate(usersListProvider(role)),
                child: const Text('Retry')),
          ],
        ),
      ),
      data: (users) {
        if (users.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.people_outline_rounded,
                    size: 56, color: cs.outlineVariant),
                const SizedBox(height: 12),
                const Text('No users found.'),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(usersListProvider(role)),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: users.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final u = users[i];
              final name = u['name'] as String? ?? 'Unknown';
              final email = u['email'] as String? ?? '';
              final userRole = u['role'] as String? ?? '';
              final isActive = u['isActive'] as bool? ?? true;

              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isActive
                        ? cs.primaryContainer
                        : cs.surfaceContainerHighest,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: TextStyle(
                        color: isActive
                            ? cs.onPrimaryContainer
                            : cs.onSurfaceVariant,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(name,
                      style:
                          tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  subtitle: Text(email,
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      overflow: TextOverflow.ellipsis),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!context.isNarrowPhone) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: cs.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(_roleShort(userRole),
                              style: tt.labelSmall
                                  ?.copyWith(color: cs.onSurfaceVariant)),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Switch.adaptive(
                        value: isActive,
                        onChanged: (v) async {
                          final id =
                              u['_id'] as String? ?? u['id'] as String? ?? '';
                          if (id.isEmpty) return;
                          try {
                            await ref
                                .read(adminServiceProvider)
                                .toggleUserStatus(id, v);
                            ref.invalidate(usersListProvider(role));
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Failed to update status: $e'),
                                  backgroundColor:
                                      Theme.of(context).colorScheme.error,
                                ),
                              );
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  String _roleShort(String role) => switch (role) {
        'teacher' => 'Teacher',
        'student' => 'Student',
        'accountant' => 'Accountant',
        'branch_principal' => 'Principal',
        'coordinator' => 'Coord.',
        'it_admin' => 'IT Admin',
        'group_admin' => 'Grp Admin',
        'super_admin' => 'Super',
        _ => role,
      };
}
