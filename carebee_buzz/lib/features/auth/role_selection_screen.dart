import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../main.dart'; // For sharedPreferencesProvider

class RoleSelectionScreen extends ConsumerWidget {
  const RoleSelectionScreen({super.key});

  Future<void> _selectRole(BuildContext context, WidgetRef ref, String role) async {
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setString('user_role', role);
    
    if (context.mounted) {
      if (role == 'supporter') {
        context.go('/supporter');
      } else {
        context.go('/achiever');
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8E6), // honey-50 equivalent
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'BUZZ by CareBee',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E1E), // warmstone-900
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Who is using this device?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  color: Color(0xFF5E5E5E), // warmstone-600
                ),
              ),
              const SizedBox(height: 48),
              
              // Supporter Option
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E1E1E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                onPressed: () => _selectRole(context, ref, 'supporter'),
                child: const Column(
                  children: [
                    Icon(Icons.monitor_heart, size: 48),
                    SizedBox(height: 12),
                    Text(
                      'I am a Supporter',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Setup tasks and check progress',
                      style: TextStyle(fontSize: 14, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Achiever Option
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE8A817), // honey-400
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                onPressed: () => _selectRole(context, ref, 'achiever'),
                child: const Column(
                  children: [
                    Icon(Icons.star, size: 48),
                    SizedBox(height: 12),
                    Text(
                      'I am an Achiever',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'See my daily routines',
                      style: TextStyle(fontSize: 14, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
