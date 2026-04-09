import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Collapsible trigger button for opening the suggestion bottom sheet
class SuggestionTrigger extends StatefulWidget {
  final VoidCallback onTap;
  final int smartSuggestionCount;
  final bool initiallyCollapsed;
  final Function(bool isCollapsed)? onCollapseChanged;

  const SuggestionTrigger({
    super.key,
    required this.onTap,
    this.smartSuggestionCount = 0,
    this.initiallyCollapsed = false,
    this.onCollapseChanged,
  });

  @override
  State<SuggestionTrigger> createState() => _SuggestionTriggerState();
}

class _SuggestionTriggerState extends State<SuggestionTrigger>
    with SingleTickerProviderStateMixin {
  static const String _collapsedKey = 'autopilot_suggestion_trigger_collapsed';

  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isCollapsed = false;

  @override
  void initState() {
    super.initState();
    _isCollapsed = widget.initiallyCollapsed;
    _loadCollapsedState();

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadCollapsedState() async {
    final prefs = await SharedPreferences.getInstance();
    final collapsed = prefs.getBool(_collapsedKey) ?? false;
    if (mounted && collapsed != _isCollapsed) {
      setState(() => _isCollapsed = collapsed);
    }
  }

  Future<void> _saveCollapsedState(bool collapsed) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_collapsedKey, collapsed);
  }

  void _toggleCollapse() {
    setState(() {
      _isCollapsed = !_isCollapsed;
    });
    _saveCollapsedState(_isCollapsed);
    widget.onCollapseChanged?.call(_isCollapsed);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isCollapsed) {
      return _buildCollapsedTrigger(isDark);
    }

    return _buildExpandedTrigger(isDark);
  }

  Widget _buildCollapsedTrigger(bool isDark) {
    return GestureDetector(
      onTap: widget.onTap,
      onLongPress: _toggleCollapse,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.teal.shade500, Colors.green.shade500],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.teal.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              const Center(
                child: Icon(
                  Icons.auto_awesome,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              if (widget.smartSuggestionCount > 0)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                        width: 2,
                      ),
                    ),
                    child: Text(
                      widget.smartSuggestionCount > 9
                          ? '9+'
                          : '${widget.smartSuggestionCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExpandedTrigger(bool isDark) {
    return GestureDetector(
      onTap: widget.onTap,
      onLongPress: _toggleCollapse,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.teal.shade500, Colors.green.shade500],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.teal.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.auto_awesome,
                color: Colors.white,
                size: 16,
              ),
              const SizedBox(width: 6),
              const Text(
                'Quick Actions',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (widget.smartSuggestionCount > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${widget.smartSuggestionCount}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
              const SizedBox(width: 4),
              const Icon(
                Icons.keyboard_arrow_down,
                color: Colors.white,
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
