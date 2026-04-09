import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:math' as math;

/// Standardized AI button widget used across all screens
/// Features teal/green gradient with futuristic running border animation
class AIButton extends StatefulWidget {
  final VoidCallback onPressed;
  final String? tooltip;
  final bool isCompact;
  final bool enableAnimation;
  final String? label;

  const AIButton({
    Key? key,
    required this.onPressed,
    this.tooltip = 'AI Assistant',
    this.isCompact = true,
    this.enableAnimation = true,
    this.label,
  }) : super(key: key);

  @override
  State<AIButton> createState() => _AIButtonState();
}

class _AIButtonState extends State<AIButton> with TickerProviderStateMixin {
  late AnimationController _borderController;
  late Animation<double> _borderAnimation;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _isPressed = false;
  bool _isAnimationActive = true;

  @override
  void initState() {
    super.initState();

    // Border running animation
    _borderController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    _borderAnimation = CurvedAnimation(
      parent: _borderController,
      curve: Curves.linear,
    );

    // Icon pulse animation
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _pulseAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    if (widget.enableAnimation) {
      _startAnimationCycle();
    }
  }

  void _startAnimationCycle() {
    if (!mounted) return;
    setState(() => _isAnimationActive = true);
    _borderController.repeat();
    _pulseController.repeat(reverse: true);

    // Run for 30 seconds, then pause for 30 seconds
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted && widget.enableAnimation) {
        _pauseAnimation();
      }
    });
  }

  void _pauseAnimation() {
    if (!mounted) return;
    setState(() => _isAnimationActive = false);
    _borderController.stop();
    _pulseController.stop();

    // Pause for 30 seconds, then restart
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted && widget.enableAnimation) {
        _startAnimationCycle();
      }
    });
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
      message: widget.tooltip ?? '',
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          widget.onPressed();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.92 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: widget.enableAnimation && _isAnimationActive
              ? AnimatedBuilder(
                  animation: Listenable.merge([_borderAnimation, _pulseAnimation]),
                  builder: (context, child) => _buildAnimatedButton(),
                )
              : _buildStaticButton(),
        ),
      ),
    );
  }

  Widget _buildAnimatedButton() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        // Running border gradient effect
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
        padding: EdgeInsets.symmetric(
          horizontal: widget.isCompact ? 8 : 14,
          vertical: widget.isCompact ? 4 : 7,
        ),
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
              scale: _isAnimationActive ? _pulseAnimation.value : 1.0,
              child: Icon(
                Icons.auto_awesome,
                size: widget.isCompact ? 14 : 18,
                color: Colors.white,
                shadows: _isAnimationActive
                    ? [
                        Shadow(
                          color: Colors.cyan.shade300.withOpacity(0.9),
                          blurRadius: 6 + (_pulseAnimation.value * 6),
                        ),
                      ]
                    : null,
              ),
            ),
            const SizedBox(width: 6),
            // Text with subtle glow effect
            Text(
              widget.label ?? 'common.ask_ai'.tr(),
              style: TextStyle(
                fontSize: widget.isCompact ? 12 : 14,
                color: Colors.white,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                shadows: _isAnimationActive
                    ? [
                        Shadow(
                          color: Colors.cyan.shade200.withOpacity(0.8),
                          blurRadius: 4 + (_pulseAnimation.value * 4),
                        ),
                      ]
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStaticButton() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Colors.teal.withOpacity(0.5),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.teal.withOpacity(0.3),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: widget.isCompact ? 8 : 14,
          vertical: widget.isCompact ? 4 : 7,
        ),
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
            Icon(
              Icons.auto_awesome,
              size: widget.isCompact ? 14 : 18,
              color: Colors.white,
            ),
            const SizedBox(width: 6),
            Text(
              widget.label ?? 'common.ask_ai'.tr(),
              style: TextStyle(
                fontSize: widget.isCompact ? 12 : 14,
                color: Colors.white,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A simpler version without animations for performance-critical areas
class AIButtonSimple extends StatelessWidget {
  final VoidCallback onPressed;
  final String? tooltip;
  final bool isCompact;

  const AIButtonSimple({
    Key? key,
    required this.onPressed,
    this.tooltip = 'AI Assistant',
    this.isCompact = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip ?? '',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: isCompact ? 12 : 16,
              vertical: isCompact ? 7 : 10,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.teal.shade600,
                  Colors.teal.shade500,
                  Colors.green.shade500,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.teal.withOpacity(0.4),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.auto_awesome,
                  size: isCompact ? 14 : 18,
                  color: Colors.white,
                ),
                const SizedBox(width: 6),
                Text(
                  'common.ask_ai'.tr(),
                  style: TextStyle(
                    fontSize: isCompact ? 11 : 13,
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
