import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../main.dart';
import '../auth/providers/auth_provider.dart';
import 'providers/achiever_list_provider.dart';
import 'supporter_profile_screen.dart';

class SupporterDashboardScreen extends ConsumerWidget {
  const SupporterDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final linkedAchievers = ref.watch(linkedAchieversProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BUZZ by CareBee'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final prefs = ref.read(sharedPreferencesProvider);
              await prefs.remove('user_role');
              await ref.read(authServiceProvider).signOut();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Profile card
            Consumer(
              builder: (context, ref, child) {
                final profileAsync = ref.watch(supporterProfileProvider);
                final user = ref.watch(currentUserProvider);
                return InkWell(
                  onTap: () => context.push('/supporter/profile'),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        profileAsync.when(
                          data: (profile) {
                            final avatarUrl = profile?['avatar_url'] as String?;
                            return CircleAvatar(
                              backgroundColor: const Color(0xFFE8A817).withOpacity(0.2),
                              radius: 24,
                              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                              child: avatarUrl == null ? const Icon(Icons.person, color: Color(0xFFE8A817)) : null,
                            );
                          },
                          loading: () => CircleAvatar(
                            backgroundColor: const Color(0xFFE8A817).withOpacity(0.2),
                            radius: 24,
                            child: const Icon(Icons.person, color: Color(0xFFE8A817)),
                          ),
                          error: (_, __) => CircleAvatar(
                            backgroundColor: const Color(0xFFE8A817).withOpacity(0.2),
                            radius: 24,
                            child: const Icon(Icons.person, color: Color(0xFFE8A817)),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Supporter Profile',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              profileAsync.when(
                                data: (profile) {
                                  final rawName = profile?['full_name'] as String?;
                                  final email = profile?['email'] as String?;
                                  final hasRealName = rawName != null && rawName.isNotEmpty && rawName != email;
                                  return Text(
                                    hasRealName ? rawName : 'Tap to set your name',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: hasRealName ? const Color(0xFF1E1E1E) : Colors.grey,
                                    ),
                                  );
                                },
                                loading: () => const Text('...', style: TextStyle(fontSize: 16, color: Colors.grey)),
                                error: (_, __) => const Text('Error', style: TextStyle(fontSize: 16, color: Colors.red)),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: Color(0xFF6B5E54)),
                      ],
                    ),
                  ),
                );
              },
            ),

            const Text(
              'Linked Achievers',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // Achiever list or empty state
            linkedAchievers.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Text('Error loading achievers: $err'),
                ),
              ),
              data: (achievers) {
                if (achievers.isEmpty) {
                  return _buildEmptyState(context);
                }
                return Column(
                  children: achievers
                      .map((achiever) => _buildAchieverCard(context, achiever))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/supporter/link-achiever');
        },
        backgroundColor: const Color(0xFF1E1E1E),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.qr_code),
        label: const Text('Link Tablet'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF7F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFE8A817).withOpacity(0.3),
          width: 2,
          strokeAlign: BorderSide.strokeAlignInside,
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.tablet_android,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          const Text(
            'No Achievers linked yet',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF3D3530),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tap the "Link Tablet" button below to pair an Achiever\'s device and start managing their routines.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF6B5E54),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAchieverCard(BuildContext context, LinkedAchiever achiever) {
    final displayName = achiever.achieverName ?? achiever.deviceName;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFE8A817),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: Colors.white24,
                  child: Icon(Icons.tablet_android, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        displayName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      if (achiever.achieverName != null)
                        Text(
                          achiever.deviceName,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.white70,
                          ),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Linked',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          // Action buttons
          ListTile(
            leading: const Icon(Icons.list_alt, color: Color(0xFF3D3530)),
            title: const Text('Edit Routines'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              context.push('/supporter/routines/${achiever.achieverId}');
            },
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),
          ListTile(
            leading: const Icon(Icons.notifications, color: Color(0xFF3D3530)),
            title: const Text('Notification Preferences'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              context.push('/supporter/notifications/${achiever.achieverId}');
            },
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),
          ListTile(
            leading: const Icon(Icons.message, color: Color(0xFF3D3530)),
            title: const Text('Send a Nudge'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              context.push('/supporter/nudge/${achiever.achieverId}');
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
