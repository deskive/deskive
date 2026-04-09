import 'dart:io';

/// Subscription plan types for Deskive
enum SubscriptionPlanType {
  free,
  starter,
  professional,
  enterprise,
}

/// Billing period options
enum BillingPeriod {
  monthly,
  yearly,
}

/// Product IDs for App Store and Google Play
/// These must match exactly what you configure in App Store Connect and Google Play Console
/// Note: Product IDs must be unique across ALL apps in your developer account
class ProductIds {
  // iOS Product IDs (App Store Connect) - prefixed with 'deskive_'
  static const String iosStarterMonthly = 'deskive_starter_monthly';
  static const String iosStarterYearly = 'deskive_starter_yearly';
  static const String iosProfessionalMonthly = 'deskive_professional_monthly';
  static const String iosProfessionalYearly = 'deskive_professional_yearly';
  static const String iosEnterpriseMonthly = 'deskive_enterprise_monthly';
  static const String iosEnterpriseYearly = 'deskive_enterprise_yearly';

  // Android Product IDs (Google Play Console) - prefixed with 'deskive_'
  static const String androidStarterMonthly = 'deskive_starter_monthly';
  static const String androidStarterYearly = 'deskive_starter_yearly';
  static const String androidProfessionalMonthly = 'deskive_professional_monthly';
  static const String androidProfessionalYearly = 'deskive_professional_yearly';
  static const String androidEnterpriseMonthly = 'deskive_enterprise_monthly';
  static const String androidEnterpriseYearly = 'deskive_enterprise_yearly';

  // All iOS product IDs
  static Set<String> get allIOS => {
        iosStarterMonthly,
        iosStarterYearly,
        iosProfessionalMonthly,
        iosProfessionalYearly,
        iosEnterpriseMonthly,
        iosEnterpriseYearly,
      };

  // All Android product IDs
  static Set<String> get allAndroid => {
        androidStarterMonthly,
        androidStarterYearly,
        androidProfessionalMonthly,
        androidProfessionalYearly,
        androidEnterpriseMonthly,
        androidEnterpriseYearly,
      };

  // Get all product IDs for current platform
  static Set<String> get all => Platform.isIOS ? allIOS : allAndroid;

  /// Get product ID for a specific plan and period
  static String getProductId(SubscriptionPlanType planType, BillingPeriod period) {
    final isIOS = Platform.isIOS;

    switch (planType) {
      case SubscriptionPlanType.starter:
        return period == BillingPeriod.monthly
            ? (isIOS ? iosStarterMonthly : androidStarterMonthly)
            : (isIOS ? iosStarterYearly : androidStarterYearly);
      case SubscriptionPlanType.professional:
        return period == BillingPeriod.monthly
            ? (isIOS ? iosProfessionalMonthly : androidProfessionalMonthly)
            : (isIOS ? iosProfessionalYearly : androidProfessionalYearly);
      case SubscriptionPlanType.enterprise:
        return period == BillingPeriod.monthly
            ? (isIOS ? iosEnterpriseMonthly : androidEnterpriseMonthly)
            : (isIOS ? iosEnterpriseYearly : androidEnterpriseYearly);
      case SubscriptionPlanType.free:
        throw ArgumentError('Free plan does not have a product ID');
    }
  }

  /// Get plan type from product ID
  static SubscriptionPlanType? getPlanTypeFromProductId(String productId) {
    final id = productId.toLowerCase();
    if (id.contains('starter')) return SubscriptionPlanType.starter;
    if (id.contains('professional')) return SubscriptionPlanType.professional;
    if (id.contains('enterprise')) return SubscriptionPlanType.enterprise;
    return null;
  }

  /// Get billing period from product ID
  static BillingPeriod? getBillingPeriodFromProductId(String productId) {
    final id = productId.toLowerCase();
    if (id.contains('yearly') || id.contains('annual')) return BillingPeriod.yearly;
    if (id.contains('monthly')) return BillingPeriod.monthly;
    return null;
  }
}

/// Subscription plan details
class SubscriptionPlan {
  final SubscriptionPlanType type;
  final String name;
  final String description;
  final double monthlyPrice;
  final double yearlyPrice;
  final int maxMembers;
  final double maxStorageGb;
  final List<String> features;
  final bool isPopular;

