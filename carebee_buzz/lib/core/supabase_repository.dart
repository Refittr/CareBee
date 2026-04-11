import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../features/supporter/providers/routine_provider.dart';

final supabaseRepositoryProvider = Provider<SupabaseRepository>((ref) {
  return SupabaseRepository();
});

class SupabaseRepository {
  final _client = Supabase.instance.client;

  Stream<List<Routine>> getRoutinesStream({String? achieverId}) {
    if (_client.auth.currentUser == null) return Stream.value([]);

    return _client
        .from('buzz_routines')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((maps) {
          return maps
              .where((map) => achieverId == null || map['achiever_id'] == achieverId)
              .map((map) => Routine.fromMap(map))
              .toList();
        });
  }

  Future<void> addRoutine(Routine routine, {String? achieverId}) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw Exception('User not logged in');

    await _client.from('buzz_routines').insert({
      ...routine.toMap(),
      'created_by': userId,
      'achiever_id': achieverId,
    });
  }

  Future<void> updateRoutine(Routine routine) async {
    await _client
        .from('buzz_routines')
        .update({
          ...routine.toMap(),
          'achiever_id': routine.achieverId,
        })
        .eq('id', routine.id);
  }

  Future<void> deleteRoutine(String id) async {
    await _client.from('buzz_routines').delete().eq('id', id);
  }
}
