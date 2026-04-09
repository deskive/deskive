import 'package:flutter/foundation.dart';
import 'base_dao_impl.dart';

/// Response wrapper for billing operations
class BillingResponse<T> {
  final bool success;
  final String? message;
  final T? data;

  BillingResponse({
    required this.success,
    this.message,
    this.data,
  });
}

/// Subscription model from backend
class Subscription {
  final String id;
  final String workspaceId;
  final String plan;
  final String? interval;
  final String status;
  final String? currentPeriodStart;
  final String? currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final String? stripeCustomerId;
  final String? stripeSubscriptionId;
  final String? source; // 'stripe', 'apple', 'google'
  final String? appleProductId;
  final String? appleTransactionId;
  final String? googleProductId;
  final String? googlePurchaseToken;

  Subscription({
    required this.id,
    required this.workspaceId,
    required this.plan,
    this.interval,
    required this.status,
    this.currentPeriodStart,
    this.currentPeriodEnd,
    this.cancelAtPeriodEnd = false,
    this.stripeCustomerId,
    this.stripeSubscriptionId,
    this.source,
    this.appleProductId,
    this.appleTransactionId,
    this.googleProductId,
    this.googlePurchaseToken,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id']?.toString() ?? '',
      workspaceId: json['workspaceId']?.toString() ?? json['workspace_id']?.toString() ?? '',
      plan: json['plan']?.toString() ?? 'free',
      interval: json['interval']?.toString(),
      status: json['status']?.toString() ?? 'active',
      currentPeriodStart: json['currentPeriodStart']?.toString() ?? json['current_period_start']?.toString(),
      currentPeriodEnd: json['currentPeriodEnd']?.toString() ?? json['current_period_end']?.toString(),
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] ?? json['cancel_at_period_end'] ?? false,
      stripeCustomerId: json['stripeCustomerId']?.toString() ?? json['stripe_customer_id']?.toString(),
      stripeSubscriptionId: json['stripeSubscriptionId']?.toString() ?? json['stripe_subscription_id']?.toString(),
      source: json['source']?.toString(),
      appleProductId: json['appleProductId']?.toString() ?? json['apple_product_id']?.toString(),
      appleTransactionId: json['appleTransactionId']?.toString() ?? json['apple_transaction_id']?.toString(),
      googleProductId: json['googleProductId']?.toString() ?? json['google_product_id']?.toString(),
      googlePurchaseToken: json['googlePurchaseToken']?.toString() ?? json['google_purchase_token']?.toString(),
    );
  }

  bool get isIAPSubscription => source == 'apple' || source == 'google';
  bool get isStripeSubscription => source == 'stripe' || source == null;
  String get sourceName {
    switch (source) {
      case 'apple':
        return 'App Store';
      case 'google':
        return 'Google Play';
      case 'stripe':
        return 'Web';
      default:
        return 'Unknown';
    }
  }
}

/// Subscription plan model
class SubscriptionPlanInfo {
  final String id;
  final String name;
  final String description;
  final int price; // in cents
  final int yearlyPrice; // in cents
  final String currency;
  final String interval;
  final List<String> features;
  final Map<String, dynamic> limits;
  final String? stripePriceId;
  final String? stripePriceIdYearly;
  final bool isPopular;

  SubscriptionPlanInfo({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.yearlyPrice,
    required this.currency,
    required this.interval,
    required this.features,
    required this.limits,
    this.stripePriceId,
    this.stripePriceIdYearly,
    this.isPopular = false,
  });

  factory SubscriptionPlanInfo.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlanInfo(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: json['price'] ?? 0,
      yearlyPrice: json['yearlyPrice'] ?? json['yearly_price'] ?? 0,
      currency: json['currency']?.toString() ?? 'usd',
      interval: json['interval']?.toString() ?? 'month',
      features: List<String>.from(json['features'] ?? []),
      limits: Map<String, dynamic>.from(json['limits'] ?? {}),
      stripePriceId: json['stripePriceId']?.toString() ?? json['stripe_price_id']?.toString(),
      stripePriceIdYearly: json['stripePriceIdYearly']?.toString() ?? json['stripe_price_id_yearly']?.toString(),
      isPopular: json['isPopular'] ?? json['is_popular'] ?? false,
    );
  }

  double get priceInDollars => price / 100;
  double get yearlyPriceInDollars => yearlyPrice / 100;
}

/// Billing DAO for handling billing and IAP operations
class BillingDao extends BaseDaoImpl {
  BillingDao() : super(baseEndpoint: '/workspaces');

  /// Get subscription for a workspace
  Future<BillingResponse<Subscription>> getSubscription(String workspaceId) async {
    try {
      final response = await get<Map<String, dynamic>>('$workspaceId/billing/subscription');
      return BillingResponse(
        success: true,
        data: Subscription.fromJson(response),
      );
    } catch (e) {
      debugPrint('BillingDao: Failed to get subscription: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to get subscription: $e',
      );
    }
  }

