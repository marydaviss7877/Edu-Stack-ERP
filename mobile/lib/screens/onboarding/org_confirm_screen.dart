import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../models/org.dart';
import '../../providers/org_provider.dart';
import '../../core/network/dio_client.dart';
import '../../core/constants/api_constants.dart';

class OrgConfirmScreen extends ConsumerStatefulWidget {
  final OrgConfig org;
  const OrgConfirmScreen({super.key, required this.org});

  @override
  ConsumerState<OrgConfirmScreen> createState() => _OrgConfirmScreenState();
}

class _OrgConfirmScreenState extends ConsumerState<OrgConfirmScreen> {
  String? _logoUrl;
  bool _fetchingLogo = true;

  @override
  void initState() {
    super.initState();
    _fetchLogoUrl();
  }

  Future<void> _fetchLogoUrl() async {
    final url = '${ApiConstants.orgBranding}/${widget.org.slug}';
    debugPrint(
        '[OrgConfirm] Fetching branding from: ${ApiConstants.baseUrl}$url');
    try {
      final res = await DioClient.instance.get(url);
      debugPrint('[OrgConfirm] Response: ${res.data}');
      final data = res.data['data'] as Map<String, dynamic>?;
      final logo = data?['logoUrl'] as String?;
      debugPrint('[OrgConfirm] logoUrl = $logo');
      if (mounted) {
        setState(() {
          _logoUrl = logo;
          _fetchingLogo = false;
        });
      }
    } catch (e) {
      debugPrint('[OrgConfirm] ERROR fetching logo: $e');
      if (mounted) setState(() => _fetchingLogo = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - 48,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // School logo
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: cs.outlineVariant),
                    ),
                    child: _fetchingLogo
                        ? const Center(
                            child: CircularProgressIndicator(strokeWidth: 2.5))
                        : _logoUrl != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(22),
                                child: CachedNetworkImage(
                                  imageUrl: _logoUrl!,
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Icon(
                                      Icons.school_rounded,
                                      size: 48,
                                      color: cs.primary),
                                ),
                              )
                            : Icon(Icons.school_rounded,
                                size: 52, color: cs.primary),
                  ),

                  const SizedBox(height: 28),

                  Text('Is this your school?',
                      style:
                          tt.titleMedium?.copyWith(color: cs.onSurfaceVariant)),
                  const SizedBox(height: 8),
                  Text(
                    widget.org.name,
                    style: tt.headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: cs.primaryContainer,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      widget.org.slug,
                      style: TextStyle(
                          color: cs.onPrimaryContainer,
                          fontWeight: FontWeight.w600,
                          fontSize: 13),
                    ),
                  ),

                  const SizedBox(height: 16),

                  const SizedBox(height: 24),

                  // Confirm — save org WITH the fetched logoUrl
                  FilledButton.icon(
                    onPressed: () {
                      ref.read(orgProvider.notifier).setOrg(
                            OrgConfig(
                              slug: widget.org.slug,
                              name: widget.org.name,
                              logoUrl: _logoUrl,
                              primaryColor: widget.org.primaryColor,
                            ),
                          );
                      context.go('/login');
                    },
                    icon: const Icon(Icons.check_circle_outline_rounded),
                    label: const Text('Yes, connect this school'),
                  ),

                  const SizedBox(height: 12),

                  OutlinedButton.icon(
                    onPressed: () => context.go('/onboarding/scan'),
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Scan a different QR'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
