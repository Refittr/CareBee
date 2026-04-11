import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/routine_provider.dart';


class CreateRoutineScreen extends ConsumerStatefulWidget {
  final Routine? existingRoutine;
  final String? achieverId;
  const CreateRoutineScreen({super.key, this.existingRoutine, this.achieverId});

  @override
  ConsumerState<CreateRoutineScreen> createState() => _CreateRoutineScreenState();
}

class _CreateRoutineScreenState extends ConsumerState<CreateRoutineScreen> {
  late TextEditingController _titleController;
  late String _selectedCategory;
  List<String> _selectedSchedules = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.existingRoutine?.title ?? '');
    _selectedCategory = widget.existingRoutine?.category ?? 'Activity';
    
    if (widget.existingRoutine != null && widget.existingRoutine!.schedule.isNotEmpty) {
      _selectedSchedules = List.from(widget.existingRoutine!.schedule);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFE8A817),
              onPrimary: Colors.white,
              onSurface: Color(0xFF1E1E1E),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      if (!mounted) return;
      final formattedTime = 'Daily at ${picked.format(context)}';
      setState(() {
        if (!_selectedSchedules.contains(formattedTime)) {
          _selectedSchedules.add(formattedTime);
        }
      });
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.existingRoutine == null ? 'Add New Routine' : 'Edit Routine'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Task Name',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                  hintText: 'e.g. Brush teeth',
                  border: OutlineInputBorder(),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFFE8A817)),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              
              const Text(
                'Category',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                items: const [
                  DropdownMenuItem(value: 'Activity', child: Text('Activity')),
                  DropdownMenuItem(value: 'Medication', child: Text('Medication')),
                  DropdownMenuItem(value: 'Self Care', child: Text('Self Care')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              
              const Text(
                'When should this be done? (Select all that apply)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ['Morning', 'Afternoon', 'Evening', 'During the night', 'Anytime'].map((timeStr) {
                  final isSelected = _selectedSchedules.contains(timeStr);
                  return ChoiceChip(
                    label: Text(timeStr, style: TextStyle(color: isSelected ? Colors.white : Colors.black)),
                    selected: isSelected,
                    selectedColor: const Color(0xFFE8A817),
                    onSelected: (selected) {
                      setState(() { 
                        if (selected) {
                          _selectedSchedules.add(timeStr);
                        } else {
                          // Prevent array from dropping below 1 item if possible, but allow freedom
                          _selectedSchedules.remove(timeStr);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              const Text('Or add an exact time:', style: TextStyle(color: Color(0xFF5E5E5E))),
              const SizedBox(height: 8),
              ListTile(
                title: const Text('Add Specific Time'),
                subtitle: const Text('Tap to set exact time (e.g. Meds)'),
                leading: const Icon(Icons.add_alarm),
                trailing: const Icon(Icons.chevron_right),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                onTap: _pickTime,
              ),
              
              if (_selectedSchedules.where((s) => s.contains(':')).isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text('Specific Times Selected:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ..._selectedSchedules.where((s) => s.contains(':')).map((timeStr) => 
                  Chip(
                    label: Text(timeStr),
                    onDeleted: () {
                      setState(() {
                        _selectedSchedules.remove(timeStr);
                      });
                    },
                  )
                ).toList()
              ],

              const SizedBox(height: 32),
              
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E1E1E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _isSaving ? null : () async {
                  if (_titleController.text.trim().isEmpty) return;
                  final schedules = _selectedSchedules.isEmpty
                      ? ['Anytime']
                      : List<String>.from(_selectedSchedules);

                  final messenger = ScaffoldMessenger.of(context);
                  final router = GoRouter.of(context);
                  setState(() => _isSaving = true);
                  try {
                    if (widget.existingRoutine == null) {
                      await ref.read(routineActionsProvider).addRoutine(
                        _titleController.text.trim(),
                        _selectedCategory,
                        schedules,
                        achieverId: widget.achieverId,
                      );
                    } else {
                      await ref.read(routineActionsProvider).updateRoutine(
                        widget.existingRoutine!.id,
                        _titleController.text.trim(),
                        _selectedCategory,
                        schedules,
                        achieverId: widget.existingRoutine!.achieverId ?? widget.achieverId,
                      );
                    }
                    ref.invalidate(routineStreamProvider);
                    if (mounted) router.pop();
                  } catch (e) {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text('Could not save routine: $e'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  } finally {
                    if (mounted) setState(() => _isSaving = false);
                  }
                },
                child: _isSaving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(widget.existingRoutine == null ? 'Save Routine' : 'Update Routine', style: const TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
