import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../providers/auth_provider.dart';
import '../../providers/org_provider.dart';
import '../../core/storage/local_storage.dart';
import '../../core/layout/responsive.dart';
import '../../core/theme/app_design.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  int _roleIndex = 2;
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  final _loginAsValues = ['admin', 'teacher', 'student'];

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).login(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            slug: LocalStorageService.orgSlug ?? '',
            loginAs: _loginAsValues[_roleIndex],
          );
      if (!mounted) return;
      context.go(ref.read(authProvider).user!.homeRoute);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final org = ref.watch(orgProvider);
    final h = MediaQuery.of(context).size.height;
    final heroHeight =
        (h * (context.isShortViewport ? 0.38 : 0.46)).clamp(210.0, 430.0);

    return Scaffold(
      body: Column(
        children: [
          // ── Hero ──────────────────────────────────────────────
          SizedBox(
            height: heroHeight,
            width: double.infinity,
            child: Stack(
              clipBehavior: Clip.hardEdge,
              children: [
                // Gradient background
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.identityStart,
                          AppColors.identityMid,
                          AppColors.primary,
                        ],
                        stops: [0.0, 0.55, 1.0],
                      ),
                    ),
                  ),
                ),

                // Decorative circle — bottom left
                const Positioned(
                  bottom: -80,
                  left: -70,
                  child: _DecorativeCircle(size: 230),
                ),

                // Decorative circle — top right
                const Positioned(
                  top: -40,
                  right: -60,
                  child: _DecorativeCircle(size: 200),
                ),

                // Dot grid — left side
                Positioned(
                  top: 80,
                  left: 16,
                  child: CustomPaint(
                    size: const Size(72, 120),
                    painter: _DotPainter(
                      color: Colors.white.withValues(alpha: 0.25),
                    ),
                  ),
                ),

                // Content
                SafeArea(
                  bottom: false,
                  child: Column(
                    children: [
                      // Switch School button — top right
                      Align(
                        alignment: Alignment.topRight,
                        child: Padding(
                          padding: const EdgeInsets.only(top: 10, right: 16),
                          child: GestureDetector(
                            onTap: () {
                              ref.read(orgProvider.notifier).clearOrg();
                              context.go('/onboarding/scan');
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.12),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.qr_code_scanner_rounded,
                                      color: cs.primary, size: 26),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Switch school',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: cs.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Logo + name
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _OrgLogo(logoUrl: org?.logoUrl),
                            const SizedBox(height: 16),
                            Text(
                              org?.name ?? 'EduStack',
                              style: tt.headlineMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Sign in to continue',
                              style: tt.bodyLarge?.copyWith(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Form card ──────────────────────────────────────────
          Expanded(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: cs.surface,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Role selector
                      _RoleSelector(
                        selected: _roleIndex,
                        onChanged: (i) => setState(() {
                          _roleIndex = i;
                          _error = null;
                        }),
                      ),

                      const SizedBox(height: 20),

                      // Email
                      TextFormField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        style: tt.bodyLarge,
                        decoration: InputDecoration(
                          hintText: 'Email address',
                          prefixIcon: Icon(Icons.email_outlined,
                              color: cs.onSurfaceVariant),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: cs.outlineVariant),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: cs.outlineVariant),
                          ),
                          filled: true,
                          fillColor: cs.surface,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 16),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!v.contains('@')) return 'Enter a valid email';
                          return null;
                        },
                      ),

                      const SizedBox(height: 14),

                      // Password
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        style: tt.bodyLarge,
                        decoration: InputDecoration(
                          hintText: 'Password',
                          prefixIcon: Icon(Icons.lock_outline_rounded,
                              color: cs.onSurfaceVariant),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: cs.onSurfaceVariant,
                            ),
                            onPressed: () =>
                                setState(() => _obscure = !_obscure),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: cs.outlineVariant),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: cs.outlineVariant),
                          ),
                          filled: true,
                          fillColor: cs.surface,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 16),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Password is required';
                          }
                          if (v.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),

                      // Error banner
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: cs.errorContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Icon(Icons.gpp_bad_rounded,
                                  color: cs.error, size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: TextStyle(
                                      color: cs.error,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 20),

                      // Sign In button
                      FilledButton(
                        onPressed: _loading ? null : _submit,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(54),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          backgroundColor: AppColors.primary,
                        ),
                        child: _loading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2.5, color: Colors.white),
                              )
                            : const Text(
                                'Sign in',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                      ),

                      const SizedBox(height: 24),

                      // Footer
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.verified_user_outlined,
                              size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 6),
                          Text(
                            'EduStack PK · WolfStack',
                            style: tt.bodySmall
                                ?.copyWith(color: cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Role selector ─────────────────────────────────────────────────────────────

class _RoleSelector extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;

  const _RoleSelector({required this.selected, required this.onChanged});

  static const _roleColors = [
    AppColors.primary,
    AppColors.success,
    AppColors.info,
  ];

  static const _roleIcons = [
    Icons.admin_panel_settings_rounded,
    Icons.menu_book_rounded,
    Icons.backpack_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final roleLabels = [
      'Admin',
      'Teacher',
      'Student',
    ];

    return Row(
      children: List.generate(3, (i) {
        final active = i == selected;
        final roleColor = _roleColors[i];
        return Expanded(
          child: GestureDetector(
            onTap: () => onChanged(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeInOut,
              margin: EdgeInsets.only(left: i == 0 ? 0 : 8),
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: active ? roleColor : cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: active ? roleColor : Colors.transparent,
                  width: 2,
                ),
                boxShadow: active
                    ? [
                        BoxShadow(
                          color: roleColor.withValues(alpha: 0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        )
                      ]
                    : [],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: active
                          ? Colors.white.withValues(alpha: 0.18)
                          : roleColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _roleIcons[i],
                      size: 20,
                      color: active ? Colors.white : roleColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    roleLabels[i],
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: active ? Colors.white : cs.onSurfaceVariant,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}

// ── Org logo ──────────────────────────────────────────────────────────────────

class _OrgLogo extends StatelessWidget {
  final String? logoUrl;

  const _OrgLogo({this.logoUrl});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipOval(
        child: logoUrl != null
            ? CachedNetworkImage(
                imageUrl: logoUrl!,
                width: 100,
                height: 100,
                fit: BoxFit.cover,
                placeholder: (_, __) => const ColoredBox(
                  color: Colors.white,
                  child: Center(
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: AppColors.primary),
                    ),
                  ),
                ),
                errorWidget: (_, __, ___) => const ColoredBox(
                  color: Colors.white,
                  child: Center(
                    child: Icon(Icons.school_rounded,
                        color: AppColors.primary, size: 50),
                  ),
                ),
              )
            : const ColoredBox(
                color: Colors.white,
                child: Center(
                  child: Icon(Icons.school_rounded,
                      color: AppColors.primary, size: 50),
                ),
              ),
      ),
    );
  }
}

// ── Decorative circle ─────────────────────────────────────────────────────────

class _DecorativeCircle extends StatelessWidget {
  final double size;

  const _DecorativeCircle({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.08),
      ),
    );
  }
}

// ── Dot grid painter ──────────────────────────────────────────────────────────

class _DotPainter extends CustomPainter {
  final Color color;

  const _DotPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    const spacing = 14.0;
    const radius = 2.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), radius, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DotPainter old) => old.color != color;
}
