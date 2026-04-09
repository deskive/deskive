import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const OnboardingScreen({
    super.key,
    required this.onComplete,
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  late AnimationController _iconAnimationController;
  late AnimationController _slideAnimationController;

  List<OnboardingPage> get _pages => [
    OnboardingPage(
      icon: Icons.workspace_premium_rounded,
      gradient: const [Color(0xFF6366F1), Color(0xFF8B5CF6)],
      title: 'onboarding.welcome_title'.tr(),
      description: 'onboarding.welcome_description'.tr(),
      iconColor: const Color(0xFF6366F1),
      badge: 'onboarding.welcome_badge'.tr(),
      features: [
        'onboarding.welcome_feature_1'.tr(),
        'onboarding.welcome_feature_2'.tr(),
        'onboarding.welcome_feature_3'.tr(),
      ],
    ),
    OnboardingPage(
      icon: Icons.auto_awesome_rounded,
      gradient: const [Color(0xFFEC4899), Color(0xFFDB2777)],
      title: 'onboarding.ai_assistant_title'.tr(),
      description: 'onboarding.ai_assistant_description'.tr(),
      iconColor: const Color(0xFFEC4899),
      badge: 'onboarding.ai_assistant_badge'.tr(),
      features: [
        'onboarding.ai_assistant_feature_1'.tr(),
        'onboarding.ai_assistant_feature_2'.tr(),
        'onboarding.ai_assistant_feature_3'.tr(),
      ],
    ),
    OnboardingPage(
      icon: Icons.calendar_today_rounded,
      gradient: const [Color(0xFF3B82F6), Color(0xFF2563EB)],
      title: 'onboarding.smart_event_title'.tr(),
      description: 'onboarding.smart_event_description'.tr(),
      iconColor: const Color(0xFF3B82F6),
      badge: 'onboarding.smart_event_badge'.tr(),
      features: [
        'onboarding.smart_event_feature_1'.tr(),
        'onboarding.smart_event_feature_2'.tr(),
        'onboarding.smart_event_feature_3'.tr(),
      ],
    ),
    OnboardingPage(
      icon: Icons.forum_rounded,
      gradient: const [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
      title: 'onboarding.collaboration_title'.tr(),
      description: 'onboarding.collaboration_description'.tr(),
      iconColor: const Color(0xFF8B5CF6),
      badge: 'onboarding.collaboration_badge'.tr(),
      features: [
        'onboarding.collaboration_feature_1'.tr(),
        'onboarding.collaboration_feature_2'.tr(),
        'onboarding.collaboration_feature_3'.tr(),
      ],
    ),
    OnboardingPage(
      icon: Icons.psychology_rounded,
      gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
      title: 'onboarding.productivity_title'.tr(),
      description: 'onboarding.productivity_description'.tr(),
      iconColor: const Color(0xFFF59E0B),
      badge: 'onboarding.productivity_badge'.tr(),
      features: [
        'onboarding.productivity_feature_1'.tr(),
        'onboarding.productivity_feature_2'.tr(),
        'onboarding.productivity_feature_3'.tr(),
      ],
    ),
    OnboardingPage(
      icon: Icons.dashboard_customize_rounded,
      gradient: const [Color(0xFF10B981), Color(0xFF059669)],
      title: 'onboarding.project_title'.tr(),
      description: 'onboarding.project_description'.tr(),
      iconColor: const Color(0xFF10B981),
      badge: 'onboarding.project_badge'.tr(),
      features: [
        'onboarding.project_feature_1'.tr(),
        'onboarding.project_feature_2'.tr(),
        'onboarding.project_feature_3'.tr(),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _iconAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _slideAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _iconAnimationController.forward();
    _slideAnimationController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _iconAnimationController.dispose();
    _slideAnimationController.dispose();
    super.dispose();
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });
    // Reset and replay animations
    _iconAnimationController.reset();
    _slideAnimationController.reset();
    _iconAnimationController.forward();
    _slideAnimationController.forward();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      widget.onComplete();
    }
  }

  void _skip() {
    widget.onComplete();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [Color(0xFF0F172A), Color(0xFF1E293B)]
                : [Color(0xFFF8FAFC), Colors.white],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Skip button
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(width: 80),
                    // Page indicators
                    Row(
                      children: List.generate(
                        _pages.length,
                        (index) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          height: 8,
                          width: _currentPage == index ? 24 : 8,
                          decoration: BoxDecoration(
                            color: _currentPage == index
                                ? _pages[_currentPage].iconColor
                                : Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                    // Skip button
                    TextButton(
                      onPressed: _skip,
                      child: Text(
                        'onboarding.skip'.tr(),
                        style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.grey.shade700,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // PageView
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: _onPageChanged,
                  itemCount: _pages.length,
                  itemBuilder: (context, index) {
                    return _buildPage(_pages[index], isDark);
                  },
                ),
              ),

              // Next/Get Started button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  children: [
                    if (_currentPage > 0)
                      IconButton(
                        onPressed: () {
                          _pageController.previousPage(
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeInOut,
                          );
                        },
                        icon: Icon(
                          Icons.arrow_back_rounded,
                          color: isDark ? Colors.white70 : Colors.grey.shade700,
                        ),
                      ),
                    const Spacer(),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: _pages[_currentPage].gradient,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: _pages[_currentPage].iconColor.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: _nextPage,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 48,
                            vertical: 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _currentPage == _pages.length - 1
                                  ? 'onboarding.get_started'.tr()
                                  : 'onboarding.next'.tr(),
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              color: Colors.white,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPage(OnboardingPage page, bool isDark) {
    // Get screen height to calculate responsive sizes
    final screenHeight = MediaQuery.of(context).size.height;
    final isSmallScreen = screenHeight < 700;
    final isMediumScreen = screenHeight < 800;
    final iconSize = isSmallScreen ? 100.0 : (isMediumScreen ? 120.0 : 140.0);
    final iconInnerSize = isSmallScreen ? 50.0 : (isMediumScreen ? 60.0 : 70.0);
    final titleSize = isSmallScreen ? 24.0 : (isMediumScreen ? 26.0 : 30.0);
    final descriptionSize = isSmallScreen ? 13.0 : 14.0;
    final featureTextSize = isSmallScreen ? 12.0 : 14.0;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: 24,
          vertical: isSmallScreen ? 4 : 8,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animated icon with gradient background and badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                ScaleTransition(
                  scale: CurvedAnimation(
                    parent: _iconAnimationController,
                    curve: Curves.elasticOut,
                  ),
                  child: RotationTransition(
                    turns: Tween<double>(begin: 0.0, end: 1.0).animate(
                      CurvedAnimation(
                        parent: _iconAnimationController,
                        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
                      ),
                    ),
                    child: Container(
                      width: iconSize,
                      height: iconSize,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: page.gradient,
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: page.iconColor.withOpacity(0.4),
                            blurRadius: 40,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                      child: Icon(
                        page.icon,
                        size: iconInnerSize,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                // Badge
                Positioned(
                  right: -10,
                  top: -10,
                  child: FadeTransition(
                    opacity: _iconAnimationController,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Text(
                        page.badge,
                        style: TextStyle(
                          fontSize: isSmallScreen ? 12 : 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            SizedBox(height: isSmallScreen ? 16 : 24),

            // Animated title
            SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.3),
                end: Offset.zero,
              ).animate(
                CurvedAnimation(
                  parent: _slideAnimationController,
                  curve: Curves.easeOut,
                ),
              ),
              child: FadeTransition(
                opacity: _slideAnimationController,
                child: Text(
                  page.title,
                  style: TextStyle(
                    fontSize: titleSize,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.grey.shade900,
                    letterSpacing: -0.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),

            SizedBox(height: isSmallScreen ? 8 : 12),

            // Animated description
            SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.4),
                end: Offset.zero,
              ).animate(
                CurvedAnimation(
                  parent: _slideAnimationController,
                  curve: const Interval(0.1, 1.0, curve: Curves.easeOut),
                ),
              ),
              child: FadeTransition(
                opacity: CurvedAnimation(
                  parent: _slideAnimationController,
                  curve: const Interval(0.1, 1.0),
                ),
                child: Text(
                  page.description,
                  style: TextStyle(
                    fontSize: descriptionSize,
                    height: 1.5,
                    color: isDark ? Colors.white70 : Colors.grey.shade600,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),

            SizedBox(height: isSmallScreen ? 12 : 20),

            // Feature highlights
            SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.5),
                end: Offset.zero,
              ).animate(
                CurvedAnimation(
                  parent: _slideAnimationController,
                  curve: const Interval(0.2, 1.0, curve: Curves.easeOut),
                ),
              ),
              child: FadeTransition(
                opacity: CurvedAnimation(
                  parent: _slideAnimationController,
                  curve: const Interval(0.2, 1.0),
                ),
                child: Container(
                  padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withOpacity(0.05)
                        : page.iconColor.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: page.iconColor.withOpacity(0.2),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: page.features.map((feature) {
                      return Padding(
                        padding: EdgeInsets.symmetric(
                          vertical: isSmallScreen ? 4 : 6,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: page.iconColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                feature,
                                style: TextStyle(
                                  fontSize: featureTextSize,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.grey.shade800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),

            // Add bottom padding to ensure content doesn't touch the navigation
            SizedBox(height: isSmallScreen ? 4 : 8),
          ],
        ),
      ),
    );
  }
}

class OnboardingPage {
  final IconData icon;
  final List<Color> gradient;
  final String title;
  final String description;
  final Color iconColor;
  final String badge;
  final List<String> features;

  OnboardingPage({
    required this.icon,
    required this.gradient,
    required this.title,
    required this.description,
    required this.iconColor,
    required this.badge,
    required this.features,
  });
}
