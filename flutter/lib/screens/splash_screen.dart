import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';

class SplashScreen extends StatefulWidget {
  final Widget nextScreen;
  final Future<void> Function()? onInitialize;

  const SplashScreen({
    super.key,
    required this.nextScreen,
    this.onInitialize,
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    // Hide status bar for splash screen (immersive experience)
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.immersiveSticky,
      overlays: [],
    );

    // Initialize animations
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
      ),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    // Start animation
    _animationController.forward();

    // Initialize and navigate
    _initializeAndNavigate();
  }

  Future<void> _initializeAndNavigate() async {
    // Wait for minimum splash screen duration (for animation)
    final minDuration = Future.delayed(const Duration(milliseconds: 3000));

    // Run initialization if provided
    if (widget.onInitialize != null) {
      await Future.wait([
        minDuration,
        widget.onInitialize!(),
      ]);
    } else {
      await minDuration;
    }

    // Navigate to next screen
    if (mounted) {
      // Restore status bar before navigating
      SystemChrome.setEnabledSystemUIMode(
        SystemUiMode.edgeToEdge,
        overlays: [SystemUiOverlay.top, SystemUiOverlay.bottom],
      );

      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => widget.nextScreen,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            const begin = Offset(1.0, 0.0);
            const end = Offset.zero;
            const curve = Curves.easeInOut;
            var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
            var offsetAnimation = animation.drive(tween);
            return SlideTransition(position: offsetAnimation, child: child);
          },
          transitionDuration: const Duration(milliseconds: 500),
        ),
      );
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
            // Wave background design (top-left corner only)
            CustomPaint(
              size: Size(screenWidth, screenHeight),
              painter: WaveBackgroundPainter(),
            ),

            // Main content area - centered
            Center(
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo WITHOUT circular background - just the logo with glow
                      Container(
                        decoration: BoxDecoration(
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2563EB).withOpacity(0.3),
                              blurRadius: 40,
                              spreadRadius: 8,
                            ),
                            BoxShadow(
                              color: const Color(0xFF3B82F6).withOpacity(0.2),
                              blurRadius: 60,
                              spreadRadius: 15,
                            ),
                          ],
                        ),
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 100,
                          height: 100,
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // App Name with elegant typography
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [
                            Color(0xFF1E40AF),
                            Color(0xFF3B82F6),
                          ],
                        ).createShader(bounds),
                        child: const Text(
                          'Deskive',
                          style: TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: 1.2,
                            height: 1.2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Tagline
                      Text(
                        'splash.tagline'.tr(),
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 50),

                      // Loading indicator with custom styling
                      const SizedBox(
                        width: 36,
                        height: 36,
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Color(0xFF3B82F6),
                          ),
                          strokeWidth: 3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

}

// Custom painter for the wave background design (top-left corner only)
class WaveBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Paint from back to front (lightest to darkest) so all waves are visible

    // Wave 3 - Light Blue (outermost/back layer) - PAINT FIRST
    final lightBluePaint = Paint()
      ..color = const Color(0xFF93C5FD)
      ..style = PaintingStyle.fill;

    final lightBluePath = Path();
    lightBluePath.moveTo(0, 0);
    lightBluePath.lineTo(size.width * 0.65, 0);
    lightBluePath.quadraticBezierTo(
      size.width * 0.52,
      size.height * 0.13,
      size.width * 0.38,
      size.height * 0.20,
    );
    lightBluePath.quadraticBezierTo(
      size.width * 0.20,
      size.height * 0.28,
      0,
      size.height * 0.32,
    );
    lightBluePath.close();
    canvas.drawPath(lightBluePath, lightBluePaint);

    // Wave 2 - Medium Blue (middle layer) - PAINT SECOND
    final mediumBluePaint = Paint()
      ..color = const Color(0xFF60A5FA)
      ..style = PaintingStyle.fill;

    final mediumBluePath = Path();
    mediumBluePath.moveTo(0, 0);
    mediumBluePath.lineTo(size.width * 0.50, 0);
    mediumBluePath.quadraticBezierTo(
      size.width * 0.40,
      size.height * 0.10,
      size.width * 0.28,
      size.height * 0.16,
    );
    mediumBluePath.quadraticBezierTo(
      size.width * 0.14,
      size.height * 0.22,
      0,
      size.height * 0.24,
    );
    mediumBluePath.close();
    canvas.drawPath(mediumBluePath, mediumBluePaint);

    // Wave 1 - Dark Blue (innermost/front layer) - PAINT LAST
    final darkBluePaint = Paint()
      ..color = const Color(0xFF3B82F6)
      ..style = PaintingStyle.fill;

    final darkBluePath = Path();
    darkBluePath.moveTo(0, 0);
    darkBluePath.lineTo(size.width * 0.35, 0);
    darkBluePath.quadraticBezierTo(
      size.width * 0.28,
      size.height * 0.08,
      size.width * 0.18,
      size.height * 0.12,
    );
    darkBluePath.quadraticBezierTo(
      size.width * 0.08,
      size.height * 0.15,
      0,
      size.height * 0.16,
    );
    darkBluePath.close();
    canvas.drawPath(darkBluePath, darkBluePaint);
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
