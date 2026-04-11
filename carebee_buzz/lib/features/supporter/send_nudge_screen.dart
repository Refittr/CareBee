import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SendNudgeScreen extends StatefulWidget {
  final String achieverId;
  const SendNudgeScreen({super.key, required this.achieverId});

  @override
  State<SendNudgeScreen> createState() => _SendNudgeScreenState();
}

class _SendNudgeScreenState extends State<SendNudgeScreen> {
  final _messageController = TextEditingController();
  bool _sendPushNotification = true;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Send a Nudge'),
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
                'Send a quick note or reminder to the Achiever. Keep it short and positive!',
                style: TextStyle(color: Color(0xFF5E5E5E), fontSize: 16),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _messageController,
                maxLength: 100,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'e.g. You are doing great today! or Don\'t forget to drink water.',
                  border: const OutlineInputBorder(),
                  focusedBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFFE8A817), width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
              ),
              const SizedBox(height: 24),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Send as Push Notification?',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text(
                  'If turned off, they will only see it inside the app.',
                ),
                activeColor: const Color(0xFFE8A817),
                value: _sendPushNotification,
                onChanged: (val) {
                  setState(() {
                    _sendPushNotification = val;
                  });
                },
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                icon: const Icon(Icons.send),
                label: const Text('Send Nudge', style: TextStyle(fontSize: 18)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E1E1E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: () {
                  // Simulate sending to the database and FCM
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Nudge sent!'),
                      backgroundColor: Color(0xFF4CAF50),
                    ),
                  );
                  context.pop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
