import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/auth_provider.dart';
import '../../providers/org_provider.dart';
import '../../providers/student_providers.dart';
import '../../models/student_profile.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final org = ref.watch(orgProvider);
    final cs = Theme.of(context).colorScheme;

    final isStudent = user?.role == 'student';

    return Scaffold(
      backgroundColor: cs.surfaceContainerLowest,
      body: isStudent
          ? _StudentProfile(org: org)
          : _GenericProfile(user: user, org: org),
    );
  }
}

// ── Student-specific profile ─────────────────────────────────────────────────

class _StudentProfile extends ConsumerWidget {
  const _StudentProfile({this.org});
  final dynamic org;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider);

    return profileAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => _StudentProfileBody(profile: null, org: org),
      data: (profile) => _StudentProfileBody(profile: profile, org: org),
    );
  }
}

class _StudentProfileBody extends ConsumerWidget {
  const _StudentProfileBody({required this.profile, this.org});
  final StudentProfile? profile;
  final dynamic org;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final name = profile?.name ?? ref.watch(currentUserProvider)?.name ?? '';
    final email = profile?.email ?? ref.watch(currentUserProvider)?.email ?? '';

    return CustomScrollView(
      slivers: [
        // ── Hero header ──────────────────────────────────────
        SliverAppBar(
          expandedHeight: 260,
          pinned: true,
          backgroundColor: cs.primary,
          foregroundColor: cs.onPrimary,
          flexibleSpace: FlexibleSpaceBar(
            background:
                _StudentHeroHeader(profile: profile, name: name, email: email),
          ),
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Academic info ────────────────────────────
                if (profile?.rollNo != null || profile?.className != null) ...[
                  const _SectionLabel('Academic Details'),
                  const SizedBox(height: 8),
                  Card(
                    child: Column(
                      children: [
                        if (profile?.rollNo != null)
                          _InfoTile(
                            icon: Icons.badge_rounded,
                            label: 'Roll Number',
                            value: profile!.rollNo!,
                          ),
                        if (profile?.rollNo != null &&
                            profile?.className != null)
                          const Divider(height: 1, indent: 56),
                        if (profile?.className != null)
                          _InfoTile(
                            icon: Icons.class_rounded,
                            label: 'Class',
                            value: profile!.className! +
                                (profile!.sectionName != null
                                    ? ' — Section ${profile!.sectionName}'
                                    : ''),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // ── Guardian info ────────────────────────────
                if (profile?.guardianName != null) ...[
                  const _SectionLabel('Guardian'),
                  const SizedBox(height: 8),
                  Card(
                    child: Column(
                      children: [
                        _InfoTile(
                          icon: Icons.person_outline_rounded,
                          label: 'Name',
                          value: profile!.guardianName!,
                        ),
                        if (profile!.guardianPhone != null) ...[
                          const Divider(height: 1, indent: 56),
                          _InfoTile(
                            icon: Icons.phone_outlined,
                            label: 'Phone',
                            value: profile!.guardianPhone!,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // ── School info ──────────────────────────────
                if (org != null) ...[
                  const _SectionLabel('School'),
                  const SizedBox(height: 8),
                  Card(
                    child: ListTile(
                      leading: org.logoUrl != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                  imageUrl: org.logoUrl!,
                                  width: 40,
                                  height: 40,
                                  fit: BoxFit.contain),
                            )
                          : Icon(Icons.school_rounded,
                              size: 36, color: cs.primary),
                      title: Text(org.name,
                          style: tt.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600)),
                      subtitle: Text(org.slug,
                          style: tt.bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // ── Account ──────────────────────────────────
                const _SectionLabel('Account'),
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading:
                            Icon(Icons.lock_outline_rounded, color: cs.primary),
                        title: const Text('Change Password'),
                        trailing: const Icon(Icons.arrow_forward_ios_rounded,
                            size: 16),
                        onTap: () {},
                      ),
                      const Divider(height: 1, indent: 56),
                      ListTile(
                        leading: Icon(Icons.logout_rounded, color: cs.error),
                        title: Text('Sign Out',
                            style: TextStyle(
                                color: cs.error, fontWeight: FontWeight.w600)),
                        onTap: () => _confirmSignOut(context, ref),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _confirmSignOut(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: Theme.of(ctx).colorScheme.error),
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
}

class _StudentHeroHeader extends StatelessWidget {
  const _StudentHeroHeader(
      {required this.profile, required this.name, required this.email});
  final StudentProfile? profile;
  final String name;
  final String email;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.primary, cs.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              // Avatar
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: cs.onPrimary.withValues(alpha: 0.4), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: CircleAvatar(
                  radius: 46,
                  backgroundColor: cs.onPrimary.withValues(alpha: 0.15),
                  child: profile?.photoUrl != null
                      ? ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: profile!.photoUrl!,
                            width: 92,
                            height: 92,
                            fit: BoxFit.cover,
                          ),
                        )
                      : Text(
                          name.isNotEmpty ? name[0].toUpperCase() : 'S',
                          style: TextStyle(
                            fontSize: 36,
                            color: cs.onPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 14),

              // Name
              Text(
                name,
                style: tt.titleLarge?.copyWith(
                  color: cs.onPrimary,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),

              // Email
              Text(
                email,
                style: tt.bodySmall?.copyWith(
                  color: cs.onPrimary.withValues(alpha: 0.75),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),

              // Student chip + roll/class chips
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                children: [
                  const _HeroChip(label: 'Student', icon: Icons.school_rounded),
                  if (profile?.rollNo != null)
                    _HeroChip(
                        label: 'Roll # ${profile!.rollNo!}',
                        icon: Icons.badge_rounded),
                  if (profile?.className != null)
                    _HeroChip(
                      label: profile!.className! +
                          (profile!.sectionName != null
                              ? '-${profile!.sectionName}'
                              : ''),
                      icon: Icons.class_rounded,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label, required this.icon});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: cs.onPrimary.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.onPrimary.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: cs.onPrimary.withValues(alpha: 0.9)),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: cs.onPrimary,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Generic profile (non-student roles) ──────────────────────────────────────

class _GenericProfile extends ConsumerWidget {
  const _GenericProfile({this.user, this.org});
  final dynamic user;
  final dynamic org;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(20, 60, 20, 28),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [cs.primary, cs.secondary],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            children: [
              CircleAvatar(
                radius: 44,
                backgroundColor: cs.onPrimary.withValues(alpha: 0.15),
                child: user?.profilePhotoUrl != null
                    ? ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: user!.profilePhotoUrl!,
                          width: 88,
                          height: 88,
                          fit: BoxFit.cover,
                        ),
                      )
                    : Text(
                        user?.name.isNotEmpty == true
                            ? user!.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                            fontSize: 34,
                            color: cs.onPrimary,
                            fontWeight: FontWeight.bold),
                      ),
              ),
              const SizedBox(height: 12),
              Text(
                user?.name ?? '',
                style: tt.titleLarge?.copyWith(
                    color: cs.onPrimary, fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                user?.email ?? '',
                style: tt.bodySmall
                    ?.copyWith(color: cs.onPrimary.withValues(alpha: 0.75)),
              ),
              const SizedBox(height: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: cs.onPrimary.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _roleLabel(user?.role ?? ''),
                  style: TextStyle(
                      color: cs.onPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),

        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (org != null) ...[
                const _SectionLabel('School'),
                const SizedBox(height: 8),
                Card(
                  child: ListTile(
                    leading: org.logoUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                                imageUrl: org.logoUrl!,
                                width: 40,
                                height: 40,
                                fit: BoxFit.contain),
                          )
                        : Icon(Icons.school_rounded,
                            size: 36, color: cs.primary),
                    title: Text(org.name,
                        style: tt.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    subtitle: Text(org.slug,
                        style:
                            tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                  ),
                ),
                const SizedBox(height: 20),
              ],
              const _SectionLabel('Account'),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading:
                          Icon(Icons.lock_outline_rounded, color: cs.primary),
                      title: const Text('Change Password'),
                      trailing:
                          const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 56),
                    ListTile(
                      leading: Icon(Icons.logout_rounded, color: cs.error),
                      title: Text('Sign Out',
                          style: TextStyle(
                              color: cs.error, fontWeight: FontWeight.w600)),
                      onTap: () => _confirmSignOut(context, ref),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _roleLabel(String role) => switch (role) {
        'teacher' => 'Teacher',
        'branch_principal' => 'Principal',
        'coordinator' => 'Coordinator',
        'accountant' => 'Accountant',
        'it_admin' => 'IT Admin',
        'group_admin' => 'Group Admin',
        'super_admin' => 'Super Admin',
        _ => role,
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
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: Theme.of(ctx).colorScheme.error),
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
}

// ── Shared helpers ────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: Theme.of(context)
            .textTheme
            .labelLarge
            ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
      );
}

class _InfoTile extends StatelessWidget {
  const _InfoTile(
      {required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return ListTile(
      leading: Icon(icon, color: cs.primary, size: 22),
      title: Text(label,
          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
      subtitle: Text(value,
          style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
      dense: true,
    );
  }
}
