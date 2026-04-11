import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'providers/achiever_list_provider.dart';

class PairAchieverScreen extends ConsumerStatefulWidget {
  const PairAchieverScreen({super.key});

  @override
  ConsumerState<PairAchieverScreen> createState() => _PairAchieverScreenState();
}

class _PairAchieverScreenState extends ConsumerState<PairAchieverScreen> {
  final _supabase = Supabase.instance.client;
  String? _pairingId;
  String? _verificationPin;
  bool _isLoading = true;
  RealtimeChannel? _subscription;

  @override
  void initState() {
    super.initState();
    _initializePairing();
  }

  Future<void> _initializePairing() async {
    try {
      final pin = (Random().nextInt(9000) + 1000).toString();

      final response = await _supabase.from('device_pairings').insert({
        'supporter_id': _supabase.auth.currentUser!.id,
        'verification_pin': pin,
        'status': 'pending_scan',
      }).select().single();

      final pairingId = response['id'] as String;

      setState(() {
        _pairingId = pairingId;
        _verificationPin = pin;
        _isLoading = false;
      });

      _subscription = _supabase
          .channel('pairing:$pairingId')
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
              final newRow = payload.newRecord;
              if (newRow['status'] == 'awaiting_approval' && mounted) {
                _showApprovalDialog(
                  newRow['device_name'] as String? ?? 'Unknown Device',
                  newRow['achiever_id'] as String,
                );
              }
            },
          )
          .subscribe();
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error generating pairing code: $e')),
        );
      }
    }
  }

  Future<void> _approve(String deviceName, String achieverId) async {
    try {
      await _supabase
          .from('device_pairings')
          .update({'status': 'linked'})
          .eq('id', _pairingId!);

      // Refresh the achievers list so dashboard updates immediately
      ref.invalidate(linkedAchieversProvider);

      if (mounted) {
        Navigator.of(context).pop(); // close dialog
        Navigator.of(context).pop(); // close pairing screen
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$deviceName linked successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // close dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to link device: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _reject() {
    _supabase
        .from('device_pairings')
        .update({'status': 'rejected'})
        .eq('id', _pairingId!);
    Navigator.of(context).pop();
  }

  void _showApprovalDialog(String deviceName, String achieverId) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Link Requested!'),
        content: Text(
          '"$deviceName" wants to link to your account.\n\n'
          'Check the PIN on their screen matches:\n\n'
          '$_verificationPin',
          style: const TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: _reject,
            child: const Text('Reject', style: TextStyle(color: Colors.red)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE8A817),
              foregroundColor: Colors.white,
            ),
            onPressed: () => _approve(deviceName, achieverId),
            child: const Text('Allow Device'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _subscription?.unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Link Achiever Tablet'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: _isLoading
            ? const CircularProgressIndicator()
            : Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Show this code on the Achiever tablet',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Tap "Link this Device" on the tablet and scan the QR code below.',
                      style: TextStyle(color: Color(0xFF6B5E54)),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),
                    if (_pairingId != null)
                      QrImageView(
                        data: _pairingId!,
                        version: QrVersions.auto,
                        size: 250.0,
                        backgroundColor: Colors.white,
                      ),
                    const SizedBox(height: 32),
                    const Text(
                      'Verification PIN',
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _verificationPin ?? '----',
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 12,
                        color: Color(0xFF1E1E1E),
                      ),
                    ),
                    const SizedBox(height: 32),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFFE8A817),
                          ),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Waiting for tablet to scan...',
                          style: TextStyle(color: Color(0xFF6B5E54)),
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