  /// Get available subscription plans
  Future<BillingResponse<List<SubscriptionPlanInfo>>> getPlans() async {
    try {
      // Plans endpoint doesn't require workspaceId, use any workspace
      final response = await getDirect<Map<String, dynamic>>('/workspaces/default/billing/plans');
      final plans = (response['plans'] as List?)
          ?.map((p) => SubscriptionPlanInfo.fromJson(p as Map<String, dynamic>))
          .toList() ?? [];
      return BillingResponse(
        success: true,
        data: plans,
      );
    } catch (e) {
      debugPrint('BillingDao: Failed to get plans: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to get plans: $e',
      );
    }
  }

  /// Create Stripe checkout session (for web payments)
  Future<BillingResponse<Map<String, String>>> createCheckout({
    required String workspaceId,
    required String priceId,
    String? successUrl,
    String? cancelUrl,
  }) async {
    try {
      final response = await post<Map<String, dynamic>>(
        '$workspaceId/billing/checkout',
        data: {
          'priceId': priceId,
          if (successUrl != null) 'successUrl': successUrl,
          if (cancelUrl != null) 'cancelUrl': cancelUrl,
        },
      );
      return BillingResponse(
        success: true,
        data: {
          'sessionId': response['sessionId']?.toString() ?? '',
          'url': response['url']?.toString() ?? '',
        },
      );
    } catch (e) {
      debugPrint('BillingDao: Failed to create checkout: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to create checkout: $e',
      );
    }
  }

  /// Cancel subscription
  Future<BillingResponse<bool>> cancelSubscription({
    required String workspaceId,
    bool cancelAtPeriodEnd = true,
  }) async {
    try {
      await post<Map<String, dynamic>>(
        '$workspaceId/billing/subscription/cancel',
        data: {'cancelAtPeriodEnd': cancelAtPeriodEnd},
      );
      return BillingResponse(success: true, data: true);
    } catch (e) {
      debugPrint('BillingDao: Failed to cancel subscription: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to cancel subscription: $e',
      );
    }
  }

  /// Resume subscription
  Future<BillingResponse<bool>> resumeSubscription({
    required String workspaceId,
  }) async {
    try {
      await post<Map<String, dynamic>>(
        '$workspaceId/billing/subscription/resume',
        data: {},
      );
      return BillingResponse(success: true, data: true);
    } catch (e) {
      debugPrint('BillingDao: Failed to resume subscription: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to resume subscription: $e',
      );
    }
  }

  // ============================================
  // IAP Verification Methods
  // ============================================

  /// Verify Apple App Store receipt
  Future<BillingResponse<Subscription>> verifyAppleReceipt({
    required String workspaceId,
    required String receiptData,
    required String productId,
    required String transactionId,
  }) async {
    try {
      debugPrint('BillingDao: Verifying Apple receipt for workspace $workspaceId');

      final response = await post<Map<String, dynamic>>(
        '$workspaceId/billing/iap/apple/verify',
        data: {
          'receiptData': receiptData,
          'productId': productId,
          'transactionId': transactionId,
        },
      );

      // Parse response - handle both direct subscription and wrapped response
      Map<String, dynamic> subscriptionData;
      if (response['subscription'] != null) {
        subscriptionData = response['subscription'] as Map<String, dynamic>;
      } else if (response['data'] != null) {
        subscriptionData = response['data'] as Map<String, dynamic>;
      } else {
        subscriptionData = response;
      }

      return BillingResponse(
        success: true,
        data: Subscription.fromJson(subscriptionData),
      );
    } catch (e) {
      debugPrint('BillingDao: Failed to verify Apple receipt: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to verify Apple receipt: $e',
      );
    }
  }

  /// Verify Google Play purchase
  Future<BillingResponse<Subscription>> verifyGooglePurchase({
    required String workspaceId,
    required String purchaseToken,
    required String productId,
    required String packageName,
  }) async {
    try {
      debugPrint('BillingDao: Verifying Google purchase for workspace $workspaceId');

      final response = await post<Map<String, dynamic>>(
        '$workspaceId/billing/iap/google/verify',
        data: {
          'purchaseToken': purchaseToken,
          'productId': productId,
          'packageName': packageName,
        },
      );

      // Parse response - handle both direct subscription and wrapped response
      Map<String, dynamic> subscriptionData;
      if (response['subscription'] != null) {
        subscriptionData = response['subscription'] as Map<String, dynamic>;
      } else if (response['data'] != null) {
        subscriptionData = response['data'] as Map<String, dynamic>;
      } else {
        subscriptionData = response;
      }

      return BillingResponse(
        success: true,
        data: Subscription.fromJson(subscriptionData),
      );
    } catch (e) {
      debugPrint('BillingDao: Failed to verify Google purchase: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to verify Google purchase: $e',
      );
    }
  }

  /// Get IAP product IDs configured for this app
  Future<BillingResponse<Map<String, String>>> getIAPProductIds({
    required String workspaceId,
  }) async {
    try {
      final response = await get<Map<String, dynamic>>(
        '$workspaceId/billing/iap/products',
      );

      final productIds = Map<String, String>.from(
        response['productIds'] ?? response['product_ids'] ?? {},
      );

      return BillingResponse(
        success: true,
        data: productIds,
      );
    } catch (e) {
      debugPrint('BillingDao: Failed to get IAP product IDs: $e');
      return BillingResponse(
        success: false,
        message: 'Failed to get IAP product IDs: $e',
      );
    }
  }
}
