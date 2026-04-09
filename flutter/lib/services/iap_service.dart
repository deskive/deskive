import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_wrappers.dart';
import '../constants/subscription_constants.dart';

/// Purchase result for IAP operations
class IAPPurchaseResult {
  final bool success;
  final String? error;
  final SubscriptionPlanType? planType;
  final BillingPeriod? period;
  final String? productId;

  IAPPurchaseResult({
    required this.success,
    this.error,
    this.planType,
    this.period,
    this.productId,
  });
}

/// Unified In-App Purchase Service for iOS and Android
/// Handles subscriptions for Deskive workspaces
class IAPService {
  static final IAPService _instance = IAPService._internal();
  factory IAPService() => _instance;
  IAPService._internal();

  final InAppPurchase _inAppPurchase = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;

  List<ProductDetails> _products = [];
  bool _isAvailable = false;
  bool _isInitialized = false;
  String? _error;

  // Current workspace ID for purchase verification (Deskive-specific)
  String? _currentWorkspaceId;

  // Callbacks
  Function(IAPPurchaseResult)? onPurchaseComplete;
  Function(String)? onError;

  // Verification callback - must be set by the app
  Future<bool> Function(String receiptData, String productId, String transactionId)?
      verifyAppleReceipt;
  Future<bool> Function(String purchaseToken, String productId, String packageName)?
      verifyGooglePurchase;

  // Getters
  List<ProductDetails> get products => _products;
  bool get isAvailable => _isAvailable;
  bool get isInitialized => _isInitialized;
  String? get error => _error;
  String? get currentWorkspaceId => _currentWorkspaceId;

  /// Check if we're on a mobile platform that supports IAP
  static bool get isMobilePlatform => Platform.isIOS || Platform.isAndroid;

  /// Get platform name for display
  static String get platformName => Platform.isIOS ? 'App Store' : 'Google Play';

  /// Set the current workspace ID for purchases (Deskive-specific)
  void setWorkspaceId(String workspaceId) {
    _currentWorkspaceId = workspaceId;
    debugPrint('IAPService: Workspace ID set to $workspaceId');
  }

  /// Initialize the IAP service
  Future<void> initialize() async {
    if (_isInitialized) return;
    if (!isMobilePlatform) {
      debugPrint('IAPService: Not a mobile platform, skipping initialization');
      return;
    }

    debugPrint('IAPService: Initializing for ${Platform.isIOS ? "iOS" : "Android"}...');

    // Check if IAP is available
    _isAvailable = await _inAppPurchase.isAvailable();
    if (!_isAvailable) {
      _error = 'In-App Purchases not available';
      debugPrint('IAPService: $_error');
      return;
    }

    // Listen to purchase updates
    _subscription = _inAppPurchase.purchaseStream.listen(
      _handlePurchaseUpdates,
      onDone: () => _subscription?.cancel(),
      onError: (error) {
        debugPrint('IAPService: Purchase stream error: $error');
        _error = error.toString();
      },
    );

    // Platform-specific setup
    if (Platform.isIOS) {
      final InAppPurchaseStoreKitPlatformAddition iosPlatformAddition =
          _inAppPurchase.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
      await iosPlatformAddition.setDelegate(PaymentQueueDelegate());
    }

    // Load products
    await _loadProducts();

    _isInitialized = true;
    debugPrint('IAPService: Initialized successfully');
  }

  /// Load products from store
  Future<void> _loadProducts() async {
    debugPrint('IAPService: Loading products...');

    final ProductDetailsResponse response =
        await _inAppPurchase.queryProductDetails(ProductIds.all);

    if (response.error != null) {
      _error = response.error!.message;
      debugPrint('IAPService: Error loading products: $_error');
      return;
    }

    if (response.notFoundIDs.isNotEmpty) {
      debugPrint('IAPService: Products not found: ${response.notFoundIDs}');
    }

    _products = response.productDetails;
    debugPrint('IAPService: Loaded ${_products.length} products');
    for (final product in _products) {
      debugPrint('  - ${product.id}: ${product.price}');
    }
  }

  /// Reload products (useful after initial setup)
  Future<void> reloadProducts() async {
    await _loadProducts();
  }

