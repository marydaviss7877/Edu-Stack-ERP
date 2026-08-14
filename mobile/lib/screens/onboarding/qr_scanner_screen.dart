import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';
import 'package:easy_localization/easy_localization.dart';

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
        _error = 'onboarding.invalidQr'.tr();
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
          _error = 'onboarding.noQrInImage'.tr();
          _picking = false;
        });
        _controller.start();
        return;
      }

      _processRawValue(raw);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'onboarding.imageReadError'.tr();
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
                  // Upload from gallery button
                  GestureDetector(
                    onTap: _pickAndScanImage,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade600,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: _picking
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.photo_library_rounded,
                                    color: Colors.white, size: 18),
                                SizedBox(width: 6),
                                Text(
                                  'Upload QR',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(width: 10),
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

          // Bottom instructions
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(32, 0, 32, 48),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'onboarding.scanQr'.tr(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'onboarding.scanInstructions'.tr(),
                      style:
                          const TextStyle(color: Colors.white70, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.red.shade900.withValues(alpha: 0.85),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(_error!,
                            style: const TextStyle(
                                color: Colors.white, fontSize: 13)),
                      ),
                    ],
                  ],
                ),
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
