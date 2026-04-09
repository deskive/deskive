import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import {
  CreateCheckoutSessionDto,
  CancelSubscriptionDto,
  UpdateSubscriptionDto,
  VerifyAppleReceiptDto,
  VerifyGooglePurchaseDto,
} from './dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verify user has admin/owner role for workspace
   */
  private async verifyWorkspaceAdmin(workspaceId: string, userId: string): Promise<void> {
    this.logger.log(`Verifying admin access for user ${userId} in workspace ${workspaceId}`);

    const result = await this.db
      .table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .execute();

    const member = result.data?.[0];

    if (!member) {
      throw new NotFoundException('User is not a member of this workspace');
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Only workspace owners and admins can manage billing');
    }
  }

  /**
   * Get workspace with billing information
   */
  private async getWorkspace(workspaceId: string) {
    const result = await this.db
      .table('workspaces')
      .select('*')
      .where('id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    const workspace = result.data?.[0];

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  /**
   * Get current subscription for a workspace
   */
  async getSubscription(workspaceId: string, userId: string) {
    try {
      this.logger.log(`Getting subscription for workspace: ${workspaceId}`);

      // Verify user has access to workspace (any member can view)
      const memberResult = await this.db
        .table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      if (!memberResult.data?.[0]) {
        throw new NotFoundException('User is not a member of this workspace');
      }

      // First, check workspace_subscriptions table for IAP subscription (Apple/Google)
      const subscriptionResult = await this.db
        .table('workspace_subscriptions')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      const dbSubscription = subscriptionResult.data?.[0];
      if (dbSubscription && dbSubscription.status === 'active') {
        // Check if subscription is still active (not expired)
        const expiryDate = dbSubscription.current_period_end ? new Date(dbSubscription.current_period_end) : null;
        if (!expiryDate || expiryDate > new Date()) {
          this.logger.log(`Found active subscription for workspace: ${workspaceId}, plan: ${dbSubscription.plan}, source: ${dbSubscription.source}`);
          return {
            id: dbSubscription.id,
            workspaceId: workspaceId,
            plan: dbSubscription.plan as 'free' | 'starter' | 'professional' | 'enterprise',
            interval: dbSubscription.billing_cycle,
            status: dbSubscription.status,
            source: dbSubscription.source, // 'stripe', 'apple', or 'google'
            currentPeriodStart: dbSubscription.current_period_start,
            currentPeriodEnd: dbSubscription.current_period_end,
            cancelAtPeriodEnd: dbSubscription.cancel_at_period_end || false,
            stripeCustomerId: dbSubscription.stripe_customer_id,
            stripeSubscriptionId: dbSubscription.stripe_subscription_id,
            appleProductId: dbSubscription.apple_product_id,
            appleTransactionId: dbSubscription.apple_transaction_id,
            googleProductId: dbSubscription.google_product_id,
            googlePurchaseToken: dbSubscription.google_purchase_token,
            trialEnd: dbSubscription.trial_end,
            createdAt: dbSubscription.created_at,
            updatedAt: dbSubscription.updated_at,
          };
        } else {
          this.logger.log(`Subscription expired for workspace: ${workspaceId}`);
        }
      }

      // Fetch active subscription from database (Stripe subscriptions)
      this.logger.log(`Fetching Stripe subscription for workspace: ${workspaceId}`);

      let dbSubscription;
      try {
        dbSubscription = await /* TODO: use Stripe directly */ this.db.getActiveSubscriptionByMetadata('workspaceId', workspaceId);
        this.logger.log(`SDK returned:`, JSON.stringify(dbSubscription, null, 2));
      } catch (error) {
        this.logger.error(`SDK error:`, error);
        // Continue to free plan fallback
      }

      if (!dbSubscription) {
        this.logger.log(`No active subscription found for workspaceId: ${workspaceId}, returning free plan`);
        // No subscription found - return free plan (no billing dates for free plan)
        return {
          id: workspaceId,
          workspaceId: workspaceId,
          plan: 'free' as 'free' | 'starter' | 'professional' | 'enterprise',
          status: 'active',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          trialEnd: null,
          createdAt: null,
          updatedAt: null,
        };
      }

      this.logger.log(`Found Stripe subscription:`, JSON.stringify(dbSubscription, null, 2));

      // database returns camelCase field names
      const plan = await this.getPlanFromPriceId(dbSubscription.stripePriceId);
      const interval = await this.getIntervalFromPriceId(dbSubscription.stripePriceId);

      const subscription = {
        id: dbSubscription.id,
        workspaceId: workspaceId,
        plan: plan,
        interval: interval,
        status: dbSubscription.status || 'active',
        source: 'stripe',
        currentPeriodStart: dbSubscription.currentPeriodStart || new Date().toISOString(),
        currentPeriodEnd: dbSubscription.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: dbSubscription.cancelAtPeriodEnd ?? false,
        stripeCustomerId: dbSubscription.stripeCustomerId,
        stripeSubscriptionId: dbSubscription.stripeSubscriptionId,
        trialEnd: null,
        createdAt: dbSubscription.createdAt || new Date().toISOString(),
        updatedAt: dbSubscription.updatedAt || new Date().toISOString(),
      };

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to get subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get available subscription plans
   * Price IDs are fetched from database payment config (configured via database Dashboard)
   */
  async getPlans() {
    try {
      this.logger.log('Getting subscription plans');

      // Fetch price IDs from database payment config
      let priceIds: string[] = [];
      try {
        const paymentConfig = await /* TODO: use Stripe directly */ this.db.getPaymentConfig();
        this.logger.log(`[DEBUG] Raw payment config: ${JSON.stringify(paymentConfig)}`);
        priceIds = paymentConfig?.priceIds || [];
        this.logger.log(`Fetched ${priceIds.length} price IDs from database: ${priceIds.join(', ')}`);
      } catch (error) {
        this.logger.warn(`Failed to fetch payment config from database: ${error.message}`);
      }

      // Map price IDs by index (order: starter-monthly, starter-yearly, pro-monthly, pro-yearly, enterprise-monthly, enterprise-yearly)
      const starterMonthly = priceIds[0] || null;
      const starterYearly = priceIds[1] || null;
      const professionalMonthly = priceIds[2] || null;
      const professionalYearly = priceIds[3] || null;
      const enterpriseMonthly = priceIds[4] || null;
      const enterpriseYearly = priceIds[5] || null;

      // Return hardcoded plans - these match the pricing page
      // Each plan tier has both monthly and yearly options
      const planFeatures = {
        free: [
          '5 team members',
          '512 MB storage',
          'Basic chat & messaging',
          'Basic file sharing',
          'Mobile app access',
          'Community support',
          'Basic integrations',
          '2FA authentication',
        ],
        starter: [
          '25 team members',
          '25 GB storage',
          'Advanced chat with threads',
          'Video calls (up to 10 participants)',
          'Project management tools',
          'Calendar integration',
          //'Email support',
          //'API access',
          //'Custom integrations (5)',
          'Basic analytics',
          'Data export (CSV)',
          'Guest access',
        ],
        professional: [
          '100 team members',
          '100 GB storage',
          'Video calls (up to 50 participants)',
          //'Advanced project management',
          'AI-powered features',
          //'Custom integrations (unlimited)',
          'Advanced analytics & reporting',
          'Priority support',
          //'Data export (all formats)',
          '99.9% uptime SLA',
          'Advanced security features',
          //'Custom workflows',
          //'Time tracking & billing',
          'Resource management',
        ],
        enterprise: [
          'Unlimited team members',
          '1 TB+ storage',
          'Unlimited video calls',
          'Enterprise SSO (SAML, OAuth)',
          'Advanced security & compliance',
          //'Custom AI training',
          'Dedicated account manager',
          //'Custom integrations & API',
          '24/7 phone support',
          //'On-premise deployment option',
          'Custom contracts & SLA',
          //'Audit logs & compliance',
          //'Advanced user permissions',
          //'White-label options',
          //'Priority feature requests',
          //'Training & onboarding',
        ],
      };

      return {
        plans: [
          // Free plan (no yearly option)
          {
            id: 'free',
            name: 'Free',
            description: 'Perfect for individuals and small teams getting started',
            price: 0,
            yearlyPrice: 0,
            currency: 'usd',
            interval: 'month',
            features: planFeatures.free,
            limits: { maxMembers: 5, maxStorageGb: 0.5 },
            stripePriceId: null,
            stripePriceIdYearly: null,
          },
          // Starter - Monthly and Yearly
          {
            id: 'starter',
            name: 'Starter',
            description: 'Ideal for growing teams that need more power',
            price: 999, // $9.99/month
            yearlyPrice: 9999, // $99.99/year (save 16%)
            currency: 'usd',
            interval: 'month',
            features: planFeatures.starter,
            limits: { maxMembers: 25, maxStorageGb: 25 },
            stripePriceId: starterMonthly,
            stripePriceIdYearly: starterYearly,
          },
          // Professional - Monthly and Yearly
          {
            id: 'professional',
            name: 'Professional',
            description: 'Complete solution for professional teams',
            price: 1999, // $19.99/month
            yearlyPrice: 19999, // $199.99/year (save 16%)
            currency: 'usd',
            interval: 'month',
            features: planFeatures.professional,
            limits: { maxMembers: 100, maxStorageGb: 100 },
            stripePriceId: professionalMonthly,
            stripePriceIdYearly: professionalYearly,
            isPopular: true,
          },
          // Enterprise - Monthly and Yearly
          {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Tailored solutions for large organizations',
            price: 4999, // $49.99/month
            yearlyPrice: 49999, // $499.99/year (save 16%)
            currency: 'usd',
            interval: 'month',
            features: planFeatures.enterprise,
            limits: { maxMembers: -1, maxStorageGb: 1000 },
            stripePriceId: enterpriseMonthly,
            stripePriceIdYearly: enterpriseYearly,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to get plans: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createCheckout(
    workspaceId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ) {
    try {
      this.logger.log(`Creating checkout session for workspace: ${workspaceId}`);

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      const workspace = await this.getWorkspace(workspaceId);

      // Get user details for customer email
      const user = await this.db.getUserById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create checkout session
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5175';
      const successUrl =
        dto.successUrl || `${frontendUrl}/workspaces/${workspaceId}/billing/success`;
      const cancelUrl =
        dto.cancelUrl || `${frontendUrl}/workspaces/${workspaceId}/billing`;

      const session = await /* TODO: use Stripe directly */ this.db.createCheckoutSession(
        workspaceId,
        null,
        {
          priceId: dto.priceId,
          customerEmail: user.email,
          successUrl: successUrl,
          cancelUrl: cancelUrl,
          trialPeriodDays: dto.trialPeriodDays,
          metadata: {
            workspaceId,
            userId,
          },
        },
      );

      this.logger.log(`Checkout session created: ${session.sessionId}`);

      return {
        sessionId: session.sessionId,
        url: session.url,
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    workspaceId: string,
    userId: string,
    dto: CancelSubscriptionDto,
  ) {
    try {
      this.logger.log(
        `Canceling subscription for workspace: ${workspaceId}, cancelAtPeriodEnd: ${dto.cancelAtPeriodEnd}`,
      );

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // Get current subscription from database
      const currentSubscription = await this.getSubscription(workspaceId, userId);

      if (!currentSubscription.stripeSubscriptionId) {
        throw new BadRequestException('No active subscription to cancel');
      }

      // Cancel subscription via database
      const canceledSubscription = await this.db.cancelSubscription(
        workspaceId,
        null,
        currentSubscription.stripeSubscriptionId,
      );

      this.logger.log(`Subscription canceled for workspace: ${workspaceId}`);

      return {
        success: true,
        message: dto.cancelAtPeriodEnd
          ? 'Subscription will be canceled at the end of the billing period'
          : 'Subscription canceled immediately',
        subscription: canceledSubscription,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(workspaceId: string, userId: string) {
    try {
      this.logger.log(`Resuming subscription for workspace: ${workspaceId}`);

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // Get current subscription from database
      const currentSubscription = await this.getSubscription(workspaceId, userId);

      if (!currentSubscription.stripeSubscriptionId) {
        throw new BadRequestException('No subscription found');
      }

      if (!currentSubscription.cancelAtPeriodEnd) {
        throw new BadRequestException('Subscription is not scheduled for cancellation');
      }

      // Resume subscription via database
      const resumedSubscription = await /* TODO: use Stripe directly */ this.db.resumeSubscription(
        workspaceId,
        null,
        currentSubscription.stripeSubscriptionId,
      );

      this.logger.log(`Subscription resumed for workspace: ${workspaceId}`);

      return {
        success: true,
        message: 'Subscription resumed successfully',
        subscription: resumedSubscription,
      };
    } catch (error) {
      this.logger.error(`Failed to resume subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get invoices for a workspace
   * TODO: Implement when SDK adds invoice methods or use Stripe API directly
   */
  async getInvoices(workspaceId: string, userId: string) {
    try {
      this.logger.log(`Getting invoices for workspace: ${workspaceId}`);

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // TODO: Get invoices from Stripe via API
      // For now, return empty array
      return { invoices: [] };
    } catch (error) {
      this.logger.error(`Failed to get invoices: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment methods for a workspace
   * TODO: Implement when SDK adds payment method methods or use Stripe API directly
   */
  async getPaymentMethods(workspaceId: string, userId: string) {
    try {
      this.logger.log(`Getting payment methods for workspace: ${workspaceId}`);

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // TODO: Get payment methods from Stripe via API
      // For now, return empty array
      return { paymentMethods: [] };
    } catch (error) {
      this.logger.error(`Failed to get payment methods: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get interval (month/year) from Stripe price ID
   */
  private async getIntervalFromPriceId(priceId: string): Promise<'month' | 'year'> {
    const plansResponse = await this.getPlans();
    const plans = plansResponse.plans;

    for (const plan of plans) {
      if (plan.stripePriceIdYearly === priceId) {
        return 'year';
      }
      if (plan.stripePriceId === priceId) {
        return 'month';
      }
    }

    // Default to month if not found
    return 'month';
  }

  /**
   * Get plan name from Stripe price ID
   */
  private async getPlanFromPriceId(priceId: string): Promise<'free' | 'starter' | 'professional' | 'enterprise'> {
    this.logger.log(`[getPlanFromPriceId] Looking up plan for price ID: ${priceId}`);

    const plansResponse = await this.getPlans();
    const plans = plansResponse.plans;

    this.logger.log(`[getPlanFromPriceId] Checking ${plans.length} plans`);

    for (const plan of plans) {
      this.logger.log(`[getPlanFromPriceId] Plan: ${plan.id}, Monthly: ${plan.stripePriceId}, Yearly: ${plan.stripePriceIdYearly}`);

      if (
        plan.stripePriceId === priceId ||
        plan.stripePriceIdYearly === priceId
      ) {
        this.logger.log(`[getPlanFromPriceId] ✅ MATCH FOUND: ${plan.id}`);
        return plan.id as 'free' | 'starter' | 'professional' | 'enterprise';
      }
    }

    this.logger.warn(`[getPlanFromPriceId] ❌ No plan found for priceId: ${priceId}, defaulting to free`);
    return 'free';
  }

  // ============================================
  // In-App Purchase (IAP) Verification
  // ============================================

  /**
   * Map IAP product ID to plan type
   * Product IDs are prefixed with 'deskive_' to be unique across all apps
   */
  private readonly iapProductMapping: Record<string, { plan: 'starter' | 'professional' | 'enterprise'; interval: 'month' | 'year' }> = {
    'deskive_starter_monthly': { plan: 'starter', interval: 'month' },
    'deskive_starter_yearly': { plan: 'starter', interval: 'year' },
    'deskive_professional_monthly': { plan: 'professional', interval: 'month' },
    'deskive_professional_yearly': { plan: 'professional', interval: 'year' },
    'deskive_enterprise_monthly': { plan: 'enterprise', interval: 'month' },
    'deskive_enterprise_yearly': { plan: 'enterprise', interval: 'year' },
  };

  /**
   * Get plan from IAP product ID
   */
  private getPlanFromIAPProductId(productId: string): { plan: 'starter' | 'professional' | 'enterprise'; interval: 'month' | 'year' } | null {
    return this.iapProductMapping[productId] || null;
  }

  /**
   * Verify Apple App Store receipt
   */
  async verifyAppleReceipt(
    workspaceId: string,
    userId: string,
    dto: VerifyAppleReceiptDto,
  ) {
    try {
      this.logger.log(`Verifying Apple receipt for workspace: ${workspaceId}`);

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      const { receiptData, productId, transactionId } = dto;

      // Apple's verification URL (production and sandbox)
      const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
      const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';

      const sharedSecret = this.configService.get('APPLE_IAP_SHARED_SECRET');

      if (!sharedSecret) {
        throw new BadRequestException('Apple IAP shared secret not configured');
      }

      const verifyPayload = {
        'receipt-data': receiptData,
        'password': sharedSecret,
        'exclude-old-transactions': true,
      };

      // Try production first
      let response = await this.callAppleVerifyEndpoint(productionUrl, verifyPayload);

      // If status is 21007, try sandbox
      if (response.status === 21007) {
        this.logger.log('Receipt is from sandbox, retrying with sandbox URL');
        response = await this.callAppleVerifyEndpoint(sandboxUrl, verifyPayload);
      }

      if (response.status !== 0) {
        this.logger.error(`Apple verification failed with status: ${response.status}`);
        throw new BadRequestException(`Apple verification failed: status ${response.status}`);
      }

      // Find the latest receipt for this product
      const latestReceiptInfo = response.latest_receipt_info || [];

      // Log all products in the receipt for debugging
      const productIds = latestReceiptInfo.map((r: any) => r.product_id);
      this.logger.log(`Apple receipt contains ${latestReceiptInfo.length} receipts: ${productIds.join(', ')}`);
      this.logger.log(`Looking for product: ${productId}`);

      // Find matching receipt - first try exact match
      let matchingReceipt = latestReceiptInfo.find(
        (receipt: any) => receipt.product_id === productId,
      );

      // If exact match not found, check for any active subscription (handles upgrade timing)
      if (!matchingReceipt) {
        // Find any active subscription from our product mapping
        const activeReceipts = latestReceiptInfo
          .filter((r: any) => {
            const isActive = parseInt(r.expires_date_ms, 10) > Date.now();
            const isKnownProduct = this.getPlanFromIAPProductId(r.product_id) !== null;
            return isActive && isKnownProduct;
          })
          .sort((a: any, b: any) => parseInt(b.expires_date_ms, 10) - parseInt(a.expires_date_ms, 10));

        if (activeReceipts.length > 0) {
          // Use the most recent active subscription
          matchingReceipt = activeReceipts[0];
          this.logger.log(`Product ${productId} not in receipt, using active subscription: ${matchingReceipt.product_id}`);
        } else {
          this.logger.error(`No matching or active receipt found. Available products: ${productIds.join(', ')}`);
          throw new BadRequestException('No matching receipt found for product');
        }
      }

      // Use the actual product ID from the receipt (might differ from requested during upgrades)
      const actualProductId = matchingReceipt.product_id;

      // Check expiration
      const expiresDateMs = parseInt(matchingReceipt.expires_date_ms, 10);
      if (expiresDateMs < Date.now()) {
        throw new BadRequestException('Subscription has expired');
      }

      // Get plan from actual product ID in receipt (might differ from requested)
      const planInfo = this.getPlanFromIAPProductId(actualProductId);
      if (!planInfo) {
        throw new BadRequestException('Unknown product ID');
      }

      this.logger.log(`Verified subscription: ${actualProductId} -> plan: ${planInfo.plan}, interval: ${planInfo.interval}`);

      // Update subscription in database
      const subscription = await this.updateWorkspaceIAPSubscription(
        workspaceId,
        {
          plan: planInfo.plan,
          interval: planInfo.interval,
          source: 'apple',
          appleProductId: actualProductId,
          appleTransactionId: matchingReceipt.original_transaction_id || transactionId,
          currentPeriodStart: new Date(parseInt(matchingReceipt.purchase_date_ms, 10)).toISOString(),
          currentPeriodEnd: new Date(expiresDateMs).toISOString(),
          status: 'active',
        },
      );

      this.logger.log(`Apple receipt verified for workspace: ${workspaceId}, plan: ${planInfo.plan}`);

      return {
        success: true,
        subscription,
      };
    } catch (error) {
      this.logger.error(`Failed to verify Apple receipt: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Call Apple's verification endpoint
   */
  private async callAppleVerifyEndpoint(url: string, payload: any): Promise<any> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  /**
   * Verify Google Play purchase
   */
  async verifyGooglePurchase(
    workspaceId: string,
    userId: string,
    dto: VerifyGooglePurchaseDto,
  ) {
    try {
      this.logger.log(`Verifying Google purchase for workspace: ${workspaceId}`);

      // Verify user is admin/owner
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      const { purchaseToken, productId, packageName } = dto;

      // Validate package name matches expected
      const expectedPackageName = this.configService.get('GOOGLE_PLAY_PACKAGE_NAME');
      if (expectedPackageName && packageName !== expectedPackageName) {
        throw new BadRequestException('Invalid package name');
      }

      // Get Google service account credentials
      const googleCredentialsJson = this.configService.get('GOOGLE_PLAY_CREDENTIALS');
      if (!googleCredentialsJson) {
        throw new BadRequestException('Google Play credentials not configured');
      }

      let credentials;
      try {
        credentials = JSON.parse(googleCredentialsJson);
      } catch (e) {
        throw new BadRequestException('Invalid Google Play credentials format');
      }

      // Create JWT for Google API authentication
      const jwt = await this.createGoogleJWT(credentials);

      // Call Google Play Developer API
      const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Google API error: ${errorText}`);
        throw new BadRequestException('Google purchase verification failed');
      }

      const purchaseData = await response.json();

      // Check payment state (0 = pending, 1 = received, 2 = free trial, 3 = pending deferred)
      if (purchaseData.paymentState !== 1 && purchaseData.paymentState !== 2) {
        throw new BadRequestException('Payment not completed');
      }

      // Check expiration
      const expiryTimeMillis = parseInt(purchaseData.expiryTimeMillis, 10);
      if (expiryTimeMillis < Date.now()) {
        throw new BadRequestException('Subscription has expired');
      }

      // Get plan from product ID
      const planInfo = this.getPlanFromIAPProductId(productId);
      if (!planInfo) {
        throw new BadRequestException('Unknown product ID');
      }

      // Update subscription in database
      const subscription = await this.updateWorkspaceIAPSubscription(
        workspaceId,
        {
          plan: planInfo.plan,
          interval: planInfo.interval,
          source: 'google',
          googleProductId: productId,
          googlePurchaseToken: purchaseToken,
          currentPeriodStart: new Date(parseInt(purchaseData.startTimeMillis, 10)).toISOString(),
          currentPeriodEnd: new Date(expiryTimeMillis).toISOString(),
          status: 'active',
        },
      );

      this.logger.log(`Google purchase verified for workspace: ${workspaceId}, plan: ${planInfo.plan}`);

      return {
        success: true,
        subscription,
      };
    } catch (error) {
      this.logger.error(`Failed to verify Google purchase: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create JWT for Google API authentication
   */
  private async createGoogleJWT(credentials: any): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // Base64 encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(credentials.private_key, 'base64url');

    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  /**
   * Update workspace with IAP subscription data
   */
  private async updateWorkspaceIAPSubscription(
    workspaceId: string,
    data: {
      plan: string;
      interval: string;
      source: 'apple' | 'google';
      appleProductId?: string;
      appleTransactionId?: string;
      googleProductId?: string;
      googlePurchaseToken?: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      status: string;
    },
  ) {
    // Check if subscription exists in database
    const existingResult = await this.db
      .table('workspace_subscriptions')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const existingSubscription = existingResult.data?.[0];

    const subscriptionData = {
      workspace_id: workspaceId,
      plan: data.plan,
      billing_cycle: data.interval,
      status: data.status,
      source: data.source,
      apple_product_id: data.appleProductId || null,
      apple_transaction_id: data.appleTransactionId || null,
      apple_original_transaction_id: data.appleTransactionId || null, // Use same for now
      google_product_id: data.googleProductId || null,
      google_purchase_token: data.googlePurchaseToken || null,
      current_period_start: data.currentPeriodStart,
      current_period_end: data.currentPeriodEnd,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    };

    let subscription;
    if (existingSubscription) {
      // Update existing subscription
      await this.db
        .table('workspace_subscriptions')
        .where('id', '=', existingSubscription.id)
        .update(subscriptionData)
        .execute();

      subscription = { ...existingSubscription, ...subscriptionData };
      this.logger.log(`Updated subscription in database for workspace: ${workspaceId}`);
    } else {
      // Create new subscription
      const insertResult = await this.db
        .table('workspace_subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date().toISOString(),
        })
        .execute();

      subscription = insertResult.data?.[0] || subscriptionData;
      this.logger.log(`Created new subscription in database for workspace: ${workspaceId}`);
    }

    // Return subscription object in expected format
    return {
      id: subscription.id || workspaceId,
      workspaceId,
      plan: data.plan,
      interval: data.interval,
      status: data.status,
      source: data.source,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      appleProductId: data.appleProductId,
      appleTransactionId: data.appleTransactionId,
      googleProductId: data.googleProductId,
      googlePurchaseToken: data.googlePurchaseToken,
    };
  }

  /**
   * Get IAP product IDs for the app
   */
  async getIAPProductIds() {
    return {
      productIds: {
        starterMonthly: 'deskive_starter_monthly',
        starterYearly: 'deskive_starter_yearly',
        professionalMonthly: 'deskive_professional_monthly',
        professionalYearly: 'deskive_professional_yearly',
        enterpriseMonthly: 'deskive_enterprise_monthly',
        enterpriseYearly: 'deskive_enterprise_yearly',
      },
    };
  }
}
