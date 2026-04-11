import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/auth/hub_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/providers/onboarding_provider.dart';
import '../features/auth/supporter_onboarding_screen.dart';
import '../features/supporter/supporter_dashboard_screen.dart';
import '../features/supporter/routine_management_screen.dart';
import '../features/supporter/create_routine_screen.dart';
import '../features/supporter/daily_overview_screen.dart';
import '../features/supporter/send_nudge_screen.dart';
import '../features/supporter/notification_preferences_screen.dart';
import '../features/supporter/pair_achiever_screen.dart';
import '../features/supporter/supporter_profile_screen.dart';
import '../features/auth/link_device_screen.dart';
import '../features/achiever/achiever_dashboard_screen.dart';
import '../features/achiever/mood_checkin_screen.dart';
import '../features/supporter/providers/routine_provider.dart';
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen(
      (dynamic _) => notifyListeners(),
    );
  }
  late final StreamSubscription<dynamic> _subscription;
  
  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: Supabase.instance.client.auth.currentSession == null ? '/hub' : (Supabase.instance.client.auth.currentSession!.user.isAnonymous ? '/achiever' : '/supporter'),
    refreshListenable: GoRouterRefreshStream(Supabase.instance.client.auth.onAuthStateChange),
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final isAnonymous = session?.user.isAnonymous ?? false;
      
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup' || state.matchedLocation == '/hub';
      
      if (session == null && !isAuthRoute) {
        return '/hub';
      }
      if (session != null && isAuthRoute) {
        return isAnonymous ? '/achiever' : '/supporter';
      }
      
      // Enforce Supporter Onboarding if they are logged in normally (Not Anonymous)
      // Only check on the main /supporter route, not sub-routes
      if (session != null && !isAnonymous && state.matchedLocation == '/supporter') {
        final isBuzzOnboardedAsync = ref.read(onboardingStatusProvider);
        if (isBuzzOnboardedAsync.hasValue) {
          final isBuzzOnboarded = isBuzzOnboardedAsync.value!;
          if (!isBuzzOnboarded) {
             return '/supporter-setup';
          }
        }
      }

      if (session != null && state.matchedLocation == '/') {
        return isAnonymous ? '/achiever' : '/supporter';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/supporter-setup',
        builder: (context, state) => const SupporterOnboardingScreen(),
      ),
      GoRoute(
        path: '/hub',
        builder: (context, state) => const HubScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/link-device',
        builder: (context, state) => const LinkDeviceScreen(),
      ),
      GoRoute(
        path: '/supporter',
        builder: (context, state) => const SupporterDashboardScreen(),
        routes: [
          GoRoute(
            path: 'profile',
            builder: (context, state) => const SupporterProfileScreen(),
          ),
          GoRoute(
            path: 'routines/:achieverId',
            builder: (context, state) {
              final achieverId = state.pathParameters['achieverId']!;
              return RoutineManagementScreen(achieverId: achieverId);
            },
          ),
          GoRoute(
            path: 'create-routine',
            builder: (context, state) {
              final routine = state.extra as Routine?;
              final achieverId = state.uri.queryParameters['achieverId'];
              return CreateRoutineScreen(
                existingRoutine: routine,
                achieverId: achieverId,
              );
            },
          ),
          GoRoute(
            path: 'notifications/:achieverId',
            builder: (context, state) {
              final achieverId = state.pathParameters['achieverId']!;
              return NotificationPreferencesScreen(achieverId: achieverId);
            },
          ),
          GoRoute(
            path: 'nudge/:achieverId',
            builder: (context, state) {
              final achieverId = state.pathParameters['achieverId']!;
              return SendNudgeScreen(achieverId: achieverId);
            },
          ),
          GoRoute(
            path: 'daily-overview',
            builder: (context, state) => const DailyOverviewScreen(),
          ),
          GoRoute(
            path: 'link-achiever',
            builder: (context, state) => const PairAchieverScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/achiever',
        builder: (context, state) => const AchieverDashboardScreen(),
        routes: [
          GoRoute(
            path: 'mood',
            builder: (context, state) => const MoodCheckinScreen(),
          ),
        ],
      ),
    ],
  );
});

