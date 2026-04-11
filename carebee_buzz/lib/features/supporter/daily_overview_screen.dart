import 'package:flutter/material.dart';

class DailyOverviewScreen extends StatelessWidget {
  const DailyOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Overview'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            const Text(
              'Harvey\'s Day',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'A chronological view of completed and upcoming tasks.',
              style: TextStyle(color: Color(0xFF5E5E5E)),
            ),
            const SizedBox(height: 32),

            _buildTimelineSection('Morning', [
              _TimelineItem(
                time: '08:00 AM',
                title: 'Brush teeth',
                isCompleted: true,
                completedAt: '08:15 AM',
                mood: '😃',
              ),
              _TimelineItem(
                time: '09:00 AM',
                title: 'Take Morning Meds',
                isCompleted: true,
                completedAt: '09:05 AM',
                mood: '😐',
              ),
            ]),

            _buildTimelineSection('Afternoon', [
              _TimelineItem(
                time: '12:30 PM',
                title: 'Eat Lunch',
                isCompleted: true,
                completedAt: '01:15 PM',
                mood: '😃',
              ),
            ]),

            _buildTimelineSection('Evening', [
              _TimelineItem(
                time: '06:00 PM',
                title: 'Watch TV',
                isCompleted: false,
              ),
              _TimelineItem(
                time: '08:00 PM',
                title: 'Brush teeth',
                isCompleted: false,
              ),
            ]),

            _buildTimelineSection('During the night', []),
            
            const SizedBox(height: 32),
            const Center(
              child: Text(
                'End of activity for today.',
                style: TextStyle(color: Color(0xFF5E5E5E), fontStyle: FontStyle.italic),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineSection(String title, List<_TimelineItem> items) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.access_time_filled, color: Color(0xFFE8A817), size: 18),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: Color(0xFF1E1E1E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.only(left: 26.0),
              child: Text('No tasks scheduled.', style: TextStyle(color: Colors.grey)),
            )
          else
            ...items.map((item) => Padding(
              padding: const EdgeInsets.only(left: 8.0, bottom: 12.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Timeline line & dot
                  Column(
                    children: [
                      Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: item.isCompleted ? const Color(0xFFE8A817) : Colors.grey.shade300,
                          border: item.isCompleted 
                            ? null 
                            : Border.all(color: Colors.grey.shade400, width: 2),
                        ),
                        child: item.isCompleted 
                          ? const Icon(Icons.check, size: 12, color: Colors.white)
                          : null,
                      ),
                      if (item != items.last) // Draw line connecting if not last
                        Container(
                          width: 2,
                          height: 40,
                          color: Colors.grey.shade200,
                          margin: const EdgeInsets.only(top: 4),
                        ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  
                  // Content Card
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: item.isCompleted 
                          ? const Color(0xFFE8A817).withOpacity(0.05) 
                          : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: item.isCompleted 
                            ? const Color(0xFFE8A817).withOpacity(0.3) 
                            : Colors.grey.shade200,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                item.title,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: item.isCompleted ? const Color(0xFF1E1E1E) : Colors.grey.shade600,
                                ),
                              ),
                              if (item.mood != null)
                                Text(item.mood!, style: const TextStyle(fontSize: 18)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.schedule, size: 14, color: Colors.grey.shade500),
                              const SizedBox(width: 4),
                              Text(item.time, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                              if (item.isCompleted) ...[
                                const SizedBox(width: 12),
                                Icon(Icons.check_circle_outline, size: 14, color: Colors.green.shade600),
                                const SizedBox(width: 4),
                                Text('Done at ${item.completedAt}', style: TextStyle(color: Colors.green.shade700, fontSize: 13)),
                              ]
                            ],
                          ),
                        ],
                      ),
                    ),
                  )
                ],
              ),
            )),
        ],
      ),
    );
  }
}

class _TimelineItem {
  final String time;
  final String title;
  final bool isCompleted;
  final String? completedAt;
  final String? mood;

  _TimelineItem({
    required this.time,
    required this.title,
    required this.isCompleted,
    this.completedAt,
    this.mood,
  });
}
