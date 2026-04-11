import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MoodCheckinScreen extends StatelessWidget {
  const MoodCheckinScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'How are you feeling?',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 32, color: Colors.black),
        ),
        backgroundColor: Colors.white,
        centerTitle: false,
        iconTheme: const IconThemeData(color: Colors.black, size: 32),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildMoodButton(context, '😃', 'Happy', const Color(0xFF4CAF50)),
              _buildMoodButton(context, '😐', 'Okay', const Color(0xFFE8A817)),
              _buildMoodButton(context, '😟', 'Worried', const Color(0xFFFF9800)),
              _buildMoodButton(context, '😢', 'Sad', const Color(0xFF2196F3)),
              _buildMoodButton(context, '😠', 'Angry', const Color(0xFFF44336)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMoodButton(BuildContext context, String emoji, String label, Color color) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withOpacity(0.1),
        foregroundColor: Colors.black,
        padding: const EdgeInsets.symmetric(vertical: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: color, width: 4),
        ),
        elevation: 0,
      ),
      onPressed: () {
        // Save mood to DB
        // Show big success banner
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Thank you for telling us you feel $label!',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            backgroundColor: color,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        );
        context.pop();
      },
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 56)),
          const SizedBox(width: 32),
          Text(
            label,
            style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
