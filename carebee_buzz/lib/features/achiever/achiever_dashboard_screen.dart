import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../main.dart';
import '../auth/providers/auth_provider.dart';
import '../supporter/providers/routine_provider.dart';

class AchieverDashboardScreen extends ConsumerWidget {
  const AchieverDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routinesAsyncValue = ref.watch(routineStreamProvider(null));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'My Daily Tasks',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 32),
        ),
        backgroundColor: Colors.white,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.people, size: 32),
            onPressed: () {
              // Action for "my circle"
            },
            tooltip: 'my circle',
          ),
          IconButton(
            icon: const Icon(Icons.logout, size: 32),
            onPressed: () async {
              final prefs = ref.read(sharedPreferencesProvider);
              await prefs.remove('user_role');
              await ref.read(authServiceProvider).signOut();
            },
            tooltip: 'Log out',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.mood, size: 48),
                label: const Text(
                  'How are you feeling?',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E1E1E), // warmstone-900
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                onPressed: () {
                  context.push('/achiever/mood');
                },
              ),
              const SizedBox(height: 32),
              Expanded(
                child: routinesAsyncValue.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => Center(child: Text('Error loading tasks')),
                  data: (routines) {
                    if (routines.isEmpty) {
                      return const Center(
                        child: Text(
                          'No tasks right now!\nYou are all caught up 🌟',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 24, color: Colors.grey),
                        ),
                      );
                    }
                    return ListView(
                      children: routines.map((routine) {
                        IconData icon = Icons.check_circle_outline;
                        if (routine.category == 'Activity') icon = Icons.accessibility_new;
                        if (routine.category == 'Medication') icon = Icons.medication;
                        if (routine.category == 'Self Care') icon = Icons.clean_hands;
                        
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _buildTaskCard(routine.title, icon),
                        );
                      }).toList(),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTaskCard(String title, IconData icon) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      color: const Color(0xFFFFF8E6),
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
          child: Row(
            children: [
              Icon(icon, size: 48, color: const Color(0xFFE8A817)),
              const SizedBox(width: 24),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E1E1E),
                  ),
                ),
              ),
              const Icon(Icons.circle_outlined, size: 48, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
