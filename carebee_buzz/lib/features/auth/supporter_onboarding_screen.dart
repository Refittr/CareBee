import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'providers/auth_provider.dart';
import 'providers/onboarding_provider.dart';

class SupporterOnboardingScreen extends ConsumerStatefulWidget {
  const SupporterOnboardingScreen({super.key});

  @override
  ConsumerState<SupporterOnboardingScreen> createState() => _SupporterOnboardingScreenState();
}

class _SupporterOnboardingScreenState extends ConsumerState<SupporterOnboardingScreen> {
  bool _isLoading = false;

  Future<void> _completeSetup() async {
    setState(() => _isLoading = true);

    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      // Insert the feature flag!
      await Supabase.instance.client.from('onboarding_checklist').upsert({
        'user_id': user.id,
        'step_key': 'buzz_welcome_done',
      }, onConflict: 'user_id,step_key');

      // Force Riverpod to refetch the onboarding status so the router updates
      ref.invalidate(onboardingStatusProvider);
      
      if (mounted) {
        context.go('/supporter');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error finishing setup: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF7F2), // Core CareBee cream
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.hive,
                  size: 80,
                  color: Color(0xFFE8A817),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Welcome to BUZZ!',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF3D3530),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  "We see you have a CareBee account, but you haven't set up the BUZZ app yet.\n\nLet's get your first Achiever tablets paired and start syncing your routines!",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Color(0xFF6B5E54),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 48),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3D3530),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _isLoading ? null : _completeSetup,
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            "Let's Go!",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    ref.read(authServiceProvider).signOut();
                  },
                  child: const Text(
                    'Log me out',
                    style: TextStyle(color: Colors.redAccent),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