  /// Get product by ID
  ProductDetails? getProduct(String productId) {
    try {
      return _products.firstWhere((p) => p.id == productId);
    } catch (e) {
      return null;
    }
  }

  /// Get product for plan type and period
  ProductDetails? getProductForPlan(SubscriptionPlanType planType, BillingPeriod period) {
    if (planType == SubscriptionPlanType.free) return null;
    final productId = ProductIds.getProductId(planType, period);
    return getProduct(productId);
  }

  /// Get price string for a plan
  String? getPriceForPlan(SubscriptionPlanType planType, BillingPeriod period) {
    final product = getProductForPlan(planType, period);
    return product?.price;
  }

  /// Purchase a subscription
  Future<bool> purchaseSubscription(
    SubscriptionPlanType planType,
    BillingPeriod period, {
    String? workspaceId,
  }) async {
    // Set workspace ID if provided
    if (workspaceId != null) {
      _currentWorkspaceId = workspaceId;
    }

    if (_currentWorkspaceId == null) {
      onError?.call('No workspace selected for subscription');
      return false;
    }

    if (!_isAvailable) {
      final errorMsg = 'In-App Purchases not available. Please check your device settings.';
      debugPrint('IAPService: $errorMsg');
      onError?.call(errorMsg);
      return false;
    }

    if (planType == SubscriptionPlanType.free) {
      onError?.call('Cannot purchase free plan');
      return false;
    }

    final productId = ProductIds.getProductId(planType, period);

    // If products not loaded, try loading them again
    if (_products.isEmpty) {
      debugPrint('IAPService: Products not loaded, attempting to reload...');
      await _loadProducts();
    }

    final product = getProduct(productId);
    if (product == null) {
      // Provide detailed error for debugging
      final availableProducts = _products.map((p) => p.id).join(', ');
      final errorMsg = _products.isEmpty
          ? 'Subscription products are not available. This may be because:\n'
              '• The app is not signed with the correct provisioning profile\n'
              '• Products are pending review in ${Platform.isIOS ? "App Store Connect" : "Google Play Console"}\n'
              '• You are not using a sandbox/test account'
          : 'Product "$productId" not found. Available products: $availableProducts';
      debugPrint('IAPService: $errorMsg');
      onError?.call(errorMsg);
      return false;
    }

    debugPrint('IAPService: Purchasing $productId (${product.price}) for workspace $_currentWorkspaceId');

    final PurchaseParam purchaseParam = PurchaseParam(productDetails: product);

    try {
      // For subscriptions, use buyNonConsumable
      final result = await _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
      debugPrint('IAPService: Purchase initiated: $result');
      return result;
    } catch (e) {
      debugPrint('IAPService: Purchase error: $e');
      onError?.call('Purchase failed: ${e.toString()}');
      return false;
    }
  }

  /// Restore purchases
  Future<void> restorePurchases() async {
    if (!_isAvailable) {
      onError?.call('In-App Purchases not available');
      return;
    }

    debugPrint('IAPService: Restoring purchases...');
    await _inAppPurchase.restorePurchases();
  }

  /// Manually sync subscription status with backend using current receipt
  Future<bool> syncSubscriptionStatus() async {
    debugPrint('IAPService: Syncing subscription status with backend...');

    try {
      if (Platform.isIOS) {
        final InAppPurchaseStoreKitPlatformAddition iosPlatformAddition =
            _inAppPurchase.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();

        // Refresh the receipt from App Store
        final receiptData = await iosPlatformAddition.refreshPurchaseVerificationData();

        if (receiptData == null || receiptData.serverVerificationData.isEmpty) {
          debugPrint('IAPService: No receipt data available');
          return false;
        }

        debugPrint('IAPService: Got receipt data, verifying with backend...');

        // Try to verify each product ID to find active subscription
        for (final productId in ProductIds.allIOS) {
          final planType = ProductIds.getPlanTypeFromProductId(productId);
          if (planType == null) continue;

          if (verifyAppleReceipt != null) {
            final success = await verifyAppleReceipt!(
              receiptData.serverVerificationData,
              productId,
              '',
            );

            if (success) {
              debugPrint('IAPService: Verified active subscription for $productId');
              final period = ProductIds.getBillingPeriodFromProductId(productId);
              onPurchaseComplete?.call(IAPPurchaseResult(
                success: true,
                planType: planType,
                period: period,
                productId: productId,
              ));
              return true;
            }
          }
        }

        debugPrint('IAPService: No active subscription found in receipt');
        return false;
      } else {
        // Android: Just trigger restore which will process through the normal stream
        debugPrint('IAPService: Android sync - triggering restore');
        await restorePurchases();
        return true;
      }
    } catch (e) {
      debugPrint('IAPService: Error syncing subscription: $e');
      return false;
    }
  }

