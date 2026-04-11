import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/routine_provider.dart';


class RoutineManagementScreen extends ConsumerWidget {
  final String achieverId;
  const RoutineManagementScreen({super.key, required this.achieverId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routinesAsyncValue = ref.watch(routineStreamProvider(achieverId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Routines'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            const Text(
              'Active Tasks & Routines',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Add bespoke activities and schedules for the Achiever.',
              style: TextStyle(color: Color(0xFF5E5E5E)),
            ),
            const SizedBox(height: 24),
            
            routinesAsyncValue.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error loading routines: $err')),
              data: (routines) {
                if (routines.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text('No routines found. Tap + to add one!'),
                    ),
                  );
                }
                return Column(
                  children: routines.map((routine) => _buildRoutineItem(
                    context,
                    ref,
                    routine: routine,
                  )).toList(),
                );
              },
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/supporter/create-routine?achieverId=$achieverId');
        },
        backgroundColor: const Color(0xFF1E1E1E),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Routine'),
      ),
    );
  }

  Widget _buildRoutineItem(
    BuildContext context,
    WidgetRef ref, {
    required Routine routine,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(routine.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${routine.category} • ${routine.schedule.join(', ')}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () async {
                await ref.read(routineActionsProvider).deleteRoutine(routine.id);
                ref.invalidate(routineStreamProvider);
              },
            ),
            IconButton(
              icon: const Icon(Icons.edit, color: Color(0xFFE8A817)),
              onPressed: () {
                context.push(
                  '/supporter/create-routine?achieverId=${routine.achieverId ?? achieverId}',
                  extra: routine,
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
