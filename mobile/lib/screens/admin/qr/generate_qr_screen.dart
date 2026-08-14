import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/org_provider.dart';
import '../../../providers/admin_providers.dart';

class GenerateQrScreen extends ConsumerStatefulWidget {
  const GenerateQrScreen({super.key});

  @override
  ConsumerState<GenerateQrScreen> createState() => _GenerateQrState();
}

class _GenerateQrState extends ConsumerState<GenerateQrScreen> {
  String? _qrPayload;
  bool _loading = false;
  String? _error;

  Future<void> _generate() async {
    final user = ref.read(currentUserProvider);
    final org = ref.read(orgProvider);
    if (user == null || org == null) return;

    // Use orgId from user or org context
    final orgId = user.orgId ?? '';
    if (orgId.isEmpty) {
      setState(() => _error = 'Org ID not found. Contact support.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc = ref.read(adminServiceProvider);
      final payload = await svc.generateQrCode(orgId);
      setState(() {
        _qrPayload = payload;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final org = ref.watch(orgProvider);
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('School QR Code')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // ── Explanation ───────────────────────────────────────
          Card(
            color: cs.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.info_outline_rounded,
                        color: cs.primary, size: 20),
                    const SizedBox(width: 8),
                    Text('How it works',
                        style: tt.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 8),
                  Text(
                    'Generate a QR code and print it on your notice board or ID cards. Students and staff scan this code in the EduStack app to automatically configure their school.',
                    style: tt.bodySmall,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ── QR Display ────────────────────────────────────────
          Center(
            child: _loading
                ? const CircularProgressIndicator()
                : _qrPayload != null
                    ? Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: const [
                                BoxShadow(color: Colors.black12, blurRadius: 12)
                              ],
                            ),
                            child: QrImageView(data: _qrPayload!, size: 220),
                          ),
                          const SizedBox(height: 12),
                          Text(org?.name ?? '',
                              style: tt.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold)),
                          Text('/${org?.slug ?? ''}',
                              style: tt.bodySmall
                                  ?.copyWith(color: cs.onSurfaceVariant)),
                        ],
                      )
                    : Column(
                        children: [
                          Icon(Icons.qr_code_2_rounded,
                              size: 80, color: cs.outlineVariant),
                          const SizedBox(height: 12),
                          Text('Tap Generate to create a QR code',
                              style: tt.bodyMedium
                                  ?.copyWith(color: cs.onSurfaceVariant)),
                        ],
                      ),
          ),

          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!,
                style: TextStyle(color: cs.error), textAlign: TextAlign.center),
          ],

          const SizedBox(height: 24),

          // ── Generate button ───────────────────────────────────
          FilledButton.icon(
            onPressed: _loading ? null : _generate,
            icon: const Icon(Icons.refresh_rounded),
            label: Text(_qrPayload == null ? 'Generate QR Code' : 'Regenerate'),
            style:
                FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),

          if (_qrPayload != null) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {}, // TODO: implement share/print
              icon: const Icon(Icons.share_rounded),
              label: const Text('Share / Print'),
              style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48)),
            ),
          ],

          const SizedBox(height: 16),
          Text(
            'The QR code is cryptographically signed and expires if regenerated. Old QR codes will stop working when you regenerate.',
            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
