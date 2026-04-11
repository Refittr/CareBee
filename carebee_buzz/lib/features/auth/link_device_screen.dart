import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LinkDeviceScreen extends ConsumerStatefulWidget {
  const LinkDeviceScreen({super.key});

  @override
  ConsumerState<LinkDeviceScreen> createState() => _LinkDeviceScreenState();
}

class _LinkDeviceScreenState extends ConsumerState<LinkDeviceScreen> {
  final _supabase = Supabase.instance.client;
  String _status = 'Awaiting Scan';
  bool _isProcessing = false;
  MobileScannerController? _scannerController;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
    );
  }

  Future<void> _handleScan(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final String? pairingId = barcodes.first.rawValue;
      if (pairingId == null || pairingId.length < 30) return; // simple UUID check

      setState(() {
        _isProcessing = true;
        _status = 'Authenticating...';
      });

      try {
        // 1. Sign in anonymously
        final AuthResponse response = await _supabase.auth.signInAnonymously();
        final userId = response.session?.user.id;
        
        if (userId == null) throw Exception('Anonymous auth failed');

        setState(() {
          _status = 'Requesting permission from Supporter...';
        });

        // 2. Update the pairing row
        await _supabase.from('device_pairings').update({
          'status': 'awaiting_approval',
          'achiever_id': userId,
          'device_name': '${Platform.operatingSystem[0].toUpperCase()}${Platform.operatingSystem.substring(1)} Tablet',
        }).eq('id', pairingId);

        // 3. Listen for approval
        _supabase
            .channel('public:device_pairings:id=eq.$pairingId')
            .onPostgresChanges(
              event: PostgresChangeEvent.update,
              schema: 'public',
              table: 'device_pairings',
              filter: PostgresChangeFilter(
                type: PostgresChangeFilterType.eq,
                column: 'id',
                value: pairingId,
              ),
              callback: (payload) {
                final newStatus = payload.newRecord['status'];
                if (newStatus == 'linked') {
                  // WE ARE IN!
                  _supabase.removeAllChannels();
                  if (mounted) context.go('/achiever');
                } else if (newStatus == 'rejected') {
                  _supabase.removeAllChannels();
                  _supabase.auth.signOut(); // Wipe auth
                  if (mounted) {
                    setState(() {
                      _isProcessing = false;
                      _status = 'Request Rejected by Supporter. Try again.';
                    });
                  }
                }
              },
            )
            .subscribe();
      } catch (e) {
        setState(() {
          _isProcessing = false;
          _status = 'Error: $e';
        });
        _supabase.auth.signOut();
      }
    }
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Link Device'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/hub'),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: _isProcessing
                ? const Center(child: CircularProgressIndicator())
                : MobileScanner(
                    controller: _scannerController,
                    onDetect: _handleScan,
                  ),
          ),
          Expanded(
            flex: 1,
            child: Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.qr_code, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    _status,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
