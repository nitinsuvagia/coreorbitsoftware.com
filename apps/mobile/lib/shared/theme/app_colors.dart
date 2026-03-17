import 'package:flutter/material.dart';

/// Central color palette for the Employee app.
class AppColors {
  AppColors._();

  // ── Brand ─────────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF2563EB); // Blue-600
  static const Color primaryDark = Color(0xFF1D4ED8); // Blue-700
  static const Color primaryLight = Color(0xFFDBEAFE); // Blue-100

  // ── Status colors (attendance) ────────────────────────────────────────────
  static const Color present = Color(0xFF059669); // Emerald-600
  static const Color presentLight = Color(0xFFD1FAE5); // Emerald-100
  static const Color absent = Color(0xFFDC2626); // Red-600
  static const Color absentLight = Color(0xFFFEE2E2); // Red-100
  static const Color leave = Color(0xFF0EA5E9); // Sky-500
  static const Color leaveLight = Color(0xFFE0F2FE); // Sky-100
  static const Color halfDay = Color(0xFFF59E0B); // Amber-500
  static const Color halfDayLight = Color(0xFFFEF3C7); // Amber-100
  static const Color holiday = Color(0xFF7C3AED); // Violet-600
  static const Color holidayLight = Color(0xFFEDE9FE); // Violet-100

  // ── Task priority colors ──────────────────────────────────────────────────
  static const Color priorityHighest = Color(0xFFDC2626);
  static const Color priorityHigh = Color(0xFFF97316);
  static const Color priorityMedium = Color(0xFFF59E0B);
  static const Color priorityLow = Color(0xFF3B82F6);
  static const Color priorityLowest = Color(0xFF94A3B8);

  // ── Leave status ──────────────────────────────────────────────────────────
  static const Color pending = Color(0xFFF59E0B);
  static const Color approved = Color(0xFF059669);
  static const Color rejected = Color(0xFFDC2626);
  static const Color cancelled = Color(0xFF94A3B8);

  // ── Surface ───────────────────────────────────────────────────────────────
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  static const Color card = Color(0xFFFFFFFF);

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textDisabled = Color(0xFFCBD5E1);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // ── Borders / Dividers ────────────────────────────────────────────────────
  static const Color divider = Color(0xFFE2E8F0);
  static const Color border = Color(0xFFCBD5E1);

  // ── Shadows ───────────────────────────────────────────────────────────────
  static const Color cardShadow = Color(0x14000000);

  // ── Dark theme ────────────────────────────────────────────────────────────
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkSurfaceVariant = Color(0xFF334155);
  static const Color darkDivider = Color(0xFF334155);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFF94A3B8);

  // ── Helpers ───────────────────────────────────────────────────────────────
  static Color attendanceStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return present;
      case 'absent':
        return absent;
      case 'on_leave':
        return leave;
      case 'half_day':
        return halfDay;
      case 'holiday':
      case 'weekend':
        return holiday;
      default:
        return textDisabled;
    }
  }

  static Color attendanceStatusBg(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return presentLight;
      case 'absent':
        return absentLight;
      case 'on_leave':
        return leaveLight;
      case 'half_day':
        return halfDayLight;
      case 'holiday':
      case 'weekend':
        return holidayLight;
      default:
        return surfaceVariant;
    }
  }

  static Color priorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'highest':
        return priorityHighest;
      case 'high':
        return priorityHigh;
      case 'medium':
        return priorityMedium;
      case 'low':
        return priorityLow;
      case 'lowest':
        return priorityLowest;
      default:
        return priorityMedium;
    }
  }

  static Color leaveStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return pending;
      case 'approved':
        return approved;
      case 'rejected':
        return rejected;
      case 'cancelled':
        return cancelled;
      default:
        return textDisabled;
    }
  }
}
