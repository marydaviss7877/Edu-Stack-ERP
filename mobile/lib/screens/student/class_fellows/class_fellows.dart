import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../providers/student_providers.dart';

class ClassFellowsScreen extends ConsumerWidget {
  const ClassFellowsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fellowsAsync = ref.watch(classFellowsProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Class Fellows')),
      body: fellowsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorRetry(
            message: e.toString(),
            onRetry: () => ref.invalidate(classFellowsProvider)),
        data: (fellows) {
          if (fellows.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.group_rounded, size: 56, color: cs.outlineVariant),
                  const SizedBox(height: 12),
                  const Text('No classmates found.'),
                ],
              ),
            );
          }

          // Sort by roll number if present
          final sorted = List<Map<String, dynamic>>.from(fellows)
            ..sort((a, b) {
              final ra = a['rollNo'] as String? ?? '';
              final rb = b['rollNo'] as String? ?? '';
              return ra.compareTo(rb);
            });

          // Find topper (highest lastResult percentage)
          Map<String, dynamic>? topper;
          double topPct = 0;
          for (final f in sorted) {
            final pct = (f['lastResultPercentage'] as num?)?.toDouble() ?? 0;
            if (pct > topPct) {
              topPct = pct;
              topper = f;
            }
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(classFellowsProvider),
            child: CustomScrollView(
              slivers: [
                // ── Topper banner ──────────────────────────────
                if (topper != null)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: _TopperBanner(fellow: topper, percentage: topPct),
                    ),
                  ),

                // ── Stats row ──────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      children: [
                        _MiniStat(
                            label: 'Total',
                            value: '${sorted.length}',
                            icon: Icons.group_rounded),
                        const SizedBox(width: 12),
                        _MiniStat(
                          label: 'Present today',
                          value:
                              '${sorted.where((f) => f['todayStatus'] == 'present').length}',
                          icon: Icons.check_circle_rounded,
                        ),
                      ],
                    ),
                  ),
                ),

                // ── List ───────────────────────────────────────
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList.separated(
                    itemCount: sorted.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) =>
                        _FellowCard(fellow: sorted[i], rank: i + 1),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TopperBanner extends StatelessWidget {
  const _TopperBanner({required this.fellow, required this.percentage});
  final Map<String, dynamic> fellow;
  final double percentage;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final name = (fellow['profile']?['name'] as String?) ?? 'Unknown';
    final avatar = fellow['profile']?['avatarUrl'] as String?;

    return Card(
      color: const Color(0xFFFFF8E1),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            const Text('🏆', style: TextStyle(fontSize: 32)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Class Topper',
                      style: tt.labelMedium
                          ?.copyWith(color: Colors.orange.shade800)),
                  Text(name,
                      style: tt.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  Text('${percentage.toStringAsFixed(1)}%',
                      style: tt.bodySmall
                          ?.copyWith(color: Colors.orange.shade700)),
                ],
              ),
            ),
            _Avatar(url: avatar, name: name, radius: 28),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat(
      {required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Expanded(
      child: Card(
        color: cs.surfaceContainerLow,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          child: Row(
            children: [
              Icon(icon, size: 18, color: cs.primary),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value,
                      style: tt.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  Text(label,
                      style:
                          tt.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FellowCard extends StatelessWidget {
  const _FellowCard({required this.fellow, required this.rank});
  final Map<String, dynamic> fellow;
  final int rank;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final name = (fellow['profile']?['name'] as String?) ?? 'Unknown';
    final rollNo = fellow['rollNo'] as String? ?? '—';
    final avatar = fellow['profile']?['avatarUrl'] as String?;
    final status = fellow['todayStatus'] as String?;
    final pct = (fellow['lastResultPercentage'] as num?)?.toDouble();

    final statusColor = switch (status) {
      'present' => cs.primary,
      'absent' => cs.error,
      'late' => cs.tertiary,
      _ => cs.outlineVariant,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            // Rank
            SizedBox(
              width: 28,
              child: Text(
                '#$rank',
                style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
              ),
            ),
            // Avatar
            _Avatar(url: avatar, name: name, radius: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      style:
                          tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  Text('Roll # $rollNo',
                      style:
                          tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (status != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status[0].toUpperCase() + status.substring(1),
                      style: tt.labelSmall?.copyWith(
                          color: statusColor, fontWeight: FontWeight.bold),
                    ),
                  ),
                if (pct != null) ...[
                  const SizedBox(height: 4),
                  Text('${pct.toStringAsFixed(1)}%',
                      style:
                          tt.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({this.url, required this.name, required this.radius});
  final String? url;
  final String name;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (url != null && url!.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundImage: CachedNetworkImageProvider(url!),
      );
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: cs.primaryContainer,
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: TextStyle(
          color: cs.onPrimaryContainer,
          fontWeight: FontWeight.bold,
          fontSize: radius * 0.8,
        ),
      ),
    );
  }
}

class _ErrorRetry extends StatelessWidget {
  const _ErrorRetry({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      );
}
