import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/attendance/presentation/home_screen.dart';
import '../../features/attendance_review/presentation/review_screen.dart';
import '../../features/leave/presentation/leave_screen.dart';
import '../../features/tasks/presentation/tasks_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../widgets/app_shell.dart';

// ── Route names ────────────────────────────────────────────────────────────

class AppRoutes {
  AppRoutes._();
  static const splash = '/';
  static const login = '/login';
  static const home = '/home';
  static const attendance = '/home/attendance';
  static const review = '/home/review';
  static const leave = '/home/leave';
  static const tasks = '/home/tasks';
  static const profile = '/home/profile';
}

// ── Router provider ────────────────────────────────────────────────────────

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: AppRoutes.home,
    redirect: (context, state) {
      final status = authState.status;

      if (status == AuthStatus.initializing) return null; // show nothing yet

      final isOnLogin = state.matchedLocation.startsWith(AppRoutes.login);
      final isAuth = status == AuthStatus.authenticated;

      if (!isAuth && !isOnLogin) return AppRoutes.login;
      if (isAuth && isOnLogin) return AppRoutes.attendance;
      return null;
    },
    routes: [
      // ── Unauthenticated ─────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.login,
        builder: (_, __) => const LoginScreen(),
      ),

      // ── Authenticated shell ──────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: AppRoutes.attendance,
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path: AppRoutes.review,
            builder: (_, __) => const ReviewScreen(),
          ),
          GoRoute(
            path: AppRoutes.leave,
            builder: (_, __) => const LeaveScreen(),
          ),
          GoRoute(
            path: AppRoutes.tasks,
            builder: (_, __) => const TasksScreen(),
          ),
          GoRoute(
            path: AppRoutes.profile,
            builder: (_, __) => const ProfileScreen(),
          ),
          // Redirect bare /home to attendance tab
          GoRoute(
            path: AppRoutes.home,
            redirect: (_, __) => AppRoutes.attendance,
          ),
        ],
      ),
    ],

    // Show a blank screen while initializing (avoids flash)
    errorBuilder: (context, state) => const Scaffold(),
  );
});
