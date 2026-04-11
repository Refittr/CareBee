import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase. Add realistic values via build env later.
  await Supabase.initialize(
    url: 'https://dxwgnnbjmafgcwweuwbf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4d2dubmJqbWFmZ2N3d2V1d2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjU5MTQsImV4cCI6MjA4OTYwMTkxNH0.uVjEMzyv_-AoLf3Pm1yrFeENm82HWV8y0wJz9si6uJY',
  );

  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const BuzzApp(),
    ),
  );
}

// Global provider for SharedPreferences to manage role lock state
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError();
});

class BuzzApp extends ConsumerWidget {
  const BuzzApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'BUZZ by CareBee',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE8A817), // Honey yellow
          primary: const Color(0xFFE8A817),
          secondary: const Color(0xFF90A4AE), // Warmstone/sage hint
        ),
        fontFamily: 'Inter', // Typical Next.js match
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
