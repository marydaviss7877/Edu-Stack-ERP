import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';

import '../../models/org.dart';

class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({super.key});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _scanned = false;
  bool _picking = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Shared decode logic used by both camera scan and image upload
  void _processRawValue(String raw) {
    try {
      final decoded = utf8.decode(base64Decode(raw));
      final json = jsonDecode(decoded) as Map<String, dynamic>;
      final org = OrgConfig.fromQrPayload(json);
      if (!mounted) return;
      context.go('/onboarding/confirm', extra: org);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Invalid QR code. Please scan your school EduStack QR.';
        _scanned = false;
        _picking = false;
      });
      _controller.start();
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null) return;
    _scanned = true;
    _controller.stop();
    _processRawValue(raw);
  }

  Future<void> _pickAndScanImage() async {
    if (_picking) return;
    setState(() {
      _picking = true;
      _error = null;
    });
    _controller.stop();

    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(source: ImageSource.gallery);
      if (file == null) {
        // User cancelled
        setState(() {
          _picking = false;
        });
        _controller.start();
        return;
      }

      final capture = await _controller.analyzeImage(file.path);
      final raw = capture?.barcodes.firstOrNull?.rawValue;

      if (raw == null) {
        if (!mounted) return;
        setState(() {
          _error = 'No QR code found in the image. Try a clearer photo.';
          _picking = false;
        });
        _controller.start();
        return;
      }

      _processRawValue(raw);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not read the image. Please try again.';
        _picking = false;
      });
      _controller.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Full-screen camera
          MobileScanner(controller: _controller, onDetect: _onDetect),

          // Darkened overlay with scan window cutout
          _ScanOverlay(),

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Spacer(),
                  // Torch toggle
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.flash_on_rounded,
                          color: Colors.white),
                      onPressed: () => _controller.toggleTorch(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Trust and alternate-action sheet
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              padding: EdgeInsets.fromLTRB(
                  20, 20, 20, MediaQuery.paddingOf(context).bottom + 18),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(Icons.account_balance_rounded,
                        color: Theme.of(context).colorScheme.primary),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Connect to your school',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your code securely selects the correct EduStack organization. It does not sign you in.',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(_error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onErrorContainer,
                              fontSize: 12)),
                    ),
                  ],
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: _picking ? null : _pickAndScanImage,
                    icon: _picking
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.image_rounded),
                    label: const Text('Upload QR from gallery'),
                  ),
                ],
              ),
            ),
          ),

          Positioned(
            left: 20,
            right: 20,
            top: MediaQuery.paddingOf(context).top + 64,
            child: IgnorePointer(
              child: Column(
                children: [
                  const Text(
                    'Scan your school QR',
                    style: TextStyle(
                        color: Colors.white,
                        fontFamily: 'Outfit',
                        fontSize: 22,
                        fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Position the school-issued QR code inside the frame',
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: .72),
                        fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _OverlayPainter(),
      child: const SizedBox.expand(),
    );
  }
}

class _OverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.black.withValues(alpha: 0.55);
    const windowSize = 260.0;
    final cx = size.width / 2;
    final cy = size.height / 2 - 40;
    final rect = Rect.fromCenter(
        center: Offset(cx, cy), width: windowSize, height: windowSize);

    // Draw dim overlay with cutout
    canvas
      ..drawRect(Rect.fromLTWH(0, 0, size.width, rect.top), paint)
      ..drawRect(Rect.fromLTWH(0, rect.top, rect.left, windowSize), paint)
      ..drawRect(
          Rect.fromLTWH(
              rect.right, rect.top, size.width - rect.right, windowSize),
          paint)
      ..drawRect(
          Rect.fromLTWH(0, rect.bottom, size.width, size.height - rect.bottom),
          paint);

    // Scan window border
    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(16)),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
