import 'package:flutter/material.dart';

class NotificationPreferencesScreen extends StatefulWidget {
  final String achieverId;
  const NotificationPreferencesScreen({super.key, required this.achieverId});

  @override
  State<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  bool _notifyOnRoutineComplete = true;
  bool _notifyOnRoutineMissed = true;
  bool _quietHoursEnabled = true;

  TimeOfDay _quietStart = const TimeOfDay(hour: 20, minute: 0); // 8:00 PM
  TimeOfDay _quietEnd = const TimeOfDay(hour: 7, minute: 0); // 7:00 AM

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _quietStart : _quietEnd,
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
      setState(() {
        if (isStart) {
          _quietStart = picked;
        } else {
          _quietEnd = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Preferences'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            const Text(
              'My Notifications',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'When do you want to be notified about the Achiever\'s progress?',
              style: TextStyle(color: Color(0xFF5E5E5E)),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Routine Completed'),
              subtitle: const Text('Get a push notification when they tick off a routine.'),
              activeColor: const Color(0xFFE8A817),
              value: _notifyOnRoutineComplete,
              onChanged: (val) => setState(() => _notifyOnRoutineComplete = val),
            ),
            SwitchListTile(
              title: const Text('Routine Missed'),
              subtitle: const Text('Get notified if a scheduled time passes without completion.'),
              activeColor: const Color(0xFFE8A817),
              value: _notifyOnRoutineMissed,
              onChanged: (val) => setState(() => _notifyOnRoutineMissed = val),
            ),
            const Divider(height: 48),
            
            const Text(
              'Achiever Device Settings',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Manage when their tablet can receive gentle nudges.',
              style: TextStyle(color: Color(0xFF5E5E5E)),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Quiet Hours'),
              subtitle: const Text('Prevent push notifications during specific times.'),
              activeColor: const Color(0xFFE8A817),
              value: _quietHoursEnabled,
              onChanged: (val) => setState(() => _quietHoursEnabled = val),
            ),
            if (_quietHoursEnabled) ...[
              ListTile(
                leading: const Icon(Icons.bedtime, color: Color(0xFF5E5E5E)),
                title: const Text('Quiet Hours Start'),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8A817).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE8A817)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_quietStart.format(context), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E1E1E))),
                      const SizedBox(width: 8),
                      const Icon(Icons.edit, size: 16, color: Color(0xFFE8A817)),
                    ],
                  ),
                ),
                onTap: () => _pickTime(true),
              ),
              ListTile(
                leading: const Icon(Icons.wb_sunny, color: Color(0xFF5E5E5E)),
                title: const Text('Quiet Hours End'),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8A817).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE8A817)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_quietEnd.format(context), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E1E1E))),
                      const SizedBox(width: 8),
                      const Icon(Icons.edit, size: 16, color: Color(0xFFE8A817)),
                    ],
                  ),
                ),
                onTap: () => _pickTime(false),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