  const SubscriptionPlan({
    required this.type,
    required this.name,
    required this.description,
    required this.monthlyPrice,
    required this.yearlyPrice,
    required this.maxMembers,
    required this.maxStorageGb,
    required this.features,
    this.isPopular = false,
  });

  /// Get yearly savings percentage
  int get yearlySavingsPercent {
    if (monthlyPrice == 0) return 0;
    final yearlyMonthly = monthlyPrice * 12;
    final savings = ((yearlyMonthly - yearlyPrice) / yearlyMonthly * 100).round();
    return savings;
  }

  /// Get price for a billing period
  double getPrice(BillingPeriod period) {
    return period == BillingPeriod.monthly ? monthlyPrice : yearlyPrice;
  }

  /// Get formatted price string
  String getFormattedPrice(BillingPeriod period) {
    final price = getPrice(period);
    if (price == 0) return 'Free';
    return '\$${price.toStringAsFixed(2)}/${period == BillingPeriod.monthly ? 'mo' : 'yr'}';
  }
}

/// All available subscription plans for Deskive
class SubscriptionPlans {
  static const SubscriptionPlan free = SubscriptionPlan(
    type: SubscriptionPlanType.free,
    name: 'Free',
    description: 'Perfect for individuals and small teams getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxMembers: 5,
    maxStorageGb: 0.5,
    features: [
      '5 team members',
      '512 MB storage',
      'Basic chat & messaging',
      'Basic file sharing',
      'Mobile app access',
      'Community support',
      'Basic integrations',
      '2FA authentication',
    ],
  );

  static const SubscriptionPlan starter = SubscriptionPlan(
    type: SubscriptionPlanType.starter,
    name: 'Starter',
    description: 'Ideal for growing teams that need more power',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    maxMembers: 25,
    maxStorageGb: 25,
    features: [
      '25 team members',
      '25 GB storage',
      'Advanced chat with threads',
      'Video calls (up to 10 participants)',
      'Project management tools',
      'Calendar integration',
      'Basic analytics',
      'Data export (CSV)',
      'Guest access',
    ],
  );

  static const SubscriptionPlan professional = SubscriptionPlan(
    type: SubscriptionPlanType.professional,
    name: 'Professional',
    description: 'Complete solution for professional teams',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    maxMembers: 100,
    maxStorageGb: 100,
    features: [
      '100 team members',
      '100 GB storage',
      'Video calls (up to 50 participants)',
      'AI-powered features',
      'Advanced analytics & reporting',
      'Priority support',
      '99.9% uptime SLA',
      'Advanced security features',
      'Resource management',
    ],
    isPopular: true,
  );

  static const SubscriptionPlan enterprise = SubscriptionPlan(
    type: SubscriptionPlanType.enterprise,
    name: 'Enterprise',
    description: 'Tailored solutions for large organizations',
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    maxMembers: -1, // Unlimited
    maxStorageGb: 1000,
    features: [
      'Unlimited team members',
      '1 TB+ storage',
      'Unlimited video calls',
      'Enterprise SSO (SAML, OAuth)',
      'Advanced security & compliance',
      'Dedicated account manager',
      '24/7 phone support',
      'Custom contracts & SLA',
    ],
  );

  static List<SubscriptionPlan> get all => [free, starter, professional, enterprise];

  static List<SubscriptionPlan> get paid => [starter, professional, enterprise];

  static SubscriptionPlan getByType(SubscriptionPlanType type) {
    switch (type) {
      case SubscriptionPlanType.free:
        return free;
      case SubscriptionPlanType.starter:
        return starter;
      case SubscriptionPlanType.professional:
        return professional;
      case SubscriptionPlanType.enterprise:
        return enterprise;
    }
  }

  static SubscriptionPlan? getByName(String name) {
    final lowerName = name.toLowerCase();
    for (final plan in all) {
      if (plan.name.toLowerCase() == lowerName || plan.type.name.toLowerCase() == lowerName) {
        return plan;
      }
    }
    return null;
  }
}