  /// Handle purchase updates
  Future<void> _handlePurchaseUpdates(List<PurchaseDetails> purchaseDetailsList) async {
    for (final purchaseDetails in purchaseDetailsList) {
      debugPrint('IAPService: Purchase update - ${purchaseDetails.productID}: ${purchaseDetails.status}');

      switch (purchaseDetails.status) {
        case PurchaseStatus.pending:
          debugPrint('IAPService: Purchase pending');
          break;

        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          // Verify the purchase with backend
          final verified = await _verifyPurchase(purchaseDetails);

          if (verified) {
            final planType = ProductIds.getPlanTypeFromProductId(purchaseDetails.productID);
            final period = ProductIds.getBillingPeriodFromProductId(purchaseDetails.productID);

            onPurchaseComplete?.call(IAPPurchaseResult(
              success: true,
              planType: planType,
              period: period,
              productId: purchaseDetails.productID,
            ));
          } else {
            onPurchaseComplete?.call(IAPPurchaseResult(
              success: false,
              error: 'Purchase verification failed',
            ));
          }
          break;

        case PurchaseStatus.error:
          debugPrint('IAPService: Purchase error: ${purchaseDetails.error}');
          onPurchaseComplete?.call(IAPPurchaseResult(
            success: false,
            error: purchaseDetails.error?.message ?? 'Purchase failed',
          ));
          break;

        case PurchaseStatus.canceled:
          debugPrint('IAPService: Purchase canceled');
          onPurchaseComplete?.call(IAPPurchaseResult(
            success: false,
            error: 'Purchase canceled',
          ));
          break;
      }

      // Complete the purchase
      if (purchaseDetails.pendingCompletePurchase) {
        await _inAppPurchase.completePurchase(purchaseDetails);
      }
    }
  }

  /// Verify purchase with backend
  Future<bool> _verifyPurchase(PurchaseDetails purchaseDetails) async {
    debugPrint('IAPService: Verifying purchase for workspace $_currentWorkspaceId...');

    try {
      if (Platform.isIOS) {
        // iOS: Use App Store receipt
        final receiptData = purchaseDetails.verificationData.serverVerificationData;

        if (receiptData.isEmpty) {
          debugPrint('IAPService: No receipt data');
          return false;
        }

        if (verifyAppleReceipt != null) {
          final success = await verifyAppleReceipt!(
            receiptData,
            purchaseDetails.productID,
            purchaseDetails.purchaseID ?? '',
          );
          debugPrint('IAPService: Apple verification result: $success');
          return success;
        } else {
          debugPrint('IAPService: No Apple verification callback set');
          return false;
        }
      } else {
        // Android: Use Google Play purchase token
        final purchaseToken = purchaseDetails.verificationData.serverVerificationData;

        if (purchaseToken.isEmpty) {
          debugPrint('IAPService: No purchase token');
          return false;
        }

        if (verifyGooglePurchase != null) {
          final success = await verifyGooglePurchase!(
            purchaseToken,
            purchaseDetails.productID,
            'com.deskive.app',
          );
          debugPrint('IAPService: Google verification result: $success');
          return success;
        } else {
          debugPrint('IAPService: No Google verification callback set');
          return false;
        }
      }
    } catch (e) {
      debugPrint('IAPService: Verification error: $e');
      return false;
    }
  }

  /// Dispose
  void dispose() {
    _subscription?.cancel();
    _isInitialized = false;
  }
}

/// Payment queue delegate for StoreKit (iOS only)
class PaymentQueueDelegate implements SKPaymentQueueDelegateWrapper {
  @override
  bool shouldContinueTransaction(
      SKPaymentTransactionWrapper transaction, SKStorefrontWrapper storefront) {
    return true;
  }

  @override
  bool shouldShowPriceConsent() {
    return false;
  }
}
