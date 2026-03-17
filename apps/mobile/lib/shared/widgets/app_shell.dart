import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../navigation/app_router.dart';
import '../theme/app_colors.dart';

/// Persistent bottom-navigation shell with 4 tabs.
class AppShell extends StatelessWidget {
  final String location;
  final Widget child;

  const AppShell({super.key, required this.location, required this.child});

  int get _selectedIndex {
    if (location.startsWith(AppRoutes.attendance)) return 0;
    if (location.startsWith(AppRoutes.tasks)) return 1;
    if (location.startsWith(AppRoutes.leave)) return 2;
    if (location.startsWith(AppRoutes.profile)) return 3;
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    const routes = [
      AppRoutes.attendance,
      AppRoutes.tasks,
      AppRoutes.leave,
      AppRoutes.profile,
    ];
    context.go(routes[index]);
  }

  @override
  Widget build(BuildContext context) {
    final sel = _selectedIndex;
    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(
        selectedIndex: sel,
        onTap: (i) => _onTap(context, i),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  Bottom navigation bar  (4 tabs – no Review)
// ─────────────────────────────────────────────────────────────

class _BottomNav extends StatelessWidget {
  final int selectedIndex;
  final void Function(int) onTap;

  const _BottomNav({required this.selectedIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              // Tab 0 – Home / Attendance
              _NavItem(
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: 'Home',
                selected: selectedIndex == 0,
                onTap: () => onTap(0),
              ),
              // Tab 1 – Tasks
              _NavItem(
                icon: Icons.check_circle_outline_rounded,
                activeIcon: Icons.check_circle_rounded,
                label: 'Tasks',
                selected: selectedIndex == 1,
                onTap: () => onTap(1),
              ),
              // Tab 2 – Leave
              _NavItem(
                icon: Icons.beach_access_outlined,
                activeIcon: Icons.beach_access_rounded,
                label: 'Leave',
                selected: selectedIndex == 2,
                onTap: () => onTap(2),
              ),
              // Tab 3 – Profile
              _NavItem(
                icon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
                label: 'Profile',
                selected: selectedIndex == 3,
                onTap: () => onTap(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : const Color(0xFF9CA3AF);
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Active indicator line above icon
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: selected ? 24 : 0,
              height: 3,
              margin: const EdgeInsets.only(bottom: 4),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Icon(
              selected ? activeIcon : icon,
              color: color,
              size: 24,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight:
                    selected ? FontWeight.w600 : FontWeight.w400,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
