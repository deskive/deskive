import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Deskive App Theme
/// Matches the frontend React+Vite color scheme exactly
/// Based on Shadcn/ui design tokens from frontend/src/index.css
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  // ============================================================================
  // PRIMARY COLORS (Matching Frontend index.css)
  // Frontend: --primary: 160.1 84.1% 39.4% (light) / 160.1 84.1% 45.5% (dark)
  // ============================================================================

  /// Primary color - Light mode: #10B981 (Tailwind emerald-500)
  static const Color primaryLight = Color(0xFF10B981);

  /// Primary color - Dark mode: #14B8A6 (Tailwind teal-500)
  static const Color primaryDark = Color(0xFF14B8A6);

  /// Primary foreground - Light mode: #F7F9FC
  static const Color primaryForegroundLight = Color(0xFFF7F9FC);

  /// Primary foreground - Dark mode: #0F172A
  static const Color primaryForegroundDark = Color(0xFF0F172A);

  // ============================================================================
  // GRADIENT COLORS (Matching Frontend .gradient-primary)
  // Frontend: from-emerald-500 to-teal-600
  // ============================================================================

  /// Gradient start color: #10B981 (Tailwind emerald-500)
  static const Color gradientStart = Color(0xFF10B981);

  /// Gradient end color: #0D9488 (Tailwind teal-600)
  static const Color gradientEnd = Color(0xFF0D9488);

  /// Primary gradient (emerald-500 to teal-600)
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [gradientStart, gradientEnd],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  // ============================================================================
  // SECONDARY COLORS
  // ============================================================================

  /// Secondary color - Light mode: #E0F2FE (Light teal)
  static const Color secondaryLight = Color(0xFFE0F2FE);

  /// Secondary color - Dark mode: #1B4947 (Dark teal)
  static const Color secondaryDark = Color(0xFF1B4947);

  /// Secondary foreground - Light mode
  static const Color secondaryForegroundLight = Color(0xFF0F172A);

  /// Secondary foreground - Dark mode
  static const Color secondaryForegroundDark = Color(0xFFF7F9FC);

  // ============================================================================
  // BACKGROUND COLORS
  // ============================================================================

  /// Background - Light mode
  static const Color backgroundLight = Color(0xFFFFFFFF);

  /// Background - Dark mode
  static const Color backgroundDark = Color(0xFF0F172A);

  /// Foreground (text) - Light mode
  static const Color foregroundLight = Color(0xFF0F172A);

  /// Foreground (text) - Dark mode
  static const Color foregroundDark = Color(0xFFF7F9FC);

  // ============================================================================
  // CARD COLORS
  // ============================================================================

  /// Card background - Light mode
  static const Color cardLight = Color(0xFFFFFFFF);

  /// Card background - Dark mode
  static const Color cardDark = Color(0xFF0F172A);

  /// Card foreground - Light mode
  static const Color cardForegroundLight = Color(0xFF0F172A);

  /// Card foreground - Dark mode
  static const Color cardForegroundDark = Color(0xFFF7F9FC);

  // ============================================================================
  // BORDER COLORS
  // ============================================================================

  /// Border color - Light mode: #D1E5F0
  static const Color borderLight = Color(0xFFD1E5F0);

  /// Border color - Dark mode: #1B4947
  static const Color borderDark = Color(0xFF1B4947);

  // ============================================================================
  // INPUT COLORS
  // ============================================================================

  /// Input border - Light mode
  static const Color inputLight = Color(0xFFD1E5F0);

  /// Input border - Dark mode
  static const Color inputDark = Color(0xFF1B4947);

  // ============================================================================
  // MUTED COLORS (for subtle backgrounds)
  // ============================================================================

  /// Muted background - Light mode
  static const Color mutedLight = Color(0xFFF1F5F9);

  /// Muted background - Dark mode
  static const Color mutedDark = Color(0xFF1B4947);

  /// Muted foreground - Light mode
  static const Color mutedForegroundLight = Color(0xFF64748B);

  /// Muted foreground - Dark mode
  static const Color mutedForegroundDark = Color(0xFFB0BACC);

  // ============================================================================
  // ACCENT COLORS
  // ============================================================================

  /// Accent color - Light mode
  static const Color accentLight = Color(0xFFE0F2FE);

  /// Accent color - Dark mode
  static const Color accentDark = Color(0xFF1B4947);

  /// Accent foreground - Light mode
  static const Color accentForegroundLight = Color(0xFF0F172A);

  /// Accent foreground - Dark mode
  static const Color accentForegroundDark = Color(0xFFF7F9FC);

  // ============================================================================
  // DESTRUCTIVE COLORS (Error/Danger)
  // Frontend: --destructive: 0 84.2% 60.2% (light) / 0 62.8% 30.6% (dark)
  // ============================================================================

  /// Destructive color - Light mode: #EF4444 (Red 500)
  static const Color destructiveLight = Color(0xFFEF4444);

  /// Destructive color - Dark mode: #7F1D1D (Dark Red - matching frontend)
  static const Color destructiveDark = Color(0xFF7F1D1D);

  /// Destructive foreground - Light mode: #F7F9FC
  static const Color destructiveForegroundLight = Color(0xFFF7F9FC);

  /// Destructive foreground - Dark mode: #F7F9FC
  static const Color destructiveForegroundDark = Color(0xFFF7F9FC);

  // ============================================================================
  // ADDITIONAL UI COLORS
  // ============================================================================

  /// Success color (Green)
  static const Color successLight = Color(0xFF10B981);
  static const Color successDark = Color(0xFF059669);

  /// Warning color (Orange/Amber)
  static const Color warningLight = Color(0xFFF59E0B);
  static const Color warningDark = Color(0xFFD97706);

  /// Info color (Blue)
  static const Color infoLight = Color(0xFF3B82F6);
  static const Color infoDark = Color(0xFF2563EB);

  // ============================================================================
  // LIGHT THEME
  // ============================================================================

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,

      // Color Scheme
      colorScheme: const ColorScheme.light(
        primary: primaryLight,
        onPrimary: primaryForegroundLight,
        secondary: secondaryLight,
        onSecondary: secondaryForegroundLight,
        error: destructiveLight,
        onError: destructiveForegroundLight,
        surface: cardLight,
        onSurface: foregroundLight,
        surfaceContainerHighest: mutedLight,
        outline: borderLight,
      ),

      // Scaffold
      scaffoldBackgroundColor: backgroundLight,

      // AppBar Theme
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: backgroundLight,
        foregroundColor: foregroundLight,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
      ),

      // Card Theme
      cardTheme: CardThemeData(
        color: cardLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: borderLight, width: 1),
        ),
      ),

      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: backgroundLight,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: inputLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: inputLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryLight, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: destructiveLight),
        ),
      ),

      // Elevated Button Theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryLight,
          foregroundColor: primaryForegroundLight,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),

      // Text Button Theme
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryLight,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),

      // Outlined Button Theme
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: foregroundLight,
          side: const BorderSide(color: borderLight),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),

      // Navigation Bar Theme
      navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        backgroundColor: backgroundLight,
        indicatorColor: primaryLight.withOpacity(0.1),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: primaryLight, size: 24);
          }
          return const IconThemeData(color: mutedForegroundLight, size: 24);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: primaryLight,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            );
          }
          return const TextStyle(
            color: mutedForegroundLight,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          );
        }),
      ),

      // Divider Theme
      dividerTheme: const DividerThemeData(
        color: borderLight,
        thickness: 1,
        space: 1,
      ),

      // Icon Theme
      iconTheme: const IconThemeData(
        color: foregroundLight,
      ),

      // Text Theme
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: foregroundLight),
        displayMedium: TextStyle(color: foregroundLight),
        displaySmall: TextStyle(color: foregroundLight),
        headlineLarge: TextStyle(color: foregroundLight),
        headlineMedium: TextStyle(color: foregroundLight),
        headlineSmall: TextStyle(color: foregroundLight),
        titleLarge: TextStyle(color: foregroundLight),
        titleMedium: TextStyle(color: foregroundLight),
        titleSmall: TextStyle(color: foregroundLight),
        bodyLarge: TextStyle(color: foregroundLight),
        bodyMedium: TextStyle(color: foregroundLight),
        bodySmall: TextStyle(color: mutedForegroundLight),
        labelLarge: TextStyle(color: foregroundLight),
        labelMedium: TextStyle(color: foregroundLight),
        labelSmall: TextStyle(color: mutedForegroundLight),
      ),
    );
  }

  // ============================================================================
  // DARK THEME
  // ============================================================================

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,

      // Color Scheme
      colorScheme: const ColorScheme.dark(
        primary: primaryDark,
        onPrimary: primaryForegroundDark,
        secondary: secondaryDark,
        onSecondary: secondaryForegroundDark,
        error: destructiveDark,
        onError: destructiveForegroundDark,
        surface: cardDark,
        onSurface: foregroundDark,
        surfaceContainerHighest: mutedDark,
        outline: borderDark,
      ),

      // Scaffold
      scaffoldBackgroundColor: backgroundDark,

      // AppBar Theme
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: backgroundDark,
        foregroundColor: foregroundDark,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarIconBrightness: Brightness.light,
        ),
      ),

      // Card Theme
      cardTheme: CardThemeData(
        color: cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: borderDark, width: 1),
        ),
      ),

      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: backgroundDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: inputDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: inputDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryDark, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: destructiveDark),
        ),
      ),

      // Elevated Button Theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryDark,
          foregroundColor: primaryForegroundDark,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),

      // Text Button Theme
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryDark,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),

      // Outlined Button Theme
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: foregroundDark,
          side: const BorderSide(color: borderDark),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),

      // Navigation Bar Theme
      navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        backgroundColor: backgroundDark,
        indicatorColor: primaryDark.withOpacity(0.2),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: primaryDark, size: 24);
          }
          return const IconThemeData(color: mutedForegroundDark, size: 24);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: primaryDark,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            );
          }
          return const TextStyle(
            color: mutedForegroundDark,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          );
        }),
      ),

      // Divider Theme
      dividerTheme: const DividerThemeData(
        color: borderDark,
        thickness: 1,
        space: 1,
      ),

      // Icon Theme
      iconTheme: const IconThemeData(
        color: foregroundDark,
      ),

      // Text Theme
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: foregroundDark),
        displayMedium: TextStyle(color: foregroundDark),
        displaySmall: TextStyle(color: foregroundDark),
        headlineLarge: TextStyle(color: foregroundDark),
        headlineMedium: TextStyle(color: foregroundDark),
        headlineSmall: TextStyle(color: foregroundDark),
        titleLarge: TextStyle(color: foregroundDark),
        titleMedium: TextStyle(color: foregroundDark),
        titleSmall: TextStyle(color: foregroundDark),
        bodyLarge: TextStyle(color: foregroundDark),
        bodyMedium: TextStyle(color: foregroundDark),
        bodySmall: TextStyle(color: mutedForegroundDark),
        labelLarge: TextStyle(color: foregroundDark),
        labelMedium: TextStyle(color: foregroundDark),
        labelSmall: TextStyle(color: mutedForegroundDark),
      ),
    );
  }
}

