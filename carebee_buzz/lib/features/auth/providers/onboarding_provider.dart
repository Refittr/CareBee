import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_provider.dart';

final onboardingStatusProvider = FutureProvider<bool>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null || user.isAnonymous) return true; // Achievers don't do Supporter onboarding

  try {
    final response = await Supabase.instance.client
        .from('onboarding_checklist')
        .select()
        .eq('user_id', user.id)
        .eq('step_key', 'buzz_welcome_done');
    
    return response.isNotEmpty;
  } catch (e) {
    // If the table doesn't exist or the query fails, don't block the user.
    return true;
  }
});
