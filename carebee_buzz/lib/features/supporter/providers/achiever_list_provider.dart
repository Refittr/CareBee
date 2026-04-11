import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LinkedAchiever {
  final String pairingId;
  final String achieverId;
  final String deviceName;
  final String? achieverName;

  LinkedAchiever({
    required this.pairingId,
    required this.achieverId,
    required this.deviceName,
    this.achieverName,
  });
}

final linkedAchieversProvider = FutureProvider<List<LinkedAchiever>>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];

  final response = await supabase
      .from('device_pairings')
      .select('id, achiever_id, device_name')
      .eq('supporter_id', userId)
      .eq('status', 'linked');

  final List<LinkedAchiever> achievers = [];

  for (final row in response) {
    // Try to fetch the achiever's profile name
    String? name;
    try {
      final profile = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', row['achiever_id'])
          .maybeSingle();
      name = profile?['full_name'];
    } catch (_) {}

    achievers.add(LinkedAchiever(
      pairingId: row['id'],
      achieverId: row['achiever_id'],
      deviceName: row['device_name'] ?? 'Unknown Device',
      achieverName: name,
    ));
  }

  return achievers;
});
