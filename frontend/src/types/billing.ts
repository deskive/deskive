/**
 * Billing Types
 * Type definitions for subscription, plans, invoices, and payment methods
 */

export interface Subscription {
  id: string;
  workspaceId: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  interval?: 'month' | 'year'; // Billing interval
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  stripePriceId: string | null;
  stripePriceIdYearly?: string | null;
  interval: 'month' | 'year';
  price: number; // Monthly price in cents
  yearlyPrice?: number; // Yearly price in cents
  currency: string;
  features: string[];
  limits: {
    maxMembers: number;
    maxStorageGb: number;
  };
  isPopular?: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
  receiptUrl?: string;
  description?: string;
  currency: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface CreateCheckoutRequest {
  priceId: string;
  trialPeriodDays?: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CancelSubscriptionRequest {
  cancelAtPeriodEnd: boolean;
  reason?: string;
}
