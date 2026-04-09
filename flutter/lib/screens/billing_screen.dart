import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/auth_service.dart';
import '../services/workspace_service.dart';
import '../services/iap_service.dart';
import '../constants/subscription_constants.dart';
import '../dao/billing_dao.dart';
import 'checkout_webview_screen.dart';
import 'terms_screen.dart';
import 'privacy_screen.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  bool _isAccessDenied = false;
  String? _checkoutPlanId; // Track which plan is being checked out
  String _selectedInterval = 'monthly'; // Track selected billing interval

  Map<String, dynamic>? _subscription;
  List<dynamic> _plans = [];
  List<dynamic> _invoices = [];
  List<dynamic> _paymentMethods = [];

  // IAP Service
  final IAPService _iapService = IAPService();
  final BillingDao _billingDao = BillingDao();
  bool _iapInitialized = false;

  @override
  void initState() {
    super.initState();
    _initializeIAP();
    _checkAccessAndLoadData();
  }

  /// Initialize IAP service for mobile platforms
  Future<void> _initializeIAP() async {
    if (!IAPService.isMobilePlatform) return;

    try {
      await _iapService.initialize();

      // Set up callbacks
      _iapService.onPurchaseComplete = _handleIAPPurchaseComplete;
      _iapService.onError = _handleIAPError;

      // Set up verification callbacks
      _iapService.verifyAppleReceipt = _verifyAppleReceipt;
      _iapService.verifyGooglePurchase = _verifyGooglePurchase;

      setState(() {
        _iapInitialized = _iapService.isInitialized;
      });

      debugPrint('BillingScreen: IAP initialized: $_iapInitialized');
    } catch (e) {
      debugPrint('BillingScreen: Failed to initialize IAP: $e');
    }
  }

  /// Handle IAP purchase completion
  void _handleIAPPurchaseComplete(IAPPurchaseResult result) {
    if (!mounted) return;

    setState(() {
      _checkoutPlanId = null;
    });

    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('billing.payment_successful'.tr()),
          backgroundColor: Colors.green,
        ),
      );
      // Reload billing data to show updated subscription
      _loadBillingData();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.error ?? 'billing.payment_failed'.tr()),
          backgroundColor: result.error?.contains('canceled') == true ? Colors.orange : Colors.red,
        ),
      );
    }
  }

  /// Handle IAP errors
  void _handleIAPError(String error) {
    if (!mounted) return;

    setState(() {
      _checkoutPlanId = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error),
        backgroundColor: Colors.red,
      ),
    );
  }

  /// Verify Apple receipt with backend
  Future<bool> _verifyAppleReceipt(String receiptData, String productId, String transactionId) async {
    try {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId == null) return false;

      final response = await _billingDao.verifyAppleReceipt(
        workspaceId: workspaceId,
        receiptData: receiptData,
        productId: productId,
        transactionId: transactionId,
      );

      return response.success;
    } catch (e) {
      debugPrint('BillingScreen: Apple verification error: $e');
      return false;
    }
  }

  /// Verify Google purchase with backend
  Future<bool> _verifyGooglePurchase(String purchaseToken, String productId, String packageName) async {
    try {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId == null) return false;

      final response = await _billingDao.verifyGooglePurchase(
        workspaceId: workspaceId,
        purchaseToken: purchaseToken,
        productId: productId,
        packageName: packageName,
      );

      return response.success;
    } catch (e) {
      debugPrint('BillingScreen: Google verification error: $e');
      return false;
    }
  }

  @override
  void dispose() {
    _iapService.dispose();
    super.dispose();
  }

  // Check if current user is owner or admin
  bool _canAccessBilling() {
    final currentWorkspace = WorkspaceService.instance.currentWorkspace;
    final currentUser = AuthService.instance.currentUser;

    if (currentWorkspace == null || currentUser == null) {
      return false;
    }

    // Check if user is owner
    if (currentUser.id == currentWorkspace.ownerId) {
      return true;
    }

    // Check if user is admin via membership
    if (currentWorkspace.membership != null) {
      return currentWorkspace.membership!.canManageWorkspace();
    }

    return false;
  }

  Future<void> _checkAccessAndLoadData() async {
    // Check permission first
    if (!_canAccessBilling()) {
      setState(() {
        _isAccessDenied = true;
        _isLoading = false;
      });
      return;
    }

    await _loadBillingData();
  }

  Future<void> _loadBillingData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _isAccessDenied = false;
    });

    try {
      // Get current workspace ID from WorkspaceService
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

      if (workspaceId == null) {
        throw Exception('No workspace selected. Please select a workspace first.');
      }

      // Load all billing data in parallel
      final results = await Future.wait([
        AuthService.instance.dio.get('/workspaces/$workspaceId/billing/subscription'),
        AuthService.instance.dio.get('/workspaces/$workspaceId/billing/plans'),
        AuthService.instance.dio.get('/workspaces/$workspaceId/billing/invoices'),
        AuthService.instance.dio.get('/workspaces/$workspaceId/billing/payment-methods'),
      ]);

      setState(() {
        _subscription = results[0].data;
        _plans = results[1].data['plans'] ?? [];
        _invoices = results[2].data['invoices'] ?? [];
        _paymentMethods = results[3].data['paymentMethods'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      // Handle 403 Forbidden error
      if (e is DioException && e.response?.statusCode == 403) {
        setState(() {
          _isAccessDenied = true;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleUpgrade(Map<String, dynamic> plan) async {
    // Free plan doesn't need checkout
    if (plan['id'] == 'free') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('billing.already_on_free'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _checkoutPlanId = plan['id'];
    });

    // Use IAP for mobile platforms
    if (IAPService.isMobilePlatform && _iapInitialized) {
      await _handleIAPUpgrade(plan);
    } else {
      await _handleWebCheckout(plan);
    }
  }

  /// Handle upgrade via native In-App Purchase (iOS/Android)
  Future<void> _handleIAPUpgrade(Map<String, dynamic> plan) async {
    try {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace selected');
      }

      // Set workspace ID for IAP service
      _iapService.setWorkspaceId(workspaceId);

      // Map plan ID to SubscriptionPlanType
      SubscriptionPlanType? planType;
      switch (plan['id']) {
        case 'starter':
          planType = SubscriptionPlanType.starter;
          break;
        case 'professional':
          planType = SubscriptionPlanType.professional;
          break;
        case 'enterprise':
          planType = SubscriptionPlanType.enterprise;
          break;
        default:
          throw Exception('Invalid plan');
      }

      // Map billing interval
      final period = _selectedInterval == 'yearly' ? BillingPeriod.yearly : BillingPeriod.monthly;

      // Get IAP price for display (optional - for confirmation)
      final iapPrice = _iapService.getPriceForPlan(planType, period);
      debugPrint('BillingScreen: IAP price for ${plan['id']} $period: $iapPrice');

      // Initiate purchase
      final success = await _iapService.purchaseSubscription(planType, period);

      if (!success) {
        // Error already handled via onError callback
        setState(() {
          _checkoutPlanId = null;
        });
      }
      // Note: Success is handled via onPurchaseComplete callback
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
        setState(() {
          _checkoutPlanId = null;
        });
      }
    }
  }

  /// Handle upgrade via Stripe web checkout (fallback for web)
  Future<void> _handleWebCheckout(Map<String, dynamic> plan) async {
    // Get the price ID based on selected interval
    final priceId = _selectedInterval == 'yearly'
        ? plan['stripePriceIdYearly']
        : plan['stripePriceId'];

    // Check if price ID exists for the selected interval
    if (priceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('billing.plan_not_available'.tr(args: [plan['name'], _selectedInterval])),
          backgroundColor: Colors.orange,
        ),
      );
      setState(() {
        _checkoutPlanId = null;
      });
      return;
    }

    try {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace selected');
      }

      // Create checkout session
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/billing/checkout',
        data: {
          'priceId': priceId,
          'successUrl': 'https://checkout.stripe.com/success',
          'cancelUrl': 'https://checkout.stripe.com/cancel',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final checkoutUrl = response.data['url'];

        // Open checkout in WebView
        if (mounted) {
          final result = await Navigator.push<Map<String, dynamic>>(
            context,
            MaterialPageRoute(
              builder: (context) => CheckoutWebViewScreen(
                checkoutUrl: checkoutUrl,
                successUrl: 'https://checkout.stripe.com/success',
                cancelUrl: 'https://checkout.stripe.com/cancel',
              ),
            ),
          );

          // Handle result
          if (result != null) {
            if (result['success'] == true) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('billing.payment_successful'.tr()),
                    backgroundColor: Colors.green,
                  ),
                );
                // Reload billing data to show updated subscription
                await _loadBillingData();
              }
            } else if (result['canceled'] == true) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('billing.payment_canceled'.tr()),
                    backgroundColor: Colors.orange,
                  ),
                );
              }
            }
          }
        }
      } else {
        throw Exception('Failed to create checkout session');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _checkoutPlanId = null;
        });
      }
    }
  }

  String _formatCurrency(int amount, String currency) {
    final value = amount / 100;
    return '\$$value';
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('MMM d, yyyy').format(date); // "Jan 4, 2026"
    } catch (e) {
      return dateString;
    }
  }

  int _calculateSavingsPercentage(Map<String, dynamic> plan) {
    final monthlyPrice = plan['price'] ?? 0;
    final yearlyPrice = plan['yearlyPrice'] ?? 0;

    if (monthlyPrice == 0 || yearlyPrice == 0) {
      return 0;
    }

    final monthlyPriceAnnual = monthlyPrice * 12;
    final savings = monthlyPriceAnnual - yearlyPrice;
    final savingsPercentage = (savings / monthlyPriceAnnual * 100).round();

    return savingsPercentage;
  }

  /// Check if subscription is from mobile IAP (App Store or Google Play)
  bool get _isIAPSubscription {
    final source = _subscription?['source'];
    return source == 'apple' || source == 'google';
  }

  /// Get store name for IAP subscription
  String? get _iapStoreName {
    final source = _subscription?['source'];
    if (source == 'apple') return 'App Store';
    if (source == 'google') return 'Google Play';
    return null;
  }

  /// Get manage URL for IAP subscription
  String get _iapManageUrl {
    final source = _subscription?['source'];
    if (source == 'apple') {
      return 'https://apps.apple.com/account/subscriptions';
    }
    return 'https://play.google.com/store/account/subscriptions';
  }

  /// Open IAP store management page
  Future<void> _openIAPManagement() async {
    final url = Uri.parse(_iapManageUrl);
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('billing.title'.tr()),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _isAccessDenied
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.lock_outline,
                            size: 64,
                            color: Colors.orange.shade700,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'billing.access_restricted'.tr(),
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'billing.access_restricted_description'.tr(),
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: isDark ? Colors.white70 : Colors.grey.shade700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'billing.contact_owner'.tr(),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isDark ? Colors.white60 : Colors.grey.shade600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.grey.shade800.withOpacity(0.3)
                                : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark
                                  ? Colors.grey.shade700
                                  : Colors.grey.shade300,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.info_outline,
                                size: 20,
                                color: isDark ? Colors.white70 : Colors.grey.shade700,
                              ),
                              const SizedBox(width: 12),
                              Flexible(
                                child: Text(
                                  'billing.need_owner_admin'.tr(),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: isDark ? Colors.white70 : Colors.grey.shade700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        OutlinedButton.icon(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.arrow_back),
                          label: Text('billing.go_back'.tr()),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : _errorMessage != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.error_outline,
                            size: 64,
                            color: Theme.of(context).colorScheme.error,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'billing.failed_to_load'.tr(),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 32),
                            child: Text(
                              _errorMessage!,
                              style: Theme.of(context).textTheme.bodyMedium,
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _checkAccessAndLoadData,
                            icon: const Icon(Icons.refresh),
                            label: Text('common.retry'.tr()),
                          ),
                        ],
                      ),
                    )
                  : SafeArea(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Current Subscription Card
                            _buildCurrentSubscriptionCard(),
                            const SizedBox(height: 24),

                            // Billing Interval Tabs
                            _buildBillingIntervalTabs(),
                            const SizedBox(height: 24),

                            // Available Plans
                            _buildAvailablePlansSection(),
                            const SizedBox(height: 24),

                            // Payment Methods
                            if (_paymentMethods.isNotEmpty) ...[
                              _buildPaymentMethodsSection(),
                              const SizedBox(height: 24),
                            ],

                            // Invoice History
                            _buildInvoiceHistorySection(),
                            const SizedBox(height: 24),

                            // Legal Links (Required for App Store auto-renewable subscriptions)
                            _buildLegalLinksSection(),

                            // Bottom padding for safe area
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ),
    );
  }

  /// Build legal links section with Terms of Use and Privacy Policy
  /// Required for Apple App Store auto-renewable subscriptions (Guideline 3.1.2)
  Widget _buildLegalLinksSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).dividerColor.withOpacity(0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'billing.subscription_terms'.tr(),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'billing.subscription_terms_description'.tr(),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const TermsScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.description_outlined, size: 18),
                  label: Text('billing.terms_of_use'.tr()),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const PrivacyScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.privacy_tip_outlined, size: 18),
                  label: Text('billing.privacy_policy'.tr()),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentSubscriptionCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.credit_card, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  'billing.current_subscription'.tr(),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'billing.manage_subscription'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),

            if (_subscription != null) ...[
              // Plan Name
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'billing.plan'.tr(),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            _subscription!['plan']?.toString().toUpperCase() ?? 'FREE',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _buildStatusChip(_subscription!['status'] ?? 'active'),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Billing Cycle and Next Billing Date
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'billing.billing_cycle'.tr(),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _subscription!['interval']?.toString().toUpperCase() ?? 'MONTHLY',
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'billing.next_billing'.tr(),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _subscription!['currentPeriodEnd'] != null
                              ? _formatDate(_subscription!['currentPeriodEnd'])
                              : 'billing.not_available'.tr(),
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // IAP Subscription Notice (Apple/Google)
              if (_isIAPSubscription && _iapStoreName != null && _subscription!['plan'] != 'free') ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _subscription?['source'] == 'apple' ? Icons.apple : Icons.android,
                            size: 20,
                            color: Colors.amber.shade700,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Subscribed via $_iapStoreName',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Colors.amber.shade700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'This subscription was purchased through the $_iapStoreName. To manage, cancel, or update your subscription, please use your device\'s $_iapStoreName settings.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _openIAPManagement,
                          icon: const Icon(Icons.open_in_new, size: 16),
                          label: Text('Manage on $_iapStoreName'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ]
              // Stripe Subscription Notice (subscribed via web)
              else if (_subscription?['source'] == 'stripe' && _subscription!['plan'] != 'free') ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.language, size: 20, color: Colors.blue.shade700),
                          const SizedBox(width: 8),
                          Text(
                            'Subscribed via Web',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Colors.blue.shade700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'This subscription was purchased through the web. To manage, cancel, or update your subscription, please visit the web app.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ] else
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text('billing.no_active_subscription'.tr()),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color backgroundColor;
    Color textColor;

    switch (status.toLowerCase()) {
      case 'active':
        backgroundColor = Colors.green.shade100;
        textColor = Colors.green.shade900;
        break;
      case 'canceled':
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade900;
        break;
      case 'trialing':
        backgroundColor = Colors.blue.shade100;
        textColor = Colors.blue.shade900;
        break;
      default:
        backgroundColor = Colors.grey.shade100;
        textColor = Colors.grey.shade900;
    }

    return Chip(
      label: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
      backgroundColor: backgroundColor,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Widget _buildBillingIntervalTabs() {
    // Calculate max savings for the badge
    int maxSavings = 0;
    for (var plan in _plans) {
      final savings = _calculateSavingsPercentage(plan);
      if (savings > maxSavings) {
        maxSavings = savings;
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          // Monthly Tab
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedInterval = 'monthly'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: _selectedInterval == 'monthly'
                      ? Colors.white
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedInterval == 'monthly'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  'billing.monthly'.tr(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: _selectedInterval == 'monthly'
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade700,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),
          // Yearly Tab
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedInterval = 'yearly'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: _selectedInterval == 'yearly'
                      ? Colors.white
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedInterval == 'yearly'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'billing.yearly'.tr(),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: _selectedInterval == 'yearly'
                            ? Theme.of(context).colorScheme.primary
                            : Colors.grey.shade700,
                      ),
                    ),
                    if (maxSavings > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green.shade500,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'billing.save_percent'.tr(args: [maxSavings.toString()]),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvailablePlansSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'billing.available_plans'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),

        // IAP Notice for plan changes
        if (_isIAPSubscription && _iapStoreName != null && _subscription?['plan'] != 'free') ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.smartphone, size: 20, color: Colors.blue.shade700),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Change plans through $_iapStoreName',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.blue.shade700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'To upgrade or change your plan, please use the $_iapStoreName on your mobile device.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _plans.length,
          itemBuilder: (context, index) {
            final plan = _plans[index];
            final isCurrentPlan = _subscription?['plan'] == plan['id'];
            final isProfessionalPlan = plan['id'] == 'professional';

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isCurrentPlan
                      ? Theme.of(context).colorScheme.primary
                      : isProfessionalPlan
                          ? Theme.of(context).colorScheme.primary.withOpacity(0.5)
                          : Colors.grey.shade300,
                  width: isCurrentPlan ? 2 : isProfessionalPlan ? 2 : 1,
                ),
                gradient: isCurrentPlan
                    ? LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Theme.of(context).colorScheme.primary.withOpacity(0.05),
                          Theme.of(context).colorScheme.primaryContainer.withOpacity(0.1),
                        ],
                      )
                    : null,
                color: isCurrentPlan ? null : Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: isCurrentPlan
                        ? Theme.of(context).colorScheme.primary.withOpacity(0.1)
                        : Colors.black.withOpacity(0.05),
                    blurRadius: isCurrentPlan ? 12 : 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Plan name and badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Text(
                                plan['name'] ?? '',
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: isCurrentPlan
                                      ? Theme.of(context).colorScheme.primary
                                      : null,
                                ),
                              ),
                              if (isProfessionalPlan) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        Colors.orange.shade400,
                                        Colors.orange.shade600,
                                      ],
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.orange.withOpacity(0.3),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    'billing.popular'.tr(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (isCurrentPlan)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              'billing.current'.tr(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (plan['description'] != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        plan['description'],
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Price - For yearly, show monthly price as main, annual as subtitle
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _formatCurrency(
                            _selectedInterval == 'yearly'
                                ? (plan['yearlyPrice'] ?? 0) ~/ 12  // Monthly equivalent for yearly
                                : plan['price'] ?? 0,
                            plan['currency'] ?? 'USD',
                          ),
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text(
                            'billing.per_month'.tr(),
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Show annual total for yearly plans
                    if (_selectedInterval == 'yearly' && (plan['yearlyPrice'] ?? 0) > 0) ...[
                      const SizedBox(height: 4),
                      Text(
                        'billing.billed_annually'.tr(args: [_formatCurrency(plan['yearlyPrice'] ?? 0, plan['currency'] ?? 'USD')]),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),
                    const Divider(),
                    const SizedBox(height: 16),

                    // Features
                    ...((plan['features'] as List?) ?? []).map((feature) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.check_circle_rounded,
                              size: 20,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                feature.toString(),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),

                    // Upgrade button
                    if (!isCurrentPlan) ...[
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _checkoutPlanId == null &&
                                  plan['id'] != 'free' &&
                                  !(_isIAPSubscription && _subscription?['plan'] != 'free')
                              ? () => _handleUpgrade(plan)
                              : (_isIAPSubscription && _subscription?['plan'] != 'free' && plan['id'] != 'free')
                                  ? _openIAPManagement
                                  : null,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _checkoutPlanId == plan['id']
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(
                                  plan['id'] == 'free'
                                      ? 'Free Plan'
                                      : (_isIAPSubscription && _subscription?['plan'] != 'free')
                                          ? 'Use $_iapStoreName'
                                          : 'billing.upgrade_to'.tr(args: [plan['name']]),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildPaymentMethodsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'billing.payment_methods'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ..._paymentMethods.map((method) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const Icon(Icons.credit_card),
              title: Text(
                '${method['brand']?.toString().toUpperCase() ?? 'CARD'} •••• ${method['last4'] ?? ''}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: method['expiryMonth'] != null && method['expiryYear'] != null
                  ? Text('billing.expires'.tr(args: [method['expiryMonth'].toString(), method['expiryYear'].toString()]))
                  : null,
              trailing: method['isDefault'] == true
                  ? Chip(
                      label: Text('billing.default'.tr(), style: const TextStyle(fontSize: 11)),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    )
                  : null,
            ),
          );
        }).toList(),
      ],
    );
  }

  Widget _buildInvoiceHistorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'billing.invoice_history'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        if (_invoices.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.receipt_long,
                      size: 48,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'billing.no_invoices'.tr(),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _invoices.length,
            itemBuilder: (context, index) {
              final invoice = _invoices[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.receipt),
                  title: Text(
                    invoice['description'] ?? 'billing.subscription_payment'.tr(),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(_formatDate(invoice['date'] ?? '')),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _formatCurrency(invoice['amount'] ?? 0, invoice['currency'] ?? 'USD'),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      _buildStatusChip(invoice['status'] ?? 'pending'),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
