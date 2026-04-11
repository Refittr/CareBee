import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import '../auth/providers/auth_provider.dart';
import 'providers/achiever_list_provider.dart';

// Provider that fetches the supporter's profile from the DB
final supporterProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  final result = await Supabase.instance.client
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', user.id)
      .maybeSingle();
  return result;
});

class SupporterProfileScreen extends ConsumerStatefulWidget {
  const SupporterProfileScreen({super.key});

  @override
  ConsumerState<SupporterProfileScreen> createState() => _SupporterProfileScreenState();
}

class _SupporterProfileScreenState extends ConsumerState<SupporterProfileScreen> {
  final _nameController = TextEditingController();
  bool _isSaving = false;
  bool _isUploading = false;
  String? _avatarUrl;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512);
    if (picked == null) return;

    setState(() => _isUploading = true);

    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      final bytes = await File(picked.path).readAsBytes();
      final ext = picked.path.split('.').last;
      final filePath = '${user.id}/avatar.$ext';

      await Supabase.instance.client.storage
          .from('avatars')
          .uploadBinary(filePath, bytes, fileOptions: const FileOptions(upsert: true));

      final publicUrl = Supabase.instance.client.storage
          .from('avatars')
          .getPublicUrl(filePath);

      await Supabase.instance.client
          .from('profiles')
          .update({'avatar_url': publicUrl})
          .eq('id', user.id);

      setState(() => _avatarUrl = publicUrl);
      ref.invalidate(supporterProfileProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _saveName() async {
    if (_nameController.text.trim().isEmpty) return;
    setState(() => _isSaving = true);

    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      await Supabase.instance.client
          .from('profiles')
          .update({'full_name': _nameController.text.trim()})
          .eq('id', user.id);

      ref.invalidate(supporterProfileProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Name saved!'), backgroundColor: Color(0xFF4CAF50)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _unlinkDevice(String pairingId, String deviceName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unlink Device'),
        content: Text('Are you sure you want to unlink "$deviceName"? The Achiever will need to re-scan a QR code to link again.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Unlink', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await Supabase.instance.client
          .from('device_pairings')
          .delete()
          .eq('id', pairingId);

      ref.invalidate(linkedAchieversProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$deviceName has been unlinked.'), backgroundColor: const Color(0xFF4CAF50)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to unlink: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(supporterProfileProvider);
    final achieversAsync = ref.watch(linkedAchieversProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Supporter Profile'),
        backgroundColor: const Color(0xFFE8A817),
        foregroundColor: Colors.white,
      ),
      backgroundColor: const Color(0xFFFAF7F2),
      body: SafeArea(
        child: profileAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Error: $err')),
          data: (profile) {
            // Pre-fill text field
            if (_nameController.text.isEmpty && profile?['full_name'] != null) {
              _nameController.text = profile!['full_name'];
            }
            _avatarUrl ??= profile?['avatar_url'];

            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                // Avatar
                Center(
                  child: GestureDetector(
                    onTap: _isUploading ? null : _pickAndUploadAvatar,
                    child: Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        CircleAvatar(
                          radius: 56,
                          backgroundColor: const Color(0xFFE8A817).withOpacity(0.2),
                          backgroundImage: _avatarUrl != null ? NetworkImage(_avatarUrl!) : null,
                          child: _isUploading
                              ? const CircularProgressIndicator()
                              : (_avatarUrl == null
                                  ? const Icon(Icons.person, size: 48, color: Color(0xFFE8A817))
                                  : null),
                        ),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Color(0xFFE8A817),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    profile?['email'] ?? '',
                    style: const TextStyle(fontSize: 14, color: Color(0xFF6B5E54)),
                  ),
                ),
                const SizedBox(height: 32),

                // Name field
                const Text(
                  'Display Name',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF6B5E54)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'This is how the Achiever will see your name in their app.',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          hintText: 'Enter your name',
                          border: OutlineInputBorder(),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Color(0xFFE8A817), width: 2),
                          ),
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3D3530),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: _isSaving ? null : _saveName,
                        child: _isSaving
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Save'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 40),
                const Divider(),
                const SizedBox(height: 16),

                // Linked tablets section
                const Text(
                  'Linked Tablets',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF3D3530)),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Achiever devices paired to your account.',
                  style: TextStyle(fontSize: 14, color: Color(0xFF6B5E54)),
                ),
                const SizedBox(height: 16),

                achieversAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Text('Error: $err'),
                  data: (achievers) {
                    if (achievers.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(
                          child: Text(
                            'No tablets linked yet.',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),
                      );
                    }
                    return Column(
                      children: achievers.map((a) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFFE8A817),
                            child: Icon(Icons.tablet_android, color: Colors.white),
                          ),
                          title: Text(
                            a.achieverName ?? a.deviceName,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: a.achieverName != null ? Text(a.deviceName) : null,
                          trailing: IconButton(
                            icon: const Icon(Icons.link_off, color: Colors.red),
                            tooltip: 'Unlink device',
                            onPressed: () => _unlinkDevice(a.pairingId, a.deviceName),
                          ),
                        ),
                      )).toList(),
                    );
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
