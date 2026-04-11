import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/supabase_repository.dart';

class Routine {
  final String id;
  final String title;
  final String category;
  final List<String> schedule;
  final String? achieverId;

  Routine({
    required this.id,
    required this.title,
    required this.category,
    required this.schedule,
    this.achieverId,
  });

  factory Routine.fromMap(Map<String, dynamic> map) {
    List<String> times = [];
    if (map['schedule'] != null && map['schedule']['times'] != null) {
      times = List<String>.from(map['schedule']['times']);
    }
    return Routine(
      id: map['id'].toString(),
      title: map['title'] as String? ?? 'Untitled Task',
      category: map['category'] as String? ?? 'Activity',
      schedule: times,
      achieverId: map['achiever_id'] as String?,
    );
  }

  // toMap only includes columns safe to write on insert/update
  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'category': category,
      'schedule': {'times': schedule},
    };
  }
}

final routineStreamProvider = StreamProvider.family<List<Routine>, String?>((ref, achieverId) {
  final repo = ref.watch(supabaseRepositoryProvider);
  return repo.getRoutinesStream(achieverId: achieverId);
});

final routineActionsProvider = Provider<RoutineActions>((ref) {
  return RoutineActions(ref.watch(supabaseRepositoryProvider));
});

class RoutineActions {
  final SupabaseRepository _repo;
  RoutineActions(this._repo);

  Future<void> addRoutine(String title, String category, List<String> schedule, {String? achieverId}) async {
    await _repo.addRoutine(
      Routine(id: '', title: title, category: category, schedule: schedule),
      achieverId: achieverId,
    );
  }

  Future<void> updateRoutine(String id, String title, String category, List<String> schedule, {String? achieverId}) async {
    await _repo.updateRoutine(Routine(id: id, title: title, category: category, schedule: schedule, achieverId: achieverId));
  }

  Future<void> deleteRoutine(String id) async {
    await _repo.deleteRoutine(id);
  }
}
