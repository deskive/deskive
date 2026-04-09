import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:math' as math;

/// AI Description Button Widget for event screens
/// Features teal/green gradient with animated visual effects (matching AIButton)
class AIDescriptionButton extends StatefulWidget {
  final VoidCallback onPressed;
  final bool isLoading;
  final String? tooltip;

  const AIDescriptionButton({
    Key? key,
    required this.onPressed,
    this.isLoading = false,
    this.tooltip,
  }) : super(key: key);

  @override
  State<AIDescriptionButton> createState() => _AIDescriptionButtonState();
}

class _AIDescriptionButtonState extends State<AIDescriptionButton>
    with TickerProviderStateMixin {
  late AnimationController _borderController;
  late AnimationController _pulseController;
  late Animation<double> _borderAnimation;
  late Animation<double> _pulseAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();

    // Border running animation
    _borderController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _borderAnimation = CurvedAnimation(
      parent: _borderController,
      curve: Curves.linear,
    );
    _borderController.repeat();

    // Pulse animation for icon
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _borderController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: widget.tooltip ?? 'projects.generate_ai_description'.tr(),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          if (!widget.isLoading) widget.onPressed();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.92 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: AnimatedBuilder(
            animation: Listenable.merge([_borderAnimation, _pulseAnimation]),
            builder: (context, child) => _buildButton(),
          ),
        ),
      ),
    );
  }

  Widget _buildButton() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        // Running border gradient effect (teal/cyan/green)
        gradient: SweepGradient(
          center: Alignment.center,
          startAngle: 0,
          endAngle: math.pi * 2,
          transform: GradientRotation(_borderAnimation.value * math.pi * 2),
          colors: [
            Colors.teal.shade500,
            Colors.teal.shade400,
            Colors.cyan.shade400,
            Colors.green.shade400,
            Colors.green.shade500,
            Colors.teal.shade500,
          ],
          stops: const [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.teal.shade800.withOpacity(0.7),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(2), // Border thickness
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.teal.shade700,
              Colors.teal.shade600,
              Colors.green.shade600,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Pulsing icon
            Transform.scale(
              scale: _pulseAnimation.value,
              child: Icon(
                Icons.auto_awesome,
                size: 14,
                color: Colors.white,
                shadows: [
                  Shadow(
                    color: Colors.cyan.shade300.withOpacity(0.9),
                    blurRadius: 6 + (_pulseAnimation.value * 6),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 5),
            // AI text with glow effect
            Text(
              'calendar.ai_btn'.tr(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                color: Colors.white,
                shadows: [
                  Shadow(
                    color: Colors.cyan.shade200.withOpacity(0.8),
                    blurRadius: 4 + (_pulseAnimation.value * 4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