/// Extension methods to easily access theme colors from BuildContext
extension ThemeExtension on BuildContext {
  /// Get the current ColorScheme
  ColorScheme get colorScheme => Theme.of(this).colorScheme;

  /// Get the current TextTheme
  TextTheme get textTheme => Theme.of(this).textTheme;

  /// Check if current theme is dark mode
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  /// Get primary color
  Color get primaryColor => colorScheme.primary;

  /// Get background color
  Color get backgroundColor => Theme.of(this).scaffoldBackgroundColor;

  /// Get card color
  Color get cardColor => colorScheme.surface;

  /// Get border color
  Color get borderColor => colorScheme.outline;

  /// Get muted background color
  Color get mutedColor => colorScheme.surfaceContainerHighest;

  /// Get muted foreground/text color
  Color get mutedForegroundColor => isDarkMode
      ? AppTheme.mutedForegroundDark
      : AppTheme.mutedForegroundLight;

  /// Get success color
  Color get successColor => isDarkMode
      ? AppTheme.successDark
      : AppTheme.successLight;

  /// Get warning color
  Color get warningColor => isDarkMode
      ? AppTheme.warningDark
      : AppTheme.warningLight;

  /// Get info color
  Color get infoColor => isDarkMode
      ? AppTheme.infoDark
      : AppTheme.infoLight;

  /// Get primary gradient (matching frontend .gradient-primary)
  LinearGradient get primaryGradient => AppTheme.primaryGradient;

  /// Get gradient button decoration (matching frontend .btn-gradient-primary)
  BoxDecoration get gradientButtonDecoration => BoxDecoration(
    gradient: AppTheme.primaryGradient,
    borderRadius: BorderRadius.circular(8),
    boxShadow: [
      BoxShadow(
        color: AppTheme.gradientStart.withValues(alpha: 0.3),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ],
  );

  /// Get gradient button decoration without shadow
  BoxDecoration get gradientButtonDecorationFlat => BoxDecoration(
    gradient: AppTheme.primaryGradient,
    borderRadius: BorderRadius.circular(8),
  );
}
